"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
import {
  DagreLayoutUtility, // Import for Dagre
  type NodeLayoutInput,
  type EdgeLayoutInput,
  type DagreLayoutOptions,
} from '@/lib/dagreLayoutUtility';
import {
  extractConcepts as aiExtractConcepts,
  suggestRelations as aiSuggestRelations,
  expandConcept as aiExpandConcept,
  askQuestionAboutNode as aiAskQuestionAboutNode,
  generateQuickCluster as aiGenerateQuickCluster,
  generateMapSnippetFromText as aiGenerateMapSnippetFromText,
  summarizeNodes as aiSummarizeNodes,
  suggestEdgeLabelFlow,
  type SuggestEdgeLabelInput,
  type SuggestEdgeLabelOutput,
  suggestQuickChildTextsFlow,
  refineNodeSuggestionFlow,
  type RefineNodeSuggestionInput,
  type RefineNodeSuggestionOutput,
  suggestIntermediateNodeFlow,
  type SuggestIntermediateNodeInput,
  type IntermediateNodeSuggestionResponse,
  type SuggestIntermediateNodeOutput,
  aiTidyUpSelectionFlow,
  type AiTidyUpSelectionInput,
  type AiTidyUpSelectionOutput,
  type NodeLayoutInfo,
  suggestChildNodesFlow,
  type SuggestChildNodesRequest,
  type SuggestChildNodesResponse,
  suggestMapImprovementsFlow,
  type SuggestedImprovements,
  type SuggestedEdge,
  type SuggestedGroup,
  type ExpandConceptOutput,
  type AskQuestionAboutNodeOutput,
  type GenerateQuickClusterOutput,
  type GenerateMapSnippetOutput,
  type SuggestRelationsOutput,
  type SummarizeNodesOutput,
} from '@/ai/flows';
import { runFlow } from '@genkit-ai/flow';
import { 
    rewriteNodeContent as aiRewriteNodeContent,
    type RewriteNodeContentOutput 
} from '@/ai/flows/rewrite-node-content-logic';
import type { ConceptMapNode, ConceptMapEdge, RFNode, CustomNodeData, ConceptExpansionPreviewNode } from '@/types';
import { getNodePlacement } from '@/lib/layout-utils';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import { Lightbulb, Sparkles, Brain, HelpCircle, PlusSquare, MessageSquareQuote, Loader2 } from 'lucide-react';

const DEFAULT_NODE_WIDTH = 150; // For Dagre layout defaults
const DEFAULT_NODE_HEIGHT = 70;  // For Dagre layout defaults


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

export interface IntermediateNodeSuggestionContext extends SuggestIntermediateNodeOutput {
  originalEdgeId: string;
  sourceNode: ConceptMapNode;
  targetNode: ConceptMapNode;
}

const GRID_SIZE_FOR_AI_PLACEMENT = 20;


export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
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
    updateConceptExpansionPreviewNode,
    addEdge: addStoreEdge,
    setAiProcessingNodeId,
    setStagedMapData,
    setConceptExpansionPreview,
    conceptExpansionPreview,
    applyLayout,
    fetchStructuralSuggestions: storeFetchStructuralSuggestions,
    isFetchingStructuralSuggestions: storeIsFetchingStructuralSuggestions,
    clearAllStructuralSuggestions: storeClearAllStructuralSuggestions,
  } = useConceptMapStore(
    useCallback(s => ({
      mapData: s.mapData, selectedElementId: s.selectedElementId, multiSelectedNodeIds: s.multiSelectedNodeIds,
      setAiExtractedConcepts: s.setAiExtractedConcepts, setAiSuggestedRelations: s.setAiSuggestedRelations,
      removeExtractedConceptsFromSuggestions: s.removeExtractedConceptsFromSuggestions,
      removeSuggestedRelationsFromSuggestions: s.removeSuggestedRelationsFromSuggestions,
      resetAiSuggestions: s.resetAiSuggestions,
      addNode: s.addNode,
      updateNode: s.updateNode,
      updateConceptExpansionPreviewNode: s.updateConceptExpansionPreviewNode,
      addEdge: s.addEdge,
      setAiProcessingNodeId: s.setAiProcessingNodeId,
      setStagedMapData: s.setStagedMapData,
      setConceptExpansionPreview: s.setConceptExpansionPreview,
      conceptExpansionPreview: s.conceptExpansionPreview,
      applyLayout: s.applyLayout,
      fetchStructuralSuggestions: s.fetchStructuralSuggestions,
      isFetchingStructuralSuggestions: s.isFetchingStructuralSuggestions,
      clearAllStructuralSuggestions: s.clearAllStructuralSuggestions,
    }), [])
  );
  const addDebugLog = useConceptMapStore.getState().addDebugLog;

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [textForExtraction, setTextForExtraction] = useState("");
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [conceptsForRelationSuggestion, setConceptsForRelationSuggestion] = useState<string[]>([]);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  const [conceptToExpandDetails, setConceptToExpandDetails] = useState<ConceptToExpandDetails | null>(null);
  const [mapContextForExpansion, setMapContextForExpansion] = useState<string[]>([]);
  const [isQuickClusterModalOpen, setIsQuickClusterModalOpen] = useState(false);
  const [isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen] = useState(false);
  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [nodeContextForQuestion, setNodeContextForQuestion] = useState<{ text: string; details?: string, id: string } | null>(null);
  const [isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen] = useState(false);
  const [nodeContentToRewrite, setNodeContentToRewrite] = useState<NodeContentToRewrite | null>(null);
  const [edgeLabelSuggestions, setEdgeLabelSuggestions] = useState<{ edgeId: string; labels: string[] } | null>(null);
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false);
  const [refineModalInitialData, setRefineModalInitialData] = useState<RefineModalData | null>(null);
  const [isSuggestIntermediateNodeModalOpen, setIsSuggestIntermediateNodeModalOpen] = useState(false);
  const [intermediateNodeSuggestionData, setIntermediateNodeSuggestionData] = useState<IntermediateNodeSuggestionResponse | null>(null);
  const [intermediateNodeOriginalEdgeContext, setIntermediateNodeOriginalEdgeContext] = useState<{ edgeId: string; sourceNodeId: string; targetNodeId: string } | null>(null);
  const [isSuggestingIntermediateNode, setIsSuggestingIntermediateNode] = useState(false);
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<string[]>([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);
  const [isRefineGhostNodeModalOpen, setIsRefineGhostNodeModalOpen] = useState(false);
  const [refiningGhostNodeData, setRefiningGhostNodeData] = useState<{ id: string; currentText: string; currentDetails?: string; } | null>(null);
  const [isDagreTidying, setIsDagreTidying] = useState(false); // New state for Dagre Tidy

  // --- Extract Concepts, Suggest Relations, Expand Concept, etc. (existing AI tools) ---
  // ... (all existing AI tool functions like openExtractConceptsModal, handleConceptExpanded, etc. remain here) ...
  // --- Extract Concepts ---
  const openExtractConceptsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", description: "AI tools are disabled.", variant: "default" }); return; }
    resetAiSuggestions();
    let initialText = "";
    if (nodeIdForContext) {
        const node = mapData.nodes.find(n => n.id === nodeIdForContext);
        if (node) initialText = `${node.text}${node.details ? `\n\nDetails: ${node.details}` : ''}`;
    } else if (multiSelectedNodeIds.length > 0) {
        initialText = multiSelectedNodeIds.map(id => {
            const node = mapData.nodes.find(n => n.id === id);
            return node ? `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}` : '';
        }).filter(Boolean).join("\n\n---\n\n");
    } else if (selectedElementId && mapData.nodes.find(n => n.id === selectedElementId)) {
        const node = mapData.nodes.find(n => n.id === selectedElementId);
        if (node) initialText = `${node.text}${node.details ? `\nDetails: ${node.details}` : ''}`;
    }
    setTextForExtraction(initialText);
    setIsExtractConceptsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData.nodes, selectedElementId, multiSelectedNodeIds, toast]);

  const handleConceptsExtracted = useCallback((concepts: string[]) => {
    setAiExtractedConcepts(concepts);
  }, [setAiExtractedConcepts]);

  const addExtractedConceptsToMap = useCallback((selectedConcepts: string[]) => {
    if (isViewOnlyMode || selectedConcepts.length === 0) return;
    let addedCount = 0;
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    selectedConcepts.forEach((conceptText) => {
      addStoreNode({ text: conceptText, type: 'ai-concept', position: getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT) });
      addedCount++;
    });
    if (addedCount > 0) {
      toast({ title: "Concepts Added", description: `${addedCount} new concepts added to the map.` });
      removeExtractedConceptsFromSuggestions(selectedConcepts);
    }
  }, [isViewOnlyMode, toast, addStoreNode, removeExtractedConceptsFromSuggestions]);


  // --- Suggest Relations ---
  const openSuggestRelationsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    let concepts: string[] = [];
    const currentMapData = useConceptMapStore.getState().mapData;
    const graphAdapter = new GraphAdapterUtility();
    const graphInstance = graphAdapter.fromArrays(currentMapData.nodes, currentMapData.edges);
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? currentMapData.nodes.find(n => n.id === targetNodeId) : null;

    if (multiSelectedNodeIds.length >= 2) {
        concepts = multiSelectedNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text);
    } else if (selectedNode) {
        concepts.push(selectedNode.text);
        if (graphInstance && graphInstance.hasNode(selectedNode.id)) { // Check graphInstance before nodesMap
            const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
            concepts.push(...neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
        }
    } else if (currentMapData.nodes.length > 0) {
        concepts = currentMapData.nodes.slice(0, Math.min(5, currentMapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, selectedElementId, multiSelectedNodeIds, mapData.nodes, mapData.edges, toast]);

  const handleRelationsSuggested = useCallback((relationsOutput: SuggestRelationsOutput) => {
    setAiSuggestedRelations(relationsOutput.relations);
  }, [setAiSuggestedRelations]);

  const addSuggestedRelationsToMap = useCallback((selectedRelations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode || selectedRelations.length === 0) return;
    let relationsAddedCount = 0; let conceptsAddedFromRelationsCount = 0;
    const currentNodes = useConceptMapStore.getState().mapData.nodes; 
    selectedRelations.forEach((rel) => { /* ... existing logic ... */ });
    // ... (rest of function as before)
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, removeSuggestedRelationsFromSuggestions]);

  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => { /* ... */ }, [/* ... */]);
  const handleConceptExpanded = useCallback(async (output: ExpandConceptOutput) => { /* ... */ }, [/* ... */]);
  const openQuickClusterModal = useCallback(() => { /* ... */ }, [/* ... */]);
  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => { /* ... */ }, [/* ... */]);
  const openGenerateSnippetModal = useCallback(() => { /* ... */ }, [/* ... */]);
  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => { /* ... */ }, [/* ... */]);
  const openAskQuestionModal = useCallback((nodeId: string) => { /* ... */ }, [/* ... */]);
  const handleQuestionAnswered = useCallback(async (question: string, nodeCtx: { text: string; details?: string; id: string; } ) => { /* ... */ }, [/* ... */]);
  const openRewriteNodeContentModal = useCallback((nodeId: string) => { /* ... */ }, [/* ... */]);
  const handleRewriteNodeContentConfirm = useCallback(async (nodeId: string, newText: string, newDetails?: string, tone?: string) => { /* ... */ }, [/* ... */]);
  const handleSummarizeSelectedNodes = useCallback(async () => { /* ... */ }, [/* ... */]);
  const handleMiniToolbarQuickExpand = useCallback(async (nodeId: string) => { /* ... */ }, [/* ... */]);
  const handleMiniToolbarRewriteConcise = useCallback(async (nodeId: string) => { /* ... */ }, [/* ... */]);
  const fetchAndSetEdgeLabelSuggestions = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => { /* ... */ }, [/* ... */]);
  const handleAddQuickChildNode = useCallback((parentNodeId: string, suggestedText: string, direction?: 'top' | 'right' | 'bottom' | 'left') => { /* ... */ },[/* ... */]);
  const fetchAIChildTextSuggestions = useCallback(async (node: RFNode<CustomNodeData> | null) => { /* ... */ }, [/* ... */]);
  const getNodeSuggestions = useCallback((currentNode: RFNode<CustomNodeData>): SuggestionAction[] => { /* ... */ }, [/* ... */]);
  const getPaneSuggestions = useCallback((position?: {x: number, y: number}): SuggestionAction[] => { /* ... */ }, [/* ... */]);
  const acceptAllExpansionPreviews = useCallback(() => { /* ... */ }, [/* ... */]);
  const acceptSingleExpansionPreview = useCallback((previewNodeId: string) => { /* ... */ }, [/* ... */]);
  const clearExpansionPreview = useCallback(() => { /* ... */ }, [/* ... */]);
  const openRefineSuggestionModal = useCallback((previewNodeId: string, parentNodeIdForPreview: string) => { /* ... */ }, [/* ... */]);
  const handleRefineSuggestionConfirm = useCallback(async (refinementInstruction: string) => { /* ... */ }, [/* ... */]);
  const openRefineGhostNodeModal = useCallback((nodeId: string, currentText: string, currentDetails?: string) => { /* ... */ }, [/* ... */]);
  const closeRefineGhostNodeModal = useCallback(() => { /* ... */ }, [/* ... */]);
  const handleConfirmRefineGhostNode = useCallback((newText: string, newDetails: string) => { /* ... */ }, [/* ... */]);
  const handleSuggestIntermediateNode = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string) => { /* ... */ }, [/* ... */]);
  const closeSuggestIntermediateNodeModal = useCallback(() => { /* ... */ }, [/* ... */]);
  const confirmAddIntermediateNode = useCallback(() => { /* ... */ }, [/* ... */]);
  const handleAiTidyUpSelection = useCallback(async () => { /* ... */ }, [/* ... */]);
  const handleSuggestMapImprovements = useCallback(async () => { /* ... (as implemented before) ... */ }, [/* ... */]);


  // --- Dagre Tidy Selection ---
  const handleDagreTidySelection = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Layout adjustments are disabled." });
      return;
    }
    const currentSelectedIds = useConceptMapStore.getState().multiSelectedNodeIds;
    if (currentSelectedIds.length < 2) {
      toast({ title: "Selection Required", description: "Select at least two nodes to tidy with Dagre." });
      return;
    }

    setIsDagreTidying(true);
    addDebugLog(`[AITools] Dagre Tidy Selection started for nodes: ${currentSelectedIds.join(', ')}`);
    const loadingToastId = toast({ title: "Applying Dagre Layout...", description: "Arranging selected nodes...", duration: Infinity }).id;

    try {
      const allNodes = mapData.nodes;
      const allEdges = mapData.edges;

      const selectedNodes = allNodes.filter(n => currentSelectedIds.includes(n.id));
      const selectedNodeIdSet = new Set(currentSelectedIds);

      const intraSelectionEdges = allEdges.filter(edge =>
        selectedNodeIdSet.has(edge.source) && selectedNodeIdSet.has(edge.target)
      );

      const dagreNodesInput: NodeLayoutInput[] = selectedNodes.map(n => ({
        id: n.id,
        width: n.width || DEFAULT_NODE_WIDTH,
        height: n.height || DEFAULT_NODE_HEIGHT,
        label: n.text, // For Dagre's internal use, not strictly for layout calculation
      }));

      const dagreEdgesInput: EdgeLayoutInput[] = intraSelectionEdges.map(e => ({
        source: e.source,
        target: e.target,
      }));

      // Calculate centroid of selected nodes BEFORE layout
      let originalCentroidX = 0;
      let originalCentroidY = 0;
      selectedNodes.forEach(n => {
        originalCentroidX += (n.x || 0) + (n.width || DEFAULT_NODE_WIDTH) / 2;
        originalCentroidY += (n.y || 0) + (n.height || DEFAULT_NODE_HEIGHT) / 2;
      });
      originalCentroidX /= selectedNodes.length;
      originalCentroidY /= selectedNodes.length;

      const dagreUtil = new DagreLayoutUtility();
      const layoutOptions: DagreLayoutOptions = {
        direction: 'TB', ranksep: 60, nodesep: 50, edgesep: 15,
        defaultNodeWidth: DEFAULT_NODE_WIDTH, defaultNodeHeight: DEFAULT_NODE_HEIGHT
      };

      const newRelativePositions = await dagreUtil.layout(dagreNodesInput, dagreEdgesInput, layoutOptions);

      // Calculate centroid of new relative positions
      let newCentroidX = 0;
      let newCentroidY = 0;
      newRelativePositions.forEach(np => {
        const nodeInput = dagreNodesInput.find(n => n.id === np.id);
        newCentroidX += np.x + (nodeInput?.width || DEFAULT_NODE_WIDTH) / 2;
        newCentroidY += np.y + (nodeInput?.height || DEFAULT_NODE_HEIGHT) / 2;
      });
      newCentroidX /= newRelativePositions.length;
      newCentroidY /= newRelativePositions.length;

      const offsetX = originalCentroidX - newCentroidX;
      const offsetY = originalCentroidY - newCentroidY;

      const finalPositions = newRelativePositions.map(np => ({
        id: np.id,
        x: Math.round((np.x + offsetX) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
        y: Math.round((np.y + offsetY) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
      }));

      applyLayout(finalPositions);
      toast.dismiss(loadingToastId);
      toast({ title: "Selection Tidied", description: "Selected nodes have been arranged using Dagre." });
      addDebugLog(`[AITools] Dagre Tidy Selection completed. Applied ${finalPositions.length} position updates.`);

    } catch (error: any) {
      toast.dismiss(loadingToastId);
      console.error("Error during Dagre Tidy Selection:", error);
      toast({ title: "Layout Error", description: `Dagre Tidy failed: ${error.message}`, variant: "destructive" });
      addDebugLog(`[AITools] Error during Dagre Tidy Selection: ${error.message}`);
    } finally {
      setIsDagreTidying(false);
    }
  }, [isViewOnlyMode, mapData, multiSelectedNodeIds, applyLayout, toast, addDebugLog]);


  return {
    // ... (all previously returned tools and states)
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen,
    conceptToExpandDetails, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered,
    isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen, nodeContentToRewrite, openRewriteNodeContentModal, handleRewriteNodeContentConfirm,
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand, handleMiniToolbarRewriteConcise,
    getPaneSuggestions, getNodeSuggestions,
    fetchAIChildTextSuggestions, aiChildTextSuggestions, isLoadingAiChildTexts,
    fetchAndSetEdgeLabelSuggestions, edgeLabelSuggestions, setEdgeLabelSuggestions,
    conceptExpansionPreview, acceptAllExpansionPreviews, acceptSingleExpansionPreview, clearExpansionPreview,
    addStoreNode, addStoreEdge,
    isRefineModalOpen, setIsRefineModalOpen, refineModalInitialData, openRefineSuggestionModal, handleRefineSuggestionConfirm,
    isSuggestIntermediateNodeModalOpen, setIsSuggestIntermediateNodeModalOpen, intermediateNodeSuggestionData,
    handleSuggestIntermediateNode, confirmAddIntermediateNode, closeSuggestIntermediateNodeModal, isSuggestingIntermediateNode,
    isRefineGhostNodeModalOpen, openRefineGhostNodeModal, closeRefineGhostNodeModal, handleConfirmRefineGhostNode, refiningGhostNodeData,
    handleAiTidyUpSelection,
    handleSuggestMapImprovements,
    isFetchingStructuralSuggestions: storeIsFetchingStructuralSuggestions,
    // New for Dagre Tidy
    handleDagreTidySelection,
    isDagreTidying,
  };
}
