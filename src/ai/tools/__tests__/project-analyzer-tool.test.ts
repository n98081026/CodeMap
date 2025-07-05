// src/ai/tools/project-analyzer-tool.test.ts
import { projectStructureAnalyzerTool, ProjectAnalysisInput, ProjectAnalysisOutputSchema } from './project-analyzer-tool';
import { supabaseFileFetcherTool } from './supabase-file-fetcher-tool';
import { summarizeCodeElementPurposeFlow } from '@/ai/flows/summarize-code-element-purpose';

// Mock dependencies
jest.mock('./supabase-file-fetcher-tool', () => ({
  supabaseFileFetcherTool: {
    run: jest.fn(),
  },
}));

jest.mock('@/ai/flows/summarize-code-element-purpose', () => ({
  summarizeCodeElementPurposeFlow: {
    run: jest.fn(),
  },
}));

const mockedSupabaseFileFetcher = supabaseFileFetcherTool.run as jest.Mock;
const mockedSummarizeFlow = summarizeCodeElementPurposeFlow.run as jest.Mock;

describe('projectStructureAnalyzerTool', () => {
  beforeEach(() => {
    mockedSupabaseFileFetcher.mockReset();
    mockedSummarizeFlow.mockReset();
  });

  // Helper function to create a valid SupabaseFileFetcherOutput
  const createMockFileFetcherOutput = (fileName: string, fileContent: string, contentType: string = 'text/x-python', isBinary: boolean = false) => ({
    fileName,
    fileContent,
    fileBuffer: Buffer.from(fileContent),
    contentType,
    isBinary,
    error: null,
  });

  describe('analyzePythonAST (via projectStructureAnalyzerTool)', () => {
    it('should analyze a Python file with basic structures (functions, classes, methods)', async () => {
      const pythonContent = `
# This is a comment
import os
from math import sqrt

@my_decorator
def top_level_function(param1: int, param2: str) -> bool:
  """This is a docstring for a top-level function."""
  local_var = param1 + len(param2)
  print(f"Processing {local_var}")
  return local_var > 10

class MyClass(BaseClass):
  """A simple class."""
  CLASS_VAR = 100

  def __init__(self, value: int):
    self.instance_var = value
    super().__init__()

  def method_one(self, multiplier: float) -> float:
    """Multiplies instance_var."""
    # Calling another method
    self.another_method()
    return self.instance_var * multiplier

  def another_method(self):
    """Another method."""
    pass

def another_top_level_function():
    top_level_function(1, "test") # local call
`;
      mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('test_script.py', pythonContent));
      mockedSummarizeFlow.mockImplementation(async (input) => ({
        semanticSummary: `Mocked summary for ${input.elementType} ${input.elementName}`,
      }));

      const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/test_script.py' };
      const result = await projectStructureAnalyzerTool.run(input);

      expect(result.error).toBeUndefined();
      expect(result.analyzedFileName).toBe('test_script.py');
      expect(result.effectiveFileType).toBe('python');
      expect(result.analysisSummary).toContain('Python file \'test_script.py\' (AST analysis)');
      expect(result.analysisSummary).toContain('2 top-level functions');
      expect(result.analysisSummary).toContain('1 classes');
      expect(result.analysisSummary).toContain('2 import statements');
      expect(result.analysisSummary).toContain('Detected 2 local calls'); // self.another_method() and top_level_function()

      const detailedNodes = result.detailedNodes || [];
      // Verify top_level_function
      const funcNode = detailedNodes.find(n => n.label === 'top_level_function (function)');
      expect(funcNode).toBeDefined();
      expect(funcNode?.type).toBe('py_function');
      expect(funcNode?.details).toContain('Mocked summary for function top_level_function');
      expect(funcNode?.details).toContain('Params: param1: int, param2: str');
      expect(funcNode?.details).toContain('Decorators: my_decorator');
      expect(funcNode?.structuredInfo.comments).toBe('This is a docstring for a top-level function.');
      expect(funcNode?.lineNumbers).toBe('6-10');

      // Verify MyClass
      const classNode = detailedNodes.find(n => n.label === 'MyClass (class)');
      expect(classNode).toBeDefined();
      expect(classNode?.type).toBe('py_class');
      expect(classNode?.details).toContain('Mocked summary for class MyClass');
      expect(classNode?.details).toContain('Bases: BaseClass');
      expect(classNode?.details).toContain('Properties: CLASS_VAR');
      expect(classNode?.structuredInfo.comments).toBe('A simple class.');
      expect(classNode?.lineNumbers).toBe('12-26'); // Adjusted if parser includes class closing line

      // Verify __init__ method
      const initMethodNode = detailedNodes.find(n => n.structuredInfo.name === '__init__' && n.structuredInfo.parentName === 'MyClass');
      expect(initMethodNode).toBeDefined();
      expect(initMethodNode?.type).toBe('py_method');
      expect(initMethodNode?.details).toContain('Mocked summary for function __init__');
      expect(initMethodNode?.details).toContain('Params: self, value: int');
      expect(initMethodNode?.lineNumbers).toBe('16-18');

      // Verify method_one
      const methodOneNode = detailedNodes.find(n => n.structuredInfo.name === 'method_one' && n.structuredInfo.parentName === 'MyClass');
      expect(methodOneNode).toBeDefined();
      expect(methodOneNode?.type).toBe('py_method');
      expect(methodOneNode?.details).toContain('Mocked summary for function method_one');
      expect(methodOneNode?.details).toContain('Params: self, multiplier: float');
      expect(methodOneNode?.structuredInfo.comments).toBe('Multiplies instance_var.');
      expect(methodOneNode?.lineNumbers).toBe('20-24');
      expect(methodOneNode?.details).toContain('Local Calls: self.another_method() (line 22)');

      // Verify another_method
      const anotherMethodNode = detailedNodes.find(n => n.structuredInfo.name === 'another_method' && n.structuredInfo.parentName === 'MyClass');
      expect(anotherMethodNode).toBeDefined();
      expect(anotherMethodNode?.type).toBe('py_method');
      expect(anotherMethodNode?.details).toContain('Mocked summary for function another_method');
      expect(anotherMethodNode?.lineNumbers).toBe('26-27');


      // Verify another_top_level_function and its call
      const anotherFuncNode = detailedNodes.find(n => n.label === 'another_top_level_function (function)');
      expect(anotherFuncNode).toBeDefined();
      expect(anotherFuncNode?.details).toContain('Local Calls: top_level_function() (line 30)');


      // Verify imports
      const importOs = detailedNodes.find(n => n.type === 'py_import' && n.details === 'Import os');
      expect(importOs).toBeDefined();
      const importMath = detailedNodes.find(n => n.type === 'py_import' && n.details === 'From math import sqrt');
      expect(importMath).toBeDefined();

      expect(mockedSummarizeFlow).toHaveBeenCalledTimes(6);
    });

    it('should handle various import statements', async () => {
      const pythonContent = `
import sys
import os.path
from collections import Counter, defaultdict as dd
from . import local_module
from ..parent import parent_module
      `;
      mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('imports_test.py', pythonContent));
      mockedSummarizeFlow.mockResolvedValue({ semanticSummary: 'Mock summary' }); // Generic summary for any element

      const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/imports_test.py' };
      const result = await projectStructureAnalyzerTool.run(input);

      expect(result.error).toBeUndefined();
      const detailedNodes = result.detailedNodes || [];

      expect(detailedNodes.find(n => n.type === 'py_import' && n.details === 'Import sys')).toBeDefined();
      expect(detailedNodes.find(n => n.type === 'py_import' && n.details === 'Import os.path')).toBeDefined();
      expect(detailedNodes.find(n => n.type === 'py_import' && n.details === 'From collections import Counter, defaultdict as dd')).toBeDefined();
      expect(detailedNodes.find(n => n.type === 'py_import' && n.details === 'From . import local_module')).toBeDefined();
      expect(detailedNodes.find(n => n.type === 'py_import' && n.details === 'From ..parent import parent_module')).toBeDefined();
      expect(result.analysisSummary).toContain('5 import statements');
    });


    it('should handle an empty Python file', async () => {
      mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('empty.py', ''));
      const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/empty.py' };
      const result = await projectStructureAnalyzerTool.run(input);

      expect(result.error).toBeUndefined();
      expect(result.analyzedFileName).toBe('empty.py');
      expect(result.effectiveFileType).toBe('python');
      expect(result.detailedNodes?.length).toBe(0); // No functions, classes, or imports
      expect(result.analysisSummary).toContain('Python file \'empty.py\' (AST analysis): Found 0 top-level functions, 0 classes, and 0 import statements. Detected 0 local calls.');
      expect(mockedSummarizeFlow).not.toHaveBeenCalled();
    });

    it('should fallback to regex for Python file with syntax errors and report error', async () => {
      const pythonContentSyntaxError = `
def my_func(a, b)
  return a + b

class MyBrokenClass
  pass
      `; // Missing colons
      mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('syntax_error.py', pythonContentSyntaxError));
      const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/syntax_error.py' };
      const result = await projectStructureAnalyzerTool.run(input);

      expect(result.error).toBeDefined();
      expect(result.error).toContain('Python AST parsing failed');
      expect(result.error).toContain('(used regex fallback)');
      expect(result.analysisSummary).toContain('Python AST parsing failed');
      expect(result.analysisSummary).toContain('--- Using Regex Fallback:');
      expect(result.analysisSummary).toContain("Regex Analysis: Functions: 1, Classes: 1, Imports: 0."); // Based on regex

      // Regex fallback should still produce some nodes
      expect(result.detailedNodes?.length).toBeGreaterThan(0);
      const funcNode = result.detailedNodes?.find(n => n.label === 'python File (Regex)' && n.type === 'python_file_regex');
      expect(funcNode).toBeDefined();
      expect(funcNode?.details).toContain('Functions: 1');
      expect(funcNode?.details).toContain('Classes: 1');
      expect(mockedSummarizeFlow).not.toHaveBeenCalled();
    });
  });

  // More tests for projectStructureAnalyzerTool with ZIP files, other file types, etc.
  // can be added here, similar to how they would be for JS/TS analysis.
  // For now, focusing on the Python-specific parts.

  it('should correctly identify a non-Python text file', async () => {
    const textContent = "This is a plain text file.";
    mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('notes.txt', textContent, 'text/plain'));
    const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/notes.txt' };
    const result = await projectStructureAnalyzerTool.run(input);

    expect(result.error).toBeUndefined();
    expect(result.analyzedFileName).toBe('notes.txt');
    expect(result.effectiveFileType).toBe('text');
    expect(result.analysisSummary).toContain("Plain text file 'notes.txt'");
    expect(result.detailedNodes?.find(n => n.type === 'text_file')).toBeDefined();
  });

   it('should handle errors from supabaseFileFetcherTool gracefully', async () => {
    mockedSupabaseFileFetcher.mockResolvedValue({
      fileName: 'error_file.py',
      fileContent: null,
      fileBuffer: null,
      contentType: null,
      isBinary: false,
      error: 'Supabase fetch failed',
    });
    const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/error_file.py' };
    const result = await projectStructureAnalyzerTool.run(input);

    expect(result.error).toBe('File fetch failed: Supabase fetch failed');
    expect(result.analysisSummary).toContain('Error fetching file: Supabase fetch failed');
    expect(result.detailedNodes?.[0].type).toBe('error');
  });

  it('should handle summarization flow errors gracefully', async () => {
      const pythonContent = `def simple_func(): pass`;
      mockedSupabaseFileFetcher.mockResolvedValue(createMockFileFetcherOutput('summarize_error.py', pythonContent));
      mockedSummarizeFlow.mockRejectedValue(new Error('LLM unavailable'));

      const input: ProjectAnalysisInput = { projectStoragePath: 'user/project/summarize_error.py' };
      const result = await projectStructureAnalyzerTool.run(input);

      expect(result.error).toBeUndefined(); // The tool itself shouldn't fail, but summary will be affected
      const funcNode = result.detailedNodes?.find(n => n.label === 'simple_func (function)');
      expect(funcNode).toBeDefined();
      expect(funcNode?.details).toContain('Error during semantic summarization.');
      expect(result.analysisSummary).toContain('Semantic summaries attempted.'); // The attempt was made
    });
});

// To run these tests:
// 1. Ensure you have Jest installed and configured in your project.
// 2. Place this file (project-analyzer-tool.test.ts) in the same directory as project-analyzer-tool.ts,
//    or adjust paths accordingly.
// 3. Run your Jest test command (e.g., `npm test`, `yarn test`, or `jest`).
//
// Note on line numbers: The exact line numbers in assertions might need adjustment
// based on how the `python-parser` library reports them, especially with decorators
// or multi-line statements. These tests provide a general structure.
//
// Note on ZIP file testing: Testing the full ZIP processing logic of projectStructureAnalyzerTool
// would require more complex mocking for supabaseFileFetcherTool (to return a ZIP buffer) and
// potentially mocking the 'adm-zip' library if you want to unit test unpacking logic separately.
// The current tests focus on the Python AST analysis part, assuming a single file is fetched.
// For integration tests of ZIPs, you'd typically rely on higher-level tests or manual validation.
// The prompt indicates a focus on Python AST, so these tests are geared towards that.
//
// Final check for summarization calls:
// The test 'should analyze a Python file with basic structures' expects 6 summarization calls.
// Let's trace:
// 1. top_level_function (function) - YES
// 2. MyClass (class) - YES
// 3. __init__ (method of MyClass) - YES
// 4. method_one (method of MyClass) - YES
// 5. another_method (method of MyClass) - YES
// 6. another_top_level_function (function) - YES
// So, 6 calls is correct. The previous comment in the test had a typo.
// Corrected the test expectation to 6.
