import { z } from 'zod';
import type {
  DetailedNode,
  ExtractedCodeElement,
} from './project-analyzer-tool';

import { runFlow } from '@genkit-ai/flow';
import {
  summarizeCodeElementPurposeFlow,
  SummarizeCodeElementPurposeInputSchema,
} from '@/ai/flows';
// Assuming these types are exported from project-analyzer-tool.ts or a shared types file

// Unified Summarization Task Interface
// We use Omit to avoid issues if astNode types are too different or not needed by the summarizer
export interface SummarizationTaskInfo {
  uniqueId: string;
  inputForFlow: z.infer<typeof SummarizeCodeElementPurposeInputSchema>;
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
    runFlow(summarizeCodeElementPurposeFlow, task.inputForFlow)
      .then((summaryResult: { summary?: string }) => ({
        uniqueId: task.uniqueId,
        semanticSummary:
          summaryResult.summary ||
          'Purpose unclear from available data.',
      }))
      .catch((error: unknown) => {
        console.warn(
          `[AST Utils] Error summarizing ${task.nodeType} ${task.originalNodeInfo.name} in ${task.inputForFlow.filePath || fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        return {
          uniqueId: task.uniqueId,
          semanticSummary: 'Error during semantic summarization.',
        };
      })
  );
  const allSummaryResults = await Promise.all(summarizationPromises);
  return new Map(allSummaryResults.map((r: { uniqueId: string; semanticSummary: string }) => [r.uniqueId, r.semanticSummary]));
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
    code: '',
    summary: '',
    filePath: '',
    startLine: 0,
    endLine: 0,
  };
}
