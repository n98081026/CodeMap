'use client';

import { useState, useCallback, useMemo } from 'react';
import { useReactFlow } from 'reactflow';

import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import type {
  ConceptMapNode,
  RFNode,
  CustomNodeData,
  ConceptMapData,
  ConceptMapEdge,
} from '@/types';

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
  type AskQuestionAboutMapContextOutput,
} from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import {
  DagreLayoutUtility,
  type NodeLayoutInput,
  type EdgeLayoutInput,
  type DagreLayoutOptions,
} from '@/lib/dagreLayoutUtility';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import { getNodePlacement } from '@/lib/layout-utils';
import useConceptMapStore from '@/stores/concept-map-store';

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

/**
 * Custom hook `useConceptMapAITools`
 *
 * Provides a suite of functions for interacting with AI flows related to concept map manipulation.
 * It handles opening modals for AI interactions, calling AI flow functions,
 * managing AI-driven suggestions (extraction, relations, expansion),
 * and applying changes to the concept map state via `useConceptMapStore`.
 *
 * Also includes handlers for non-AI layout tools like Dagre.
 *
 * Manages local UI state for modals, loading states for AI operations,
 * and provides standardized user feedback (toasts) for these operations.
 *
 * @param {boolean} isViewOnlyMode - If true, AI tool interactions that modify the map are disabled.
 * @returns An object containing various functions and state variables to be used by concept map editor components.
 */
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
    // setConceptExpansionPreview, // Removed from store, managed via stagedMapData
    // conceptExpansionPreview, // Removed from store
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
        // setConceptExpansionPreview: s.setConceptExpansionPreview, // Removed
        // conceptExpansionPreview: s.conceptExpansionPreview, // Removed
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
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<
    string[]
  >([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);
  const [isDagreTidying, setIsDagreTidying] = useState(false);
  const [isSummarizingMap, setIsSummarizingMap] = useState(false);
  const [mapSummaryResult, setMapSummaryResult] =
    useState<GenerateMapSummaryOutput | null>(null);
  const [isMapSummaryModalOpen, setIsMapSummaryModalOpen] = useState(false);

  const [isEdgeQuestionModalOpen, setIsEdgeQuestionModalOpen] = useState(false);
  const [edgeQuestionContext, setEdgeQuestionContext] =
    useState<AskQuestionAboutEdgeInput | null>(null);
  const [edgeQuestionAnswer, setEdgeQuestionAnswer] = useState<string | null>(
    null
  );
  const [isAskingAboutEdge, setIsAskingAboutEdge] = useState(false);

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
   * @returns {Promise<O | null>} The result of the AI flow function, or null if an error occurred or in view-only mode.
   */
  const callAIWithStandardFeedback = useCallback(
    async <I, O>(
      aiFunctionName: string,
      aiFlowFunction: (input: I) => Promise<O>,
      input: I,
      options?: {
        loadingMessage?: string;
        successTitle?: string;
        successDescription?: (output: O, input: I) => string; // Added input to successDescription
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

        if (options?.onSuccess) {
          options.onSuccess(result, input); // Pass input to onSuccess
        }

        if (!options?.hideSuccessToast) {
          toast({
            title: options?.successTitle || `${aiFunctionName} Successful!`,
            description: options?.successDescription
              ? options.successDescription(result, input) // Pass input to successDescription
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
        let errorMessageForLog = 'Unknown error during AI operation';

        if (
          error &&
          typeof error === 'object' &&
          'message' in error &&
          typeof error.message === 'string'
        ) {
          errorMessageForLog = error.message;
          const lowerErrorMessage = error.message.toLowerCase();

          // Prioritize error.details if available (often from Genkit)
          if (error.details) {
            if (typeof error.details === 'string') {
              userFriendlyMessage += `Details: ${error.details}`;
            } else if (
              typeof error.details === 'object' &&
              'message' in error.details &&
              typeof error.details.message === 'string'
            ) {
              userFriendlyMessage += `Details: ${error.details.message}`;
            } else {
              // Fallback to generic error message if details structure is unexpected
              userFriendlyMessage += `Details: ${error.message}`;
            }
          } else if (
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
            userFriendlyMessage = `The AI could not process the request due to content safety policies. Please review your input. Reason: ${error.message}`;
          } else if (
            lowerErrorMessage.includes('zoderror') ||
            lowerErrorMessage.includes('schema validation')
          ) {
            userFriendlyMessage += `There was an issue with the data format sent to the AI. Details: ${error.message}`;
            addDebugLog(
              `[AITools] Zod/Schema validation error likely: ${error.message}`
            );
          } else {
            userFriendlyMessage += `Details: ${error.message}`;
          }
        } else if (typeof error === 'string') {
          errorMessageForLog = error;
          userFriendlyMessage += `Details: ${error}`;
        }

        // Add standard "try again" message unless it's a specific non-retryable error
        if (
          !(
            error &&
            typeof error === 'object' &&
            'message' in error &&
            typeof error.message === 'string' &&
            (error.message.toLowerCase().includes('api key not valid') ||
              error.message.toLowerCase().includes('safety settings') ||
              error.message.toLowerCase().includes('policy violation') ||
              error.message.toLowerCase().includes('permission_denied'))
          )
        ) {
          userFriendlyMessage +=
            ' Please try again shortly. If the issue persists, check the developer console for more technical information or contact support.';
        }

        let errorHandledByCallback = false;
        if (options?.onError) {
          const callbackResult = options.onError(error, input); // Pass input to onError
          if (typeof callbackResult === 'boolean') {
            errorHandledByCallback = callbackResult;
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
          `[AITools] Error in ${aiFunctionName} (ID: ${currentProcessingId}): ${errorMessageForLog}`
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

  /**
   * Opens the modal for extracting concepts from text.
   * Pre-populates the text area based on the current selection (single node, multiple nodes, or a specific node ID).
   * @param {string} [nodeIdForContext] Optional ID of a node to use its content as initial text.
   */
  const openExtractConceptsModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({
          title: 'View Only Mode',
          description: 'AI tools are disabled.',
        });
        return;
      }
      resetAiSuggestions(); // Clear previous AI suggestions from the panel
      let initialText = '';
      // Determine initial text based on context
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
        mapData.nodes.find((n) => n.id === selectedElementId) // Ensure selectedElement is a node
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
      resetAiSuggestions, // Store action (stable)
      mapData.nodes, // Store state
      selectedElementId, // Store state
      multiSelectedNodeIds, // Store state
      toast, // Hook return (stable)
      setTextForExtraction, // Local useState setter (stable)
      setIsExtractConceptsModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Handles the AI call to extract concepts from the provided text.
   * Uses `callAIWithStandardFeedback` for standardized UI updates.
   * Updates the AI suggestion panel with the extracted concepts on success.
   * @param {string} text The text to extract concepts from.
   * @returns {Promise<boolean>} True if the AI call was successful, false otherwise.
   */
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
          loadingMessage: 'AI 正在從您的文本中提取概念...',
          successDescription: (
            res,
            _input // _input is available if needed for description
          ) => `${res.concepts.length} concepts found. View in AI Panel.`,
          onSuccess: (output, _input) => {
            if (output) setAiExtractedConcepts(output.concepts);
          },
        }
      );
      return !!output;
    },
    [callAIWithStandardFeedback, setAiExtractedConcepts] // setAiExtractedConcepts is stable
  );

  /**
   * Adds selected extracted concepts to the concept map.
   * Places new nodes using `getNodePlacement` utility.
   * Removes added concepts from the AI suggestion panel.
   * @param {ExtractedConceptItem[]} selectedConcepts Array of concept items to add.
   */
  const addExtractedConceptsToMap = useCallback(
    (selectedConcepts: ExtractedConceptItem[]) => {
      if (isViewOnlyMode || selectedConcepts.length === 0) return;
      let addedCount = 0;
      // Get current nodes from store for placement calculation to ensure fresh data
      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      selectedConcepts.forEach((conceptItem) => {
        addStoreNode({
          text: conceptItem.concept,
          type: 'ai-concept', // Mark as AI-generated
          position: getNodePlacement(
            currentNodes,
            'generic', // Placement strategy
            null, // No specific parent for generic placement
            null, // No specific anchor
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
        // Clean up suggestions panel
        removeExtractedConceptsFromSuggestions(
          selectedConcepts.map((c) => c.concept)
        );
      }
    },
    [
      isViewOnlyMode,
      toast,
      addStoreNode, // Stable action from store
      removeExtractedConceptsFromSuggestions, // Stable action
    ]
  );

  /**
   * Opens the modal for suggesting relations between concepts.
   * Pre-populates concepts based on selection or map context.
   * @param {string} [nodeIdForContext] Optional ID of a node to focus relation suggestion.
   */
  const openSuggestRelationsModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      resetAiSuggestions(); // Clear previous AI suggestions
      let concepts: string[] = [];
      const currentMapData = useConceptMapStore.getState().mapData; // Fresh data
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
        // Use texts of multi-selected nodes
        concepts = multiSelectedNodeIds
          .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
          .filter((text): text is string => !!text);
      } else if (selectedNode) {
        // Use selected node and its direct neighbors
        concepts.push(selectedNode.text);
        if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(
            graphInstance,
            selectedNode.id,
            { depth: 1, direction: 'all' } // Get immediate neighbors
          );
          concepts.push(
            ...neighborNodeIds
              .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
              .filter((text): text is string => !!text)
              .slice(0, 4) // Limit to a few neighbors for conciseness
          );
        }
      } else if (currentMapData.nodes.length > 0) {
        // Fallback to a few nodes from the map if no specific context
        concepts = currentMapData.nodes
          .slice(0, Math.min(5, currentMapData.nodes.length))
          .map((n) => n.text);
      }

      setConceptsForRelationSuggestion(
        concepts.length > 0 ? concepts : ['Example A', 'Example B'] // Placeholder if no concepts found
      );
      setIsSuggestRelationsModalOpen(true);
    },
    [
      isViewOnlyMode,
      resetAiSuggestions, // Store action (stable)
      mapData, // Store state (for nodes & edges)
      selectedElementId, // Store state
      multiSelectedNodeIds, // Store state
      toast, // Hook return (stable)
      setConceptsForRelationSuggestion, // Local useState setter (stable)
      setIsSuggestRelationsModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Handles the AI call to suggest relations for the given concepts.
   * Updates the AI suggestion panel with the results.
   * @param {string[]} concepts An array of concept texts.
   * @returns {Promise<boolean>} True if AI call was successful.
   */
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
          loadingMessage: 'AI 正在分析概念以建議關係...',
          successDescription: (
            res,
            _input // _input is available if needed for description
          ) => `${res.length} relations suggested. View in AI Panel.`,
          onSuccess: (output, _input) => {
            if (output) setAiSuggestedRelations(output);
          },
        }
      );
      return !!output;
    },
    [callAIWithStandardFeedback, setAiSuggestedRelations] // setAiSuggestedRelations is stable
  );

  /**
   * Adds selected suggested relations (edges) to the map.
   * If source/target concepts don't exist as nodes, they are created.
   * Removes added relations from the AI suggestion panel.
   * @param {SuggestRelationsOutput} selectedRelations Array of relation objects to add.
   */
  const addSuggestedRelationsToMap = useCallback(
    (selectedRelations: SuggestRelationsOutput) => {
      if (isViewOnlyMode || selectedRelations.length === 0) return;
      let relationsAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;
      // Get fresh map data from store for node/edge creation and checks
      const currentMapNodes = useConceptMapStore.getState().mapData.nodes;
      const currentMapEdges = useConceptMapStore.getState().mapData.edges;

      selectedRelations.forEach((rel) => {
        // Find or create source node
        let sourceNode = currentMapNodes.find(
          (node) =>
            node.text.toLowerCase().trim() === rel.source.toLowerCase().trim()
        );
        if (!sourceNode) {
          const newSourceNodeId = addStoreNode({
            // addStoreNode will use fresh mapData via its own getState()
            text: rel.source,
            type: 'ai-concept',
            position: getNodePlacement(
              useConceptMapStore.getState().mapData.nodes, // Use latest nodes for placement
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT
            ),
          });
          sourceNode = useConceptMapStore
            .getState()
            .mapData.nodes.find((node) => node.id === newSourceNodeId); // Re-fetch node after adding
          if (sourceNode) conceptsAddedFromRelationsCount++;
          else return; // Should not happen if addNode is successful
        }

        // Find or create target node
        let targetNode = currentMapNodes.find(
          (node) =>
            node.text.toLowerCase().trim() === rel.target.toLowerCase().trim()
        );
        if (!targetNode) {
          const newTargetNodeId = addStoreNode({
            text: rel.target,
            type: 'ai-concept',
            position: getNodePlacement(
              useConceptMapStore.getState().mapData.nodes, // Use latest nodes
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT
            ),
          });
          targetNode = useConceptMapStore
            .getState()
            .mapData.nodes.find((node) => node.id === newTargetNodeId);
          if (targetNode) conceptsAddedFromRelationsCount++;
          else return;
        }

        // Add edge if it doesn't already exist
        if (
          sourceNode &&
          targetNode &&
          !currentMapEdges.some(
            // Check against the snapshot of edges at the start of this function call
            (edge) =>
              edge.source === sourceNode!.id &&
              edge.target === targetNode!.id &&
              edge.label === rel.relation
          )
        ) {
          addStoreEdge({
            // addStoreEdge will use fresh mapData
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
      addStoreNode, // Stable action
      addStoreEdge, // Stable action
      removeSuggestedRelationsFromSuggestions, // Stable action
    ]
  );

  /**
   * Opens the modal to expand a concept, pre-filling context.
   * The concept to expand is typically the selected node or a general map topic if no node is selected.
   * Context is gathered from neighboring nodes.
   * @param {string} [nodeIdForContext] Optional ID of a node to be expanded.
   */
  const openExpandConceptModal = useCallback(
    (nodeIdForContext?: string) => {
      if (isViewOnlyMode) {
        toast({ title: 'View Only Mode' });
        return;
      }
      let conceptDetailsToSet: ConceptToExpandDetails | null = null;
      let context: string[] = [];
      const currentMapData = mapData; // mapData from the hook's store subscription
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
        // Gather context from neighbors
        if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(
            graphInstance,
            selectedNode.id,
            { depth: 1, direction: 'all' }
          );
          context = neighborNodeIds
            .map((id) => currentMapData.nodes.find((n) => n.id === id)?.text)
            .filter((text): text is string => !!text)
            .slice(0, 5); // Limit context size
        }
      } else if (currentMapData.nodes.length > 0) {
        // Fallback if no specific node is targeted for expansion
        conceptDetailsToSet = {
          id: null, // No specific source node ID for general expansion
          text: 'General Map Topic', // Placeholder text
          node: undefined,
        };
      } else {
        // Empty map scenario
        conceptDetailsToSet = { id: null, text: '', node: undefined };
      }

      setConceptToExpandDetails(conceptDetailsToSet);
      setMapContextForExpansion(context);
      setIsExpandConceptModalOpen(true);
    },
    [
      isViewOnlyMode,
      mapData, // Store state (for nodes & edges)
      selectedElementId, // Store state
      toast, // Hook return (stable)
      setConceptToExpandDetails, // Local useState setter (stable)
      setMapContextForExpansion, // Local useState setter (stable)
      setIsExpandConceptModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Handles the AI call to expand a concept.
   * On success, new ideas are placed into `stagedMapData` for user review and placement.
   * Requires `conceptToExpandDetails.id` to be set (i.e., a source node must exist on the map).
   * @param {ExpandConceptInput} input The input for the AI expansion flow.
   * @returns {Promise<boolean | null>} True if successful, null otherwise or if preconditions not met.
   */
  const handleConceptExpanded = useCallback(
    async (input: ExpandConceptInput) => {
      if (
        isViewOnlyMode ||
        !conceptToExpandDetails || // Ensure we have details of the concept to expand
        !conceptToExpandDetails.id // Crucially, we need the ID of an existing node on the map to attach expanded concepts
      ) {
        toast({
          title: 'Error',
          description:
            'Cannot expand concept without a source node on the map.',
          variant: 'destructive',
        });
        return null;
      }
      const parentNodeId = conceptToExpandDetails.id; // This is the ID of the node being expanded

      const output = await callAIWithStandardFeedback<
        ExpandConceptInput,
        ExpandConceptOutput
      >('Expand Concept', aiExpandConcept, input, {
        loadingMessage: `AI 正在擴展概念 "${input.concept}"...`,
        successTitle: 'AI Suggestions Ready',
        successDescription: (
          res,
          _input // _input is available if needed for description
        ) =>
          `${res.expandedIdeas.length} new ideas suggested. Review them for placement.`,
        processingId: parentNodeId,
        onSuccess: (output, _input_success) => {
          if (
            output &&
            output.expandedIdeas &&
            output.expandedIdeas.length > 0
          ) {
            // parentNodeId is from the outer scope of handleConceptExpanded
            const parentNode = mapData.nodes.find((n) => n.id === parentNodeId);
            if (!parentNode) {
              toast({
                title: 'Error',
                description:
                  'Parent node for expansion not found after AI call. This should not happen.',
                variant: 'destructive',
              });
              return;
            }

            // Prepare nodes and edges for staging
            const stagedNodes: ConceptMapNode[] = [];
            const stagedEdges: ConceptMapEdge[] = [];
            // Use fresh nodes from store for placement, as mapData in hook scope might be stale
            // if multiple expansions happen quickly or other updates occur.
            const currentNodesForPlacement = [
              ...useConceptMapStore.getState().mapData.nodes,
            ];

            output.expandedIdeas.forEach((idea, index) => {
              const newNodeId = `staged-exp-${parentNodeId}-${Date.now()}-${index}`;
              const position = getNodePlacement(
                currentNodesForPlacement, // Pass current set of nodes including previously placed staged ones
                'child', // Placement strategy relative to parent
                parentNode,
                null,
                GRID_SIZE_FOR_AI_PLACEMENT,
                index, // Sibling index for layout distribution
                output.expandedIdeas.length // Total siblings for layout distribution
              );
              const newNode: ConceptMapNode = {
                id: newNodeId,
                text: idea.text,
                details: idea.reasoning
                  ? `AI Rationale: ${idea.reasoning}`
                  : idea.details || '',
                type: 'ai-expanded', // Mark as AI-generated and expanded
                position,
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                childIds: [], // Initially no children for new nodes
              };
              stagedNodes.push(newNode);
              currentNodesForPlacement.push(newNode); // Add to placement context for next iteration

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
              originalElementId: parentNodeId, // ID of the node that was expanded
            });
            // `conceptExpansionPreview` state is removed from the store.
            // UI relying on it would now use `stagedMapData`.
          } else if (output) {
            // AI ran but had no expanded ideas
            toast({
              title: 'Expand Concept',
              description:
                'AI did not find any specific concepts to expand with.',
              variant: 'default',
            });
          }
        },
        // No specific onError needed here beyond default handling by callAIWithStandardFeedback
      });
      return !!output;
    },
    [
      isViewOnlyMode,
      toast,
      conceptToExpandDetails, // Local state
      mapData.nodes, // Store state
      callAIWithStandardFeedback,
      setStagedMapData, // Store action (stable)
    ]
  );

  /**
   * Opens the modal to ask a question about a specific node.
   * @param {string} nodeId The ID of the node to ask about.
   */
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
    [
      isViewOnlyMode,
      mapData.nodes, // Store state
      toast, // Hook return (stable)
      setNodeContextForQuestion, // Local useState setter (stable)
      setIsAskQuestionModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Handles the AI call to answer a question about a node.
   * The answer is displayed via a toast by `callAIWithStandardFeedback`.
   * @param {string} question The user's question.
   * @param {{ text: string; details?: string; id: string }} nodeCtx Context of the node.
   */
  const handleQuestionAnswered = useCallback(
    async (
      question: string,
      nodeCtx: { text: string; details?: string; id: string }
    ) => {
      const node = mapData.nodes.find((n) => n.id === nodeCtx.id);
      // This function primarily displays its result via a toast through `successDescription`.
      // No separate `onSuccess` or `onError` logic is needed here beyond what `callAIWithStandardFeedback` provides by default.
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
          successDescription: (res) => res.answer, // The answer is shown in the toast description
          hideSuccessToast: false, // We want this toast to show the answer
          processingId: nodeCtx.id,
          // No custom onSuccess needed as the primary display is via toast
          // No custom onError needed as default toast is sufficient
        }
      );
    },
    [callAIWithStandardFeedback, mapData.nodes] // mapData.nodes (store state) for finding node
  );

  /**
   * Opens the modal to rewrite a node's content using AI.
   * @param {string} nodeId The ID of the node to rewrite.
   */
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
    [
      isViewOnlyMode,
      mapData.nodes, // Store state
      toast, // Hook return (stable)
      setNodeContentToRewrite, // Local useState setter (stable)
      setIsRewriteNodeContentModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Confirms and applies the AI-rewritten content to a node.
   * This function is typically called from the rewrite modal after AI processing.
   * @param {string} nodeId ID of the node to update.
   * @param {string} newText The new text for the node.
   * @param {string} [newDetails] Optional new details for the node.
   * @param {string} [tone] Optional tone used for rewriting (for logging).
   */
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
        type: 'ai-rewritten-node', // Mark node as AI-rewritten
      });
      toast({
        title: 'Node Content Updated',
        description: 'Content rewritten by AI has been applied.',
      });
    },
    [
      isViewOnlyMode,
      updateStoreNode, // Stable action
      toast,
      addDebugLog, // Stable via getState()
    ]
  );

  /**
   * Handles summarizing the currently selected nodes using an AI flow.
   * On success, a new summary node and connecting edges are added to `stagedMapData`.
   */
  const handleSummarizeSelectedNodes = useCallback(async () => {
    const selectedNodes = mapData.nodes.filter(
      // mapData from hook scope
      (node) => multiSelectedNodeIds.includes(node.id) // multiSelectedNodeIds from hook scope
    );
    if (selectedNodes.length === 0 && !isViewOnlyMode) {
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
        loadingMessage: 'AI 正在總結您選擇的節點...',
        successTitle: 'AI Summary Created!',
        successDescription: (
          res,
          _input // _input is available if needed for description
        ) =>
          res.summary?.text
            ? 'A new node with the summary has been added to staging.'
            : 'AI could not generate a specific summary for the selection.',
        processingId:
          multiSelectedNodeIds.length > 0
            ? multiSelectedNodeIds[0]
            : 'summarize-selection',
        onSuccess: (output_success, _input_success) => {
          if (
            output_success &&
            output_success.summary &&
            output_success.summary.text
          ) {
            // Use fresh data from store for staging logic
            const currentMapNodes = useConceptMapStore.getState().mapData.nodes;
            const currentMultiSelectedNodeIds =
              useConceptMapStore.getState().multiSelectedNodeIds;

            const currentSelectedNodesForStaging = currentMapNodes.filter(
              (node) => currentMultiSelectedNodeIds.includes(node.id)
            );
            if (currentSelectedNodesForStaging.length === 0) return;

            // Calculate central point for placing the summary node
            const centralPoint = currentSelectedNodesForStaging.reduce(
              (acc, node) => ({
                x: acc.x + (node.x || 0),
                y: acc.y + (node.y || 0),
              }),
              { x: 0, y: 0 }
            );
            centralPoint.x /= currentSelectedNodesForStaging.length;
            centralPoint.y /= currentSelectedNodesForStaging.length;

            const summaryNodePosition = getNodePlacement(
              currentMapNodes, // Use current map nodes for context
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
              text: output_success.summary.text,
              details:
                output_success.summary.details ||
                `Summary of: ${currentSelectedNodesForStaging.map((n) => n.text).join(', ')}`,
              type: 'ai-summary-node',
              position: {
                x: summaryNodePosition.x,
                y:
                  summaryNodePosition.y -
                  (currentSelectedNodesForStaging.length > 1 ? 100 : 0), // Offset if many nodes
              },
              width: 200,
              height: 100,
              childIds: [],
            };
            const edgesToSummarizedNodes: ConceptMapEdge[] =
              currentSelectedNodesForStaging.map((node) => ({
                id: `staged-summaryedge-${node.id}-${Date.now()}`,
                source: tempSummaryNodeId,
                target: node.id,
                label: 'summary of',
              }));
            // Add to staging area for user review
            useConceptMapStore.getState().setStagedMapData({
              nodes: [summaryNode],
              edges: edgesToSummarizedNodes,
              actionType: 'summarizeNodes',
            });
          }
        },
        // No specific onError needed
      }
    );
  }, [
    isViewOnlyMode,
    mapData.nodes, // Still needed for the initial `selectedNodes` pre-AI call.
    multiSelectedNodeIds, // Still needed for the initial `selectedNodes` and `processingId`.
    toast,
    callAIWithStandardFeedback,
    // reactFlowInstance is not directly used here anymore.
    // setStagedMapData is called via getState().
  ]);

  /**
   * Handles a "quick expand" action from a mini-toolbar on a node.
   * Aims to generate a single, concise child idea.
   * @param {string} nodeId The ID of the node to quickly expand.
   */
  const handleMiniToolbarQuickExpand = useCallback(
    async (nodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === nodeId);
      if (!sourceNode) {
        toast({
          title: 'Error',
          description: 'Source node not found for quick expand.',
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
            // Gather minimal context
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
                .slice(0, 2); // Limited context
            }
            return [];
          })(),
          userRefinementPrompt:
            'Generate one concise, directly related child idea. Focus on a primary sub-topic or component.',
        },
        {
          loadingMessage: `AI 正在快速擴展 "${sourceNode.text || '節點'}"...`,
          successTitle: 'AI Suggestion Ready',
          successDescription: (
            res,
            _input // _input is available if needed for description
          ) =>
            res.expandedIdeas?.length > 0
              ? 'Review the suggested concept in the staging area.'
              : 'AI found no specific idea for quick expansion.',
          processingId: nodeId,
          onSuccess: (output_success, _input_success) => {
            if (
              output_success &&
              output_success.expandedIdeas &&
              output_success.expandedIdeas.length > 0
            ) {
              // sourceNode is captured in the outer scope of handleMiniToolbarQuickExpand
              // It should be stable for the duration of this specific AI call.
              const parentNode = sourceNode;
              if (!parentNode) {
                /* Should not happen due to check above in outer scope */ return;
              }

              const stagedNodes: ConceptMapNode[] = [];
              const stagedEdges: ConceptMapEdge[] = [];
              // Use fresh nodes from store for placement context
              const currentNodesForPlacement = [
                ...useConceptMapStore.getState().mapData.nodes,
              ];

              output_success.expandedIdeas.forEach((idea, index) => {
                // Usually one idea for quick expand
                const newNodeId = `staged-qexp-${parentNode.id}-${Date.now()}-${index}`;
                const position = getNodePlacement(
                  currentNodesForPlacement,
                  'child',
                  parentNode,
                  null,
                  GRID_SIZE_FOR_AI_PLACEMENT,
                  index,
                  output_success.expandedIdeas.length
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
                currentNodesForPlacement.push(newNode); // Add to placement context for next iteration
                stagedEdges.push({
                  id: `staged-qexp-edge-${parentNode.id}-${newNodeId}-${Date.now()}`,
                  source: parentNode.id,
                  target: newNodeId,
                  label: idea.relationLabel || 'related to',
                });
              });
              // setStagedMapData is from the hook's setup, safe to call
              setStagedMapData({
                nodes: stagedNodes,
                edges: stagedEdges,
                actionType: 'expandConcept',
                originalElementId: parentNode.id,
              });
            } else if (output_success) {
              // AI ran but no ideas
              toast({
                title: 'Quick Expand',
                description:
                  'AI did not find any specific idea for quick expansion.',
                variant: 'default',
              });
            }
          },
          // No specific onError needed
        }
      );
    },
    [
      isViewOnlyMode,
      toast,
      mapData, // Store state (for nodes & edges)
      callAIWithStandardFeedback,
      setStagedMapData, // Store action (stable)
    ]
  );

  /**
   * Handles a "concise rewrite" action from a mini-toolbar on a node.
   * Updates the node directly if successful.
   * @param {string} nodeId The ID of the node to rewrite concisely.
   */
  const handleMiniToolbarRewriteConcise = useCallback(
    async (nodeId: string) => {
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) {
        toast({
          title: 'Error',
          description: 'Node not found for rewrite.',
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
          loadingMessage: `AI 正在簡化 "${node.text || '節點內容'}"...`,
          successTitle: 'Content Rewritten Concisely!',
          successDescription: (
            res,
            _input // _input is available if needed for description
          ) =>
            res.rewrittenText
              ? 'Node content updated.'
              : 'AI could not make it more concise.',
          hideSuccessToast: !node?.text, // Effectively, always show toast unless text was empty
          processingId: nodeId,
          onSuccess: (output_success, _input_success) => {
            if (output_success && output_success.rewrittenText) {
              // nodeId is from the outer scope of handleMiniToolbarRewriteConcise
              // updateStoreNode is from the hook's setup, safe to call
              updateStoreNode(nodeId, {
                text: output_success.rewrittenText,
                details: output_success.rewrittenDetails,
                type: 'ai-rewritten-node',
              });
            }
          },
          // No specific onError needed
        }
      );
    },
    [
      isViewOnlyMode,
      toast,
      mapData.nodes, // Store state
      updateStoreNode, // Store action (stable)
      callAIWithStandardFeedback,
    ]
  );

  /**
   * Fetches and sets AI-suggested labels for an edge.
   * Results are stored in local state `edgeLabelSuggestions` for UI to pick up.
   * @param {string} edgeId ID of the edge.
   * @param {string} sourceNodeId ID of the source node.
   * @param {string} targetNodeId ID of the target node.
   * @param {string} [existingLabel] Optional existing label of the edge.
   */
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
          loadingMessage: 'AI 正在為邊建議標籤...',
          successTitle: 'Edge Label Suggestions Ready',
          hideSuccessToast: true, // Suggestions are typically shown in a dropdown or similar UI
          onSuccess: (output_success, _input_success) => {
            // Renamed to avoid conflict
            // edgeId is from the outer scope of fetchAndSetEdgeLabelSuggestions
            if (output_success && output_success.suggestedLabels.length > 0) {
              setEdgeLabelSuggestions({
                edgeId,
                labels: output_success.suggestedLabels,
              });
            } else if (output_success) {
              // AI ran but no specific suggestions
              setEdgeLabelSuggestions({ edgeId, labels: ['related to'] }); // Provide a default
            }
          },
          // No specific onError needed
        }
      );
    },
    [
      mapData.nodes, // Store state
      toast,
      callAIWithStandardFeedback,
      setEdgeLabelSuggestions, // Local useState setter (stable)
    ]
  );

  /**
   * Fetches AI-suggested texts for potential child nodes of a given parent node.
   * Results are stored in local state `aiChildTextSuggestions`.
   * @param {RFNode<CustomNodeData> | null} node The parent React Flow node.
   */
  const fetchAIChildTextSuggestions = useCallback(
    async (node: RFNode<CustomNodeData> | null) => {
      if (!node) return;
      setIsLoadingAiChildTexts(true); // Manage local loading state for this specific UI element
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
              ?.map((id) => mapData.nodes.find((n) => n.id === id)?.text) // mapData from hook scope
              .filter(Boolean) as string[]) || [],
        },
        {
          loadingMessage: `AI 正在為 "${node.data.label || '節點'}" 建議子節點文本...`,
          successTitle: 'Child Node Ideas Ready',
          hideSuccessToast: true, // Suggestions displayed in UI, not toast
          processingId: node.id,
          onSuccess: (output_success, _input_success) => {
            // Renamed to avoid conflict
            if (output_success)
              setAiChildTextSuggestions(output_success.suggestedChildTexts);
          },
          // No specific onError needed
        }
      );
      setIsLoadingAiChildTexts(false); // Ensure loading state is reset
    },
    [
      callAIWithStandardFeedback,
      mapData.nodes, // Store state
      setIsLoadingAiChildTexts,
      setAiChildTextSuggestions,
    ]
  );

  /**
   * Handles confirmation of a refined AI suggestion, typically from a modal.
   * This was previously tied to `conceptExpansionPreview`, now adapted for `stagedMapData`.
   * Updates the specific node within `stagedMapData` with the refined text/details.
   * @param {string} nodeId ID of the staged node to refine.
   * @param {string} refinementInstruction User's instruction for refinement.
   */
  const handleRefineSuggestionConfirm = useCallback(
    async (nodeId: string, refinementInstruction: string) => {
      const currentStagedMapData = useConceptMapStore.getState().stagedMapData;
      if (!currentStagedMapData || !currentStagedMapData.nodes) {
        toast({
          title: 'Error',
          description: 'No staged data available to refine.',
          variant: 'destructive',
        });
        return;
      }

      const nodeToRefineIndex = currentStagedMapData.nodes.findIndex(
        (n) => n.id === nodeId
      );
      if (nodeToRefineIndex === -1) {
        toast({
          title: 'Error',
          description:
            'Could not find the suggestion in staged data to refine.',
          variant: 'destructive',
        });
        return;
      }
      const nodeToRefine = currentStagedMapData.nodes[nodeToRefineIndex];

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
          loadingMessage: `AI 正在優化建議 "${nodeToRefine?.text || '內容'}"...`,
          successTitle: 'Suggestion Refined!',
          processingId: nodeId, // ID of the staged node being processed
          onSuccess: (output_success, _input_success) => {
            // Renamed to avoid conflict
            // currentStagedMapData, nodeToRefineIndex are from the outer scope of handleRefineSuggestionConfirm
            // These should be stable for this specific AI call's success handler.
            // However, for safety, re-fetch staged data if there's a concern about intervening updates,
            // though typically this modal interaction would be atomic.
            const freshStagedMapData =
              useConceptMapStore.getState().stagedMapData;
            if (!freshStagedMapData || !freshStagedMapData.nodes) {
              toast({
                title: 'Error',
                description: 'Staged data disappeared during refinement.',
                variant: 'destructive',
              });
              return;
            }
            const freshNodeToRefineIndex = freshStagedMapData.nodes.findIndex(
              (n) => n.id === nodeId
            );
            if (freshNodeToRefineIndex === -1) {
              toast({
                title: 'Error',
                description: 'Refined node not found in fresh staged data.',
                variant: 'destructive',
              });
              return;
            }

            if (output_success && freshStagedMapData) {
              const updatedNodes = [...freshStagedMapData.nodes];
              updatedNodes[freshNodeToRefineIndex] = {
                ...updatedNodes[freshNodeToRefineIndex], // Spread existing properties
                text: output_success.refinedText,
                details: output_success.refinedDetails,
                type: 'ai-refined-staged', // Update type to indicate refinement
              };
              // Update the entire stagedMapData in the store
              useConceptMapStore.getState().setStagedMapData({
                ...freshStagedMapData,
                nodes: updatedNodes,
              });
              toast({
                title: 'Staged Suggestion Updated',
                description:
                  'The refined suggestion is updated in the staging area.',
              });
            }
          },
          // No specific onError needed
        }
      );
    },
    [toast, callAIWithStandardFeedback] // Both stable
  );

  /**
   * Handles AI request to suggest an intermediate node between two existing nodes connected by an edge.
   * On success, the new intermediate node and two new connecting edges are placed in `stagedMapData`.
   * The original edge is implicitly marked for removal if the staged data is committed.
   * @param {string} edgeId ID of the original edge.
   * @param {string} sourceNodeId ID of the source node.
   * @param {string} targetNodeId ID of the target node.
   */
  const handleSuggestIntermediateNodeRequest = useCallback(
    async (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === sourceNodeId); // mapData from hook scope
      const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
      const edge = mapData.edges.find((e) => e.id === edgeId);
      if (!sourceNode || !targetNode || !edge) {
        toast({
          title: 'Error',
          description:
            'Edge context not found for intermediate node suggestion.',
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
          loadingMessage: 'AI 正在建議中間節點...',
          successTitle: 'Intermediate Node Suggested',
          successDescription: (
            res,
            _input // _input is available if needed for description
          ) =>
            `AI suggests adding '${res.intermediateNodeText}'. Review in staging area.`,
          onSuccess: (output_success, _input_success) => {
            if (output_success) {
              // sourceNodeId, targetNodeId, edge.id are from the outer scope of handleSuggestIntermediateNodeRequest
              // Fetch fresh node data from store for position calculation to be safe
              const currentMapNodes =
                useConceptMapStore.getState().mapData.nodes;
              const currentSourceNode = currentMapNodes.find(
                (n) => n.id === sourceNodeId
              );
              const currentTargetNode = currentMapNodes.find(
                (n) => n.id === targetNodeId
              );
              const originalEdge = useConceptMapStore
                .getState()
                .mapData.edges.find((e) => e.id === edgeId);

              if (!currentSourceNode || !currentTargetNode || !originalEdge) {
                toast({
                  title: 'Error',
                  description: 'Context nodes or original edge vanished.',
                  variant: 'destructive',
                });
                return;
              }

              const tempNodeId = `staged-intermediate-${Date.now()}`;
              // Ensure x and y positions exist on nodes before using them
              const sourceX = currentSourceNode.x || 0;
              const sourceY = currentSourceNode.y || 0;
              const targetX = currentTargetNode.x || 0;
              const targetY = currentTargetNode.y || 0;

              const midX = (sourceX + targetX) / 2;
              const midY = (sourceY + targetY) / 2;

              const intermediateNodeData: ConceptMapNode = {
                id: tempNodeId,
                text: output_success.intermediateNodeText,
                details: output_success.intermediateNodeDetails
                  ? `${output_success.intermediateNodeDetails}${output_success.reasoning ? `\n\nAI Rationale: ${output_success.reasoning}` : ''}`
                  : output_success.reasoning
                    ? `AI Rationale: ${output_success.reasoning}`
                    : '',
                type: 'ai-intermediate',
                position: { x: midX, y: midY + 30 }, // Offset slightly for visibility
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
                childIds: [],
              };
              const edgeToIntermediate: ConceptMapEdge = {
                id: `staged-edge1-${Date.now()}`,
                source: currentSourceNode.id,
                target: tempNodeId,
                label: output_success.labelSourceToIntermediate,
              };
              const edgeFromIntermediate: ConceptMapEdge = {
                id: `staged-edge2-${Date.now()}`,
                source: tempNodeId,
                target: currentTargetNode.id,
                label: output_success.labelIntermediateToTarget,
              };

              // Set staged data, originalElementId indicates which edge will be replaced upon commit
              useConceptMapStore.getState().setStagedMapData({
                nodes: [intermediateNodeData],
                edges: [edgeToIntermediate, edgeFromIntermediate],
                actionType: 'intermediateNode',
                originalElementId: originalEdge.id, // Store the ID of the edge being replaced
              });
            }
          },
          // No specific onError needed
        }
      );
    },
    [mapData, callAIWithStandardFeedback] // mapData (store state). Store access in onSuccess.
  );

  /**
   * Handles the AI-powered "Tidy Up Selection" feature.
   * This can result in either new node positions (ghost preview) or a new parent group with rearranged children (staged data).
   */
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
        /* ...node properties... */ id: n.id,
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
      { nodes: nodesToTidy, mapLayoutContext: {} },
      {
        loadingMessage: 'AI 正在整理您選擇的節點佈局...',
        successTitle: 'Selection Tidied by AI!', // General title, specific toasts in onSuccess
        hideSuccessToast: true, // Suppress default toast as onSuccess has specific ones
        onSuccess: (output_success, _input_success) => {
          if (output_success && output_success.newPositions) {
            // nodesToTidy is from the outer scope of handleAiTidyUpSelection
            // It should be stable for this AI call's success handler.
            if (!nodesToTidy || nodesToTidy.length === 0) {
              toast({
                title: 'Error',
                description:
                  'Nodes to tidy are missing in AI Tidy Up onSuccess.',
                variant: 'destructive',
              });
              return;
            }
            if (output_success.suggestedParentNode) {
              const newParentNodeId = `staged-parent-${Date.now()}`;
              let minX = Infinity,
                minY = Infinity,
                maxX = -Infinity,
                maxY = -Infinity;
              output_success.newPositions.forEach((p) => {
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
                text: output_success.suggestedParentNode.text,
                type:
                  output_success.suggestedParentNode.type || 'ai-group-parent',
                position: { x: parentX, y: parentY },
                width: parentWidth,
                height: parentHeight,
                details: `AI suggested parent for ${nodesToTidy.length} nodes.`,
                childIds: output_success.newPositions.map((p) => p.id),
              };
              const stagedChildNodes: ConceptMapNode[] =
                output_success.newPositions.map((p) => {
                  const originalNode = nodesToTidy.find((n) => n.id === p.id);
                  return {
                    ...(originalNode as ConceptMapNode), // Type assertion
                    id: p.id,
                    x: p.x,
                    y: p.y,
                    parentNode: newParentNodeId,
                    width: originalNode?.width || DEFAULT_NODE_WIDTH,
                    height: originalNode?.height || DEFAULT_NODE_HEIGHT,
                  };
                });
              useConceptMapStore.getState().setStagedMapData({
                nodes: [stagedParentNode, ...stagedChildNodes],
                edges: [],
                actionType: 'aiTidyUpComplete',
                originalElementIds: nodesToTidy.map((n) => n.id),
              });
              toast({
                title: 'AI Tidy Up Suggestion Ready',
                description:
                  'Review the proposed grouping and layout in the staging area.',
              });
            } else {
              // Only new positions, no new parent
              const layoutUpdatesWithDimensions =
                output_success.newPositions.map((lu) => {
                  const originalNode = nodesToTidy.find((n) => n.id === lu.id);
                  return {
                    id: lu.id,
                    x: lu.x,
                    y: lu.y,
                    width: originalNode?.width || DEFAULT_NODE_WIDTH,
                    height: originalNode?.height || DEFAULT_NODE_HEIGHT,
                  };
                });
              useConceptMapStore
                .getState()
                .setGhostPreview(layoutUpdatesWithDimensions);
              toast({
                title: 'Layout Preview Ready',
                description:
                  'AI Tidy Up proposes new layout. Accept or Cancel.',
              });
            }
          } else if (output_success) {
            // AI ran but no new positions
            toast({
              title: 'AI Tidy Up',
              description:
                'AI did not suggest any changes for the current selection.',
              variant: 'default',
            });
          }
        },
        // No specific onError needed
      }
    );
  }, [
    multiSelectedNodeIds, // Store state
    mapData.nodes, // Store state
    callAIWithStandardFeedback,
    toast,
  ]);

  /**
   * Fetches AI-driven suggestions for improving the overall map structure,
   * such as new edges or potential node groupings.
   * Results are stored in the `structuralSuggestions` part of the concept map store.
   */
  const handleSuggestMapImprovements = useCallback(async () => {
    const currentNodes = mapData.nodes.map((n) => ({
      id: n.id,
      text: n.text,
      details: n.details || '',
    }));
    const currentEdges: AISharedSimplifiedEdgeInput[] = mapData.edges.map(
      (e) => ({ source: e.source, target: e.target, label: e.label || '' })
    );
    await callAIWithStandardFeedback<
      AISuggestMapImprovementsInput,
      SuggestedImprovements
    >(
      'Suggest Map Improvements',
      suggestMapImprovementsFlow,
      { nodes: currentNodes, edges: currentEdges },
      {
        loadingMessage: 'AI 正在分析您的概念圖以尋找改進建議...',
        successTitle: 'Improvement Suggestions Ready!',
        successDescription: (
          res,
          _input // _input is available if needed for description
        ) =>
          `Found ${res.suggestedEdges.length} edge and ${res.suggestedGroups.length} group suggestions.`,
        onSuccess: (output_success, _input_success) => {
          if (output_success) {
            useConceptMapStore
              .getState()
              .setStructuralSuggestions(output_success);
          }
        },
        // No specific onError needed
      }
    );
  }, [mapData, callAIWithStandardFeedback]); // mapData for currentNodes/Edges. Store access in onSuccess.

  /**
   * Arranges the selected nodes using the Dagre layout algorithm.
   * This is a deterministic layout, not AI-driven in the generative sense.
   * Results are shown as a ghost preview.
   */
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
    applyLayout, // applyLayout is from useConceptMapStore, not mapData directly
    // Explicitly list mapData dependencies if needed, or ensure they are stable / correctly memoized by parent
    mapData.nodes, // Store state
    mapData.edges, // Store state
    multiSelectedNodeIds, // Store state
    setIsDagreTidying, // Local useState setter (stable)
  ]);

  const getPaneSuggestions = useCallback((): SuggestionAction[] => [], []);
  const getNodeSuggestions = useCallback(
    (_node: RFNode<CustomNodeData>): SuggestionAction[] => [],
    []
  );
  const acceptAllExpansionPreviews = useCallback(() => {}, []);
  const acceptSingleExpansionPreview = useCallback(
    (_previewNodeId: string) => {},
    []
  );
  const clearExpansionPreview = useCallback(() => {}, []);
  const openRefineSuggestionModal = useCallback(
    (_previewNodeId: string, _parentNodeId: string) => {
      // This would need to find the item in stagedMapData and populate the refine modal
      // For now, it's a placeholder.
      const stagedItem = useConceptMapStore
        .getState()
        .stagedMapData?.nodes.find((n) => n.id === _previewNodeId);
      if (stagedItem) {
        setRefineModalInitialData({
          nodeId: stagedItem.id,
          parentNodeId:
            useConceptMapStore.getState().stagedMapData?.originalElementId ||
            _parentNodeId, // Fallback
          text: stagedItem.text,
          details: stagedItem.details,
        });
        setIsRefineModalOpen(true);
      } else {
        toast({
          title: 'Error',
          description: 'Could not find item in staging area to refine.',
        });
      }
    },
    [
      toast,
      setRefineModalInitialData, // Local useState setter (stable)
      setIsRefineModalOpen, // Local useState setter (stable)
    ]
  );

  /**
   * Handles AI summarization of the entire concept map.
   * Displays the summary in a modal.
   */
  const handleSummarizeMap = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({
        title: 'View Only Mode',
        description: 'Cannot summarize map in view-only mode.',
      });
      return;
    }
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
    await callAIWithStandardFeedback<
      GenerateMapSummaryInput,
      GenerateMapSummaryOutput
    >(
      'Summarize Map',
      generateMapSummaryFlow,
      { nodes: currentMapData.nodes, edges: currentMapData.edges },
      {
        loadingMessage: 'AI 正在分析和總結您的整個概念圖...',
        successTitle: 'Map Summary Ready!',
        hideSuccessToast: true, // Modal will show the summary
        processingId: 'summarize-entire-map',
        onSuccess: (output_success, _input_success) => {
          if (output_success) {
            setMapSummaryResult(output_success);
            setIsMapSummaryModalOpen(true);
          } else {
            setMapSummaryResult(null); // Explicitly set to null if AI returns nothing
            toast({
              title: 'Map Summary',
              description: 'AI could not generate a summary.',
            });
          }
        },
        onError: (_error, _input_error) => {
          // Renamed to avoid conflict
          setMapSummaryResult(null);
          // Default error toast will show (as we return false), but we ensure state is clean.
          return false; // Allow default error toast
        },
      }
    );
    setIsSummarizingMap(false); // Ensure this runs even if AI call fails or has no output
  }, [
    isViewOnlyMode,
    callAIWithStandardFeedback,
    toast,
    setIsSummarizingMap,
    setMapSummaryResult,
    setIsMapSummaryModalOpen,
  ]);

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
    [
      isViewOnlyMode,
      mapData.nodes,
      mapData.edges,
      toast,
      setEdgeQuestionContext,
      setEdgeQuestionAnswer,
      setIsEdgeQuestionModalOpen,
    ]
  );

  const handleAskQuestionAboutEdge = useCallback(
    async (question: string) => {
      if (isViewOnlyMode) {
        /* ... */ return;
      }
      if (!edgeQuestionContext) {
        /* ... */ return;
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
        loadingMessage: 'AI 正在思考您關於邊的問題...',
        successTitle: 'AI Answer Received', // This will be shown in modal, so toast can be hidden
        hideSuccessToast: true,
        processingId: `edge-qa-${edgeQuestionContext.edgeId}`, // edgeQuestionContext from outer scope
        onSuccess: (output_success, _input_success) => {
          // Renamed to avoid conflict
          if (output_success?.answer) {
            setEdgeQuestionAnswer(output_success.answer);
          } else if (output_success?.error) {
            setEdgeQuestionAnswer(`Error from AI: ${output_success.error}`);
          } else {
            setEdgeQuestionAnswer(
              'AI could not provide a specific answer for this question.'
            );
          }
        },
        onError: (_error, _input_error) => {
          // Renamed to avoid conflict
          setEdgeQuestionAnswer(
            'Failed to get an answer from AI. Please try again.'
          );
          return false; // Allow default error toast
        },
      });
      setIsAskingAboutEdge(false); // Ensure this runs
    },
    [
      isViewOnlyMode,
      edgeQuestionContext, // Local state
      callAIWithStandardFeedback,
      setEdgeQuestionAnswer, // Local useState setter (stable)
      setIsAskingAboutEdge, // Local useState setter (stable)
    ]
  );

  const openAskQuestionAboutMapContextModal = useCallback(() => {
    if (isViewOnlyMode) {
      /* ... */ return;
    }
    setMapContextQuestionAnswer(null); // Clear previous answer
    setIsMapContextQuestionModalOpen(true);
  }, [
    isViewOnlyMode,
    toast,
    setMapContextQuestionAnswer, // Local useState setter (stable)
    setIsMapContextQuestionModalOpen, // Local useState setter (stable)
  ]);

  const handleAskQuestionAboutMapContext = useCallback(
    async (question: string) => {
      if (isViewOnlyMode) {
        /* ... */ return;
      }
      const currentMapDataFromStore = useConceptMapStore.getState().mapData;
      const currentMapNameFromStore = useConceptMapStore.getState().mapName;
      const currentMapIdFromStore = useConceptMapStore.getState().mapId;
      if (currentMapDataFromStore.nodes.length === 0) {
        /* ... */ return;
      }

      setIsAskingAboutMapContext(true);
      const simplifiedNodes = currentMapDataFromStore.nodes.map((n) => ({
        /* ... */
      }));
      const simplifiedEdges = currentMapDataFromStore.edges.map((e) => ({
        /* ... */
      }));
      const input: AskQuestionAboutMapContextInput = {
        /* ... */ nodes: simplifiedNodes,
        edges: simplifiedEdges,
        userQuestion: question,
        mapName: currentMapNameFromStore,
      };

      await callAIWithStandardFeedback<
        AskQuestionAboutMapContextInput,
        AskQuestionAboutMapContextOutput
      >('Ask AI About Map', askQuestionAboutMapContextFlow, input, {
        loadingMessage: 'AI 正在分析整個概念圖以回答您的問題...',
        successTitle: 'AI Answer Received', // Modal will show this
        hideSuccessToast: true,
        processingId: `map-qa-${currentMapIdFromStore || 'current'}`,
        onSuccess: (output_success, _input_success) => {
          // Renamed to avoid conflict
          if (output_success?.answer) {
            setMapContextQuestionAnswer(output_success.answer);
          } else if (output_success?.error) {
            setMapContextQuestionAnswer(
              `Error from AI: ${output_success.error}`
            );
          } else {
            setMapContextQuestionAnswer(
              'AI could not provide an answer for this question about the map.'
            );
          }
        },
        onError: (_error, _input_error) => {
          // Renamed to avoid conflict
          setMapContextQuestionAnswer(
            'Failed to get an answer from AI about the map. Please try again.'
          );
          return false; // Allow default error toast
        },
      });
      setIsAskingAboutMapContext(false); // Ensure this runs
    },
    [
      isViewOnlyMode,
      callAIWithStandardFeedback,
      toast, // Hook return (stable)
      setMapContextQuestionAnswer, // Local useState setter (stable)
      setIsAskingAboutMapContext, // Local useState setter (stable)
    ]
  );

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
    handleSuggestIntermediateNodeRequest,
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
    addStoreNode,
    addStoreEdge,
    handleAiTidyUpSelection,
    handleDagreLayoutSelection,
    isDagreTidying,
    handleSuggestMapImprovements,
    handleSummarizeMap,
    isSummarizingMap,
    mapSummaryResult,
    isMapSummaryModalOpen,
    setIsMapSummaryModalOpen,
    clearMapSummaryResult: () => setMapSummaryResult(null),

    // Edge Q&A
    openAskQuestionAboutEdgeModal,
    handleAskQuestionAboutEdge,
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
    openAskQuestionAboutMapContextModal,
    handleAskQuestionAboutMapContext,
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
