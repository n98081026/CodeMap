/**
 * @fileOverview A Genkit tool to analyze project structure.
 * This tool can now perform real analysis for Node.js, Python, and C# projects
 * by fetching files from Supabase Storage, and performs content analysis based on file type,
 * including AST-based analysis for JavaScript, TypeScript, and Python.
 */

import { defineTool } from '@genkit-ai/core';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import { z } from 'zod';

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

export type EffectiveFileType =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'markdown'
  | 'json'
  | 'html'
  | 'css'
  | 'unknown'
  // Project-specific file types
  | 'package.json'
  | 'pom_xml'
  | 'csproj_file'
  | 'gradle_script'
  | 'dockerfile'
  | 'docker_compose_config'
  | 'github_workflow_yaml'
  | 'gitlab_ci_yaml'
  | 'cicd_script_yaml'
  | 'generic.json'
  | 'shell_script'
  | 'env_config'
  | 'xml_config'
  | 'text_config'
  | 'text'
  | 'binary';

// Internal types not part of the output schema
export interface FileAnalysisResult {
  fileName: string;
  path: string;
  fileType: EffectiveFileType;
  summary: string;
  nodes: DetailedNode[];
}

import {
  batchSummarizeElements,
  createDetailedNodeFromExtractedElement,
} from './ast-utils';
import {
  RawASTImport,
  RawASTExport,
  SummarizationTaskInfo,
  ExtractedCodeElement,
} from './project-analyzer/types';

// Schemas and types are now imported from types.ts
export {
  ProjectAnalysisInputSchema,
  ProjectAnalysisOutputSchema,
  projectStructureAnalyzerTool,
};
export type {
  ProjectAnalysisInput,
  ProjectAnalysisOutput,
  DetailedNode,
  ExtractedCodeElement,
};

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
        inputForFlow: { elementType: 'function', elementName: name, filePath: fileName, comments: element.comments || '', isExported: element.isExported },
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
              comments: element.comments || '',
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
    },
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
          comments: classElement.comments || '',
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
      },
    });
  }

  // Create a combined summary
  let finalAnalysisSummary = `JavaScript file '${fileName}' analyzed. Found ${localDefinitions.length} local definitions, ${rawImportsOutput.length} imports, ${rawExportsOutput.length} exports.`;

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
        task.error
        // task.inputForFlow.codeSnippet // Ensure this path is correct and codeSnippet is available
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
}

async function analyzeProject(
  input: ProjectAnalysisInput
): Promise<ProjectAnalysisOutput> {
  // This is a placeholder implementation.
  // In a real implementation, you would fetch the project from Supabase,
  // analyze the files, and return the analysis output.
  return {
    analysisDateTime: new Date().toISOString(),
    projectSummary: 'This is a mock project summary.',
    inferredLanguages: ['typescript', 'javascript'],
    inferredTechnologies: ['react', 'next.js', 'genkit'],
    directoryStructure: {
      'src/': {
        'ai/': {
          'flows/': {},
          'tools/': {},
        },
      },
    },
    directorySummaries: [],
    keyFiles: [],
    potentialArchitecturalComponents: [],
    fileDependencies: {
      nodes: [],
      edges: [],
    },
  };
}

const projectStructureAnalyzerTool = defineTool(
  {
    name: 'projectStructureAnalyzerTool',
    description: 'Analyzes the structure of a software project.',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  analyzeProject
);
