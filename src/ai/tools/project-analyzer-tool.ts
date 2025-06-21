/**
 * @fileOverview A Genkit tool to analyze project structure.
 * Fetches a file from Supabase Storage and performs content analysis based on file type,
 * including AST-based analysis for JavaScript and TypeScript.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { supabaseFileFetcherTool } from './supabase-file-fetcher-tool';
import { summarizeCodeElementPurposeFlow, SummarizeCodeElementInput } from '@/ai/flows';
import path from 'path';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import * as ts from 'typescript';
import { parse as pythonParse } from 'python-parser'; // Assuming this is the correct import

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

// Output schema updated for more structured analysis results
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
function getPyNodeText(pyAstNode: any, fileContent: string): string {
  // python-parser nodes often have 'start' and 'end' properties for raw offsets
  if (pyAstNode && pyAstNode.start !== undefined && pyAstNode.end !== undefined) {
    return fileContent.substring(pyAstNode.start, pyAstNode.end);
  }
  if (pyAstNode && pyAstNode.name) return pyAstNode.name; // For simple names
  if (pyAstNode && pyAstNode.id) return pyAstNode.id; // For identifiers
  // Add more specific cases if needed based on library's AST structure for e.g. dotted names
  return '[unknown_py_node_text]';
}

function analyzePythonAST(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[], error?: string } {
  const extractedFunctions: ExtractedCodeElement[] = [];
  const extractedClasses: Array<ExtractedCodeElement & { methods: ExtractedCodeElement[] }> = [];
  const extractedImports: Array<{ type: string, source?: string, names: Array<{name: string, asName?: string}>, level?: number, lineNumbers?: string }> = [];
  const detailedNodes: DetailedNode[] = [];

  let ast;
  try {
    ast = pythonParse(fileContent);
  } catch (e: any) {
    return { error: 'Python AST parsing failed: ' + e.message, analysisSummary: 'Failed to parse Python content.', detailedNodes: [] };
  }

  // Helper to get line numbers if available (structure might vary)
  const getLineInfo = (node: any) => node.lineno ? `${node.lineno}${node.end_lineno ? `-${node.end_lineno}` : ''}`: undefined;


  function visitPyNode(node: any, currentClassName?: string) {
    if (!node) return;

    const nodeType = node.type; // Assuming 'type' field exists, similar to Python's 'ast' module

    if (nodeType === 'FunctionDef' || nodeType === 'AsyncFunctionDef') {
      const funcName = node.name;
      const params = node.args?.args?.map((arg: any) => ({
        name: arg.arg,
        annotation: arg.annotation ? getPyNodeText(arg.annotation, fileContent) : undefined
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
        endLine: node.end_lineno || node.lineno, // end_lineno might not always be present
        parentName: currentClassName,
        isAsync: nodeType === 'AsyncFunctionDef',
      };

      if (currentClassName) {
        const classObj = extractedClasses.find(c => c.name === currentClassName);
        classObj?.methods.push(funcData);
      } else {
        extractedFunctions.push(funcData);
      }
      // Don't recurse into body of functions yet for this pass, focus on top-level structures
    } else if (nodeType === 'ClassDef') {
      const className = node.name;
      const bases = node.bases?.map((b: any) => getPyNodeText(b, fileContent)) || [];
      const decorators = node.decorator_list?.map((d: any) => getPyNodeText(d, fileContent)) || [];
      let docstring: string | undefined = undefined;
      if (node.body && node.body.length > 0 && node.body[0].type === 'Expr' && node.body[0].value?.type === 'Constant' && typeof node.body[0].value.value === 'string') {
        docstring = node.body[0].value.value;
      }

      const classData: ExtractedCodeElement & { methods: ExtractedCodeElement[] } = {
        name: className,
        kind: 'class',
        superClass: bases.join(', '), // Simple representation
        decorators,
        comments: docstring,
        startLine: node.lineno,
        endLine: node.end_lineno || node.lineno,
        methods: [],
      };
      extractedClasses.push(classData);
      node.body?.forEach((child: any) => visitPyNode(child, className)); // Visit children to find methods
    } else if (nodeType === 'Import') {
      const names = node.names?.map((alias: any) => ({ name: alias.name, asName: alias.asname })) || [];
      extractedImports.push({ type: 'Import', names, lineNumbers: getLineInfo(node) });
    } else if (nodeType === 'ImportFrom') {
      const moduleName = node.module || '';
      const names = node.names?.map((alias: any) => ({ name: alias.name, asName: alias.asname })) || [];
      extractedImports.push({ type: 'ImportFrom', source: moduleName, names, level: node.level, lineNumbers: getLineInfo(node) });
    } else if (Array.isArray(node)) { // Some parsers return list of statements for body
        node.forEach(child => visitPyNode(child, currentClassName));
    } else if (node.body && Array.isArray(node.body)) { // For Module node or other block nodes
        node.body.forEach((child: any) => visitPyNode(child, currentClassName));
    }
     // Add other specific node types if needed: If, For, While, Try, With (if they have 'body')
  }

  if (ast && ast.type === 'Module' && Array.isArray(ast.body)) {
    ast.body.forEach((node: any) => visitPyNode(node));
  } else if (ast) { // Fallback if root is not Module or body is not array (depends on parser specifics)
    visitPyNode(ast);
  }

  // Format detailedNodes
  extractedFunctions.forEach((func, i) => {
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, func.kind, func.name, i),
      label: `${func.name} (${func.kind})`,
      type: `py_${func.kind}`,
      details: `Params: ${func.params?.map(p => `${p.name}${p.annotation ? `:${p.annotation}`:''}`).join(', ') || '()'}\nDecorators: ${func.decorators?.join(', ') || 'None'}\nDocstring: ${func.comments || 'None'}`,
      lineNumbers: `${func.startLine}-${func.endLine}`,
      structuredInfo: func,
    });
  });

  extractedClasses.forEach((cls, i) => {
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, 'class', cls.name, i),
      label: `${cls.name} (class)`,
      type: 'py_class',
      details: `Bases: ${cls.superClass || 'object'}\nDecorators: ${cls.decorators?.join(', ') || 'None'}\nMethods: ${cls.methods.map(m => m.name).join(', ') || 'None'}\nDocstring: ${cls.comments || 'None'}`,
      lineNumbers: `${cls.startLine}-${cls.endLine}`,
      structuredInfo: cls,
    });
    // Optionally, create separate nodes for methods if desired, or keep them nested in class structuredInfo
  });

  extractedImports.forEach((imp, i) => {
    const importLabel = imp.type === 'ImportFrom' ? `From ${imp.source || '.'} import ${imp.names.map(n => n.name + (n.asName ? ` as ${n.asName}`:'')).join(', ')}` : `Import ${imp.names.map(n => n.name + (n.asName ? ` as ${n.asName}`:'')).join(', ')}`;
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, 'import', (imp.source || imp.names[0]?.name || 'module'), i),
      label: importLabel.substring(0, 100) + (importLabel.length > 100 ? '...' : ''), // Truncate long import labels
      type: 'py_import',
      details: importLabel,
      lineNumbers: imp.lineNumbers,
      structuredInfo: imp,
    });
  });

  const analysisSummary = `Python file '${fileName}' (AST analysis): Found ${extractedFunctions.length} functions, ${extractedClasses.length} classes, and ${extractedImports.length} import statements.`;
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

async function analyzeProjectStructure(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  console.log(`[AnalyzerToolV2] Path: ${input.projectStoragePath}, Hint: ${input.userHint}`);
  const BUCKET_NAME = "project_archives";
  const fileSpecificPrefix = (input.projectStoragePath.split('/').pop() || 'file').replace(/[^a-zA-Z0-9_]/g, '_');

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
        const tsAstResult = await analyzeTypeScriptAST(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        if (tsAstResult.error && fileContent) { // Ensure fileContent is valid for fallback
          console.warn(`[AnalyzerToolV2] AST parsing failed for TypeScript file ${fileName}: ${tsAstResult.error}. Falling back to regex.`);
          analysisResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'typescript', generateNodeId, fileSpecificPrefix); // Keep 'typescript' for fallback type
          analysisResult.analysisSummary = `TypeScript AST parsing failed: ${tsAstResult.error}. --- Using Regex Fallback: ${analysisResult.analysisSummary}`;
        } else {
          analysisResult = tsAstResult;
        }
        break;
      case 'python':
        // Call the new Python AST analyzer
        const pyAstResult = analyzePythonAST(fileName, fileContent, generateNodeId, fileSpecificPrefix);
        if (pyAstResult.error && fileContent) {
            console.warn(`[AnalyzerToolV2] AST parsing failed for Python file ${fileName}: ${pyAstResult.error}. Falling back to regex.`);
            analysisResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'python', generateNodeId, fileSpecificPrefix);
            analysisResult.analysisSummary = `Python AST parsing failed: ${pyAstResult.error}. --- Using Regex Fallback: ${analysisResult.analysisSummary}`;
        } else {
            analysisResult = pyAstResult;
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
