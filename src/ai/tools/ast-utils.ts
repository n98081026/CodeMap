// src/ai/tools/ast-utils.ts
import type {
  DetailedNode,
  ExtractedCodeElement,
} from './project-analyzer-tool';

import {
  summarizeCodeElementPurposeFlow,
  type SummarizeCodeElementInput,
} from '@/ai/flows';
// Assuming these types are exported from project-analyzer-tool.ts or a shared types file

// Unified Summarization Task Interface
// We use Omit to avoid issues if astNode types are too different or not needed by the summarizer
export interface SummarizationTaskInfo {
  uniqueId: string;
  inputForFlow: SummarizeCodeElementInput;
  originalNodeInfo: Omit<
    ExtractedCodeElement,
    'astNode' | 'localCalls' | 'semanticPurpose'
  >;
  nodeType: 'function' | 'class';
}

export async function batchSummarizeElements(
  tasks: SummarizationTaskInfo[],
  fileName: string // fileName is part of task.inputForFlow.filePath, consider removing if redundant
): Promise<Map<string, string>> {
  const summarizationPromises = tasks.map((task) =>
    summarizeCodeElementPurposeFlow
      .run(task.inputForFlow)
      .then((summaryResult) => ({
        uniqueId: task.uniqueId,
        semanticSummary:
          summaryResult.semanticSummary ||
          'Purpose unclear from available data.',
      }))
      .catch((error) => {
        console.warn(
          `[AST Utils] Error summarizing ${task.nodeType} ${task.originalNodeInfo.name} in ${task.inputForFlow.filePath || fileName}: ${error.message}`
        );
        return {
          uniqueId: task.uniqueId,
          semanticSummary: 'Error during semantic summarization.',
        };
      })
  );
  const allSummaryResults = await Promise.all(summarizationPromises);
  return new Map(allSummaryResults.map((r) => [r.uniqueId, r.semanticSummary]));
}

export function createDetailedNodeFromExtractedElement(
  element: ExtractedCodeElement, // This element should have semanticPurpose populated after batchSummarizeElements
  uniqueId: string,
  languagePrefix: 'js' | 'ts' | 'py'
): DetailedNode {
  let details = `${element.semanticPurpose || 'Semantic purpose not determined.'}\n`;
  if (element.kind !== 'variable' && element.kind !== 'property') {
    details += `Visibility: ${element.isExported ? (element.isDefaultExport ? 'Default Export' : 'Exported') : 'Local/Not Exported'}. `;
  }

  if (element.kind === 'function' || element.kind === 'method') {
    details += `Signature: (${element.params?.map((p) => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ') || ''})${element.returnType ? ` -> ${element.returnType}` : ''}. `;
    if (element.isAsync) details += `Async. `;
  } else if (element.kind === 'class') {
    if (element.superClass) details += `Extends: ${element.superClass}. `;
    if (
      element.implementedInterfaces &&
      element.implementedInterfaces.length > 0
    )
      details += `Implements: ${element.implementedInterfaces.join(', ')}. `;
    if (element.classProperties && element.classProperties.length > 0) {
      details += `Properties: ${element.classProperties.join(', ')}. `;
    }
    if (element.classMethods && element.classMethods.length > 0) {
      details += `Methods: ${element.classMethods.join(', ')}. `;
    }
  } else if (element.kind === 'variable' || element.kind === 'property') {
    // Also covers module-level variables
    details += `Type: ${element.dataType || 'Unknown'}. `;
    if (element.value) details += `Initial Value (Preview): ${element.value}. `; // Value is already truncated
    if (element.isExported !== undefined)
      details += `Exported: ${element.isExported}. `;
  }

  if (element.decorators && element.decorators.length > 0) {
    details += `Decorators: ${element.decorators.join(', ')}. `;
  }
  if (element.comments)
    details += `Docstring/Comments: Present (see structuredInfo).`;
  else details += `Docstring/Comments: None.`;

  if (element.localCalls && element.localCalls.length > 0) {
    details += `\nLocal Calls: ${element.localCalls.map((call) => `${call.targetParentName ? `${call.targetParentName}.` : ''}${call.targetName}() (line ${call.line})`).join(', ')}.`;
  }

  // Remove heavy or circular astNode from structuredInfo before creating the DetailedNode
  const { astNode, ...structuredInfoForNode } = element;

  return {
    id: uniqueId,
    label: `${element.name} (${element.kind})`,
    type: `${languagePrefix}_${element.kind}`,
    details: details.trim(),
    lineNumbers:
      element.startLine && element.endLine
        ? `${element.startLine}-${element.endLine}`
        : undefined,
    structuredInfo: structuredInfoForNode,
  };
}
