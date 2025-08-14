'use client';

import { useState, useCallback } from 'react';

import { useToast } from './use-toast';

import type {
  AskQuestionAboutNodeInput,
  AskQuestionAboutNodeOutput,
  ExtractConceptsOutput,
  SuggestRelationsOutput,
  ExpandConceptOutput,
  RewriteNodeContentOutput,
} from '@/ai/flows/types';
import type { StagedMapDataWithContext } from '@/stores/concept-map-store';
import type { ConceptMapNode, ConceptMapEdge } from '@/types';

import { runFlow } from '@/ai/flows';
import { useConceptMapStore } from '@/stores/concept-map-store';

type AICommand =
  | 'extractConcepts'
  | 'suggestRelations'
  | 'expandConcept'
  | 'rewriteNode'
  | 'askQuestion';

interface RewriteModalState {
  isOpen: boolean;
  nodeId: string | null;
  originalContent: string | null;
  rewrittenContent: string | null;
}

export function useConceptMapAITools() {
  const { toast } = useToast();
  const {
    mapData,
    setStagedMapData,
    addNode: addNodeToMap,
    addEdge: addEdgeToMap,
    updateNode,
    addDebugLog,
  } = useConceptMapStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] =
    useState(false);
  const [isQuickClusterModalOpen, setIsQuickClusterModalOpen] = useState(false);
  const [isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen] =
    useState(false);
  const [textForExtraction, setTextForExtraction] = useState('');

  const [rewriteModalState, setRewriteModalState] = useState<RewriteModalState>(
    {
      isOpen: false,
      nodeId: null,
      originalContent: null,
      rewrittenContent: null,
    }
  );

  const executeAICommand = useCallback(
    async <T, U>(
      command: AICommand,
      payload: T,
      options?: {
        successTitle: string;
        successDescription: string;
        errorTitle: string;
      }
    ): Promise<U | null> => {
      setIsProcessing(true);
      setError(null);
      const { id: toastId } = toast({
        title: 'AI Processing...',
        description: `Running ${command}...`,
      });

      try {
        const result = await runFlow<T, U>(command, payload);
        toast({
          title: options?.successTitle || 'AI Task Successful',
          description: options?.successDescription || 'The AI task completed.',
        });
        return result;
      } catch (err) {
        const error = err as Error & { details?: unknown };
        console.error(`Error executing AI command ${command}:`, error);
        setError(error.message);
        toast({
          title: options?.errorTitle || 'AI Task Failed',
          description: error.message,
          variant: 'destructive',
        });
        return null;
      } finally {
        setIsProcessing(false);
        if (toastId) {
          // You might need a way to dismiss the toast if your toast implementation supports it
        }
      }
    },
    [toast]
  );

  const handleExtractConcepts = useCallback(
    async (params: { context: string }) => {
      const result = await executeAICommand<
        { context: string },
        ExtractConceptsOutput
      >('extractConcepts', params, {
        successTitle: 'Concepts Extracted',
        successDescription: 'Review the new concepts in the staging area.',
        errorTitle: 'Error Extracting Concepts',
      });

      if (result && result.concepts) {
        const newNodes: ConceptMapNode[] = result.concepts.map(
          (concept, index) => {
            // Simple placement logic to arrange new nodes in a row
            const x = index * 170 + 50; // 150 width + 20 padding
            const y = 400; // A fixed Y position for the staging row
            return {
              id: `staged-${Date.now()}-${index}`,
              text: String(concept.text),
              x: Number(x),
              y: Number(y),
              details: String(concept.reason),
              type: 'ai-concept',
            };
          }
        );

        setStagedMapData({
          nodes: newNodes,
          edges: [],
          actionType: 'extractConcepts',
        });
      }
    },
    [executeAICommand, setStagedMapData]
  );

  const handleSuggestRelations = useCallback(async () => {
    const result = await executeAICommand<{}, SuggestRelationsOutput>(
      'suggestRelations',
      {},
      {
        successTitle: 'Relations Suggested',
        successDescription: 'Review the new relations in the staging area.',
        errorTitle: 'Error Suggesting Relations',
      }
    );

    if (result && result.relations) {
      const newEdges: ConceptMapEdge[] = result.relations
        .filter(
          (relation) =>
            mapData.nodes.some((n) => n.id === relation.sourceNodeId) &&
            mapData.nodes.some((n) => n.id === relation.targetNodeId)
        )
        .map((relation) => ({
          id: `staged-${Date.now()}`,
          source: relation.sourceNodeId,
          target: relation.targetNodeId,
          label: relation.label,
          details: relation.reason, // Correctly assign details to the edge
        }));

      setStagedMapData({
        nodes: [],
        edges: newEdges,
        actionType: 'suggestRelations',
      });
    }
  }, [executeAICommand, mapData.nodes, setStagedMapData]);

  const openExpandConceptModal = (nodeId: string) => {
    handleExpandConcept(nodeId);
  };

  const handleExpandConcept = useCallback(
    async (nodeId: string) => {
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const result = await executeAICommand<
        { concept: string; context: string },
        ExpandConceptOutput
      >(
        'expandConcept',
        { concept: node.text, context: node.details || '' },
        {
          successTitle: 'Concept Expanded',
          successDescription:
            'Review the new child concepts in the staging area.',
          errorTitle: 'Error Expanding Concept',
        }
      );

      if (result && result.newConcepts) {
        const parentNode = node;
        const newNodes: ConceptMapNode[] = result.newConcepts.map(
          (concept, index) => {
            // Simple placement logic: circle around the parent node
            const angle = (index / result.newConcepts.length) * 2 * Math.PI;
            const x = (parentNode.x ?? 0) + 200 * Math.cos(angle);
            const y = (parentNode.y ?? 0) + 150 * Math.sin(angle);
            return {
              id: `staged-${Date.now()}-${index}`,
              text: concept.text,
              x,
              y,
              details: concept.reason,
              type: 'ai-expanded',
            };
          }
        );

        const newEdges: ConceptMapEdge[] = newNodes.map((newNode) => ({
          id: `staged-edge-${Date.now()}-${newNode.id}`,
          source: parentNode.id,
          target: newNode.id,
          label:
            result.edges?.find((e) => e.target === newNode.text)?.label ||
            'related to',
        }));

        setStagedMapData({
          nodes: newNodes,
          edges: newEdges,
          actionType: 'expandConcept',
        });
      }
    },
    [executeAICommand, mapData.nodes, setStagedMapData]
  );

  const openRewriteNodeContentModal = useCallback(
    (nodeId: string) => {
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setRewriteModalState({
        isOpen: true,
        nodeId,
              originalContent: `${node.text}\n\n${node.details || ''}`,
        rewrittenContent: null,
      });
    },
    [mapData.nodes]
  );

  const handleRewriteNodeContent = useCallback(
    async (style: string, customInstruction?: string) => {
      if (!rewriteModalState.nodeId || !rewriteModalState.originalContent)
        return;

      const result = await executeAICommand<unknown, RewriteNodeContentOutput>(
        'rewriteNode',
        {
          text: rewriteModalState.originalContent,
          style,
          customInstruction,
        },
        {
          successTitle: 'Content Rewritten',
          successDescription: 'The content has been updated in the modal.',
          errorTitle: 'Error Rewriting Content',
        }
      );

      if (result) {
        setRewriteModalState((prev) => ({
          ...prev,
          rewrittenContent: result.rewrittenText,
        }));
      }
    },
    [executeAICommand, rewriteModalState]
  );

  const askQuestionAboutNode = useCallback(
    async (
      nodeId: string,
      nodeText: string,
      nodeDetails: string | undefined,
      nodeType: string | undefined,
      question: string
    ): Promise<AskQuestionAboutNodeOutput> => {
      try {
        const result = await executeAICommand<
          AskQuestionAboutNodeInput,
          AskQuestionAboutNodeOutput
        >(
          'askQuestion',
          {
            nodeId,
            nodeText,
            nodeDetails,
            nodeType,
            question,
          },
          {
            successTitle: 'AI Answer Received',
            successDescription: 'The AI has provided an answer.',
            errorTitle: 'Error Asking Question',
          }
        );
        return result || { answer: 'No answer from AI.', error: 'No result' };
      } catch (error) {
        return {
          answer: 'Failed to get an answer.',
          error: (error as Error).message,
        };
      }
    },
    [executeAICommand]
  );

  const openAskQuestionModal = (nodeId: string) => {
    // This will be used to open a modal for asking questions.
    // The modal will then use the `askQuestionAboutNode` function.
    console.log('Opening ask question modal for node:', nodeId);
  };

  const handleQuickCluster = useCallback(async (params: {}) => {
    // Implementation for quick cluster
    // This will involve getting selected nodes from the store
    return { success: true };
  }, []);

  const handleGenerateSnippetFromText = useCallback(
    async (params: { text: string }) => {
      // Implementation for generating snippet from text
      return { success: true };
    },
    []
  );

  // ... other AI tool handlers

  return {
    isProcessing,
    error,
    isExtractConceptsModalOpen,
    setIsExtractConceptsModalOpen,
    isQuickClusterModalOpen,
    setIsQuickClusterModalOpen,
    isGenerateSnippetModalOpen,
    setIsGenerateSnippetModalOpen,
    textForExtraction,
    setTextForExtraction,
    handleExtractConcepts,
    handleSuggestRelations,
    openExpandConceptModal,
    rewriteModalState,
    setRewriteModalState,
    openRewriteNodeContentModal,
    handleRewriteNodeContent,
    askQuestionAboutNode,
    openAskQuestionModal,
    handleQuickCluster,
    handleGenerateSnippetFromText,
  };
}
