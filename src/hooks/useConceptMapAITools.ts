'use client';

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
import {
  DagreLayoutUtility,
  type NodeLayoutInput,
  type EdgeLayoutInput,
  type DagreLayoutOptions,
} from '@/lib/dagreLayoutUtility';
import {
  extractConcepts as aiExtractConcepts,
  type ExtractConceptsInput,
  type ExtractConceptsOutput,
  type ExtractedConceptItem,
  suggestRelations as aiSuggestRelations,
  type SuggestRelationsInput,
  type SuggestRelationsOutput,
  expandConcept as aiExpandConcept,
  type ExpandConceptInput,
  type ExpandConceptOutput,
  askQuestionAboutNode as aiAskQuestionAboutNode,
  type AskQuestionAboutNodeOutput,
  type AskQuestionAboutNodeInput,
  generateQuickCluster as aiGenerateQuickCluster,
  type GenerateQuickClusterInput,
  type GenerateQuickClusterOutput,
  generateMapSnippetFromText as aiGenerateMapSnippetFromText,
  type GenerateMapSnippetInput,
  type GenerateMapSnippetOutput,
  summarizeNodes as aiSummarizeNodes,
  type SummarizeNodesInput,
  type SummarizeNodesOutput,
  suggestEdgeLabelFlow,
  type SuggestEdgeLabelInput,
  type SuggestEdgeLabelOutput,
  suggestQuickChildTextsFlow,
  type SuggestQuickChildTextsInput,
  type SuggestQuickChildTextsOutput,
  refineNodeSuggestionFlow,
  type RefineNodeSuggestionInput,
  type RefineNodeSuggestionOutput,
  suggestIntermediateNodeFlow,
  type SuggestIntermediateNodeInput,
  type SuggestIntermediateNodeOutput,
  aiTidyUpSelectionFlow,
  type AiTidyUpSelectionInput,
  type AiTidyUpSelectionOutput,
  suggestChildNodesFlow,
  type SuggestChildNodesRequest,
  type SuggestChildNodesResponse,
  suggestMapImprovementsFlow,
  type SuggestedImprovements,
  rewriteNodeContent as aiRewriteNodeContent,
  type RewriteNodeContentInput,
  type RewriteNodeContentOutput,
  generateMapSummaryFlow,
  type GenerateMapSummaryInput,
  type GenerateMapSummaryOutput,
  askQuestionAboutEdgeFlow,
  type AskQuestionAboutEdgeInput,
  type AskQuestionAboutEdgeOutput,
  askQuestionAboutMapContextFlow,
  type AskQuestionAboutMapContextInput,
  type AskQuestionAboutMapContextOutput, // Import new map Q&A flow
} from '@/ai/flows';
import type {
  ConceptMapNode,
  RFNode,
  CustomNodeData,
  ConceptMapData,
  ConceptMapEdge,
} from '@/types';
import { getNodePlacement } from '@/lib/layout-utils';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import { useReactFlow } from 'reactflow';
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import type {
  AISuggestMapImprovementsInput,
  AISharedSimplifiedEdgeInput,
} from '@/types/ai-shared';

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;
const GRID_SIZE_FOR_AI_PLACEMENT = 20;

export interface ConceptToExpandDetails {
  id: string | null;
  text: string;
  node?: ConceptMapNode;
}
export interface NodeContentToRewrite {
  id: string;
  text: string;
  details?: string;
}
export interface RefineModalData {
  nodeId: string;
  parentNodeId: string;
  text: string;
  details?: string;
}
export interface IntermediateNodeSuggestionContext
  extends SuggestIntermediateNodeOutput {
  originalEdgeId: string;
  sourceNode: ConceptMapNode;
  targetNode: ConceptMapNode;
}

export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const {
    mapData,
    selectedElementId,
    multiSelectedNodeIds,
    setAiExtractedConcepts,
    setAiSuggestedRelations,
    removeExtractedConceptsFromSuggestions,
    removeSuggestedRelationsFromSuggestions,
    resetAiSuggestions,
    addNode: addStoreNode,
    updateNode: updateStoreNode,
    addEdge: addStoreEdge,
    setAiProcessingNodeId,
    setStagedMapData,
    setConceptExpansionPreview,
    conceptExpansionPreview,
    applyLayout,
  } = useConceptMapStore(
    useCallback(
      (s) => ({
        mapData: s.mapData,
        selectedElementId: s.selectedElementId,
        multiSelectedNodeIds: s.multiSelectedNodeIds,
        setAiExtractedConcepts: s.setAiExtractedConcepts,
        setAiSuggestedRelations: s.setAiSuggestedRelations,
        removeExtractedConceptsFromSuggestions:
          s.removeExtractedConceptsFromSuggestions,
        removeSuggestedRelationsFromSuggestions:
          s.removeSuggestedRelationsFromSuggestions,
        resetAiSuggestions: s.resetAiSuggestions,
        addNode: s.addNode,
        updateNode: s.updateNode,
        addEdge: s.addEdge,
        setAiProcessingNodeId: s.setAiProcessingNodeId,
        setStagedMapData: s.setStagedMapData,
        setConceptExpansionPreview: s.setConceptExpansionPreview,
        conceptExpansionPreview: s.conceptExpansionPreview,
        applyLayout: s.applyLayout,
      }),
      []
    )
  );
  const addDebugLog = useConceptMapStore.getState().addDebugLog;

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] =
    useState(false);
  const [textForExtraction, setTextForExtraction] = useState('');
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] =
    useState(false);
  const [conceptsForRelationSuggestion, setConceptsForRelationSuggestion] =
    useState<string[]>([]);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] =
    useState(false);
  const [conceptToExpandDetails, setConceptToExpandDetails] =
    useState<ConceptToExpandDetails | null>(null);
  const [mapContextForExpansion, setMapContextForExpansion] = useState<
    string[]
  >([]);
  const [isQuickClusterModalOpen, setIsQuickClusterModalOpen] = useState(false);
  const [isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen] =
    useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [nodeContextForQuestion, setNodeContextForQuestion] = useState<{
    text: string;
    details?: string;
    id: string;
  } | null>(null);
  const [isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen] =
    useState(false);
  const [nodeContentToRewrite, setNodeContentToRewrite] =
    useState<NodeContentToRewrite | null>(null);
  const [edgeLabelSuggestions, setEdgeLabelSuggestions] = useState<{
    edgeId: string;
    labels: string[];
  } | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineModalInitialData, setRefineModalInitialData] =
    useState<RefineModalData | null>(null);
  // const [intermediateNodeSuggestion, setIntermediateNodeSuggestion] = useState<IntermediateNodeSuggestionContext | null>(null); // Removed for staging area
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<
    string[]
  >([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);
  const [isDagreTidying, setIsDagreTidying] = useState(false);
  const [isSummarizingMap, setIsSummarizingMap] = useState(false);
  const [mapSummaryResult, setMapSummaryResult] =
    useState<GenerateMapSummaryOutput | null>(null);
  const [isMapSummaryModalOpen, setIsMapSummaryModalOpen] = useState(false);

  // State for Edge Q&A
  const [isEdgeQuestionModalOpen, setIsEdgeQuestionModalOpen] = useState(false);
  const [edgeQuestionContext, setEdgeQuestionContext] =
    useState<AskQuestionAboutEdgeInput | null>(null);
  const [edgeQuestionAnswer, setEdgeQuestionAnswer] = useState<string | null>(
    null
  );
  const [isAskingAboutEdge, setIsAskingAboutEdge] = useState(false);

  // State for Map-Level Q&A
  const [isMapContextQuestionModalOpen, setIsMapContextQuestionModalOpen] =
    useState(false);
  const [mapContextQuestionAnswer, setMapContextQuestionAnswer] = useState<
    string | null
  >(null);
  const [isAskingAboutMapContext, setIsAskingAboutMapContext] = useState(false);

  /**
   * A generic utility function to call an AI flow and provide standardized user feedback
   * via toasts for loading, success, and error states.
   *
   * @param aiFunctionName The display name of the AI function (for toasts).
   * @param aiFlowFunction The actual AI flow function to call.
   * @param input The input to pass to the AI flow function.
   * @param options Optional configuration for loading messages, success/error handling, and callbacks.
   * @param options.loadingMessage Custom message for the loading toast.
   * @param options.successTitle Custom title for the success toast.
   * @param options.successDescription Function to generate custom description for success toast.
   * @param options.hideSuccessToast If true, suppresses the default success toast.
   * @param options.processingId An optional ID to track the processing state (e.g., node ID).
   * @param options.onSuccess Callback function invoked on successful AI operation, before the success toast.
   * @param options.onError Callback function invoked on AI operation failure, before the error toast.
   *                        If it returns `true`, the default error toast will be suppressed.
   * @returns The result of the AI flow function, or null if an error occurred or in view-only mode.
   */
  const callAIWithStandardFeedback = useCallback(
    async <I, O>(
      aiFunctionName: string,
      aiFlowFunction: (input: I) => Promise<O>,
      input: I,
      options?: {
        loadingMessage?: string;
        successTitle?: string;
        successDescription?: (output: O) => string;
        hideSuccessToast?: boolean;
        processingId?: string | null;
        onSuccess?: (output: O, input: I) => void;
        onError?: (error: unknown, input: I) => boolean | void;
      }
    ): Promise<O | null> => {
      if (isViewOnlyMode) {
        toast({
          title: 'View Only Mode',
          description: `${aiFunctionName} is disabled.`,
          variant: 'default',
        });
        return null;
      }
      const currentProcessingId =
        options?.processingId !== undefined
          ? options.processingId
          : aiFunctionName;
      addDebugLog(
        `[AITools] Starting: ${aiFunctionName} (ID: ${currentProcessingId})`
      );
      if (currentProcessingId) setAiProcessingNodeId(currentProcessingId);

      const loadingToast = toast({
        title: 'AI Processing...',
        description:
          options?.loadingMessage ||
          `AI is working on ${aiFunctionName.toLowerCase()}. Please wait.`,
        duration: 999999,
      });

      try {
        const result = await aiFlowFunction(input);
        loadingToast.dismiss();

        // Call onSuccess callback if provided
        if (options?.onSuccess) {
          try {
            options.onSuccess(result, input);
          } catch (e) {
            console.error(`Error in onSuccess callback for ${aiFunctionName}:`, e);
            // Optionally, you might want to toast this error too, or handle it differently
            toast({
              title: 'Callback Error',
              description: `An error occurred in the onSuccess callback for ${aiFunctionName}.`,
              variant: 'destructive',
            });
          }
        }

        if (!options?.hideSuccessToast) {
          toast({
            title: options?.successTitle || `${aiFunctionName} Successful!`,
            description: options?.successDescription
              ? options.successDescription(result)
              : 'AI operation completed.',
          });
        }
        addDebugLog(
          `[AITools] Success: ${aiFunctionName} (ID: ${currentProcessingId})`
        );
        return result;
      } catch (error: unknown) {
        loadingToast.dismiss();
        console.error(
          `Error in ${aiFunctionName} (ID: ${currentProcessingId}):`,
          error
        );
        let userFriendlyMessage = `The AI operation "${aiFunctionName}" failed. `;
        let errorMessage = 'An unknown error occurred.';
        if (error instanceof Error) {
          errorMessage = error.message;
        } else if (typeof error === 'string') {
          errorMessage = error;
        }

        const lowerErrorMessage = errorMessage.toLowerCase();
        // Try to make some common errors more friendly
        if (
          lowerErrorMessage.includes('deadline_exceeded') ||
          lowerErrorMessage.includes('timeout')
        ) {
          userFriendlyMessage +=
            'The request timed out. This might be due to high server load or a complex request. Please try again in a few moments.';
        } else if (
          lowerErrorMessage.includes('resource_exhausted') ||
          lowerErrorMessage.includes('quota')
        ) {
          userFriendlyMessage +=
            'The AI resources are temporarily unavailable or quota has been exceeded. Please try again later or check your service plan.';
        } else if (lowerErrorMessage.includes('api key not valid')) {
          userFriendlyMessage =
            'AI service configuration error. Please contact support.';
        } else if (
          lowerErrorMessage.includes('context length') ||
          lowerErrorMessage.includes('input too long') ||
          lowerErrorMessage.includes('token limit')
        ) {
          userFriendlyMessage +=
            'The provided text or map data is too large for the AI to process. Please try with a smaller selection or a less complex map.';
        } else if (
          lowerErrorMessage.includes('safety settings') ||
          lowerErrorMessage.includes('policy violation') ||
          lowerErrorMessage.includes('blocked') ||
          lowerErrorMessage.includes('unsafe content')
        ) {
          userFriendlyMessage = `The AI could not process the request due to content safety policies. Please review your input. Reason: ${errorMessage}`;
        } else if (
          lowerErrorMessage.includes('zoderror') ||
          lowerErrorMessage.includes('schema validation')
        ) {
          userFriendlyMessage += `There was an issue with the data format sent to the AI. Details: ${errorMessage}`;
            addDebugLog(
              `[AITools] Zod/Schema validation error likely: ${errorMessage}`
            );
          } else if (
            error instanceof Object && 'details' in error && typeof error.details === 'string' &&
            error.details.toLowerCase().includes('permission_denied')
          ) {
            // Genkit specific for permission issues
            userFriendlyMessage =
              'AI operation failed due to a permission issue with the underlying service. Please check configurations or contact support.';
          } else if (error instanceof Object && 'details' in error && typeof error.details === 'string' && error.details) {
            userFriendlyMessage += `Details: ${error.details}`; // Use Genkit's details if available
          } else {
            userFriendlyMessage += `Details: ${errorMessage}`;
          }
        }

        // Add general advice only if not an API key error or safety policy violation (which have their own specific advice)
        if (
          !lowerErrorMessage.includes('api key not valid') &&
          !(
            lowerErrorMessage.includes('safety settings') ||
            lowerErrorMessage.includes('policy violation')
          )
        ) {
          userFriendlyMessage +=
            ' Please try again shortly. If the issue persists, check the developer console for more technical information or contact support.';
        }

        let errorHandledByCallback = false;
        if (options?.onError) {
          try {
            const result = options.onError(error, input);
            if (result === true) {
              errorHandledByCallback = true;
            }
          } catch (e) {
            console.error(`Error in onError callback for ${aiFunctionName}:`, e);
            // Optionally, toast this specific callback error
            toast({
              title: 'Callback Error',
              description: `An error occurred in the onError callback for ${aiFunctionName}. The original error will still be shown.`,
              variant: 'destructive',
            });
          }
        }

        if (!errorHandledByCallback) {
          toast({
            title: `Error: Could not complete ${aiFunctionName}`,
            description: userFriendlyMessage,
            variant: 'destructive',
            duration: 7000,
          });
        }

        addDebugLog(
          `[AITools] Error in ${aiFunctionName} (ID: ${currentProcessingId}): ${errorMessage}`
        );
        return null;
      } finally {
        if (
          currentProcessingId &&
          useConceptMapStore.getState().aiProcessingNodeId ===
            currentProcessingId
        ) {
          setAiProcessingNodeId(null);
        }
      }
    },
    [isViewOnlyMode, toast, addDebugLog, setAiProcessingNodeId]
  );

  const openExtractConceptsModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({
          title: 'View Only Mode',
          description: 'AI tools are disabled.',
        });
        return;
      }
      resetAiSuggestions();
      let initialText = '';
      if (nodeIdForContext) {
        const node = mapData.nodes.find((n) => n.id === nodeIdForContext);
        if (node)
          initialText = `${node.text}${node.details ? `\n\nDetails: ${node.details}` : ''}`;
      } else if (multiSelectedNodeIds.length > 0) {
        initialText = multiSelectedNodeIds
          .map((id) => {
            const node = mapData.nodes.find((n) => n.id === id);
            return node
              ? `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}`
              : '';
          })
          .filter(Boolean)
          .join('\n\n---\n\n');
      } else if (
        selectedElementId &&
        mapData.nodes.find((n) => n.id === selectedElementId)
      ) {
        const node = mapData.nodes.find((n) => n.id === selectedElementId);
        if (node)
          initialText = `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}`;
      }
      setTextForExtraction(initialText);
      setIsExtractConceptsModalOpen(true);
    },
    [
      isViewOnlyMode,
      resetAiSuggestions,
      mapData.nodes,
      selectedElementId,
      multiSelectedNodeIds,
      toast,
    ]
  );

  const handleConceptsExtracted = useCallback(
    async (text: string) => {
      const output = await callAIWithStandardFeedback<
        ExtractConceptsInput,
        ExtractConceptsOutput
      >(
        'Extract Concepts',
        aiExtractConcepts,
        { text },
        {
          successDescription: (res) =>
            `${res.concepts.length} concepts found. View in AI Panel.`,
          onSuccess: (output) => {
            if (output) setAiExtractedConcepts(output.concepts); // output.concepts is ExtractedConceptItem[]
          },
        }
      );
      // if (output) setAiExtractedConcepts(output.concepts); // Moved to onSuccess
      return !!output;
    },
    [callAIWithStandardFeedback, setAiExtractedConcepts]
  );

  const addExtractedConceptsToMap = useCallback(
    (selectedConcepts: ExtractedConceptItem[]) => {
      if (isViewOnlyMode || selectedConcepts.length === 0) return;
      let addedCount = 0;
      // const currentNodes = mapData.nodes; // Use mapData.nodes from dependencies directly
      selectedConcepts.forEach((conceptItem) => {
        addStoreNode({
          text: conceptItem.concept,
          type: 'ai-concept',
          position: getNodePlacement(
            mapData.nodes, // Use mapData.nodes from the hook's scope, ensured by dependency array
            'generic',
            null,
            null,
            GRID_SIZE_FOR_AI_PLACEMENT
          ),
          details: conceptItem.context
            ? `Context: ${conceptItem.context}${conceptItem.source ? `\nSource: "${conceptItem.source}"` : ''}`
            : conceptItem.source
              ? `Source: "${conceptItem.source}"`
              : '',
        });
        addedCount++;
      });
      if (addedCount > 0) {
        toast({
          title: 'Concepts Added',
          description: `${addedCount} new concepts added.`,
        });
        removeExtractedConceptsFromSuggestions(
          selectedConcepts.map((c) => c.concept)
        );
      }
    },
    [
      isViewOnlyMode,
      toast,
      addStoreNode,
      removeExtractedConceptsFromSuggestions,
      mapData.nodes, // Added mapData.nodes to dependency array
    ]
  );

  const openSuggestRelationsModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      resetAiSuggestions();
      let concepts: string[] = [];
      const currentMapData = useConceptMapStore.getState().mapData;
      const graphAdapter = new GraphAdapterUtility();
      const graphInstance = graphAdapter.fromArrays(
        currentMapData.nodes,
        currentMapData.edges
      );
      const targetNodeId = nodeIdForContext || selectedElementId;
      const selectedNode = targetNodeId
        ? currentMapData.nodes.find((n) => n.id === targetNodeId)
        : null;
      if (multiSelectedNodeIds.length >= 2) {
        concepts = multiSelectedNodeIds
          .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
          .filter((text): text is string => !!text);
      } else if (selectedNode) {
        concepts.push(selectedNode.text);
        if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(
            graphInstance,
            selectedNode.id,
            { depth: 1, direction: 'all' }
          );
          concepts.push(
            ...neighborNodeIds
              .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
              .filter((text): text is string => !!text)
              .slice(0, 4)
          );
        }
      } else if (currentMapData.nodes.length > 0) {
        concepts = currentMapData.nodes
          .slice(0, Math.min(5, currentMapData.nodes.length))
          .map((n) => n.text);
      }
      setConceptsForRelationSuggestion(
        concepts.length > 0 ? concepts : ['Example A', 'Example B']
      );
      setIsSuggestRelationsModalOpen(true);
    },
    [
      isViewOnlyMode,
      resetAiSuggestions,
      mapData,
      selectedElementId,
      multiSelectedNodeIds,
      toast,
    ]
  );

  const handleRelationsSuggested = useCallback(
    async (concepts: string[]) => {
      const output = await callAIWithStandardFeedback<
        SuggestRelationsInput,
        SuggestRelationsOutput
      >(
        'Suggest Relations',
        aiSuggestRelations,
        { concepts },
        {
          successDescription: (res) =>
            `${res.length} relations suggested. View in AI Panel.`,
          onSuccess: (output) => {
            if (output) setAiSuggestedRelations(output);
          },
        }
      );
      // if (output) setAiSuggestedRelations(output); // Moved to onSuccess
      return !!output;
    },
    [callAIWithStandardFeedback, setAiSuggestedRelations]
  );

  const addSuggestedRelationsToMap = useCallback(
    (selectedRelations: SuggestRelationsOutput) => {
      if (isViewOnlyMode || selectedRelations.length === 0) return;
      let relationsAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;
      // const currentNodes = mapData.nodes; // Use mapData.nodes from dependencies
      selectedRelations.forEach((rel) => {
        let sourceNode = mapData.nodes.find(
          (node) =>
            node.text.toLowerCase().trim() === rel.source.toLowerCase().trim()
        );
        if (!sourceNode) {
          const newSourceNodeId = addStoreNode({
            text: rel.source,
            type: 'ai-concept',
            position: getNodePlacement(
              mapData.nodes, // Use mapData.nodes from dependencies
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT
            ),
          });
          // After adding a node, mapData.nodes in the store is updated.
          // To get the *very latest* state including the new node for subsequent finds in the same loop iteration,
          // we might need to refresh currentNodes or rely on addStoreNode returning the new node.
          // For simplicity here, we'll assume addStoreNode updates the store synchronously enough for the next find,
          // or that getNodePlacement using the current mapData.nodes is sufficient for positioning.
          // A more robust solution might involve passing the updated nodes list through iterations or
          // having addStoreNode return the created node directly.
          // However, the immediate find below for sourceNode might still hit a closure issue if not careful.
          // Let's assume for now that subsequent finds will use the mapData.nodes from the hook's current render cycle.
          const latestNodes = useConceptMapStore.getState().mapData.nodes; // Get latest after add
          sourceNode = latestNodes.find((node) => node.id === newSourceNodeId);
          if (sourceNode) conceptsAddedFromRelationsCount++;
          else return;
        }
        let targetNode = mapData.nodes.find(
          (node) =>
            node.text.toLowerCase().trim() === rel.target.toLowerCase().trim()
        );
        if (!targetNode) {
          const newTargetNodeId = addStoreNode({
            text: rel.target,
            type: 'ai-concept',
            position: getNodePlacement(
              mapData.nodes, // Use mapData.nodes from dependencies
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT
            ),
          });
          const latestNodes = useConceptMapStore.getState().mapData.nodes; // Get latest after add
          targetNode = latestNodes.find((node) => node.id === newTargetNodeId);
          if (targetNode) conceptsAddedFromRelationsCount++;
          else return;
        }
        // const currentEdgesSnapshot = mapData.edges; // Use mapData.edges from dependencies
        if (
          sourceNode &&
          targetNode &&
          !mapData.edges.some( // Use mapData.edges from dependencies
            (edge) =>
              edge.source === sourceNode!.id &&
              edge.target === targetNode!.id &&
              edge.label === rel.relation
          )
        ) {
          addStoreEdge({
            source: sourceNode!.id,
            target: targetNode!.id,
            label: rel.relation,
            details: rel.reason,
          });
          relationsAddedCount++;
        }
      });
      let toastMessage = '';
      if (relationsAddedCount > 0)
        toastMessage += `${relationsAddedCount} new relations added. `;
      if (conceptsAddedFromRelationsCount > 0)
        toastMessage += `${conceptsAddedFromRelationsCount} new concepts added. `;
      if (toastMessage) {
        toast({
          title: 'Relations Added',
          description: `${toastMessage.trim()}`,
        });
        removeSuggestedRelationsFromSuggestions(selectedRelations);
      }
    },
    [
      isViewOnlyMode,
      toast,
      addStoreNode,
      addStoreEdge,
      removeSuggestedRelationsFromSuggestions,
      mapData.nodes, // Added mapData.nodes
      mapData.edges, // Added mapData.edges
    ]
  );

  const openExpandConceptModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      let conceptDetailsToSet: ConceptToExpandDetails | null = null;
      let context: string[] = [];
      const currentMapData = useConceptMapStore.getState().mapData;
      const graphAdapter = new GraphAdapterUtility();
      const graphInstance = graphAdapter.fromArrays(
        currentMapData.nodes,
        currentMapData.edges
      );
      const targetNodeId = nodeIdForContext || selectedElementId;
      const selectedNode = targetNodeId
        ? currentMapData.nodes.find((n) => n.id === targetNodeId)
        : null;
      if (selectedNode) {
        conceptDetailsToSet = {
          id: selectedNode.id,
          text: selectedNode.text,
          node: selectedNode,
        };
        if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(
            graphInstance,
            selectedNode.id,
            { depth: 1, direction: 'all' }
          );
          context = neighborNodeIds
            .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
            .filter((text): text is string => !!text)
            .slice(0, 5);
        }
      } else if (currentMapData.nodes.length > 0) {
        conceptDetailsToSet = {
          id: null,
          text: 'General Map Topic',
          node: undefined,
        };
      } else {
        conceptDetailsToSet = { id: null, text: '', node: undefined };
      }
      setConceptToExpandDetails(conceptDetailsToSet);
      setMapContextForExpansion(context);
      setIsExpandConceptModalOpen(true);
    },
    [isViewOnlyMode, mapData, selectedElementId, toast]
  );

  const handleConceptExpanded = useCallback(
    async (input: ExpandConceptInput) => {
      if (
        isViewOnlyMode ||
        !conceptToExpandDetails ||
        !conceptToExpandDetails.id
      ) {
        toast({
          title: 'Error',
          description: 'Cannot expand concept without a source node.',
          variant: 'destructive',
        });
        return null;
      }
      const parentNodeId = conceptToExpandDetails.id;
      const output = await callAIWithStandardFeedback<
        ExpandConceptInput,
        ExpandConceptOutput
      >('Expand Concept', aiExpandConcept, input, {
        loadingMessage: `AI is expanding on "${input.concept}"...`,
        successTitle: 'AI Suggestions Ready',
        successDescription: (res) =>
          `${res.expandedIdeas.length} new ideas suggested. Review them for placement.`,
        processingId: parentNodeId,
        onSuccess: (output, _input) => {
          // Handles the successful expansion of a concept.
          // Generates new child nodes and edges based on AI suggestions
          // and places them into the Staging Area for user review.
          if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
            const parentNode = mapData.nodes.find((n) => n.id === parentNodeId);
            if (!parentNode) {
              toast({
                title: 'Error',
                description: 'Parent node for expansion not found.',
                variant: 'destructive',
              });
              return;
            }

            const stagedNodes: ConceptMapNode[] = [];
            const stagedEdges: ConceptMapEdge[] = [];
            const existingNodesForPlacement = [...mapData.nodes]; // Use a snapshot for placement calculation

            output.expandedIdeas.forEach((idea, index) => {
              const newNodeId = `staged-exp-${parentNodeId}-${Date.now()}-${index}`;
              const position = getNodePlacement(
                existingNodesForPlacement, // Pass current map nodes + already generated staged nodes in this batch
                'child', // type
                parentNode, // parentNode
                null, // No specific target sibling for generic child placement
                GRID_SIZE_FOR_AI_PLACEMENT, // gridSize
                index, // index for distribution
                output.expandedIdeas.length // total siblings for distribution
              );

              const newNode: ConceptMapNode = {
                id: newNodeId,
                text: idea.text,
                details: idea.reasoning
                  ? `AI Rationale: ${idea.reasoning}`
                  : idea.details || '',
                type: 'ai-expanded',
                position,
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                childIds: [],
              };
              stagedNodes.push(newNode);
              existingNodesForPlacement.push(newNode); // Add to temp list for subsequent placements

              stagedEdges.push({
                id: `staged-exp-edge-${parentNodeId}-${newNodeId}-${Date.now()}`,
                source: parentNodeId,
                target: newNodeId,
                label: idea.relationLabel || 'related to',
              });
            });

            setStagedMapData({
              nodes: stagedNodes,
              edges: stagedEdges,
              actionType: 'expandConcept',
              originalElementId: parentNodeId,
            });
            // Clear the old custom preview system state if it was set
            setConceptExpansionPreview(null);
            // Toast is now handled by callAIWithStandardFeedback or its successDescription
            // However, this specific toast is more informative, so we might want to keep it
            // or ensure successDescription can be rich enough.
            // For now, let's rely on the default success toast from callAIWithStandardFeedback.
            // If a more specific toast is needed, successDescription should be used,
            // or the default toast disabled and custom toast shown here.
          } else if (output) {
            // AI ran but no ideas
            setConceptExpansionPreview(null);
            toast({ // This toast might be redundant if callAIWithStandardFeedback shows one
              title: 'Expand Concept',
              description: 'AI did not find any specific concepts to expand with.',
              variant: 'default',
            });
          }
        }
      });
      return !!output; // The original function returned this, so keep it for now
    },
    [
      isViewOnlyMode,
      toast,
      conceptToExpandDetails,
      mapData.nodes,
      callAIWithStandardFeedback,
      setStagedMapData,
      setConceptExpansionPreview,
    ]
  );

  const openAskQuestionModal = useCallback(
    (nodeId: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (node) {
        setNodeContextForQuestion({
          text: node.text,
          details: node.details,
          id: node.id,
        });
        setIsAskQuestionModalOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Node not found.',
          variant: 'destructive',
        });
      }
    },
    [isViewOnlyMode, mapData.nodes, toast]
  );

  const handleQuestionAnswered = useCallback(
    async (
      question: string,
      nodeCtx: { text: string; details?: string; id: string }
    ) => {
      const node = mapData.nodes.find((n) => n.id === nodeCtx.id);
      await callAIWithStandardFeedback<
        AskQuestionAboutNodeInput,
        AskQuestionAboutNodeOutput
      >(
        'Ask AI About Node',
        aiAskQuestionAboutNode,
        {
          nodeId: nodeCtx.id,
          nodeText: nodeCtx.text,
          nodeDetails: nodeCtx.details,
          nodeType: node?.type,
          userQuestion: question,
        },
        {
          successTitle: 'AI Answer:',
          successDescription: (res) => res.answer,
          hideSuccessToast: false,
          processingId: nodeCtx.id,
        }
      );
    },
    [callAIWithStandardFeedback, mapData.nodes]
  );

  const openRewriteNodeContentModal = useCallback(
    (nodeId: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (node) {
        setNodeContentToRewrite({
          id: node.id,
          text: node.text,
          details: node.details,
        });
        setIsRewriteNodeContentModalOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Node not found.',
          variant: 'destructive',
        });
      }
    },
    [isViewOnlyMode, mapData.nodes, toast]
  );

  const handleRewriteNodeContentConfirm = useCallback(
    async (
      nodeId: string,
      newText: string,
      newDetails?: string,
      tone?: string
    ) => {
      if (isViewOnlyMode) return;
      addDebugLog(
        `[AITools] Applying rewritten content for node ${nodeId}. Tone: ${tone}`
      );
      updateStoreNode(nodeId, {
        text: newText,
        details: newDetails,
        type: 'ai-rewritten-node',
      });
      toast({
        title: 'Node Content Updated',
        description: 'Content rewritten by AI has been applied.',
      });
    },
    [isViewOnlyMode, updateStoreNode, toast, addDebugLog]
  );

  const handleSummarizeSelectedNodes = useCallback(async () => {
    const selectedNodes = mapData.nodes.filter((node) =>
      multiSelectedNodeIds.includes(node.id)
    );
    if (selectedNodes.length === 0 && !isViewOnlyMode) {
      // Changed from < 2 to === 0 to allow single node summary
      toast({
        title: 'Selection Error',
        description: 'Please select at least one node to summarize.',
        variant: 'destructive',
      });
      return;
    }
    const output = await callAIWithStandardFeedback<
      SummarizeNodesInput,
      SummarizeNodesOutput
    >(
      'Summarize Selection',
      aiSummarizeNodes,
      {
        nodes: selectedNodes.map((n) => ({
          id: n.id,
          text: n.text,
          details: n.details,
        })),
      },
      {
        loadingMessage: `AI is summarizing ${selectedNodes.length} selected node(s)...`,
        successTitle: 'AI Summary Created!',
        successDescription: (res) =>
          res.summary?.text
            ? 'A new node with the summary has been added.'
            : 'AI could not generate a specific summary for the selection.',
        processingId:
          multiSelectedNodeIds.length > 0
            ? multiSelectedNodeIds[0]
            : 'summarize-selection', // Use first selected node ID or generic
        onSuccess: (output, _input) => {
          // Handles the successful summarization of selected nodes.
          // Creates a new summary node and edges connecting it to the summarized nodes,
          // then places them into the Staging Area for user review.
          if (output && output.summary && output.summary.text) {
            const selectedNodes = mapData.nodes.filter((node) => // Re-filter or pass selectedNodes via input if needed by onSuccess
              multiSelectedNodeIds.includes(node.id)
            );
            const centralPoint = selectedNodes.reduce(
              (acc, node) => ({ x: acc.x + (node.x || 0), y: acc.y + (node.y || 0) }),
              { x: 0, y: 0 }
            );
            centralPoint.x =
              selectedNodes.length > 0
                ? centralPoint.x / selectedNodes.length
                : reactFlowInstance.getViewport().x +
                  (reactFlowInstance.getViewport().width || DEFAULT_NODE_WIDTH) / 2;
            centralPoint.y =
              selectedNodes.length > 0
                ? centralPoint.y / selectedNodes.length
                : reactFlowInstance.getViewport().y +
                  (reactFlowInstance.getViewport().height || DEFAULT_NODE_HEIGHT) / 2;

            const summaryNodePosition = getNodePlacement(
              mapData.nodes,
              'generic',
              null,
              {
                id: 'summary-center',
                x: centralPoint.x,
                y: centralPoint.y,
                width: 0,
                height: 0,
                text: '',
                type: '',
              },
              GRID_SIZE_FOR_AI_PLACEMENT
            );

            const tempSummaryNodeId = `staged-summary-${Date.now()}`;
            const summaryNode: ConceptMapNode = {
              id: tempSummaryNodeId,
              text: output.summary.text,
              details:
                output.summary.details ||
                `Summary of: ${selectedNodes.map((n) => n.text).join(', ')}`,
              type: 'ai-summary-node', // Or 'staged-ai-summary'
              position: {
                x: summaryNodePosition.x,
                y: summaryNodePosition.y - (selectedNodes.length > 1 ? 100 : 0),
              },
              width: 200,
              height: 100,
              childIds: [],
            };

            const edgesToSummarizedNodes: ConceptMapEdge[] = selectedNodes.map(
              (node) => ({
                id: `staged-summaryedge-${node.id}-${Date.now()}`, // Temporary ID
                source: tempSummaryNodeId,
                target: node.id,
                label: 'summary of',
              })
            );

            useConceptMapStore.getState().setStagedMapData({
              nodes: [summaryNode],
              edges: edgesToSummarizedNodes,
              actionType: 'summarizeNodes',
            });
          }
        }
      }
    );
  }, [
    isViewOnlyMode,
    mapData.nodes, // Keep mapData.nodes for getNodePlacement and re-filtering selectedNodes
    multiSelectedNodeIds,
    toast,
    callAIWithStandardFeedback,
    reactFlowInstance,
  ]);
  // Removed addStoreNode from dependency array as it's no longer directly called.

  const handleMiniToolbarQuickExpand = useCallback(
    async (nodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === nodeId);
      if (!sourceNode) {
        toast({
          title: 'Error',
          description: 'Source node not found.',
          variant: 'destructive',
        });
        return;
      }

      const output = await callAIWithStandardFeedback<
        ExpandConceptInput,
        ExpandConceptOutput
      >(
        'Quick Expand',
        aiExpandConcept,
        {
          concept: sourceNode.text,
          existingMapContext: (() => {
            const graphAdapter = new GraphAdapterUtility();
            const graphInstance = graphAdapter.fromArrays(
              mapData.nodes,
              mapData.edges
            );
            if (graphInstance.hasNode(sourceNode.id)) {
              const neighborNodeIds = graphAdapter.getNeighborhood(
                graphInstance,
                sourceNode.id,
                { depth: 1, direction: 'all' }
              );
              return neighborNodeIds
                .map((id) => mapData.nodes.find((n) => n.id === id)?.text)
                .filter((text): text is string => !!text)
                .slice(0, 2);
            }
            return [];
          })(),
          userRefinementPrompt:
            'Generate one concise, directly related child idea. Focus on a primary sub-topic or component.',
        },
        {
          loadingMessage: `AI is quickly expanding on "${sourceNode.text}"...`,
          successTitle: 'AI Suggestion Ready',
          successDescription: (res) =>
            res.expandedIdeas?.length > 0
              ? 'Review the suggested concept.'
              : 'AI found no specific idea for quick expansion.',
          processingId: nodeId,
          onSuccess: (output, _input) => {
            // Handles the successful "quick expand" action from the mini toolbar.
            // Similar to handleConceptExpanded, but typically generates fewer (often one) child nodes.
            // Places the new nodes and edges into the Staging Area.
            if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
              const parentNode = sourceNode; // sourceNode is from the outer scope of useCallback
              if (!parentNode) { // Should ideally not happen if sourceNode check passed earlier
                toast({ title: 'Error', description: 'Parent node for quick expand vanished.', variant: 'destructive' });
                return;
              }
              const stagedNodes: ConceptMapNode[] = [];
              const stagedEdges: ConceptMapEdge[] = [];
              const existingNodesForPlacement = [...mapData.nodes];

              output.expandedIdeas.forEach((idea, index) => {
                const newNodeId = `staged-qexp-${parentNode.id}-${Date.now()}-${index}`;
                const position = getNodePlacement(
                  existingNodesForPlacement,
                  'child',
                  parentNode,
                  null,
                  GRID_SIZE_FOR_AI_PLACEMENT,
                  index,
                  output.expandedIdeas.length
                );

                const newNode: ConceptMapNode = {
                  id: newNodeId,
                  text: idea.text,
                  details: idea.reasoning
                    ? `AI Rationale: ${idea.reasoning}`
                    : idea.details || '',
                  type: 'ai-expanded', // Consistent type
                  position,
                  width: DEFAULT_NODE_WIDTH,
                  height: DEFAULT_NODE_HEIGHT,
                  childIds: [],
                };
                stagedNodes.push(newNode);
                existingNodesForPlacement.push(newNode);

                stagedEdges.push({
                  id: `staged-qexp-edge-${parentNode.id}-${newNodeId}-${Date.now()}`,
                  source: parentNode.id,
                  target: newNodeId,
                  label: idea.relationLabel || 'related to',
                });
              });

              setStagedMapData({
                nodes: stagedNodes,
                edges: stagedEdges,
                actionType: 'expandConcept', // Can use the same actionType
                originalElementId: parentNode.id,
              });
              setConceptExpansionPreview(null); // Clear any old preview style
              // Toast for "AI Suggestion Ready" is better handled by successDescription of callAIWithStandardFeedback
              // or a more specific toast here if the default one isn't enough.
            } else if (output) {
              // AI ran but no ideas
              setConceptExpansionPreview(null);
              toast({ // This toast might be redundant
                title: 'Quick Expand',
                description: 'AI did not find any specific idea for quick expansion.',
                variant: 'default',
              });
            }
          }
        }
      );
    },
    [
      isViewOnlyMode,
      toast,
      mapData, // sourceNode is derived from mapData.nodes within the callback
      callAIWithStandardFeedback,
      setStagedMapData,
      setConceptExpansionPreview,
    ]
  );

  const handleMiniToolbarRewriteConcise = useCallback(
    async (nodeId: string) => {
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) {
        toast({
          title: 'Error',
          description: 'Node not found.',
          variant: 'destructive',
        });
        return;
      }
      const output = await callAIWithStandardFeedback<
        RewriteNodeContentInput,
        RewriteNodeContentOutput
      >(
        'Concise Rewrite',
        aiRewriteNodeContent,
        {
          currentText: node.text,
          currentDetails: node.details,
          targetTone: 'concise',
        },
        {
          loadingMessage: `AI is making "${node.text}" more concise...`,
          successTitle: 'Content Rewritten Concisely!',
          successDescription: (res) =>
            res.rewrittenText
              ? 'Node content updated.'
              : 'AI could not make it more concise.',
          hideSuccessToast: !output?.rewrittenText,
          processingId: nodeId,
          onSuccess: (output, _input) => {
            if (output && output.rewrittenText) {
              updateStoreNode(nodeId, { // nodeId is from the outer scope
                text: output.rewrittenText,
                details: output.rewrittenDetails,
                type: 'ai-rewritten-node',
              });
            }
          }
        }
      );
    },
    [
      isViewOnlyMode,
      toast,
      mapData.nodes, // For finding the node before calling AI
      updateStoreNode, // For the onSuccess callback
      callAIWithStandardFeedback,
    ]
  );

  const fetchAndSetEdgeLabelSuggestions = useCallback(
    async (
      edgeId: string,
      sourceNodeId: string,
      targetNodeId: string,
      existingLabel?: string
    ) => {
      const sourceNode = mapData.nodes.find((n) => n.id === sourceNodeId);
      const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
      if (!sourceNode || !targetNode) {
        toast({
          title: 'Error',
          description:
            'Source or target node not found for edge label suggestion.',
          variant: 'destructive',
        });
        return;
      }

      const output = await callAIWithStandardFeedback<
        SuggestEdgeLabelInput,
        SuggestEdgeLabelOutput
      >(
        'Suggest Edge Labels',
        suggestEdgeLabelFlow,
        {
          sourceNode: { text: sourceNode.text, details: sourceNode.details },
          targetNode: { text: targetNode.text, details: targetNode.details },
          existingLabel,
        },
        {
          loadingMessage: 'AI is thinking of edge labels...',
          successTitle: 'Edge Label Suggestions Ready',
          hideSuccessToast: true, // Hide success, shown in floater
          onSuccess: (output) => {
            if (output && output.suggestedLabels.length > 0) {
              setEdgeLabelSuggestions({ edgeId, labels: output.suggestedLabels }); // edgeId from outer scope
            } else if (output) { // Output exists but no labels suggested
              setEdgeLabelSuggestions({ edgeId, labels: ['related to'] }); // edgeId from outer scope
            }
            // If output is null (AI call failed), nothing happens here, error handled by callAIWithStandardFeedback
          }
        }
      );
    },
    [mapData.nodes, toast, callAIWithStandardFeedback, setEdgeLabelSuggestions] // Added setEdgeLabelSuggestions
  );

  const fetchAIChildTextSuggestions = useCallback(
    async (node: RFNode<CustomNodeData> | null) => {
      if (!node) return;
      setIsLoadingAiChildTexts(true);
      const output = await callAIWithStandardFeedback<
        SuggestQuickChildTextsInput,
        SuggestQuickChildTextsOutput
      >(
        'Suggest Child Node Texts',
        suggestQuickChildTextsFlow,
        {
          parentNodeText: node.data.label,
          parentNodeDetails: node.data.details,
          existingChildTexts:
            (node.data.childIds
              ?.map((id) => mapData.nodes.find((n) => n.id === id)?.text)
              .filter(Boolean) as string[]) || [],
        },
        {
          loadingMessage: 'AI is brainstorming child node ideas...',
          successTitle: 'Child Node Ideas Ready',
          hideSuccessToast: true,
          processingId: node.id,
          onSuccess: (output) => {
            if (output) setAiChildTextSuggestions(output.suggestedChildTexts);
          }
        }
      );
      setIsLoadingAiChildTexts(false); // This remains safe here as callAIWithStandardFeedback handles its own errors
    },
    [callAIWithStandardFeedback, mapData.nodes, setIsLoadingAiChildTexts, setAiChildTextSuggestions] // Added setAiChildTextSuggestions
  );

  const handleRefineSuggestionConfirm = useCallback(
    async (nodeId: string, refinementInstruction: string) => {
      const previewState = conceptExpansionPreview;
      const nodeToRefine = previewState?.previewNodes.find(
        (n) => n.id === nodeId
      );
      if (!nodeToRefine || !previewState?.parentNodeId) {
        toast({
          title: 'Error',
          description: 'Could not find the suggestion to refine.',
          variant: 'destructive',
        });
        return;
      }
      const output = await callAIWithStandardFeedback<
        RefineNodeSuggestionInput,
        RefineNodeSuggestionOutput
      >(
        'Refine Suggestion',
        refineNodeSuggestionFlow,
        {
          originalText: nodeToRefine.text,
          originalDetails: nodeToRefine.details,
          refinementInstruction,
        },
        {
          loadingMessage: 'AI is refining the suggestion...',
          successTitle: 'Suggestion Refined!',
          processingId: nodeId,
          onSuccess: (output) => {
            if (output) {
              useConceptMapStore
                .getState()
                .updateConceptExpansionPreviewNode(
                  nodeId, // nodeId from outer scope
                  output.refinedText,
                  output.refinedDetails
                );
            }
          }
        }
      );
    },
    [conceptExpansionPreview, toast, callAIWithStandardFeedback] // updateConceptExpansionPreviewNode is a store action, not directly a dep here unless the function itself changes
  );

  const handleSuggestIntermediateNodeRequest = useCallback(
    async (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === sourceNodeId);
      const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
      const edge = mapData.edges.find((e) => e.id === edgeId);
      if (!sourceNode || !targetNode || !edge) {
        toast({
          title: 'Error',
          description: 'Edge context not found.',
          variant: 'destructive',
        });
        return;
      }

      const output = await callAIWithStandardFeedback<
        SuggestIntermediateNodeInput,
        SuggestIntermediateNodeOutput
      >(
        'Suggest Intermediate Node',
        suggestIntermediateNodeFlow,
        {
          sourceNodeText: sourceNode.text,
          sourceNodeDetails: sourceNode.details,
          targetNodeText: targetNode.text,
          targetNodeDetails: targetNode.details,
          existingEdgeLabel: edge.label,
        },
        {
          loadingMessage: 'AI is thinking of an intermediate concept...',
          successTitle: 'Intermediate Node Suggested',
          successDescription: (res) =>
            `AI suggests adding '${res.intermediateNodeText}'. Review the details.`,
          onSuccess: (output) => {
            // Handles the successful suggestion of an intermediate node.
            // Creates the new intermediate node and two new edges (source -> intermediate, intermediate -> target),
            // and places them into the Staging Area for user review.
            if (output) {
              // sourceNode, targetNode, edge are from the outer scope
              if (!sourceNode || !targetNode || !edge) { // Should be checked before calling AI ideally
                 toast({ title: 'Error', description: 'Context for intermediate node missing in onSuccess.', variant: 'destructive' });
                 return;
              }
              const tempNodeId = `staged-intermediate-${Date.now()}`;
              const midX = (sourceNode.x + targetNode.x) / 2;
              const midY = (sourceNode.y + targetNode.y) / 2;

              const intermediateNode: ConceptMapNode = {
                id: tempNodeId,
                text: output.intermediateNodeText,
                details: output.intermediateNodeDetails
                  ? `${output.intermediateNodeDetails}${output.reasoning ? `\n\nAI Rationale: ${output.reasoning}` : ''}`
                  : output.reasoning
                    ? `AI Rationale: ${output.reasoning}`
                    : '',
                type: 'ai-intermediate',
                position: { x: midX, y: midY + 30 },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                childIds: [],
              };
              const edgeToIntermediate: ConceptMapEdge = {
                id: `staged-edge1-${Date.now()}`,
                source: sourceNode.id,
                target: tempNodeId,
                label: output.labelSourceToIntermediate,
              };
              const edgeFromIntermediate: ConceptMapEdge = {
                id: `staged-edge2-${Date.now()}`,
                source: tempNodeId,
                target: targetNode.id,
                label: output.labelIntermediateToTarget,
              };

              useConceptMapStore.getState().setStagedMapData({
                nodes: [intermediateNode],
                edges: [edgeToIntermediate, edgeFromIntermediate],
                actionType: 'intermediateNode',
                originalElementId: edge.id,
              });
            }
          }
        }
      );
    },
    [mapData, toast, callAIWithStandardFeedback] // setStagedMapData is a store action
  );

  // confirmAddIntermediateNode and clearIntermediateNodeSuggestion are removed as staging toolbar handles this.

  const handleAiTidyUpSelection = useCallback(async () => {
    if (multiSelectedNodeIds.length < 2) {
      toast({
        title: 'Selection Required',
        description: 'Select at least two nodes for AI Tidy Up.',
      });
      return;
    }
    const nodesToTidy = mapData.nodes
      .filter((n) => multiSelectedNodeIds.includes(n.id))
      .map((n) => ({
        id: n.id,
        text: n.text,
        x: n.x,
        y: n.y,
        width: n.width,
        height: n.height,
        type: n.type,
        details: n.details,
        parentNode: n.parentNode,
        childIds: n.childIds,
        backgroundColor: n.backgroundColor,
        shape: n.shape,
      }));

    const output = await callAIWithStandardFeedback<
      AiTidyUpSelectionInput,
      AiTidyUpSelectionOutput
    >(
      'AI Tidy Up Selection',
      aiTidyUpSelectionFlow,
      {
        nodes: nodesToTidy,
        mapLayoutContext: {
          /* Potentially add viewport or other context */
        },
      },
      {
        loadingMessage: 'AI is tidying up your selection...',
        successTitle: 'Selection Tidied by AI!',
        onSuccess: (output) => {
          // Handles the successful AI Tidy Up operation.
          // If the AI suggests a new parent node (structural change):
          //   - A new parent node is created.
          //   - Selected nodes are updated with new positions and assigned the new parent.
          //   - All these changes are sent to the Staging Area.
          // If the AI only suggests new positions (layout change):
          //   - The new positions are displayed using the Ghost Preview mechanism.
          // nodesToTidy is from the outer scope of useCallback
          if (!nodesToTidy || nodesToTidy.length === 0) { // Should be checked before calling AI
            toast({ title: 'Error', description: 'Nodes to tidy are missing in onSuccess.', variant: 'destructive'});
            return;
          }
          if (output && output.newPositions) {
            if (output.suggestedParentNode) {
              const newParentNodeId = `staged-parent-${Date.now()}`;
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              output.newPositions.forEach((p) => {
                const originalNode = nodesToTidy.find((n) => n.id === p.id);
                const w = originalNode?.width || DEFAULT_NODE_WIDTH;
                const h = originalNode?.height || DEFAULT_NODE_HEIGHT;
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x + w);
                maxY = Math.max(maxY, p.y + h);
              });
              const PADDING = 30;
              const parentWidth = maxX - minX + 2 * PADDING;
              const parentHeight = maxY - minY + 2 * PADDING;
              const parentX = minX - PADDING;
              const parentY = minY - PADDING;

              const stagedParentNode: ConceptMapNode = {
                id: newParentNodeId,
                text: output.suggestedParentNode.text,
                type: output.suggestedParentNode.type || 'ai-group-parent',
                position: { x: parentX, y: parentY },
                width: parentWidth,
                height: parentHeight,
                details: `AI suggested parent for ${nodesToTidy.length} nodes.`,
                childIds: output.newPositions.map((p) => p.id),
              };

              const stagedChildNodes: ConceptMapNode[] = output.newPositions.map(
                (p) => {
                  const originalNode = nodesToTidy.find((n) => n.id === p.id);
                  return {
                    ...(originalNode as ConceptMapNode),
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    parentNode: newParentNodeId,
                    width: originalNode?.width || DEFAULT_NODE_WIDTH,
                    height: originalNode?.height || DEFAULT_NODE_HEIGHT,
                  };
                }
              );

              useConceptMapStore.getState().setStagedMapData({
                nodes: [stagedParentNode, ...stagedChildNodes],
                edges: [],
                actionType: 'aiTidyUpComplete',
                originalElementIds: nodesToTidy.map((n) => n.id),
              });
              toast({ // This specific toast is informative
                title: 'AI Tidy Up Suggestion Ready',
                description: 'Review the proposed grouping and layout in the staging area.',
              });
            } else {
              const layoutUpdatesWithDimensions = output.newPositions.map((lu) => {
                const originalNode = nodesToTidy.find((n) => n.id === lu.id);
                return {
                  id: lu.id,
                  x: lu.x,
                  y: lu.y,
                  width: originalNode?.width || DEFAULT_NODE_WIDTH,
                  height: originalNode?.height || DEFAULT_NODE_HEIGHT,
                };
              });
              useConceptMapStore.getState().setGhostPreview(layoutUpdatesWithDimensions);
              toast({ // This specific toast is informative
                title: 'Layout Preview Ready',
                description: 'AI Tidy Up proposes new layout. Accept or Cancel.',
              });
            }
          }
        }
      }
    );
  }, [multiSelectedNodeIds, mapData.nodes, callAIWithStandardFeedback, toast]);

  const handleSuggestMapImprovements = useCallback(async () => {
    const currentNodes = mapData.nodes.map((n) => ({
      id: n.id,
      text: n.text,
      details: n.details || '', // Ensure details is always a string
    }));
    const currentEdges: AISharedSimplifiedEdgeInput[] = mapData.edges.map((e) => ({
      source: e.source,
      target: e.target,
      label: e.label || '', // Ensure label is always a string
    }));

    const output = await callAIWithStandardFeedback<AISuggestMapImprovementsInput, SuggestedImprovements>(
      'Suggest Map Improvements',
      suggestMapImprovementsFlow,
      { nodes: currentNodes, edges: currentEdges },
      {
        loadingMessage: 'AI is analyzing your map for improvements...',
        successTitle: 'Improvement Suggestions Ready!',
        successDescription: (res) =>
          `Found ${res.suggestedEdges.length} edge and ${res.suggestedGroups.length} group suggestions.`,
        onSuccess: (output) => {
          if (output) {
            useConceptMapStore.getState().setStructuralSuggestions(output);
          }
        }
      }
    );
  }, [mapData, callAIWithStandardFeedback]); // setStructuralSuggestions is a store action

  const handleDagreLayoutSelection = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({
        title: 'View Only Mode',
        description: 'Layout changes are disabled.',
      });
      return;
    }
    const {
      multiSelectedNodeIds: currentSelectedIds,
      mapData: currentMapData,
    } = useConceptMapStore.getState();
    const { nodes: allNodes, edges: allEdges } = currentMapData;
    if (currentSelectedIds.length < 2) {
      toast({
        title: 'Selection Required',
        description: 'Please select at least 2 nodes.',
      });
      return;
    }

    setIsDagreTidying(true);
    const loadingToast = toast({
      title: 'Arranging Selection...',
      description: 'Using Dagre for layout. Please wait.',
      duration: 999999,
    });

    try {
      const selectedNodesFromStore = allNodes.filter((n) =>
        currentSelectedIds.includes(n.id)
      );
      const nodesForDagre = selectedNodesFromStore
        .map((n) => {
          const rfn = reactFlowInstance.getNode(n.id);
          return {
            id: n.id,
            width: rfn?.width || n.width || DEFAULT_NODE_WIDTH,
            height: rfn?.height || n.height || DEFAULT_NODE_HEIGHT,
            label: n.text,
          };
        })
        .filter((n) => n.width && n.height);

      if (nodesForDagre.length < 2) {
        toast({
          title: 'Layout Error',
          description: 'Not enough valid nodes with dimensions.',
        });
        setIsDagreTidying(false);
        loadingToast.dismiss();
        return;
      }

      const selectedNodeIdSet = new Set(currentSelectedIds);
      const edgesForDagre = allEdges
        .filter(
          (e) =>
            selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
        )
        .map((e) => ({
          source: e.source,
          target: e.target,
          id: e.id,
          label: e.label,
        }));

      let sumX = 0,
        sumY = 0;
      let validInitialNodes = 0;
      selectedNodesFromStore.forEach((n) => {
        const rfn = reactFlowInstance.getNode(n.id);
        const xPos = rfn?.position?.x ?? n.x;
        const yPos = rfn?.position?.y ?? n.y;
        if (xPos !== undefined && yPos !== undefined) {
          sumX += xPos;
          sumY += yPos;
          validInitialNodes++;
        }
      });
      if (validInitialNodes === 0) {
        toast({
          title: 'Layout Error',
          description: 'Cannot get initial positions.',
        });
        setIsDagreTidying(false);
        loadingToast.dismiss();
        return;
      }
      const initialCentroidX = sumX / validInitialNodes;
      const initialCentroidY = sumY / validInitialNodes;

      const dagreUtil = new DagreLayoutUtility();
      const dagreOptions: DagreLayoutOptions = {
        direction: 'TB',
        ranksep: 70,
        nodesep: 70,
        edgesep: 20,
        defaultNodeWidth: DEFAULT_NODE_WIDTH,
        defaultNodeHeight: DEFAULT_NODE_HEIGHT,
      };
      const newRelativePositions = await dagreUtil.layout(
        nodesForDagre,
        edgesForDagre,
        dagreOptions
      );

      if (!newRelativePositions || newRelativePositions.length === 0) {
        toast({
          title: 'Layout Error',
          description: 'Dagre returned no positions.',
        });
        setIsDagreTidying(false);
        loadingToast.dismiss();
        return;
      }

      let sumDagreX = 0,
        sumDagreY = 0;
      newRelativePositions.forEach((p) => {
        const nodeDetails = nodesForDagre.find((n) => n.id === p.id);
        sumDagreX += p.x + (nodeDetails?.width || DEFAULT_NODE_WIDTH) / 2;
        sumDagreY += p.y + (nodeDetails?.height || DEFAULT_NODE_HEIGHT) / 2;
      });
      const dagreCentroidX = sumDagreX / newRelativePositions.length;
      const dagreCentroidY = sumDagreY / newRelativePositions.length;
      const offsetX =
        initialCentroidX -
        dagreCentroidX +
        (nodesForDagre[0]?.width || DEFAULT_NODE_WIDTH) / 2;
      const offsetY =
        initialCentroidY -
        dagreCentroidY +
        (nodesForDagre[0]?.height || DEFAULT_NODE_HEIGHT) / 2;

      const finalPositions = newRelativePositions.map((p) => ({
        id: p.id,
        x:
          Math.round((p.x + offsetX) / GRID_SIZE_FOR_AI_PLACEMENT) *
          GRID_SIZE_FOR_AI_PLACEMENT,
        y:
          Math.round((p.y + offsetY) / GRID_SIZE_FOR_AI_PLACEMENT) *
          GRID_SIZE_FOR_AI_PLACEMENT,
      }));

      // Call setGhostPreview instead of applyLayout directly
      const positionsWithDimensions = finalPositions.map((fp) => {
        const nodeDetail = nodesForDagre.find((nfd) => nfd.id === fp.id);
        return {
          id: fp.id,
          x: fp.x,
          y: fp.y,
          width: nodeDetail?.width || DEFAULT_NODE_WIDTH,
          height: nodeDetail?.height || DEFAULT_NODE_HEIGHT,
        };
      });
      useConceptMapStore.getState().setGhostPreview(positionsWithDimensions);
      // applyLayout(finalPositions); // Old direct application
      toast({
        title: 'Layout Preview Ready',
        description: `Previewing new layout for ${finalPositions.length} nodes. Accept or Cancel via toolbar.`,
      });
    } catch (error) {
      console.error('Dagre layout error:', error);
      toast({
        title: 'Layout Error',
        description: `Failed to arrange: ${(error as Error).message}`,
        variant: 'destructive',
      });
    } finally {
      setIsDagreTidying(false);
      loadingToast.dismiss();
    }
  }, [
    isViewOnlyMode,
    toast,
    reactFlowInstance,
    applyLayout,
    mapData.nodes,
    mapData.edges,
    multiSelectedNodeIds,
  ]);

  // const getPaneSuggestions = useCallback((): SuggestionAction[] => [], []);
  // const getNodeSuggestions = useCallback(
  //   (_node: RFNode<CustomNodeData>): SuggestionAction[] => [],
  //   []
  // );
  // const acceptAllExpansionPreviews = useCallback(() => {}, []);
  // const acceptSingleExpansionPreview = useCallback(
  //   (_previewNodeId: string) => {},
  //   []
  // );
  // const clearExpansionPreview = useCallback(() => {}, []);
  // const openRefineSuggestionModal = useCallback(
  //   (_previewNodeId: string, _parentNodeId: string) => {},
  //   []
  // );

  return {
    isExtractConceptsModalOpen,
    setIsExtractConceptsModalOpen,
    textForExtraction,
    openExtractConceptsModal,
    handleConceptsExtracted,
    addExtractedConceptsToMap,
    isSuggestRelationsModalOpen,
    setIsSuggestRelationsModalOpen,
    conceptsForRelationSuggestion,
    openSuggestRelationsModal,
    handleRelationsSuggested,
    addSuggestedRelationsToMap,
    isExpandConceptModalOpen,
    setIsExpandConceptModalOpen,
    conceptToExpandDetails,
    mapContextForExpansion,
    openExpandConceptModal,
    handleConceptExpanded,
    isQuickClusterModalOpen,
    setIsQuickClusterModalOpen,
    openQuickClusterModal,
    isGenerateSnippetModalOpen,
    setIsGenerateSnippetModalOpen,
    openGenerateSnippetModal,
    isAskQuestionModalOpen,
    setIsAskQuestionModalOpen,
    nodeContextForQuestion,
    openAskQuestionModal,
    handleQuestionAnswered,
    isRewriteNodeContentModalOpen,
    setIsRewriteNodeContentModalOpen,
    nodeContentToRewrite,
    openRewriteNodeContentModal,
    handleRewriteNodeContentConfirm,
    isRefineModalOpen,
    setIsRefineModalOpen,
    refineModalInitialData,
    openRefineSuggestionModal,
    handleRefineSuggestionConfirm,
    handleSuggestIntermediateNodeRequest, // intermediateNodeSuggestion, confirmAddIntermediateNode, clearIntermediateNodeSuggestion removed
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    getPaneSuggestions,
    getNodeSuggestions,
    fetchAIChildTextSuggestions,
    aiChildTextSuggestions,
    isLoadingAiChildTexts,
    fetchAndSetEdgeLabelSuggestions,
    edgeLabelSuggestions,
    setEdgeLabelSuggestions,
    conceptExpansionPreview,
    acceptAllExpansionPreviews,
    acceptSingleExpansionPreview,
    clearExpansionPreview,
    addStoreNode,
    addStoreEdge,
    handleAiTidyUpSelection,
    handleDagreLayoutSelection,
    isDagreTidying,
    askQuestionAboutNode,
    handleSuggestMapImprovements,
    // Map Summary
    handleSummarizeMap: async () => {
      const currentMapData = useConceptMapStore.getState().mapData;
      if (currentMapData.nodes.length === 0) {
        toast({
          title: 'Empty Map',
          description: 'Cannot summarize an empty map.',
          variant: 'default',
        });
        return;
      }
      setIsSummarizingMap(true);
      const output = await callAIWithStandardFeedback<
        GenerateMapSummaryInput,
        GenerateMapSummaryOutput
      >(
        'Summarize Map',
        generateMapSummaryFlow,
        { nodes: currentMapData.nodes, edges: currentMapData.edges },
        {
          loadingMessage: 'AI is analyzing and summarizing your map...',
          successTitle: 'Map Summary Ready!',
          hideSuccessToast: true,
          processingId: 'summarize-entire-map',
          onSuccess: (output) => {
            // setIsSummarizingMap(false); // Already handled outside or in finally
            if (output) {
              setMapSummaryResult(output);
              setIsMapSummaryModalOpen(true);
            } else {
              setMapSummaryResult(null);
            }
          }
        }
      );
      setIsSummarizingMap(false); // Ensure this is called regardless of success/failure if not in finally
    },
    [ // Corrected dependencies
      mapData, // For nodes and edges
      callAIWithStandardFeedback,
      setMapSummaryResult,
      setIsMapSummaryModalOpen,
      setIsSummarizingMap, // For setting loading state
      toast, // Though callAI handles most toasts, direct calls might exist or be added
      isViewOnlyMode // To ensure view-only check works if callAI is bypassed (not current case)
    ]
  );

  // Map Summary related states are returned, but the callback itself doesn't depend on them changing to redefine itself.
  // isSummarizingMap, mapSummaryResult, isMapSummaryModalOpen, setIsMapSummaryModalOpen, clearMapSummaryResult are fine as part of return.

  // Edge Q&A
  const aisToolsReturnObjectPart1 = {
    isExtractConceptsModalOpen,
    setIsExtractConceptsModalOpen,
    textForExtraction,
    openExtractConceptsModal,
    handleConceptsExtracted,
    addExtractedConceptsToMap,
    isSuggestRelationsModalOpen,
    setIsSuggestRelationsModalOpen,
    conceptsForRelationSuggestion,
    openSuggestRelationsModal,
    handleRelationsSuggested,
    addSuggestedRelationsToMap,
    isExpandConceptModalOpen,
    setIsExpandConceptModalOpen,
    conceptToExpandDetails,
    mapContextForExpansion,
    openExpandConceptModal,
    handleConceptExpanded,
    isQuickClusterModalOpen,
    setIsQuickClusterModalOpen,
    openQuickClusterModal,
    isGenerateSnippetModalOpen,
    setIsGenerateSnippetModalOpen,
    openGenerateSnippetModal,
    isAskQuestionModalOpen,
    setIsAskQuestionModalOpen,
    nodeContextForQuestion,
    openAskQuestionModal,
    handleQuestionAnswered,
    isRewriteNodeContentModalOpen,
    setIsRewriteNodeContentModalOpen,
    nodeContentToRewrite,
    openRewriteNodeContentModal,
    handleRewriteNodeContentConfirm,
    isRefineModalOpen,
    setIsRefineModalOpen,
    refineModalInitialData,
    // openRefineSuggestionModal, // Removed as unused
    handleRefineSuggestionConfirm,
    handleSuggestIntermediateNodeRequest,
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    // getPaneSuggestions, // Removed as unused
    // getNodeSuggestions, // Removed as unused
    fetchAIChildTextSuggestions,
    aiChildTextSuggestions,
    isLoadingAiChildTexts,
    fetchAndSetEdgeLabelSuggestions,
    edgeLabelSuggestions,
    setEdgeLabelSuggestions,
    conceptExpansionPreview,
    // acceptAllExpansionPreviews, // Removed as unused
    // acceptSingleExpansionPreview, // Removed as unused
    // clearExpansionPreview, // Removed as unused
    addStoreNode,
    addStoreEdge,
    handleAiTidyUpSelection,
    handleDagreLayoutSelection,
    isDagreTidying,
    askQuestionAboutNode, // This is an AI flow, should it be returned or wrapped? It's used in handleQuestionAnswered.
                          // Let's assume it's meant to be the wrapped version if it's returned for direct use elsewhere.
                          // However, its direct usage is only in handleQuestionAnswered, so no need to return it.
    handleSuggestMapImprovements,
    handleSummarizeMap, // Added the function itself to the return
    isSummarizingMap,
    mapSummaryResult,
    isMapSummaryModalOpen,
    setIsMapSummaryModalOpen,
    clearMapSummaryResult: () => setMapSummaryResult(null),
  };


  const openAskQuestionAboutEdgeModal = useCallback(
    (edgeId: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      const edge = mapData.edges.find((e) => e.id === edgeId);
      if (!edge) {
        toast({
          title: 'Error',
          description: 'Selected edge not found.',
          variant: 'destructive',
        });
        return;
      }
      const sourceNode = mapData.nodes.find((n) => n.id === edge.source);
      const targetNode = mapData.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) {
        toast({
          title: 'Error',
          description: 'Connected nodes for the edge not found.',
          variant: 'destructive',
        });
        return;
      }
      setEdgeQuestionContext({
        sourceNodeId: sourceNode.id,
        sourceNodeText: sourceNode.text,
        sourceNodeDetails: sourceNode.details,
        targetNodeId: targetNode.id,
        targetNodeText: targetNode.text,
        targetNodeDetails: targetNode.details,
        edgeId: edge.id,
        edgeLabel: edge.label,
        userQuestion: '', // Will be filled by modal
      });
      setEdgeQuestionAnswer(null); // Clear previous answer
      setIsEdgeQuestionModalOpen(true);
    },
    handleAskQuestionAboutEdge: useCallback(async (question: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode', description: 'Cannot ask questions about edges in view-only mode.' });
        return;
      }
      if (!edgeQuestionContext) {
        toast({
          title: 'Error',
          description: 'Edge context is missing for Q&A.',
          variant: 'destructive',
        });
        return;
      }
      setIsAskingAboutEdge(true);
      const input: AskQuestionAboutEdgeInput = {
        ...edgeQuestionContext,
        userQuestion: question,
      };
      await callAIWithStandardFeedback<
        AskQuestionAboutEdgeInput,
        AskQuestionAboutEdgeOutput
      >('Ask AI About Edge', askQuestionAboutEdgeFlow, input, {
        loadingMessage: 'AI is considering your question about the edge...',
        successTitle: 'AI Answer Received',
        hideSuccessToast: true,
        processingId: `edge-qa-${edgeQuestionContext.edgeId}`,
        onSuccess: (output) => {
          if (output?.answer) {
            setEdgeQuestionAnswer(output.answer);
          } else if (output?.error) {
            setEdgeQuestionAnswer(`Error: ${output.error}`);
          } else {
            setEdgeQuestionAnswer('AI could not provide a specific answer or error for this question.');
          }
        },
        onError: () => {
          setEdgeQuestionAnswer('Failed to get an answer from AI.');
        }
      });
      setIsAskingAboutEdge(false);
    }, [isViewOnlyMode, edgeQuestionContext, callAIWithStandardFeedback, toast, setIsAskingAboutEdge, setEdgeQuestionAnswer]),
    isEdgeQuestionModalOpen,
    setIsEdgeQuestionModalOpen,
    edgeQuestionContext,
    edgeQuestionAnswer,
    isAskingAboutEdge,
    clearEdgeQuestionState: () => {
      setEdgeQuestionContext(null);
      setEdgeQuestionAnswer(null);
      setIsEdgeQuestionModalOpen(false);
    },

    // Map-Level Q&A handlers
    openAskQuestionAboutMapContextModal: () => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      setMapContextQuestionAnswer(null); // Clear previous answer
      setIsMapContextQuestionModalOpen(true);
    },
    handleAskQuestionAboutEdge: useCallback(async (question: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode', description: 'Cannot ask questions about edges in view-only mode.' });
        return;
      }
      if (!edgeQuestionContext) {
        toast({
          title: 'Error',
          description: 'Edge context is missing for Q&A.',
          variant: 'destructive',
        });
        return;
      }
      setIsAskingAboutEdge(true);
      const input: AskQuestionAboutEdgeInput = {
        ...edgeQuestionContext,
        userQuestion: question,
      };
      await callAIWithStandardFeedback<
        AskQuestionAboutEdgeInput,
        AskQuestionAboutEdgeOutput
      >('Ask AI About Edge', askQuestionAboutEdgeFlow, input, {
        loadingMessage: 'AI is considering your question about the edge...',
        successTitle: 'AI Answer Received',
        hideSuccessToast: true,
        processingId: `edge-qa-${edgeQuestionContext.edgeId}`,
        onSuccess: (output) => {
          if (output?.answer) {
            setEdgeQuestionAnswer(output.answer);
          } else if (output?.error) {
            setEdgeQuestionAnswer(`Error: ${output.error}`);
          } else {
            setEdgeQuestionAnswer('AI could not provide a specific answer or error for this question.');
          }
        },
        onError: () => {
          setEdgeQuestionAnswer('Failed to get an answer from AI.');
        }
      });
      setIsAskingAboutEdge(false);
    }, [isViewOnlyMode, edgeQuestionContext, callAIWithStandardFeedback, toast, setIsAskingAboutEdge, setEdgeQuestionAnswer]),
    isMapContextQuestionModalOpen,
    setIsMapContextQuestionModalOpen,
    mapContextQuestionAnswer,
    isAskingAboutMapContext,
    clearMapContextQuestionState: () => {
      setMapContextQuestionAnswer(null);
      setIsMapContextQuestionModalOpen(false);
    },
  };
}
