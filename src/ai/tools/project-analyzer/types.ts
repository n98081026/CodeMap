// This file contains shared type definitions for the project analyzer tool.

import ts from 'typescript';

// --- Input/Output Schemas for the main tool --- //

export interface ProjectAnalysisInput {
  projectStoragePath: string; // e.g., 'user-uploads/project-x.zip' or a directory path
  userHint?: string; // e.g., 'Analyze the auth flow', 'focus on React components', or internal hints like '_USE_MOCK_...'
}

export interface ProjectAnalysisOutput {
  projectName: string;
  inferredLanguagesFrameworks: string[];
  projectSummary: string;
  dependencies: Record<string, string>;
  directoryStructureSummary: Array<{ path: string; type: 'file' | 'dir' }>;
  keyFiles: Array<{ filePath: string; reason: string; analysis: FileAnalysis }>;
  potentialArchitecturalComponents: Array<{ name: string; files: string[] }>;
  parsingErrors?: string[];
  error?: string; // For fatal errors during analysis
}

// --- Analysis result for a single file --- //

export interface FileAnalysis {
  filePath: string;
  fileType: string;
  analysisSummary: string;
  detailedNodes: DetailedNode[];
  rawImports: RawASTImport[];
  rawExports: RawASTExport[];
  error?: string; // For errors specific to this file's analysis
}

// --- Detailed information for a single code element (function, class, etc.) --- //

export interface DetailedNode {
  id: string; // e.g., 'ts_class_MyClass_0'
  label: string; // e.g., 'MyClass (class)'
  type: string; // e.g., 'ts_class', 'py_function', 'config_root'
  details: string; // LLM-generated summary or structured details
  lineNumbers?: string; // e.g., '10-25'
  structuredInfo?: ExtractedCodeElement; // Rich, structured data
}

// --- Generic representation of an extracted code element from AST --- //

export interface ExtractedCodeElement {
  name: string;
  kind: string; // 'function', 'class', 'method', 'variable', 'interface', 'type_alias', etc.
  startLine: number;
  endLine: number;
  isExported?: boolean;
  isDefaultExport?: boolean;
  isAsync?: boolean;
  comments?: string;
  parentName?: string; // For methods, the class name
  astNode?: ts.Node; // Reference to the original AST node (to be removed before final output)

  // Function/Method specific
  params?: ExtractedParam[];
  returnType?: string;

  // Class specific
  superClass?: string;
  implementedInterfaces?: string[];
  classMethods?: string[] | ExtractedMethod[]; // Can be simple names or full structures
  classProperties?: string[] | ExtractedProperty[];

  // Variable specific
  dataType?: string;
  value?: string;

  // Other
  semanticPurpose?: string; // For nodes not summarized, e.g., 'Not summarized by type.'
  localCalls?: LocalCall[];
}

// --- Supporting types for ExtractedCodeElement --- //

export interface ExtractedParam {
  name: string;
  type?: string;
  defaultValue?: string;
}

export interface ExtractedProperty {
  name: string;
  type?: string;
  isStatic?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface ExtractedMethod {
  name: string;
  params: ExtractedParam[];
  returnType?: string;
  isStatic?: boolean;
  isAsync?: boolean;
  accessibility?: 'public' | 'private' | 'protected';
}

export interface LocalCall {
  targetName: string;
  targetType: 'function' | 'method';
  targetParentName?: string; // e.g., class name for method, module for imported function
  line: number;
}

// --- Standardized Import/Export structures --- //

export interface RawASTImport {
  originalPath: string;
  importedSymbols?: string[];
  isDefaultImport?: boolean;
  isNamespaceImport?: boolean;
  pythonImportLevel?: number; // For Python relative imports
  sourceFile: string;
}

export interface RawASTExport {
  name: string;
  type:
    | 'function'
    | 'class'
    | 'variable'
    | 'interface'
    | 'enum'
    | 'type_alias'
    | 're-export'
    | 'unknown';
  isDefaultExport?: boolean;
  reExportedFrom?: string; // For `export ... from` statements
  sourceFile: string;
}

// --- Types for the AI summarization flow --- //

export interface SummarizeCodeElementInput {
  elementType: 'function' | 'class';
  elementName: string;
  filePath: string;
  codeBlock?: string; // Optional, might be too large
  signature?: string;
  comments?: string;
  isExported?: boolean;
  classMethods?: string[];
  classProperties?: string[];
}

export interface SummarizeCodeElementOutput {
  summary: string;
}

export interface SummarizationTaskInfo {
  uniqueId: string;
  inputForFlow: SummarizeCodeElementInput;
  originalNodeInfo: ExtractedCodeElement;
  nodeType: 'function' | 'class' | 'variable'; // Added variable for potential future use
}
