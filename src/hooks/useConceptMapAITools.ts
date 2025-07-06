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
  type AskQuestionAboutMapContextOutput,
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
   * @returns The result of the AI flow function, or null if an error occurred or in view-only mode.
   */
  const callAIWithStandardFeedback = useCallback(
    async <I, O>(
      aiFunctionName: string,
      aiFlowFunction: (input: I) => Promise<O>,
      input: I,
      options?: { // Original options, without onSuccess/onError in signature
        loadingMessage?: string;
        successTitle?: string;
        successDescription?: (output: O) => string;
        hideSuccessToast?: boolean;
        processingId?: string | null;
        // onSuccess?: (output: O, input: I) => void; // Described in JSDoc, but not in this restored signature
        // onError?: (error: unknown, input: I) => boolean | void; // Described in JSDoc, but not in this restored signature
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

        // Placeholder for where options.onSuccess would be called
        // if (options?.onSuccess) { /* ... */ }

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
      } catch (error: any) {
        loadingToast.dismiss();
        console.error(
          `Error in ${aiFunctionName} (ID: ${currentProcessingId}):`,
          error
        );
        let userFriendlyMessage = `The AI operation "${aiFunctionName}" failed. `;
        let errorMessageForLog = 'Unknown error during AI operation';

        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
          errorMessageForLog = error.message;
          const lowerErrorMessage = error.message.toLowerCase();
          if (lowerErrorMessage.includes('deadline_exceeded') || lowerErrorMessage.includes('timeout')) {
            userFriendlyMessage += 'The request timed out. This might be due to high server load or a complex request. Please try again in a few moments.';
          } else if (lowerErrorMessage.includes('resource_exhausted') || lowerErrorMessage.includes('quota')) {
            userFriendlyMessage += 'The AI resources are temporarily unavailable or quota has been exceeded. Please try again later or check your service plan.';
          } else if (lowerErrorMessage.includes('api key not valid')) {
            userFriendlyMessage = 'AI service configuration error. Please contact support.';
          } else if (lowerErrorMessage.includes('context length') || lowerErrorMessage.includes('input too long') || lowerErrorMessage.includes('token limit')) {
            userFriendlyMessage += 'The provided text or map data is too large for the AI to process. Please try with a smaller selection or a less complex map.';
          } else if (lowerErrorMessage.includes('safety settings') || lowerErrorMessage.includes('policy violation') || lowerErrorMessage.includes('blocked') || lowerErrorMessage.includes('unsafe content')) {
            userFriendlyMessage = `The AI could not process the request due to content safety policies. Please review your input. Reason: ${error.message}`;
          } else if (lowerErrorMessage.includes('zoderror') || lowerErrorMessage.includes('schema validation')) {
            userFriendlyMessage += `There was an issue with the data format sent to the AI. Details: ${error.message}`;
            addDebugLog(`[AITools] Zod/Schema validation error likely: ${error.message}`);
          } else if (typeof error.details === 'string' && error.details.toLowerCase().includes('permission_denied')) {
            userFriendlyMessage = 'AI operation failed due to a permission issue with the underlying service. Please check configurations or contact support.';
          } else if (typeof error.details === 'string' && error.details) {
             userFriendlyMessage += `Details: ${error.details}`;
          }else {
            userFriendlyMessage += `Details: ${error.message}`;
          }
        } else if (typeof error === 'string') {
           errorMessageForLog = error;
           userFriendlyMessage += `Details: ${error}`;
        }

        if (
          !(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.toLowerCase().includes('api key not valid')) &&
          !(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && (error.message.toLowerCase().includes('safety settings') || error.message.toLowerCase().includes('policy violation')))
        ) {
          userFriendlyMessage += ' Please try again shortly. If the issue persists, check the developer console for more technical information or contact support.';
        }

        let errorHandledByCallback = false;
        // Placeholder for where options.onError would be called
        // if (options?.onError) { /* ... errorHandledByCallback = options.onError(error, input); ... */ }

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
          // onSuccess logic was here
        }
      );
      if (output) setAiExtractedConcepts(output.concepts); // Original position
      return !!output;
    },
    [callAIWithStandardFeedback, setAiExtractedConcepts]
  );

  const addExtractedConceptsToMap = useCallback(
    (selectedConcepts: ExtractedConceptItem[]) => {
      if (isViewOnlyMode || selectedConcepts.length === 0) return;
      let addedCount = 0;
      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      selectedConcepts.forEach((conceptItem) => {
        addStoreNode({
          text: conceptItem.concept,
          type: 'ai-concept',
          position: getNodePlacement(
            currentNodes,
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
      // mapData.nodes, // Dependency was here
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
          // onSuccess logic was here
        }
      );
      if (output) setAiSuggestedRelations(output); // Original position
      return !!output;
    },
    [callAIWithStandardFeedback, setAiSuggestedRelations]
  );

  const addSuggestedRelationsToMap = useCallback(
    (selectedRelations: SuggestRelationsOutput) => {
      if (isViewOnlyMode || selectedRelations.length === 0) return;
      let relationsAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;
      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      selectedRelations.forEach((rel) => {
        let sourceNode = useConceptMapStore
          .getState()
          .mapData.nodes.find(
            (node) =>
              node.text.toLowerCase().trim() === rel.source.toLowerCase().trim()
          );
        if (!sourceNode) {
          const newSourceNodeId = addStoreNode({
            text: rel.source,
            type: 'ai-concept',
            position: getNodePlacement(
              currentNodes,
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT
            ),
          });
          sourceNode = useConceptMapStore
            .getState()
            .mapData.nodes.find((node) => node.id === newSourceNodeId);
          if (sourceNode) conceptsAddedFromRelationsCount++;
          else return;
        }
        let targetNode = useConceptMapStore
          .getState()
          .mapData.nodes.find(
            (node) =>
              node.text.toLowerCase().trim() === rel.target.toLowerCase().trim()
          );
        if (!targetNode) {
          const newTargetNodeId = addStoreNode({
            text: rel.target,
            type: 'ai-concept',
            position: getNodePlacement(
              currentNodes,
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
        const currentEdgesSnapshot =
          useConceptMapStore.getState().mapData.edges;
        if (
          sourceNode &&
          targetNode &&
          !currentEdgesSnapshot.some(
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
      // mapData.nodes, mapData.edges were here
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
      const currentMapData = mapData;
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
        // onSuccess logic was here
      });

      // Original success logic (now would be in onSuccess)
      if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
        const parentNode = mapData.nodes.find((n) => n.id === parentNodeId);
        if (!parentNode) {
          toast({ title: 'Error', description: 'Parent node for expansion not found.', variant: 'destructive' });
          return null;
        }
        const stagedNodes: ConceptMapNode[] = [];
        const stagedEdges: ConceptMapEdge[] = [];
        const existingNodesForPlacement = [...mapData.nodes];
        output.expandedIdeas.forEach((idea, index) => {
          const newNodeId = `staged-exp-${parentNodeId}-${Date.now()}-${index}`;
          const position = getNodePlacement(existingNodesForPlacement, 'child', parentNode, null, GRID_SIZE_FOR_AI_PLACEMENT, index, output.expandedIdeas.length);
          const newNode: ConceptMapNode = { id: newNodeId, text: idea.text, details: idea.reasoning ? `AI Rationale: ${idea.reasoning}` : idea.details || '', type: 'ai-expanded', position, width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT, childIds: [] };
          stagedNodes.push(newNode);
          existingNodesForPlacement.push(newNode);
          stagedEdges.push({ id: `staged-exp-edge-${parentNodeId}-${newNodeId}-${Date.now()}`, source: parentNodeId, target: newNodeId, label: idea.relationLabel || 'related to' });
        });
        setStagedMapData({ nodes: stagedNodes, edges: stagedEdges, actionType: 'expandConcept', originalElementId: parentNodeId });
        setConceptExpansionPreview(null);
        toast({ title: 'AI Suggestions Ready', description: `${stagedNodes.length} new ideas sent to the Staging Area for review.` });
      } else if (output) {
        setConceptExpansionPreview(null);
        toast({ title: 'Expand Concept', description: 'AI did not find any specific concepts to expand with.', variant: 'default' });
      }
      return !!output;
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
          // No specific onSuccess needed as successDescription handles it
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
    const selectedNodes = mapData.nodes.filter((node) => // Use mapData from hook scope
      multiSelectedNodeIds.includes(node.id)
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
        loadingMessage: `AI is summarizing ${selectedNodes.length} selected node(s)...`,
        successTitle: 'AI Summary Created!',
        successDescription: (res) =>
          res.summary?.text
            ? 'A new node with the summary has been added.'
            : 'AI could not generate a specific summary for the selection.',
        processingId:
          multiSelectedNodeIds.length > 0
            ? multiSelectedNodeIds[0]
            : 'summarize-selection',
        // onSuccess logic was here
      }
    );
    // Original success logic
    if (output && output.summary && output.summary.text) {
      const currentSelectedNodes = mapData.nodes.filter((node) =>
         multiSelectedNodeIds.includes(node.id)
      );
      if (currentSelectedNodes.length === 0) return;

      const centralPoint = currentSelectedNodes.reduce(
        (acc, node) => ({ x: acc.x + (node.x || 0), y: acc.y + (node.y || 0) }),
        { x: 0, y: 0 }
      );
      centralPoint.x =
        currentSelectedNodes.length > 0
          ? centralPoint.x / currentSelectedNodes.length
          : reactFlowInstance.getViewport().x +
            (reactFlowInstance.getViewport().width || DEFAULT_NODE_WIDTH) / 2;
      centralPoint.y =
        currentSelectedNodes.length > 0
          ? centralPoint.y / currentSelectedNodes.length
          : reactFlowInstance.getViewport().y +
            (reactFlowInstance.getViewport().height || DEFAULT_NODE_HEIGHT) / 2;

      const summaryNodePosition = getNodePlacement(
        mapData.nodes,
        'generic', null, { id: 'summary-center', x: centralPoint.x, y: centralPoint.y, width: 0, height: 0, text: '', type: '' },
        GRID_SIZE_FOR_AI_PLACEMENT
      );
      const tempSummaryNodeId = `staged-summary-${Date.now()}`;
      const summaryNode: ConceptMapNode = {
        id: tempSummaryNodeId, text: output.summary.text, details: output.summary.details || `Summary of: ${currentSelectedNodes.map((n) => n.text).join(', ')}`,
        type: 'ai-summary-node',
        position: { x: summaryNodePosition.x, y: summaryNodePosition.y - (currentSelectedNodes.length > 1 ? 100 : 0) },
        width: 200, height: 100, childIds: [],
      };
      const edgesToSummarizedNodes: ConceptMapEdge[] = currentSelectedNodes.map(
        (node) => ({ id: `staged-summaryedge-${node.id}-${Date.now()}`, source: tempSummaryNodeId, target: node.id, label: 'summary of' })
      );
      useConceptMapStore.getState().setStagedMapData({ nodes: [summaryNode], edges: edgesToSummarizedNodes, actionType: 'summarizeNodes' });
    }
  }, [
    isViewOnlyMode,
    mapData.nodes,
    multiSelectedNodeIds,
    toast,
    callAIWithStandardFeedback,
    reactFlowInstance,
  ]);

  const handleMiniToolbarQuickExpand = useCallback(
    async (nodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === nodeId);
      if (!sourceNode) {
        toast({ title: 'Error', description: 'Source node not found.', variant: 'destructive' });
        return;
      }
      const output = await callAIWithStandardFeedback<
        ExpandConceptInput,
        ExpandConceptOutput
      >(
        'Quick Expand',
        aiExpandConcept,
        { /* ... input ... */ concept: sourceNode.text, existingMapContext: (() => { const graphAdapter = new GraphAdapterUtility(); const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges); if (graphInstance.hasNode(sourceNode.id)) { const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, sourceNode.id, { depth: 1, direction: 'all' }); return neighborNodeIds.map((id) => mapData.nodes.find((n) => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 2); } return []; })(), userRefinementPrompt: 'Generate one concise, directly related child idea. Focus on a primary sub-topic or component.' },
        {
          loadingMessage: `AI is quickly expanding on "${sourceNode.text}"...`,
          successTitle: 'AI Suggestion Ready',
          successDescription: (res) => res.expandedIdeas?.length > 0 ? 'Review the suggested concept.' : 'AI found no specific idea for quick expansion.',
          processingId: nodeId,
          // onSuccess logic was here
        }
      );
      // Original success logic
      if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
        const parentNode = sourceNode;
        if (!parentNode) { toast({ title: 'Error', description: 'Parent node for quick expand vanished.', variant: 'destructive' }); return; }
        const stagedNodes: ConceptMapNode[] = [];
        const stagedEdges: ConceptMapEdge[] = [];
        const existingNodesForPlacement = [...mapData.nodes];
        output.expandedIdeas.forEach((idea, index) => {
          const newNodeId = `staged-qexp-${parentNode.id}-${Date.now()}-${index}`;
          const position = getNodePlacement(existingNodesForPlacement, 'child', parentNode, null, GRID_SIZE_FOR_AI_PLACEMENT, index, output.expandedIdeas.length);
          const newNode: ConceptMapNode = { id: newNodeId, text: idea.text, details: idea.reasoning ? `AI Rationale: ${idea.reasoning}` : idea.details || '', type: 'ai-expanded', position, width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT, childIds: [] };
          stagedNodes.push(newNode);
          existingNodesForPlacement.push(newNode);
          stagedEdges.push({ id: `staged-qexp-edge-${parentNode.id}-${newNodeId}-${Date.now()}`, source: parentNode.id, target: newNodeId, label: idea.relationLabel || 'related to' });
        });
        setStagedMapData({ nodes: stagedNodes, edges: stagedEdges, actionType: 'expandConcept', originalElementId: parentNode.id });
        setConceptExpansionPreview(null);
      } else if (output) {
        setConceptExpansionPreview(null);
        toast({ title: 'Quick Expand', description: 'AI did not find any specific idea for quick expansion.', variant: 'default' });
      }
    },
    [
      isViewOnlyMode,
      toast,
      mapData,
      callAIWithStandardFeedback,
      setStagedMapData,
      setConceptExpansionPreview,
    ]
  );

  const handleMiniToolbarRewriteConcise = useCallback(
    async (nodeId: string) => {
      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) {
        toast({ title: 'Error', description: 'Node not found.', variant: 'destructive' });
        return;
      }
      const output = await callAIWithStandardFeedback<
        RewriteNodeContentInput,
        RewriteNodeContentOutput
      >(
        'Concise Rewrite',
        aiRewriteNodeContent,
        { currentText: node.text, currentDetails: node.details, targetTone: 'concise' },
        {
          loadingMessage: `AI is making "${node.text}" more concise...`,
          successTitle: 'Content Rewritten Concisely!',
          successDescription: (res) => res.rewrittenText ? 'Node content updated.' : 'AI could not make it more concise.',
          hideSuccessToast: !node?.text,
          processingId: nodeId,
          // onSuccess logic was here
        }
      );
      // Original success logic
      if (output && output.rewrittenText) {
        updateStoreNode(nodeId, { text: output.rewrittenText, details: output.rewrittenDetails, type: 'ai-rewritten-node' });
      }
    },
    [
      isViewOnlyMode,
      toast,
      mapData.nodes,
      updateStoreNode,
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
        toast({ title: 'Error', description: 'Source or target node not found for edge label suggestion.', variant: 'destructive' });
        return;
      }
      const output = await callAIWithStandardFeedback<
        SuggestEdgeLabelInput,
        SuggestEdgeLabelOutput
      >(
        'Suggest Edge Labels',
        suggestEdgeLabelFlow,
        { sourceNode: { text: sourceNode.text, details: sourceNode.details }, targetNode: { text: targetNode.text, details: targetNode.details }, existingLabel },
        {
          loadingMessage: 'AI is thinking of edge labels...',
          successTitle: 'Edge Label Suggestions Ready',
          hideSuccessToast: true,
          // onSuccess logic was here
        }
      );
       // Original success logic
      if (output && output.suggestedLabels.length > 0) {
        setEdgeLabelSuggestions({ edgeId, labels: output.suggestedLabels });
      } else if (output) {
        setEdgeLabelSuggestions({ edgeId, labels: ['related to'] });
      }
    },
    [mapData.nodes, toast, callAIWithStandardFeedback, setEdgeLabelSuggestions]
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
        { parentNodeText: node.data.label, parentNodeDetails: node.data.details, existingChildTexts: (node.data.childIds?.map((id) => mapData.nodes.find((n) => n.id === id)?.text).filter(Boolean) as string[]) || [] },
        {
          loadingMessage: 'AI is brainstorming child node ideas...',
          successTitle: 'Child Node Ideas Ready',
          hideSuccessToast: true,
          processingId: node.id,
          // onSuccess logic was here
        }
      );
      // Original success logic
      if (output) setAiChildTextSuggestions(output.suggestedChildTexts);
      setIsLoadingAiChildTexts(false);
    },
    [callAIWithStandardFeedback, mapData.nodes, setIsLoadingAiChildTexts, setAiChildTextSuggestions]
  );

  const handleRefineSuggestionConfirm = useCallback(
    async (nodeId: string, refinementInstruction: string) => {
      const previewState = conceptExpansionPreview;
      const nodeToRefine = previewState?.previewNodes.find(
        (n) => n.id === nodeId
      );
      if (!nodeToRefine || !previewState?.parentNodeId) {
        toast({ title: 'Error', description: 'Could not find the suggestion to refine.', variant: 'destructive' });
        return;
      }
      const output = await callAIWithStandardFeedback<
        RefineNodeSuggestionInput,
        RefineNodeSuggestionOutput
      >(
        'Refine Suggestion',
        refineNodeSuggestionFlow,
        { originalText: nodeToRefine.text, originalDetails: nodeToRefine.details, refinementInstruction },
        {
          loadingMessage: 'AI is refining the suggestion...',
          successTitle: 'Suggestion Refined!',
          processingId: nodeId,
          // onSuccess logic was here
        }
      );
      // Original success logic
      if (output) {
        useConceptMapStore.getState().updateConceptExpansionPreviewNode(nodeId, output.refinedText, output.refinedDetails);
      }
    },
    [conceptExpansionPreview, toast, callAIWithStandardFeedback]
  );

  const handleSuggestIntermediateNodeRequest = useCallback(
    async (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
      const sourceNode = mapData.nodes.find((n) => n.id === sourceNodeId);
      const targetNode = mapData.nodes.find((n) => n.id === targetNodeId);
      const edge = mapData.edges.find((e) => e.id === edgeId);
      if (!sourceNode || !targetNode || !edge) {
        toast({ title: 'Error', description: 'Edge context not found.', variant: 'destructive' });
        return;
      }
      const output = await callAIWithStandardFeedback<
        SuggestIntermediateNodeInput,
        SuggestIntermediateNodeOutput
      >(
        'Suggest Intermediate Node',
        suggestIntermediateNodeFlow,
        { sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details, targetNodeText: targetNode.text, targetNodeDetails: targetNode.details, existingEdgeLabel: edge.label },
        {
          loadingMessage: 'AI is thinking of an intermediate concept...',
          successTitle: 'Intermediate Node Suggested',
          successDescription: (res) => `AI suggests adding '${res.intermediateNodeText}'. Review the details.`,
          // onSuccess logic was here
        }
      );
      // Original success logic
      if (output) {
        if (!sourceNode || !targetNode || !edge) {
           toast({ title: 'Error', description: 'Context for intermediate node missing in onSuccess.', variant: 'destructive' });
           return;
        }
        const tempNodeId = `staged-intermediate-${Date.now()}`;
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const intermediateNode: ConceptMapNode = {
          id: tempNodeId, text: output.intermediateNodeText, details: output.intermediateNodeDetails ? `${output.intermediateNodeDetails}${output.reasoning ? `\n\nAI Rationale: ${output.reasoning}` : ''}` : output.reasoning ? `AI Rationale: ${output.reasoning}` : '',
          type: 'ai-intermediate', position: { x: midX, y: midY + 30 }, width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT, childIds: [],
        };
        const edgeToIntermediate: ConceptMapEdge = { id: `staged-edge1-${Date.now()}`, source: sourceNode.id, target: tempNodeId, label: output.labelSourceToIntermediate };
        const edgeFromIntermediate: ConceptMapEdge = { id: `staged-edge2-${Date.now()}`, source: tempNodeId, target: targetNode.id, label: output.labelIntermediateToTarget };
        useConceptMapStore.getState().setStagedMapData({ nodes: [intermediateNode], edges: [edgeToIntermediate, edgeFromIntermediate], actionType: 'intermediateNode', originalElementId: edge.id });
      }
    },
    [mapData, toast, callAIWithStandardFeedback]
  );

  const handleAiTidyUpSelection = useCallback(async () => {
    if (multiSelectedNodeIds.length < 2) {
      toast({ title: 'Selection Required', description: 'Select at least two nodes for AI Tidy Up.' });
      return;
    }
    const nodesToTidy = mapData.nodes
      .filter((n) => multiSelectedNodeIds.includes(n.id))
      .map((n) => ({ /* ...node properties... */ id: n.id, text: n.text, x: n.x, y: n.y, width: n.width, height: n.height, type: n.type, details: n.details, parentNode: n.parentNode, childIds: n.childIds, backgroundColor: n.backgroundColor, shape: n.shape }));

    const output = await callAIWithStandardFeedback<
      AiTidyUpSelectionInput,
      AiTidyUpSelectionOutput
    >(
      'AI Tidy Up Selection',
      aiTidyUpSelectionFlow,
      { nodes: nodesToTidy, mapLayoutContext: {} },
      {
        loadingMessage: 'AI is tidying up your selection...',
        successTitle: 'Selection Tidied by AI!',
        // onSuccess logic was here
      }
    );
    // Original success logic
    if (output && output.newPositions) {
      if (!nodesToTidy || nodesToTidy.length === 0) {
        toast({ title: 'Error', description: 'Nodes to tidy are missing in onSuccess.', variant: 'destructive'});
        return;
      }
      if (output.suggestedParentNode) {
        const newParentNodeId = `staged-parent-${Date.now()}`;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        output.newPositions.forEach((p) => { /* ... calculate bounds ... */ const originalNode = nodesToTidy.find((n) => n.id === p.id); const w = originalNode?.width || DEFAULT_NODE_WIDTH; const h = originalNode?.height || DEFAULT_NODE_HEIGHT; minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + w); maxY = Math.max(maxY, p.y + h); });
        const PADDING = 30;
        const parentWidth = maxX - minX + 2 * PADDING;
        const parentHeight = maxY - minY + 2 * PADDING;
        const parentX = minX - PADDING;
        const parentY = minY - PADDING;
        const stagedParentNode: ConceptMapNode = {
          id: newParentNodeId, text: output.suggestedParentNode.text, type: output.suggestedParentNode.type || 'ai-group-parent',
          position: { x: parentX, y: parentY }, width: parentWidth, height: parentHeight,
          details: `AI suggested parent for ${nodesToTidy.length} nodes.`, childIds: output.newPositions.map((p) => p.id),
        };
        const stagedChildNodes: ConceptMapNode[] = output.newPositions.map(
          (p) => { const originalNode = nodesToTidy.find((n) => n.id === p.id); return { ...(originalNode as ConceptMapNode), id: p.id, x: p.x, y: p.y, parentNode: newParentNodeId, width: originalNode?.width || DEFAULT_NODE_WIDTH, height: originalNode?.height || DEFAULT_NODE_HEIGHT }; }
        );
        useConceptMapStore.getState().setStagedMapData({ nodes: [stagedParentNode, ...stagedChildNodes], edges: [], actionType: 'aiTidyUpComplete', originalElementIds: nodesToTidy.map((n) => n.id) });
        toast({ title: 'AI Tidy Up Suggestion Ready', description: 'Review the proposed grouping and layout in the staging area.' });
      } else {
        const layoutUpdatesWithDimensions = output.newPositions.map((lu) => { const originalNode = nodesToTidy.find((n) => n.id === lu.id); return { id: lu.id, x: lu.x, y: lu.y, width: originalNode?.width || DEFAULT_NODE_WIDTH, height: originalNode?.height || DEFAULT_NODE_HEIGHT }; });
        useConceptMapStore.getState().setGhostPreview(layoutUpdatesWithDimensions);
        toast({ title: 'Layout Preview Ready', description: 'AI Tidy Up proposes new layout. Accept or Cancel.' });
      }
    }
  }, [multiSelectedNodeIds, mapData.nodes, callAIWithStandardFeedback, toast]);

  const handleSuggestMapImprovements = useCallback(async () => {
    const currentNodes = mapData.nodes.map((n) => ({ id: n.id, text: n.text, details: n.details || '' }));
    const currentEdges: AISharedSimplifiedEdgeInput[] = mapData.edges.map((e) => ({ source: e.source, target: e.target, label: e.label || '' }));
    await callAIWithStandardFeedback<AISuggestMapImprovementsInput, SuggestedImprovements>(
      'Suggest Map Improvements',
      suggestMapImprovementsFlow,
      { nodes: currentNodes, edges: currentEdges },
      {
        loadingMessage: 'AI is analyzing your map for improvements...',
        successTitle: 'Improvement Suggestions Ready!',
        successDescription: (res) => `Found ${res.suggestedEdges.length} edge and ${res.suggestedGroups.length} group suggestions.`,
        onSuccess: (output) => { // Original logic was if (output) setStructuralSuggestions...
          if (output) useConceptMapStore.getState().setStructuralSuggestions(output);
        }
      }
    );
  }, [mapData, callAIWithStandardFeedback]);

  const handleDagreLayoutSelection = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({ title: 'View Only Mode', description: 'Layout changes are disabled.' });
      return;
    }
    const { multiSelectedNodeIds: currentSelectedIds, mapData: currentMapData } = useConceptMapStore.getState();
    const { nodes: allNodes, edges: allEdges } = currentMapData;
    if (currentSelectedIds.length < 2) {
      toast({ title: 'Selection Required', description: 'Please select at least 2 nodes.' });
      return;
    }
    setIsDagreTidying(true);
    const loadingToast = toast({ title: 'Arranging Selection...', description: 'Using Dagre for layout. Please wait.', duration: 999999 });
    try {
      const selectedNodesFromStore = allNodes.filter((n) => currentSelectedIds.includes(n.id));
      const nodesForDagre = selectedNodesFromStore.map((n) => { const rfn = reactFlowInstance.getNode(n.id); return { id: n.id, width: rfn?.width || n.width || DEFAULT_NODE_WIDTH, height: rfn?.height || n.height || DEFAULT_NODE_HEIGHT, label: n.text }; }).filter((n) => n.width && n.height);
      if (nodesForDagre.length < 2) { toast({ title: 'Layout Error', description: 'Not enough valid nodes with dimensions.' }); setIsDagreTidying(false); loadingToast.dismiss(); return; }
      const selectedNodeIdSet = new Set(currentSelectedIds);
      const edgesForDagre = allEdges.filter((e) => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)).map((e) => ({ source: e.source, target: e.target, id: e.id, label: e.label }));
      let sumX = 0, sumY = 0; let validInitialNodes = 0;
      selectedNodesFromStore.forEach((n) => { const rfn = reactFlowInstance.getNode(n.id); const xPos = rfn?.position?.x ?? n.x; const yPos = rfn?.position?.y ?? n.y; if (xPos !== undefined && yPos !== undefined) { sumX += xPos; sumY += yPos; validInitialNodes++; } });
      if (validInitialNodes === 0) { toast({ title: 'Layout Error', description: 'Cannot get initial positions.' }); setIsDagreTidying(false); loadingToast.dismiss(); return; }
      const initialCentroidX = sumX / validInitialNodes; const initialCentroidY = sumY / validInitialNodes;
      const dagreUtil = new DagreLayoutUtility();
      const dagreOptions: DagreLayoutOptions = { direction: 'TB', ranksep: 70, nodesep: 70, edgesep: 20, defaultNodeWidth: DEFAULT_NODE_WIDTH, defaultNodeHeight: DEFAULT_NODE_HEIGHT };
      const newRelativePositions = await dagreUtil.layout(nodesForDagre, edgesForDagre, dagreOptions);
      if (!newRelativePositions || newRelativePositions.length === 0) { toast({ title: 'Layout Error', description: 'Dagre returned no positions.' }); setIsDagreTidying(false); loadingToast.dismiss(); return; }
      let sumDagreX = 0, sumDagreY = 0;
      newRelativePositions.forEach((p) => { const nodeDetails = nodesForDagre.find((n) => n.id === p.id); sumDagreX += p.x + (nodeDetails?.width || DEFAULT_NODE_WIDTH) / 2; sumDagreY += p.y + (nodeDetails?.height || DEFAULT_NODE_HEIGHT) / 2; });
      const dagreCentroidX = sumDagreX / newRelativePositions.length; const dagreCentroidY = sumDagreY / newRelativePositions.length;
      const offsetX = initialCentroidX - dagreCentroidX + (nodesForDagre[0]?.width || DEFAULT_NODE_WIDTH) / 2;
      const offsetY = initialCentroidY - dagreCentroidY + (nodesForDagre[0]?.height || DEFAULT_NODE_HEIGHT) / 2;
      const finalPositions = newRelativePositions.map((p) => ({ id: p.id, x: Math.round((p.x + offsetX) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT, y: Math.round((p.y + offsetY) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT }));
      const positionsWithDimensions = finalPositions.map((fp) => { const nodeDetail = nodesForDagre.find((nfd) => nfd.id === fp.id); return { id: fp.id, x: fp.x, y: fp.y, width: nodeDetail?.width || DEFAULT_NODE_WIDTH, height: nodeDetail?.height || DEFAULT_NODE_HEIGHT }; });
      useConceptMapStore.getState().setGhostPreview(positionsWithDimensions);
      toast({ title: 'Layout Preview Ready', description: `Previewing new layout for ${finalPositions.length} nodes. Accept or Cancel via toolbar.` });
    } catch (error) {
      console.error('Dagre layout error:', error);
      toast({ title: 'Layout Error', description: `Failed to arrange: ${(error as Error).message}`, variant: 'destructive' });
    } finally {
      setIsDagreTidying(false);
      loadingToast.dismiss();
    }
  }, [
    isViewOnlyMode, toast, reactFlowInstance, applyLayout,
    mapData.nodes, mapData.edges, multiSelectedNodeIds, // These are now direct dependencies
  ]);

  const getPaneSuggestions = useCallback((): SuggestionAction[] => [], []);
  const getNodeSuggestions = useCallback( (_node: RFNode<CustomNodeData>): SuggestionAction[] => [], []);
  const acceptAllExpansionPreviews = useCallback(() => {}, []);
  const acceptSingleExpansionPreview = useCallback( (_previewNodeId: string) => {}, []);
  const clearExpansionPreview = useCallback(() => {}, []);
  const openRefineSuggestionModal = useCallback( (_previewNodeId: string, _parentNodeId: string) => {}, []);

  const handleSummarizeMap = useCallback(async () => {
    if (isViewOnlyMode) { toast({ title: 'View Only Mode', description: 'Cannot summarize map in view-only mode.'}); return; }
    const currentMapData = useConceptMapStore.getState().mapData;
    if (currentMapData.nodes.length === 0) { toast({ title: 'Empty Map', description: 'Cannot summarize an empty map.', variant: 'default' }); return; }
    setIsSummarizingMap(true);
    await callAIWithStandardFeedback<
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
          if (output) { setMapSummaryResult(output); setIsMapSummaryModalOpen(true); }
          else { setMapSummaryResult(null); }
        },
        onError: () => { setMapSummaryResult(null); }
      }
    );
    setIsSummarizingMap(false);
  }, [ isViewOnlyMode, callAIWithStandardFeedback, setIsSummarizingMap, setMapSummaryResult, setIsMapSummaryModalOpen, toast ]);

  const openAskQuestionAboutEdgeModal = useCallback( (edgeId: string) => {
    if (isViewOnlyMode) { toast({ title: 'View Only Mode' }); return; }
    const edge = mapData.edges.find((e) => e.id === edgeId); // mapData from hook scope
    if (!edge) { toast({ title: 'Error', description: 'Selected edge not found.', variant: 'destructive' }); return; }
    const sourceNode = mapData.nodes.find((n) => n.id === edge.source); // mapData from hook scope
    const targetNode = mapData.nodes.find((n) => n.id === edge.target); // mapData from hook scope
    if (!sourceNode || !targetNode) { toast({ title: 'Error', description: 'Connected nodes for the edge not found.', variant: 'destructive' }); return; }
    setEdgeQuestionContext({ sourceNodeId: sourceNode.id, sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details, targetNodeId: targetNode.id, targetNodeText: targetNode.text, targetNodeDetails: targetNode.details, edgeId: edge.id, edgeLabel: edge.label, userQuestion: '' });
    setEdgeQuestionAnswer(null);
    setIsEdgeQuestionModalOpen(true);
  }, [isViewOnlyMode, mapData.nodes, mapData.edges, toast]);

  const handleAskQuestionAboutEdge = useCallback(async (question: string) => {
    if (isViewOnlyMode) { toast({ title: 'View Only Mode', description: 'Cannot ask questions about edges in view-only mode.' }); return; }
    if (!edgeQuestionContext) { toast({ title: 'Error', description: 'Edge context is missing for Q&A.', variant: 'destructive' }); return; }
    setIsAskingAboutEdge(true);
    const input: AskQuestionAboutEdgeInput = { ...edgeQuestionContext, userQuestion: question };
    await callAIWithStandardFeedback< AskQuestionAboutEdgeInput, AskQuestionAboutEdgeOutput>
      ('Ask AI About Edge', askQuestionAboutEdgeFlow, input, {
        loadingMessage: 'AI is considering your question about the edge...',
        successTitle: 'AI Answer Received',
        hideSuccessToast: true,
        processingId: `edge-qa-${edgeQuestionContext.edgeId}`,
        onSuccess: (output) => {
          if (output?.answer) { setEdgeQuestionAnswer(output.answer); }
          else if (output?.error) { setEdgeQuestionAnswer(`Error: ${output.error}`); }
          else { setEdgeQuestionAnswer('AI could not provide a specific answer or error for this question.'); }
        },
        onError: () => { setEdgeQuestionAnswer('Failed to get an answer from AI.'); }
      });
    setIsAskingAboutEdge(false);
  }, [isViewOnlyMode, edgeQuestionContext, callAIWithStandardFeedback, toast, setIsAskingAboutEdge, setEdgeQuestionAnswer]);

  const openAskQuestionAboutMapContextModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: 'View Only Mode' }); return; }
    setMapContextQuestionAnswer(null);
    setIsMapContextQuestionModalOpen(true);
  }, [isViewOnlyMode, toast]);

  const handleAskQuestionAboutMapContext = useCallback(async (question: string) => {
    if (isViewOnlyMode) { toast({ title: 'View Only Mode', description: 'Cannot ask map questions in view-only mode.' }); return; }
    const currentMapDataFromStore = useConceptMapStore.getState().mapData;
    const currentMapNameFromStore = useConceptMapStore.getState().mapName;
    const currentMapIdFromStore = useConceptMapStore.getState().mapId;
    if (currentMapDataFromStore.nodes.length === 0) { toast({ title: 'Empty Map', description: 'Cannot ask questions about an empty map.', variant: 'default' }); return; }
    setIsAskingAboutMapContext(true);
    const simplifiedNodes = currentMapDataFromStore.nodes.map((n) => ({ id: n.id, text: n.text, type: n.type, details: n.details?.substring(0, 200) }));
    const simplifiedEdges = currentMapDataFromStore.edges.map((e) => ({ source: e.source, target: e.target, label: e.label }));
    const input: AskQuestionAboutMapContextInput = { nodes: simplifiedNodes, edges: simplifiedEdges, userQuestion: question, mapName: currentMapNameFromStore };
    await callAIWithStandardFeedback< AskQuestionAboutMapContextInput, AskQuestionAboutMapContextOutput>
      ('Ask AI About Map', askQuestionAboutMapContextFlow, input, {
        loadingMessage: 'AI is analyzing the entire map to answer your question...',
        successTitle: 'AI Answer Received',
        hideSuccessToast: true,
        processingId: `map-qa-${currentMapIdFromStore || 'current'}`,
        onSuccess: (output) => {
          if (output?.answer) { setMapContextQuestionAnswer(output.answer); }
          else if (output?.error) { setMapContextQuestionAnswer(`Error: ${output.error}`); }
          else { setMapContextQuestionAnswer('AI could not provide an answer for this question about the map.'); }
        },
        onError: () => { setMapContextQuestionAnswer('Failed to get an answer from AI about the map.'); }
      });
    setIsAskingAboutMapContext(false);
  }, [isViewOnlyMode, callAIWithStandardFeedback, toast, setIsAskingAboutMapContext, setMapContextQuestionAnswer]);

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
