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
function analyzeJavaScriptAST(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): { analysisSummary: string, detailedNodes: DetailedNode[], error?: string } {
  const elements: ExtractedCodeElement[] = [];
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const detailedNodes: DetailedNode[] = [];
  let ast: acorn.Node | undefined;

  try {
    ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module', locations: true, comments: true });
  } catch (e: any) {
    return { error: `JS AST parsing failed: ${e.message}`, analysisSummary: `Failed to parse JS content: ${e.message}`, detailedNodes: [] };
  }

  // Comments are not easily associated with nodes in Acorn without extra logic
  // For now, comments are not passed to the summarizer from Acorn.

  const processAcornNode = async (node: any, type: 'function' | 'class', name: string, isExported: boolean, params?: any[], superClass?: string, methods?: any[]) => {
    const elementInfo: ExtractedCodeElement = {
      name,
      kind: type,
      isExported,
      startLine: node.loc?.start.line,
      endLine: node.loc?.end.line,
      params: params?.map((p: any) => ({ name: p.type === 'Identifier' ? p.name : (p.left?.name || '[pattern]') })), // Handle destructuring in params a bit
      superClass,
      // Acorn doesn't easily give full method signatures, so we'll pass names
      // classMethods: methods?.map((m: any) => m.key.name || '[unknown_method]'),
    };

    let semanticPurpose = "Semantic purpose not summarized.";
    try {
      const summarizerInput: SummarizeCodeElementInput = {
        elementType: type,
        elementName: name,
        filePath: fileName,
        signature: type === 'function' ? `(${elementInfo.params?.map(p => p.name).join(', ') || ''})` : (superClass ? `extends ${superClass}` : undefined),
        comments: undefined, // Acorn comment association is non-trivial
        isExported: isExported,
        classMethods: type === 'class' ? methods?.map((m:any) => m.key.name || '[unknown_method]') : undefined,
        classProperties: undefined, // Acorn property extraction is also more involved
      };
      const summaryResult = await summarizeCodeElementPurposeFlow.run(summarizerInput);
      if (summaryResult?.semanticSummary) {
        semanticPurpose = summaryResult.semanticSummary;
      }
    } catch (e: any) {
      console.warn(`[Acorn Analyzer] Error summarizing ${type} ${name} in ${fileName}: ${e.message}`);
      semanticPurpose = "Error during semantic summarization.";
    }

    elementInfo.semanticPurpose = semanticPurpose;
    const details = `${semanticPurpose}\nExported: ${isExported}. ${params ? `Params: ${params.map(p=>p.name).join(', ')}. ` : ''}${superClass ? `Extends: ${superClass}. ` : ''}${methods ? `Methods: ${methods.map(m=>m.key.name).join(', ')}` : ''}`;
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, detailedNodes.length),
      label: `${elementInfo.name} (${elementInfo.kind})`,
      type: `js_${elementInfo.kind}`,
      details,
      lineNumbers: elementInfo.startLine ? `${elementInfo.startLine}-${elementInfo.endLine}` : undefined,
      structuredInfo: elementInfo
    });
    elements.push(elementInfo); // Keep original elements array for summary count if needed
  };


  // Acorn walk is synchronous, so we collect promises and await them later.
  // However, defineFlow().run() is async.
  // For simplicity in this pass, we'll make the outer function async and await inside the walk.
  // This is generally not ideal for performance with acorn-walk but will work.
  // A better approach would be to collect all data first, then process summaries in a Promise.all.
  // Given the constraints, sequential await is used.

  const walkPromises: Promise<void>[] = [];

  acornWalk.simple(ast, {
    async FunctionDeclaration(node: any) {
      const isExported = node.parentNode?.type === 'ExportNamedDeclaration' || node.parentNode?.type === 'ExportDefaultDeclaration';
      await processAcornNode(node, 'function', node.id?.name || '[anonymous_func]', isExported, node.params);
    },
    async VariableDeclaration(node: any) {
      for (const declaration of node.declarations) {
        if (declaration.id?.name && (declaration.init?.type === 'ArrowFunctionExpression' || declaration.init?.type === 'FunctionExpression')) {
          const isExported = node.parentNode?.type === 'ExportNamedDeclaration';
          await processAcornNode(declaration, 'function', declaration.id.name, isExported, declaration.init.params);
        } else if (declaration.id?.name && node.kind && (node.parentNode?.type === 'Program' || node.parentNode?.type === 'ExportNamedDeclaration')) {
           // For non-function variables, we don't call the summarizer currently, just list them.
           const simpleVarElement = { name: declaration.id.name, kind: 'variable', isExported: node.parentNode?.type === 'ExportNamedDeclaration', startLine: node.loc?.start.line, endLine: node.loc?.end.line };
           elements.push(simpleVarElement);
           detailedNodes.push({
              id: generateNodeId(fileSpecificPrefix, 'variable', simpleVarElement.name, detailedNodes.length),
              label: `${simpleVarElement.name} (variable)`,
              type: 'js_variable',
              details: `Exported: ${simpleVarElement.isExported}`,
              lineNumbers: simpleVarElement.startLine ? `${simpleVarElement.startLine}-${simpleVarElement.endLine}` : undefined,
              structuredInfo: simpleVarElement
           });
        }
      }
    },
    async ClassDeclaration(node: any) {
      const isExported = node.parentNode?.type === 'ExportNamedDeclaration' || node.parentNode?.type === 'ExportDefaultDeclaration';
      const methods = node.body.body.filter((item:any) => item.type === 'MethodDefinition');
      await processAcornNode(node, 'class', node.id?.name || '[anonymous_class]', isExported, undefined, node.superClass?.name, methods);
    },
    ImportDeclaration(node: any) { // Synchronous processing for imports/exports
      imports.push({ source: node.source.value, specifiers: node.specifiers.map((s: any) => ({ importedName: s.imported?.name, localName: s.local.name, isDefault: s.type === 'ImportDefaultSpecifier', isNamespace: s.type === 'ImportNamespaceSpecifier'})), startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportNamedDeclaration(node: any) { // Synchronous
      let names: string[] = [];
      if (node.declaration) {
        if (node.declaration.id) names.push(node.declaration.id.name);
        else if (node.declaration.declarations) names = node.declaration.declarations.map((d:any) => d.id.name);
      } else if (node.specifiers) {
        names = node.specifiers.map((s:any) => s.exported.name);
      }
      exports.push({ type: 'named', names, source: node.source?.value, startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportDefaultDeclaration(node: any) { // Synchronous
      exports.push({ type: 'default', declarationType: node.declaration.type, names: [node.declaration.id?.name || (node.declaration.type === 'Identifier' ? node.declaration.name : '[anonymous_default]')], startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    },
    ExportAllDeclaration(node: any) { // Synchronous
      exports.push({ type: 'all', source: node.source.value, startLine: node.loc?.start.line, endLine: node.loc?.end.line });
    }
  }, (ast as any)); // Cast to any to allow acorn-walk to work with its internal typings for Node

  // Populate imports and exports into detailedNodes (synchronously, as they don't call LLM)
  imports.forEach((imp, i) => detailedNodes.push({ id: generateNodeId(fileSpecificPrefix, 'import', imp.source, i), label: `Import from '${imp.source}'`, type: 'js_import', details: imp.specifiers.map(s => s.localName + (s.importedName && s.importedName !== s.localName ? ` as ${s.importedName}` : '')).join(', '), lineNumbers: imp.startLine ? `${imp.startLine}-${imp.endLine}`: undefined, structuredInfo: imp }));
  exports.forEach((exp, i) => detailedNodes.push({ id: generateNodeId(fileSpecificPrefix, 'export', exp.type, i), label: `Export ${exp.type}`, type: `js_export_${exp.type}`, details: exp.names?.join(', ') || (exp.source ? `* from ${exp.source}`: exp.declarationType), lineNumbers: exp.startLine ? `${exp.startLine}-${exp.endLine}`: undefined, structuredInfo: exp }));

  const summary = `JavaScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function').length} functions, ${elements.filter(e=>e.kind==='class').length} classes, ${imports.length} imports, ${exports.length} exports, and ${elements.filter(e=>e.kind==='variable').length} top-level variables. Semantic summaries attempted for functions/classes.`;
  return { analysisSummary: summary, detailedNodes };
}

// --- TypeScript AST Analysis ---
// Make the function async to use await for summarizeCodeElementPurposeFlow
async function analyzeTypeScriptAST(fileName: string, fileContent: string, generateNodeId: Function, fileSpecificPrefix: string): Promise<{ analysisSummary: string, detailedNodes: DetailedNode[], error?: string }> {
  const elements: ExtractedCodeElement[] = [];
  const imports: ExtractedImport[] = [];
  const exports: ExtractedExport[] = [];
  const detailedNodes: DetailedNode[] = []; // Initialize detailedNodes here

  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, fileContent, ts.ScriptTarget.Latest, true, scriptKind);

  const diagnostics = [...sourceFile.syntacticDiagnostics, ...sourceFile.semanticDiagnostics];
  if (diagnostics.length > 0) {
    const errorMsg = "TypeScript AST parsing/binding produced diagnostics: " + diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; ");
    console.warn(`[TS AST Analyzer] Diagnostics for ${fileName}: ${errorMsg}`);
    return { error: errorMsg, analysisSummary: `Failed to fully parse TS: ${errorMsg}`, detailedNodes:[] };
  }

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

  async function visitNode(node: ts.Node) {
    const startLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const lineNumbers = `${startLine}-${endLine}`;
    const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
    const isExported = modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
    const isDefaultExport = modifiers?.some(mod => mod.kind === ts.SyntaxKind.DefaultKeyword) && isExported;
    const comments = getJSDocComments(node, sourceFile);

    let elementInfo: ExtractedCodeElement | null = null;
    let summarizerInput: SummarizeCodeElementInput | null = null;
    let nodeTypeForSummarizer: 'function' | 'class' | undefined = undefined;

    if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
      nodeTypeForSummarizer = 'function';
      const name = node.name?.getText(sourceFile) || (ts.isMethodDeclaration(node) ? '[constructor_or_method]' : '[anonymous_func]');
      const params = node.parameters.map(p => ({ name: p.name.getText(sourceFile), type: p.type?.getText(sourceFile) }));
      const returnType = node.type?.getText(sourceFile);
      elementInfo = { name, kind: ts.isMethodDeclaration(node) ? 'method' : 'function', params, returnType, isAsync: modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword), isExported, isDefaultExport, startLine, endLine, comments };

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

      elementInfo = { name, kind: 'class', superClass, implementedInterfaces, isExported, isDefaultExport, startLine, endLine, comments, classMethods, classProperties };

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
      elementInfo = { name: node.name.getText(sourceFile), kind, isExported, isDefaultExport, startLine, endLine, comments };
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
                 let varSignatureForSummarizer: string | undefined;

                 if (varInitializer && (ts.isArrowFunction(varInitializer) || ts.isFunctionExpression(varInitializer))) {
                    varKind = 'function'; // Treat arrow functions/function expressions assigned to vars as functions
                    nodeTypeForSummarizer = 'function';
                    varParams = varInitializer.parameters.map(p => ({ name: p.name.getText(sourceFile), type: p.type?.getText(sourceFile) }));
                    varReturnType = varInitializer.type?.getText(sourceFile);
                    varSignatureForSummarizer = `(${varParams.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ')})` + (varReturnType ? `: ${varReturnType}` : '');
                 }

                 elementInfo = { name: varName, kind: varKind, dataType: varType, value: varInitializer?.getText(sourceFile).substring(0,50), isExported: isVarExported, startLine, endLine, comments, params: varParams, returnType: varReturnType };

                 if (nodeTypeForSummarizer === 'function') {
                     summarizerInput = {
                        elementType: 'function',
                        elementName: varName,
                        signature: varSignatureForSummarizer,
                        filePath: fileName,
                        comments,
                        isExported: isVarExported,
                     };
                 } else {
                    // For non-function variables, no summarizer call yet
                    summarizerInput = null;
                 }
            }
            if (elementInfo) break; // Process first declaration for now if it's a multi-declaration
        }
    }


    if (elementInfo) {
      let semanticPurpose = "Semantic purpose not summarized.";
      if (summarizerInput && (nodeTypeForSummarizer === 'function' || nodeTypeForSummarizer === 'class')) {
        try {
          const summaryResult = await summarizeCodeElementPurposeFlow.run(summarizerInput);
          if (summaryResult?.semanticSummary) {
            semanticPurpose = summaryResult.semanticSummary;
          }
        } catch (e: any) {
          console.warn(`[TS AST Analyzer] Error summarizing ${summarizerInput.elementType} ${summarizerInput.elementName} in ${fileName}: ${e.message}`);
          semanticPurpose = "Error during semantic summarization.";
        }
      }
      elementInfo.semanticPurpose = semanticPurpose;
      elements.push(elementInfo); // Add to overall elements list

      let details = `${semanticPurpose}\n`;
      details += `${elementInfo.isExported ? (elementInfo.isDefaultExport ? 'Default Export. ' : 'Exported. ') : 'Not Exported. '}`;
      if (elementInfo.kind === 'function' || elementInfo.kind === 'method') {
        details += `${elementInfo.params ? `Params: ${elementInfo.params.map(p=>`${p.name}${p.type ? `: ${p.type}`:''}`).join(', ')}. ` : ''}`;
        details += `${elementInfo.returnType ? `Returns: ${elementInfo.returnType}. ` : ''}`;
      } else if (elementInfo.kind === 'class') {
        details += `${elementInfo.superClass ? `Extends: ${elementInfo.superClass}. ` : ''}`;
        details += `${elementInfo.implementedInterfaces ? `Implements: ${elementInfo.implementedInterfaces.join(', ')}. ` : ''}`;
        // classMethods and classProperties are already in structuredInfo, could add brief mention here if desired
      }
      details += `Comments: ${elementInfo.comments ? 'Available (see structuredInfo)' : 'None'}.`;

      detailedNodes.push({
        id: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, detailedNodes.length),
        label: `${elementInfo.name} (${elementInfo.kind})`,
        type: `ts_${elementInfo.kind}`,
        details: details.trim(),
        lineNumbers: `${elementInfo.startLine}-${elementInfo.endLine}`,
        structuredInfo: elementInfo
      });
    } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      // ... (import processing, unchanged, synchronous)
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
      detailedNodes.push({ id: generateNodeId(fileSpecificPrefix, 'import', node.moduleSpecifier.text, detailedNodes.length), label: `Import from '${node.moduleSpecifier.text}'`, type: 'ts_import', details: specifiers.map(s => s.localName + (s.importedName && s.importedName !== s.localName ? ` as ${s.importedName}` : '')).join(', '), lineNumbers, structuredInfo: { source: node.moduleSpecifier.text, specifiers, startLine, endLine } });
    } else if (ts.isExportDeclaration(node)) {
      // ... (export processing, unchanged, synchronous)
      const names = node.exportClause && ts.isNamedExports(node.exportClause) ? node.exportClause.elements.map(el => el.name.text) : undefined;
      exports.push({ type: 'named', names, source: node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, startLine, endLine });
      detailedNodes.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'named', detailedNodes.length), label: `Export ${names?.join(', ') || '*'}`, type: 'ts_export_named', details: `Source: ${node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : 'local'}`, lineNumbers, structuredInfo: { type: 'named', names, source: node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, startLine, endLine } });
    } else if (ts.isExportAssignment(node)) { // export default ...
      // ... (export assignment processing, unchanged, synchronous)
      exports.push({ type: 'default', names: [node.expression.getText(sourceFile).substring(0,50)], startLine, endLine });
      detailedNodes.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'default', detailedNodes.length), label: `Export Default`, type: 'ts_export_default', details: node.expression.getText(sourceFile).substring(0,100), lineNumbers, structuredInfo: { type: 'default', expression: node.expression.getText(sourceFile), startLine, endLine } });
    }

    // Original: ts.forEachChild(node, visitNode);
    // New: Iterate over children and await if visitNode is async
    for (const child of node.getChildren(sourceFile)) {
        await visitNode(child);
    }
  }

  await visitNode(sourceFile); // Make the initial call awaitable

  const summary = `TypeScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function'||e.kind==='method').length} functions/methods, ${elements.filter(e=>e.kind==='class').length} classes, ${elements.filter(e=>e.kind==='interface').length} interfaces, ${imports.length} imports, ${exports.length} exports. Semantic summaries attempted.`;
  return { analysisSummary: summary, detailedNodes };
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
          analysisResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'typescript', generateNodeId, fileSpecificPrefix);
          analysisResult.analysisSummary = `TypeScript AST parsing failed: ${tsAstResult.error}. --- Using Regex Fallback: ${analysisResult.analysisSummary}`;
        } else {
          analysisResult = tsAstResult;
        }
        break;
      case 'python':
        analysisResult = analyzeSourceCodeRegexFallback(fileName, fileContent, 'python', generateNodeId, fileSpecificPrefix);
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
