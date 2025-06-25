/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This tool can now perform real analysis for Node.js, Python, and C# projects
 * by fetching files from Supabase Storage, and performs content analysis based on file type,
 * including AST-based analysis for JavaScript and TypeScript.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { supabase } from '@/lib/supabaseClient'; // Import Supabase client
import type { FileObject } from '@supabase/storage-js'; // For Supabase Storage types
import AdmZip from 'adm-zip'; // Library for handling ZIP files
import { supabaseFileFetcherTool } from './supabase-file-fetcher-tool';
import { summarizeCodeElementPurposeFlow, SummarizeCodeElementInput } from '@/ai/flows';
import path from 'path';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as ts from 'typescript';
import { parse as pythonParse, Node as PythonNode } from 'python-parser';

// Input schema remains the same
export const ProjectAnalysisInputSchema = z.object({
  projectStoragePath: z.string().describe('File path in Supabase Storage for the project file.'),
  userHint: z.string().optional().describe("User-provided hint about the project's nature or focus area."),
});
export type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema>;

// Detailed node schema for specific findings
export const DetailedNodeOutputSchema = z.object({
    id: z.string(),
    label: z.string(),
    type: z.string(),
    details: z.string().optional(),
    lineNumbers: z.string().optional(), // For start-end lines
    structuredInfo: z.any().optional(), // For raw extracted AST info
});
export type DetailedNode = z.infer<typeof DetailedNodeOutputSchema>;

<<<<<<< HEAD
const DependencyMapSchema = z.record(z.array(z.string())).describe('Key-value map of dependency types (e.g., npm, pip, maven, nuget) to arrays of dependency names.');

const FileCountsSchema = z.record(z.number()).describe('Key-value map of file extensions to their counts (e.g., { ".ts": 10, ".js": 2 }).');

const DirectorySummarySchema = z.object({
  path: z.string().describe('Path to the directory (e.g., src/services).'),
  fileCounts: FileCountsSchema.describe('Counts of significant file types within this directory.'),
  inferredPurpose: z.string().optional().nullable().describe('Inferred purpose of the directory (e.g., Business Logic Services).'),
});

export const KeyFileSchema = z.object({
  filePath: z.string().describe('Path to the key file.'),
  type: z.enum([
    'entry_point', 
    'configuration', 
    'service_definition', 
    'ui_component', 
    'model', 
    'utility', 
    'readme',
    'manifest', // For package.json, requirements.txt, pom.xml, .csproj etc.
    'docker',
    'cicd',
    'unknown'
  ]).describe('Type of the key file.'),
  extractedSymbols: z.array(z.string()).optional().describe('Names of primary declarations (classes, functions, components).'),
  briefDescription: z.string().optional().nullable().describe('Brief description of the file or its role (e.g., Handles user authentication endpoints).'),
});
export type KeyFile = z.infer<typeof KeyFileSchema>;

export const PotentialArchitecturalComponentSchema = z.object({
  name: z.string().describe('Name of the inferred architectural component (e.g., User Service, Payment Gateway).'),
  type: z.enum([
    'service', 
    'module', 
    'ui_area', 
    'data_store_interface', 
    'external_api',
    'library',
    'unknown_component'
  ]).describe('Type of the architectural component.'),
  relatedFiles: z.array(z.string()).optional().describe('Paths to files related to this component.'),
});
export type PotentialArchitecturalComponent = z.infer<typeof PotentialArchitecturalComponentSchema>;

=======
// Output schema updated for more structured analysis results
>>>>>>> master
export const ProjectAnalysisOutputSchema = z.object({
  analyzedFileName: z.string(),
  effectiveFileType: z.string(),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  isBinary: z.boolean(),
  analysisSummary: z.string(),
  detailedNodes: z.array(DetailedNodeOutputSchema).optional(),
  error: z.string().optional(),
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

<<<<<<< HEAD
// Define a detailed, fixed mock project analysis output (remains for testing/hints)
const FIXED_MOCK_PROJECT_A_ANALYSIS: ProjectAnalysisOutput = {
  projectName: "Fixed Mock E-Commerce API",
  inferredLanguagesFrameworks: [
    { name: "TypeScript", confidence: "high" },
    { name: "Node.js", confidence: "high" },
    { name: "Express.js", confidence: "medium" },
  ],
  projectSummary: "This is a fixed mock analysis for a standard E-Commerce API project. It includes typical components like User Service, Product Service, Order Service, and a Payment Gateway integration.",
  dependencies: {
    npm: ["express", "typescript", "pg", "jsonwebtoken", "bcryptjs", "stripe"],
  },
  directoryStructureSummary: [ /* ... as before ... */ ],
  keyFiles: [ /* ... as before ... */ ],
  potentialArchitecturalComponents: [ /* ... as before ... */ ],
  parsingErrors: [],
};

=======
const generateNodeId = (fileSpecificPrefix: string, nodeType: string, nodeName: string, index?: number): string => {
  const saneName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 25);
  return `${fileSpecificPrefix}_${nodeType}_${saneName}${index !== undefined ? `_${index}` : ''}`.toLowerCase();
};

type EffectiveFileType = 'package.json' | 'generic.json' | 'markdown' | 'javascript' | 'typescript' | 'python' | 'text' | 'binary' | 'unknown';

function determineEffectiveFileType(fileName: string, contentType?: string, isBinary?: boolean): EffectiveFileType {
  const lowerFileName = fileName.toLowerCase();
  if (lowerFileName.endsWith('package.json')) return 'package.json';
  if (lowerFileName.endsWith('.json')) return 'generic.json';
  if (lowerFileName.endsWith('.md') || lowerFileName.endsWith('.markdown')) return 'markdown';
  if (lowerFileName.endsWith('.js') || lowerFileName.endsWith('.mjs') || lowerFileName.endsWith('.cjs')) return 'javascript';
  if (lowerFileName.endsWith('.ts') || lowerFileName.endsWith('.tsx') || lowerFileName.endsWith('.mts') || lowerFileName.endsWith('.cts')) return 'typescript';
  if (lowerFileName.endsWith('.py')) return 'python';

  if (isBinary) return 'binary';
  if (contentType?.startsWith('text/')) return 'text';
  if (contentType === 'application/json') return 'generic.json';
  if (contentType === 'application/javascript' || contentType === 'text/javascript') return 'javascript';
  if (contentType === 'application/typescript' || contentType === 'text/typescript') return 'typescript';

  return 'unknown';
}

// --- Common AST Element Interfaces ---
interface ExtractedCodeElement {
  name: string;
  kind: string; // e.g., 'function', 'class', 'interface', 'method', 'property'
  params?: { name: string; type?: string }[];
  returnType?: string;
  isAsync?: boolean;
  isExported?: boolean;
  isDefaultExport?: boolean;
  superClass?: string;
  implementedInterfaces?: string[];
  decorators?: string[];
  startLine: number;
  endLine: number;
  // Add more fields as needed, e.g. for variables:
  dataType?: string; // For variables
  value?: string; // For simple variable initializers
  comments?: string; // Added for TS AST
  semanticPurpose?: string; // Added for AI summary
  classMethods?: string[]; // For classes
  classProperties?: string[]; // For classes
  astNode?: ts.Node; // Store the AST node for functions/methods for later analysis (e.g. call graph)
  localCalls?: Array<{ targetName: string; targetType: 'function' | 'method'; targetParentName?: string; line: number }>; // For local call detection
  parentName?: string; // For methods, the name of their class
}

interface ExtractedImport {
  source: string;
  specifiers: { importedName?: string; localName: string; isDefault?: boolean; isNamespace?: boolean }[];
  startLine: number;
  endLine: number;
}

interface ExtractedExport {
  type: 'named' | 'default' | 'all';
  names?: string[];
  source?: string;
  declarationType?: string; // e.g., 'Function', 'Class' for default export
  startLine: number;
  endLine: number;
}


// --- JavaScript AST Analysis (Acorn) ---
async function analyzeJavaScriptAST(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): Promise<{ analysisSummary: string, detailedNodes: DetailedNode[], error?: string }> {
  const elements: ExtractedCodeElement[] = []; // Still useful for overall counts in summary
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const detailedNodesOutput: DetailedNode[] = []; // Final list of nodes for output
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: any }> = [];
  let ast: acorn.Node | undefined;

  interface SummarizationTask {
    uniqueId: string;
    inputForFlow: SummarizeCodeElementInput;
    originalNodeInfo: ExtractedCodeElement; // Will include astNode
    nodeType: 'function' | 'class'; // To distinguish for summarizer
  }
  const summarizationTasks: SummarizationTask[] = [];

  try {
    ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module', locations: true, comments: true });
  } catch (e: any) {
    return { error: `JS AST parsing failed: ${e.message}`, analysisSummary: `Failed to parse JS content: ${e.message}`, detailedNodes: [] };
  }

  // Phase 1: Data Collection
  acornWalk.simple(ast, {
    FunctionDeclaration(node: any) {
      const isExported = node.parentNode?.type === 'ExportNamedDeclaration' || node.parentNode?.type === 'ExportDefaultDeclaration';
      const name = node.id?.name || '[anonymous_func]';
      const originalNodeInfo: ExtractedCodeElement = {
        name,
        kind: 'function',
        isExported,
        startLine: node.loc?.start.line,
        endLine: node.loc?.end.line,
        params: node.params?.map((p: any) => ({ name: p.type === 'Identifier' ? p.name : (p.left?.name || '[pattern]') })),
        isAsync: node.async,
        astNode: node, // Store Acorn node
      };
      elements.push(originalNodeInfo);
      localDefinitions.push({ name, kind: 'function', node });
      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
        inputForFlow: {
          elementType: 'function',
          elementName: name,
          filePath: fileName,
          signature: `(${(originalNodeInfo.params?.map(p => p.name).join(', ') || '')})`,
          comments: undefined, // Acorn comment association is non-trivial
          isExported: isExported,
        },
        originalNodeInfo,
        nodeType: 'function',
      });
    },
    VariableDeclaration(node: any) {
      node.declarations.forEach((declaration: any) => {
        if (declaration.id?.name && (declaration.init?.type === 'ArrowFunctionExpression' || declaration.init?.type === 'FunctionExpression')) {
          const isExported = node.parentNode?.type === 'ExportNamedDeclaration';
          const name = declaration.id.name;
          const originalNodeInfo: ExtractedCodeElement = {
            name,
            kind: 'function', // Treat as function
            isExported,
            startLine: node.loc?.start.line,
            endLine: node.loc?.end.line,
            params: declaration.init.params?.map((p: any) => ({ name: p.type === 'Identifier' ? p.name : (p.left?.name || '[pattern]') })),
            isAsync: declaration.init.async,
        astNode: declaration.init, // Store Acorn FunctionExpression/ArrowFunctionExpression node
          };
          elements.push(originalNodeInfo);
      localDefinitions.push({ name, kind: 'function', node: declaration.init });
          summarizationTasks.push({
            uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
            inputForFlow: {
              elementType: 'function',
              elementName: name,
              filePath: fileName,
              signature: `(${(originalNodeInfo.params?.map(p => p.name).join(', ') || '')})`,
              comments: undefined,
              isExported: isExported,
            },
            originalNodeInfo,
            nodeType: 'function',
          });
        } else if (declaration.id?.name && node.kind && (node.parentNode?.type === 'Program' || node.parentNode?.type === 'ExportNamedDeclaration')) {
           const simpleVarElement: ExtractedCodeElement = { name: declaration.id.name, kind: 'variable', isExported: node.parentNode?.type === 'ExportNamedDeclaration', startLine: node.loc?.start.line, endLine: node.loc?.end.line };
           elements.push(simpleVarElement); // Add to general elements for count
           detailedNodesOutput.push({ // Add directly as it's not summarized
              id: generateNodeId(fileSpecificPrefix, 'variable', simpleVarElement.name, detailedNodesOutput.length),
              label: `${simpleVarElement.name} (variable)`,
              type: 'js_variable',
              details: `Exported: ${simpleVarElement.isExported}`,
              lineNumbers: simpleVarElement.startLine ? `${simpleVarElement.startLine}-${simpleVarElement.endLine}` : undefined,
              structuredInfo: simpleVarElement
           });
        }
      });
    },
    ClassDeclaration(node: any) {
      const isExported = node.parentNode?.type === 'ExportNamedDeclaration' || node.parentNode?.type === 'ExportDefaultDeclaration';
      const name = node.id?.name || '[anonymous_class]';
      const methods = node.body.body.filter((item:any) => item.type === 'MethodDefinition');
      const originalNodeInfo: ExtractedCodeElement = {
        name,
        kind: 'class',
        isExported,
        superClass: node.superClass?.name,
        startLine: node.loc?.start.line,
        endLine: node.loc?.end.line,
        classMethods: methods?.map((m:any) => m.key.name || '[unknown_method]'),
        astNode: node, // Store Acorn ClassDeclaration node
      };
      elements.push(originalNodeInfo);
      // Add methods to localDefinitions
      methods.forEach((methodNode: any) => {
        if (methodNode.key) { // Ensure method has a name
            const methodName = methodNode.key.name || methodNode.key.value; // Handle computed names if necessary, though less common for 'this' calls
            localDefinitions.push({ name: methodName, kind: 'method', parentName: name, node: methodNode.value }); // methodNode.value is FunctionExpression
        }
      });
      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, 'class', name, summarizationTasks.length),
        inputForFlow: {
          elementType: 'class',
          elementName: name,
          filePath: fileName,
          signature: node.superClass?.name ? `extends ${node.superClass.name}` : undefined,
          comments: undefined,
          isExported: isExported,
          classMethods: originalNodeInfo.classMethods,
          classProperties: undefined, // Acorn property extraction more involved
        },
        originalNodeInfo,
        nodeType: 'class',
      });
    },
    ImportDeclaration(node: any) {
      imports.push({ source: node.source.value, specifiers: node.specifiers.map((s: any) => ({ importedName: s.imported?.name, localName: s.local.name, isDefault: s.type === 'ImportDefaultSpecifier', isNamespace: s.type === 'ImportNamespaceSpecifier'})), startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportNamedDeclaration(node: any) {
      let names: string[] = [];
      if (node.declaration) {
        if (node.declaration.id) names.push(node.declaration.id.name);
        else if (node.declaration.declarations) names = node.declaration.declarations.map((d:any) => d.id.name);
      } else if (node.specifiers) {
        names = node.specifiers.map((s:any) => s.exported.name);
      }
      exports.push({ type: 'named', names, source: node.source?.value, startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportDefaultDeclaration(node: any) {
      exports.push({ type: 'default', declarationType: node.declaration.type, names: [node.declaration.id?.name || (node.declaration.type === 'Identifier' ? node.declaration.name : '[anonymous_default]')], startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportAllDeclaration(node: any) {
      exports.push({ type: 'all', source: node.source.value, startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    }
  }, (ast as any));

  // Phase 2: Parallel Summarization
  const summarizationPromises = summarizationTasks.map(task =>
    summarizeCodeElementPurposeFlow.run(task.inputForFlow)
      .then(summaryResult => ({
        uniqueId: task.uniqueId,
        semanticSummary: summaryResult.semanticSummary || "Purpose unclear from available data.",
      }))
      .catch(error => {
        console.warn(`[Acorn Analyzer] Error summarizing ${task.nodeType} ${task.originalNodeInfo.name} in ${fileName}: ${error.message}`);
        return {
          uniqueId: task.uniqueId,
          semanticSummary: "Error during semantic summarization.",
        };
      })
  );
  const allSummaryResults = await Promise.all(summarizationPromises);
  const summaryMap = new Map(allSummaryResults.map(r => [r.uniqueId, r.semanticSummary]));

  // Phase 3: Integration
  summarizationTasks.forEach(task => {
    const semanticPurpose = summaryMap.get(task.uniqueId) || "Semantic purpose not determined.";
    task.originalNodeInfo.semanticPurpose = semanticPurpose;
    task.originalNodeInfo.localCalls = []; // Initialize

    // Second pass for local call detection, only for functions/methods
    if ((task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'class') && task.originalNodeInfo.astNode) { // Class itself doesn't have calls, its methods do.
        if (task.originalNodeInfo.kind === 'function' && task.originalNodeInfo.astNode.body) {
            acornWalk.simple(task.originalNodeInfo.astNode.body, {
                CallExpression(callExprNode: any) {
                    if (callExprNode.callee.type === 'Identifier') {
                        const calleeName = callExprNode.callee.name;
                        const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName); // Top-level function
                        if (targetDef) {
                            task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callExprNode.loc.start.line });
                        }
                    }
                    // No direct 'this.method()' equivalent for top-level functions in the same way as classes.
                    // Could extend to IIFEs or other patterns if needed, but keeping it simple.
                }
            });
        } else if (task.originalNodeInfo.kind === 'class') {
            // Iterate through methods of this class (which are in localDefinitions)
            // and for each method, traverse its body to find calls.
            const className = task.originalNodeInfo.name;
            const methodsOfThisClass = localDefinitions.filter(def => def.kind === 'method' && def.parentName === className);

            methodsOfThisClass.forEach(methodDef => {
                // Find the corresponding summarization task for this method to attach calls, if it exists
                // This part is a bit tricky because summarization tasks are for top-level elements (classes, functions)
                // We need to attach calls to the methods within the class's structuredInfo or create separate nodes for methods.
                // For now, let's assume classMethods in originalNodeInfo can be enriched, or we adjust the model.
                // Let's simplify: add calls to the class's localCalls for now, indicating method calls.
                // A more granular approach would be to have method-level entries in detailedNodesOutput.
                if (methodDef.node && methodDef.node.body) { // methodDef.node is the FunctionExpression
                    acornWalk.simple(methodDef.node.body, {
                        CallExpression(callExprNode: any) {
                            const callLine = callExprNode.loc.start.line;
                            if (callExprNode.callee.type === 'Identifier') {
                                const calleeName = callExprNode.callee.name;
                                // Call to another global/module function
                                const targetGlobalFunc = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
                                if (targetGlobalFunc) {
                                    task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
                                }
                            } else if (callExprNode.callee.type === 'MemberExpression' && callExprNode.callee.object.type === 'ThisExpression') {
                                const calleeName = callExprNode.callee.property.name;
                                // Call to another method of the same class
                                const targetMethod = localDefinitions.find(def => def.name === calleeName && def.kind === 'method' && def.parentName === className);
                                if (targetMethod) {
                                    task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: className, line: callLine });
                                }
                            }
                        }
                    });
                }
            });
        }
    }

    let details = `${semanticPurpose}\nExported: ${task.originalNodeInfo.isExported}. ${task.originalNodeInfo.params ? `Params: ${task.originalNodeInfo.params.map(p=>p.name).join(', ')}. ` : ''}${task.originalNodeInfo.superClass ? `Extends: ${task.originalNodeInfo.superClass}. ` : ''}${task.originalNodeInfo.classMethods ? `Methods: ${task.originalNodeInfo.classMethods.join(', ')}` : ''}`;
    if (task.originalNodeInfo.localCalls && task.originalNodeInfo.localCalls.length > 0) {
      details += `\nLocal Calls: ${task.originalNodeInfo.localCalls.map(call => `${call.targetParentName ? `${call.targetParentName}.` : ''}${call.targetName}() (line ${call.line})`).join(', ')}.`;
    }

    detailedNodesOutput.push({
      id: task.uniqueId, // Use the same uniqueId for the final node ID
      label: `${task.originalNodeInfo.name} (${task.originalNodeInfo.kind})`,
      type: `js_${task.originalNodeInfo.kind}`,
      details,
      lineNumbers: task.originalNodeInfo.startLine ? `${task.originalNodeInfo.startLine}-${task.originalNodeInfo.endLine}` : undefined,
      structuredInfo: task.originalNodeInfo,
    });
  });

  // Add imports and exports to detailedNodesOutput (they were not summarized)
  imports.forEach((imp, i) => detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'import', imp.source, detailedNodesOutput.length + i), label: `Import from '${imp.source}'`, type: 'js_import', details: imp.specifiers.map(s => s.localName + (s.importedName && s.importedName !== s.localName ? ` as ${s.importedName}` : '')).join(', '), lineNumbers: imp.startLine ? `${imp.startLine}-${imp.endLine}`: undefined, structuredInfo: imp }));
  exports.forEach((exp, i) => detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'export', exp.type, detailedNodesOutput.length + i), label: `Export ${exp.type}`, type: `js_export_${exp.type}`, details: exp.names?.join(', ') || (exp.source ? `* from ${exp.source}`: exp.declarationType), lineNumbers: exp.startLine ? `${exp.startLine}-${exp.endLine}`: undefined, structuredInfo: exp }));

  const totalLocalCalls = detailedNodesOutput.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);
  const summary = `JavaScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function').length} functions, ${elements.filter(e=>e.kind==='class').length} classes, ${imports.length} imports, ${exports.length} exports, ${elements.filter(e=>e.kind==='variable').length} top-level variables, and ${totalLocalCalls} detected local calls. Semantic summaries attempted for functions/classes.`;
  return { analysisSummary: summary, detailedNodes: detailedNodesOutput };
}

// --- Python AST Analysis (python-parser) ---
/**
 * Retrieves text for a Python AST node.
 * Handles various node types from the 'python-parser' library.
 * @param pyAstNode The Python AST node.
 * @param fileContent The full content of the Python file.
 * @returns The text representation of the node, or a placeholder.
 */
function getPyNodeText(pyAstNode: PythonNode | undefined, fileContent: string): string {
  if (!pyAstNode) return '[unknown_py_node]';

  // python-parser nodes often have 'start' and 'end' properties for raw offsets
  if (pyAstNode.start !== undefined && pyAstNode.end !== undefined) {
    return fileContent.substring(pyAstNode.start, pyAstNode.end);
  }
  // Specific node types from python-parser might have 'name' or 'id'
  if ('name' in pyAstNode && typeof pyAstNode.name === 'string') return pyAstNode.name;
  if ('id' /* for NameConstant, etc. */ in pyAstNode && typeof pyAstNode.id === 'string') return pyAstNode.id;
  if (pyAstNode.type === 'Constant' && pyAstNode.value !== undefined) return String(pyAstNode.value);
  // Add more specific cases if needed based on library's AST structure for e.g. dotted names (Attribute)
  if (pyAstNode.type === 'Attribute') {
    return `${getPyNodeText(pyAstNode.value, fileContent)}.${pyAstNode.attr}`;
  }
  return `[unknown_py_node_text_type:${pyAstNode.type}]`;
}

/**
 * Analyzes Python code using 'python-parser' to extract AST information.
 * @param fileName Name of the Python file.
 * @param fileContent Content of the Python file.
 * @param generateNodeId Function to generate unique node IDs.
 * @param fileSpecificPrefix Prefix for generated node IDs.
 * @returns Analysis summary, detailed nodes, and optional error.
 */
async function analyzePythonAST(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): Promise<{ analysisSummary: string; detailedNodes: DetailedNode[]; error?: string }> {
  const extractedFunctions: ExtractedCodeElement[] = [];
  const extractedClasses: Array<ExtractedCodeElement & { methods: ExtractedCodeElement[], properties: string[] }> = []; // Added properties
  const extractedImports: Array<{ type: string; source?: string; names: Array<{ name: string; asName?: string }>; level?: number; lineNumbers?: string }> = [];
  const detailedNodes: DetailedNode[] = [];
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: PythonNode }> = [];


  let ast: PythonNode;
  try {
    ast = pythonParse(fileContent);
  } catch (e: any) {
    return { error: 'Python AST parsing failed: ' + e.message, analysisSummary: 'Failed to parse Python content.', detailedNodes: [] };
  }

  const getLineInfo = (node: PythonNode) => ('lineno' in node && node.lineno ? `${node.lineno}${('end_lineno' in node && node.end_lineno) ? `-${node.end_lineno}` : ''}` : undefined);

  interface PySummarizationTask {
    uniqueId: string;
    inputForFlow: SummarizeCodeElementInput;
    originalNodeInfo: ExtractedCodeElement;
    nodeType: 'function' | 'class';
  }
  const summarizationTasks: PySummarizationTask[] = [];


  function visitPyNode(node: PythonNode | PythonNode[] | undefined, currentClassName?: string) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(child => visitPyNode(child, currentClassName));
      return;
    }

    const nodeType = node.type;

    if (nodeType === 'FunctionDef' || nodeType === 'AsyncFunctionDef') {
      const funcName = node.name;
      const params = node.args?.args?.map((arg: any) => ({ // python-parser uses 'any' for arg here
        name: arg.arg,
        annotation: arg.annotation ? getPyNodeText(arg.annotation, fileContent) : undefined,
      })) || [];
      const decorators = node.decorator_list?.map((d: any) => getPyNodeText(d, fileContent)) || [];
      let docstring: string | undefined = undefined;
      if (node.body && node.body.length > 0 && node.body[0].type === 'Expr' && node.body[0].value?.type === 'Constant' && typeof node.body[0].value.value === 'string') {
        docstring = node.body[0].value.value;
      }

      const funcData: ExtractedCodeElement = {
        name: funcName,
        kind: currentClassName ? 'method' : 'function',
        params,
        decorators,
        comments: docstring, // Using 'comments' field for docstring
        startLine: node.lineno,
        endLine: node.end_lineno || node.lineno,
        parentName: currentClassName,
        isAsync: nodeType === 'AsyncFunctionDef',
        astNode: node, // Store python-parser node
      };
      localDefinitions.push({ name: funcName, kind: funcData.kind as 'function' | 'method', parentName: currentClassName, node });


      if (currentClassName) {
        const classObj = extractedClasses.find(c => c.name === currentClassName);
        classObj?.methods.push(funcData);
      } else {
        extractedFunctions.push(funcData); // Top-level functions
      }

      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, funcData.kind, funcName, summarizationTasks.length),
        inputForFlow: {
          elementType: 'function', // Treat methods as functions for summarizer
          elementName: funcName,
          filePath: fileName,
          signature: `(${(params.map(p => `${p.name}${p.annotation ? `: ${p.annotation}` : ''}`).join(', ') || '')})`,
          comments: docstring,
          isExported: undefined, // Python export concept is module-level
        },
        originalNodeInfo: funcData,
        nodeType: 'function',
      });


    } else if (nodeType === 'ClassDef') {
      const className = node.name;
      const bases = node.bases?.map((b: any) => getPyNodeText(b, fileContent)) || [];
      const decorators = node.decorator_list?.map((d: any) => getPyNodeText(d, fileContent)) || [];
      let docstring: string | undefined = undefined;
      if (node.body && node.body.length > 0 && node.body[0].type === 'Expr' && node.body[0].value?.type === 'Constant' && typeof node.body[0].value.value === 'string') {
        docstring = node.body[0].value.value;
      }

      const classData: ExtractedCodeElement & { methods: ExtractedCodeElement[], properties: string[] } = {
        name: className,
        kind: 'class',
        superClass: bases.join(', '),
        decorators,
        comments: docstring,
        startLine: node.lineno,
        endLine: node.end_lineno || node.lineno,
        methods: [],
        properties: [], // Initialize properties
        astNode: node, // Store python-parser node
      };
      extractedClasses.push(classData);

      // Extract simple assignments at class level as properties (e.g. MY_CONSTANT = 1)
      node.body?.forEach((child: PythonNode) => {
        if (child.type === 'Assign') {
          child.targets?.forEach((target: PythonNode) => {
            if (target.type === 'Name') {
              classData.properties.push(target.id);
            }
          });
        }
      });


      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, 'class', className, summarizationTasks.length),
        inputForFlow: {
          elementType: 'class',
          elementName: className,
          filePath: fileName,
          signature: bases.length > 0 ? `(${bases.join(', ')})` : undefined,
          comments: docstring,
          isExported: undefined,
          classMethods: classData.methods.map(m => m.name), // Will be filled later
          classProperties: classData.properties,
        },
        originalNodeInfo: classData,
        nodeType: 'class',
      });
      visitPyNode(node.body, className); // Visit children to find methods

    } else if (nodeType === 'Import') {
      const names = node.names?.map((alias: any) => ({ name: alias.name, asName: alias.asname })) || [];
      extractedImports.push({ type: 'Import', names, lineNumbers: getLineInfo(node) });
    } else if (nodeType === 'ImportFrom') {
      const moduleName = node.module || '';
      const names = node.names?.map((alias: any) => ({ name: alias.name, asName: alias.asname })) || [];
      extractedImports.push({ type: 'ImportFrom', source: moduleName, names, level: node.level, lineNumbers: getLineInfo(node) });
    } else if ('body' in node && Array.isArray(node.body)) {
      visitPyNode(node.body, currentClassName);
    } else if ('orelse' in node && Array.isArray(node.orelse)) { // For if/for/while orelse blocks
      visitPyNode(node.orelse, currentClassName);
    }
    // Consider handlers for Try nodes, etc. if deeper analysis is needed
  }

  if (ast && ast.type === 'Module' && Array.isArray(ast.body)) {
    visitPyNode(ast.body);
  } else if (ast) {
    visitPyNode(ast);
  }

  // Parallel Summarization for Python elements
  const pySummarizationPromises = summarizationTasks.map(task =>
    summarizeCodeElementPurposeFlow.run(task.inputForFlow)
      .then(summaryResult => ({
        uniqueId: task.uniqueId,
        semanticSummary: summaryResult.semanticSummary || "Purpose unclear.",
      }))
      .catch(error => {
        console.warn(`[Py AST Analyzer] Error summarizing ${task.nodeType} ${task.originalNodeInfo.name} in ${fileName}: ${error.message}`);
        return { uniqueId: task.uniqueId, semanticSummary: "Error during summarization." };
      })
  );
  const allPySummaryResults = await Promise.all(pySummarizationPromises);
  const pySummaryMap = new Map(allPySummaryResults.map(r => [r.uniqueId, r.semanticSummary]));


  // Format detailedNodes including summaries and local calls
  summarizationTasks.forEach(task => {
    const semanticPurpose = pySummaryMap.get(task.uniqueId) || "Semantic purpose not determined.";
    task.originalNodeInfo.semanticPurpose = semanticPurpose;
    task.originalNodeInfo.localCalls = []; // Initialize

    // Python Local Call Detection (simplified)
    if ((task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'method') && task.originalNodeInfo.astNode) {
        const visitCallNodes = (currentNode: PythonNode | PythonNode[] | undefined) => {
            if (!currentNode) return;
            if (Array.isArray(currentNode)) {
                currentNode.forEach(visitCallNodes);
                return;
            }
            if (currentNode.type === 'Call') {
                const callNode = currentNode;
                const calleeNode = callNode.func;
                const callLine = calleeNode.lineno;

                if (calleeNode.type === 'Name') { // Simple function call: func()
                    const calleeName = calleeNode.id;
                    const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
                    if (targetDef) {
                        task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
                    }
                } else if (calleeNode.type === 'Attribute' && calleeNode.value?.type === 'Name' && calleeNode.value.id === 'self') { // Method call: self.method()
                    const calleeName = calleeNode.attr;
                    const currentElementParentName = task.originalNodeInfo.parentName; // class name of the current method
                    if (currentElementParentName) {
                        const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'method' && def.parentName === currentElementParentName);
                        if (targetDef) {
                            task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: currentElementParentName, line: callLine });
                        }
                    }
                }
                // Could extend to other.method() if 'other' is a known local instance.
            }

            // Recursively visit children
            if ('body' in currentNode && Array.isArray(currentNode.body)) visitCallNodes(currentNode.body);
            if ('orelse' in currentNode && Array.isArray(currentNode.orelse)) visitCallNodes(currentNode.orelse);
            if ('handlers' in currentNode && Array.isArray(currentNode.handlers)) { // For Try nodes
                 currentNode.handlers.forEach(handler => {
                    if ('body' in handler && Array.isArray(handler.body)) visitCallNodes(handler.body);
                 });
            }
            // Add more fields like 'values' for list comprehensions, 'generators' etc. if needed
        };
        // @ts-ignore python-parser specific node structure
        if (task.originalNodeInfo.astNode.body) visitCallNodes(task.originalNodeInfo.astNode.body);
    }


    let details = `${semanticPurpose}\n`;
    if (task.originalNodeInfo.decorators && task.originalNodeInfo.decorators.length > 0) {
      details += `Decorators: ${task.originalNodeInfo.decorators.join(', ')}\n`;
    }
    if (task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'method') {
      details += `Params: ${task.originalNodeInfo.params?.map(p => `${p.name}${p.annotation ? `: ${p.annotation}` : ''}`).join(', ') || '()'}\n`;
    } else if (task.originalNodeInfo.kind === 'class') {
      details += `Bases: ${task.originalNodeInfo.superClass || 'object'}\n`;
      const classNodeInfo = task.originalNodeInfo as ExtractedCodeElement & { methods: ExtractedCodeElement[], properties: string[] };
      if (classNodeInfo.methods.length > 0) details += `Methods: ${classNodeInfo.methods.map(m => m.name).join(', ')}\n`;
      if (classNodeInfo.properties.length > 0) details += `Properties: ${classNodeInfo.properties.join(', ')}\n`;
    }
    if (task.originalNodeInfo.comments) details += `Docstring: Present (see structuredInfo)\n`;

    if (task.originalNodeInfo.localCalls && task.originalNodeInfo.localCalls.length > 0) {
      details += `Local Calls: ${task.originalNodeInfo.localCalls.map(call => `${call.targetParentName ? `${call.targetParentName}.` : ''}${call.targetName}() (line ${call.line})`).join(', ')}.`;
    }

    detailedNodes.push({
      id: task.uniqueId,
      label: `${task.originalNodeInfo.name} (${task.originalNodeInfo.kind})`,
      type: `py_${task.originalNodeInfo.kind}`,
      details: details.trim(),
      lineNumbers: `${task.originalNodeInfo.startLine}-${task.originalNodeInfo.endLine}`,
      structuredInfo: task.originalNodeInfo,
    });
  });


  // Add imports (not summarized)
  extractedImports.forEach((imp, i) => {
    const importLabel = imp.type === 'ImportFrom'
      ? `From ${imp.source || (imp.level ? '.'.repeat(imp.level) : '')} import ${imp.names.map(n => n.name + (n.asName ? ` as ${n.asName}` : '')).join(', ')}`
      : `Import ${imp.names.map(n => n.name + (n.asName ? ` as ${n.asName}` : '')).join(', ')}`;
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, 'import', (imp.source || imp.names[0]?.name || 'module'), detailedNodes.length + i), // Use existing length for unique index
      label: importLabel.substring(0, 100) + (importLabel.length > 100 ? '...' : ''),
      type: 'py_import',
      details: importLabel,
      lineNumbers: imp.lineNumbers,
      structuredInfo: imp,
    });
  });

  const totalLocalCalls = detailedNodes.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);
  const analysisSummary = `Python file '${fileName}' (AST analysis): Found ${extractedFunctions.length} top-level functions, ${extractedClasses.length} classes, and ${extractedImports.length} import statements. Detected ${totalLocalCalls} local calls. Semantic summaries attempted.`;
  return { analysisSummary, detailedNodes };
}

// --- TypeScript AST Analysis ---
// Make the function async to use await for summarizeCodeElementPurposeFlow
async function analyzeTypeScriptAST(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): Promise<{ analysisSummary: string, detailedNodes: DetailedNode[], error?: string }> {
  const elements: ExtractedCodeElement[] = [];
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const detailedNodesOutput: DetailedNode[] = [];
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: ts.Node }> = [];


  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, fileContent, ts.ScriptTarget.Latest, true, scriptKind);

  const diagnostics = [...sourceFile.syntacticDiagnostics, ...sourceFile.semanticDiagnostics];
  if (diagnostics.length > 0) {
    const errorMsg = "TypeScript AST parsing/binding produced diagnostics: " + diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; ");
    console.warn(`[TS AST Analyzer] Diagnostics for ${fileName}: ${errorMsg}`);
    return { error: errorMsg, analysisSummary: `Failed to fully parse TS: ${errorMsg}`, detailedNodes: [] };
  }

  interface SummarizationTask {
    uniqueId: string;
    inputForFlow: SummarizeCodeElementInput;
    originalNodeInfo: ExtractedCodeElement; // Will include astNode
    nodeType: 'function' | 'class';
  }
  const summarizationTasks: SummarizationTask[] = [];

  // Helper to get JSDoc comments
  function getJSDocComments(node: ts.Node, sourceFile: ts.SourceFile): string | undefined {
    const comments: string[] = [];
    // @ts-ignore internal TS API, but commonly used
    if (node.jsDoc) {
      // @ts-ignore
      node.jsDoc.forEach(doc => {
        if (doc.comment) {
          comments.push(typeof doc.comment === 'string' ? doc.comment : doc.comment.map((c: any) => c.text).join(''));
        }
      });
    }
    // Also try to get leading trivia which might contain block comments
    const fullText = sourceFile.getFullText();
    const commentRanges = ts.getLeadingCommentRanges(fullText, node.getFullStart());
    if (commentRanges) {
      commentRanges.forEach(range => {
        const commentText = fullText.substring(range.pos, range.end);
        // Filter out single-line comments if JSDoc style is preferred or handle as needed
        if (commentText.startsWith('/**') || commentText.startsWith('/*')) {
           comments.push(commentText);
        }
      });
    }
    return comments.length > 0 ? comments.join('\n') : undefined;
  }

  function visitNodeRecursive(node: ts.Node) { // Renamed to avoid conflict, this is the recursive part
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const lineNumbers = `${startLine}-${endLine}`;
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported = modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
    const isDefaultExport = modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword) && isExported;
    const comments = getJSDocComments(node, sourceFile);

    let elementInfo: ExtractedCodeElement | null = null;
    let summarizerInput: SummarizeCodeElementInput | null = null;
    let nodeTypeForSummarizer: 'function' | 'class' | undefined = undefined; // To guide summarizer task creation

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      nodeTypeForSummarizer = 'function';
      const name = node.name?.getText(sourceFile) || (ts.isMethodDeclaration(node) ? '[constructor_or_method]' : '[anonymous_func]');
      const params = node.parameters.map(p => ({ name: p.name.getText(sourceFile), type: p.type?.getText(sourceFile) }));
      const returnType = node.type?.getText(sourceFile);
      let parentName: string | undefined = undefined;
      if (ts.isMethodDeclaration(node) && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))) {
        parentName = node.parent.name?.getText(sourceFile) || '[anonymous_class_parent]';
      }
      elementInfo = { name, kind: ts.isMethodDeclaration(node) ? 'method' : 'function', params, returnType, isAsync: modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword), isExported, isDefaultExport, startLine, endLine, comments, astNode: node, parentName };

      // Add to localDefinitions for call graph analysis
      localDefinitions.push({ name, kind: elementInfo.kind as 'function' | 'method', parentName, node });

      summarizerInput = {
        elementType: nodeTypeForSummarizer,
        elementName: name,
        signature: `(${params.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ')})` + (returnType ? `: ${returnType}` : ''),
        filePath: fileName,
        comments,
        isExported,
      };

    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      nodeTypeForSummarizer = 'class';
      const name = node.name?.getText(sourceFile) || '[anonymous_class]';
      const heritageClauses = node.heritageClauses;
      const superClass = heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression.getText(sourceFile);
      const implementedInterfaces = heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ImplementsKeyword)?.types.map(t => t.expression.getText(sourceFile));

      const classMethods = node.members.filter(ts.isMethodDeclaration).map(m => `${m.name?.getText(sourceFile)}(${m.parameters.map(p => p.name.getText(sourceFile) + (p.type ? ": "+p.type.getText(sourceFile):"")).join(', ')})` + (m.type ? ": "+m.type.getText(sourceFile): ""));
      const classProperties = node.members.filter(ts.isPropertyDeclaration).map(p => `${p.name?.getText(sourceFile)}${p.type ? ": "+p.type.getText(sourceFile): ""}`);
      elementInfo = { name, kind: 'class', superClass, implementedInterfaces, isExported, isDefaultExport, startLine, endLine, comments, classMethods, classProperties, astNode: node };
      // Note: Classes themselves are not added to localDefinitions for call *targets*, but their methods are.

      summarizerInput = {
        elementType: nodeTypeForSummarizer,
        elementName: name,
        signature: `${superClass ? `extends ${superClass} ` : ''}${implementedInterfaces ? `implements ${implementedInterfaces.join(', ')}` : ''}`.trim() || undefined,
        filePath: fileName,
        comments,
        isExported,
        classMethods,
        classProperties,
      };
    } else if (ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      // Potentially summarize these too, but for now, just basic info
      const kind = ts.isInterfaceDeclaration(node) ? 'interface' : ts.isEnumDeclaration(node) ? 'enum' : 'type_alias';
      elementInfo = { name: node.name.getText(sourceFile), kind, isExported, isDefaultExport, startLine, endLine, comments, semanticPurpose: "Not summarized by type." };
    } else if (ts.isVariableStatement(node)) {
        const isVarExported = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
        for (const decl of node.declarationList.declarations) {
            if(ts.isIdentifier(decl.name)) {
              const varName = decl.name.text;
              const varType = decl.type?.getText(sourceFile);
              const varInitializer = decl.initializer;
              let varKind: 'variable' | 'function' = 'variable';
              let varParams: any[] | undefined;
              let varReturnType: string | undefined;

              if (varInitializer && (ts.isArrowFunction(varInitializer) || ts.isFunctionExpression(varInitializer))) {
                varKind = 'function';
                nodeTypeForSummarizer = 'function';
                varParams = varInitializer.parameters.map(p => ({ name: p.name.getText(sourceFile), type: p.type?.getText(sourceFile) }));
                varReturnType = varInitializer.type?.getText(sourceFile);
              }
              // Check if it's a top-level const arrow function or a class property arrow function
              let parentNameForVarFunc: string | undefined = undefined;
              if (node.parent && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent)) && node.parent.name) {
                 // This is a property in a class, potentially an arrow function method
                 parentNameForVarFunc = node.parent.name.getText(sourceFile);
              }

              elementInfo = { name: varName, kind: varKind, dataType: varType, value: varInitializer?.getText(sourceFile).substring(0,50), isExported: isVarExported, startLine, endLine, comments, params: varParams, returnType: varReturnType, astNode: decl, parentName: parentNameForVarFunc };

              if (nodeTypeForSummarizer === 'function' && elementInfo) {
                if (varKind === 'function') { // Add to localDefinitions if it's a function
                    localDefinitions.push({ name: varName, kind: 'function', parentName: parentNameForVarFunc, node: decl });
                }
                summarizerInput = {
                  elementType: 'function',
                  elementName: varName,
                  signature: `(${varParams?.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ') || ''})` + (varReturnType ? `: ${varReturnType}` : ''),
                  filePath: fileName,
                  comments,
                  isExported: isVarExported,
                };
              } else {
                summarizerInput = null;
                if(elementInfo) elementInfo.semanticPurpose = "Not summarized by type.";
              }
            }
            if (elementInfo) break; // Process first declaration for now if it's a multi-declaration
        }
    }


    if (elementInfo) {
      if (summarizerInput && (nodeTypeForSummarizer === 'function' || nodeTypeForSummarizer === 'class')) {
        summarizationTasks.push({
          uniqueId: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, summarizationTasks.length),
          inputForFlow: summarizerInput,
          originalNodeInfo: { ...elementInfo }, // Clone to avoid mutation issues if any
          nodeType: nodeTypeForSummarizer,
        });
      }
      elements.push(elementInfo); // Still collect all elements for summary counts

      // If not summarizable, add directly to detailedNodesOutput here (e.g. interfaces, enums)
      if (!nodeTypeForSummarizer && elementInfo.kind !== 'variable') { // Variables already handled if not function-like
         detailedNodesOutput.push({
            id: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, detailedNodesOutput.length),
            label: `${elementInfo.name} (${elementInfo.kind})`,
            type: `ts_${elementInfo.kind}`,
            details: `Exported: ${elementInfo.isExported}. Comments: ${elementInfo.comments ? 'Available' : 'None'}. ${elementInfo.semanticPurpose || ''}`,
            lineNumbers: `${elementInfo.startLine}-${elementInfo.endLine}`,
            structuredInfo: elementInfo,
        });
      }
    } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifiers: any[] = [];
      if(node.importClause) {
        if(node.importClause.name) specifiers.push({ localName: node.importClause.name.text, isDefault: true });
        if(node.importClause.namedBindings) {
          if(ts.isNamespaceImport(node.importClause.namedBindings)) {
            specifiers.push({ localName: node.importClause.namedBindings.name.text, isNamespace: true });
          } else if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(el => specifiers.push({ importedName: el.propertyName?.text, localName: el.name.text }));
          }
        }
      }
      imports.push({ source: node.moduleSpecifier.text, specifiers, startLine, endLine });
      detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'import', node.moduleSpecifier.text, detailedNodesOutput.length), label: `Import from '${node.moduleSpecifier.text}'`, type: 'ts_import', details: specifiers.map(s => s.localName + (s.importedName && s.importedName !== s.localName ? ` as ${s.importedName}` : '')).join(', '), lineNumbers, structuredInfo: { source: node.moduleSpecifier.text, specifiers, startLine, endLine } });
    } else if (ts.isExportDeclaration(node)) {
      const names = node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements.map(el => el.name.text) : undefined;
      exports.push({ type: 'named', names, source: node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, startLine, endLine });
      detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'named', detailedNodesOutput.length), label: `Export ${names?.join(', ') || '*'}`, type: 'ts_export_named', details: `Source: ${node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : 'local'}`, lineNumbers, structuredInfo: { type: 'named', names, source: node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, startLine, endLine } });
    } else if (ts.isExportAssignment(node)) { // export default ...
      exports.push({ type: 'default', names: [node.expression.getText(sourceFile).substring(0,50)], startLine, endLine });
      detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'default', detailedNodesOutput.length), label: `Export Default`, type: 'ts_export_default', details: node.expression.getText(sourceFile).substring(0,100), lineNumbers, structuredInfo: { type: 'default', expression: node.expression.getText(sourceFile), startLine, endLine } });
    }

    for (const child of node.getChildren(sourceFile)) {
        visitNodeRecursive(child); // Recursive call
    }
  }

  // Phase 1: Data Collection (Recursive)
  visitNodeRecursive(sourceFile);

  // Phase 2: Parallel Summarization
  const summarizationPromises = summarizationTasks.map(task =>
    summarizeCodeElementPurposeFlow.run(task.inputForFlow)
      .then(summaryResult => ({
        uniqueId: task.uniqueId,
        semanticSummary: summaryResult.semanticSummary || "Purpose unclear from available data.",
      }))
      .catch(error => {
        console.warn(`[TS AST Analyzer] Error summarizing ${task.nodeType} ${task.originalNodeInfo.name} in ${fileName}: ${error.message}`);
        return {
          uniqueId: task.uniqueId,
          semanticSummary: "Error during semantic summarization.",
        };
      })
  );
  const allSummaryResults = await Promise.all(summarizationPromises);
  const summaryMap = new Map(allSummaryResults.map(r => [r.uniqueId, r.semanticSummary]));

  // Phase 3: Integration (including local call detection)
  summarizationTasks.forEach(task => {
    const semanticPurpose = summaryMap.get(task.uniqueId) || "Semantic purpose not determined.";
    task.originalNodeInfo.semanticPurpose = semanticPurpose;
    task.originalNodeInfo.localCalls = []; // Initialize

    // Second pass for local call detection, only for functions/methods
    if ((task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'method') && task.originalNodeInfo.astNode) {
      const findCallsVisitor = (currentNode: ts.Node) => {
        if (ts.isCallExpression(currentNode)) {
          const callExpr = currentNode;
          const callLine = sourceFile.getLineAndCharacterOfPosition(callExpr.getStart(sourceFile)).line + 1;

          if (ts.isIdentifier(callExpr.expression)) {
            const calleeName = callExpr.expression.getText(sourceFile);
            // Check for top-level functions or functions defined in the same scope (not handling closures deeply here)
            const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
            if (targetDef) {
              task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
            }
          } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
            const propAccess = callExpr.expression;
            if (propAccess.expression.kind === ts.SyntaxKind.ThisKeyword) {
              const calleeName = propAccess.name.getText(sourceFile);
              const currentElementParentName = task.originalNodeInfo.parentName; // class name of the current method
              if (currentElementParentName) {
                const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'method' && def.parentName === currentElementParentName);
                if (targetDef) {
                  task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: currentElementParentName, line: callLine });
                }
              }
            }
            // Could also handle calls like `this.props.someFunc()` or `object.method()` if `object` is a known local class instance.
            // For simplicity, focusing on direct `this.method()` and global `func()` calls.
          }
        }
        ts.forEachChild(currentNode, findCallsVisitor);
      };

      // Traverse the body of the function/method AST node
      // @ts-ignore - body property exists on function/method like nodes
      if (task.originalNodeInfo.astNode.body) {
         // @ts-ignore
        ts.forEachChild(task.originalNodeInfo.astNode.body, findCallsVisitor);
      }
    }

    let details = `${semanticPurpose}\n`;
    details += `${task.originalNodeInfo.isExported ? (task.originalNodeInfo.isDefaultExport ? 'Default Export. ' : 'Exported. ') : 'Not Exported. '}`;
    if (task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'method') {
      details += `${task.originalNodeInfo.params ? `Params: ${task.originalNodeInfo.params.map(p=>`${p.name}${p.type ? `: ${p.type}`:''}`).join(', ')}. ` : ''}`;
      details += `${task.originalNodeInfo.returnType ? `Returns: ${task.originalNodeInfo.returnType}. ` : ''}`;
    } else if (task.originalNodeInfo.kind === 'class') {
      details += `${task.originalNodeInfo.superClass ? `Extends: ${task.originalNodeInfo.superClass}. ` : ''}`;
      details += `${task.originalNodeInfo.implementedInterfaces ? `Implements: ${task.originalNodeInfo.implementedInterfaces.join(', ')}. ` : ''}`;
    }
    details += `Comments: ${task.originalNodeInfo.comments ? 'Available (see structuredInfo)' : 'None'}.`;

    if (task.originalNodeInfo.localCalls && task.originalNodeInfo.localCalls.length > 0) {
      details += `\nLocal Calls: ${task.originalNodeInfo.localCalls.map(call => `${call.targetParentName ? `${call.targetParentName}.` : ''}${call.targetName}() (line ${call.line})`).join(', ')}.`;
    }

    detailedNodesOutput.push({
      id: task.uniqueId, // Use the same uniqueId
      label: `${task.originalNodeInfo.name} (${task.originalNodeInfo.kind})`,
      type: `ts_${task.originalNodeInfo.kind}`,
      details: details.trim(),
      lineNumbers: `${task.originalNodeInfo.startLine}-${task.originalNodeInfo.endLine}`,
      structuredInfo: task.originalNodeInfo,
    });
  });

  const totalLocalCalls = detailedNodesOutput.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);
  const summary = `TypeScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function'||e.kind==='method').length} functions/methods, ${elements.filter(e=>e.kind==='class').length} classes, ${elements.filter(e=>e.kind==='interface').length} interfaces, ${imports.length} imports, ${exports.length} exports, and ${totalLocalCalls} detected local calls. Semantic summaries attempted.`;
  return { analysisSummary: summary, detailedNodes: detailedNodesOutput };
}

// --- Fallback and other analyzers (package.json, generic.json, markdown, plain_text, fallback, python regex) ---
// Ensure generateNodeId usage is consistent
function analyzePackageJson(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
// These are kept from the previous version, ensure generateNodeId usage is consistent
function analyzePackageJson(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
  let summary = `File '${fileName}' (package.json). `;
  try {
    const parsed = JSON.parse(fileContent);
    nodes.push({ id: generateNodeId(fileSpecificPrefix, 'info', 'root'), label: 'package.json Root', type: 'config_root', details: `Name: ${parsed.name || 'N/A'}, Version: ${parsed.version || 'N/A'}` });
    if (parsed.description) {
      nodes.push({ id: generateNodeId(fileSpecificPrefix, 'desc', 'description'), label: 'Description', type: 'metadata', details: parsed.description });
    }
    if (parsed.dependencies) {
      const depNames = Object.keys(parsed.dependencies).slice(0, 5).join(', ');
      nodes.push({ id: generateNodeId(fileSpecificPrefix, 'deps', 'dependencies'), label: 'Dependencies (sample)', type: 'dependency_list', details: depNames + (Object.keys(parsed.dependencies).length > 5 ? '...' : '') });
    }
    summary += `Project: ${parsed.name || 'N/A'}. Contains script and dependency info.`;
  } catch (e: any) {
    summary += `Error parsing JSON: ${e.message}`;
    nodes.push({ id: generateNodeId(fileSpecificPrefix, 'error', 'parsing'), label: 'JSON Parse Error', type: 'error', details: e.message });
  }
  return { analysisSummary: summary, detailedNodes: nodes };
}

function analyzeGenericJson(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  let summary = `File '${fileName}' (JSON). `;
  const nodes: DetailedNode[] = [];
  try {
    const parsed = JSON.parse(fileContent);
    const keys = Object.keys(parsed).slice(0, 5).join(', ');
    nodes.push({ id: generateNodeId(fileSpecificPrefix, 'info', 'root'), label: 'JSON Root', type: 'json_root', details: `Top-level keys (sample): ${keys}` + (Object.keys(parsed).length > 5 ? '...' : '') });
    summary += `Contains structured data with keys: ${keys}...`;
  } catch (e: any) {
    summary += `Error parsing JSON: ${e.message}`;
    nodes.push({ id: generateNodeId(fileSpecificPrefix, 'error', 'parsing'), label: 'JSON Parse Error', type: 'error', details: e.message });
  }
  return { analysisSummary: summary, detailedNodes: nodes };
}

function analyzeMarkdown(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
  const lines = fileContent.split('\n');
  const headers = lines.filter(line => line.startsWith('#')).slice(0, 5);
  nodes.push({ id: generateNodeId(fileSpecificPrefix, 'info', 'markdown'), label: 'Markdown File', type: 'markdown_file', details: `Contains ${lines.length} lines.` });
  headers.forEach((h, i) => {
    nodes.push({ id: generateNodeId(fileSpecificPrefix, `header`, h, i), label: `Header: ${h.substring(0, 50)}`, type: 'markdown_header', details: h });
  });
  return {
    analysisSummary: `Markdown file '${fileName}' with ${lines.length} lines. Found ${headers.length} headers (sample shown).`,
    detailedNodes: nodes,
  };
}
function analyzeSourceCodeRegexFallback(fileName: string, fileContent: string, language: 'python', generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [];
  const lines = fileContent.split('\n').length;
  let functions: string[] = [], classes: string[] = [], imports: string[] = [], comments = 0;

  const functionRegexPy = /def\s+([a-zA-Z0-9_]+)\s*\(/g;
  const classRegexPy = /class\s+([a-zA-Z0-9_]+)\s*\(?/g;
  const importRegexPy = /import\s+([\w.,\s]+(?:as\s+\w+)?)/g;
  let match;
  if (language === 'python') {
    while ((match = functionRegexPy.exec(fileContent)) !== null) functions.push(match[1]);
    while ((match = classRegexPy.exec(fileContent)) !== null) classes.push(match[1]);
    while ((match = importRegexPy.exec(fileContent)) !== null) imports.push(match[1]);
    comments = (fileContent.match(/#/g) || []).length;
  }

  nodes.push({ id: generateNodeId(fileSpecificPrefix, 'info', 'sourcefile'), label: `${language} File (Regex)`, type: `${language}_file_regex`, details: `Lines: ${lines}, Functions: ${functions.length}, Classes: ${classes.length}, Imports: ${imports.length}, Comments: ${comments}` });
  return {
    analysisSummary: `${language} file '${fileName}' (${lines} lines). Regex Analysis: Functions: ${functions.length}, Classes: ${classes.length}, Imports: ${imports.length}.`,
    detailedNodes: nodes,
  };
}
function analyzePlainText(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const lines = fileContent.split('\n');
  const firstLine = lines[0]?.substring(0, 100) || '';
  const nodes: DetailedNode[] = [
    { id: generateNodeId(fileSpecificPrefix, 'info', 'textfile'), label: 'Text File', type: 'text_file', details: `Contains ${lines.length} lines.` },
    { id: generateNodeId(fileSpecificPrefix, 'preview', 'firstline'), label: 'First Line Preview', type: 'content_preview', details: firstLine },
  ];
  return {
    analysisSummary: `Plain text file '${fileName}' with ${lines.length} lines. Preview: '${firstLine}...'.`,
    detailedNodes: nodes,
  };
}
function analyzeFallback(fileName: string, contentType: string | undefined, fileSize: number | undefined, userHint: string | undefined, generateNodeId: Function, fileSpecificPrefix: string, isFileBinary: boolean): { analysisSummary: string, detailedNodes: DetailedNode[] } {
  const nodes: DetailedNode[] = [
    { id: generateNodeId(fileSpecificPrefix, 'info', 'genericfile'), label: 'File Summary', type: 'generic_file', details: `Type: ${contentType || 'unknown'}, Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}` },
  ];
  if(isFileBinary){
    nodes.push({id: generateNodeId(fileSpecificPrefix, 'type', 'binary'), label: 'Binary File', type: 'binary_info', details: `Content type: ${contentType}`});
  }
  return {
    analysisSummary: `File '${fileName}' (${contentType || 'unknown type'}). Size: ${fileSize !== undefined ? `${fileSize} bytes` : 'unknown'}. User hint: '${userHint || 'N/A'}'. Basic analysis performed.`,
    detailedNodes: nodes,
  };
}
>>>>>>> master

async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`[AnalyzerToolV2] Path: ${input.projectStoragePath}, Hint: ${input.userHint}`);
  const BUCKET_NAME = "project_archives";
  const fileSpecificPrefix = (input.projectStoragePath.split('/').pop() || 'file').replace(/[^a-zA-Z0-9_]/g, '_');

<<<<<<< HEAD
  if (input.userHint === "_USE_FIXED_MOCK_PROJECT_A_") {
    console.log("Returning FIXED_MOCK_PROJECT_A_ANALYSIS based on hint.");
    return FIXED_MOCK_PROJECT_A_ANALYSIS;
  }
  if (input.userHint && input.userHint.startsWith("_USE_SIMULATED_FS_") && input.userHint !== "_USE_FIXED_MOCK_PROJECT_A_") {
    console.warn(`Simulated FS hint '${input.userHint}' received but no specific mock generator implemented beyond FIXED_MOCK_A. Proceeding with generic or Supabase path if applicable.`);
  }

  const output: ProjectAnalysisOutput = {
    projectName: input.projectStoragePath.split('/').filter(Boolean).pop() || "Unknown Project",
    inferredLanguagesFrameworks: [],
    projectSummary: input.userHint ? `Analysis based on user hint: ${input.userHint}` : "Automated project analysis.",
    dependencies: {},
    directoryStructureSummary: [],
    keyFiles: [],
    potentialArchitecturalComponents: [],
    parsingErrors: [],
  };

  try {
    let filesToAnalyze: Array<{ name: string; content?: string | Buffer }> = [];
    let isArchive = false;

    if (input.projectStoragePath.toLowerCase().endsWith('.zip')) {
      isArchive = true;
      console.log("Detected .zip extension, attempting to download and unpack archive.");
      const archiveBuffer = await downloadProjectFileAsBuffer(input.projectStoragePath);
      if (archiveBuffer) {
        const unpackResult = await unpackZipBuffer(archiveBuffer);
        if (unpackResult) {
          filesToAnalyze = unpackResult.files.map(file => ({ name: file.name, content: file.content }));
          if (unpackResult.entryErrors.length > 0) {
            output.parsingErrors?.push(...unpackResult.entryErrors);
          }
          console.log(`Unpacked ${filesToAnalyze.length} files from archive. Encountered ${unpackResult.entryErrors.length} entry errors.`);
          if (filesToAnalyze.length === 0 && unpackResult.entryErrors.some(e => e.startsWith("Critical ZIP unpacking error"))) {
            // If critical error happened early and no files were processed, it's a critical failure.
             output.parsingErrors?.push(`Critical failure to unpack ZIP archive: ${input.projectStoragePath}`);
             return output;
          }
        } else { // Should not happen if unpackZipBuffer always returns UnpackResult or null (and null is not expected anymore)
          output.parsingErrors?.push(`Failed to unpack ZIP archive (null result): ${input.projectStoragePath}`);
          return output; // Critical error
        }
      } else {
        output.parsingErrors?.push(`Failed to download ZIP archive: ${input.projectStoragePath}`);
        return output; // Critical error, cannot proceed
      }
    } else {
      // Assume flat file structure, list files directly from storage path
      console.log("No .zip extension detected, listing files from storage path.");
      const listedFiles = await listProjectFiles(input.projectStoragePath);
      filesToAnalyze = listedFiles.map(f => ({ name: f.name })); // Content will be fetched on demand
    }

    if (filesToAnalyze.length === 0 && !isArchive) { // if not an archive and still no files, then it's an issue.
        output.parsingErrors?.push(`No files found at storage path or in archive: ${input.projectStoragePath}.`);
        output.projectSummary = `Could not list files at path: ${input.projectStoragePath}. Path might be incorrect or empty.`;
        return output;
    } else if (filesToAnalyze.length === 0 && isArchive) {
        output.parsingErrors?.push(`ZIP archive at ${input.projectStoragePath} was empty or contained no processable files.`);
        return output;
    }


    // Helper to get file content, either from memory (unpacked) or by downloading
    const getFileContent = async (fileName: string): Promise<string | null> => {
        const fileInMemory = filesToAnalyze.find(f => f.name === fileName && f.content);
        if (fileInMemory?.content) {
            return typeof fileInMemory.content === 'string' ? fileInMemory.content : fileInMemory.content.toString('utf-8');
        }
        // If not an archive or content not preloaded, download it
        if (!isArchive) {
            const fullPath = input.projectStoragePath.endsWith('/')
                ? `${input.projectStoragePath}${fileName}`
                : `${input.projectStoragePath}/${fileName}`;
            return await downloadProjectFile(fullPath);
        }
        return null; // File not found in archive or content not string
    };

    const fileListForSummary = isArchive ? filesToAnalyze : filesToAnalyze.map(f => ({name: f.name}));


    output.directoryStructureSummary?.push({
        path: "/",
        fileCounts: filesList.reduce((acc, file) => {
            const ext = file.name.substring(file.name.lastIndexOf('.'));
            if (ext && ext.length > 1) acc[ext] = (acc[ext] || 0) + 1;
            else acc["<no_ext>"] = (acc["<no_ext>"] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        inferredPurpose: "Project root",
    });

    filesList.slice(0, 5).forEach(f => {
        const existingKeyFile = output.keyFiles?.find(kf => kf.filePath === f.name);
        if (!existingKeyFile) {
            output.keyFiles?.push({
                filePath: f.name,
                type: f.name.toLowerCase().includes('readme') ? 'readme' : 'unknown',
                briefDescription: `File found at root: ${f.name}`
            });
        }
    });

    // Node.js analysis
    const packageJsonFileObject = filesList.find(f => f.name.toLowerCase() === 'package.json');
    if (packageJsonFileObject) {
        // ... (Node.js analysis logic as before) ...
        const packageJsonContent = await getFileContent(packageJsonFileObject.name); // Use getFileContent
      if (packageJsonContent) {
        if (!output.keyFiles?.find(kf => kf.filePath === packageJsonFileObject.name)) {
            output.keyFiles?.push({ filePath: packageJsonFileObject.name, type: "manifest", briefDescription: "Project manifest and dependencies (Node.js)." });
        }
        try {
          const packageJson = JSON.parse(packageJsonContent);
          output.projectName = packageJson.name || output.projectName;
          if (packageJson.description) output.projectSummary = packageJson.description;

          const nodeLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Node.js");
          if (nodeLang) nodeLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Node.js", confidence: "high" });

          if (packageJson.dependencies || packageJson.devDependencies) {
            const npmLang = output.inferredLanguagesFrameworks?.find(l => l.name === "npm");
            if (npmLang) npmLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "npm", confidence: "high" });
          }

          const deps: string[] = [];
          if (packageJson.dependencies) deps.push(...Object.keys(packageJson.dependencies));
          if (packageJson.devDependencies) deps.push(...Object.keys(packageJson.devDependencies).map(d => `${d} (dev)`));
          if (deps.length > 0) output.dependencies = { ...output.dependencies, npm: deps };

          if (deps.some(d => d.startsWith('react'))) output.inferredLanguagesFrameworks?.push({ name: "React", confidence: "medium" });

          // Deeper Node.js analysis: list source files and extract imports
          const sourceFileExtensions = ['.js', '.jsx', '.ts', '.tsx'];
          const sourceFiles = filesToAnalyze.filter(f => sourceFileExtensions.some(ext => f.name.endsWith(ext)));

          // Limit processing for performance
          const MAX_SOURCE_FILES_TO_PROCESS = 20;
          let processedSourceFilesCount = 0;

          for (const sourceFile of sourceFiles) {
            if (processedSourceFilesCount >= MAX_SOURCE_FILES_TO_PROCESS) break;

            const fileContent = await getFileContent(sourceFile.name);
            if (fileContent) {
              const imports = extractJsImports(fileContent);
              let fileType: KeyFileSchema['type'] = 'utility'; // Default
              if (sourceFile.name.includes('/services/')) fileType = 'service_definition';
              else if (sourceFile.name.includes('/components/') || sourceFile.name.includes('/pages/') || sourceFile.name.includes('/app/')) fileType = 'ui_component';
              else if (sourceFile.name.match(/index\.(js|ts)x?$/) || sourceFile.name.match(/app\.(js|ts)x?$/) || sourceFile.name.match(/server\.(js|ts)$/)) fileType = 'entry_point';

              const existingKf = output.keyFiles?.find(kf => kf.filePath === sourceFile.name);
              if (existingKf) {
                existingKf.type = existingKf.type === 'unknown' ? fileType : existingKf.type; // Update type if more specific
                existingKf.details = existingKf.details ? `${existingKf.details}\nImports: ${imports.join(', ')}` : `Imports: ${imports.join(', ')}`;
                if (imports.length > 0) existingKf.briefDescription = (existingKf.briefDescription || "") + " Contains module imports.";
              } else {
                 output.keyFiles?.push({
                    filePath: sourceFile.name,
                    type: fileType,
                    briefDescription: `Source file. ${imports.length > 0 ? "Contains module imports." : ""}`,
                    details: imports.length > 0 ? `Imports: ${imports.join(', ')}` : undefined,
                 });
              }
              processedSourceFilesCount++;
            } else {
              output.parsingErrors?.push(`Could not read content for source file: ${sourceFile.name}`);
            }
          }


        } catch (e: any) {
          output.parsingErrors?.push(`Error parsing package.json: ${e.message}`);
        }
      } else if (packageJsonFileObject) { // Check if file object existed, meaning download failed
        output.parsingErrors?.push(`package.json found in listing but could not be downloaded/read.`);
      }
    }

    // Python analysis
    const requirementsTxtFile = filesList.find(f => f.name.toLowerCase() === 'requirements.txt');
    const setupPyFile = filesList.find(f => f.name.toLowerCase() === 'setup.py');
    const pyprojectTomlFile = filesList.find(f => f.name.toLowerCase() === 'pyproject.toml');
    const pyFiles = filesList.filter(f => f.name.endsWith('.py'));
    let isPythonProject = pyFiles.length > 0;

    if (requirementsTxtFile || setupPyFile || pyprojectTomlFile) {
        isPythonProject = true;
    }
    // ... (Python analysis logic as before, including parseRequirementsTxt, metadata from setup.py/pyproject.toml) ...
    if (isPythonProject) {
        const pythonLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Python");
        if (pythonLang) pythonLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Python", confidence: "high" });

        if (requirementsTxtFile) {
            const reqPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${requirementsTxtFile.name}` : `${input.projectStoragePath}/${requirementsTxtFile.name}`;
            // const reqContent = await downloadProjectFile(reqPath); // Use getFileContent for consistency
            const reqContent = await getFileContent(requirementsTxtFile.name);
            if (reqContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === requirementsTxtFile.name)) {
                     output.keyFiles?.push({ filePath: requirementsTxtFile.name, type: "manifest", briefDescription: "Python project dependencies." });
                }
                try {
                    const pythonDependencies = parseRequirementsTxt(reqContent);
                    if (pythonDependencies.length > 0) {
                        output.dependencies = { ...output.dependencies, pip: pythonDependencies };
                        const pipLang = output.inferredLanguagesFrameworks?.find(l => l.name === "pip");
                        if (pipLang) pipLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "pip", confidence: "high" });
                    }
                } catch (e: any) { output.parsingErrors?.push(`Error parsing requirements.txt: ${e.message}`); }
            } else { output.parsingErrors?.push(`${requirementsTxtFile.name} found in listing but could not be downloaded/read.`);}
        }

        let projectNameFromPyMetadata: string | undefined;
        let projectVersionFromPyMetadata: string | undefined;

        if (pyprojectTomlFile) {
            const pyprojectTomlContent = await getFileContent(pyprojectTomlFile.name);
            if (pyprojectTomlContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === pyprojectTomlFile.name)) {
                    output.keyFiles?.push({ filePath: pyprojectTomlFile.name, type: "manifest", briefDescription: "Project metadata and build configuration (TOML)." });
                }
                const nameMatch = pyprojectTomlContent.match(/name\s*=\s*["']([^"']+)["']/);
                if (nameMatch && nameMatch[1]) projectNameFromPyMetadata = nameMatch[1];
                const versionMatch = pyprojectTomlContent.match(/version\s*=\s*["']([^"']+)["']/);
                if (versionMatch && versionMatch[1]) projectVersionFromPyMetadata = versionMatch[1];
            } else { output.parsingErrors?.push(`${pyprojectTomlFile.name} found in listing but could not be downloaded/read.`);}
        }

        if (!projectNameFromPyMetadata && setupPyFile) {
            const setupPyContent = await getFileContent(setupPyFile.name);
            if (setupPyContent) {
                 if (!output.keyFiles?.find(kf => kf.filePath === setupPyFile.name)) {
                    output.keyFiles?.push({ filePath: setupPyFile.name, type: "manifest", briefDescription: "Project metadata and build script (Python)." });
                }
                const nameMatch = setupPyContent.match(/name\s*=\s*["']([^"']+)["']/);
                if (nameMatch && nameMatch[1]) projectNameFromPyMetadata = nameMatch[1];
                const versionMatch = setupPyContent.match(/version\s*=\s*["']([^"']+)["']/);
                if (versionMatch && versionMatch[1]) projectVersionFromPyMetadata = versionMatch[1];
            } else { output.parsingErrors?.push(`${setupPyFile.name} found in listing but could not be downloaded/read.`);}
        }

        if (projectNameFromPyMetadata && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) {
            output.projectName = projectNameFromPyMetadata;
        }
        if (projectVersionFromPyMetadata) {
            const versionString = ` (Version: ${projectVersionFromPyMetadata})`;
            if (output.projectSummary && !output.projectSummary.includes(versionString)) output.projectSummary += versionString;
            else if (!output.projectSummary) output.projectSummary = `Version: ${projectVersionFromPyMetadata}`;
        }

        // Deeper Python source file analysis
        const pythonSourceFiles = filesToAnalyze.filter(f => f.name.endsWith('.py'));
        const MAX_PY_FILES_TO_PROCESS = 20; // Similar limit as Node.js
        let processedPyFilesCount = 0;

        for (const pyFile of pythonSourceFiles) {
            if (processedPyFilesCount >= MAX_PY_FILES_TO_PROCESS) break;
            // Skip common virtual environment folders and __pycache__
            if (pyFile.name.includes('/venv/') || pyFile.name.includes('/.venv/') || pyFile.name.includes('__pycache__')) {
                continue;
            }

            const fileContent = await getFileContent(pyFile.name);
            if (fileContent) {
                const imports = extractPyImports(fileContent);
                const classes = extractPyClasses(fileContent);
                const functions = extractPyFunctions(fileContent);
                const symbols = [...classes, ...functions];

                let fileType: KeyFileSchema['type'] = 'utility';
                if (pyFile.name.toLowerCase().endsWith('views.py') || pyFile.name.toLowerCase().endsWith('routes.py')) fileType = 'service_definition';
                else if (pyFile.name.toLowerCase().endsWith('models.py')) fileType = 'model';
                else if (pyFile.name.toLowerCase() === 'app.py' || pyFile.name.toLowerCase() === 'main.py' || pyFile.name.toLowerCase() === 'manage.py') fileType = 'entry_point';
                else if (classes.length > 0 && functions.length === 0) fileType = 'model'; // Heuristic: file with mostly classes might be models
                else if (functions.length > 0 && classes.length === 0) fileType = 'utility'; // Heuristic: file with mostly functions

                const existingKf = output.keyFiles?.find(kf => kf.filePath === pyFile.name);
                let detailsString = "";
                if (imports.length > 0) detailsString += `Imports: ${imports.join(', ')}`;
                if (symbols.length > 0) detailsString += (detailsString ? '\n' : '') + `Symbols: ${symbols.join(', ')}`;


                if (existingKf) {
                    existingKf.type = existingKf.type === 'unknown' ? fileType : existingKf.type;
                    existingKf.details = (existingKf.details ? `${existingKf.details}\n` : '') + detailsString;
                    existingKf.extractedSymbols = [...new Set([...(existingKf.extractedSymbols || []), ...symbols])];
                    if (!existingKf.briefDescription?.includes("Python source file")) existingKf.briefDescription = (existingKf.briefDescription || "") + " Python source file.";
                } else {
                    output.keyFiles?.push({
                        filePath: pyFile.name,
                        type: fileType,
                        briefDescription: `Python source file. ${symbols.length > 0 ? "Contains classes/functions." : ""} ${imports.length > 0 ? "Contains imports." : ""}`.trim(),
                        details: detailsString || undefined,
                        extractedSymbols: symbols.length > 0 ? symbols : undefined,
                    });
                }
                processedPyFilesCount++;
            } else {
                output.parsingErrors?.push(`Could not read content for Python source file: ${pyFile.name}`);
            }
        }
        // ... (component inference for Python as before)
    }


    // Java analysis
    const pomXmlFile = filesList.find(f => f.name.toLowerCase() === 'pom.xml');
    const buildGradleFile = filesList.find(f => f.name.toLowerCase() === 'build.gradle' || f.name.toLowerCase() === 'build.gradle.kts');
    const javaFiles = filesList.filter(f => f.name.endsWith('.java'));
    let isJavaProject = javaFiles.length > 0;
    if (pomXmlFile || buildGradleFile) isJavaProject = true;
    // ... (Java analysis logic as before, including parsePomXml, parseBuildGradle) ...
    if (isJavaProject) {
        const javaLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Java");
        if (javaLang) javaLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Java", confidence: "high" });

        if (pomXmlFile) {
            // ... (pom.xml processing as before)
            const pomPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${pomXmlFile.name}` : `${input.projectStoragePath}/${pomXmlFile.name}`;
            const pomContent = await downloadProjectFile(pomPath);
            if (pomContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === pomXmlFile.name)) {
                     output.keyFiles?.push({ filePath: pomXmlFile.name, type: "manifest", briefDescription: "Maven project configuration." });
                }
                try {
                    const pomData = parsePomXml(pomContent);
                    if (pomData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) output.projectName = pomData.projectName;
                    if (pomData.version) { /* ... update summary with version ... */ }
                    if (pomData.dependencies.length > 0) output.dependencies = { ...output.dependencies, maven: pomData.dependencies };
                    const mavenLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Maven");
                    if (mavenLang) mavenLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Maven", confidence: "high" });
                } catch (e: any) { output.parsingErrors?.push(`Error parsing pom.xml: ${e.message}`);}
            } else {output.parsingErrors?.push(`${pomXmlFile.name} found in listing but could not be downloaded.`);}
        } else if (buildGradleFile) {
            // ... (build.gradle processing as before) ...
            const gradlePath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${buildGradleFile.name}` : `${input.projectStoragePath}/${buildGradleFile.name}`;
            const gradleContent = await downloadProjectFile(gradlePath);
            if (gradleContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === buildGradleFile.name)) {
                    output.keyFiles?.push({ filePath: buildGradleFile.name, type: "manifest", briefDescription: "Gradle project configuration." });
                }
                try {
                    const gradleData = parseBuildGradle(gradleContent);
                    if (gradleData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) output.projectName = gradleData.projectName;
                    if (gradleData.version) { /* ... update summary with version ... */ }
                    if (gradleData.dependencies.length > 0) output.dependencies = { ...output.dependencies, gradle: gradleData.dependencies };
                    const gradleLang = output.inferredLanguagesFrameworks?.find(l => l.name === "Gradle");
                    if (gradleLang) gradleLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "Gradle", confidence: "high" });
                } catch (e: any) { output.parsingErrors?.push(`Error parsing ${buildGradleFile.name}: ${e.message}`);}
            } else { output.parsingErrors?.push(`${buildGradleFile.name} found in listing but could not be downloaded.`);}
        }
        // ... (Spring Boot and Java entry point detection as before) ...
        const allJavaDeps = [...(output.dependencies?.maven || []), ...(output.dependencies?.gradle || [])];
        if (allJavaDeps.some(dep => dep.toLowerCase().includes('spring-boot-starter'))) {
            if (!output.inferredLanguagesFrameworks?.find(lang => lang.name === "Spring Boot")) {
                output.inferredLanguagesFrameworks?.push({ name: "Spring Boot", confidence: "medium" });
            }
            // ... add Spring Boot component ...
        }
    }

    // C# Analysis
    const csprojFiles = filesList.filter(f => f.name.toLowerCase().endsWith('.csproj'));
    const slnFile = filesList.find(f => f.name.toLowerCase().endsWith('.sln'));
    const csFiles = filesList.filter(f => f.name.toLowerCase().endsWith('.cs'));
    let isCSharpProject = csFiles.length > 0;
    if (csprojFiles.length > 0 || slnFile) isCSharpProject = true;

    if (isCSharpProject) {
        const csharpLang = output.inferredLanguagesFrameworks?.find(l => l.name === "C#");
        if (csharpLang) csharpLang.confidence = "high"; else output.inferredLanguagesFrameworks?.push({ name: "C#", confidence: "high" });

        const dotNetLang = output.inferredLanguagesFrameworks?.find(l => l.name === ".NET" || l.name.startsWith(".NET Platform"));
        if (dotNetLang) dotNetLang.confidence = "high";
        else if (!output.inferredLanguagesFrameworks?.find(l => l.name.startsWith(".NET Platform"))) {
            output.inferredLanguagesFrameworks?.push({ name: ".NET", confidence: "high" });
        }

        if (csprojFiles.length > 0) {
            let mainCsprojFile = csprojFiles.find(f => !f.name.toLowerCase().includes('test'));
            if (!mainCsprojFile) mainCsprojFile = csprojFiles[0];

            const csprojPath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${mainCsprojFile.name}` : `${input.projectStoragePath}/${mainCsprojFile.name}`;
            const csprojContent = await downloadProjectFile(csprojPath);

            if (csprojContent) {
                if (!output.keyFiles?.find(kf => kf.filePath === mainCsprojFile!.name)) {
                    output.keyFiles?.push({ filePath: mainCsprojFile!.name, type: "manifest", briefDescription: "C# project file." });
                }
                try {
                    const csprojData = parseCsproj(csprojContent, mainCsprojFile.name);
                    if (csprojData.projectName && (!output.projectName || output.projectName === (input.projectStoragePath.split('/').filter(Boolean).pop()))) {
                        output.projectName = csprojData.projectName;
                    }
                    if (csprojData.targetFramework) {
                        const frameworkString = ` (Framework: ${csprojData.targetFramework})`;
                         if (output.projectSummary && !output.projectSummary.includes(frameworkString)) output.projectSummary += frameworkString;
                         else if (!output.projectSummary) output.projectSummary = `Framework: ${csprojData.targetFramework}`;

                        if (csprojData.targetFramework.toLowerCase().startsWith('netcoreapp') || csprojData.targetFramework.toLowerCase().startsWith('net')) {
                             const dotNetVersion = csprojData.targetFramework.toLowerCase().replace('netcoreapp', 'NET Core ').replace('net','NET ');
                             const existingDotNet = output.inferredLanguagesFrameworks?.find(lang => lang.name.startsWith(".NET Platform") || lang.name === ".NET");
                             if (existingDotNet) existingDotNet.name = `.NET Platform (${dotNetVersion.trim()})`;
                             else output.inferredLanguagesFrameworks?.push({ name: `.NET Platform (${dotNetVersion.trim()})`, confidence: "high" });
                        }
                    }
                    if (csprojData.dependencies.length > 0) {
                        output.dependencies = { ...output.dependencies, nuget: csprojData.dependencies };
                    }
                } catch (e: any) {
                    output.parsingErrors?.push(`Error parsing ${mainCsprojFile.name}: ${e.message}`);
                }
            } else {
                output.parsingErrors?.push(`${mainCsprojFile.name} found in listing but could not be downloaded.`);
            }
        }
    }

    // Add other key C# files (Program.cs, Startup.cs, appsettings.json, .sln)
    const programCsFile = filesList.find(f => f.name.toLowerCase() === 'program.cs');
    const startupCsFile = filesList.find(f => f.name.toLowerCase() === 'startup.cs');
    const appsettingsJsonFile = filesList.find(f => f.name.toLowerCase() === 'appsettings.json');

    if (programCsFile && !output.keyFiles?.find(kf => kf.filePath === programCsFile.name)) {
        output.keyFiles?.push({ filePath: programCsFile.name, type: 'entry_point', briefDescription: 'Main C# application entry point.' });
    }
    if (startupCsFile && !output.keyFiles?.find(kf => kf.filePath === startupCsFile.name)) {
        output.keyFiles?.push({ filePath: startupCsFile.name, type: 'configuration', briefDescription: 'ASP.NET Core startup configuration.' });
    }
    if (appsettingsJsonFile && !output.keyFiles?.find(kf => kf.filePath === appsettingsJsonFile.name)) {
        output.keyFiles?.push({ filePath: appsettingsJsonFile.name, type: 'configuration', briefDescription: 'Application settings file.' });
    }
    if (slnFile && !output.keyFiles?.find(kf => kf.filePath === slnFile.name)) { // slnFile was defined in C# identification part
        output.keyFiles?.push({ filePath: slnFile.name, type: 'manifest', briefDescription: 'Visual Studio Solution file.' });
    }

    // Refine for ASP.NET Core if C# project
    if (isCSharpProject) {
        let isAspNetCore = false;
        const nugetDependencies = output.dependencies?.nuget || [];
        if (nugetDependencies.some(dep => dep.toLowerCase().startsWith('microsoft.aspnetcore'))) {
            isAspNetCore = true;
        }
        // TODO: A more direct check if csprojContent was accessible here for Sdk="Microsoft.NET.Sdk.Web"

        if (isAspNetCore) {
            if (!output.inferredLanguagesFrameworks?.find(lang => lang.name === "ASP.NET Core")) {
                output.inferredLanguagesFrameworks?.push({ name: "ASP.NET Core", confidence: "high" });
            }
            if (!output.potentialArchitecturalComponents?.find(c => c.name.includes("ASP.NET Core"))) {
                const relatedCsFiles = [
                    csprojFiles.length > 0 ? csprojFiles[0].name : undefined,
                    programCsFile?.name,
                    startupCsFile?.name,
                    appsettingsJsonFile?.name
                ].filter(Boolean) as string[];
                output.potentialArchitecturalComponents?.push({
                    name: "ASP.NET Core Application",
                    type: "service",
                    relatedFiles: relatedCsFiles,
                });
            }
        }

        // Deeper C# source file analysis
        const cSharpSourceFiles = filesToAnalyze.filter(f => f.name.endsWith('.cs'));
        const MAX_CS_FILES_TO_PROCESS = 20;
        let processedCsFilesCount = 0;

        for (const csFile of cSharpSourceFiles) {
            if (processedCsFilesCount >= MAX_CS_FILES_TO_PROCESS) break;
            // Basic skip for common test project patterns or obj/bin folders
            if (csFile.name.toLowerCase().includes('/obj/') || csFile.name.toLowerCase().includes('/bin/') || csFile.name.toLowerCase().includes(".test")) {
                continue;
            }

            const fileContent = await getFileContent(csFile.name);
            if (fileContent) {
                const usings = extractCSharpUsings(fileContent);
                const namespace = extractCSharpNamespace(fileContent);
                const types = extractCSharpTypeNames(fileContent); // Array of {name, type}
                const members = extractCSharpPublicMembers(fileContent);

                const symbols = [
                    ...types.map(t => `${t.type}:${t.name}`),
                    ...members
                ];

                let detailsString = "";
                if (namespace) detailsString += `Namespace: ${namespace}\n`;
                if (usings.length > 0) detailsString += `Usings: ${usings.join(', ')}\n`;
                if (symbols.length > 0 && !detailsString.includes("Symbols:")) detailsString += `Symbols: ${symbols.join(', ')}`;


                let fileType: KeyFileSchema['type'] = 'utility'; // Default
                if (types.some(t => t.name.toLowerCase().includes('controller'))) fileType = 'service_definition'; // Likely a controller
                else if (types.some(t => t.type === 'interface' && t.name.startsWith('I') && t.name.endsWith('Service'))) fileType = 'service_definition';
                else if (types.some(t => t.type === 'class' && t.name.endsWith('Service'))) fileType = 'service_definition';
                else if (types.some(t => t.type === 'class' && t.name.endsWith('Model') || t.type === 'record')) fileType = 'model';
                else if (csFile.name.toLowerCase() === 'program.cs') fileType = 'entry_point';
                else if (csFile.name.toLowerCase() === 'startup.cs') fileType = 'configuration';

                const existingKf = output.keyFiles?.find(kf => kf.filePath === csFile.name);
                if (existingKf) {
                    existingKf.type = existingKf.type === 'unknown' ? fileType : existingKf.type;
                    existingKf.details = (existingKf.details ? `${existingKf.details}\n` : '') + detailsString.trim();
                    existingKf.extractedSymbols = [...new Set([...(existingKf.extractedSymbols || []), ...symbols])];
                    if (!existingKf.briefDescription?.includes("C# source file")) existingKf.briefDescription = (existingKf.briefDescription || "") + " C# source file.";

                } else {
                    output.keyFiles?.push({
                        filePath: csFile.name,
                        type: fileType,
                        briefDescription: `C# source file. ${symbols.length > 0 ? "Contains types/members." : ""} ${usings.length > 0 ? "Contains usings." : ""}`.trim(),
                        details: detailsString.trim() || undefined,
                        extractedSymbols: symbols.length > 0 ? symbols : undefined,
                    });
                }
                processedCsFilesCount++;
            } else {
                output.parsingErrors?.push(`Could not read content for C# source file: ${csFile.name}`);
            }
        }
    }

    // README processing (generic, should be towards the end to allow project name/version to be set first)
    const readmeFile = filesList.find(f => f.name.toLowerCase() === 'readme.md' || f.name.toLowerCase() === 'readme.rst');
    if (readmeFile) {
        // ... (README processing logic as before) ...
        const readmePath = input.projectStoragePath.endsWith('/') ? `${input.projectStoragePath}${readmeFile.name}` : `${input.projectStoragePath}/${readmeFile.name}`;
        const readmeContent = await downloadProjectFile(readmePath);
        if (readmeContent) {
            if (!output.keyFiles?.find(kf => kf.filePath === readmeFile.name)) {
                 output.keyFiles?.push({ filePath: readmeFile.name, type: "readme", briefDescription: "Project README file." });
            }
            const firstMeaningfulLine = readmeContent.split(/\r?\n/).find(line => line.trim().length > 0);
            if (firstMeaningfulLine) {
                const readmeSummary = firstMeaningfulLine.substring(0, 200) + (firstMeaningfulLine.length > 200 ? "..." : "");
                if (!output.projectSummary || output.projectSummary.startsWith("Version:") || output.projectSummary.startsWith("Basic analysis of project at") || output.projectSummary === input.userHint) {
                    output.projectSummary = readmeSummary;
                } else if (output.projectSummary && !output.projectSummary.includes(firstMeaningfulLine.substring(0,50))) {
                    output.projectSummary = `${output.projectSummary} | README: ${readmeSummary.substring(0,100)}${readmeSummary.length > 100 ? "..." : ""}`;
                }
            }
        } else if (readmeFile) {
             output.parsingErrors?.push(`${readmeFile.name} found in listing but could not be downloaded.`);
        }
    }

    // Fallback language detection if nothing specific was found
    if (output.inferredLanguagesFrameworks?.length === 0) {
        const fileExtensions = new Set(filesList.map(f => f.name.substring(f.name.lastIndexOf('.')).toLowerCase()).filter(Boolean));
        if (fileExtensions.has('.js') || fileExtensions.has('.ts')) output.inferredLanguagesFrameworks?.push({ name: "JavaScript/TypeScript", confidence: "low" });
        // Python, Java, C# initial detection based on file extensions or manifests already happened
        if (output.inferredLanguagesFrameworks?.length === 0) {
             output.inferredLanguagesFrameworks?.push({ name: "Unknown", confidence: "low" });
        }
    }

    if (!output.projectSummary || output.projectSummary === input.userHint) {
        output.projectSummary = `Basic analysis of project at ${input.projectStoragePath}. ${filesList.length} files/folders found at root.`;
    }

  } catch (error: any) {
    console.error("Error during project analysis:", error);
    output.parsingErrors?.push(`Top-level error during analysis: ${error.message}`);
  }

  return output;
=======
  const fileDetails = await supabaseFileFetcherTool.run({
    bucketName: BUCKET_NAME,
    filePath: input.projectStoragePath,
  });

  if (fileDetails.error || !fileDetails.fileName) {
    return {
      analyzedFileName: input.projectStoragePath.split('/').pop() || 'unknown_file',
      effectiveFileType: 'error',
      isBinary: false,
      analysisSummary: `Error fetching file: ${fileDetails.error || 'Unknown error from file fetcher.'}`,
      detailedNodes: [{ id: generateNodeId(fileSpecificPrefix, 'error', 'fetch'), label: 'File Fetch Error', type: 'error', details: fileDetails.error || 'Unknown error.' }],
      error: `File fetch failed: ${fileDetails.error}`,
    };
  }

  const { fileName, fileContent, fileBuffer, contentType, isBinary: fetchedIsBinary } = fileDetails; // Renamed to fetchedIsBinary
  const fileSize = fileBuffer?.length || fileContent?.length || 0;

  const effectiveFileType = determineEffectiveFileType(fileName, contentType, fetchedIsBinary);

  let analysisResult: { analysisSummary: string, detailedNodes: DetailedNode[], error?: string } =
    { analysisSummary: 'Analysis not performed.', detailedNodes: [], error: 'Initialization error' }; // Default init

  if (fetchedIsBinary && effectiveFileType !== 'binary') {
      console.warn(`[AnalyzerToolV2] File ${fileName} detected as binary by fetcher, but effective type is ${effectiveFileType}. Prioritizing binary status from fetcher.`);
      analysisResult = analyzeFallback(fileName, contentType, fileSize, input.userHint, generateNodeId, fileSpecificPrefix, fetchedIsBinary);
      analysisResult.analysisSummary = `Binary file '${fileName}' (${contentType}). Size: ${fileSize} bytes. ${input.userHint ? `Hint: ${input.userHint}` : ''}`;
  } else if (!fileContent && !fetchedIsBinary) { // No content for a non-binary file
      analysisResult = analyzeFallback(fileName, contentType, fileSize, input.userHint, generateNodeId, fileSpecificPrefix, fetchedIsBinary);
      analysisResult.analysisSummary = `Text file '${fileName}' (${contentType}) appears empty or content could not be read. Size: ${fileSize} bytes. ${input.userHint ? `Hint: ${input.userHint}` : ''}`;
  } else if (fileContent) { // Ensure fileContent is not null/undefined before passing to analyzers
    switch (effectiveFileType) {
      case 'package.json':
        analysisResult = analyzePackageJson(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        break;
      case 'generic.json':
        analysisResult = analyzeGenericJson(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        break;
      case 'markdown':
        analysisResult = analyzeMarkdown(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        break;
      case 'javascript':
        // analyzeJavaScriptAST is now async due to LLM calls
        analysisResult = await analyzeJavaScriptAST(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        break;
      case 'typescript':
        // analyzeTypeScriptAST is now async
        analysisResult = await analyzeTypeScriptAST(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        if (analysisResult.error && fileContent) { // Ensure fileContent is valid for fallback
          console.warn(`[AnalyzerToolV2] AST parsing failed for TypeScript file ${fileName}: ${analysisResult.error}. Falling back to regex.`);
          const fallbackResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'typescript', generateNodeId, fileSpecificPrefix); // Keep 'typescript' for fallback type
          analysisResult.analysisSummary = `TypeScript AST parsing failed: ${analysisResult.error}. --- Using Regex Fallback: ${fallbackResult.analysisSummary}`;
          analysisResult.detailedNodes = fallbackResult.detailedNodes; // Use fallback nodes
          analysisResult.error = `${analysisResult.error} (used regex fallback)`; // Append to error
        }
        break;
      case 'python':
        // analyzePythonAST is now async
        analysisResult = await analyzePythonAST(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        if (analysisResult.error && fileContent) {
            console.warn(`[AnalyzerToolV2] AST parsing failed for Python file ${fileName}: ${analysisResult.error}. Falling back to regex.`);
            const fallbackResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'python', generateNodeId, fileSpecificPrefix);
            analysisResult.analysisSummary = `Python AST parsing failed: ${analysisResult.error}. --- Using Regex Fallback: ${fallbackResult.analysisSummary}`;
            analysisResult.detailedNodes = fallbackResult.detailedNodes; // Use fallback nodes
            analysisResult.error = `${analysisResult.error} (used regex fallback)`; // Append to error
        }
        break;
      case 'text':
        analysisResult = analyzePlainText(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        break;
      case 'binary': // This case is reached if fetchedIsBinary is true AND effectiveType is also 'binary'
        analysisResult = analyzeFallback(fileName, contentType, fileSize, input.userHint, generateNodeId, fileSpecificPrefix, true); // Pass true for isFileBinary
        analysisResult.analysisSummary = `Binary file '${fileName}' (${contentType}). Size: ${fileSize} bytes. ${input.userHint ? `Hint: ${input.userHint}` : ''}`;
        break;
      default: // unknown
        analysisResult = analyzeFallback(fileName, contentType, fileSize, input.userHint, generateNodeId, fileSpecificPrefix, fetchedIsBinary);
    }
  } else if (fetchedIsBinary) { // Handles case where fileContent is null but it's a binary file
      analysisResult = analyzeFallback(fileName, contentType, fileSize, input.userHint, generateNodeId, fileSpecificPrefix, true);
      analysisResult.analysisSummary = `Binary file '${fileName}' (${contentType}). Size: ${fileSize} bytes. ${input.userHint ? `Hint: ${input.userHint}` : ''}`;
  }


  return {
    analyzedFileName: fileName,
    effectiveFileType,
    contentType,
    fileSize,
    isBinary: fetchedIsBinary,
    analysisSummary: analysisResult.analysisSummary,
    detailedNodes: analysisResult.detailedNodes,
    error: analysisResult.error,
  };
>>>>>>> master
}

export const projectStructureAnalyzerTool = ai.defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description: 'Fetches a project file from Supabase Storage and performs content analysis based on its determined file type (e.g., package.json, markdown, JS/TS (AST), Python (Regex), plain text, binary).',
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
  const folderPath = storagePath.endsWith('/') ? storagePath : `${storagePath}/`;
  const { data, error } = await supabase.storage
    .from('project_archives')
    .list(folderPath, { limit: 100, offset: 0 });
  if (error) {
    console.error(`Error listing files from Supabase Storage at path ${folderPath}:`, error);
    return [];
  }
  return data?.filter(file => file.name !== '.emptyFolderPlaceholder') || [];
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
    const match = trimmedLine.match(/^([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9._-]*[A-Za-z0-9])/);
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
function parsePomXml(content: string): { projectName?: string; version?: string; dependencies: string[] } {
  const result: { projectName?: string; version?: string; dependencies: string[] } = { dependencies: [] };
  let artifactIdMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<artifactId>\s*([^<]+)\s*<\/artifactId>/);
  if (artifactIdMatch && artifactIdMatch[1]) result.projectName = artifactIdMatch[1].trim();
  let versionMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<version>\s*([^<]+)\s*<\/version>/);
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  else {
    const parentVersionMatch = content.match(/<project(?:[^>]*)>[\s\S]*?<parent>\s*<version>\s*([^<]+)\s*<\/version>\s*<\/parent>/);
    if (parentVersionMatch && parentVersionMatch[1]) result.version = parentVersionMatch[1].trim();
  }
  const dependencyRegex = /<dependency>\s*<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>(?:\s*<version>([^<]+)<\/version>)?[\s\S]*?<\/dependency>/g;
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
function parseBuildGradle(content: string): { projectName?: string; version?: string; dependencies: string[] } {
  const result: { projectName?: string; version?: string; dependencies: string[] } = { dependencies: [] };
  const nameMatch = content.match(/(?:rootProject\.name|project\.name)\s*=\s*['"]([^'"]+)['"]/);
  if (nameMatch && nameMatch[1]) result.projectName = nameMatch[1].trim();
  const versionMatch = content.match(/^version\s*=\s*['"]([^'"]+)['"]/m);
  if (versionMatch && versionMatch[1]) result.version = versionMatch[1].trim();
  const depRegex = /(?:implementation|compile|api|compileOnly|runtimeOnly|testImplementation)\s*(?:\(([^)]+)\)|['"]([^'"]+)['"])/g;
  let depMatch;
  while ((depMatch = depRegex.exec(content)) !== null) {
    const depString = depMatch[1] || depMatch[2];
    if (depString) {
      const cleanedDepString = depString.replace(/['"]/g, '').trim();
      const parts = cleanedDepString.split(':');
      if (parts.length >= 2) { result.dependencies.push(`${parts[0].trim()}:${parts[1].trim()}`); continue; }
      const groupMatch = cleanedDepString.match(/group:\s*['"]([^'"]+)['"]/);
      const nameArtifactMatch = cleanedDepString.match(/name:\s*['"]([^'"]+)['"]/);
      if (groupMatch && groupMatch[1] && nameArtifactMatch && nameArtifactMatch[1]) { result.dependencies.push(`${groupMatch[1].trim()}:${nameArtifactMatch[1].trim()}`); continue; }
      const kotlinMatch = cleanedDepString.match(/^kotlin\s*\(\s*["']([^"']+)["']\s*\)/);
      if (kotlinMatch && kotlinMatch[1]) { result.dependencies.push(`org.jetbrains.kotlin:kotlin-${kotlinMatch[1].trim()}`); continue; }
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
function parseCsproj(content: string, csprojFileName: string): { projectName?: string; targetFramework?: string; dependencies: string[] } {
  const result: { projectName?: string; targetFramework?: string; dependencies: string[] } = { dependencies: [] };
  let assemblyNameMatch = content.match(/<AssemblyName>(.*?)<\/AssemblyName>/);
  if (assemblyNameMatch && assemblyNameMatch[1]) result.projectName = assemblyNameMatch[1].trim();
  else result.projectName = csprojFileName.replace(/\.csproj$/i, '');
  const targetFrameworkMatch = content.match(/<TargetFramework>(.*?)<\/TargetFramework>/);
  if (targetFrameworkMatch && targetFrameworkMatch[1]) result.targetFramework = targetFrameworkMatch[1].trim();
  else {
    const targetFrameworksMatch = content.match(/<TargetFrameworks>(.*?)<\/TargetFrameworks>/);
    if (targetFrameworksMatch && targetFrameworksMatch[1]) result.targetFramework = targetFrameworksMatch[1].trim().split(';')[0];
  }
  const packageRefRegex = /<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]+)")?\s*\/?>/g;
  let pkgMatch;
  while ((pkgMatch = packageRefRegex.exec(content)) !== null) {
    const packageName = pkgMatch[1].trim();
    const packageVersion = pkgMatch[2] ? pkgMatch[2].trim() : undefined;
    result.dependencies.push(packageVersion ? `${packageName} (${packageVersion})` : packageName);
  }
  result.dependencies = [...new Set(result.dependencies)];
  return result;
}

/**
 * Downloads a file as text from the 'project_archives' bucket.
 * @param fullFilePath The full path to the file in Supabase Storage, e.g., "user-id/project-id/package.json"
 * @returns A promise that resolves to the file content as a string, or null if an error occurs.
 */
async function downloadProjectFile(fullFilePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('project_archives')
    .download(fullFilePath);
  if (error) {
    console.error(`Error downloading file ${fullFilePath} from Supabase Storage:`, error);
    return null;
  }
  if (data) {
    try {
      return await data.text();
    } catch (textError) {
      console.error(`Error converting downloaded file ${fullFilePath} blob to text:`, textError);
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
async function downloadProjectFileAsBuffer(fullFilePath: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage
    .from('project_archives')
    .download(fullFilePath);

  if (error) {
    console.error(`Error downloading file ${fullFilePath} as buffer from Supabase Storage:`, error);
    return null;
  }
  if (data) {
    try {
      const arrayBuffer = await data.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (bufferError) {
      console.error(`Error converting downloaded file ${fullFilePath} blob to ArrayBuffer/Buffer:`, bufferError);
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
  try {
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    for (const zipEntry of zipEntries) {
      if (!zipEntry.isDirectory) {
        const isLikelyText = /\.(txt|json|md|xml|html|css|js|ts|py|java|cs|c|cpp|h|hpp|sh|yaml|yml|toml)$/i.test(zipEntry.entryName);
        try {
            const contentBuffer = zipEntry.getData();
            if (isLikelyText) {
                files.push({ name: zipEntry.entryName, content: contentBuffer.toString('utf8') });
            } else {
                files.push({ name: zipEntry.entryName, content: contentBuffer });
            }
        } catch (e: any) {
            const errorMsg = `Error reading data for zip entry ${zipEntry.entryName}: ${e.message || e}`;
            console.error(errorMsg);
            entryErrors.push(errorMsg);
        }
      }
    }
    return { files, entryErrors };
  } catch (error: any) {
    console.error("Critical error unpacking ZIP buffer:", error);
    entryErrors.push(`Critical ZIP unpacking error: ${error.message || error}`);
    // Return any files successfully processed before critical error, plus the errors.
    // If the error is in `new AdmZip(buffer)` itself, files will be empty.
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
  while ((match = requireRegex.exec(content)) !== null) { imports.add(match[1]); }
  const importRegex = /import\s+.*?from\s*['"]([^'"\n]+)['"]/g;
  while ((match = importRegex.exec(content)) !== null) { imports.add(match[1]); }
  const dynamicImportRegex = /import\s*\(\s*['"]([^'"\n]+)['"]\s*\)/g;
  while ((match = dynamicImportRegex.exec(content)) !== null) { imports.add(match[1]); }
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
    modules.forEach(mod => {
      const moduleName = mod.trim().split('.')[0].split(' as ')[0].trim();
      if (moduleName) imports.add(moduleName);
    });
  }

  // Matches: from module import name1, name2 as n2
  // Matches: from .relative_module import name
  // Matches: from ..another_relative import name
  const fromImportRegex = /^\s*from\s+([A-Za-z0-9_.]+|\.+[A-Za-z0-9_.]*)\s+import\s+/gm;
  while ((match = fromImportRegex.exec(content)) !== null) {
    const moduleName = match[1].trim().split('.')[0];
    if (moduleName && moduleName !== '.') {
        imports.add(moduleName.startsWith('.') ? moduleName.substring(1) : moduleName);
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
  const classRegex = /^\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:\((?:.|\n)*?\))?\s*:/gm;
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
  const funcRegex = /^\s*def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((?:.|\n)*?\)\s*:/gm;
  let match;
  while ((match = funcRegex.exec(content)) !== null) {
    const funcName = match[1];
    // Optional: Filter out private methods (e.g., _my_private_func) or magic methods
    if (!funcName.startsWith('_')) { // Simple filter for dunder/private methods
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
function extractCSharpTypeNames(content: string): Array<{name: string, type: 'class' | 'interface' | 'enum' | 'struct' | 'record'}> {
  const types = new Map<string, {name: string, type: 'class' | 'interface' | 'enum' | 'struct' | 'record'}>();
  // Regex to capture various type definitions (public, internal, etc.)
  // It captures the keyword (class, interface, etc.) and the name.
  // Adjusted to better handle generics and constraints, though full parsing is complex.
  const typeRegex = /^\s*(?:public|internal|private|protected)?\s*(?:static|abstract|sealed|partial)?\s*(class|interface|enum|struct|record)\s+([A-Za-z_][A-Za-z0-9_]*)(?:<[^>]+>)?(?:\s*:\s*[^\{]+)?\s*{?/gm;
  let match;
  while ((match = typeRegex.exec(content)) !== null) {
    const typeKind = match[1] as 'class' | 'interface' | 'enum' | 'struct' | 'record';
    const typeName = match[2];
    if (typeName && !types.has(typeName)) { // Ensure unique names, first declaration wins for simplicity
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
  const methodRegex = /^\s*(?:public|internal)\s+(?:static\s+|async\s+|virtual\s+|override\s+|sealed\s+)*([\w\<\>\?\[\]\.,\s]+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:<[^>]*>)?\s*\((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*\)\s*(?:where\s[^\{]+)?\s*(?:{|=>|;)/gm;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    // const returnType = match[1].trim(); // Captured but not used in the simplified signature for now
    const methodName = match[2].trim();
    if (methodName && !methodName.startsWith("get_") && !methodName.startsWith("set_")) { // Filter out property accessors
         // To keep it simple, we'll just add MethodName(...)
        members.add(`${methodName}(...)`);
    }
  }

  // Basic regex for public properties: public Type PropertyName { (get/set/init...); }
  // Simplified: captures name, assumes simple get/set.
  const propertyRegex = /^\s*(?:public|internal)\s+(?:static\s+|virtual\s+|override\s+|sealed\s+)*([\w\<\>\?\[\]\.,\s]+?)\s+([A-Za-z_][A-Za-z0-9_]*)\s*{\s*(?:(?:public|internal|protected|private)?\s*(?:get|set|init)\s*;\s*)+(?:=>)?/gm;
  while ((match = propertyRegex.exec(content)) !== null) {
    // const propertyType = match[1].trim(); // Captured but not used for now
    const propertyName = match[2].trim();
    if (propertyName) {
        members.add(`${propertyName} { get; set; }`); // Simplified representation
    }
  }

  return Array.from(members);
}
}