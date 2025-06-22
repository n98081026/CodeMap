"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
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
  // type IntermediateNodeSuggestionResponse, // From master, seems specific to a modal, might be covered by SuggestIntermediateNodeOutput
  type SuggestIntermediateNodeOutput, // From HEAD
  aiTidyUpSelectionFlow,
  type AiTidyUpSelectionInput,
  type AiTidyUpSelectionOutput,
  type NodeLayoutInfo,
  suggestChildNodesFlow,
  type SuggestChildNodesRequest,
  type SuggestChildNodesResponse
} from '@/ai/flows';
import { runFlow } from '@genkit-ai/flow';
import { 
    rewriteNodeContent as aiRewriteNodeContent,
    type RewriteNodeContentOutput 
} from '@/ai/flows/rewrite-node-content-logic';
import type { ConceptMapNode, ConceptMapEdge, RFNode, CustomNodeData } from '@/types'; // Added CustomNodeData
import { getNodePlacement } from '@/lib/layout-utils';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import { DagreLayoutUtility } from '@/lib/dagreLayoutUtility'; // Added for Dagre layout
import { useReactFlow } from 'reactflow'; // Added for useReactFlow
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import { Lightbulb, Sparkles, Brain, HelpCircle, PlusSquare, MessageSquareQuote, Loader2 } from 'lucide-react';

// ... (interfaces: ConceptToExpandDetails, NodeContentToRewrite, RefineModalData, IntermediateNodeSuggestionContext remain the same)
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

// _generateNodeSuggestionsLogic remains the same

export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow(); // Added for Dagre
  const {
    mapData,
    selectedElementId,
    multiSelectedNodeIds, // This is the correct name for selected node IDs array
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
    }), [])
  );
  const addDebugLog = useConceptMapStore.getState().addDebugLog;

  // ... (State for various modals - trying to preserve based on master and HEAD)
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

  // From HEAD (intermediateNodeSuggestion)
  const [intermediateNodeSuggestion, setIntermediateNodeSuggestion] = useState<IntermediateNodeSuggestionContext | null>(null);

  // From master (related to intermediate node but more specific to modal state)
  // const [isSuggestIntermediateNodeModalOpen, setIsSuggestIntermediateNodeModalOpen] = useState(false);
  // const [intermediateNodeSuggestionData, setIntermediateNodeSuggestionData] = useState<IntermediateNodeSuggestionResponse | null>(null);
  // const [intermediateNodeOriginalEdgeContext, setIntermediateNodeOriginalEdgeContext] = useState<{ edgeId: string; sourceNodeId: string; targetNodeId: string } | null>(null);
  // const [isSuggestingIntermediateNode, setIsSuggestingIntermediateNode] = useState(false);

  // From HEAD (AI child text suggestions)
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<string[]>([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);

  // From master (Refine Ghost Node Modal)
  // const [isRefineGhostNodeModalOpen, setIsRefineGhostNodeModalOpen] = useState(false);
  // const [refiningGhostNodeData, setRefiningGhostNodeData] = useState<{ id: string; currentText: string; currentDetails?: string; } | null>(null);


  // ... (Implementations for openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap - these seem consistent)
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

  // ... (Implementations for Suggest Relations - these seem consistent)
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
        if (graphInstance.hasNode(selectedNode.id)) {
            const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
            concepts.push(...neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
        }
    } else if (currentMapData.nodes.length > 0) {
        concepts = currentMapData.nodes.slice(0, Math.min(5, currentMapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, selectedElementId, multiSelectedNodeIds, toast]); // Added mapData due to direct store access in original

  const handleRelationsSuggested = useCallback((relations: any) => { // Assuming SuggestRelationsOutput type
    setAiSuggestedRelations(relations);
  }, [setAiSuggestedRelations]);

  const addSuggestedRelationsToMap = useCallback((selectedRelations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode || selectedRelations.length === 0) return;
    let relationsAddedCount = 0; let conceptsAddedFromRelationsCount = 0;
    const currentNodes = useConceptMapStore.getState().mapData.nodes; 
    selectedRelations.forEach((rel) => {
      let sourceNode = useConceptMapStore.getState().mapData.nodes.find(node => node.text.toLowerCase().trim() === rel.source.toLowerCase().trim());
      if (!sourceNode) {
        const newSourceNodeId = addStoreNode({ text: rel.source, type: 'ai-concept', position: getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT) });
        sourceNode = useConceptMapStore.getState().mapData.nodes.find(node => node.id === newSourceNodeId);
        if (sourceNode) conceptsAddedFromRelationsCount++; else return;
      }
      let targetNode = useConceptMapStore.getState().mapData.nodes.find(node => node.text.toLowerCase().trim() === rel.target.toLowerCase().trim());
      if (!targetNode) {
        const newTargetNodeId = addStoreNode({ text: rel.target, type: 'ai-concept', position: getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT) });
        targetNode = useConceptMapStore.getState().mapData.nodes.find(node => node.id === newTargetNodeId);
        if (targetNode) conceptsAddedFromRelationsCount++; else return;
      }
      const currentEdgesSnapshot = useConceptMapStore.getState().mapData.edges;
      if (sourceNode && targetNode && !currentEdgesSnapshot.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
        addStoreEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation });
        relationsAddedCount++;
      }
    });
    let toastMessage = "";
    if (relationsAddedCount > 0) toastMessage += `${relationsAddedCount} new relations added. `;
    if (conceptsAddedFromRelationsCount > 0) toastMessage += `${conceptsAddedFromRelationsCount} new concepts added. `;
    if (toastMessage) {
        toast({ title: "Relations Added", description: `${toastMessage.trim()}` });
        removeSuggestedRelationsFromSuggestions(selectedRelations);
    }
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, removeSuggestedRelationsFromSuggestions]);

  // ... (Implementations for Expand Concept - these seem consistent)
  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    let conceptDetailsToSet: ConceptToExpandDetails | null = null;
    let context: string[] = [];
    const currentMapData = useConceptMapStore.getState().mapData;
    const graphAdapter = new GraphAdapterUtility(); // Assuming this is the one from lib
    const graphInstance = graphAdapter.fromArrays(currentMapData.nodes, currentMapData.edges);
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? currentMapData.nodes.find(n => n.id === targetNodeId) : null;

    if (selectedNode) {
      conceptDetailsToSet = { id: selectedNode.id, text: selectedNode.text, node: selectedNode };
      if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
          // Ensure neighborNodeIds are valid and get their text
          context = neighborNodeIds
            .map(id => currentMapData.nodes.find(n => n.id === id)?.text) // Find node and get text
            .filter((text): text is string => !!text) // Filter out undefined texts
            .slice(0, 5);
      }
    } else if (currentMapData.nodes.length > 0) {
      conceptDetailsToSet = { id: null, text: "General Map Topic", node: undefined };
    } else {
        conceptDetailsToSet = {id: null, text: "", node: undefined};
    }
    setConceptToExpandDetails(conceptDetailsToSet);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, mapData, selectedElementId, toast]); // mapData from store used here

  const handleConceptExpanded = useCallback(async (output: any) // Assuming ExpandConceptOutput
    ) => {
    if (isViewOnlyMode || !conceptToExpandDetails || !conceptToExpandDetails.id) {
        toast({ title: "Error", description: "Cannot expand concept without a source node ID.", variant: "destructive" });
        return;
    }
    const parentNodeId = conceptToExpandDetails.id;
    setAiProcessingNodeId(parentNodeId);
    try {
        if (output.expandedIdeas && output.expandedIdeas.length > 0) {
            const mappedPreviewNodes = output.expandedIdeas.map((idea:any, index:number) => ({ // Type idea properly
                id: `preview-exp-${parentNodeId}-${Date.now()}-${index}`,
                text: idea.text,
                relationLabel: idea.relationLabel || 'related to',
                details: idea.details || '',
            }));
            setConceptExpansionPreview({ parentNodeId, previewNodes: mappedPreviewNodes });
            toast({ title: "AI Suggestions Ready", description: "Review the suggested concepts for expansion." });
        } else {
            toast({ title: "No Suggestions", description: "AI did not find any concepts to expand.", variant: "default" });
            setConceptExpansionPreview(null);
        }
    } catch (error) {
        toast({ title: "Error Expanding Concept", description: (error as Error).message, variant: "destructive" });
        setConceptExpansionPreview(null);
    } finally {
        setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, conceptToExpandDetails, setConceptExpansionPreview, setAiProcessingNodeId]);


  // ... (Quick Cluster, Generate Snippet, Ask Question, Rewrite Content, Summarize Nodes - seem consistent, ensure graphAdapter usage is correct if any)
  // All these are kept as they were, assuming they are mostly self-contained or their state dependencies are fine.
  // The key is that graphAdapter is now consistently from the lib.

  // --- Mini Toolbar Actions (handleMiniToolbarQuickExpand uses graphAdapter) ---
  const handleMiniToolbarQuickExpand = useCallback(async (nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode" }); return; }
    const sourceNode = mapData.nodes.find(n => n.id === nodeId);
    if (!sourceNode) { toast({ title: "Error", description: "Source node not found.", variant: "destructive" }); return; }
    setAiProcessingNodeId(nodeId);
    try {
      const graphAdapter = new GraphAdapterUtility();
      const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
      let existingMapContext: string[] = [];
      if (graphInstance.hasNode(sourceNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, sourceNode.id, { depth: 1, direction: 'all' });
          existingMapContext = neighborNodeIds.map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 2);
      }

      const output = await aiExpandConcept({ // Assuming ExpandConceptOutput
        concept: sourceNode.text,
        existingMapContext: existingMapContext,
        userRefinementPrompt: "Generate one concise, directly related child idea. Focus on a primary sub-topic or component.",
      });
      if (output.expandedIdeas && output.expandedIdeas.length > 0) {
        const idea = output.expandedIdeas[0];
        const mappedPreviewNode = { // Type ConceptExpansionPreviewNode
          id: `preview-qexp-${nodeId}-${Date.now()}`, text: idea.text,
          relationLabel: idea.relationLabel || 'related to', details: idea.details || '',
        };
        setConceptExpansionPreview({ parentNodeId: nodeId, previewNodes: [mappedPreviewNode] });
        toast({ title: "AI Suggestion Ready", description: "Review the suggested concept." });
      } else {
        toast({ title: "Quick Expand", description: "AI found no specific idea.", variant: "default" });
        setConceptExpansionPreview(null);
      }
    } catch (error) {
      toast({ title: "Error Quick Expand", description: (error as Error).message, variant: "destructive" });
      setConceptExpansionPreview(null);
    } finally { setAiProcessingNodeId(null); }
  }, [isViewOnlyMode, toast, mapData, setConceptExpansionPreview, setAiProcessingNodeId, aiExpandConcept]);


  // ... (handleMiniToolbarRewriteConcise, fetchAndSetEdgeLabelSuggestions, getPaneSuggestions, memoizedGetNodeSuggestions - seem okay)
  // ... (Concept Expansion Preview Lifecycle - acceptAll, acceptSingle, clear - seem okay)
  // ... (Refine Suggestion Modal Logic - open, confirm - seem okay)
  // ... (Suggest Intermediate Node Logic - request, confirm, clear - using HEAD version which is more complete)
  // ... (AI Tidy-Up Selection - handleAiTidyUpSelection - seems okay)
  // ... (handleAddQuickChildNode, fetchAIChildTextSuggestions, getNodeSuggestions, getPaneSuggestions - seem okay)

  // --- Dagre Layout for Selection ---
  const handleDagreLayoutSelection = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Layout changes are disabled."});
      return;
    }
    const { multiSelectedNodeIds: currentSelectedIds, mapData: currentMapData } = useConceptMapStore.getState();
    const { nodes: allNodes, edges: allEdges } = currentMapData;

    if (currentSelectedIds.length < 2) {
      toast({ title: "Selection Required", description: "Please select at least 2 nodes to arrange." });
      return;
    }

    const selectedNodesFromStore = allNodes.filter(n => currentSelectedIds.includes(n.id));

    const nodesForDagre = selectedNodesFromStore.map(n => {
      const rfn = reactFlowInstance.getNode(n.id);
      return {
        id: n.id,
        width: rfn?.width || n.width || 150,
        height: rfn?.height || n.height || 40,
        label: n.text, // For Dagre, label can be useful for debugging
      };
    }).filter(n => n.width && n.height);

    if (nodesForDagre.length !== selectedNodesFromStore.length) {
      console.warn("Dagre Layout: Some selected nodes could not have their dimensions determined reliably.");
      // Potentially show a toast and abort if too many are missing.
    }
    if (nodesForDagre.length < 2) {
      toast({ title: "Layout Error", description: "Not enough valid nodes with dimensions to perform layout." });
      return;
    }

    const selectedNodeIdSet = new Set(currentSelectedIds);
    const edgesForDagre = allEdges.filter(
      e => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)
    ).map(e => ({ source: e.source, target: e.target, id: e.id, label: e.label }));


    let sumX = 0, sumY = 0;
    let validInitialNodes = 0;
    selectedNodesFromStore.forEach(n => {
      const rfn = reactFlowInstance.getNode(n.id);
      // Use React Flow's current position if available, otherwise fallback to store's x, y
      const xPos = rfn?.position?.x ?? n.x;
      const yPos = rfn?.position?.y ?? n.y;
      if (xPos !== undefined && yPos !== undefined) {
        sumX += xPos;
        sumY += yPos;
        validInitialNodes++;
      }
    });

    if (validInitialNodes === 0) {
        toast({ title: "Layout Error", description: "Cannot determine initial positions of selected nodes."});
        return;
    }
    const initialCentroidX = sumX / validInitialNodes;
    const initialCentroidY = sumY / validInitialNodes;

    try {
      const dagreUtil = new DagreLayoutUtility();
      const dagreOptions = { direction: 'TB', ranksep: 70, nodesep: 70, edgesep: 20, defaultNodeWidth: 150, defaultNodeHeight: 40 };
      const newRelativePositions = await dagreUtil.layout(nodesForDagre, edgesForDagre, dagreOptions);

      if (!newRelativePositions || newRelativePositions.length === 0) {
        toast({ title: "Layout Error", description: "Dagre layout did not return positions."});
        return;
      }

      let sumDagreX = 0, sumDagreY = 0;
      newRelativePositions.forEach(p => {
        const nodeDetails = nodesForDagre.find(n => n.id === p.id);
        sumDagreX += p.x + (nodeDetails?.width || 150) / 2; // Dagre output is top-left, adjust to center for centroid
        sumDagreY += p.y + (nodeDetails?.height || 40) / 2;
      });
      const dagreCentroidX = sumDagreX / newRelativePositions.length;
      const dagreCentroidY = sumDagreY / newRelativePositions.length;

      // Adjust to place the top-left of Dagre's bounding box at the original centroid
      // This means the new centroid will be offset from the original centroid by dagreCentroidX/Y
      // No, we want the new centroid to match the old one.
      // Offset is initialCentroid - dagreCentroid (for top-left positions, this should be correct)
      const offsetX = initialCentroidX - dagreCentroidX + (nodesForDagre[0]?.width || 150)/2; // Adjusting for node width/height in centroid calculation
      const offsetY = initialCentroidY - dagreCentroidY + (nodesForDagre[0]?.height || 40)/2;


      const finalPositions = newRelativePositions.map(p => ({
        id: p.id,
        x: Math.round((p.x + offsetX) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT, // Snap to grid
        y: Math.round((p.y + offsetY) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT, // Snap to grid
      }));

      applyLayout(finalPositions);
      toast({ title: "Selection Arranged", description: `${finalPositions.length} nodes have been auto-arranged.` });
    } catch (error) {
      console.error("Dagre layout error:", error);
      toast({ title: "Layout Error", description: `Failed to arrange nodes: ${(error as Error).message}`, variant: "destructive" });
    }
  }, [isViewOnlyMode, toast, reactFlowInstance, applyLayout, mapData.nodes, mapData.edges, multiSelectedNodeIds]); // Ensure all dependencies are listed


  // Consolidate returned object, ensuring all functions are included
  // This combines functions from both HEAD and master, preferring more complete/recent versions
  // and adding the new handleDagreLayoutSelection
  return {
    // Modals and their handlers
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpandDetails, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered, 
    isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen, nodeContentToRewrite, openRewriteNodeContentModal, handleRewriteNodeContentConfirm, 
    isRefineModalOpen, setIsRefineModalOpen, refineModalInitialData, openRefineSuggestionModal, handleRefineSuggestionConfirm,
    // Intermediate Node (using HEAD version's state, master's more detailed modal states could be added if needed for a separate modal)
    intermediateNodeSuggestion, handleSuggestIntermediateNodeRequest, confirmAddIntermediateNode, clearIntermediateNodeSuggestion,
    // Ghost Node Refinement (from master, if still relevant)
    // isRefineGhostNodeModalOpen, setIsRefineGhostNodeModalOpen, refiningGhostNodeData, openRefineGhostNodeModal, closeRefineGhostNodeModal, handleConfirmRefineGhostNode,

    // Summarization and Mini Toolbar
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,

    // Floater suggestions
    getPaneSuggestions, // Using HEAD version, master has a slightly different one. They are very similar.
    getNodeSuggestions, // Using HEAD version, which incorporates aiChildTextSuggestions

    // AI Child Text Suggestions (from HEAD)
    fetchAIChildTextSuggestions, aiChildTextSuggestions, isLoadingAiChildTexts,

    // Edge Label Suggestions
    fetchAndSetEdgeLabelSuggestions, edgeLabelSuggestions, setEdgeLabelSuggestions,

    // Concept Expansion Preview
    conceptExpansionPreview, acceptAllExpansionPreviews, acceptSingleExpansionPreview, clearExpansionPreview,

    // Direct store actions if needed by consumers of this hook (though usually components use store directly)
    addStoreNode, 
    addStoreEdge,

    // AI Tidy Up
    handleAiTidyUpSelection,

    // New Dagre Layout
    handleDagreLayoutSelection,
  };
}
