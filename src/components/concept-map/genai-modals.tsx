/*
'use client';

import React from 'react';

import { ExtractConceptsModal } from './extract-concepts-modal';
import { GenerateSnippetModal } from './generate-snippet-modal';
import { MapSummaryModal } from './map-summary-modal';
import { QuickClusterModal } from './quick-cluster-modal';
import { RewriteNodeContentModal } from './rewrite-node-content-modal';
import { AskQuestionAboutEdgeModal } from './AskQuestionAboutEdgeModal';
import { SuggestIntermediateNodeModal } from './suggest-intermediate-node-modal';

import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';

interface GenAIModalsProps {
  mapId: string;
}

export const GenAIModals: React.FC<GenAIModalsProps> = ({ mapId }) => {
  const aiTools = useConceptMapAITools(mapId);

  return (
    <>
      <ExtractConceptsModal
        isOpen={aiTools.isExtractConceptsModalOpen}
        onOpenChange={aiTools.setIsExtractConceptsModalOpen}
        onConfirm={aiTools.handleExtractConcepts}
        isLoading={aiTools.isProcessing}
        contextText={aiTools.textForExtraction}
      />
      <QuickClusterModal
        isOpen={aiTools.isQuickClusterModalOpen}
        onOpenChange={aiTools.setIsQuickClusterModalOpen}
        onConfirm={aiTools.handleQuickCluster}
        isLoading={aiTools.isProcessing}
      />
      <GenerateSnippetModal
        isOpen={aiTools.isGenerateSnippetModalOpen}
        onOpenChange={aiTools.setIsGenerateSnippetModalOpen}
        onConfirm={aiTools.handleGenerateSnippetFromText}
        isLoading={aiTools.isProcessing}
      />
      <MapSummaryModal
        isOpen={aiTools.isSummarizeMapModalOpen}
        onOpenChange={aiTools.setIsSummarizeMapModalOpen}
        onConfirm={() => aiTools.handleSummarizeMap()}
        isLoading={aiTools.isProcessing}
        summary={aiTools.mapSummary}
      />
      <RewriteNodeContentModal
        isOpen={!!aiTools.rewriteModalState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setRewriteModalState((prev) => ({ ...prev, isOpen }))
        }
        onConfirm={(style, customInstruction) =>
          aiTools.handleRewriteNodeContent(style, customInstruction)
        }
        isLoading={aiTools.isProcessing}
        originalContent={aiTools.rewriteModalState.originalContent}
        rewrittenContent={aiTools.rewriteModalState.rewrittenContent}
        nodeId={aiTools.rewriteModalState.nodeId}
      />
      <AskQuestionAboutEdgeModal
        isOpen={!!aiTools.askQuestionAboutEdgeState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setAskQuestionAboutEdgeState((prev) => ({ ...prev, isOpen }))
        }
        edgeContext={aiTools.askQuestionAboutEdgeState.edgeContext}
        onSubmitQuestion={aiTools.handleAskQuestionAboutEdge}
        isLoading={aiTools.isProcessing}
        answer={aiTools.askQuestionAboutEdgeState.answer}
        onCloseModal={() =>
          aiTools.setAskQuestionAboutEdgeState({
            isOpen: false,
            edgeContext: null,
            answer: null,
          })
        }
      />
      <SuggestIntermediateNodeModal
        isOpen={!!aiTools.suggestIntermediateNodeState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setSuggestIntermediateNodeState((prev) => ({
            ...prev,
            isOpen,
          }))
        }
        edgeInfo={aiTools.suggestIntermediateNodeState.edgeInfo}
        suggestions={aiTools.suggestIntermediateNodeState.suggestions}
        isLoading={aiTools.isProcessing}
        onConfirm={(suggestion) =>
          aiTools.confirmAddIntermediateNode(suggestion)
        }
      />
    </>
  );
};
*/
export {};
