/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This tool can now perform real analysis for Node.js, Python, and C# projects
 * by fetching files from Supabase Storage, and performs content analysis based on file type,
 * including AST-based analysis for JavaScript, TypeScript, and Python.
 */

import path from 'path';

import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import { z } from 'zod';
import { defineTool } from '@genkit-ai/ai';

//================================================================================
// Zod Schemas and TypeScript Types
//================================================================================

export const FileDependencyNodeSchema = z.object({
  id: z.string(),
  path: z.string(),
  type: z.enum(['file', 'dependency']),
});
export type FileDependencyNode = z.infer<typeof FileDependencyNodeSchema>;

export const FileDependencyEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
});
export type FileDependencyEdge = z.infer<typeof FileDependencyEdgeSchema>;

export const FileDependenciesSchema = z.object({
  nodes: z.array(FileDependencyNodeSchema),
  edges: z.array(FileDependencyEdgeSchema),
});
export type FileDependencies = z.infer<typeof FileDependenciesSchema>;

export const DetailedNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  filePath: z.string(),
  summary: z.string(),
  details: z.string().optional(),
  startLine: z.number(),
  endLine: z.number(),
  code: z.string(),
});
export type DetailedNode = z.infer<typeof DetailedNodeSchema>;

export const KeyFileSchema = z.object({
  filePath: z.string(),
  reason: z.string(),
  summary: z.string(),
  detailedNodes: z.array(DetailedNodeSchema),
});
export type KeyFile = z.infer<typeof KeyFileSchema>;

export const PotentialArchitecturalComponentSchema = z.object({
  filePath: z.string(),
  componentType: z.string(),
  confidence: z.number(),
  reason: z.string(),
});
export type PotentialArchitecturalComponent = z.infer<typeof PotentialArchitecturalComponentSchema>;

export const DirectorySummarySchema = z.object({
  path: z.string(),
  summary: z.string(),
  fileCount: z.number(),
});
export type DirectorySummary = z.infer<typeof DirectorySummarySchema>;

export const ProjectAnalysisInputSchema = z.object({
  supabasePath: z.string(),
  isMock: z.boolean().optional(),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

export const ProjectAnalysisOutputSchema = z.object({
  analysisDateTime: z.string(),
  projectSummary: z.string(),
  inferredLanguages: z.array(z.string()),
  inferredTechnologies: z.array(z.string()),
  directoryStructure: z.record(z.any()),
  directorySummaries: z.array(DirectorySummarySchema),
  keyFiles: z.array(KeyFileSchema),
  potentialArchitecturalComponents: z.array(PotentialArchitecturalComponentSchema),
  fileDependencies: FileDependenciesSchema,
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

export type EffectiveFileType = 'typescript' | 'javascript' | 'python' | 'markdown' | 'json' | 'html' | 'css' | 'unknown';

// Internal types not part of the output schema
export interface FileAnalysisResult {
  fileName: string;
  path: string;
  fileType: EffectiveFileType;
  summary: string;
  nodes: DetailedNode[];
}

import * as ts from 'typescript';

import { FIXED_MOCK_PROJECT_A_ANALYSIS } from './project-analysis.mock';
import { summarizeGenericFileFlow } from '../flows/summarize-generic-file-flow';

import {
  batchSummarizeElements,
  createDetailedNodeFromExtractedElement,
} from './ast-utils';
import {

  DetailedNode,
  RawASTImport,
  RawASTExport,
  SummarizationTaskInfo,
  ExtractedCodeElement,

  ProjectAnalysisOutput,
  ProjectAnalysisInput,
  LocalCall,
} from './project-analyzer/types';
import { supabaseFileFetcherTool } from './supabase-file-fetcher-tool';

import type { FileObject } from '@supabase/storage-js';

import { ai } from '@/ai/genkit';
import { supabase } from '@/lib/supabaseClient';

// Schemas and types are now imported from types.ts
export { ProjectAnalysisInputSchema, ProjectAnalysisOutputSchema };
export type { ProjectAnalysisInput, ProjectAnalysisOutput, DetailedNode };

const generateNodeId = (
  fileSpecificPrefix: string,
  nodeType: string,
  nodeName: string,
  index?: number
): string => {
  const saneName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 25);
  return `${fileSpecificPrefix}_${nodeType}_${saneName}${index !== undefined ? `_${index}` : ''}`.toLowerCase();
};

function determineEffectiveFileType(
  fileName: string,
  contentType?: string,
  isBinary?: boolean,
  filePath?: string
): EffectiveFileType {
  const lowerFileName = fileName.toLowerCase();
  const lowerFilePath = filePath?.toLowerCase() || lowerFileName;

  if (lowerFileName === 'package.json') return 'package.json';
  if (lowerFileName === 'pom.xml') return 'pom_xml';
  if (lowerFileName.endsWith('.csproj')) return 'csproj_file';
  if (lowerFileName === 'build.gradle' || lowerFileName === 'build.gradle.kts')
    return 'gradle_script';
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.'))
    return 'dockerfile';
  if (
    lowerFileName === 'docker-compose.yml' ||
    lowerFileName === 'docker-compose.yaml'
  )
    return 'docker_compose_config';

  if (
    lowerFilePath.includes('.github/workflows/') &&
    (lowerFileName.endsWith('.yml') || lowerFileName.endsWith('.yaml'))
  )
    return 'github_workflow_yaml';
  if (lowerFileName === '.gitlab-ci.yml' || lowerFileName === '.gitlab-ci.yaml')
    return 'gitlab_ci_yaml';
  if (
    (lowerFileName.endsWith('.yml') || lowerFileName.endsWith('.yaml')) &&
    (lowerFileName.includes('ci') ||
      lowerFileName.includes('cd') ||
      lowerFileName.includes('pipeline'))
  )
    return 'cicd_script_yaml';

  if (lowerFileName.endsWith('.json')) return 'generic.json';
  if (lowerFileName.endsWith('.md') || lowerFileName.endsWith('.markdown'))
    return 'markdown';
  if (
    lowerFileName.endsWith('.js') ||
    lowerFileName.endsWith('.mjs') ||
    lowerFileName.endsWith('.cjs')
  )
    return 'javascript';
  if (
    lowerFileName.endsWith('.ts') ||
    lowerFileName.endsWith('.tsx') ||
    lowerFileName.endsWith('.mts') ||
    lowerFileName.endsWith('.cts')
  )
    return 'typescript';
  if (lowerFileName.endsWith('.py')) return 'python';
  if (
    lowerFileName.endsWith('.sh') ||
    lowerFileName.endsWith('.bash') ||
    lowerFileName.endsWith('.zsh')
  )
    return 'shell_script';
  if (lowerFileName.startsWith('.env') || lowerFileName.endsWith('.env'))
    return 'env_config';
  if (lowerFileName.endsWith('.xml')) return 'xml_config';
  if (
    lowerFileName.endsWith('.properties') ||
    lowerFileName.endsWith('.ini') ||
    lowerFileName.endsWith('.toml')
  )
    return 'text_config';
  if (lowerFileName.endsWith('.html') || lowerFileName.endsWith('.htm'))
    return 'html';
  if (
    lowerFileName.endsWith('.css') ||
    lowerFileName.endsWith('.scss') ||
    lowerFileName.endsWith('.less')
  )
    return 'css';

  if (isBinary) return 'binary';

  if (contentType) {
    if (contentType.startsWith('text/')) {
      if (contentType === 'text/javascript') return 'javascript';
      if (contentType === 'text/typescript') return 'typescript';
      if (contentType === 'text/x-python') return 'python';
      if (contentType === 'text/markdown') return 'markdown';
      if (contentType === 'text/html') return 'html';
      if (contentType === 'text/css') return 'css';
      if (contentType === 'application/json') return 'generic.json';
      if (contentType === 'application/xml' || contentType === 'text/xml')
        return 'xml_config';
      return 'text';
    }
    if (
      contentType === 'application/octet-stream' ||
      contentType.startsWith('application/zip') ||
      contentType.startsWith('image/') ||
      contentType.startsWith('audio/') ||
      contentType.startsWith('video/')
    ) {
      return 'binary';
    }
  }

  if (
    /\.(txt|log|sql|csv|rst|tex|conf|cfg|config|yaml|yml|json5)$/i.test(
      lowerFileName
    )
  )
    return 'text';

  return 'unknown';
}

// --- JavaScript AST Analysis (Acorn) ---
async function analyzeJavaScriptAST(
  fileName: string,
  fileContent: string,
  fileSpecificPrefix: string
): Promise<{
  analysisSummary: string;
  detailedNodes: DetailedNode[];
  rawImports: RawASTImport[];
  rawExports: RawASTExport[];
  error?: string;
}> {
  const detailedNodesOutput: DetailedNode[] = [];
  const rawImportsOutput: RawASTImport[] = [];
  const rawExportsOutput: RawASTExport[] = [];
  const summarizationTasks: SummarizationTaskInfo[] = [];
  const localDefinitions: Array<Omit<ExtractedCodeElement, 'localCalls'>> = [];
  let ast: acorn.Node;
  const comments: any[] = [];

  try {
    ast = acorn.parse(fileContent, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
      onComment: comments, // Correct option for acorn
    });
  } catch (e: any) {
    return {
      error: `JS AST parsing failed: ${e.message}`,
      analysisSummary: `Failed to parse JS content: ${e.message}`,
      detailedNodes: [],
      rawImports: [],
      rawExports: [],
    };
  }

  // Phase 1: Collect all top-level declarations and exports
  acornWalk.ancestor(ast, {
    FunctionDeclaration(node: any, ancestors: any[]) {
      const parent = ancestors[ancestors.length - 2];
      const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
      const name = node.id?.name || '[anonymous_func]';
      const element: ExtractedCodeElement = {
        name,
        kind: 'function',
        isExported,
        startLine: node.loc.start.line,
        endLine: node.loc.end.line,
        params: node.params.map((p: any) => ({ name: p.name || '[pattern]' })),
        isAsync: node.async,
        astNode: node,
      };
      localDefinitions.push(element);
      summarizationTasks.push({ 
        uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
        inputForFlow: { elementType: 'function', elementName: name, filePath: fileName, comments: element.comments, isExported: element.isExported },
        originalNodeInfo: element, 
        nodeType: 'function' 
      });
    },
    VariableDeclaration(node: any, ancestors: any[]) {
      const parent = ancestors[ancestors.length - 2];
      const isExported = parent.type === 'ExportNamedDeclaration';
      node.declarations.forEach((declaration: any) => {
        if (declaration.init && (declaration.init.type === 'ArrowFunctionExpression' || declaration.init.type === 'FunctionExpression')) {
          const name = declaration.id.name;
          const element: ExtractedCodeElement = {
            name,
            kind: 'function',
            isExported,
            startLine: node.loc.start.line,
            endLine: node.loc.end.line,
            params: declaration.init.params.map((p: any) => ({ name: p.name || '[pattern]' })),
            isAsync: declaration.init.async,
            astNode: declaration.init,
          };
          localDefinitions.push(element);
          summarizationTasks.push({ 
            uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
            originalNodeInfo: element, 
            nodeType: 'function', 
            inputForFlow: { 
              elementType: 'function', 
              elementName: name, 
              filePath: fileName, 
              comments: element.comments, 
              isExported: element.isExported 
            },
          });
        } else if (ancestors.length <= 2) { // Top-level variables
            const name = declaration.id.name;
            const element: ExtractedCodeElement = {
                name,
                kind: 'variable',
                isExported,
                startLine: node.loc.start.line,
                endLine: node.loc.end.line,
            };
            detailedNodesOutput.push(createDetailedNodeFromExtractedElement(element, generateNodeId(fileSpecificPrefix, 'variable', name), 'js_'));
        }
      });
    }

  // Create a combined summary
  let finalAnalysisSummary = `JavaScript file '${fileName}' analyzed. Found ${localDefinitions.length} local definitions, ${rawImportsOutput.length} imports, ${rawExportsOutput.length} exports.`;
  
  // Initialize summarizedElements as empty array for now
  const summarizedElements: Array<{
    originalNodeInfo: any;
    uniqueId: string;
    summary?: string;
    error?: string;
    inputForFlow?: any;
  }> = [];
  
  if (summarizedElements.some(el => el.error)) {
    finalAnalysisSummary += " Some elements could not be summarized.";
  }

  // Populate detailedNodesOutput from summarizedElements
  // Ensure createDetailedNodeFromExtractedElement can handle potentially undefined summary/error/codeSnippet from task
  for (const task of summarizedElements) {
    detailedNodesOutput.push(
      createDetailedNodeFromExtractedElement(
        task.originalNodeInfo,
        task.uniqueId,
        task.summary || (task.error ? `Error: ${task.error}` : 'No summary.'),
        task.error,
        task.inputForFlow.codeSnippet // Ensure this path is correct and codeSnippet is available
      )
    );
  }

  return {
    analysisSummary: finalAnalysisSummary,
    detailedNodes: detailedNodesOutput,
    rawImports: rawImportsOutput,
    rawExports: rawExportsOutput,
    // error: any top-level error string if one occurred within analyzeJavaScriptAST directly
  };
    ClassDeclaration(node: any, ancestors: any[]) {
      const parent = ancestors[ancestors.length - 2];
      const isExported = parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportDefaultDeclaration';
      const name = node.id?.name || '[anonymous_class]';
      const classElement: ExtractedCodeElement = {
        name,
        kind: 'class',
        isExported,
        superClass: node.superClass?.name,
        startLine: node.loc.start.line,
        endLine: node.loc.end.line,
        classMethods: [],
        astNode: node,
      };

      node.body.body.forEach((item: any) => {
        if (item.type === 'MethodDefinition') {
          const methodName = item.key.name;
          classElement.classMethods?.push(methodName);
          const methodElement: ExtractedCodeElement = {
            name: methodName,
            kind: 'method',
            parentName: name,
            isExported: false, // Methods are not directly exported
            startLine: item.loc.start.line,
            endLine: item.loc.end.line,
            params: item.value.params.map((p: any) => ({ name: p.name || '[pattern]' })),
            isAsync: item.value.async,
            astNode: item.value,
          };
          localDefinitions.push(methodElement);
        }
      });
      localDefinitions.push(classElement);
      summarizationTasks.push({ 
        uniqueId: generateNodeId(fileSpecificPrefix, 'class', name, summarizationTasks.length),
        originalNodeInfo: classElement, 
        nodeType: 'class', 
        inputForFlow: { 
          elementType: 'class', 
          elementName: name, 
          filePath: fileName, 
          comments: classElement.comments, 
          isExported: classElement.isExported 
        },
      });
    },
    ImportDeclaration(node: any) {
      rawImportsOutput.push({
        originalPath: node.source.value,
        importedSymbols: node.specifiers.map((s: any) => s.local.name),
        isDefaultImport: node.specifiers.some((s:any) => s.type === 'ImportDefaultSpecifier'),
        isNamespaceImport: node.specifiers.some((s:any) => s.type === 'ImportNamespaceSpecifier'),
        sourceFile: fileName,
      });
    },
    ExportNamedDeclaration(node: any) {
        if (node.declaration) {
            const name = node.declaration.id?.name || node.declaration.declarations?.[0].id.name;
            if (name) {
                let type: RawASTExport['type'] = 'unknown';
                if (node.declaration.type.includes('Function')) type = 'function';
                else if (node.declaration.type.includes('Class')) type = 'class';
                else if (node.declaration.type.includes('Variable')) type = 'variable';
                rawExportsOutput.push({ name, type, isDefaultExport: false, sourceFile: fileName });
            }
        } else {
            node.specifiers.forEach((spec: any) => {
                rawExportsOutput.push({ name: spec.exported.name, type: 'variable', reExportedFrom: node.source?.value, isDefaultExport: false, sourceFile: fileName });
            });
        }
    },
    ExportDefaultDeclaration(node: any) {
        const name = node.declaration.id?.name || node.declaration.name || '[default]';
        let type: RawASTExport['type'] = 'unknown';
        if (node.declaration.type.includes('Function')) type = 'function';
        else if (node.declaration.type.includes('Class')) type = 'class';
        else type = 'variable';
        rawExportsOutput.push({ name, type, isDefaultExport: true, sourceFile: fileName });
    },
    ExportAllDeclaration(node: any) {
        rawExportsOutput.push({ name: '*', type: 're-export', reExportedFrom: node.source.value, isDefaultExport: false, sourceFile: fileName });
    }
  });

  const summarizedElements = await batchSummarizeElements(summarizationTasks, fileName, 'Acorn Analyzer');

  // Phase 2: Analyze calls within each summarized element
  for (const task of summarizedElements) {
    task.originalNodeInfo.localCalls = [];
    if (!task.originalNodeInfo.astNode) continue;

    acornWalk.simple(task.originalNodeInfo.astNode, {
      CallExpression(callNode: any) {
        let calleeName: string | undefined;
        let isMethodCall = false;
        if (callNode.callee.type === 'Identifier') {
          calleeName = callNode.callee.name;
        } else if (callNode.callee.type === 'MemberExpression') {
          isMethodCall = true;
          calleeName = callNode.callee.property.name;
        }

        if (calleeName) {
          const targetDef = localDefinitions.find(def => def.name === calleeName);
          if (targetDef) {
            task.originalNodeInfo.localCalls?.push({
              targetName: calleeName,
              targetType: targetDef.kind,
              targetParentName: targetDef.parentName,
              line: callNode.loc.start.line,
            });
          }
        }
      }

// Main analysis orchestrator for a single file
class FileAnalysisResult {
  constructor(
    public fileName: string,
    public fileType: EffectiveFileType,
    public summary: string,
    public nodes: DetailedNode[],
    public path: string,
    public allImports?: RawASTImport[],
    public allExports?: RawASTExport[]
  ) {}
}

interface SupabaseFile {
  name: string;
  content: string | Buffer;
  path: string;
  isBinary: boolean;
}

async function analyzeFileContent(
  fileName: string,
  fileContent: string,
  filePath: string,
  isBinary: boolean
): Promise<FileAnalysisResult> {
  const fileType = determineEffectiveFileType(fileName, undefined, isBinary, filePath);
  const fileSpecificPrefix = path.basename(fileName, path.extname(fileName));

  let analysisSummary = `File '${fileName}' (${fileType}): `; 
  let detailedNodes: DetailedNode[] = [];
  let rawImports: RawASTImport[] = [];
  let rawExports: RawASTExport[] = [];
  let error: string | undefined;

  try {
    switch (fileType) {
      case 'javascript': {
        const result = await analyzeJavaScriptAST(fileName, fileContent, fileSpecificPrefix);
        analysisSummary += result.analysisSummary;
        detailedNodes = result.detailedNodes;
        rawImports = result.rawImports;
        rawExports = result.rawExports;
        error = result.error;
        break;
      }
      case 'typescript': {
        const result = await analyzeTypeScriptAST(fileName, fileContent, fileSpecificPrefix);
        analysisSummary += result.analysisSummary;
        detailedNodes = result.detailedNodes;
        rawImports = result.rawImports;
        rawExports = result.rawExports;
        error = result.error;
        break;
      }
      case 'python': {
        const result = await analyzePythonAST(fileName, fileContent, fileSpecificPrefix);
        analysisSummary += result.analysisSummary;
        detailedNodes = result.detailedNodes;
        rawImports = result.rawImports;
        rawExports = result.rawExports;
        error = result.error;
        break;
      }
      case 'csharp': {
        const result = await analyzeCSharpFile(fileName, fileContent);
        analysisSummary += result.summary;
        detailedNodes = result.detailedNodes;
        error = result.error;
        break;
      }
      default: {
        const genericSummary = await summarizeGenericFileFlow.run({
          fileName,
          fileContent,
          fileType,
        });
        analysisSummary += genericSummary;
        break;
      }
    }
  } catch (e: any) {
    analysisSummary += `An unexpected error occurred during analysis: ${e.message}`;
    error = e.message;
  }

  if (error) {
    analysisSummary += ` (Analysis incomplete due to error: ${error})`;
  }

  return new FileAnalysisResult(
    fileName,
    fileType,
    analysisSummary,
    detailedNodes,
    filePath,
    rawImports,
    rawExports
  );
}

// ... (rest of the code remains the same)

// --- Fallback and other analyzers (package.json, generic.json, markdown, plain_text, fallback, python regex) ---
function analyzePackageJson(
  packageJson: any,
  filesList: string[]
): { summary: string; dependencies: any; scripts: any } {
  const dependencies = packageJson.dependencies || {};
  const devDependencies = packageJson.devDependencies || {};
  const scripts = packageJson.scripts || {};
  const summary = `Project: ${packageJson.name || 'N/A'}. Contains script and dependency info.`;
  return { summary, dependencies, scripts };
}

function analyzeGenericJson(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): { analysisSummary: string; detailedNodes: DetailedNode[] } {
  let summary = `File '${fileName}' (JSON). `;
  const nodes: DetailedNode[] = [];
  try {
    const parsed = JSON.parse(fileContent);
    const keys = Object.keys(parsed).slice(0, 5).join(', ');
    nodes.push({
      id: generateNodeId(fileSpecificPrefix, 'info', 'root'),
      label: 'JSON Root',
      type: 'json_root',
      details:
        `Top-level keys (sample): ${keys}` +
        (Object.keys(parsed).length > 5 ? '...' : ''),
    });
    summary += `Contains structured data with keys: ${keys}...`;
  } catch (e: any) {
    summary += `Error parsing JSON: ${e.message}`;
    nodes.push({
      id: generateNodeId(fileSpecificPrefix, 'error', 'parsing'),
      label: 'JSON Parse Error',
      type: 'error',
      details: e.message,
    });
  }
  return { analysisSummary: summary, detailedNodes: nodes };
}

function analyzeMarkdown(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): { analysisSummary: string; detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
  const lines = fileContent.split('\n');
  const headers = lines.filter((line) => line.startsWith('#')).slice(0, 5);
  nodes.push({
    id: generateNodeId(fileSpecificPrefix, 'info', 'markdown'),
    label: 'Markdown File',
    type: 'markdown_file',
    details: `Contains ${lines.length} lines.`,
  });
  headers.forEach((h, i) => {
    nodes.push({
      id: generateNodeId(fileSpecificPrefix, `header`, h, i),
      label: `Header: ${h.substring(0, 50)}`,
      type: 'markdown_header',
      details: h,
    });
  });
  return {
    analysisSummary: `Markdown file '${fileName}' with ${lines.length} lines. Found ${headers.length} headers (sample shown).`,
    detailedNodes: nodes,
  };
}

function analyzeSourceCodeRegexFallback(
  fileName: string,
  fileContent: string,
  language: 'python',
  generateNodeId: Function,
  fileSpecificPrefix: string
): { analysisSummary: string; detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
  const lines = fileContent.split('\n').length;
  let functions: string[] = [],
    classes: string[] = [],
    imports: string[] = [],
    comments = 0;

  const functionRegexPy = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
  const classRegexPy = /class\s+([a-zA-Z0-9_]+)\s*\(?/g;
  const importRegexPy = /import\s+([\w.,\s]+(?:as\s+\w+)?)/g;
  let match;
  if (language === 'python') {
    while ((match = functionRegexPy.exec(fileContent)) !== null)
      functions.push(match[1]);
    while ((match = classRegexPy.exec(fileContent)) !== null)
      classes.push(match[1]);
    while ((match = importRegexPy.exec(fileContent)) !== null)
      imports.push(match[1]);
    comments = (fileContent.match(/#/g) || []).length;
  }

  nodes.push({
    id: generateNodeId(fileSpecificPrefix, 'info', 'sourcefile'),
    label: `${language} File (Regex)`,
    type: `${language}_file_regex`,
    details: `Lines: ${lines}, Functions: ${functions.length}, Classes: ${classes.length}, Imports: ${imports.length}, Comments: ${comments}`,
  });
  return {
    analysisSummary: `${language} file '${fileName}' (${lines} lines). Regex Analysis: Functions: ${functions.length}, Classes: ${classes.length}, Imports: ${imports.length}.`,
    detailedNodes: nodes,
  };
}

function analyzePlainText(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): { analysisSummary: string; detailedNodes: DetailedNode[] } {
  const lines = fileContent.split('\n');
  const firstLine = lines[0]?.substring(0, 100) || '';
  const nodes: DetailedNode[] = [
    {
      id: generateNodeId(fileSpecificPrefix, 'info', 'textfile'),
      label: 'Text File',
      type: 'text_file',
      details: `Contains ${lines.length} lines.`,
    },
    {
      id: generateNodeId(fileSpecificPrefix, 'preview', 'firstline'),
      label: 'First Line Preview',
      type: 'content_preview',
      details: firstLine,
    },
  ];
  return {
    analysisSummary: `Plain text file '${fileName}' with ${lines.length} lines. Preview: '${firstLine}...'.`,
    detailedNodes: nodes,
  };
}

function analyzeFallback(
  fileName: string,
  contentType: string | undefined,
  fileSize: number | undefined,
  userHint: string | undefined,
  generateNodeId: Function,
  fileSpecificPrefix: string,
  isFileBinary: boolean
): { analysisSummary: string; detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [
    {
      id: generateNodeId(fileSpecificPrefix, 'info', 'genericfile'),
      label: 'File Summary',
      type: 'generic_file',
      details: `Type: ${contentType || 'unknown'}, Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}`,
    },
  ];
  if (isFileBinary) {
    nodes.push({
      id: generateNodeId(fileSpecificPrefix, 'type', 'binary'),
      label: 'Binary File',
      type: 'binary_info',
      details: `Content type: ${contentType}`,
    });
  }
  return {
    analysisSummary: `File '${fileName}' (${contentType || 'unknown type'}). Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}. User hint: '${userHint || 'N/A'}'. Basic analysis performed.`,
    detailedNodes: nodes,
  };
}

// ... (rest of the code remains the same)
            console.log(
              `[Analyzer] Generic JSON analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0, 100)}...`
            );
            break;
          case 'markdown':
            keyFileType = 'readme';
            console.log(`[Analyzer] Analyzing Markdown: ${file.name}`);
            analysisResult = analyzeMarkdown(
              file.name,
              fileContentString,
              generateNodeId,
              localFileSpecificPrefix
            );
            output.keyFiles?.push({
              filePath: file.name,
              type: keyFileType,
              briefDescription: analysisResult.analysisSummary,
            });
            console.log(
              `[Analyzer] Markdown analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0, 100)}...`
            );
            break;
          case 'text':
            keyFileType = 'generic_text';
            console.log(`[Analyzer] Analyzing plain text: ${file.name}`);
            analysisResult = analyzePlainText(
              file.name,
              fileContentString,
              generateNodeId,
              localFileSpecificPrefix
            );
            output.keyFiles?.push({
              filePath: file.name,
              type: keyFileType,
              briefDescription: analysisResult.analysisSummary,
            });
            console.log(
              `[Analyzer] Plain text analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0, 100)}...`
            );
            break;
          case 'pom_xml':
          case 'csproj_file':
          case 'gradle_script':
            keyFileType = effectiveType;
            console.log(
              `[Analyzer] Analyzing Manifest (${effectiveType}): ${file.name}`
            );
            if (!output.keyFiles?.find((kf) => kf.filePath === file.name)) {
              let desc = `${effectiveType} file.`;
              if (effectiveType === 'pom_xml')
                desc = parsePomXml(fileContentString).projectName || desc;
              if (effectiveType === 'csproj_file')
                desc =
                  parseCsproj(fileContentString, file.name).projectName || desc;
              if (effectiveType === 'gradle_script')
                desc = parseBuildGradle(fileContentString).projectName || desc;
              output.keyFiles?.push({
                filePath: file.name,
                type: keyFileType,
                briefDescription: desc,
              });
            }
            console.log(
              `[Analyzer] ${effectiveType} analysis for ${file.name} done.`
            );
            break;
          case 'css': // Moved specific handling for CSS
            keyFileType = effectiveType;
            console.log(`[Analyzer] Analyzing ${effectiveType}: ${file.name}`);
            output.keyFiles?.push({
              filePath: file.name,
              type: keyFileType,
              briefDescription: 'Stylesheet defining visual styles.',
            });
            console.log(
              `[Analyzer] ${effectiveType} ${file.name} added to keyFiles.`
            );
            break;
          case 'html':
            keyFileType = effectiveType;
            console.log(`[Analyzer] Analyzing ${effectiveType}: ${file.name}`);
            output.keyFiles?.push({
              filePath: file.name,
              type: keyFileType,
              briefDescription: 'HTML document structure.',
            });
            console.log(
              `[Analyzer] ${effectiveType} ${file.name} added to keyFiles.`
            );
            break;
          case 'dockerfile':
          case 'docker_compose_config':
          case 'cicd_script_yaml':
          case 'github_workflow_yaml':
          case 'gitlab_ci_yaml':
          case 'shell_script':
          case 'env_config':
          case 'xml_config':
          case 'text_config':
            keyFileType = effectiveType;
            let defaultDesc = `${effectiveType} file.`;
            if (fileContentString) {
              const MAX_SNIPPET_LENGTH = 4000;
              const snippet = fileContentString.substring(
                0,
                MAX_SNIPPET_LENGTH
              );
              try {
                console.log(
                  `[Analyzer] Requesting LLM summary for ${file.name} (type: ${keyFileType})`
                );
                const summaryResult = await summarizeGenericFileFlow.run({
                  fileName: file.name,
                  fileContentSnippet: snippet,
                  fileType: keyFileType,
                });
                if (summaryResult.summary && !summaryResult.error) {
                  defaultDesc = summaryResult.summary;
                  console.log(
                    `[Analyzer] LLM summary for ${file.name}: ${defaultDesc.substring(0, 100)}...`
                  );
                } else {
                  console.warn(
                    `[Analyzer] LLM summarization failed for ${file.name}: ${summaryResult.error || 'No summary returned.'}`
                  );
                  if (summaryResult.error)
                    output.parsingErrors?.push(
                      `LLM summary error for ${file.name}: ${summaryResult.error}`
                    );
                }
              } catch (llmError: any) {
                console.error(
                  `[Analyzer] Critical error calling summarizeGenericFileFlow for ${file.name}:`,
                  llmError
                );
                output.parsingErrors?.push(
                  `Critical LLM flow error for ${file.name}: ${llmError.message}`
                );
              }
            }
            output.keyFiles?.push({
              filePath: file.name,
              type: keyFileType,
              briefDescription: defaultDesc,
            });
            break;
          default:
            if (!output.keyFiles?.find((kf) => kf.filePath === file.name)) {
              let desc = `${effectiveType} file (unhandled content type).`;
              let kfType: KeyFile['type'] = 'unknown';
              const potentialKeyFileType = effectiveType as KeyFile['type'];
              const validKeyFileTypes = KeyFileSchema.shape.type._def.values;
              if (validKeyFileTypes.includes(potentialKeyFileType)) {
                kfType = potentialKeyFileType;
              }
              output.keyFiles?.push({
                filePath: file.name,
                type: kfType,
                briefDescription: desc,
              });
            }
            console.log(
              `[Analyzer] File ${file.name} (type: ${effectiveType}) passed through default case in content analysis switch (content was present but not specifically parsed).`
            );
            break;
        }
      }

      // Condition B: !fileContentString AND typesRequiringContent.includes(effectiveType)
      // This means we needed content for this type, but couldn't get it.
      if (!fileContentString && typesRequiringContent.includes(effectiveType)) {
        const errMsg = `Could not read content for expected text-based file: ${file.name} (Type: ${effectiveType})`;
        output.parsingErrors?.push(errMsg);
        console.warn(`[Analyzer] ${errMsg}`);
        if (!output.keyFiles?.find((kf) => kf.filePath === file.name)) {
          const potentialKeyFileType = effectiveType as KeyFile['type'];
          const validKeyFileTypes = KeyFileSchema.shape.type._def.values;
          const kfType = validKeyFileTypes.includes(potentialKeyFileType)
            ? potentialKeyFileType
            : 'unknown';
          output.keyFiles?.push({
            filePath: file.name,
            type: kfType,
            briefDescription: `Unable to read content for this ${effectiveType} file.`,
          });
        }
      }

      // Condition C: !fileContentString AND (effectiveType is binary/unknown OR not in typesRequiringContent)
      // This means it's a binary/unknown file, or a type we didn't require content for, and we don't have its content.
      // This is primarily for just cataloging binary/unknown files found in a ZIP that weren't pre-loaded,
      // or files listed from storage that are binary/unknown and thus content wasn't fetched.
      if (
        !fileContentString &&
        (effectiveType === 'binary_data' ||
          effectiveType === 'binary' ||
          effectiveType === 'unknown' ||
          !typesRequiringContent.includes(effectiveType))
      ) {
        if (!output.keyFiles?.find((kf) => kf.filePath === file.name)) {
          let desc = `${effectiveType} file.`;
          let kfType: KeyFile['type'] = 'unknown';
          if (effectiveType === 'binary_data' || effectiveType === 'binary') {
            desc = 'Binary data file.';
            kfType = 'binary_data';
          } else if (effectiveType === 'unknown') {
            desc = 'File of unrecognized type.';
            kfType = 'unknown';
          } else {
            // A type not in typesRequiringContent, and we don't have content
            desc = `File of type: ${effectiveType} (content not loaded/required for this analysis pass).`;
            const potentialKeyFileType = effectiveType as KeyFile['type'];
            const validKeyFileTypes = KeyFileSchema.shape.type._def.values;
            if (validKeyFileTypes.includes(potentialKeyFileType)) {
              kfType = potentialKeyFileType;
            }
          }
          output.keyFiles?.push({
            filePath: file.name,
            type: kfType,
            briefDescription: desc,
          });
        }
      }
    }
    console.log('[Analyzer] Finished deep analysis loop.');

    // Step: Deepen directoryStructureSummary
    const directoryDataMap = new Map<
      string,
      {
        files: string[];
        subDirectoryNames: Set<string>;
        fileCounts: Record<string, number>;
        depth: number;
      }
    >();
    directoryDataMap.set('.', {
      files: [],
      subDirectoryNames: new Set(),
      fileCounts: {},
      depth: 0,
    }); // Project root

    for (const file of filesList) {
      const filePathParts = file.name.split('/').filter((p) => p); // Filter out empty parts from leading/trailing slashes
      let currentPath = '.';

      for (let i = 0; i < filePathParts.length; i++) {
        const part = filePathParts[i];
        if (i === filePathParts.length - 1) {
          // It's a file
          if (!directoryDataMap.has(currentPath)) {
            // This case should ideally not happen if root is always present and paths are built up correctly
            // but as a safeguard:
            const pathDepth =
              currentPath === '.' ? 0 : currentPath.split('/').length;
            directoryDataMap.set(currentPath, {
              files: [],
              subDirectoryNames: new Set(),
              fileCounts: {},
              depth: pathDepth,
            });
          }
          directoryDataMap.get(currentPath)!.files.push(part);
          const ext =
            path.extname(part) || (part.startsWith('.') ? part : '<no_ext>');
          directoryDataMap.get(currentPath)!.fileCounts[ext] =
            (directoryDataMap.get(currentPath)!.fileCounts[ext] || 0) + 1;
        } else {
          // It's a directory part
          const parentPath = currentPath;
          currentPath = currentPath === '.' ? part : `${currentPath}/${part}`;

          if (!directoryDataMap.has(parentPath)) {
            // Ensure parent exists
            const parentDepth =
              parentPath === '.' ? 0 : parentPath.split('/').length;
            directoryDataMap.set(parentPath, {
              files: [],
              subDirectoryNames: new Set(),
              fileCounts: {},
              depth: parentDepth,
            });
          }
          directoryDataMap.get(parentPath)!.subDirectoryNames.add(part);

          if (!directoryDataMap.has(currentPath)) {
            const pathDepth = currentPath.split('/').length;
            directoryDataMap.set(currentPath, {
              files: [],
              subDirectoryNames: new Set(),
              fileCounts: {},
              depth: pathDepth,
            });
          }
        }
      }
    }

    output.directoryStructureSummary = [];
    // const MAX_DIR_DEPTH_FOR_SUMMARY = 3; // Configure max depth for summary to avoid excessive detail // Duplicate

    for (const [dirPath, data] of directoryDataMap.entries()) {
      // if (data.depth > MAX_DIR_DEPTH_FOR_SUMMARY && dirPath !== '.') continue; // Skip very deep directories unless it's root // Duplicate

      let inferredPurpose = 'General';
      const lowerDirPath = dirPath.toLowerCase();
      const dirName = dirPath.split('/').pop()?.toLowerCase() || '';

      if (dirName === 'src' || dirName === 'source' || dirName === 'app')
        inferredPurpose = 'Source Code';
      else if (dirName === 'tests' || dirName === '__tests__')
        inferredPurpose = 'Tests';
      else if (dirName === 'services') inferredPurpose = 'Service Layer';
      else if (
        dirName === 'components' ||
        dirName === 'ui' ||
        dirName === 'views' ||
        dirName === 'pages'
      )
        inferredPurpose = 'UI Components/Views';
      else if (
        dirName === 'utils' ||
        dirName === 'helpers' ||
        dirName === 'lib'
      )
        inferredPurpose = 'Utilities/Libraries';
      else if (dirName === 'config' || dirName === 'configuration')
        inferredPurpose = 'Configuration';
      else if (dirName === 'docs' || dirName === 'documentation')
        inferredPurpose = 'Documentation';
      else if (
        dirName === 'assets' ||
        dirName === 'static' ||
        dirName === 'public'
      )
        inferredPurpose = 'Static Assets';
      else if (
        dirName === 'models' ||
        dirName === 'domain' ||
        dirName === 'entities'
      )
        inferredPurpose = 'Data Models/Entities';
      else if (
        dirName === 'routes' ||
        dirName === 'controllers' ||
        dirName === 'api'
      )
        inferredPurpose = 'API Routes/Controllers';
      else if (dirName === 'hooks') inferredPurpose = 'React Hooks';
      else if (dirName === 'styles' || dirName === 'css' || dirName === 'scss')
        inferredPurpose = 'Stylesheets';
      else if (dirName === 'scripts') inferredPurpose = 'Build/Utility Scripts';
      else if (dirName === 'data' || dirName === 'database' || dirName === 'db')
        inferredPurpose = 'Data/Database related';
      // Add more heuristics based on common directory names

      // Heuristic based on dominant file types within the directory
      if (
        data.fileCounts['.js'] > data.files.length / 2 ||
        data.fileCounts['.ts'] > data.files.length / 2
      )
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'JavaScript/TypeScript Modules'
            : `${inferredPurpose} (JS/TS)`;
      if (data.fileCounts['.py'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Python Modules'
            : `${inferredPurpose} (Python)`;
      if (data.fileCounts['.java'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Java Code'
            : `${inferredPurpose} (Java)`;
      if (data.fileCounts['.cs'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General' ? 'C# Code' : `${inferredPurpose} (C#)`;
      if (data.fileCounts['.md'] > data.files.length / 2 && dirName !== 'docs')
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Markdown Documentation'
            : `${inferredPurpose} (Markdown)`;

      // Only add if it has files or subdirectories, or it's the root.
      if (
        dirPath === '.' ||
        data.files.length > 0 ||
        data.subDirectoryNames.size > 0
      ) {
        output.directoryStructureSummary.push({
          path: dirPath,
          fileCounts: data.fileCounts,
          inferredPurpose: inferredPurpose,
        });
      }
    }
    // Sort by path to make it more readable
    output.directoryStructureSummary.sort((a, b) =>
      a.path.localeCompare(b.path)
    );

    // Step: Infer PotentialArchitecturalComponents (after all files and directories are processed)
    console.log('[Analyzer] Inferring potential architectural components...');
    output.potentialArchitecturalComponents = [];

    // Rule 1-4: Based on directoryStructureSummary
    for (const dirSummary of output.directoryStructureSummary) {
      const dirPath = dirSummary.path;
      const dirName = dirPath.split('/').pop()?.toLowerCase() || '';
      let componentName = dirName.charAt(0).toUpperCase() + dirName.slice(1); // Capitalize
      let componentType: PotentialArchitecturalComponent['type'] | null = null;
      const relatedFilesFromDir: string[] = [];

      // Collect all files in this directory and its subdirectories (up to a certain depth for performance)
      // This requires iterating through filesList again or using directoryDataMap more effectively
      // For simplicity in this step, we'll use files directly under this dirSummary.path for now
      // A more robust solution would be to use the directoryDataMap to get all nested files.

      // Simplified: get files directly under this path from filesList
      filesList.forEach((file) => {
        if (
          file.name.startsWith(dirPath === '.' ? '' : `${dirPath}/`) &&
          !file.name
            .substring(dirPath === '.' ? 0 : dirPath.length + 1)
            .includes('/')
        ) {
          relatedFilesFromDir.push(file.name);
        } else if (dirPath === '.' && !file.name.includes('/')) {
          // Root files
          relatedFilesFromDir.push(file.name);
        }
      });

      const sourceCodeFilesCount = Object.entries(dirSummary.fileCounts)
        .filter(([ext]) =>
          ['.js', '.ts', '.py', '.java', '.cs'].includes(ext.toLowerCase())
        )
        .reduce((sum, [, count]) => sum + count, 0);

      const uiFrameworkFileCount = Object.entries(dirSummary.fileCounts)
        .filter(([ext]) =>
          ['.tsx', '.vue', '.svelte', '.jsx'].includes(ext.toLowerCase())
        ) // .jsx added
        .reduce((sum, [, count]) => sum + count, 0);

      const configFilesCount = Object.entries(dirSummary.fileCounts)
        .filter(([ext]) =>
          [
            '.json',
            '.yaml',
            '.yml',
            '.xml',
            '.properties',
            '.ini',
            '.toml',
            '.env',
          ].includes(ext.toLowerCase())
        )
        .reduce((sum, [, count]) => sum + count, 0);

      if (
        [
          'services',
          'controllers',
          'api',
          'handlers',
          'routes',
          'features',
          'modules',
        ].includes(dirName) &&
        sourceCodeFilesCount > 1
      ) {
        componentType = 'service'; // Or 'module'
        componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
      } else if (
        (['components', 'ui', 'views', 'pages', 'client', 'frontend'].includes(
          dirName
        ) ||
          uiFrameworkFileCount > relatedFilesFromDir.length / 3) &&
        uiFrameworkFileCount > 0
      ) {
        componentType = 'ui_area';
        componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
      } else if (
        [
          'models',
          'entities',
          'db',
          'data',
          'schemas',
          'repositories',
          'dao',
        ].includes(dirName) &&
        sourceCodeFilesCount > 0
      ) {
        componentType = 'data_store_interface';
        componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
      } else if (
        (['config', 'configuration', 'settings'].includes(dirName) ||
          dirName.endsWith('_config')) &&
        configFilesCount > 1
      ) {
        componentType = 'module'; // Configuration module
        componentName = `${componentName} Configuration`;
      }

      if (componentType && componentName) {
        // Filter relatedFiles to include only files directly in this path for this simple rule
        const directFilesInDir = filesList
          .filter((f) => {
            const fParent = path.dirname(f.name);
            return (
              (dirPath === '.' && (fParent === '.' || !fParent)) ||
              fParent === dirPath
            );
          })
          .map((f) => f.name);

        if (directFilesInDir.length > 0) {
          // Only add if component has direct files
          output.potentialArchitecturalComponents.push({
            name: componentName,
            type: componentType,
            relatedFiles: directFilesInDir,
          });
        }
      }
    }

    // Rule 5: Based on entry_point (simplified)
    const entryPointFile = output.keyFiles?.find(
      (kf) => kf.type === 'entry_point'
    );
    if (entryPointFile && output.projectName) {
      // Check if a general component for the project name already exists (e.g. from 'src' dir)
      const projectRootComponentName = `${output.projectName} Main Application`;
      if (
        !output.potentialArchitecturalComponents.find((c) =>
          c.name.toLowerCase().includes(output.projectName!.toLowerCase())
        )
      ) {
        // Collect all source files not already part of other specific components for 'relatedFiles'
        // This is a simplification; a more robust way would involve dependency analysis or better grouping.
        const existingRelatedFiles = new Set(
          output.potentialArchitecturalComponents.flatMap(
            (c) => c.relatedFiles || []
          )
        );
        const mainAppFiles = filesList
          .filter(
            (f) =>
              (f.name.endsWith('.js') ||
                f.name.endsWith('.ts') ||
                f.name.endsWith('.py') ||
                f.name.endsWith('.java') ||
                f.name.endsWith('.cs')) &&
              !f.name.toLowerCase().includes('test') &&
              !existingRelatedFiles.has(f.name) &&
              (f.name.startsWith('src/') ||
                f.name.startsWith('app/') ||
                !f.name.includes('/')) // Heuristic for main app files
          )
          .map((f) => f.name);

        if (mainAppFiles.length > 0) {
          output.potentialArchitecturalComponents.push({
            name: projectRootComponentName,
            type: 'service', // Or 'module'
            relatedFiles: mainAppFiles,
          });
        } else if (
          !output.potentialArchitecturalComponents.find(
            (c) => c.type === 'service' || c.type === 'module'
          )
        ) {
          // If no other significant components found, add the entry point itself as a component.
          output.potentialArchitecturalComponents.push({
            name: projectRootComponentName,
            type: 'service',
            relatedFiles: [entryPointFile.filePath],
          });
        }
      }
    }

    // Deduplicate components by name (simple deduplication)
    if (output.potentialArchitecturalComponents.length > 0) {
      const uniqueComponents = new Map<
        string,
        PotentialArchitecturalComponent
      >();
      output.potentialArchitecturalComponents.forEach((comp) => {
        if (!uniqueComponents.has(comp.name)) {
          uniqueComponents.set(comp.name, comp);
        } else {
          // Optional: Merge relatedFiles if component names are duplicated
          const existing = uniqueComponents.get(comp.name)!;
          existing.relatedFiles = [
            ...new Set([
              ...(existing.relatedFiles || []),
              ...(comp.relatedFiles || []),
            ]),
          ];
        }
      });
      output.potentialArchitecturalComponents = Array.from(
        uniqueComponents.values()
      );
    }
    console.log(
      `[Analyzer] Inferred ${output.potentialArchitecturalComponents.length} potential architectural components.`
    );

    // Step: Build File Dependency Graph (Conceptual - No output change in this step, but sets up for future enhancements)
    const astAnalysisResultsForDepGraph = new Map<
      string,
      { rawImports: RawASTImport[]; rawExports: RawASTExport[] }
    >();

    // Re-iterate filesList to populate astAnalysisResultsForDepGraph (or integrate into the main loop if performance is a concern)
    // For this iteration, we'll assume the main loop populates it.
    // The main loop's calls to analyzeJavaScriptAST, analyzeTypeScriptAST, analyzePythonAST
    // should now be structured to return rawImports and rawExports, which are then stored.
    // This was done in the previous conceptual step of modifying AST analyzers.

    // Example of how it would be populated in the main loop (actual population happens there):
    // if (jsAnalysisResult) {
    //   astAnalysisResultsForDepGraph.set(file.name, {
    //     rawImports: jsAnalysisResult.rawImports,
    //     rawExports: jsAnalysisResult.rawExports
    //   });
    // }

    // Placeholder for actual call to buildDependencyGraph
    // const dependencyGraph = await buildDependencyGraph(astAnalysisResultsForDepGraph, filesList.map(f => f.name));
    // if (dependencyGraph) {
    //   console.log(`[Analyzer] Dependency graph constructed with ${dependencyGraph.size} nodes.`);
    // Further processing or adding to output would happen here in a future step.
    // For example, attach simplified dependency info to KeyFile.details or a new field.
    // }

    console.log(
      '[Analyzer] AST analysis results collected for potential dependency graph. Actual graph construction deferred.'
    );

    // Placeholder for buildDependencyGraph and resolveImportPath function implementations - Now being implemented

    interface ResolvedImport {
      targetPath: string; // Resolved path (internal) or identifier (external, e.g., 'npm:lodash')
      type: 'internal' | 'external' | 'unresolved';
      originalPath: string;
      specificSymbols?: string[]; // For the original import statement
      // Adding a field for any details or errors during resolution for this specific import
      resolutionDetails?: string;
    }

    function resolveImportPath(
      importingFilePath: string,
      rawImportPath: string,
      language: 'javascript' | 'typescript' | 'python',
      projectFiles: string[], // List of all file paths in the project relative to root
      pythonImportLevel?: number
    ): ResolvedImport {
      // NOTE: This resolver currently does NOT support TypeScript path aliases
      // (compilerOptions.paths in tsconfig.json) or custom baseUrl resolution beyond standard
      // Node.js relative/package resolution. Imports using such aliases will likely be treated
      // as 'external' or 'unresolved'. Future enhancements could include parsing tsconfig.json.
      const projectRoot = '.';
      const importingFileDir = path.posix.dirname(importingFilePath);

      const normalizePath = (p: string) => p.replace(/\\/g, '/');
      const normalizedRawImportPath = normalizePath(rawImportPath);

      // More specific ordered extension list for JS/TS
      const jsTsOrderedExtensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.json', // Added .json as it's a common import
      ];
      // Ordered index file names (without extension, to be combined with jsTsOrderedExtensions)
      const jsTsOrderedIndexNames = ['index'];

      if (language === 'javascript' || language === 'typescript') {
        const builtInNodeModules = [
          'fs',
          'path',
          'http',
          'https',
          'os',
          'events',
          'stream',
          'util',
          'crypto',
          'zlib',
          'url',
          'querystring',
          'assert',
          'buffer',
          'child_process',
          'cluster',
          'dgram',
          'dns',
          'domain',
          'net',
          'readline',
          'repl',
          'tls',
          'tty',
          'vm',
          'string_decoder',
        ];
        if (builtInNodeModules.includes(normalizedRawImportPath)) {
          return {
            targetPath: `node:${normalizedRawImportPath}`,
            type: 'external',
            originalPath: rawImportPath,
            resolutionDetails: 'Node.js built-in module.',
          };
        }

        if (
          normalizedRawImportPath.startsWith('./') ||
          normalizedRawImportPath.startsWith('../')
        ) {
          // Relative path
          const resolvedAbsolute = path.posix.resolve(
            importingFileDir,
            normalizedRawImportPath
          );
          let resolvedBase = path.posix.relative(projectRoot, resolvedAbsolute);
          if (resolvedBase.startsWith('../')) {
            return {
              targetPath: rawImportPath,
              type: 'unresolved',
              originalPath: rawImportPath,
              resolutionDetails: 'Resolved path is outside project root.',
            };
          }
          if (resolvedBase === '') resolvedBase = '.'; // Handles case where importingFileDir is projectRoot

          // Attempt 1: Direct match with original path (if it includes an extension)
          if (
            projectFiles.includes(resolvedBase) &&
            jsTsOrderedExtensions.some((ext) => resolvedBase.endsWith(ext))
          ) {
            return {
              targetPath: resolvedBase,
              type: 'internal',
              originalPath: rawImportPath,
            };
          }

          // Attempt 2: Try adding extensions to the resolvedBase path
          for (const ext of jsTsOrderedExtensions) {
            const candidate = `${resolvedBase}${ext}`;
            if (projectFiles.includes(candidate)) {
              return {
                targetPath: candidate,
                type: 'internal',
                originalPath: rawImportPath,
              };
            }
          }

          // Attempt 3: Try as a directory (implies importing an index file)
          for (const indexName of jsTsOrderedIndexNames) {
            for (const ext of jsTsOrderedExtensions) {
              // Check projectFiles for path.posix.join(resolvedBase, `${indexName}${ext}`)
              // Example: if rawImportPath is './components', resolvedBase is 'components'
              // We check 'components/index.ts', 'components/index.js', etc.
              const candidate = normalizePath(
                path.posix.join(resolvedBase, `${indexName}${ext}`)
              );
              if (projectFiles.includes(candidate)) {
                return {
                  targetPath: candidate,
                  type: 'internal',
                  originalPath: rawImportPath,
                };
              }
            }
          }

          return {
            targetPath: rawImportPath,
            type: 'unresolved',
            originalPath: rawImportPath,
            resolutionDetails: `Could not resolve relative path: '${resolvedBase}' with JS/TS extensions or as directory index.`,
          };
        } else {
          // For non-relative paths, assume external (NPM package).
          // Path alias (tsconfig paths) are not handled in this iteration.
          return {
            targetPath: `npm:${normalizedRawImportPath}`,
            type: 'external',
            originalPath: rawImportPath,
            resolutionDetails: 'Assumed NPM package (or unhandled path alias).',
          };
        }
      } else if (language === 'python') {
        const pyPossibleExtensions = ['.py', '/__init__.py']; // Order: .py file, then package via __init__.py

        if (pythonImportLevel && pythonImportLevel > 0) {
          // Relative import: from .foo import X or from ..bar import Y
          let currentDirParts =
            importingFileDir === '.' ? [] : importingFileDir.split('/');
          if (pythonImportLevel > currentDirParts.length + 1) {
            // +1 because level 1 means same package, level 2 means parent.
            return {
              targetPath: rawImportPath,
              type: 'unresolved',
              originalPath: rawImportPath,
              resolutionDetails: `Relative import level ${pythonImportLevel} for '${rawImportPath}' is too deep from file '${importingFilePath}'.`,
            };
          }
          // For 'from . import X', level is 1, base is currentDirParts.
          // For 'from .. import X', level is 2, base is parent of currentDirParts.
          const baseLookupPathParts = currentDirParts.slice(
            0,
            currentDirParts.length - (pythonImportLevel - 1)
          );

          const modulePathParts = normalizedRawImportPath
            ? normalizedRawImportPath.split('.')
            : []; // e.g. "mod" or "subpkg.mod"
          const resolvedPathAttempt = path.posix.join(
            ...baseLookupPathParts,
            ...modulePathParts
          );

          for (const ext of pyPossibleExtensions) {
            const candidate = normalizePath(`${resolvedPathAttempt}${ext}`);
            if (projectFiles.includes(candidate)) {
              return {
                targetPath: candidate,
                type: 'internal',
                originalPath: rawImportPath,
              };
            }
          }
          // Attempt to resolve if rawImportPath itself is a directory (package)
          // e.g. "from . import mypackage" -> ./mypackage/__init__.py
          if (!normalizedRawImportPath) {
            // from . import X (X is likely a module in current package)
            // This case is tricky, as X could be a module or a symbol in __init__.py
            // For now, we assume X is a module if rawImportPath is empty.
            // A more robust solution would require knowing what X is.
            // This specific case (empty rawImportPath for relative imports) might need to be handled by looking at specificSymbols.
          }

          return {
            targetPath: rawImportPath,
            type: 'unresolved',
            originalPath: rawImportPath,
            resolutionDetails: `Could not resolve Python relative import '${rawImportPath}' from '${importingFilePath}'. Attempted path: ${resolvedPathAttempt}`,
          };
        } else {
          // Absolute import: import foo.bar or from foo.bar import X
          const modulePath = normalizedRawImportPath.replace(/\./g, '/');
          for (const ext of pyPossibleExtensions) {
            const candidate = normalizePath(`${modulePath}${ext}`);
            if (projectFiles.includes(candidate)) {
              return {
                targetPath: candidate,
                type: 'internal',
                originalPath: rawImportPath,
              };
            }
          }
          // If not found as internal, assume external/unresolved (Python stdlib or installed package)
          // A more robust check would involve consulting a list of stdlib modules or checking installed packages.
          return {
            targetPath: `pypi:${normalizedRawImportPath}`,
            type: 'external',
            originalPath: rawImportPath,
            resolutionDetails: 'Assumed PyPI package or stdlib module.',
          };
        }
      }

      // Fallback for unknown language or unhandled case
      return {
        targetPath: rawImportPath,
        type: 'unresolved',
        originalPath: rawImportPath,
        resolutionDetails: `Unsupported language '${language}' for path resolution or unhandled case.`,
      };
    }

    // --- File Dependency Graph Construction (Conceptual Implementation) ---

    // Helper to determine language from filePath for resolveImportPath
    const getLanguageFromPath = (
      filePath: string
    ): 'javascript' | 'typescript' | 'python' | 'unknown' => {
      if (
        filePath.endsWith('.js') ||
        filePath.endsWith('.jsx') ||
        filePath.endsWith('.mjs') ||
        filePath.endsWith('.cjs')
      )
        return 'javascript';
      if (
        filePath.endsWith('.ts') ||
        filePath.endsWith('.tsx') ||
        filePath.endsWith('.mts') ||
        filePath.endsWith('.cts')
      )
        return 'typescript';
      if (filePath.endsWith('.py')) return 'python';
      return 'unknown';
    };

    async function buildDependencyGraph(
      analyzedFilesData: Map<
        string,
        { rawImports: RawASTImport[]; rawExports: RawASTExport[] }
      >,
      projectFilesList: string[]
    ): Promise<Map<string, FileDependencyNode>> {
      const graph = new Map<string, FileDependencyNode>();

      // Initialize graph nodes
      for (const filePath of projectFilesList) {
        // Only create nodes for files that might have AST analysis results or are source files
        const lang = getLanguageFromPath(filePath);
        if (lang !== 'unknown' || analyzedFilesData.has(filePath)) {
          // Ensure we only process relevant files
          graph.set(filePath, {
            filePath,
            imports: [],
            // Populate exports from analyzedFilesData if available, otherwise empty
            exports:
              analyzedFilesData.get(filePath)?.rawExports.map((ex) => ({
                name: ex.name,
                type: ex.type, // RawASTExport type should be compatible or mapped
                isDefaultExport: ex.isDefaultExport,
              })) || [],
            importedBy: [],
          });
        }
      }

      console.log(
        `[DepGraph] Initialized ${graph.size} nodes for dependency graph.`
      );

      // Process imports for each file
      for (const [filePath, data] of analyzedFilesData.entries()) {
        const sourceNode = graph.get(filePath);
        if (!sourceNode) continue; // Should not happen if initialized correctly

        const language = getLanguageFromPath(filePath);
        if (language === 'unknown') continue; // Cannot resolve imports for unknown language

        for (const rawImp of data.rawImports) {
          const resolved = resolveImportPath(
            filePath,
            rawImp.originalPath,
            language,
            projectFilesList,
            rawImp.pythonImportLevel
          );

          if (resolved) {
            sourceNode.imports.push({
              targetPath: resolved.targetPath,
              type: resolved.type,
              originalPath: resolved.originalPath,
              specificSymbols: rawImp.importedSymbols, // Keep original symbols from RawASTImport
              // resolutionDetails: resolved.resolutionDetails, // Optionally include for debugging
            });

            if (
              resolved.type === 'internal' &&
              graph.has(resolved.targetPath)
            ) {
              const targetNode = graph.get(resolved.targetPath)!;
              if (!targetNode.importedBy.includes(filePath)) {
                targetNode.importedBy.push(filePath);
              }
            } else if (
              resolved.type === 'internal' &&
              !graph.has(resolved.targetPath)
            ) {
              // This case might happen if a project file was imported but not part of the initial set of files
              // for which nodes were created (e.g. if it wasn't a JS/TS/PY file but still part of the projectFilesList).
              // Or if projectFilesList contains files not in analyzedFilesData keys.
              console.warn(
                `[DepGraph] Internal import target '${resolved.targetPath}' not found in graph nodes. Source: ${filePath}, Import: ${rawImp.originalPath}`
              );
              // Optionally, add a minimal node for it if it's in projectFilesList
              if (
                projectFilesList.includes(resolved.targetPath) &&
                !graph.has(resolved.targetPath)
              ) {
                graph.set(resolved.targetPath, {
                  filePath: resolved.targetPath,
                  imports: [],
                  exports: [], // Unknown exports for non-analyzed files
                  importedBy: [filePath],
                });
                console.log(
                  `[DepGraph] Added missing target node to graph: ${resolved.targetPath}`
                );
              }
            }
          } else {
            // Should not happen if resolveImportPath always returns a ResolvedImport object
            sourceNode.imports.push({
              targetPath: rawImp.originalPath,
              type: 'unresolved',
              originalPath: rawImp.originalPath,
              specificSymbols: rawImp.importedSymbols,
              resolutionDetails:
                'resolveImportPath returned null unexpectedly.',
            });
          }
        }
      }
      console.log(
        '[DepGraph] Finished processing imports with actual resolveImportPath.'
      );
      return graph;
    }

    const projectFilePaths = filesList.map((f) => f.name);
    const dependencyGraph = await buildDependencyGraph(
      astAnalysisResultsForDepGraph,
      projectFilePaths
    );

    if (dependencyGraph) {
      console.log(
        `[Analyzer] Dependency graph constructed with ${dependencyGraph.size} nodes.`
      );
      let internalEdges = 0;
      dependencyGraph.forEach((node) => {
        node.imports.forEach((imp) => {
          if (imp.type === 'internal') internalEdges++;
        });
      });
      console.log(
        `[Analyzer] Dependency graph contains ${internalEdges} internal import edges.`
      );

      // For debugging, print details for a few nodes
      let i = 0;
      for (const [filePath, node] of dependencyGraph.entries()) {
        if (i < 3 && (node.imports.length > 0 || node.exports.length > 0)) {
          console.log(`[DepGraph Node Sample]: ${filePath}`, {
            imports: node.imports
              .filter((imp) => imp.type === 'internal')
              .slice(0, 3)
              .map((i) => `${i.originalPath} -> ${i.targetPath} (${i.type})`),
            exports: node.exports.slice(0, 5).map((e) => e.name),
            importedByCount: node.importedBy.length,
          });
          i++;

          if (!directoryDataMap.has(currentPath)) {
            const pathDepth = currentPath.split('/').length;
            directoryDataMap.set(currentPath, {
              files: [],
              subDirectoryNames: new Set(),
              fileCounts: {},
              depth: pathDepth,
            });
          }
        }
      }
    }

    output.directoryStructureSummary = [];
    const MAX_DIR_DEPTH_FOR_SUMMARY = 3; // Configure max depth for summary to avoid excessive detail

    for (const [dirPath, data] of directoryDataMap.entries()) {
      if (data.depth > MAX_DIR_DEPTH_FOR_SUMMARY && dirPath !== '.') continue; // Skip very deep directories unless it's root

      let inferredPurpose = 'General';
      const lowerDirPath = dirPath.toLowerCase();
      const dirName = dirPath.split('/').pop()?.toLowerCase() || '';

      if (dirName === 'src' || dirName === 'source' || dirName === 'app')
        inferredPurpose = 'Source Code';
      else if (dirName === 'tests' || dirName === '__tests__')
        inferredPurpose = 'Tests';
      else if (dirName === 'services') inferredPurpose = 'Service Layer';
      else if (
        dirName === 'components' ||
        dirName === 'ui' ||
        dirName === 'views' ||
        dirName === 'pages'
      )
        inferredPurpose = 'UI Components/Views';
      else if (
        dirName === 'utils' ||
        dirName === 'helpers' ||
        dirName === 'lib'
      )
        inferredPurpose = 'Utilities/Libraries';
      else if (dirName === 'config' || dirName === 'configuration')
        inferredPurpose = 'Configuration';
      else if (dirName === 'docs' || dirName === 'documentation')
        inferredPurpose = 'Documentation';
      else if (
        dirName === 'assets' ||
        dirName === 'static' ||
        dirName === 'public'
      )
        inferredPurpose = 'Static Assets';
      else if (
        dirName === 'models' ||
        dirName === 'domain' ||
        dirName === 'entities'
      )
        inferredPurpose = 'Data Models/Entities';
      else if (
        dirName === 'routes' ||
        dirName === 'controllers' ||
        dirName === 'api'
      )
        inferredPurpose = 'API Routes/Controllers';
      else if (dirName === 'hooks') inferredPurpose = 'React Hooks';
      else if (dirName === 'styles' || dirName === 'css' || dirName === 'scss')
        inferredPurpose = 'Stylesheets';
      else if (dirName === 'scripts') inferredPurpose = 'Build/Utility Scripts';
      else if (dirName === 'data' || dirName === 'database' || dirName === 'db')
        inferredPurpose = 'Data/Database related';
      // Add more heuristics based on common directory names

      // Heuristic based on dominant file types within the directory
      if (
        data.fileCounts['.js'] > data.files.length / 2 ||
        data.fileCounts['.ts'] > data.files.length / 2
      )
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'JavaScript/TypeScript Modules'
            : `${inferredPurpose} (JS/TS)`;
      if (data.fileCounts['.py'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Python Modules'
            : `${inferredPurpose} (Python)`;
      if (data.fileCounts['.java'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Java Code'
            : `${inferredPurpose} (Java)`;
      if (data.fileCounts['.cs'] > data.files.length / 2)
        inferredPurpose =
          inferredPurpose === 'General' ? 'C# Code' : `${inferredPurpose} (C#)`;
      if (data.fileCounts['.md'] > data.files.length / 2 && dirName !== 'docs')
        inferredPurpose =
          inferredPurpose === 'General'
            ? 'Markdown Documentation'
            : `${inferredPurpose} (Markdown)`;

      // Only add if it has files or subdirectories, or it's the root.
      if (
        dirPath === '.' ||
        data.files.length > 0 ||
        data.subDirectoryNames.size > 0
      ) {
        output.directoryStructureSummary.push({
          path: dirPath,
          fileCounts: data.fileCounts,
          inferredPurpose: inferredPurpose,
        });
      }
    }
    // Sort by path to make it more readable
    output.directoryStructureSummary.sort((a, b) =>
      a.path.localeCompare(b.path)
    );

    // Python analysis
    const requirementsTxtFile = filesList.find(
      (f) => f.name.toLowerCase() === 'requirements.txt'
    );
    const setupPyFile = filesList.find(
      (f) => f.name.toLowerCase() === 'setup.py'
    );
    const pyprojectTomlFile = filesList.find(
      (f) => f.name.toLowerCase() === 'pyproject.toml'
    );
    const pyFiles = filesList.filter((f) => f.name.endsWith('.py'));
    let isPythonProject = pyFiles.length > 0;

    if (requirementsTxtFile || setupPyFile || pyprojectTomlFile) {
      isPythonProject = true;
    }
    // ... (Python analysis logic as before, including parseRequirementsTxt, metadata from setup.py/pyproject.toml) ...
    if (isPythonProject) {
      const pythonLang = output.inferredLanguagesFrameworks?.find(
        (l) => l.name === 'Python'
      );
      if (pythonLang) pythonLang.confidence = 'high';
      else
        output.inferredLanguagesFrameworks?.push({
          name: 'Python',
          confidence: 'high',
        });

      if (requirementsTxtFile) {
        const reqPath = input.projectStoragePath.endsWith('/')
          ? `${input.projectStoragePath}${requirementsTxtFile.name}`
          : `${input.projectStoragePath}/${requirementsTxtFile.name}`;
        // const reqContent = await downloadProjectFile(reqPath); // Use getFileContent for consistency
        const reqContent = await getFileContent(requirementsTxtFile.name);
        if (reqContent) {
          if (
            !output.keyFiles?.find(
              (kf) => kf.filePath === requirementsTxtFile.name
            )
          ) {
            output.keyFiles?.push({
              filePath: requirementsTxtFile.name,
              type: 'manifest',
              briefDescription: 'Python project dependencies.',
            });
          }
          try {
            const pythonDependencies = parseRequirementsTxt(reqContent);
            if (pythonDependencies.length > 0) {
              output.dependencies = {
                ...output.dependencies,
                pip: pythonDependencies,
              };
              const pipLang = output.inferredLanguagesFrameworks?.find(
                (l) => l.name === 'pip'
              );
              if (pipLang) pipLang.confidence = 'high';
              else
                output.inferredLanguagesFrameworks?.push({
                  name: 'pip',
                  confidence: 'high',
                });
            }
          } catch (e: any) {
            output.parsingErrors?.push(
              `Error parsing requirements.txt: ${e.message}`
            );
          }
        } else {
          output.parsingErrors?.push(
            `${requirementsTxtFile.name} found in listing but could not be downloaded/read.`
          );
        }
      }

      let projectNameFromPyMetadata: string | undefined;
      let projectVersionFromPyMetadata: string | undefined;

      if (pyprojectTomlFile) {
        const pyprojectTomlContent = await getFileContent(
          pyprojectTomlFile.name
        );
        if (pyprojectTomlContent) {
          if (
            !output.keyFiles?.find(
              (kf) => kf.filePath === pyprojectTomlFile.name
            )
          ) {
            output.keyFiles?.push({
              filePath: pyprojectTomlFile.name,
              type: 'manifest',
              briefDescription:
                'Project metadata and build configuration (TOML).',
            });
          }
          const nameMatch = pyprojectTomlContent.match(
            /name\s*=\s*["']([^"']+)["']/
          );
          if (nameMatch && nameMatch[1])
            projectNameFromPyMetadata = nameMatch[1];
          const versionMatch = pyprojectTomlContent.match(
            /version\s*=\s*["']([^"']+)["']/
          );
          if (versionMatch && versionMatch[1])
            projectVersionFromPyMetadata = versionMatch[1];
        } else {
          output.parsingErrors?.push(
            `${pyprojectTomlFile.name} found in listing but could not be downloaded/read.`
          );
        }
      }

      if (!projectNameFromPyMetadata && setupPyFile) {
        const setupPyContent = await getFileContent(setupPyFile.name);
        if (setupPyContent) {
          if (
            !output.keyFiles?.find((kf) => kf.filePath === setupPyFile.name)
          ) {
            output.keyFiles?.push({
              filePath: setupPyFile.name,
              type: 'manifest',
              briefDescription: 'Project metadata and build script (Python).',
            });
          }
          const nameMatch = setupPyContent.match(/name\s*=\s*["']([^"']+)["']/);
          if (nameMatch && nameMatch[1])
            projectNameFromPyMetadata = nameMatch[1];
          const versionMatch = setupPyContent.match(
            /version\s*=\s*["']([^"']+)["']/
          );
          if (versionMatch && versionMatch[1])
            projectVersionFromPyMetadata = versionMatch[1];
        } else {
          output.parsingErrors?.push(
            `${setupPyFile.name} found in listing but could not be downloaded/read.`
          );
        }
      }

      if (
        projectNameFromPyMetadata &&
        (!output.projectName ||
          output.projectName ===
            input.projectStoragePath.split('/').filter(Boolean).pop())
      ) {
        output.projectName = projectNameFromPyMetadata;
      }
      if (projectVersionFromPyMetadata) {
        const versionString = ` (Version: ${projectVersionFromPyMetadata})`;
        if (
          output.projectSummary &&
          !output.projectSummary.includes(versionString)
        )
          output.projectSummary += versionString;
        else if (!output.projectSummary)
          output.projectSummary = `Version: ${projectVersionFromPyMetadata}`;
      }

      // Deeper Python source file analysis
      const pythonSourceFiles = filesToAnalyze.filter((f) =>
        f.name.endsWith('.py')
      );
      const MAX_PY_FILES_TO_PROCESS = 20; // Similar limit as Node.js
      let processedPyFilesCount = 0;

      for (const pyFile of pythonSourceFiles) {
        if (processedPyFilesCount >= MAX_PY_FILES_TO_PROCESS) break;
        // Skip common virtual environment folders and __pycache__
        if (
          pyFile.name.includes('/venv/') ||
          pyFile.name.includes('/.venv/') ||
          pyFile.name.includes('__pycache__')
        ) {
          continue;
        }

        const fileContent = await getFileContent(pyFile.name);
        if (fileContent) {
          const imports = extractPyImports(fileContent);
          const classes = extractPyClasses(fileContent);
          const functions = extractPyFunctions(fileContent);
          const symbols = [...classes, ...functions];

          let fileType: KeyFileSchema['type'] = 'utility';
          if (
            pyFile.name.toLowerCase().endsWith('views.py') ||
            pyFile.name.toLowerCase().endsWith('routes.py')
          )
            fileType = 'service_definition';
          else if (pyFile.name.toLowerCase().endsWith('models.py'))
            fileType = 'model';
          else if (
            pyFile.name.toLowerCase() === 'app.py' ||
            pyFile.name.toLowerCase() === 'main.py' ||
            pyFile.name.toLowerCase() === 'manage.py'
          )
            fileType = 'entry_point';
          else if (classes.length > 0 && functions.length === 0)
            fileType = 'model'; // Heuristic: file with mostly classes might be models
          else if (functions.length > 0 && classes.length === 0)
            fileType = 'utility'; // Heuristic: file with mostly functions

          const existingKf = output.keyFiles?.find(
            (kf) => kf.filePath === pyFile.name
          );
          let detailsString = '';
          if (imports.length > 0)
            detailsString += `Imports: ${imports.join(', ')}`;
          if (symbols.length > 0)
            detailsString +=
              (detailsString ? '\n' : '') + `Symbols: ${symbols.join(', ')}`;

          if (existingKf) {
            existingKf.type =
              existingKf.type === 'unknown' ? fileType : existingKf.type;
            existingKf.details =
              (existingKf.details ? `${existingKf.details}\n` : '') +
              detailsString;
            existingKf.extractedSymbols = [
              ...new Set([...(existingKf.extractedSymbols || []), ...symbols]),
            ];
            if (!existingKf.briefDescription?.includes('Python source file'))
              existingKf.briefDescription =
                (existingKf.briefDescription || '') + ' Python source file.';
          } else {
            output.keyFiles?.push({
              filePath: pyFile.name,
              type: fileType,
              briefDescription:
                `Python source file. ${symbols.length > 0 ? 'Contains classes/functions.' : ''} ${imports.length > 0 ? 'Contains imports.' : ''}`.trim(),
              details: detailsString || undefined,
              extractedSymbols: symbols.length > 0 ? symbols : undefined,
            });
          }
          processedPyFilesCount++;
        } else {
          output.parsingErrors?.push(
            `Could not read content for Python source file: ${pyFile.name}`
          );
        }
      }
      // ... (component inference for Python as before)
    }

    // Java analysis
    const pomXmlFile = filesList.find(
      (f) => f.name.toLowerCase() === 'pom.xml'
    );
    const buildGradleFile = filesList.find(
      (f) =>
        f.name.toLowerCase() === 'build.gradle' ||
        f.name.toLowerCase() === 'build.gradle.kts'
    );
    const javaFiles = filesList.filter((f) => f.name.endsWith('.java'));
    let isJavaProject = javaFiles.length > 0;
    if (pomXmlFile || buildGradleFile) isJavaProject = true;
    // ... (Java analysis logic as before, including parsePomXml, parseBuildGradle) ...
    if (isJavaProject) {
      const javaLang = output.inferredLanguagesFrameworks?.find(
        (l) => l.name === 'Java'
      );
      if (javaLang) javaLang.confidence = 'high';
      else
        output.inferredLanguagesFrameworks?.push({
          name: 'Java',
          confidence: 'high',
        });

      if (pomXmlFile) {
        // ... (pom.xml processing as before)
        const pomPath = input.projectStoragePath.endsWith('/')
          ? `${input.projectStoragePath}${pomXmlFile.name}`
          : `${input.projectStoragePath}/${pomXmlFile.name}`;
        const pomContent = await downloadProjectFile(pomPath);
        if (pomContent) {
          if (!output.keyFiles?.find((kf) => kf.filePath === pomXmlFile.name)) {
            output.keyFiles?.push({
              filePath: pomXmlFile.name,
              type: 'manifest',
              briefDescription: 'Maven project configuration.',
            });
          }
          try {
            const pomData = parsePomXml(pomContent);
            if (
              pomData.projectName &&
              (!output.projectName ||
                output.projectName ===
                  input.projectStoragePath.split('/').filter(Boolean).pop())
            )
              output.projectName = pomData.projectName;
            if (pomData.version) {
              /* ... update summary with version ... */
            }
            if (pomData.dependencies.length > 0)
              output.dependencies = {
                ...output.dependencies,
                maven: pomData.dependencies,
              };
            const mavenLang = output.inferredLanguagesFrameworks?.find(
              (l) => l.name === 'Maven'
            );
            if (mavenLang) mavenLang.confidence = 'high';
            else
              output.inferredLanguagesFrameworks?.push({
                name: 'Maven',
                confidence: 'high',
              });
          } catch (e: any) {
            output.parsingErrors?.push(`Error parsing pom.xml: ${e.message}`);
          }
        } else {
          output.parsingErrors?.push(
            `${pomXmlFile.name} found in listing but could not be downloaded.`
          );
        }
      } else if (buildGradleFile) {
        // ... (build.gradle processing as before) ...
        const gradlePath = input.projectStoragePath.endsWith('/')
          ? `${input.projectStoragePath}${buildGradleFile.name}`
          : `${input.projectStoragePath}/${buildGradleFile.name}`;
        const gradleContent = await downloadProjectFile(gradlePath);
        if (gradleContent) {
          if (
            !output.keyFiles?.find((kf) => kf.filePath === buildGradleFile.name)
          ) {
            output.keyFiles?.push({
              filePath: buildGradleFile.name,
              type: 'manifest',
              briefDescription: 'Gradle project configuration.',
            });
          }
          try {
            const gradleData = parseBuildGradle(gradleContent);
            if (
              gradleData.projectName &&
              (!output.projectName ||
                output.projectName ===
                  input.projectStoragePath.split('/').filter(Boolean).pop())
            )
              output.projectName = gradleData.projectName;
            if (gradleData.version) {
              /* ... update summary with version ... */
            }
            if (gradleData.dependencies.length > 0)
              output.dependencies = {
                ...output.dependencies,
                gradle: gradleData.dependencies,
              };
            const gradleLang = output.inferredLanguagesFrameworks?.find(
              (l) => l.name === 'Gradle'
            );
            if (gradleLang) gradleLang.confidence = 'high';
            else
              output.inferredLanguagesFrameworks?.push({
                name: 'Gradle',
                confidence: 'high',
              });
          } catch (e: any) {
            output.parsingErrors?.push(
              `Error parsing ${buildGradleFile.name}: ${e.message}`
            );
          }
        } else {
          output.parsingErrors?.push(
            `${buildGradleFile.name} found in listing but could not be downloaded.`
          );
        }
      }
      // ... (Spring Boot and Java entry point detection as before) ...
      const allJavaDeps = [
        ...(output.dependencies?.maven || []),
        ...(output.dependencies?.gradle || []),
      ];
      if (
        allJavaDeps.some((dep) =>
          dep.toLowerCase().includes('spring-boot-starter')
        )
      ) {
        if (
          !output.inferredLanguagesFrameworks?.find(
            (lang) => lang.name === 'Spring Boot'
          )
        ) {
          output.inferredLanguagesFrameworks?.push({
            name: 'Spring Boot',
            confidence: 'medium',
          });
        }
        // ... add Spring Boot component ...
      }
    }

    // C# Analysis
    const csprojFiles = filesList.filter((f) =>
      f.name.toLowerCase().endsWith('.csproj')
    );
    const slnFile = filesList.find((f) =>
      f.name.toLowerCase().endsWith('.sln')
    );
    const csFiles = filesList.filter((f) =>
      f.name.toLowerCase().endsWith('.cs')
    );
    let isCSharpProject = csFiles.length > 0;
    if (csprojFiles.length > 0 || slnFile) isCSharpProject = true;

    if (isCSharpProject) {
      const csharpLang = output.inferredLanguagesFrameworks?.find(
        (l) => l.name === 'C#'
      );
      if (csharpLang) csharpLang.confidence = 'high';
      else
        output.inferredLanguagesFrameworks?.push({
          name: 'C#',
          confidence: 'high',
        });

      const dotNetLang = output.inferredLanguagesFrameworks?.find(
        (l) => l.name === '.NET' || l.name.startsWith('.NET Platform')
      );
      if (dotNetLang) dotNetLang.confidence = 'high';
      else if (
        !output.inferredLanguagesFrameworks?.find((l) =>
          l.name.startsWith('.NET Platform')
        )
      ) {
        output.inferredLanguagesFrameworks?.push({
          name: '.NET',
          confidence: 'high',
        });
      }

      if (csprojFiles.length > 0) {
        let mainCsprojFile = csprojFiles.find(
          (f) => !f.name.toLowerCase().includes('test')
        );
        if (!mainCsprojFile) mainCsprojFile = csprojFiles[0];

        const csprojPath = input.projectStoragePath.endsWith('/')
          ? `${input.projectStoragePath}${mainCsprojFile.name}`
          : `${input.projectStoragePath}/${mainCsprojFile.name}`;
        const csprojContent = await downloadProjectFile(csprojPath);

        if (csprojContent) {
          if (
            !output.keyFiles?.find((kf) => kf.filePath === mainCsprojFile!.name)
          ) {
            output.keyFiles?.push({
              filePath: mainCsprojFile!.name,
              type: 'manifest',
              briefDescription: 'C# project file.',
            });
          }
          try {
            const csprojData = parseCsproj(csprojContent, mainCsprojFile.name);
            if (
              csprojData.projectName &&
              (!output.projectName ||
                output.projectName ===
                  input.projectStoragePath.split('/').filter(Boolean).pop())
            ) {
              output.projectName = csprojData.projectName;
            }
            if (csprojData.targetFramework) {
              const frameworkString = ` (Framework: ${csprojData.targetFramework})`;
              if (
                output.projectSummary &&
                !output.projectSummary.includes(frameworkString)
              )
                output.projectSummary += frameworkString;
              else if (!output.projectSummary)
                output.projectSummary = `Framework: ${csprojData.targetFramework}`;

              if (
                csprojData.targetFramework
                  .toLowerCase()
                  .startsWith('netcoreapp') ||
                csprojData.targetFramework.toLowerCase().startsWith('net')
              ) {
                const dotNetVersion = csprojData.targetFramework
                  .toLowerCase()
                  .replace('netcoreapp', 'NET Core ')
                  .replace('net', 'NET ');
                const existingDotNet = output.inferredLanguagesFrameworks?.find(
                  (lang) =>
                    lang.name.startsWith('.NET Platform') ||
                    lang.name === '.NET'
                );
                if (existingDotNet)
                  existingDotNet.name = `.NET Platform (${dotNetVersion.trim()})`;
                else
                  output.inferredLanguagesFrameworks?.push({
                    name: `.NET Platform (${dotNetVersion.trim()})`,
                    confidence: 'high',
                  });
              }
            }
            if (csprojData.dependencies.length > 0) {
              output.dependencies = {
                ...output.dependencies,
                nuget: csprojData.dependencies,
              };
            }
          } catch (e: any) {
            output.parsingErrors?.push(
              `Error parsing ${mainCsprojFile.name}: ${e.message}`
            );
          }
        } else {
          output.parsingErrors?.push(
            `${mainCsprojFile.name} found in listing but could not be downloaded.`
          );
        }
      }
    }

    // Add other key C# files (Program.cs, Startup.cs, appsettings.json, .sln)
    const programCsFile = filesList.find(
      (f) => f.name.toLowerCase() === 'program.cs'
    );
    const startupCsFile = filesList.find(
      (f) => f.name.toLowerCase() === 'startup.cs'
    );
    const appsettingsJsonFile = filesList.find(
      (f) => f.name.toLowerCase() === 'appsettings.json'
    );

    if (
      programCsFile &&
      !output.keyFiles?.find((kf) => kf.filePath === programCsFile.name)
    ) {
      output.keyFiles?.push({
        filePath: programCsFile.name,
        type: 'entry_point',
        briefDescription: 'Main C# application entry point.',
      });
    }
    if (
      startupCsFile &&
      !output.keyFiles?.find((kf) => kf.filePath === startupCsFile.name)
    ) {
      output.keyFiles?.push({
        filePath: startupCsFile.name,
        type: 'configuration',
        briefDescription: 'ASP.NET Core startup configuration.',
      });
    }
    if (
      appsettingsJsonFile &&
      !output.keyFiles?.find((kf) => kf.filePath === appsettingsJsonFile.name)
    ) {
      output.keyFiles?.push({
        filePath: appsettingsJsonFile.name,
        type: 'configuration',
        briefDescription: 'Application settings file.',
      });
    }
    if (
      slnFile &&
      !output.keyFiles?.find((kf) => kf.filePath === slnFile.name)
    ) {
      // slnFile was defined in C# identification part
      output.keyFiles?.push({
        filePath: slnFile.name,
        type: 'manifest',
        briefDescription: 'Visual Studio Solution file.',
      });
    }

    // Refine for ASP.NET Core if C# project
    if (isCSharpProject) {
      let isAspNetCore = false;
      const nugetDependencies = output.dependencies?.nuget || [];
      if (
        nugetDependencies.some((dep) =>
          dep.toLowerCase().startsWith('microsoft.aspnetcore')
        )
      ) {
        isAspNetCore = true;
      }
      // TODO: A more direct check if csprojContent was accessible here for Sdk="Microsoft.NET.Sdk.Web"

      if (isAspNetCore) {
        if (
          !output.inferredLanguagesFrameworks?.find(
            (lang) => lang.name === 'ASP.NET Core'
          )
        ) {
          output.inferredLanguagesFrameworks?.push({
            name: 'ASP.NET Core',
            confidence: 'high',
          });
        }
        if (
          !output.potentialArchitecturalComponents?.find((c) =>
            c.name.includes('ASP.NET Core')
          )
        ) {
          const relatedCsFiles = [
            csprojFiles.length > 0 ? csprojFiles[0].name : undefined,
            programCsFile?.name,
            startupCsFile?.name,
            appsettingsJsonFile?.name,
          ].filter(Boolean) as string[];
          output.potentialArchitecturalComponents?.push({
            name: 'ASP.NET Core Application',
            type: 'service',
            relatedFiles: relatedCsFiles,
          });
        }
      }

      // Deeper C# source file analysis
      const cSharpSourceFiles = filesToAnalyze.filter((f) =>
        f.name.endsWith('.cs')
      );
      const MAX_CS_FILES_TO_PROCESS = 20;
      let processedCsFilesCount = 0;

      for (const csFile of cSharpSourceFiles) {
        if (processedCsFilesCount >= MAX_CS_FILES_TO_PROCESS) break;
        // Basic skip for common test project patterns or obj/bin folders
        if (
          csFile.name.toLowerCase().includes('/obj/') ||
          csFile.name.toLowerCase().includes('/bin/') ||
          csFile.name.toLowerCase().includes('.test')
        ) {
          continue;
        }

        const fileContent = await getFileContent(csFile.name);
        if (fileContent) {
          const usings = extractCSharpUsings(fileContent);
          const namespace = extractCSharpNamespace(fileContent);
          const types = extractCSharpTypeNames(fileContent); // Array of {name, type}
          const members = extractCSharpPublicMembers(fileContent);

          const symbols = [
            ...types.map((t) => `${t.type}:${t.name}`),
            ...members,
          ];

          let detailsString = '';
          if (namespace) detailsString += `Namespace: ${namespace}\n`;
          if (usings.length > 0)
            detailsString += `Usings: ${usings.join(', ')}\n`;
          if (symbols.length > 0 && !detailsString.includes('Symbols:'))
            detailsString += `Symbols: ${symbols.join(', ')}`;

          let fileType: KeyFileSchema['type'] = 'utility'; // Default
          if (types.some((t) => t.name.toLowerCase().includes('controller')))
            fileType = 'service_definition'; // Likely a controller
          else if (
            types.some(
              (t) =>
                t.type === 'interface' &&
                t.name.startsWith('I') &&
                t.name.endsWith('Service')
            )
          )
            fileType = 'service_definition';
          else if (
            types.some((t) => t.type === 'class' && t.name.endsWith('Service'))
          )
            fileType = 'service_definition';
          else if (
            types.some(
              (t) =>
                (t.type === 'class' && t.name.endsWith('Model')) ||
                t.type === 'record'
            )
          )
            fileType = 'model';
          else if (csFile.name.toLowerCase() === 'program.cs')
            fileType = 'entry_point';
          else if (csFile.name.toLowerCase() === 'startup.cs')
            fileType = 'configuration';

          const existingKf = output.keyFiles?.find(
            (kf) => kf.filePath === csFile.name
          );
          if (existingKf) {
            existingKf.type =
              existingKf.type === 'unknown' ? fileType : existingKf.type;
            existingKf.details =
              (existingKf.details ? `${existingKf.details}\n` : '') +
              detailsString.trim();
            existingKf.extractedSymbols = [
              ...new Set([...(existingKf.extractedSymbols || []), ...symbols]),
            ];
            if (!existingKf.briefDescription?.includes('C# source file'))
              existingKf.briefDescription =
                (existingKf.briefDescription || '') + ' C# source file.';
          } else {
            output.keyFiles?.push({
              filePath: csFile.name,
              type: fileType,
              briefDescription:
                `C# source file. ${symbols.length > 0 ? 'Contains types/members.' : ''} ${usings.length > 0 ? 'Contains usings.' : ''}`.trim(),
              details: detailsString.trim() || undefined,
              extractedSymbols: symbols.length > 0 ? symbols : undefined,
            });
          }
          processedCsFilesCount++;
        } else {
          output.parsingErrors?.push(
            `Could not read content for C# source file: ${csFile.name}`
          );
        }
      }
    }

    // README processing (generic, should be towards the end to allow project name/version to be set first)
    const readmeFile = filesList.find(
      (f) =>
        f.name.toLowerCase() === 'readme.md' ||
        f.name.toLowerCase() === 'readme.rst'
    );
    if (readmeFile) {
      // ... (README processing logic as before) ...
      const readmePath = input.projectStoragePath.endsWith('/')
        ? `${input.projectStoragePath}${readmeFile.name}`
        : `${input.projectStoragePath}/${readmeFile.name}`;
      const readmeContent = await downloadProjectFile(readmePath);
      if (readmeContent) {
        if (!output.keyFiles?.find((kf) => kf.filePath === readmeFile.name)) {
          output.keyFiles?.push({
            filePath: readmeFile.name,
            type: 'readme',
            briefDescription: 'Project README file.',
          });
        }
        const firstMeaningfulLine = readmeContent
          .split(/\r?\n/)
          .find((line) => line.trim().length > 0);
        if (firstMeaningfulLine) {
          const readmeSummary =
            firstMeaningfulLine.substring(0, 200) +
            (firstMeaningfulLine.length > 200 ? '...' : '');
          if (
            !output.projectSummary ||
            output.projectSummary.startsWith('Version:') ||
            output.projectSummary.startsWith('Basic analysis of project at') ||
            output.projectSummary === input.userHint
          ) {
            output.projectSummary = readmeSummary;
          } else if (
            output.projectSummary &&
            !output.projectSummary.includes(
              firstMeaningfulLine.substring(0, 50)
            )
          ) {
            output.projectSummary = `${output.projectSummary} | README: ${readmeSummary.substring(0, 100)}${readmeSummary.length > 100 ? '...' : ''}`;
          }
        }
      } else if (readmeFile) {
        output.parsingErrors?.push(
          `${readmeFile.name} found in listing but could not be downloaded.`
        );
      }
    }

    // Fallback language detection if nothing specific was found
    if (output.inferredLanguagesFrameworks?.length === 0) {
      const fileExtensions = new Set(
        filesList
          .map((f) => f.name.substring(f.name.lastIndexOf('.')).toLowerCase())
          .filter(Boolean)
      );
      if (fileExtensions.has('.js') || fileExtensions.has('.ts'))
        output.inferredLanguagesFrameworks?.push({
          name: 'JavaScript/TypeScript',
          confidence: 'low',
        });
      // Python, Java, C# initial detection based on file extensions or manifests already happened
      if (output.inferredLanguagesFrameworks?.length === 0) {
        output.inferredLanguagesFrameworks?.push({
          name: 'Unknown',
          confidence: 'low',
        });
      }
    }

    if (!output.projectSummary || output.projectSummary === input.userHint) {
      output.projectSummary = `Basic analysis of project at ${input.projectStoragePath}. ${filesList.length} files/folders found at root.`;
    }
  } catch (error: any) {
    console.error('Error during project analysis:', error);
    output.parsingErrors?.push(
      `Top-level error during analysis: ${error.message}`
    );
  }

  return output;
}

export const projectStructureAnalyzerTool = ai.defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description:
      'Fetches a project file from Supabase Storage and performs content analysis based on its determined file type (e.g., package.json, markdown, JS/TS (AST), Python (Regex), plain text, binary).',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  analyzeProjectStructure
);

// --- Supabase Storage Helper Functions ---
// listProjectFiles, parseRequirementsTxt, parsePomXml, parseBuildGradle, parseCsproj, downloadProjectFile
// ... (These functions remain as previously defined) ...
/**
 * Lists files and folders within a given path in the 'project_archives' bucket.
 * @param storagePath The base path (folder) in Supabase Storage, e.g., "user-id/project-id/"
 * @returns A promise that resolves to an array of FileObject or an empty array if error.
 */
async function listProjectFiles(storagePath: string): Promise<FileObject[]> {
  const folderPath = storagePath.endsWith('/')
    ? storagePath
    : `${storagePath}/`;
  const { data, error } = await supabase.storage
    .from('project_archives')
    .list(folderPath, { limit: 100, offset: 0 });
  if (error) {
    console.error(
      `Error listing files from Supabase Storage at path ${folderPath}:`,
      error
    );
    return [];
  }
  return data?.filter((file) => file.name !== '.emptyFolderPlaceholder') || [];
}

/**
 * Parses the content of a requirements.txt file to extract package names.
 * Handles comments, version specifiers, and basic editable installs.
 * @param content The string content of requirements.txt
 * @returns An array of package names.
 */
function parseRequirementsTxt(content: string): string[] {
  const packages: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;
    if (trimmedLine.startsWith('-e')) continue;
    if (trimmedLine.startsWith('-r') || trimmedLine.startsWith('--')) continue;
    const match = trimmedLine.match(
      /^([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9])/
    );
    if (match && match[0]) packages.push(match[0]);
  }
  return packages;
}

/**
 * Parses basic information from pom.xml content using regex.
 * This is a simplified parser and may not cover all pom.xml variations.
 * @param content The string content of pom.xml
 * @returns An object with projectName, version, and dependencies.
 */
function parsePomXml(content: string): {
  projectName?: string;
  version?: string;
  dependencies: string[];
} {
  const result: {
    projectName?: string;
    version?: string;
    dependencies: string[];
  } = { dependencies: [] };
  let artifactIdMatch = content.match(
    /<project(?:[^>]*)>[\s\S]*?<artifactId>\s*([^<]+)\s*<\/artifactId>/
  );
  if (artifactIdMatch && artifactIdMatch[1])
    result.projectName = artifactIdMatch[1].trim();
  let versionMatch = content.match(
    /<project(?:[^>]*)>[\s\S]*?<version>\s*([^<]+)\s*<\/version>/
  );
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  else {
    const parentVersionMatch = content.match(
      /<project(?:[^>]*)>[\s\S]*?<parent>\s*<version>\s*([^<]+)\s*<\/version>\s*<\/parent>/
    );
    if (parentVersionMatch && parentVersionMatch[1])
      result.version = parentVersionMatch[1].trim();
  }
  const dependencyRegex =
    /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>(?:\s*<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/g;
  let depMatch;
  while ((depMatch = dependencyRegex.exec(content)) !== null) {
    result.dependencies.push(`${depMatch[1].trim()}:${depMatch[2].trim()}`);
  }
  return result;
}

/**
 * Parses basic information from build.gradle or build.gradle.kts content using regex.
 * This is highly simplified due to the complexity of Groovy/Kotlin DSLs.
 * @param content The string content of the Gradle build file.
 * @returns An object with projectName, version, and dependencies.
 */
function parseBuildGradle(content: string): {
  projectName?: string;
  version?: string;
  dependencies: string[];
} {
  const result: {
    projectName?: string;
    version?: string;
    dependencies: string[];
  } = { dependencies: [] };
  const nameMatch = content.match(
    /(?:rootProject\.name|project\.name)\s*=\s*['"]([^'"]+)['"]/
  );
  if (nameMatch && nameMatch[1]) result.projectName = nameMatch[1].trim();
  const versionMatch = content.match(/^version\s*=\s*['"]([^'"]+)['"]/m);
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  const depRegex =
    /(?:implementation|compile|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(([^)]+)\)|['"]([^'"]+)['"])/g;
  let depMatch;
  while ((depMatch = depRegex.exec(content)) !== null) {
    const depString = depMatch[1] || depMatch[2];
    if (depString) {
      const cleanedDepString = depString.replace(/['"]/g, '').trim();
      const parts = cleanedDepString.split(':');
      if (parts.length >= 2) {
        result.dependencies.push(`${parts[0].trim()}:${parts[1].trim()}`);
        continue;
      }
      const groupMatch = cleanedDepString.match(/group:\s*['"]([^'"]+)['"]/);
      const nameArtifactMatch = cleanedDepString.match(
        /name:\s*['"]([^'"]+)['"]/
      );
      if (
        groupMatch &&
        groupMatch[1] &&
        nameArtifactMatch &&
        nameArtifactMatch[1]
      ) {
        result.dependencies.push(
          `${groupMatch[1].trim()}:${nameArtifactMatch[1].trim()}`
        );
        continue;
      }
      const kotlinMatch = cleanedDepString.match(
        /^kotlin\s*\(\s*["']([^"']+)["']\s*\)/
      );
      if (kotlinMatch && kotlinMatch[1]) {
        result.dependencies.push(
          `org.jetbrains.kotlin:kotlin-${kotlinMatch[1].trim()}`
        );
        continue;
      }
    }
  }
  result.dependencies = [...new Set(result.dependencies)];
  return result;
}

/**
 * Parses basic information from .csproj content using regex.
 * This is a simplified parser and may not cover all .csproj variations.
 * @param content The string content of the .csproj file.
 * @param csprojFileName The name of the .csproj file, used as a fallback for project name.
 * @returns An object with projectName, targetFramework, and dependencies.
 */
function parseCsproj(
  content: string,
  csprojFileName: string
): { projectName?: string; targetFramework?: string; dependencies: string[] } {
  const result: {
    projectName?: string;
    targetFramework?: string;
    dependencies: string[];
  } = { dependencies: [] };
  let assemblyNameMatch = content.match(/<AssemblyName>(.*?)<\/AssemblyName>/);
  if (assemblyNameMatch && assemblyNameMatch[1])
    result.projectName = assemblyNameMatch[1].trim();
  else result.projectName = csprojFileName.replace(/\.csproj$/i, '');
  const targetFrameworkMatch = content.match(
    /<TargetFramework>(.*?)<\/TargetFramework>/
  );
  if (targetFrameworkMatch && targetFrameworkMatch[1])
    result.targetFramework = targetFrameworkMatch[1].trim();
  else {
    const targetFrameworksMatch = content.match(
      /<TargetFrameworks>(.*?)<\/TargetFrameworks>/
    );
    if (targetFrameworksMatch && targetFrameworksMatch[1])
      result.targetFramework = targetFrameworksMatch[1].trim().split(';')[0];
  }
  const packageRefRegex =
    /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?\s*\/?>/g;
  let pkgMatch;
  while ((pkgMatch = packageRefRegex.exec(content)) !== null) {
    const packageName = pkgMatch[1].trim();
    const packageVersion = pkgMatch[2] ? pkgMatch[2].trim() : undefined;
    result.dependencies.push(
      packageVersion ? `${packageName} (${packageVersion})` : packageName
    );
  }
  result.dependencies = [...new Set(result.dependencies)];
  return result;
}

/**
 * Downloads a file as text from the 'project_archives' bucket.
 * @param fullFilePath The full path to the file in Supabase Storage, e.g., "user-id/project-id/package.json"
 * @returns A promise that resolves to the file content as a string, or null if an error occurs.
 */
async function downloadProjectFile(
  fullFilePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('project_archives')
    .download(fullFilePath);

  if (error) {
    console.error(
      `Error downloading file ${fullFilePath} from Supabase Storage:`,
      error
    );
    return null;
  }
  if (data) {
    // Check size before converting to text
    const MAX_DOWNLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for single file download for text
    if (data.size > MAX_DOWNLOAD_FILE_SIZE_BYTES) {
      console.warn(
        `File ${fullFilePath} (size: ${data.size} bytes) exceeds download size limit of ${MAX_DOWNLOAD_FILE_SIZE_BYTES} bytes. Skipping text conversion.`
      );
      // Returning null for text, but the caller might try as buffer if needed.
      // Or, we could throw an error here to be more explicit. For now, returning null.
      return null;
    }
    try {
      return await data.text();
    } catch (textError) {
      console.error(
        `Error converting downloaded file ${fullFilePath} blob to text:`,
        textError
      );
      return null;
    }
  }
  return null;
}

/**
 * Downloads a file as a Buffer from the 'project_archives' bucket.
 * @param fullFilePath The full path to the file in Supabase Storage.
 * @returns A promise that resolves to the file content as a Buffer, or null if an error occurs.
 */
async function downloadProjectFileAsBuffer(
  fullFilePath: string
): Promise<Buffer | null> {
  const { data, error } = await supabase.storage
    .from('project_archives')
    .download(fullFilePath);

  if (error) {
    console.error(
      `Error downloading file ${fullFilePath} as buffer from Supabase Storage:`,
      error
    );
    return null;
  }
  if (data) {
    const MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER = 20 * 1024 * 1024; // 20 MB limit for buffer (e.g. for binaries, allow slightly larger)
    if (data.size > MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER) {
      console.warn(
        `File ${fullFilePath} (size: ${data.size} bytes) exceeds download size limit of ${MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER} bytes for buffer. Skipping.`
      );
      return null;
    }
    try {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error(
        `Error converting downloaded file ${fullFilePath} blob to ArrayBuffer/Buffer:`,
        bufferError
      );
      return null;
    }
  }
  return null;
}

/**
 * Unpacks a ZIP buffer in memory.
 * @param buffer The ZIP file content as a Buffer.
 * @returns A promise that resolves to an object containing extracted files and any entry-specific errors, or null if critical ZIP error.
 */
interface UnpackResult {
  files: Array<{ name: string; content: string | Buffer }>;
  entryErrors: string[];
}
async function unpackZipBuffer(buffer: Buffer): Promise<UnpackResult | null> {
  const files: Array<{ name: string; content: string | Buffer }> = [];
  const entryErrors: string[] = [];

  // Define limits
  const MAX_TOTAL_UNCOMPRESSED_SIZE = 100 * 1024 * 1024; // 100 MB total uncompressed size limit
  const MAX_INDIVIDUAL_FILE_SIZE = 10 * 1024 * 1024; // 10 MB individual file size limit
  const MAX_FILE_COUNT = 1000; // Max 1000 files

  let currentTotalUncompressedSize = 0;
  let currentFileCount = 0;

  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
      if (zipEntry.isDirectory) {
        continue;
      }

      currentFileCount++;
      if (currentFileCount > MAX_FILE_COUNT) {
        const errMsg = `Exceeded maximum file count limit of ${MAX_FILE_COUNT}. Aborting unpack.`;
        console.warn(errMsg);
        entryErrors.push(errMsg);
        break;
      }

      const uncompressedSize = zipEntry.header.size; // Uncompressed size from header
      if (uncompressedSize > MAX_INDIVIDUAL_FILE_SIZE) {
        const errMsg = `File '${zipEntry.entryName}' (size: ${uncompressedSize} bytes) exceeds individual file size limit of ${MAX_INDIVIDUAL_FILE_SIZE} bytes. Skipping.`;
        console.warn(errMsg);
        entryErrors.push(errMsg);
        continue;
      }

      currentTotalUncompressedSize += uncompressedSize;
      if (currentTotalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
        const errMsg = `Exceeded total uncompressed size limit of ${MAX_TOTAL_UNCOMPRESSED_SIZE} bytes. Aborting unpack.`;
        console.warn(errMsg);
        entryErrors.push(errMsg);
        break;
      }

      const isLikelyText =
        /\.(txt|json|md|xml|html|css|js|ts|py|java|cs|c|cpp|h|hpp|sh|yaml|yml|toml)$/i.test(
          zipEntry.entryName
        );
      try {
        const contentBuffer = zipEntry.getData(); // This actually performs decompression for this entry
        if (isLikelyText) {
          files.push({
            name: zipEntry.entryName,
            content: contentBuffer.toString('utf8'),
          });
        } else {
          files.push({ name: zipEntry.entryName, content: contentBuffer });
        }
      } catch (e: any) {
        const errorMsg = `Error reading data for zip entry ${zipEntry.entryName}: ${e.message || e}`;
        console.error(errorMsg);
        entryErrors.push(errorMsg);
      }
    }
    return { files, entryErrors };
  } catch (error: any) {
    console.error('Critical error unpacking ZIP buffer:', error);
    entryErrors.push(`Critical ZIP unpacking error: ${error.message || error}`);
    return { files, entryErrors };
  }

  /**
   * Extracts import/require statements from JavaScript/TypeScript content using regex.
   * This is a simplified parser.
   * @param content The string content of the JS/TS file.
   * @returns An array of module names or paths.
   */
  function extractJsImports(content: string): string[] {
    const imports = new Set<string>();
    const requireRegex = /require\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
    let match;
    while ((match = requireRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    const importRegex = /import\s+.*?from\s*['"]([^'"\n]+)['"]/g;
    while ((match = importRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    const dynamicImportRegex = /import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
      imports.add(match[1]);
    }
    return Array.from(imports);
  }

  /**
   * Extracts import statements from Python code content using regex.
   * Handles `import module` and `from module import ...` statements.
   * @param content The string content of the Python file.
   * @returns An array of unique imported module names.
   */
  function extractPyImports(content: string): string[] {
    const imports = new Set<string>();
    // Matches: import module1, module2 as m2, module3.submodule
    const importRegex = /^\s*import\s+([A-Za-z0-9_.,\s]+)/gm;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const modules = match[1].split(',');
      modules.forEach((mod) => {
        const moduleName = mod.trim().split('.')[0].split(' as ')[0].trim();
        if (moduleName) imports.add(moduleName);
      });
    }

    // Matches: from module import name1, name2 as n2
    // Matches: from .relative_module import name
    // Matches: from ..another_relative import name
    const fromImportRegex =
      /^\s*from\s+([A-Za-z0-9_.]+|\.+[A-Za-z0-9_.]*)\s+import\s+/gm;
    while ((match = fromImportRegex.exec(content)) !== null) {
      const moduleName = match[1].trim().split('.')[0];
      if (moduleName && moduleName !== '.') {
        imports.add(
          moduleName.startsWith('.') ? moduleName.substring(1) : moduleName
        );
      } else if (moduleName === '.') {
        // local package import - can be ignored for now or logged
      }
    }
    return Array.from(imports).filter(Boolean);
  }

  /**
   * Extracts class names from Python code content using regex.
   * @param content The string content of the Python file.
   * @returns An array of unique class names.
   */
  function extractPyClasses(content: string): string[] {
    const classes = new Set<string>();
    // Matches: class ClassName: or class ClassName(Parent):
    // It also tries to handle potential decorators by looking for 'class' at the start of a line (after whitespace)
    const classRegex =
      /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\((?:.|\n)*?\))?\s*:/gm;
    let match;
    while ((match = classRegex.exec(content)) !== null) {
      classes.add(match[1]);
    }
    return Array.from(classes);
  }

  /**
   * Extracts top-level function names from Python code content using regex.
   * @param content The string content of the Python file.
   * @returns An array of unique function names (excluding common private/magic methods).
   */
  function extractPyFunctions(content: string): string[] {
    const functions = new Set<string>();
    // Matches: def function_name(...):
    // Excludes common magic methods like __init__
    const funcRegex =
      /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((?:.|\n)*?\)\s*:/gm;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      const funcName = match[1];
      // Optional: Filter out private methods (e.g., _my_private_func) or magic methods
      if (!funcName.startsWith('_')) {
        // Simple filter for dunder/private methods
        functions.add(funcName);
      }
    }
    return Array.from(functions);
  }

  /**
   * Extracts `using` directive namespaces from C# code content using regex.
   * @param content The string content of the C# file.
   * @returns An array of unique used namespace names.
   */
  function extractCSharpUsings(content: string): string[] {
    const usings = new Set<string>();
    // Matches: using System; or using System.Collections.Generic;
    // Handles potential whitespace variations.
    const usingRegex = /^\s*using\s+([A-Za-z_][A-Za-z0-9_.]*)\s*;/gm;
    let match;
    while ((match = usingRegex.exec(content)) !== null) {
      usings.add(match[1]);
    }
    return Array.from(usings);
  }

  /**
   * Extracts the primary namespace declaration from C# code content using regex.
   * @param content The string content of the C# file.
   * @returns The namespace string or null if not found.
   */
  function extractCSharpNamespace(content: string): string | null {
    // Matches: namespace My.App.Namespace or namespace My.App.Namespace { ...
    // It will capture the namespace part.
    const namespaceRegex = /^\s*namespace\s+([A-Za-z_][A-Za-z0-9_.]*)/m; // m for multiline, finds first occurrence
    const match = content.match(namespaceRegex);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  }

  /**
   * Extracts C# type (class, interface, enum, struct, record) names and their kinds using regex.
   * @param content The string content of the C# file.
   * @returns An array of objects, each with `name` and `type` (kind).
   */
  function extractCSharpTypeNames(content: string): Array<{
    name: string;
    type: 'class' | 'interface' | 'enum' | 'struct' | 'record';
  }> {
    const types = new Map<
      string,
      {
        name: string;
        type: 'class' | 'interface' | 'enum' | 'struct' | 'record';
      }
    >();
    // Regex to capture various type definitions (public, internal, etc.)
    // It captures the keyword (class, interface, etc.) and the name.
    // Adjusted to better handle generics and constraints, though full parsing is complex.
    const typeRegex =
      /^\s*(?:public|internal|private|protected)?\s*(?:static|abstract|sealed|partial)?\s*(class|interface|enum|struct|record)\s+([A-Za-z_][A-Za-z0-9_]*)(?:<[^>]+>)?(?:\s*:\s*[^\{]+)?\s*{?/gm;
    let match;
    while ((match = typeRegex.exec(content)) !== null) {
      const typeKind = match[1] as
        | 'class'
        | 'interface'
        | 'enum'
        | 'struct'
        | 'record';
      const typeName = match[2];
      if (typeName && !types.has(typeName)) {
        // Ensure unique names, first declaration wins for simplicity
        types.set(typeName, { name: typeName, type: typeKind });
      }
    }
    return Array.from(types.values());
  }

  /**
   * Extracts basic public method and property signatures from C# code content using regex.
   * This is a very simplified parser.
   * @param content The string content of the C# file.
   * @returns An array of unique simplified member signatures.
   */
  function extractCSharpPublicMembers(content: string): string[] {
    const members = new Set<string>();

    // Basic regex for public methods: public (static/async/virtual...) ReturnType MethodName<GenericParams>(params) { or ;
    // This is simplified and won't perfectly handle all C# syntax, attributes, or complex return types.
    const methodRegex =
      /^\s*(?:public|internal)\s+(?:static\s+|async\s+|virtual\s+|override\s+|sealed\s+)*([\w\<\>\?\[\]\.,\s]+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*\)\s*(?:where\s[^\{]+)?\s*(?:{|=>|;)/gm;
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      // const returnType = match[1].trim(); // Captured but not used in the simplified signature for now
      const methodName = match[2].trim();
      if (
        methodName &&
        !methodName.startsWith('get_') &&
        !methodName.startsWith('set_')
      ) {
        // Filter out property accessors
        // To keep it simple, we'll just add MethodName(...)
        members.add(`${methodName}(...)`);
      }
    }

    // Basic regex for public properties: public Type PropertyName { (get/set/init...); }
    // Simplified: captures name, assumes simple get/set.
    const propertyRegex =
      /^\s*(?:public|internal)\s+(?:static\s+|virtual\s+|override\s+|sealed\s+)*([\w\<\>\?\[\]\.,\s]+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*{\s*(?:(?:public|internal|protected|private)?\s*(?:get|set|init)\s*;\s*)+(?:=>)?/gm;
    while ((match = propertyRegex.exec(content)) !== null) {
      // const propertyType = match[1].trim(); // Captured but not used for now
      const propertyName = match[2].trim();
      if (propertyName) {
        members.add(`${propertyName} { get; set; }`); // Simplified representation
      }
    }

    return Array.from(members);
  }

  // Add missing return statement for analyzeJavaScriptAST function
  return {
    functions: Array.from(functions),
    classes: Array.from(classes),
    imports: Array.from(imports),
    exports: Array.from(exports)
  };
}
