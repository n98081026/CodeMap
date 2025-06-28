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
import {
  batchSummarizeElements,
  createDetailedNodeFromExtractedElement,
  SummarizationTaskInfo // This is an interface, so type-only import is fine
} from './ast-utils';
import { summarizeGenericFileFlow } from '../flows/summarize-generic-file-flow'; // Import the new flow

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

// Exporting for use in ast-utils
export { DetailedNodeOutputSchema as DetailedNodeSchema }; // Keep original export too for compatibility if needed

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
    'entry_point',      // e.g., main.js, Program.cs, app.py
    'configuration',    // Generic config files not covered by more specific types
    'service_definition',// e.g., files defining services, controllers, or API endpoints
    'ui_component',     // e.g., React components, Vue components
    'model',            // e.g., data models, entities, DTOs
    'utility',          // Helper scripts, utility functions
    'readme',           // README.md files
    'manifest',         // General manifest (e.g. package.json, requirements.txt, pom.xml, .csproj)
    'dockerfile',       // Dockerfile
    'docker_compose_config', // docker-compose.yml
    'cicd_script_yaml', // Generic CI/CD YAML files
    'github_workflow_yaml', // GitHub Actions workflows
    'gitlab_ci_yaml',   // GitLab CI configurations
    'shell_script',     // .sh, .bash files
    'env_config',       // .env files
    'xml_config',       // Generic XML configuration files
    'pom_xml',          // pom.xml (Maven)
    'csproj_file',      // .csproj (C# project)
    'gradle_script',    // build.gradle, build.gradle.kts
    'text_config',      // .properties, .ini, .toml
    'html',             // HTML files
    'css',              // CSS, SCSS, LESS files
    'source_code_js',   // JavaScript source files (if not fitting a more specific role)
    'source_code_ts',   // TypeScript source files (if not fitting a more specific role)
    'source_code_py',   // Python source files (if not fitting a more specific role)
    'source_code_java', // Java source files
    'source_code_cs',   // C# source files
    'generic_json',     // Other JSON files not package.json
    'generic_text',     // Other generic text files
    'binary_data',      // Identified binary files
    'unknown'           // Default for unrecognized files
  ]).describe('Type of the key file.'),
  extractedSymbols: z.array(z.string()).optional().describe('Names of primary declarations (classes, functions, components) for source code files.'),
  briefDescription: z.string().optional().nullable().describe('Brief description of the file or its role (e.g., Handles user authentication endpoints, Main application entry point).'),
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

// Output schema updated for more structured analysis results
export const ProjectAnalysisOutputSchema = z.object({
  projectName: z.string().optional().describe("Name of the project, potentially derived from manifest files or user input."),
  inferredLanguagesFrameworks: z.array(z.object({ name: z.string(), confidence: z.string() })).optional().describe("List of inferred programming languages and frameworks used."),
  projectSummary: z.string().optional().describe("A brief summary of the project, potentially from README or user hints."),
  dependencies: DependencyMapSchema.optional().describe("Map of dependency types to their names."),
  directoryStructureSummary: z.array(DirectorySummarySchema).optional().describe("Summary of the project's directory structure."),
  keyFiles: z.array(KeyFileSchema).optional().describe("Information about key files identified in the project."),
  potentialArchitecturalComponents: z.array(PotentialArchitecturalComponentSchema).optional().describe("Inferred architectural components."),

  // Fields from the original simpler schema, kept for compatibility or direct use where applicable
  analyzedFileName: z.string().describe("The name of the file or archive that was analyzed."),
  effectiveFileType: z.string().optional().describe("The determined effective type of the analyzed file (e.g., 'zip', 'javascript', 'python')."), // Made optional as it might be part of keyFiles for single file analysis
  contentType: z.string().optional().describe("Original content type of the file, if available."),
  fileSize: z.number().optional().describe("Size of the file in bytes, if available."),
  isBinary: z.boolean().optional().describe("Flag indicating if the primary analyzed input was binary."), // Made optional
  analysisSummary: z.string().optional().describe("Overall summary of the analysis process or findings for the root file/archive. Specific summaries are in keyFiles."), // Made optional as projectSummary might be primary
  detailedNodes: z.array(DetailedNodeOutputSchema).optional().describe("Detailed nodes extracted from AST analysis of specific files (can be extensive)."), // This might be better associated with individual keyFiles in the future

  parsingErrors: z.array(z.string()).optional().describe("List of errors encountered during parsing or analysis."),
  // error field from original schema is effectively replaced by parsingErrors array
});
export type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

// Define a detailed, fixed mock project analysis output (remains for testing/hints)
// This mock needs to be updated to fit the new comprehensive schema.
const FIXED_MOCK_PROJECT_A_ANALYSIS: ProjectAnalysisOutput = {
  projectName: "Mock E-Commerce API",
  inferredLanguagesFrameworks: [{ name: "Node.js", confidence: "high" }, { name: "JavaScript", confidence: "high" }],
  projectSummary: "This is a fixed mock analysis for a standard E-Commerce API project. It includes typical components like User Service, Product Service, Order Service, and a Payment Gateway integration.",
  dependencies: { npm: ["express", "lodash", "jsonwebtoken"] },
  directoryStructureSummary: [
    { path: "src", fileCounts: { ".js": 20 }, inferredPurpose: "Source Code" },
    { path: "src/services", fileCounts: { ".js": 4 }, inferredPurpose: "Service Layer" },
    { path: "tests", fileCounts: { ".js": 10 }, inferredPurpose: "Tests" },
  ],
  keyFiles: [
    { filePath: "src/services/UserService.js", type: "service_definition", briefDescription: "Handles user authentication and profile management.", extractedSymbols: ["UserService", "login", "register"] },
    { filePath: "src/services/ProductService.js", type: "service_definition", briefDescription: "Manages product catalog and inventory.", extractedSymbols: ["ProductService", "listProducts"] },
    { filePath: "package.json", type: "manifest", briefDescription: "Node.js project manifest."}
  ],
  potentialArchitecturalComponents: [
    { name: "User Service Component", type: "service", relatedFiles: ["src/services/UserService.js"] },
    { name: "Product Service Component", type: "service", relatedFiles: ["src/services/ProductService.js"] },
  ],
  analyzedFileName: "mock-ecommerce-api.zip",
  effectiveFileType: "zip",
  contentType: "application/zip",
  fileSize: 123456,
  isBinary: true, // ZIP is binary
  analysisSummary: "Mock analysis completed for mock-ecommerce-api.zip.", // More generic summary here
  detailedNodes: [ // This detailedNodes might be redundant if keyFiles contain AST summaries, or could be for the entry point.
    // For simplicity, let's keep it similar to before, but it should ideally map to a specific file's AST.
    // These are now more illustrative of what might come from a specific file's AST analysis if included at top level.
    // In the new structure, these would typically be part of a KeyFile's details or a dedicated AST output field within a KeyFile.
    // For the mock, we'll assume they are general illustrative nodes.
    {
      id: "mock_service_user_class", // Changed ID to reflect it's about the class itself
      label: "UserService (class from UserService.js)", // Made label more specific
      type: "js_class",
      details: "Handles user authentication and profile management. (Mock Detail)",
      lineNumbers: "20-80",
      structuredInfo: { name: "UserService", kind: "class", methods: ["login", "register", "getProfile"] },
    },
    {
      id: "mock_service_product_class",
      label: "ProductService (class from ProductService.js)",
      type: "js_class",
      details: "Manages product catalog and inventory. (Mock Detail)",
      lineNumbers: "81-150",
      structuredInfo: { name: "ProductService", kind: "class", methods: ["listProducts", "addProduct", "removeProduct"] },
    }
  ],
  parsingErrors: [],
};

const generateNodeId = (fileSpecificPrefix: string, nodeType: string, nodeName: string, index?: number): string => {
  const saneName = nodeName.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 25);
  return `${fileSpecificPrefix}_${nodeType}_${saneName}${index !== undefined ? `_${index}` : ''}`.toLowerCase();
};

type EffectiveFileType =
  'package.json' | 'generic.json' | 'markdown' |
  'javascript' | 'typescript' | 'python' |
  'dockerfile' | 'docker_compose_config' |
  'cicd_script_yaml' | 'github_workflow_yaml' | 'gitlab_ci_yaml' |
  'shell_script' | 'env_config' |
  'xml_config' | 'pom_xml' | 'csproj_file' | 'gradle_script' |
  'text_config' | // For .properties, .ini, .toml
  'html' | 'css' | 'text' |
  'binary' | 'unknown';

function determineEffectiveFileType(fileName: string, contentType?: string, isBinary?: boolean, filePath?: string): EffectiveFileType {
  const lowerFileName = fileName.toLowerCase();
  const lowerFilePath = filePath?.toLowerCase() || lowerFileName;

  // Order matters: more specific checks first
  if (lowerFileName === 'package.json') return 'package.json';
  if (lowerFileName === 'pom.xml') return 'pom_xml';
  if (lowerFileName.endsWith('.csproj')) return 'csproj_file';
  if (lowerFileName === 'build.gradle' || lowerFileName === 'build.gradle.kts') return 'gradle_script';
  if (lowerFileName === 'dockerfile' || lowerFileName.startsWith('dockerfile.')) return 'dockerfile';
  if (lowerFileName === 'docker-compose.yml' || lowerFileName === 'docker-compose.yaml') return 'docker_compose_config';

  if (lowerFilePath.includes('.github/workflows/') && (lowerFileName.endsWith('.yml') || lowerFileName.endsWith('.yaml'))) return 'github_workflow_yaml';
  if (lowerFileName === '.gitlab-ci.yml' || lowerFileName === '.gitlab-ci.yaml') return 'gitlab_ci_yaml';
  if ((lowerFileName.endsWith('.yml') || lowerFileName.endsWith('.yaml')) && (lowerFileName.includes('ci') || lowerFileName.includes('cd') || lowerFileName.includes('pipeline'))) return 'cicd_script_yaml';

  if (lowerFileName.endsWith('.json')) return 'generic.json';
  if (lowerFileName.endsWith('.md') || lowerFileName.endsWith('.markdown')) return 'markdown';
  if (lowerFileName.endsWith('.js') || lowerFileName.endsWith('.mjs') || lowerFileName.endsWith('.cjs')) return 'javascript';
  if (lowerFileName.endsWith('.ts') || lowerFileName.endsWith('.tsx') || lowerFileName.endsWith('.mts') || lowerFileName.endsWith('.cts')) return 'typescript';
  if (lowerFileName.endsWith('.py')) return 'python';
  if (lowerFileName.endsWith('.sh') || lowerFileName.endsWith('.bash') || lowerFileName.endsWith('.zsh')) return 'shell_script';
  if (lowerFileName.startsWith('.env') || lowerFileName.endsWith('.env')) return 'env_config';
  if (lowerFileName.endsWith('.xml')) return 'xml_config'; // Generic XML, specific ones like pom.xml caught earlier
  if (lowerFileName.endsWith('.properties') || lowerFileName.endsWith('.ini') || lowerFileName.endsWith('.toml')) return 'text_config';
  if (lowerFileName.endsWith('.html') || lowerFileName.endsWith('.htm')) return 'html';
  if (lowerFileName.endsWith('.css') || lowerFileName.endsWith('.scss') || lowerFileName.endsWith('.less')) return 'css';


  if (isBinary) return 'binary'; // Explicit binary flag takes precedence if available

  // Content type based checks (can be less reliable than extensions for source code)
  if (contentType) {
    if (contentType.startsWith('text/')) {
      if (contentType === 'text/javascript') return 'javascript';
      if (contentType === 'text/typescript') return 'typescript'; // Though rare for TS
      if (contentType === 'text/x-python') return 'python';
      if (contentType === 'text/markdown') return 'markdown';
      if (contentType === 'text/html') return 'html';
      if (contentType === 'text/css') return 'css';
      if (contentType === 'application/json') return 'generic.json'; // application/json is text
      if (contentType === 'application/xml' || contentType === 'text/xml') return 'xml_config';
      return 'text'; // Default for other text/* types
    }
    if (contentType === 'application/octet-stream' || contentType.startsWith('application/zip') || contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/')) {
      return 'binary';
    }
  }

  // If no strong indicators and not explicitly binary, check common text extensions again.
  if (/\.(txt|log|sql|csv|rst|tex|conf|cfg|config|yaml|yml|json5)$/i.test(lowerFileName)) return 'text';


  return 'unknown';
}

// --- Common AST Element Interfaces ---
// Exporting for use in ast-utils

// Represents raw import data extracted directly by an AST analyzer
export interface RawASTImport {
  originalPath: string; // The path string as it appears in the import statement
  importedSymbols?: string[]; // Specific symbols imported, if applicable (e.g., { foo, bar } from './utils')
  isDefaultImport?: boolean; // For JS/TS default imports
  isNamespaceImport?: boolean; // For JS/TS import * as namespace
  pythonImportLevel?: number; // For Python relative imports (number of leading dots)
  sourceFile: string; // The file that contains this import statement
}

// Represents raw export data extracted directly by an AST analyzer
export interface RawASTExport {
  name: string; // Name of the exported symbol (e.g., function name, class name, variable name)
  type: 'function' | 'class' | 'variable' | 'interface' | 'type_alias' | 'unknown' | 're-export'; // Type of the exported symbol
  isDefaultExport?: boolean;
  reExportedFrom?: string; // If this is a re-export (e.g., export * from './other'; or export { name } from './other';)
  sourceFile: string; // The file that contains this export statement
}


export interface ExtractedCodeElement {
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
  astNode?: any; // Changed from ts.Node to any to accommodate different parsers
  localCalls?: Array<{ targetName: string; targetType: 'function' | 'method'; targetParentName?: string; line: number }>; // For local call detection
  parentName?: string; // For methods, the name of their class
}

// This ExtractedImport is from the old structure, will be replaced by RawASTImport for dependency graph
// export interface ExtractedImport {
//   source: string;
//   specifiers: { importedName?: string; localName: string; isDefault?: boolean; isNamespace?: boolean }[];
//   startLine: number;
//   endLine: number;
// }

// This ExtractedExport is from the old structure, will be replaced by RawASTExport for dependency graph
// export interface ExtractedExport {
//   type: 'named' | 'default' | 'all';
//   names?: string[];
//   source?: string;
//   declarationType?: string; // e.g., 'Function', 'Class' for default export
//   startLine: number;
//   endLine: number;
// }

// Data structure for the file dependency graph
export interface FileDependencyNode {
  filePath: string; // Unique path relative to project root
  imports: Array<{
    targetPath: string; // Resolved path (internal) or identifier (external, e.g., 'npm:lodash')
    type: 'internal' | 'external' | 'unresolved';
    originalPath: string; // The raw import string from the source code
    specificSymbols?: string[]; // Optional: specific symbols imported, if known
  }>;
  exports: Array<{
    name: string; // Name of the exported symbol
    type: 'function' | 'class' | 'variable' | 'interface' | 'type_alias' | 'unknown' | 're-export';
    isDefaultExport?: boolean;
  }>;
  importedBy: string[]; // List of internal filePaths that import this file
}


// --- JavaScript AST Analysis (Acorn) ---
async function analyzeJavaScriptAST(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): Promise<{
  analysisSummary: string,
  detailedNodes: DetailedNode[],
  rawImports: RawASTImport[], // New return for dependency graph
  rawExports: RawASTExport[], // New return for dependency graph
  error?: string
}> {
  const elements: ExtractedCodeElement[] = [];
  // const imports: ExtractedImport[] = []; // Old, replaced by rawImports
  // const exports: ExtractedExport[] = []; // Old, replaced by rawExports
  const rawImportsOutput: RawASTImport[] = [];
  const rawExportsOutput: RawASTExport[] = [];
  const detailedNodesOutput: DetailedNode[] = [];
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: any }> = [];
  let ast: acorn.Node | undefined;

  const summarizationTasks: SummarizationTaskInfo[] = [];

  try {
    ast = acorn.parse(fileContent, { ecmaVersion: 'latest', sourceType: 'module', locations: true, comments: true });
  } catch (e: any) {
    return {
      error: `JS AST parsing failed: ${e.message}`,
      analysisSummary: `Failed to parse JS content: ${e.message}`,
      detailedNodes: [],
      rawImports: [], // Ensure all return paths have new fields
      rawExports: []  // Ensure all return paths have new fields
    };
  }

  // Phase 1: Data Collection
  acornWalk.simple(ast, {
    FunctionDeclaration(node: any) {
      const isParentExport = node.parentNode?.type === 'ExportNamedDeclaration' || node.parentNode?.type === 'ExportDefaultDeclaration';
      const name = node.id?.name || '[anonymous_func]';
      const originalNodeInfo: ExtractedCodeElement = {
        name,
        kind: 'function',
        isExported: isParentExport, // Use isParentExport here
        startLine: node.loc?.start.line,
        endLine: node.loc?.end.line,
        params: node.params?.map((p: any) => ({ name: p.type === 'Identifier' ? p.name : (p.left?.name || '[pattern]') })),
        isAsync: node.async,
        astNode: node,
      };
      elements.push(originalNodeInfo);
      localDefinitions.push({ name, kind: 'function', node });
      if (isParentExport) { // Add to rawExports if exported
          rawExportsOutput.push({ name, type: 'function', isDefaultExport: node.parentNode?.type === 'ExportDefaultDeclaration', sourceFile: fileName });
      }
      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
        inputForFlow: {
          elementType: 'function',
          elementName: name,
          filePath: fileName,
          signature: `(${(originalNodeInfo.params?.map(p => p.name).join(', ') || '')})`,
          comments: undefined,
          isExported: isParentExport, // Use isParentExport here
        },
        originalNodeInfo,
        nodeType: 'function',
      });
    },
    VariableDeclaration(node: any) {
      const isParentExport = node.parentNode?.type === 'ExportNamedDeclaration';
      node.declarations.forEach((declaration: any) => {
        if (declaration.id?.name && (declaration.init?.type === 'ArrowFunctionExpression' || declaration.init?.type === 'FunctionExpression')) {
          const name = declaration.id.name;
          const originalNodeInfo: ExtractedCodeElement = {
            name,
            kind: 'function',
            isExported: isParentExport, // Use isParentExport from VariableDeclaration
            startLine: node.loc?.start.line,
            endLine: node.loc?.end.line,
            params: declaration.init.params?.map((p: any) => ({ name: p.type === 'Identifier' ? p.name : (p.left?.name || '[pattern]') })),
            isAsync: declaration.init.async,
            astNode: declaration.init,
          };
          elements.push(originalNodeInfo);
          localDefinitions.push({ name, kind: 'function', node: declaration.init });
          if (isParentExport) { // Add to rawExports if exported
              rawExportsOutput.push({ name, type: 'function', sourceFile: fileName });
          }
          summarizationTasks.push({
            uniqueId: generateNodeId(fileSpecificPrefix, 'function', name, summarizationTasks.length),
            inputForFlow: {
              elementType: 'function',
              elementName: name,
              filePath: fileName,
              signature: `(${(originalNodeInfo.params?.map(p => p.name).join(', ') || '')})`,
              comments: undefined,
              isExported: isParentExport, // Use isParentExport
            },
            originalNodeInfo,
            nodeType: 'function',
          });
        } else if (declaration.id?.name && node.kind && (node.parentNode?.type === 'Program' || isParentExport)) {
           const varName = declaration.id.name;
           const simpleVarElement: ExtractedCodeElement = { name: varName, kind: 'variable', isExported: isParentExport, startLine: node.loc?.start.line, endLine: node.loc?.end.line };
           elements.push(simpleVarElement);
           if (isParentExport) { // Add to rawExports if exported
                rawExportsOutput.push({ name: varName, type: 'variable', sourceFile: fileName });
           }
           detailedNodesOutput.push({
              id: generateNodeId(fileSpecificPrefix, 'variable', varName, detailedNodesOutput.length),
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
        astNode: node,
      };
      elements.push(originalNodeInfo);
      methods.forEach((methodNode: any) => {
        if (methodNode.key) {
            const methodName = methodNode.key.name || methodNode.key.value;
            localDefinitions.push({ name: methodName, kind: 'method', parentName: name, node: methodNode.value });
        }
      });
      if (isParentExport) { // Add to rawExports if exported
          rawExportsOutput.push({ name, type: 'class', isDefaultExport: node.parentNode?.type === 'ExportDefaultDeclaration', sourceFile: fileName });
      }
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
          classProperties: undefined,
        },
        originalNodeInfo,
        nodeType: 'class',
      });
    },
    ImportDeclaration(node: any) {
      const importedSymbols = node.specifiers.map((s: any) => {
        if (s.type === 'ImportDefaultSpecifier') return s.local.name + " (default)";
        if (s.type === 'ImportNamespaceSpecifier') return "* as " + s.local.name;
        return s.imported.name === s.local.name ? s.local.name : `${s.imported.name} as ${s.local.name}`;
      });
      rawImportsOutput.push({
        originalPath: node.source.value,
        importedSymbols,
        isDefaultImport: node.specifiers.some((s:any) => s.type === 'ImportDefaultSpecifier'),
        isNamespaceImport: node.specifiers.some((s:any) => s.type === 'ImportNamespaceSpecifier'),
        sourceFile: fileName
      });
    },
    ExportNamedDeclaration(node: any) {
      if (node.declaration) { // export function foo() {} / export const bar = ... / export class Baz {}
        const name = node.declaration.id?.name || (node.declaration.declarations && node.declaration.declarations[0]?.id?.name);
        if (name) {
          let type: RawASTExport['type'] = 'unknown';
          if (node.declaration.type === 'FunctionDeclaration') type = 'function';
          else if (node.declaration.type === 'ClassDeclaration') type = 'class';
          else if (node.declaration.type === 'VariableDeclaration') type = 'variable';
          rawExportsOutput.push({ name, type, sourceFile: fileName });
        }
      } else if (node.specifiers) { // export { foo, bar as baz };
        node.specifiers.forEach((spec: any) => {
          rawExportsOutput.push({ name: spec.exported.name, type: 'variable', reExportedFrom: node.source?.value, sourceFile: fileName }); // Type 'variable' is a guess here
        });
      }
    },
    ExportDefaultDeclaration(node: any) {
      const name = node.declaration.id?.name || (node.declaration.type === 'Identifier' ? node.declaration.name : '[default]');
      let type: RawASTExport['type'] = 'unknown';
      if (node.declaration.type === 'FunctionDeclaration') type = 'function';
      else if (node.declaration.type === 'ClassDeclaration') type = 'class';
      else if (node.declaration.type === 'Identifier' || node.declaration.type === 'Literal') type = 'variable';
      rawExportsOutput.push({ name, type, isDefaultExport: true, sourceFile: fileName });
    },
    ExportAllDeclaration(node: any) { // export * from './other';
      rawExportsOutput.push({ name: '*', type: 're-export', reExportedFrom: node.source.value, sourceFile: fileName });
    }
  }, (ast as any));

  const summarizedElements = await batchSummarizeElements(summarizationTasks, fileName, 'Acorn Analyzer');

  summarizedElements.forEach(task => {
    task.originalNodeInfo.localCalls = [];
    if ((task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'class') && task.originalNodeInfo.astNode) {
        if (task.originalNodeInfo.kind === 'function' && task.originalNodeInfo.astNode.body) {
            acornWalk.simple(task.originalNodeInfo.astNode.body, {
                CallExpression(callExprNode: any) {
                    if (callExprNode.callee.type === 'Identifier') {
                        const calleeName = callExprNode.callee.name;
                        const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
                        if (targetDef) {
                            task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callExprNode.loc.start.line });
                        }
                    }
                }
            });
        } else if (task.originalNodeInfo.kind === 'class') {
            const className = task.originalNodeInfo.name;
            const methodsOfThisClass = localDefinitions.filter(def => def.kind === 'method' && def.parentName === className);
            methodsOfThisClass.forEach(methodDef => {
                if (methodDef.node && methodDef.node.body) {
                    acornWalk.simple(methodDef.node.body, {
                        CallExpression(callExprNode: any) {
                            const callLine = callExprNode.loc.start.line;
                            if (callExprNode.callee.type === 'Identifier') {
                                const calleeName = callExprNode.callee.name;
                                const targetGlobalFunc = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
                                if (targetGlobalFunc) {
                                    task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
                                }
                            } else if (callExprNode.callee.type === 'MemberExpression' && callExprNode.callee.object.type === 'ThisExpression') {
                                const calleeName = callExprNode.callee.property.name;
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
    const detailedNode = createDetailedNodeFromExtractedElement(task.originalNodeInfo, task.uniqueId, `js_`);
    detailedNodesOutput.push(detailedNode);
  });

  // Add imports and exports (that are not declarations) to detailedNodesOutput for completeness if desired.
  // For now, they are primarily collected in rawImportsOutput and rawExportsOutput.
  // The old `imports` and `exports` arrays are removed.

  const totalLocalCalls = detailedNodesOutput.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);
  const summary = `JavaScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function').length} functions, ${elements.filter(e=>e.kind==='class').length} classes, ${rawImportsOutput.length} imports, ${rawExportsOutput.length} exports, ${elements.filter(e=>e.kind==='variable').length} top-level variables, and ${totalLocalCalls} detected local calls. Semantic summaries attempted for functions/classes.`;
  return { analysisSummary: summary, detailedNodes: detailedNodesOutput, rawImports: rawImportsOutput, rawExports: rawExportsOutput };
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
): Promise<{
  analysisSummary: string;
  detailedNodes: DetailedNode[];
  rawImports: RawASTImport[];
  rawExports: RawASTExport[];
  error?: string
}> {
  const extractedFunctions: ExtractedCodeElement[] = [];
  const extractedClasses: Array<ExtractedCodeElement & { methods: ExtractedCodeElement[], properties: string[], astNode?: PythonNode }> = [];
  // const extractedImports: Array<{ type: string; source?: string; names: Array<{ name: string; asName?: string }>; level?: number; lineNumbers?: string, startLine?: number, endLine?: number }> = []; // Old
  const rawImportsOutput: RawASTImport[] = [];
  const rawExportsOutput: RawASTExport[] = []; // For Python, this will be populated by heuristic
  const detailedNodes: DetailedNode[] = [];
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: PythonNode, signature?: string }> = [];
  const moduleLevelAssignments: Array<ExtractedCodeElement> = [];


  let ast: PythonNode;
  try {
    ast = pythonParse(fileContent);
  } catch (e: any) {
    return {
      error: 'Python AST parsing failed: ' + e.message,
      analysisSummary: 'Failed to parse Python content.',
      detailedNodes: [],
      rawImports: [],
      rawExports: []
    };
  }

  const getLineInfo = (node: PythonNode) => ('lineno' in node && node.lineno ? `${node.lineno}${('end_lineno' in node && node.end_lineno) ? `-${node.end_lineno}` : ''}` : undefined);

  const summarizationTasks: SummarizationTaskInfo[] = [];


  function visitPyNode(node: PythonNode | PythonNode[] | undefined, currentClassName?: string) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(child => visitPyNode(child, currentClassName));
      return;
    }

    const nodeType = node.type;

    if (nodeType === 'FunctionDef' || nodeType === 'AsyncFunctionDef') {
      const funcName = node.name;
      const params = node.args?.args?.map((arg: any) => ({
        name: arg.arg,
        type: arg.annotation ? getPyNodeText(arg.annotation, fileContent) : undefined,
      })) || [];
      const returnType = node.returns ? getPyNodeText(node.returns, fileContent) : undefined;
      const decorators = node.decorator_list?.map((d: any) => getPyNodeText(d, fileContent)) || [];
      let docstring: string | undefined = undefined;
      if (node.body && node.body.length > 0 && node.body[0].type === 'Expr' && node.body[0].value?.type === 'Constant' && typeof node.body[0].value.value === 'string') {
        docstring = node.body[0].value.value;
      }

      const funcData: ExtractedCodeElement = {
        name: funcName,
        kind: currentClassName ? 'method' : 'function',
        params,
        returnType,
        decorators,
        comments: docstring,
        startLine: node.lineno,
        endLine: node.end_lineno || node.lineno,
        parentName: currentClassName,
        isAsync: nodeType === 'AsyncFunctionDef',
        astNode: node as any,
      };
      const signature = `(${(params.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ') || '')})` + (returnType ? ` -> ${returnType}` : '');
      localDefinitions.push({ name: funcName, kind: funcData.kind as 'function' | 'method', parentName: currentClassName, node, signature });

      if (currentClassName) {
        const classObj = extractedClasses.find(c => c.name === currentClassName);
        classObj?.methods.push(funcData);
        // Methods are not typically "exported" at module level unless class is part of __all__
      } else {
        extractedFunctions.push(funcData);
        if (!funcName.startsWith('_')) { // Heuristic for module-level export
            rawExportsOutput.push({ name: funcName, type: 'function', sourceFile: fileName });
        }
      }

      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, funcData.kind, funcName, summarizationTasks.length),
        inputForFlow: {
          elementType: 'function',
          elementName: funcName,
          filePath: fileName,
          signature,
          comments: docstring,
          isExported: !currentClassName, // Top-level functions are considered "exported"
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

      const classProperties: string[] = [];
      node.body?.forEach((child: PythonNode) => {
        if (child.type === 'Assign' || child.type === 'AnnAssign') {
          const targets = child.type === 'Assign' ? child.targets : [child.target];
          targets?.forEach((target: PythonNode) => {
            if (target.type === 'Name') {
              let propString = target.id;
              if (child.type === 'AnnAssign' && child.annotation) {
                propString += `: ${getPyNodeText(child.annotation, fileContent)}`;
              }
              if (child.value) { // Add value if present
                propString += ` = ${getPyNodeText(child.value, fileContent).substring(0,30)}${getPyNodeText(child.value, fileContent).length > 30 ? '...' : ''}`;
              }
              classProperties.push(propString);
            }
          });
        }
      });

      const classData: ExtractedCodeElement & { methods: ExtractedCodeElement[], properties: string[], astNode?: PythonNode } = {
        name: className,
        kind: 'class',
        superClass: bases.join(', '),
        decorators,
        comments: docstring,
        startLine: node.lineno,
        endLine: node.end_lineno || node.lineno,
        methods: [],
        properties: classProperties,
        astNode: node,
      };
      extractedClasses.push(classData);
      if (!className.startsWith('_')) {
        rawExportsOutput.push({ name: className, type: 'class', sourceFile: fileName });
      }

      summarizationTasks.push({
        uniqueId: generateNodeId(fileSpecificPrefix, 'class', className, summarizationTasks.length),
        inputForFlow: {
          elementType: 'class',
          elementName: className,
          filePath: fileName,
          signature: bases.length > 0 ? `(${bases.join(', ')})` : undefined,
          comments: docstring,
          isExported: !className.startsWith('_'), // Apply heuristic for export status
          classMethods: [],
          classProperties: classProperties,
        },
        originalNodeInfo: classData,
        nodeType: 'class',
      });
      visitPyNode(node.body, className);
      const taskToUpdate = summarizationTasks.find(t => t.uniqueId === generateNodeId(fileSpecificPrefix, 'class', className, summarizationTasks.findIndex(st => st.originalNodeInfo.name === className && st.nodeType === 'class')));
      if (taskToUpdate) {
        taskToUpdate.inputForFlow.classMethods = classData.methods.map(m => m.name);
      }

    } else if (nodeType === 'Import') {
      const names = node.names?.map((alias: any) => alias.name + (alias.asname ? ` as ${alias.asname}` : "")) || [];
      rawImportsOutput.push({
        originalPath: names.join(', '), // For 'import a, b', path is 'a, b'
        importedSymbols: names,
        sourceFile: fileName
      });
    } else if (nodeType === 'ImportFrom') {
      const moduleName = node.module || (node.level ? '.'.repeat(node.level) : '');
      const importedSymbols = node.names?.map((alias: any) => alias.name + (alias.asname ? ` as ${alias.asname}` : "")) || [];
      rawImportsOutput.push({
        originalPath: moduleName,
        importedSymbols,
        pythonImportLevel: node.level || 0,
        sourceFile: fileName
      });
    } else if ((nodeType === 'Assign' || nodeType === 'AnnAssign') && !currentClassName) {
        const targets = nodeType === 'Assign' ? node.targets : [node.target];
        targets?.forEach((target: PythonNode) => {
            if (target.type === 'Name') {
                const varName = target.id;
                const varType = nodeType === 'AnnAssign' && node.annotation ? getPyNodeText(node.annotation, fileContent) : undefined;
                const varValue = node.value ? getPyNodeText(node.value, fileContent).substring(0, 50) + (getPyNodeText(node.value, fileContent).length > 50 ? '...' : '') : undefined;
                const isExportedHeuristic = !varName.startsWith('_');
                moduleLevelAssignments.push({
                    name: varName,
                    kind: 'variable',
                    dataType: varType,
                    value: varValue,
                    startLine: node.lineno,
                    endLine: node.end_lineno || node.lineno,
                    comments: getPyNodeText(node.comment_before, fileContent) || getPyNodeText(node.comment_after, fileContent),
                    isExported: isExportedHeuristic,
                });
                if (isExportedHeuristic) {
                    rawExportsOutput.push({ name: varName, type: 'variable', sourceFile: fileName });
                }
            }
        });
    } else if ('body' in node && Array.isArray(node.body)) {
      visitPyNode(node.body, currentClassName);
    } else if ('orelse' in node && Array.isArray(node.orelse)) {
      visitPyNode(node.orelse, currentClassName);
    }
  }

  if (ast && ast.type === 'Module' && Array.isArray(ast.body)) {
    visitPyNode(ast.body);
  } else if (ast) { // Should not happen for valid Python files
    console.warn(`[Py AST Analyzer] Root AST node is not a Module: ${ast?.type}`);
    visitPyNode(ast);
  }

  // Parallel Summarization for Python elements using utility
  const summarizedElements = await batchSummarizeElements(summarizationTasks, fileName, 'Py AST Analyzer');

  // Format detailedNodes including summaries and local calls
  summarizedElements.forEach(task => {
    task.originalNodeInfo.localCalls = []; // Initialize

    // Python Local Call Detection (simplified) - This logic is specific to Python AST
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

                if (calleeNode.type === 'Name') {
                    const calleeName = calleeNode.id;
                    const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
                    if (targetDef) {
                        task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
                    } else {
                        const imp = extractedImports.find(i => i.names.some(n => n.asName === calleeName || n.name === calleeName));
                        if (imp) {
                             task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', targetParentName: imp.source || imp.names.find(n => n.asName === calleeName || n.name === calleeName)?.name, line: callLine });
                        }
                    }
                } else if (calleeNode.type === 'Attribute') {
                    const calleeName = calleeNode.attr;
                    if (calleeNode.value?.type === 'Name') {
                        const objectName = calleeNode.value.id;
                        if (objectName === 'self') {
                            const currentElementParentName = task.originalNodeInfo.parentName;
                            if (currentElementParentName) {
                                const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'method' && def.parentName === currentElementParentName);
                                if (targetDef) {
                                    task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: currentElementParentName, line: callLine });
                                }
                            }
                        } else {
                            const imp = extractedImports.find(i => i.names.some(n => n.asName === objectName || n.name === objectName));
                            if (imp) {
                                task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: objectName, line: callLine });
                            }
                        }
                    } else if (calleeNode.value?.type === 'Call' && calleeNode.value.func.type === 'Name' && calleeNode.value.func.id === 'super') {
                         task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: 'super()', line: callLine });
                    }
                }
            }
            Object.values(currentNode).forEach(value => {
                if (typeof value === 'object' && value !== null) {
                    visitCallNodes(value as any);
                }
            });
        };
        if (task.originalNodeInfo.astNode && (task.originalNodeInfo.astNode as PythonNode).body) {
             visitCallNodes((task.originalNodeInfo.astNode as PythonNode).body);
        }
    }

    // Create DetailedNode using utility
    const detailedNode = createDetailedNodeFromExtractedElement(
        { ...task.originalNodeInfo, astNode: undefined }, // Remove heavy astNode before storing
        task.uniqueId,
        `py_`
    );
    detailedNodes.push(detailedNode);
  });

  // Add module-level assignments
  moduleLevelAssignments.forEach((assignment, i) => {
    // Ensure these are also added to detailedNodes if they weren't summarized
    if (!summarizationTasks.some(task => task.originalNodeInfo.name === assignment.name && task.nodeType === 'variable')) { // Assuming 'variable' would be a type for summarization
        detailedNodes.push({
            id: generateNodeId(fileSpecificPrefix, 'variable', assignment.name, detailedNodes.length + i),
            label: `${assignment.name} (variable)`,
            type: 'py_variable',
            details: `Type: ${assignment.dataType || 'Unknown'}. Value: ${assignment.value || 'N/A'}. Exported: ${assignment.isExported}. Comments: ${assignment.comments || 'None'}`,
            lineNumbers: `${assignment.startLine}-${assignment.endLine}`,
            structuredInfo: { ...assignment, astNode: undefined }, // Remove astNode before storing
        });
    }
  });

  // Add imports to detailedNodes for now, they are not summarized by LLM
  rawImportsOutput.forEach((imp, i) => {
    detailedNodes.push({
      id: generateNodeId(fileSpecificPrefix, 'import', imp.originalPath.split('.')[0], detailedNodes.length + i),
      label: `Import: ${imp.originalPath}`,
      type: 'py_import',
      details: `Symbols: ${imp.importedSymbols?.join(', ') || 'N/A'}${imp.pythonImportLevel ? `, Level: ${imp.pythonImportLevel}` : ''}`,
      // lineNumbers: imp.startLine ? `${imp.startLine}-${imp.endLine}`: undefined, // RawASTImport doesn't have line numbers yet
      structuredInfo: imp,
    });
  });

  const totalLocalCalls = detailedNodes.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);

  const analysisSummary = `Python file '${fileName}' (AST analysis): Found ${extractedFunctions.length} top-level functions, ${extractedClasses.length} classes, ${moduleLevelAssignments.length} module-level variables, and ${rawImportsOutput.length} import statements. Detected ${totalLocalCalls} local calls. Semantic summaries attempted.`;
  return { analysisSummary, detailedNodes, rawImports: rawImportsOutput, rawExports: rawExportsOutput };
}

// --- TypeScript AST Analysis ---
async function analyzeTypeScriptAST(
  fileName: string,
  fileContent: string,
  generateNodeId: Function,
  fileSpecificPrefix: string
): Promise<{
  analysisSummary: string,
  detailedNodes: DetailedNode[],
  rawImports: RawASTImport[],
  rawExports: RawASTExport[],
  error?: string
}> {
  const elements: ExtractedCodeElement[] = [];
  // const imports: ExtractedImport[] = []; // Old
  // const exports: ExtractedExport[] = []; // Old
  const rawImportsOutput: RawASTImport[] = [];
  const rawExportsOutput: RawASTExport[] = [];
  const detailedNodesOutput: DetailedNode[] = [];
  const localDefinitions: Array<{ name: string, kind: 'function' | 'method', parentName?: string, node: ts.Node }> = [];


  const scriptKind = fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(fileName, fileContent, ts.ScriptTarget.Latest, true, scriptKind);

  const diagnostics = [...sourceFile.syntacticDiagnostics, ...sourceFile.semanticDiagnostics];
  if (diagnostics.length > 0) {
    const errorMsg = "TypeScript AST parsing/binding produced diagnostics: " + diagnostics.map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n")).join("; ");
    console.warn(`[TS AST Analyzer] Diagnostics for ${fileName}: ${errorMsg}`);
    return {
      error: errorMsg,
      analysisSummary: `Failed to fully parse TS: ${errorMsg}`,
      detailedNodes: [],
      rawImports: [],
      rawExports: []
    };
  }

  const summarizationTasks: SummarizationTaskInfo[] = [];

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
        isExported: isExported, // From modifiers
      };
      if (isExported) { // Add to rawExports if exported
          rawExportsOutput.push({ name, type: (ts.isMethodDeclaration(node) ? 'function' : 'function'), isDefaultExport, sourceFile: fileName });
      }

    } else if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      nodeTypeForSummarizer = 'class';
      const name = node.name?.getText(sourceFile) || '[anonymous_class]';
      const heritageClauses = node.heritageClauses;
      const superClass = heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ExtendsKeyword)?.types[0]?.expression.getText(sourceFile);
      const implementedInterfaces = heritageClauses?.find(hc => hc.token === ts.SyntaxKind.ImplementsKeyword)?.types.map(t => t.expression.getText(sourceFile));

      const classMethods = node.members.filter(ts.isMethodDeclaration).map(m => `${m.name?.getText(sourceFile)}(${m.parameters.map(p => p.name.getText(sourceFile) + (p.type ? ": "+p.type.getText(sourceFile):"")).join(', ')})` + (m.type ? ": "+m.type.getText(sourceFile): ""));
      const classProperties = node.members.filter(ts.isPropertyDeclaration).map(p => `${p.name?.getText(sourceFile)}${p.type ? ": "+p.type.getText(sourceFile): ""}`);
      elementInfo = { name, kind: 'class', superClass, implementedInterfaces, isExported, isDefaultExport, startLine, endLine, comments, classMethods, classProperties, astNode: node };

      if (isExported) { // Add to rawExports if exported
        rawExportsOutput.push({ name, type: 'class', isDefaultExport, sourceFile: fileName });
      }
      summarizerInput = {
        elementType: nodeTypeForSummarizer,
        elementName: name,
        signature: `${superClass ? `extends ${superClass} ` : ''}${implementedInterfaces ? `implements ${implementedInterfaces.join(', ')}` : ''}`.trim() || undefined,
        filePath: fileName,
        comments,
        isExported, // From modifiers
        classMethods,
        classProperties,
      };
    } else if (ts.isInterfaceDeclaration(node) || ts.isEnumDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
      const kind = ts.isInterfaceDeclaration(node) ? 'interface' : ts.isEnumDeclaration(node) ? 'enum' : 'type_alias';
      const name = node.name.getText(sourceFile);
      elementInfo = { name, kind, isExported, isDefaultExport, startLine, endLine, comments, semanticPurpose: "Not summarized by type." };
      if (isExported) {
        rawExportsOutput.push({ name, type: kind as RawASTExport['type'], isDefaultExport, sourceFile: fileName });
      }
    } else if (ts.isVariableStatement(node)) {
        const isParentExport = node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword); // VariableStatement itself can be exported
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
                nodeTypeForSummarizer = 'function'; // Mark for summarization as function
                varParams = varInitializer.parameters.map(p => ({ name: p.name.getText(sourceFile), type: p.type?.getText(sourceFile) }));
                varReturnType = varInitializer.type?.getText(sourceFile);
              }
              let parentNameForVarFunc: string | undefined = undefined;
              if (node.parent && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent)) && node.parent.name) {
                 parentNameForVarFunc = node.parent.name.getText(sourceFile);
              }

              elementInfo = { name: varName, kind: varKind, dataType: varType, value: varInitializer?.getText(sourceFile).substring(0,50), isExported: isParentExport, startLine, endLine, comments, params: varParams, returnType: varReturnType, astNode: decl, parentName: parentNameForVarFunc };

              if (isParentExport) { // Add to rawExports if exported
                rawExportsOutput.push({ name: varName, type: varKind, sourceFile: fileName });
              }

              if (nodeTypeForSummarizer === 'function' && elementInfo) {
                if (varKind === 'function') {
                    localDefinitions.push({ name: varName, kind: 'function', parentName: parentNameForVarFunc, node: decl });
                }
                summarizerInput = {
                  elementType: 'function',
                  elementName: varName,
                  signature: `(${varParams?.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ') || ''})` + (varReturnType ? `: ${varReturnType}` : ''),
                  filePath: fileName,
                  comments,
                  isExported: isParentExport, // From VariableStatement
                };
              } else if (varKind === 'variable') { // Non-function variable
                summarizerInput = null; // Not summarized by this flow
                if(elementInfo) elementInfo.semanticPurpose = "Not summarized by type.";
              }
            }
            if (elementInfo) break;
        }
    }

    if (elementInfo) {
      if (summarizerInput && (nodeTypeForSummarizer === 'function' || nodeTypeForSummarizer === 'class')) {
        summarizationTasks.push({
          uniqueId: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, summarizationTasks.length),
          inputForFlow: summarizerInput,
          originalNodeInfo: { ...elementInfo },
          nodeType: nodeTypeForSummarizer,
        });
      }
      elements.push(elementInfo);

      if (!nodeTypeForSummarizer && elementInfo.kind !== 'variable') {
         detailedNodesOutput.push({
            id: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, detailedNodesOutput.length),
            label: `${elementInfo.name} (${elementInfo.kind})`,
            type: `ts_${elementInfo.kind}`,
            details: `Exported: ${elementInfo.isExported}. Comments: ${elementInfo.comments ? 'Available' : 'None'}. ${elementInfo.semanticPurpose || ''}`,
            lineNumbers: `${elementInfo.startLine}-${elementInfo.endLine}`,
            structuredInfo: {...elementInfo, astNode: undefined }, // Remove astNode before storing
        });
      } else if (elementInfo.kind === 'variable' && !nodeTypeForSummarizer) { // Non-function variable, not summarized by LLM here
         detailedNodesOutput.push({
            id: generateNodeId(fileSpecificPrefix, elementInfo.kind, elementInfo.name, detailedNodesOutput.length),
            label: `${elementInfo.name} (variable)`,
            type: `ts_variable`,
            details: `Type: ${elementInfo.dataType || 'any'}. Exported: ${elementInfo.isExported}. Comments: ${elementInfo.comments ? 'Available' : 'None'}.`,
            lineNumbers: `${elementInfo.startLine}-${elementInfo.endLine}`,
            structuredInfo: {...elementInfo, astNode: undefined },
        });
      }
    } else if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const importedSymbols: string[] = [];
      let isDefault = false;
      let isNamespace = false;
      if(node.importClause) {
        if(node.importClause.name) { // Default import: import defaultName from 'module'
          importedSymbols.push(node.importClause.name.text + " (default)");
          isDefault = true;
        }
        if(node.importClause.namedBindings) {
          if(ts.isNamespaceImport(node.importClause.namedBindings)) { // Namespace import: import * as ns from 'module'
            importedSymbols.push("* as " + node.importClause.namedBindings.name.text);
            isNamespace = true;
          } else if (ts.isNamedImports(node.importClause.namedBindings)) { // Named imports: import { a, b as c } from 'module'
            node.importClause.namedBindings.elements.forEach(el => {
              importedSymbols.push(el.propertyName ? `${el.propertyName.text} as ${el.name.text}` : el.name.text);
            });
          }
        }
      }
      rawImportsOutput.push({ originalPath: node.moduleSpecifier.text, importedSymbols, isDefaultImport: isDefault, isNamespaceImport: isNamespace, sourceFile: fileName });
      // detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'import', node.moduleSpecifier.text, detailedNodesOutput.length), label: `Import from '${node.moduleSpecifier.text}'`, type: 'ts_import', details: specifiers.map(s => s.localName + (s.importedName && s.importedName !== s.localName ? ` as ${s.importedName}` : '')).join(', '), lineNumbers, structuredInfo: { source: node.moduleSpecifier.text, specifiers, startLine, endLine } });
    } else if (ts.isExportDeclaration(node)) { // export { foo }; export { foo as bar }; export * from './other';
      const source = node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined;
      if (node.exportClause && ts.isNamedExports(node.exportClause)) {
        node.exportClause.elements.forEach(el => {
          rawExportsOutput.push({ name: el.name.text, type: 're-export', reExportedFrom: source, sourceFile: fileName });
        });
      } else if (!node.exportClause && source) { // export * from './other';
         rawExportsOutput.push({ name: '*', type: 're-export', reExportedFrom: source, sourceFile: fileName });
      }
      // detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'named', detailedNodesOutput.length), label: `Export ${names?.join(', ') || '*'}`, type: 'ts_export_named', details: `Source: ${node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : 'local'}`, lineNumbers, structuredInfo: { type: 'named', names, source: node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier) ? node.moduleSpecifier.text : undefined, startLine, endLine } });
    } else if (ts.isExportAssignment(node)) { // export default ...;
      const exprText = node.expression.getText(sourceFile);
      rawExportsOutput.push({ name: exprText.length > 50 ? exprText.substring(0,50) + '...' : exprText, type: 'unknown', isDefaultExport: true, sourceFile: fileName }); // Type here is hard to determine without more context
      // detailedNodesOutput.push({ id: generateNodeId(fileSpecificPrefix, 'export', 'default', detailedNodesOutput.length), label: `Export Default`, type: 'ts_export_default', details: node.expression.getText(sourceFile).substring(0,100), lineNumbers, structuredInfo: { type: 'default', expression: node.expression.getText(sourceFile), startLine, endLine } });
    }

    for (const child of node.getChildren(sourceFile)) {
        visitNodeRecursive(child);
    }
  }

  // Phase 1: Data Collection (Recursive)
  visitNodeRecursive(sourceFile);

  // Phase 2: Parallel Summarization using utility
  const summarizedElements = await batchSummarizeElements(summarizationTasks, fileName, 'TS AST Analyzer');

  // Phase 3: Integration (including local call detection)
  summarizedElements.forEach(task => {
    task.originalNodeInfo.localCalls = []; // Initialize

    // Second pass for local call detection, only for functions/methods - This logic is TS AST specific
    if ((task.originalNodeInfo.kind === 'function' || task.originalNodeInfo.kind === 'method') && task.originalNodeInfo.astNode) {
      const findCallsVisitor = (currentNode: ts.Node) => {
        if (ts.isCallExpression(currentNode)) {
          const callExpr = currentNode;
          const callLine = sourceFile.getLineAndCharacterOfPosition(callExpr.getStart(sourceFile)).line + 1;

          if (ts.isIdentifier(callExpr.expression)) {
            const calleeName = callExpr.expression.getText(sourceFile);
            const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'function' && !def.parentName);
            if (targetDef) {
              task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'function', line: callLine });
            }
          } else if (ts.isPropertyAccessExpression(callExpr.expression)) {
            const propAccess = callExpr.expression;
            if (propAccess.expression.kind === ts.SyntaxKind.ThisKeyword) {
              const calleeName = propAccess.name.getText(sourceFile);
              const currentElementParentName = task.originalNodeInfo.parentName;
              if (currentElementParentName) {
                const targetDef = localDefinitions.find(def => def.name === calleeName && def.kind === 'method' && def.parentName === currentElementParentName);
                if (targetDef) {
                  task.originalNodeInfo.localCalls?.push({ targetName: calleeName, targetType: 'method', targetParentName: currentElementParentName, line: callLine });
                }
              }
            }
          }
        }
        ts.forEachChild(currentNode, findCallsVisitor);
      };

      // @ts-ignore - body property exists on function/method like nodes
      if (task.originalNodeInfo.astNode.body) {
         // @ts-ignore
        ts.forEachChild(task.originalNodeInfo.astNode.body, findCallsVisitor);
      }
    }

    // Create DetailedNode using utility, ensuring astNode is not passed directly if it's complex
    const detailedNode = createDetailedNodeFromExtractedElement(
        { ...task.originalNodeInfo, astNode: undefined }, // Remove or simplify astNode before storing
        task.uniqueId,
        `ts_`
    );
    detailedNodesOutput.push(detailedNode);
  });

  // Add raw imports and exports to detailedNodes for now if they weren't part of a summarizable element
  // This part might be redundant if all exports are declarations and captured above.
  // rawImportsOutput.forEach... (similar to Python, if needed for detailedNodes)
  // rawExportsOutput.forEach... (similar to Python, if needed for detailedNodes)


  const totalLocalCalls = detailedNodesOutput.reduce((acc, node) => acc + (node.structuredInfo?.localCalls?.length || 0), 0);
  const summary = `TypeScript file '${fileName}' (AST analysis): Found ${elements.filter(e=>e.kind==='function'||e.kind==='method').length} functions/methods, ${elements.filter(e=>e.kind==='class').length} classes, ${elements.filter(e=>e.kind==='interface').length} interfaces, ${rawImportsOutput.length} imports, ${rawExportsOutput.length} exports, and ${totalLocalCalls} detected local calls. Semantic summaries attempted.`;
  return { analysisSummary: summary, detailedNodes: detailedNodesOutput, rawImports: rawImportsOutput, rawExports: rawExportsOutput };
}

// --- Fallback and other analyzers (package.json, generic.json, markdown, plain_text, fallback, python regex) ---
// Ensure generateNodeId usage is consistent
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

      } catch (e: any) {
        output.parsingErrors?.push(`Error parsing package.json: ${e.message}`);
      }
    } else if (packageJsonFileObject) {
      output.parsingErrors?.push(`package.json found in listing but could not be downloaded/read.`);
    }
  }

  // Iterate through all files for deeper analysis if they are source code
  const MAX_SOURCE_FILES_TO_PROCESS = 50; // Increased limit slightly
  let processedSourceFilesCount = 0;

  console.log(`[Analyzer] Starting deep analysis loop for ${filesList.length} files.`);
  for (const file of filesList) {
    if (processedSourceFilesCount >= MAX_SOURCE_FILES_TO_PROCESS && isArchive) {
        const msg = `[Analyzer] Reached processing limit of ${MAX_SOURCE_FILES_TO_PROCESS} source files from archive. Some files were not analyzed deeply.`;
        console.log(msg);
        output.parsingErrors?.push(msg);
        break;
    }

    // Pass the full file path (file.name here is relative to archive root or project path)
    // to determineEffectiveFileType for path-based CI/CD detection.
    // The actual 'name' for Supabase download might be different if projectStoragePath is a directory.
    // Assuming file.name is the "full path" relative to the project root for now.
    const effectiveType = determineEffectiveFileType(path.basename(file.name), undefined, undefined, file.name);

    let fileContentString: string | null = null;

    const typesRequiringContentForAST = ['javascript', 'typescript', 'python'];
    const typesRequiringContentForOtherParsing = [

    // Define which types absolutely need content for this stage of analysis
    const typesRequiringContent = [
        'javascript', 'typescript', 'python',
        'package.json', 'generic.json', 'markdown', 'text',
        'pom_xml', 'gradle_script', 'csproj_file',
        'dockerfile', 'docker_compose_config',
        'cicd_script_yaml', 'github_workflow_yaml', 'gitlab_ci_yaml',
        'shell_script', 'env_config', 'xml_config', 'text_config',
        'html', 'css'
    ];
    const typesRequiringContent = [...typesRequiringContentForAST, ...typesRequiringContentForOtherParsing];

    if (typesRequiringContent.includes(effectiveType)) {
        console.log(`[Analyzer] Attempting to get content for: ${file.name} (Effective type: ${effectiveType})`);
        fileContentString = await getFileContent(file.name);


    if (typesRequiringContent.includes(effectiveType)) {
        console.log(`[Analyzer] Attempting to get content for: ${file.name} (Effective type: ${effectiveType})`);
        fileContentString = await getFileContent(file.name); // file.name is path relative to archive root or project dir
    }

    if (fileContentString) {
        console.log(`[Analyzer] Successfully fetched content for ${file.name}. Length: ${fileContentString.length}.`);
        const localFileSpecificPrefix = (path.basename(file.name) || 'file').replace(/[^a-zA-Z0-9_]/g, '_');
        let analysisResult; // This will be typed based on the specific analyzer function
        let keyFileType: KeyFile['type'] = 'unknown';

        let analysisResult;
        let keyFileType: KeyFile['type'] = 'unknown'; // Default, to be overridden

        switch (effectiveType) {
            case 'javascript':
                keyFileType = 'source_code_js';
                console.log(`[Analyzer] Analyzing JS: ${file.name}`); // Corrected log from POC to Analyzer

                console.log(`[POC] Analyzing JS: ${file.name}`);
                analysisResult = await analyzeJavaScriptAST(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary, extractedSymbols: analysisResult.detailedNodes.map(n => n.label), details: `JS AST Nodes: ${analysisResult.detailedNodes.length}` });
                if(analysisResult.error) output.parsingErrors?.push(`${file.name}: JS AST Error - ${analysisResult.error}`);
                console.log(`[Analyzer] JS AST analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
                processedSourceFilesCount++;
                break;
            case 'typescript':
                keyFileType = 'source_code_ts';
                console.log(`[Analyzer] Analyzing TS: ${file.name}`);
                analysisResult = await analyzeTypeScriptAST(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary, extractedSymbols: analysisResult.detailedNodes.map(n => n.label), details: `TS AST Nodes: ${analysisResult.detailedNodes.length}` });
                if(analysisResult.error) output.parsingErrors?.push(`${file.name}: TS AST Error - ${analysisResult.error}`);
                console.log(`[Analyzer] TS AST analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
                processedSourceFilesCount++;
                break;
            case 'python':
                keyFileType = 'source_code_py';
                console.log(`[Analyzer] Analyzing Python: ${file.name}`);
                analysisResult = await analyzePythonAST(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary, extractedSymbols: analysisResult.detailedNodes.map(n => n.label), details: `Python AST Nodes: ${analysisResult.detailedNodes.length}` });
                if(analysisResult.error) output.parsingErrors?.push(`${file.name}: Python AST Error - ${analysisResult.error}`);
                console.log(`[Analyzer] Python AST analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
                processedSourceFilesCount++;
                break;
            case 'package.json':
              keyFileType = 'manifest';
              console.log(`[Analyzer] Analyzing package.json: ${file.name}`);
              // Initial parsing for project name, deps already done. This ensures it's in keyFiles.
              if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
                analysisResult = analyzePackageJson(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary });
              }
              console.log(`[Analyzer] package.json ${file.name} added to keyFiles if not present.`);
              break;
            case 'generic.json':
              keyFileType = 'generic_json';
              console.log(`[Analyzer] Analyzing generic JSON: ${file.name}`);
              analysisResult = analyzeGenericJson(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
              output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary });
              console.log(`[Analyzer] Generic JSON analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
              break;
            case 'markdown':
              keyFileType = 'readme'; // Assume most .md files are READMEs or docs
              console.log(`[Analyzer] Analyzing Markdown: ${file.name}`);
              analysisResult = analyzeMarkdown(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
              output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary });
              // README content might also update projectSummary, handled later or by specific README logic
              console.log(`[Analyzer] Markdown analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
              break;
            case 'text':
              keyFileType = 'generic_text';
              console.log(`[Analyzer] Analyzing plain text: ${file.name}`);
              analysisResult = analyzePlainText(file.name, fileContentString, generateNodeId, localFileSpecificPrefix);
              output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: analysisResult.analysisSummary });
               console.log(`[Analyzer] Plain text analysis for ${file.name} summary: ${analysisResult.analysisSummary.substring(0,100)}...`);
              break;
            case 'pom_xml':
            case 'csproj_file':
            case 'gradle_script':
                keyFileType = effectiveType; // Use the specific manifest type
                console.log(`[Analyzer] Analyzing Manifest (${effectiveType}): ${file.name}`);
                // These are typically handled by specific logic outside the loop if found by name first.
                // This ensures they are captured if iterated over.
                if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
                    let desc = `${effectiveType} file.`;
                    if (effectiveType === 'pom_xml') desc = parsePomXml(fileContentString).projectName || desc;
                    if (effectiveType === 'csproj_file') desc = parseCsproj(fileContentString, file.name).projectName || desc;
                    if (effectiveType === 'gradle_script') desc = parseBuildGradle(fileContentString).projectName || desc;
                    output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: desc });
                }
                console.log(`[Analyzer] ${effectiveType} analysis for ${file.name} done.`);
                break;
            case 'dockerfile':
            case 'docker_compose_config':
            case 'cicd_script_yaml':
            case 'github_workflow_yaml':
            case 'gitlab_ci_yaml':
            case 'shell_script':
            case 'env_config':
            case 'xml_config': // Generic XML not pom
            case 'text_config': // .properties, .ini, .toml
            case 'html':
            case 'css':
                keyFileType = effectiveType;
                console.log(`[Analyzer] Analyzing ${effectiveType}: ${file.name}`);
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Stylesheet defining visual styles." });
                console.log(`[Analyzer] ${effectiveType} ${file.name} added to keyFiles.`);
                break;
            case 'dockerfile':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Instructions for building a Docker container image." });
                break;
            case 'docker_compose_config':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Configuration for defining and running multi-container Docker applications." });
                break;
            case 'github_workflow_yaml':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "GitHub Actions workflow definition for CI/CD or other automation." });
                break;
            case 'gitlab_ci_yaml':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "GitLab CI/CD pipeline configuration." });
                break;
            case 'cicd_script_yaml': // Generic CI/CD YAML
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Generic CI/CD or automation script (YAML)." });
                break;
            case 'shell_script':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Shell script for automation or system tasks." });
                break;
            case 'env_config':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Environment variable configuration file." });
                break;
            case 'xml_config':
                 keyFileType = effectiveType;
                 output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "XML-based configuration file." });
                 break;
            case 'text_config': // .properties, .ini, .toml
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "Text-based configuration file (e.g., .properties, .ini, .toml)." });
                break;
            case 'html':
                keyFileType = effectiveType;
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: "HTML document structure." });
                break;
            // LLM Summarization for certain text-based files
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
                    const MAX_SNIPPET_LENGTH = 4000; // Max characters to send to LLM
                    const snippet = fileContentString.substring(0, MAX_SNIPPET_LENGTH);
                    try {
                        console.log(`[Analyzer] Requesting LLM summary for ${file.name} (type: ${keyFileType})`);
                        const summaryResult = await summarizeGenericFileFlow.run({
                            fileName: file.name,
                            fileContentSnippet: snippet,
                            fileType: keyFileType,
                        });
                        if (summaryResult.summary && !summaryResult.error) {
                            defaultDesc = summaryResult.summary;
                            console.log(`[Analyzer] LLM summary for ${file.name}: ${defaultDesc.substring(0,100)}...`);
                        } else {
                            console.warn(`[Analyzer] LLM summarization failed for ${file.name}: ${summaryResult.error || 'No summary returned.'}`);
                            if(summaryResult.error) output.parsingErrors?.push(`LLM summary error for ${file.name}: ${summaryResult.error}`);
                        }
                    } catch (llmError: any) {
                        console.error(`[Analyzer] Critical error calling summarizeGenericFileFlow for ${file.name}:`, llmError);
                        output.parsingErrors?.push(`Critical LLM flow error for ${file.name}: ${llmError.message}`);
                    }
                }
                output.keyFiles?.push({ filePath: file.name, type: keyFileType, briefDescription: defaultDesc });
                break;

            default:
                // This case handles types like 'binary_data', 'unknown', or any other unhandled text-based effectiveType
                // For which content might not have been fetched or no specific parser exists.
                if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
                    let desc = `${effectiveType} file.`;
                    let kfType: KeyFile['type'] = 'unknown';

                    if (effectiveType === 'binary_data' || effectiveType === 'binary') { // Added 'binary' for robustness
                        desc = "Binary data file.";
                        kfType = 'binary_data';
                    } else if (effectiveType === 'unknown') {
                        desc = "File of unrecognized type.";
                        kfType = 'unknown';
                    } else {
                        // If it's some other text-based effectiveType that fell through but wasn't in typesRequiringContent
                        // or content fetch failed for it.
                        desc = `Text-based file of type: ${effectiveType}.`;
                        // Try to cast, if it's a valid KeyFile type, use it, otherwise 'unknown'
                        const potentialKeyFileType = effectiveType as KeyFile['type'];
                        const validKeyFileTypes = KeyFileSchema.shape.type._def.values;
                        if (validKeyFileTypes.includes(potentialKeyFileType)) {
                            kfType = potentialKeyFileType;
                        }
                    }
                    output.keyFiles?.push({ filePath: file.name, type: kfType, briefDescription: desc });

                // Ensure a keyFile entry is still made if it wasn't handled by earlier specific manifest logic.
                if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
                    let desc = `${effectiveType} file.`;
                    if (effectiveType === 'binary_data') desc = "Binary data file.";
                    else if (effectiveType === 'unknown') desc = "File of unrecognized type.";
                    // For other text-based types that fell through, use the generic description
                    output.keyFiles?.push({ filePath: file.name, type: effectiveType as KeyFile['type'], briefDescription: desc });
                }
                console.log(`[Analyzer] File ${file.name} (type: ${effectiveType}) passed through default case in content analysis switch.`);
                break;
          }
    } else if (typesRequiringContent.includes(effectiveType)) {
        // If we expected content for these types but didn't get it
        const errMsg = `Could not read content for expected text-based file: ${file.name} (Type: ${effectiveType})`;
        output.parsingErrors?.push(errMsg);
        console.warn(`[Analyzer] ${errMsg}`);
        // Still add a KeyFile entry with minimal info
        if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
            const potentialKeyFileType = effectiveType as KeyFile['type'];
            const validKeyFileTypes = KeyFileSchema.shape.type._def.values;
            const kfType = validKeyFileTypes.includes(potentialKeyFileType) ? potentialKeyFileType : 'unknown';
            output.keyFiles?.push({ filePath: file.name, type: kfType, briefDescription: `Unable to read content for this ${effectiveType} file.` });
        }

    } else if (effectiveType === 'binary_data' || effectiveType === 'binary' || effectiveType === 'unknown') {
        // Add binary/unknown files to keyFiles if not already added (e.g. if not in typesRequiringContent)
        if (!output.keyFiles?.find(kf => kf.filePath === file.name)) {
            let desc = `${effectiveType} file.`;
            let kfType: KeyFile['type'] = 'unknown';
            if (effectiveType === 'binary_data' || effectiveType === 'binary') {
                desc = "Binary data file.";
                kfType = 'binary_data';
            } else { // unknown
                desc = "File of unrecognized type.";
                kfType = 'unknown';
            }
            output.keyFiles?.push({ filePath: file.name, type: kfType, briefDescription: desc});
        }

        output.parsingErrors?.push(`Could not read content for expected text-based file: ${file.name}`);
        console.warn(`[Analyzer] Failed to get content for: ${file.name} (Type: ${effectiveType})`);
    } else if (effectiveType === 'binary' || effectiveType === 'unknown') {
        // Add binary/unknown files to keyFiles as well, just with less detail
        output.keyFiles?.push({ filePath: file.name, type: effectiveType === 'binary' ? 'binary_data' : 'unknown', briefDescription: `${effectiveType} file.`});
      }
    }
  console.log("[Analyzer] Finished deep analysis loop.");

  // Step: Deepen directoryStructureSummary
  const directoryDataMap = new Map<string, { files: string[], subDirectoryNames: Set<string>, fileCounts: Record<string, number>, depth: number }>();
  directoryDataMap.set('.', { files: [], subDirectoryNames: new Set(), fileCounts: {}, depth: 0 }); // Project root

  for (const file of filesList) {
    const filePathParts = file.name.split('/').filter(p => p); // Filter out empty parts from leading/trailing slashes
    let currentPath = '.';

    for (let i = 0; i < filePathParts.length; i++) {
      const part = filePathParts[i];
      if (i === filePathParts.length - 1) { // It's a file
        if (!directoryDataMap.has(currentPath)) {
          // This case should ideally not happen if root is always present and paths are built up correctly
          // but as a safeguard:
          const pathDepth = currentPath === '.' ? 0 : currentPath.split('/').length;
          directoryDataMap.set(currentPath, { files: [], subDirectoryNames: new Set(), fileCounts: {}, depth: pathDepth });
        }
        directoryDataMap.get(currentPath)!.files.push(part);
        const ext = path.extname(part) || (part.startsWith('.') ? part : '<no_ext>');
        directoryDataMap.get(currentPath)!.fileCounts[ext] = (directoryDataMap.get(currentPath)!.fileCounts[ext] || 0) + 1;
      } else { // It's a directory part
        const parentPath = currentPath;
        currentPath = (currentPath === '.' ? part : `${currentPath}/${part}`);

        if (!directoryDataMap.has(parentPath)) { // Ensure parent exists
            const parentDepth = parentPath === '.' ? 0 : parentPath.split('/').length;
            directoryDataMap.set(parentPath, { files: [], subDirectoryNames: new Set(), fileCounts: {}, depth: parentDepth });
        }
        directoryDataMap.get(parentPath)!.subDirectoryNames.add(part);

        if (!directoryDataMap.has(currentPath)) {
          const pathDepth = currentPath.split('/').length;
          directoryDataMap.set(currentPath, { files: [], subDirectoryNames: new Set(), fileCounts: {}, depth: pathDepth });
        }
      }
    }
  }

  output.directoryStructureSummary = [];
  const MAX_DIR_DEPTH_FOR_SUMMARY = 3; // Configure max depth for summary to avoid excessive detail

  for (const [dirPath, data] of directoryDataMap.entries()) {
    if (data.depth > MAX_DIR_DEPTH_FOR_SUMMARY && dirPath !== '.') continue; // Skip very deep directories unless it's root

    let inferredPurpose = "General";
    const lowerDirPath = dirPath.toLowerCase();
    const dirName = dirPath.split('/').pop()?.toLowerCase() || "";

    if (dirName === 'src' || dirName === 'source' || dirName === 'app') inferredPurpose = "Source Code";
    else if (dirName === 'tests' || dirName === '__tests__') inferredPurpose = "Tests";
    else if (dirName === 'services') inferredPurpose = "Service Layer";
    else if (dirName === 'components' || dirName === 'ui' || dirName === 'views' || dirName === 'pages') inferredPurpose = "UI Components/Views";
    else if (dirName === 'utils' || dirName === 'helpers' || dirName === 'lib') inferredPurpose = "Utilities/Libraries";
    else if (dirName === 'config' || dirName === 'configuration') inferredPurpose = "Configuration";
    else if (dirName === 'docs' || dirName === 'documentation') inferredPurpose = "Documentation";
    else if (dirName === 'assets' || dirName === 'static' || dirName === 'public') inferredPurpose = "Static Assets";
    else if (dirName === 'models' || dirName === 'domain' || dirName === 'entities') inferredPurpose = "Data Models/Entities";
    else if (dirName === 'routes' || dirName === 'controllers' || dirName === 'api') inferredPurpose = "API Routes/Controllers";
    else if (dirName === 'hooks') inferredPurpose = "React Hooks";
    else if (dirName === 'styles' || dirName === 'css' || dirName === 'scss') inferredPurpose = "Stylesheets";
    else if (dirName === 'scripts') inferredPurpose = "Build/Utility Scripts";
    else if (dirName === 'data' || dirName === 'database' || dirName === 'db') inferredPurpose = "Data/Database related";
     // Add more heuristics based on common directory names

    // Heuristic based on dominant file types within the directory
    if (data.fileCounts['.js'] > (data.files.length / 2) || data.fileCounts['.ts'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "JavaScript/TypeScript Modules" : `${inferredPurpose} (JS/TS)`;
    if (data.fileCounts['.py'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "Python Modules" : `${inferredPurpose} (Python)`;
    if (data.fileCounts['.java'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "Java Code" : `${inferredPurpose} (Java)`;
    if (data.fileCounts['.cs'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "C# Code" : `${inferredPurpose} (C#)`;
    if (data.fileCounts['.md'] > (data.files.length / 2) && dirName !== 'docs') inferredPurpose = inferredPurpose === "General" ? "Markdown Documentation" : `${inferredPurpose} (Markdown)`;

    // Only add if it has files or subdirectories, or it's the root.
    if (dirPath === '.' || data.files.length > 0 || data.subDirectoryNames.size > 0) {
        output.directoryStructureSummary.push({
            path: dirPath,
            fileCounts: data.fileCounts,
            inferredPurpose: inferredPurpose,
        });
    }
  }
  // Sort by path to make it more readable
  output.directoryStructureSummary.sort((a, b) => a.path.localeCompare(b.path));

  // Step: Infer PotentialArchitecturalComponents (after all files and directories are processed)
  console.log("[Analyzer] Inferring potential architectural components...");
  output.potentialArchitecturalComponents = [];

  // Rule 1-4: Based on directoryStructureSummary
  for (const dirSummary of output.directoryStructureSummary) {
    const dirPath = dirSummary.path;
    const dirName = dirPath.split('/').pop()?.toLowerCase() || "";
    let componentName = dirName.charAt(0).toUpperCase() + dirName.slice(1); // Capitalize
    let componentType: PotentialArchitecturalComponent['type'] | null = null;
    const relatedFilesFromDir: string[] = [];

    // Collect all files in this directory and its subdirectories (up to a certain depth for performance)
    // This requires iterating through filesList again or using directoryDataMap more effectively
    // For simplicity in this step, we'll use files directly under this dirSummary.path for now
    // A more robust solution would be to use the directoryDataMap to get all nested files.

    // Simplified: get files directly under this path from filesList
    filesList.forEach(file => {
        if (file.name.startsWith(dirPath === '.' ? '' : `${dirPath}/`) && !file.name.substring(dirPath === '.' ? 0 : dirPath.length + 1).includes('/')) {
            relatedFilesFromDir.push(file.name);
        } else if (dirPath === '.' && !file.name.includes('/')) { // Root files
            relatedFilesFromDir.push(file.name);
        }
    });


    const sourceCodeFilesCount = Object.entries(dirSummary.fileCounts)
      .filter(([ext]) => ['.js', '.ts', '.py', '.java', '.cs'].includes(ext.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);

    const uiFrameworkFileCount = Object.entries(dirSummary.fileCounts)
      .filter(([ext]) => ['.tsx', '.vue', '.svelte', '.jsx'].includes(ext.toLowerCase())) // .jsx added
      .reduce((sum, [, count]) => sum + count, 0);

    const configFilesCount = Object.entries(dirSummary.fileCounts)
      .filter(([ext]) => ['.json', '.yaml', '.yml', '.xml', '.properties', '.ini', '.toml', '.env'].includes(ext.toLowerCase()))
      .reduce((sum, [, count]) => sum + count, 0);

    if (['services', 'controllers', 'api', 'handlers', 'routes', 'features', 'modules'].includes(dirName) && sourceCodeFilesCount > 1) {
      componentType = 'service'; // Or 'module'
      componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
    } else if ((['components', 'ui', 'views', 'pages', 'client', 'frontend'].includes(dirName) || uiFrameworkFileCount > (relatedFilesFromDir.length / 3)) && uiFrameworkFileCount > 0 ) {
      componentType = 'ui_area';
      componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
    } else if (['models', 'entities', 'db', 'data', 'schemas', 'repositories', 'dao'].includes(dirName) && sourceCodeFilesCount > 0) {
      componentType = 'data_store_interface';
      componentName = `${componentName} ${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`;
    } else if ((['config', 'configuration', 'settings'].includes(dirName) || dirName.endsWith('_config')) && configFilesCount > 1) {
      componentType = 'module'; // Configuration module
      componentName = `${componentName} Configuration`;
    }

    if (componentType && componentName) {
        // Filter relatedFiles to include only files directly in this path for this simple rule
        const directFilesInDir = filesList.filter(f => {
            const fParent = path.dirname(f.name);
            return (dirPath === '.' && (fParent === '.' || !fParent)) || fParent === dirPath;
        }).map(f => f.name);

      if (directFilesInDir.length > 0) { // Only add if component has direct files
        output.potentialArchitecturalComponents.push({
            name: componentName,
            type: componentType,
            relatedFiles: directFilesInDir,
        });
      }
    }
  }

  // Rule 5: Based on entry_point (simplified)
  const entryPointFile = output.keyFiles?.find(kf => kf.type === 'entry_point');
  if (entryPointFile && output.projectName) {
    // Check if a general component for the project name already exists (e.g. from 'src' dir)
    const projectRootComponentName = `${output.projectName} Main Application`;
    if (!output.potentialArchitecturalComponents.find(c => c.name.toLowerCase().includes(output.projectName!.toLowerCase()))) {
        // Collect all source files not already part of other specific components for 'relatedFiles'
        // This is a simplification; a more robust way would involve dependency analysis or better grouping.
        const existingRelatedFiles = new Set(output.potentialArchitecturalComponents.flatMap(c => c.relatedFiles || []));
        const mainAppFiles = filesList
            .filter(f =>
                (f.name.endsWith('.js') || f.name.endsWith('.ts') || f.name.endsWith('.py') || f.name.endsWith('.java') || f.name.endsWith('.cs')) &&
                !f.name.toLowerCase().includes('test') &&
                !existingRelatedFiles.has(f.name) &&
                (f.name.startsWith('src/') || f.name.startsWith('app/') || !f.name.includes('/')) // Heuristic for main app files
            )
            .map(f => f.name);

        if (mainAppFiles.length > 0) {
             output.potentialArchitecturalComponents.push({
                name: projectRootComponentName,
                type: 'service', // Or 'module'
                relatedFiles: mainAppFiles,
            });
        } else if (!output.potentialArchitecturalComponents.find(c => c.type === 'service' || c.type === 'module')) {
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
    const uniqueComponents = new Map<string, PotentialArchitecturalComponent>();
    output.potentialArchitecturalComponents.forEach(comp => {
        if (!uniqueComponents.has(comp.name)) {
            uniqueComponents.set(comp.name, comp);
        } else {
            // Optional: Merge relatedFiles if component names are duplicated
            const existing = uniqueComponents.get(comp.name)!;
            existing.relatedFiles = [...new Set([...(existing.relatedFiles || []), ...(comp.relatedFiles || [])])];
        }
    });
    output.potentialArchitecturalComponents = Array.from(uniqueComponents.values());
  }
  console.log(`[Analyzer] Inferred ${output.potentialArchitecturalComponents.length} potential architectural components.`);

  // Step: Build File Dependency Graph (Conceptual - No output change in this step, but sets up for future enhancements)
    const astAnalysisResultsForDepGraph = new Map<string, { rawImports: RawASTImport[], rawExports: RawASTExport[] }>();

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

    console.log("[Analyzer] AST analysis results collected for potential dependency graph. Actual graph construction deferred.");

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
            '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json' // Added .json as it's a common import
        ];
        // Ordered index file names (without extension, to be combined with jsTsOrderedExtensions)
        const jsTsOrderedIndexNames = ['index'];

        if (language === 'javascript' || language === 'typescript') {
            const builtInNodeModules = ['fs', 'path', 'http', 'https', 'os', 'events', 'stream', 'util', 'crypto', 'zlib', 'url', 'querystring', 'assert', 'buffer', 'child_process', 'cluster', 'dgram', 'dns', 'domain', 'net', 'readline', 'repl', 'tls', 'tty', 'vm', 'string_decoder'];
            if (builtInNodeModules.includes(normalizedRawImportPath)) {
                return { targetPath: `node:${normalizedRawImportPath}`, type: 'external', originalPath: rawImportPath, resolutionDetails: "Node.js built-in module." };
            }

            if (normalizedRawImportPath.startsWith('./') || normalizedRawImportPath.startsWith('../')) { // Relative path
                const resolvedAbsolute = path.posix.resolve(importingFileDir, normalizedRawImportPath);
                let resolvedBase = path.posix.relative(projectRoot, resolvedAbsolute);
                if (resolvedBase.startsWith('../')) {
                    return { targetPath: rawImportPath, type: 'unresolved', originalPath: rawImportPath, resolutionDetails: "Resolved path is outside project root." };
                }
                if (resolvedBase === '') resolvedBase = '.'; // Handles case where importingFileDir is projectRoot

                // Attempt 1: Direct match with original path (if it includes an extension)
                if (projectFiles.includes(resolvedBase) && jsTsOrderedExtensions.some(ext => resolvedBase.endsWith(ext))) {
                    return { targetPath: resolvedBase, type: 'internal', originalPath: rawImportPath };
                }

                // Attempt 2: Try adding extensions to the resolvedBase path
                for (const ext of jsTsOrderedExtensions) {
                    const candidate = `${resolvedBase}${ext}`;
                    if (projectFiles.includes(candidate)) {
                        return { targetPath: candidate, type: 'internal', originalPath: rawImportPath };
                    }
                }

                // Attempt 3: Try as a directory (implies importing an index file)
                for (const indexName of jsTsOrderedIndexNames) {
                    for (const ext of jsTsOrderedExtensions) {
                        // Check projectFiles for path.posix.join(resolvedBase, `${indexName}${ext}`)
                        // Example: if rawImportPath is './components', resolvedBase is 'components'
                        // We check 'components/index.ts', 'components/index.js', etc.
                        const candidate = normalizePath(path.posix.join(resolvedBase, `${indexName}${ext}`));
                        if (projectFiles.includes(candidate)) {
                            return { targetPath: candidate, type: 'internal', originalPath: rawImportPath };
                        }
                    }
                }

                return { targetPath: rawImportPath, type: 'unresolved', originalPath: rawImportPath, resolutionDetails: `Could not resolve relative path: '${resolvedBase}' with JS/TS extensions or as directory index.` };
            } else {
                // For non-relative paths, assume external (NPM package).
                // Path alias (tsconfig paths) are not handled in this iteration.
                return { targetPath: `npm:${normalizedRawImportPath}`, type: 'external', originalPath: rawImportPath, resolutionDetails: "Assumed NPM package (or unhandled path alias)." };
            }
        } else if (language === 'python') {
            const pyPossibleExtensions = ['.py', '/__init__.py']; // Order: .py file, then package via __init__.py

            if (pythonImportLevel && pythonImportLevel > 0) { // Relative import: from .foo import X or from ..bar import Y
                let currentDirParts = importingFileDir === '.' ? [] : importingFileDir.split('/');
                if (pythonImportLevel > currentDirParts.length + 1) { // +1 because level 1 means same package, level 2 means parent.
                    return { targetPath: rawImportPath, type: 'unresolved', originalPath: rawImportPath, resolutionDetails: `Relative import level ${pythonImportLevel} for '${rawImportPath}' is too deep from file '${importingFilePath}'.` };
                }
                // For 'from . import X', level is 1, base is currentDirParts.
                // For 'from .. import X', level is 2, base is parent of currentDirParts.
                const baseLookupPathParts = currentDirParts.slice(0, currentDirParts.length - (pythonImportLevel - 1));

                const modulePathParts = normalizedRawImportPath ? normalizedRawImportPath.split('.') : []; // e.g. "mod" or "subpkg.mod"
                const resolvedPathAttempt = path.posix.join(...baseLookupPathParts, ...modulePathParts);

                for (const ext of pyPossibleExtensions) {
                    const candidate = normalizePath(`${resolvedPathAttempt}${ext}`);
                    if (projectFiles.includes(candidate)) {
                        return { targetPath: candidate, type: 'internal', originalPath: rawImportPath };
                    }
                }
                // Attempt to resolve if rawImportPath itself is a directory (package)
                // e.g. "from . import mypackage" -> ./mypackage/__init__.py
                 if (!normalizedRawImportPath) { // from . import X (X is likely a module in current package)
                     // This case is tricky, as X could be a module or a symbol in __init__.py
                     // For now, we assume X is a module if rawImportPath is empty.
                     // A more robust solution would require knowing what X is.
                     // This specific case (empty rawImportPath for relative imports) might need to be handled by looking at specificSymbols.
                 }


                return { targetPath: rawImportPath, type: 'unresolved', originalPath: rawImportPath, resolutionDetails: `Could not resolve Python relative import '${rawImportPath}' from '${importingFilePath}'. Attempted path: ${resolvedPathAttempt}` };

            } else { // Absolute import: import foo.bar or from foo.bar import X
                const modulePath = normalizedRawImportPath.replace(/\./g, '/');
                for (const ext of pyPossibleExtensions) {
                    const candidate = normalizePath(`${modulePath}${ext}`);
                    if (projectFiles.includes(candidate)) {
                        return { targetPath: candidate, type: 'internal', originalPath: rawImportPath };
                    }
                }
                // If not found as internal, assume external/unresolved (Python stdlib or installed package)
                // A more robust check would involve consulting a list of stdlib modules or checking installed packages.
                return { targetPath: `pypi:${normalizedRawImportPath}`, type: 'external', originalPath: rawImportPath, resolutionDetails: "Assumed PyPI package or stdlib module." };
            }
        }

        // Fallback for unknown language or unhandled case
        return { targetPath: rawImportPath, type: 'unresolved', originalPath: rawImportPath, resolutionDetails: `Unsupported language '${language}' for path resolution or unhandled case.` };
    }

    // --- File Dependency Graph Construction (Conceptual Implementation) ---

    // Helper to determine language from filePath for resolveImportPath
    const getLanguageFromPath = (filePath: string): 'javascript' | 'typescript' | 'python' | 'unknown' => {
        if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.mjs') || filePath.endsWith('.cjs')) return 'javascript';
        if (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || filePath.endsWith('.mts') || filePath.endsWith('.cts')) return 'typescript';
        if (filePath.endsWith('.py')) return 'python';
        return 'unknown';
    }

    async function buildDependencyGraph(
        analyzedFilesData: Map<string, { rawImports: RawASTImport[], rawExports: RawASTExport[] }>,
        projectFilesList: string[]
    ): Promise<Map<string, FileDependencyNode>> {
        const graph = new Map<string, FileDependencyNode>();

        // Initialize graph nodes
        for (const filePath of projectFilesList) {
            // Only create nodes for files that might have AST analysis results or are source files
            const lang = getLanguageFromPath(filePath);
            if (lang !== 'unknown' || analyzedFilesData.has(filePath)) { // Ensure we only process relevant files
                 graph.set(filePath, {
                    filePath,
                    imports: [],
                    // Populate exports from analyzedFilesData if available, otherwise empty
                    exports: analyzedFilesData.get(filePath)?.rawExports.map(ex => ({
                        name: ex.name,
                        type: ex.type, // RawASTExport type should be compatible or mapped
                        isDefaultExport: ex.isDefaultExport,
                    })) || [],
                    importedBy: [],
                });
            }
        }

        console.log(`[DepGraph] Initialized ${graph.size} nodes for dependency graph.`);

        // Process imports for each file
        for (const [filePath, data] of analyzedFilesData.entries()) {
            const sourceNode = graph.get(filePath);
            if (!sourceNode) continue; // Should not happen if initialized correctly

            const language = getLanguageFromPath(filePath);
            if (language === 'unknown') continue; // Cannot resolve imports for unknown language

            for (const rawImp of data.rawImports) {
                const resolved = resolveImportPath(filePath, rawImp.originalPath, language, projectFilesList, rawImp.pythonImportLevel);

                if (resolved) {
                    sourceNode.imports.push({
                        targetPath: resolved.targetPath,
                        type: resolved.type,
                        originalPath: resolved.originalPath,
                        specificSymbols: rawImp.importedSymbols, // Keep original symbols from RawASTImport
                        // resolutionDetails: resolved.resolutionDetails, // Optionally include for debugging
                    });

                    if (resolved.type === 'internal' && graph.has(resolved.targetPath)) {
                        const targetNode = graph.get(resolved.targetPath)!;
                        if (!targetNode.importedBy.includes(filePath)) {
                            targetNode.importedBy.push(filePath);
                        }
                    } else if (resolved.type === 'internal' && !graph.has(resolved.targetPath)) {
                        // This case might happen if a project file was imported but not part of the initial set of files
                        // for which nodes were created (e.g. if it wasn't a JS/TS/PY file but still part of the projectFilesList).
                        // Or if projectFilesList contains files not in analyzedFilesData keys.
                        console.warn(`[DepGraph] Internal import target '${resolved.targetPath}' not found in graph nodes. Source: ${filePath}, Import: ${rawImp.originalPath}`);
                         // Optionally, add a minimal node for it if it's in projectFilesList
                        if (projectFilesList.includes(resolved.targetPath) && !graph.has(resolved.targetPath)) {
                            graph.set(resolved.targetPath, {
                                filePath: resolved.targetPath,
                                imports: [],
                                exports: [], // Unknown exports for non-analyzed files
                                importedBy: [filePath],
                            });
                             console.log(`[DepGraph] Added missing target node to graph: ${resolved.targetPath}`);
                        }
                    }
                } else {
                    // Should not happen if resolveImportPath always returns a ResolvedImport object
                     sourceNode.imports.push({
                        targetPath: rawImp.originalPath,
                        type: 'unresolved',
                        originalPath: rawImp.originalPath,
                        specificSymbols: rawImp.importedSymbols,
                        resolutionDetails: "resolveImportPath returned null unexpectedly.",
                    });
                }
            }
        }
        console.log("[DepGraph] Finished processing imports with actual resolveImportPath.");
        return graph;
    }

    const projectFilePaths = filesList.map(f => f.name);
    const dependencyGraph = await buildDependencyGraph(astAnalysisResultsForDepGraph, projectFilePaths);

    if (dependencyGraph) {
      console.log(`[Analyzer] Dependency graph constructed with ${dependencyGraph.size} nodes.`);
      let internalEdges = 0;
      dependencyGraph.forEach(node => {
        node.imports.forEach(imp => {
          if (imp.type === 'internal') internalEdges++;
        });
      });
      console.log(`[Analyzer] Dependency graph contains ${internalEdges} internal import edges.`);

      // For debugging, print details for a few nodes
      let i = 0;
      for (const [filePath, node] of dependencyGraph.entries()) {
        if (i < 3 && (node.imports.length > 0 || node.exports.length > 0)) {
          console.log(`[DepGraph Node Sample]: ${filePath}`, {
            imports: node.imports.filter(imp => imp.type === 'internal').slice(0,3).map(i => `${i.originalPath} -> ${i.targetPath} (${i.type})`),
            exports: node.exports.slice(0,5).map(e => e.name),
            importedByCount: node.importedBy.length
          });
          i++;


        if (!directoryDataMap.has(currentPath)) {
          const pathDepth = currentPath.split('/').length;
          directoryDataMap.set(currentPath, { files: [], subDirectoryNames: new Set(), fileCounts: {}, depth: pathDepth });
        }
      }
    }
  }

  output.directoryStructureSummary = [];
  const MAX_DIR_DEPTH_FOR_SUMMARY = 3; // Configure max depth for summary to avoid excessive detail

  for (const [dirPath, data] of directoryDataMap.entries()) {
    if (data.depth > MAX_DIR_DEPTH_FOR_SUMMARY && dirPath !== '.') continue; // Skip very deep directories unless it's root

    let inferredPurpose = "General";
    const lowerDirPath = dirPath.toLowerCase();
    const dirName = dirPath.split('/').pop()?.toLowerCase() || "";

    if (dirName === 'src' || dirName === 'source' || dirName === 'app') inferredPurpose = "Source Code";
    else if (dirName === 'tests' || dirName === '__tests__') inferredPurpose = "Tests";
    else if (dirName === 'services') inferredPurpose = "Service Layer";
    else if (dirName === 'components' || dirName === 'ui' || dirName === 'views' || dirName === 'pages') inferredPurpose = "UI Components/Views";
    else if (dirName === 'utils' || dirName === 'helpers' || dirName === 'lib') inferredPurpose = "Utilities/Libraries";
    else if (dirName === 'config' || dirName === 'configuration') inferredPurpose = "Configuration";
    else if (dirName === 'docs' || dirName === 'documentation') inferredPurpose = "Documentation";
    else if (dirName === 'assets' || dirName === 'static' || dirName === 'public') inferredPurpose = "Static Assets";
    else if (dirName === 'models' || dirName === 'domain' || dirName === 'entities') inferredPurpose = "Data Models/Entities";
    else if (dirName === 'routes' || dirName === 'controllers' || dirName === 'api') inferredPurpose = "API Routes/Controllers";
    else if (dirName === 'hooks') inferredPurpose = "React Hooks";
    else if (dirName === 'styles' || dirName === 'css' || dirName === 'scss') inferredPurpose = "Stylesheets";
    else if (dirName === 'scripts') inferredPurpose = "Build/Utility Scripts";
    else if (dirName === 'data' || dirName === 'database' || dirName === 'db') inferredPurpose = "Data/Database related";
     // Add more heuristics based on common directory names

    // Heuristic based on dominant file types within the directory
    if (data.fileCounts['.js'] > (data.files.length / 2) || data.fileCounts['.ts'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "JavaScript/TypeScript Modules" : `${inferredPurpose} (JS/TS)`;
    if (data.fileCounts['.py'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "Python Modules" : `${inferredPurpose} (Python)`;
    if (data.fileCounts['.java'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "Java Code" : `${inferredPurpose} (Java)`;
    if (data.fileCounts['.cs'] > (data.files.length / 2)) inferredPurpose = inferredPurpose === "General" ? "C# Code" : `${inferredPurpose} (C#)`;
    if (data.fileCounts['.md'] > (data.files.length / 2) && dirName !== 'docs') inferredPurpose = inferredPurpose === "General" ? "Markdown Documentation" : `${inferredPurpose} (Markdown)`;

    // Only add if it has files or subdirectories, or it's the root.
    if (dirPath === '.' || data.files.length > 0 || data.subDirectoryNames.size > 0) {
        output.directoryStructureSummary.push({
            path: dirPath,
            fileCounts: data.fileCounts,
            inferredPurpose: inferredPurpose,
        });
    }
  }
  // Sort by path to make it more readable
  output.directoryStructureSummary.sort((a, b) => a.path.localeCompare(b.path));



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
    // Check size before converting to text
    const MAX_DOWNLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for single file download for text
    if (data.size > MAX_DOWNLOAD_FILE_SIZE_BYTES) {
      console.warn(`File ${fullFilePath} (size: ${data.size} bytes) exceeds download size limit of ${MAX_DOWNLOAD_FILE_SIZE_BYTES} bytes. Skipping text conversion.`);
      // Returning null for text, but the caller might try as buffer if needed.
      // Or, we could throw an error here to be more explicit. For now, returning null.
      return null;
    }
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
    const MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER = 20 * 1024 * 1024; // 20 MB limit for buffer (e.g. for binaries, allow slightly larger)
    if (data.size > MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER) {
      console.warn(`File ${fullFilePath} (size: ${data.size} bytes) exceeds download size limit of ${MAX_DOWNLOAD_FILE_SIZE_BYTES_BUFFER} bytes for buffer. Skipping.`);
      return null;
    }
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

      const isLikelyText = /\.(txt|json|md|xml|html|css|js|ts|py|java|cs|c|cpp|h|hpp|sh|yaml|yml|toml)$/i.test(zipEntry.entryName);
      try {
          const contentBuffer = zipEntry.getData(); // This actually performs decompression for this entry
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
    return { files, entryErrors };
  } catch (error: any) {
    console.error("Critical error unpacking ZIP buffer:", error);
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