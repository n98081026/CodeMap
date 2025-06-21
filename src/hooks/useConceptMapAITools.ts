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
  type IntermediateNodeSuggestionResponse, // Corrected type
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
  type ExpandConceptOutput, // Added
  type AskQuestionAboutNodeOutput, // Added
  type GenerateQuickClusterOutput, // Added
  type GenerateMapSnippetOutput, // Added
  type SuggestRelationsOutput, // Added
  type SummarizeNodesOutput, // Added
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

// _generateNodeSuggestionsLogic seems to be unused after recent changes, can be reviewed for removal later
// const _generateNodeSuggestionsLogic = ( ... )

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
    // For structural suggestions
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
  const [isRefineModalOpen, setIsRefineModalOpen] = useState(false); // Used for refining expansion preview nodes
  const [refineModalInitialData, setRefineModalInitialData] = useState<RefineModalData | null>(null);

  // States for Intermediate Node Suggestion
  const [isSuggestIntermediateNodeModalOpen, setIsSuggestIntermediateNodeModalOpen] = useState(false);
  const [intermediateNodeSuggestionData, setIntermediateNodeSuggestionData] = useState<IntermediateNodeSuggestionResponse | null>(null);
  const [intermediateNodeOriginalEdgeContext, setIntermediateNodeOriginalEdgeContext] = useState<{ edgeId: string; sourceNodeId: string; targetNodeId: string } | null>(null);
  const [isSuggestingIntermediateNode, setIsSuggestingIntermediateNode] = useState(false);

  // State for AI-suggested child texts (for floater)
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<string[]>([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);

  // State for Refine Ghost Node Modal (specific for concept expansion previews)
  const [isRefineGhostNodeModalOpen, setIsRefineGhostNodeModalOpen] = useState(false);
  const [refiningGhostNodeData, setRefiningGhostNodeData] = useState<{ id: string; currentText: string; currentDetails?: string; } | null>(null);


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
    const graphAdapter = new GraphAdapterUtility(); // This is the mock or real adapter
    const graphInstance = graphAdapter.fromArrays(currentMapData.nodes, currentMapData.edges);

    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? currentMapData.nodes.find(n => n.id === targetNodeId) : null;

    if (multiSelectedNodeIds.length >= 2) {
        concepts = multiSelectedNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text);
    } else if (selectedNode) {
        concepts.push(selectedNode.text);
        // Assuming graphInstance.nodesMap is part of the GraphologyInstance type from your adapter
        if (graphInstance && graphInstance.nodesMap && graphInstance.nodesMap.has(selectedNode.id)) {
            const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
            concepts.push(...neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
        }
    } else if (currentMapData.nodes.length > 0) {
        concepts = currentMapData.nodes.slice(0, Math.min(5, currentMapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, selectedElementId, multiSelectedNodeIds, mapData.nodes, mapData.edges, toast]); // mapData.nodes and mapData.edges added

  const handleRelationsSuggested = useCallback((relations: SuggestRelationsOutput) => {
    setAiSuggestedRelations(relations.relations); // Assuming SuggestRelationsOutput has a `relations` array
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

  // --- Expand Concept (Direct Addition) ---
  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }

    let conceptDetailsToSet: ConceptToExpandDetails | null = null;
    let context: string[] = [];
    const currentMapData = useConceptMapStore.getState().mapData;
    const graphAdapter = new GraphAdapterUtility();
    const graphInstance = graphAdapter.fromArrays(currentMapData.nodes, currentMapData.edges);

    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? currentMapData.nodes.find(n => n.id === targetNodeId) : null;

    if (selectedNode) {
      conceptDetailsToSet = { id: selectedNode.id, text: selectedNode.text, node: selectedNode };
      if (graphInstance && graphInstance.nodesMap && graphInstance.nodesMap.has(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
          context = neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 5);
      }
    } else if (currentMapData.nodes.length > 0) {
      conceptDetailsToSet = { id: null, text: "General Map Topic", node: undefined }; // No specific node ID
    } else {
        conceptDetailsToSet = {id: null, text: "", node: undefined}; // Empty map
    }
    setConceptToExpandDetails(conceptDetailsToSet);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, selectedElementId, mapData.nodes, mapData.edges, toast]); // mapData.nodes and mapData.edges added

  const handleConceptExpanded = useCallback(async (output: ExpandConceptOutput) => {
    if (isViewOnlyMode || !conceptToExpandDetails || !conceptToExpandDetails.id) {
        toast({ title: "Error", description: "Cannot expand concept without a source node ID.", variant: "destructive" });
        return;
    }
    
    const parentNodeId = conceptToExpandDetails.id;
    setAiProcessingNodeId(parentNodeId);

    try {
        if (output.expandedIdeas && output.expandedIdeas.length > 0) {
            const mappedPreviewNodes: ConceptExpansionPreviewNode[] = output.expandedIdeas.map((idea, index) => ({
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

  // --- Quick Cluster ---
  const openQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions(); // Consider if this is needed or if it should append
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    if (isViewOnlyMode) return;
    const tempNodes: ConceptMapNode[] = output.nodes.map((aiNode, index) => ({
      id: `staged-node-${Date.now()}-${index}`,
      text: aiNode.text, type: aiNode.type || 'ai-generated', details: aiNode.details || '',
      x: (index % 5) * 170, y: Math.floor(index / 5) * 120, // Basic grid layout
      width: 150, height: 70, childIds: [], // Initialize childIds
    }));
    const tempNodeIdMap = new Map<string, string>();
    tempNodes.forEach(n => tempNodeIdMap.set(n.text, n.id)); // Map by original text for linking
    const tempEdges = (output.edges || []).map((aiEdge, index) => ({
      id: `staged-edge-${Date.now()}-${index}`,
      source: tempNodeIdMap.get(aiEdge.sourceText) || `unknown-source-${aiEdge.sourceText}`, // Handle if source not found
      target: tempNodeIdMap.get(aiEdge.targetText) || `unknown-target-${aiEdge.targetText}`, // Handle if target not found
      label: aiEdge.relationLabel,
    })).filter(e => !e.source.startsWith('unknown-') && !e.target.startsWith('unknown-')); // Filter out edges with unresolved nodes
    setStagedMapData({ nodes: tempNodes, edges: tempEdges });
    toast({ title: "AI Cluster Ready for Staging", description: `Proposed ${tempNodes.length} nodes and ${tempEdges.length} edges.` });
  }, [isViewOnlyMode, setStagedMapData, toast]);

  // --- Generate Snippet ---
  const openGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions(); // Consider if this is needed
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    if (isViewOnlyMode) return;
    const tempNodes: ConceptMapNode[] = output.nodes.map((aiNode, index) => ({
      id: `staged-node-${Date.now()}-${index}`,
      text: aiNode.text, type: aiNode.type || 'text-derived-concept', details: aiNode.details || '',
      x: (index % 5) * 170, y: Math.floor(index / 5) * 120,
      width: 150, height: 70, childIds: [], // Initialize childIds
    }));
    const tempNodeIdMap = new Map<string, string>();
    tempNodes.forEach(n => tempNodeIdMap.set(n.text, n.id));
    const tempEdges = (output.edges || []).map((aiEdge, index) => ({
      id: `staged-edge-${Date.now()}-${index}`,
      source: tempNodeIdMap.get(aiEdge.sourceText) || `unknown-source-${aiEdge.sourceText}`,
      target: tempNodeIdMap.get(aiEdge.targetText) || `unknown-target-${aiEdge.targetText}`,
      label: aiEdge.relationLabel,
    })).filter(e => !e.source.startsWith('unknown-') && !e.target.startsWith('unknown-'));
    setStagedMapData({ nodes: tempNodes, edges: tempEdges });
    toast({ title: "AI Snippet Ready for Staging", description: `Proposed ${tempNodes.length} nodes and ${tempEdges.length} edges.` });
  }, [isViewOnlyMode, setStagedMapData, toast]);

  // --- Ask Question ---
  const openAskQuestionModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) { setNodeContextForQuestion({ text: node.text, details: node.details, id: node.id }); setIsAskQuestionModalOpen(true); }
    else { toast({ title: "Error", description: "Node not found.", variant: "destructive" }); }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleQuestionAnswered = useCallback(async (question: string, nodeCtx: { text: string; details?: string; id: string; } ) => {
    if (isViewOnlyMode || !nodeCtx) return;
    setAiProcessingNodeId(nodeCtx.id);
    try {
        const result: AskQuestionAboutNodeOutput = await aiAskQuestionAboutNode({
            nodeText: nodeCtx.text, nodeDetails: nodeCtx.details, question: question,
        });
        toast({ title: "AI Answer Received", description: result.answer.length > 150 ? `${result.answer.substring(0, 147)}...` : result.answer, duration: 10000 });
    } catch (error) { toast({ title: "Error Getting Answer", description: (error as Error).message, variant: "destructive" }); }
    finally { setAiProcessingNodeId(null); }
  }, [isViewOnlyMode, toast, setAiProcessingNodeId]);

  // --- Rewrite Node Content ---
  const openRewriteNodeContentModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) { setNodeContentToRewrite({ id: node.id, text: node.text, details: node.details }); setIsRewriteNodeContentModalOpen(true); }
    else { toast({ title: "Error", description: "Node not found for rewrite.", variant: "destructive" }); }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleRewriteNodeContentConfirm = useCallback(async (nodeId: string, newText: string, newDetails?: string, tone?: string) => {
    if (isViewOnlyMode) return;
    setAiProcessingNodeId(nodeId);
    try {
      updateStoreNode(nodeId, { text: newText, details: newDetails, type: 'ai-rewritten-node' });
      toast({ title: "Node Content Rewritten", description: `Node updated by AI (Tone: ${tone || 'Default'}).` });
    } catch (error) { toast({ title: "Error Applying Rewrite", description: (error as Error).message, variant: "destructive" }); }
    finally { setAiProcessingNodeId(null); }
  }, [isViewOnlyMode, updateStoreNode, toast, setAiProcessingNodeId]);

  // --- Summarize Selected Nodes ---
  const handleSummarizeSelectedNodes = useCallback(async () => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    if (multiSelectedNodeIds.length < 2) { toast({ title: "Selection Required", description: "Please select at least two nodes to summarize."}); return; }
    const nodeContents = multiSelectedNodeIds.map(id => {
        const node = mapData.nodes.find(n => n.id === id);
        return node ? (node.details ? `${node.text}: ${node.details}` : node.text) : '';
    }).filter(Boolean);
    if (nodeContents.length === 0) { toast({ title: "No Content", description: "Selected nodes have no text content."}); return; }
    setAiProcessingNodeId('summarizing_selection'); 
    try {
        toast({ title: "AI Summarization", description: "Processing selected nodes...", duration: 3000});
        const result: SummarizeNodesOutput = await aiSummarizeNodes({ nodeContents });
        const currentNodes = useConceptMapStore.getState().mapData.nodes;
        let avgX = 0; let avgY = 0; let count = 0;
        multiSelectedNodeIds.forEach(id => {
            const node = currentNodes.find(n => n.id === id);
            if (node && typeof node.x === 'number' && typeof node.y === 'number') { avgX += node.x; avgY += node.y; count++; }
        });
        const position = count > 0
            ? { x: Math.round((avgX / count + 100)/GRID_SIZE_FOR_AI_PLACEMENT)*GRID_SIZE_FOR_AI_PLACEMENT, y: Math.round((avgY / count + 50)/GRID_SIZE_FOR_AI_PLACEMENT)*GRID_SIZE_FOR_AI_PLACEMENT }
            : getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT);
        addStoreNode({ text: `Summary of ${multiSelectedNodeIds.length} nodes`, type: 'ai-summary-node', details: result.summary, position: position });
        toast({ title: "AI Summary Created", description: "A new node with the summary has been added.", duration: 7000 });
    } catch (error) { toast({ title: "Error Summarizing Nodes", description: (error as Error).message, variant: "destructive" }); }
    finally { setAiProcessingNodeId(null); }
  }, [isViewOnlyMode, multiSelectedNodeIds, mapData.nodes, toast, addStoreNode, setAiProcessingNodeId]);

  // --- Mini Toolbar Actions ---
  const handleMiniToolbarQuickExpand = useCallback(async (nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode" }); return; }
    const sourceNode = mapData.nodes.find(n => n.id === nodeId);
    if (!sourceNode) { toast({ title: "Error", description: "Source node not found.", variant: "destructive" }); return; }
    setAiProcessingNodeId(nodeId);
    try {
      const graphAdapter = new GraphAdapterUtility();
      const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
      let existingMapContext: string[] = [];
      if (graphInstance && graphInstance.nodesMap && graphInstance.nodesMap.has(sourceNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, sourceNode.id, { depth: 1, direction: 'all' });
          existingMapContext = neighborNodeIds.map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 2);
      }

      const output: ExpandConceptOutput = await aiExpandConcept({
        concept: sourceNode.text,
        existingMapContext: existingMapContext,
        userRefinementPrompt: "Generate one concise, directly related child idea. Focus on a primary sub-topic or component.",
      });
      if (output.expandedIdeas && output.expandedIdeas.length > 0) {
        const idea = output.expandedIdeas[0];
        const mappedPreviewNode: ConceptExpansionPreviewNode = {
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
  }, [isViewOnlyMode, toast, mapData, setConceptExpansionPreview, setAiProcessingNodeId]); // mapData instead of mapData.nodes, mapData.edges

  const handleMiniToolbarRewriteConcise = useCallback(async (nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode" }); return; }
    const nodeToRewrite = mapData.nodes.find(n => n.id === nodeId);
    if (!nodeToRewrite) { toast({ title: "Error", description: "Node not found.", variant: "destructive" }); return; }
    setAiProcessingNodeId(nodeId);
    try {
      const output: RewriteNodeContentOutput = await aiRewriteNodeContent({
        currentText: nodeToRewrite.text, currentDetails: nodeToRewrite.details,
        userInstruction: "Make the text much more concise. Summarize details into main text or omit.",
      });
      updateStoreNode(nodeId, { text: output.newText, details: output.newDetails || '', type: 'ai-rewritten-node' });
      toast({ title: "Rewrite Concise Successful" });
    } catch (error) { toast({ title: "Error Rewrite Concise", description: (error as Error).message, variant: "destructive" }); }
    finally { setAiProcessingNodeId(null); }
  }, [isViewOnlyMode, toast, mapData.nodes, updateStoreNode, setAiProcessingNodeId]); // mapData.nodes

  // --- Edge Label Suggestions ---
  const fetchAndSetEdgeLabelSuggestions = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => {
    if (isViewOnlyMode) return;
    useConceptMapStore.getState().addDebugLog(`[AITools] Fetching suggestions for edge ${edgeId}`);
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
    const targetNode = currentNodes.find(n => n.id === targetNodeId);
    if (!sourceNode || !targetNode) { toast({ title: "Error", description: "Nodes for edge not found.", variant: "destructive" }); return; }
    toast({ title: "AI Suggesting Labels...", duration: 2000 });
    try {
      const input: SuggestEdgeLabelInput = {
        sourceNode: { text: sourceNode.text, details: sourceNode.details },
        targetNode: { text: targetNode.text, details: targetNode.details },
        existingLabel: existingLabel,
      };
      const output: SuggestEdgeLabelOutput = await suggestEdgeLabelFlow(input);
      if (output.suggestedLabels && output.suggestedLabels.length > 0) {
        setEdgeLabelSuggestions({ edgeId, labels: output.suggestedLabels });
      } else { setEdgeLabelSuggestions(null); }
    } catch (error) {
      toast({ title: "AI Edge Suggestion Failed", description: (error as Error).message, variant: "destructive" });
      setEdgeLabelSuggestions(null);
    }
  }, [isViewOnlyMode, toast]);

  // --- Quick Add Child Node (from Floater) ---
  const handleAddQuickChildNode = useCallback((
    parentNodeId: string,
    suggestedText: string,
    direction?: 'top' | 'right' | 'bottom' | 'left'
  ) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot add child nodes.", variant: "default" });
      return;
    }
    const parentNode = mapData.nodes.find(n => n.id === parentNodeId);
    if (!parentNode) {
      toast({ title: "Error", description: "Parent node not found.", variant: "destructive" });
      return;
    }

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const childIndex = parentNode.childIds?.length || 0;
    const effectiveDirection = direction || 'bottom';

    const newPosition = getNodePlacement(
      currentNodes, 'child', parentNode, null,
      GRID_SIZE_FOR_AI_PLACEMENT, childIndex, 1, effectiveDirection
    );

    const newNodeId = addStoreNode({
      text: suggestedText, type: 'manual-node',
      position: newPosition, parentNode: parentNodeId,
    });

    addStoreEdge({ source: parentNodeId, target: newNodeId, label: "relates to" });
    setAiChildTextSuggestions([]); // Clear suggestions after adding one
    toast({ title: "Child Node Added", description: `"${suggestedText}" added ${effectiveDirection} of "${parentNode.text}".` });
  }, [isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast]); // mapData.nodes

  // --- Fetch AI Child Text Suggestions (for Floater) ---
  const fetchAIChildTextSuggestions = useCallback(async (node: RFNode<CustomNodeData> | null) => {
    if (!node || isViewOnlyMode) { setAiChildTextSuggestions([]); return; }
    setIsLoadingAiChildTexts(true);
    setAiChildTextSuggestions([]); // Clear previous before fetching new
    try {
      const result = await suggestQuickChildTextsFlow({
        parentNodeText: node.data.label,
        parentNodeDetails: node.data.details,
      });
      setAiChildTextSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Error fetching AI child text suggestions:", error);
      toast({ title: "AI Suggestion Error", description: "Could not fetch child text suggestions.", variant: "destructive" });
      setAiChildTextSuggestions([]);
    } finally {
      setIsLoadingAiChildTexts(false);
    }
  }, [isViewOnlyMode, toast]);

  // --- Pane/Node Suggestions for Floater ---
  const getNodeSuggestions = useCallback((currentNode: RFNode<CustomNodeData>): SuggestionAction[] => {
    const baseAISuggestions: SuggestionAction[] = [
      { id: `expand-${currentNode.id}`, label: "Expand Concept (AI)", icon: Sparkles, action: () => openExpandConceptModal(currentNode.id) },
      { id: `suggest-relations-${currentNode.id}`, label: "Suggest Relations (AI)", icon: Lightbulb, action: () => openSuggestRelationsModal(currentNode.id) },
      { id: `rewrite-${currentNode.id}`, label: "Rewrite Content (AI)", icon: MessageSquareQuote, action: () => openRewriteNodeContentModal(currentNode.id) },
      { id: `ask-${currentNode.id}`, label: "Ask Question (AI)", icon: HelpCircle, action: () => openAskQuestionModal(currentNode.id) },
    ];

    let quickAddSuggestions: SuggestionAction[] = [];

    if (!isViewOnlyMode) {
      if (isLoadingAiChildTexts) {
        quickAddSuggestions.push({
          id: 'loading-ai-child-texts', label: "Loading ideas...", action: () => {}, icon: Loader2, disabled: true,
        });
      } else if (aiChildTextSuggestions.length > 0) {
        aiChildTextSuggestions.forEach((text, index) => {
          quickAddSuggestions.push({
            id: `ai-add-child-bottom-${currentNode.id}-${index}`, label: `Add: "${text}" (below)`, icon: PlusSquare,
            action: () => handleAddQuickChildNode(currentNode.id, text, 'bottom')
          });
          quickAddSuggestions.push({
            id: `ai-add-child-right-${currentNode.id}-${index}`, label: `Add: "${text}" (right)`, icon: PlusSquare,
            action: () => handleAddQuickChildNode(currentNode.id, text, 'right')
          });
        });
        quickAddSuggestions.push({
          id: 'clear-ai-child-suggestions', label: 'Clear these suggestions', action: () => setAiChildTextSuggestions([]),
        });
      } else { // Offer manual add if no AI suggestions or not loading
        quickAddSuggestions.push({
          id: `quick-add-child-bottom-${currentNode.id}`, label: "Add Child Below", icon: PlusSquare,
          action: () => handleAddQuickChildNode(currentNode.id, "New Idea", 'bottom')
        });
        quickAddSuggestions.push({
          id: `quick-add-child-right-${currentNode.id}`, label: "Add Child Right", icon: PlusSquare,
          action: () => handleAddQuickChildNode(currentNode.id, "New Idea", 'right')
        });
      }
    }
    return [...baseAISuggestions, ...quickAddSuggestions];
  }, [
    isViewOnlyMode, openExpandConceptModal, openSuggestRelationsModal, openRewriteNodeContentModal,
    openAskQuestionModal, handleAddQuickChildNode, isLoadingAiChildTexts, aiChildTextSuggestions
  ]);

  const getPaneSuggestions = useCallback((position?: {x: number, y: number}): SuggestionAction[] => {
    const baseSuggestions: SuggestionAction[] = [
      { id: 'pane-quick-cluster', label: "Quick Cluster (AI)", icon: Brain, action: openQuickClusterModal },
    ];
     if (!isViewOnlyMode && position) {
      baseSuggestions.unshift({
        id: 'pane-add-topic', label: "Add New Topic Here", icon: PlusSquare,
        action: () => {
            const newNodeId = addStoreNode({ text: "New Topic", type: 'manual-node', position });
            useConceptMapStore.getState().setEditingNodeId(newNodeId);
        }
      });
    }
    return baseSuggestions;
  }, [isViewOnlyMode, openQuickClusterModal, addStoreNode]);

  // --- Concept Expansion Preview Lifecycle ---
  const acceptAllExpansionPreviews = useCallback(() => {
    if (!conceptExpansionPreview || isViewOnlyMode) return;
    const { parentNodeId, previewNodes } = conceptExpansionPreview;
    const parentNode = mapData.nodes.find(n => n.id === parentNodeId);
    if (!parentNode) { toast({ title: "Error", description: "Parent node for expansion not found."}); return; }

    previewNodes.forEach((previewNode, index) => {
      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      const position = getNodePlacement(currentNodes, 'child', parentNode, null, GRID_SIZE_FOR_AI_PLACEMENT, index, previewNodes.length);
      const newNodeId = addStoreNode({
        text: previewNode.text, type: 'ai-expanded', details: previewNode.details,
        position: position, parentNode: parentNodeId,
      });
      addStoreEdge({ source: parentNodeId, target: newNodeId, label: previewNode.relationLabel });
    });
    toast({ title: "Suggestions Added", description: `${previewNodes.length} new concepts added and linked.` });
    setConceptExpansionPreview(null);
  }, [conceptExpansionPreview, isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast, setConceptExpansionPreview]); // mapData.nodes

  const acceptSingleExpansionPreview = useCallback((previewNodeId: string) => {
    if (!conceptExpansionPreview || isViewOnlyMode) return;
    const { parentNodeId, previewNodes } = conceptExpansionPreview;
    const parentNode = mapData.nodes.find(n => n.id === parentNodeId);
    if (!parentNode) { toast({ title: "Error", description: "Parent node for expansion not found."}); return; }

    const previewNodeData = previewNodes.find(pn => pn.id === previewNodeId);
    if (!previewNodeData) { toast({ title: "Error", description: "Preview node data not found."}); return; }

    const nodeIndex = previewNodes.findIndex(pn => pn.id === previewNodeId);
    const totalNodesInPreview = previewNodes.length;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const position = getNodePlacement(currentNodes, 'child', parentNode, null, GRID_SIZE_FOR_AI_PLACEMENT, nodeIndex, totalNodesInPreview);

    const newNodeId = addStoreNode({
      text: previewNodeData.text, type: 'ai-expanded', details: previewNodeData.details,
      position: position, parentNode: parentNodeId,
    });
    addStoreEdge({ source: parentNodeId, target: newNodeId, label: previewNodeData.relationLabel });

    toast({ title: "Suggestion Added", description: `Concept "${previewNodeData.text}" added and linked.` });

    const remainingPreviewNodes = previewNodes.filter(pn => pn.id !== previewNodeId);
    if (remainingPreviewNodes.length > 0) {
      setConceptExpansionPreview({ parentNodeId, previewNodes: remainingPreviewNodes });
    } else {
      setConceptExpansionPreview(null);
    }
  }, [conceptExpansionPreview, isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast, setConceptExpansionPreview]); // mapData.nodes

  const clearExpansionPreview = useCallback(() => {
    setConceptExpansionPreview(null);
  }, [setConceptExpansionPreview]);

  // --- Refine Suggestion Modal Logic (for expansion previews) ---
  const openRefineSuggestionModal = useCallback((previewNodeId: string, parentNodeIdForPreview: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    const currentPreview = useConceptMapStore.getState().conceptExpansionPreview;
    if (currentPreview && currentPreview.parentNodeId === parentNodeIdForPreview) {
      const nodeToRefine = currentPreview.previewNodes.find(n => n.id === previewNodeId);
      if (nodeToRefine) {
        setRefineModalInitialData({
          nodeId: nodeToRefine.id, parentNodeId: parentNodeIdForPreview,
          text: nodeToRefine.text, details: nodeToRefine.details
        });
        setIsRefineModalOpen(true);
      } else { toast({ title: "Error", description: "Preview node to refine not found.", variant: "destructive" }); }
    } else { toast({ title: "Error", description: "No active expansion preview for this context.", variant: "destructive" }); }
  }, [isViewOnlyMode, toast]);

  const handleRefineSuggestionConfirm = useCallback(async (refinementInstruction: string) => {
    if (!refineModalInitialData) { toast({ title: "Error", description: "No data available for refinement.", variant: "destructive" }); return; }
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }

    const { nodeId: previewNodeId, parentNodeId, text: originalText, details: originalDetails } = refineModalInitialData;
    setAiProcessingNodeId(parentNodeId); // Use parent as processing indicator
    setIsRefineModalOpen(false);
    try {
      const output: RefineNodeSuggestionOutput = await refineNodeSuggestionFlow({
        originalText, originalDetails, userInstruction: refinementInstruction,
      });
      updateConceptExpansionPreviewNode(previewNodeId, output.refinedText, output.refinedDetails); // Use the specific store action
      toast({ title: "Suggestion Refined", description: "The AI suggestion has been updated." });
    } catch (error) {
      console.error("Error refining suggestion:", error);
      toast({ title: "Refinement Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setAiProcessingNodeId(null);
      setRefineModalInitialData(null);
    }
  }, [refineModalInitialData, isViewOnlyMode, toast, setAiProcessingNodeId, updateConceptExpansionPreviewNode]);

  // --- Refine Ghost Node Modal (for expansion previews, direct call from ghost node UI) ---
  const openRefineGhostNodeModal = useCallback((nodeId: string, currentText: string, currentDetails?: string) => {
    setRefiningGhostNodeData({ id: nodeId, currentText, currentDetails });
    setIsRefineGhostNodeModalOpen(true);
    addDebugLog(`[AITools] Opening RefineGhostNodeModal for preview node: ${nodeId}`);
  }, [addDebugLog]);

  const closeRefineGhostNodeModal = useCallback(() => {
    setIsRefineGhostNodeModalOpen(false);
    setRefiningGhostNodeData(null);
    addDebugLog('[AITools] Closed RefineGhostNodeModal.');
  }, [addDebugLog]);

  const handleConfirmRefineGhostNode = useCallback((newText: string, newDetails: string) => {
    if (refiningGhostNodeData) {
      updateConceptExpansionPreviewNode(refiningGhostNodeData.id, newText, newDetails);
      toast({ title: "Suggestion Refined", description: `Preview node '${refiningGhostNodeData.id}' updated.` });
      addDebugLog(`[AITools] Confirmed refinement for preview node: ${refiningGhostNodeData.id}`);
    }
    closeRefineGhostNodeModal();
  }, [refiningGhostNodeData, closeRefineGhostNodeModal, toast, addDebugLog, updateConceptExpansionPreviewNode]);

  // --- Suggest Intermediate Node Logic ---
  const handleSuggestIntermediateNode = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    addDebugLog(`[AITools] handleSuggestIntermediateNode called for edge: ${edgeId}`);
    setIsSuggestingIntermediateNode(true);
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const currentEdges = useConceptMapStore.getState().mapData.edges;
    const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
    const targetNode = currentNodes.find(n => n.id === targetNodeId);
    const originalEdge = currentEdges.find(e => e.id === edgeId);

    if (!sourceNode || !targetNode || !originalEdge) {
      toast({ title: "Error", description: "Source/target node or original edge not found.", variant: "destructive" });
      setIsSuggestingIntermediateNode(false); return;
    }
    const flowInput: SuggestIntermediateNodeInput = {
      sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details,
      targetNodeText: targetNode.text, targetNodeDetails: targetNode.details,
      existingEdgeLabel: originalEdge.label,
    };
    try {
      const response = await runFlow(suggestIntermediateNodeFlow, flowInput);
      if (response) {
        setIntermediateNodeSuggestionData(response);
        setIntermediateNodeOriginalEdgeContext({ edgeId, sourceNodeId, targetNodeId });
        setIsSuggestIntermediateNodeModalOpen(true);
        addDebugLog(`[AITools] Suggestion received: ${response.suggestedNodeText}`);
      } else {
        toast({ title: "No Suggestion", description: "AI could not suggest an intermediate node.", variant: "default" });
      }
    } catch (error) {
      console.error("Error suggesting intermediate node:", error);
      toast({ title: "AI Error", description: `Failed to suggest intermediate node: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsSuggestingIntermediateNode(false);
    }
  }, [isViewOnlyMode, toast, addDebugLog]);

  const closeSuggestIntermediateNodeModal = useCallback(() => {
    setIsSuggestIntermediateNodeModalOpen(false);
    setIntermediateNodeSuggestionData(null);
    setIntermediateNodeOriginalEdgeContext(null);
  }, []);

  const confirmAddIntermediateNode = useCallback(() => {
    if (!intermediateNodeSuggestionData || !intermediateNodeOriginalEdgeContext) {
      toast({ title: "Error", description: "Missing suggestion data or context.", variant: "destructive" }); return;
    }
    addDebugLog('[AITools] confirmAddIntermediateNode called');
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const sourceNode = currentNodes.find(n => n.id === intermediateNodeOriginalEdgeContext.sourceNodeId);
    const targetNode = currentNodes.find(n => n.id === intermediateNodeOriginalEdgeContext.targetNodeId);
    let newPosition = { x: 0, y: 0 };
    if (sourceNode && targetNode) {
      newPosition = { x: (sourceNode.x + targetNode.x) / 2, y: (sourceNode.y + targetNode.y) / 2 - 50 };
    } else {
      newPosition = getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT);
    }
    useConceptMapStore.getState().deleteEdge(intermediateNodeOriginalEdgeContext.edgeId);
    const newNodeId = addStoreNode({
      text: intermediateNodeSuggestionData.suggestedNodeText,
      details: intermediateNodeSuggestionData.suggestedNodeDetails,
      position: newPosition, type: 'ai-intermediate',
    });
    addStoreEdge({
      source: intermediateNodeOriginalEdgeContext.sourceNodeId, target: newNodeId,
      label: intermediateNodeSuggestionData.labelToSource || 'related to',
    });
    addStoreEdge({
      source: newNodeId, target: intermediateNodeOriginalEdgeContext.targetNodeId,
      label: intermediateNodeSuggestionData.labelToTarget || 'related to',
    });
    toast({ title: "Intermediate Node Added", description: `Node "${intermediateNodeSuggestionData.suggestedNodeText}" inserted.` });
    closeSuggestIntermediateNodeModal();
  }, [toast, intermediateNodeSuggestionData, intermediateNodeOriginalEdgeContext, closeSuggestIntermediateNodeModal, addStoreNode, addStoreEdge, addDebugLog]);

  // --- AI Tidy-Up Selection ---
  const handleAiTidyUpSelection = useCallback(async () => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", description: "AI Tidy Up is disabled." }); return; }
    const currentMapDataNodes = useConceptMapStore.getState().mapData.nodes;
    const currentMultiSelectedNodeIds = useConceptMapStore.getState().multiSelectedNodeIds;
    const storeApplyLayout = useConceptMapStore.getState().applyLayout;

    if (currentMultiSelectedNodeIds.length < 2) { toast({ title: "Selection Required", description: "Please select at least two nodes to tidy up." }); return; }
    const selectedNodesData: NodeLayoutInfo[] = currentMultiSelectedNodeIds
      .map(id => {
        const node = currentMapDataNodes.find(n => n.id === id);
        if (node && typeof node.x === 'number' && typeof node.y === 'number' && typeof node.width === 'number' && typeof node.height === 'number') {
          return { id: node.id, x: node.x, y: node.y, width: node.width, height: node.height, text: node.text, type: node.type };
        } return null;
      }).filter((n): n is NodeLayoutInfo => n !== null);

    if (selectedNodesData.length < 2) {
      toast({ title: "Not Enough Valid Node Data", description: "Could not retrieve enough valid data for tidy up.", variant: "destructive" }); return;
    }
    setAiProcessingNodeId("ai-tidy-up");
    toast({ title: "AI Tidy-Up", description: "AI is tidying up the selected nodes...", duration: 3000 });
    try {
      const output: AiTidyUpSelectionOutput = await aiTidyUpSelectionFlow({ nodes: selectedNodesData });
      if (output.newPositions && output.newPositions.length > 0) {
        storeApplyLayout(output.newPositions);
        if (output.suggestedParentNode && output.suggestedParentNode.text) {
          const { text: parentText, type: parentType } = output.suggestedParentNode;
          let sumX = 0, sumY = 0;
          const childrenNewPositions = output.newPositions.filter(p => selectedNodesData.some(sn => sn.id === p.id));
          if (childrenNewPositions.length > 0) {
            childrenNewPositions.forEach(p => {
              const originalNode = selectedNodesData.find(sn => sn.id === p.id);
              sumX += p.x + (originalNode?.width || 150) / 2;
              sumY += p.y + (originalNode?.height || 70) / 2;
            });
            const avgCenterX = sumX / childrenNewPositions.length;
            const avgCenterY = sumY / childrenNewPositions.length;
            const parentNodePosition = {
              x: Math.round((avgCenterX - 75) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
              y: Math.round((avgCenterY - 35) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT
            };
            const newParentNodeId = useConceptMapStore.getState().addNode({
              text: parentText, type: parentType || 'ai-group', position: parentNodePosition,
            });
            childrenNewPositions.forEach(childPos => {
              useConceptMapStore.getState().updateNode(childPos.id, { parentNode: newParentNodeId });
            });
            toast({ title: "AI Tidy-Up & Grouping Successful", description: `Selected nodes rearranged and grouped under "${parentText}".` });
          } else {
             toast({ title: "AI Tidy-Up Successful", description: "Selected nodes rearranged. Grouping suggested but could not be applied." });
          }
        } else {
          toast({ title: "AI Tidy-Up Successful", description: "Selected nodes have been rearranged." });
        }
      } else {
        toast({ title: "AI Tidy-Up", description: "AI did not suggest new positions or output was invalid.", variant: "default" });
      }
    } catch (error) {
      console.error("Error during AI Tidy-Up:", error);
      toast({ title: "AI Tidy-Up Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, setAiProcessingNodeId]);

  // --- Handle Suggest Map Improvements (Structural Suggestions) ---
  const handleSuggestMapImprovements = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot suggest map improvements." });
      return;
    }
    addDebugLog('[AITools] handleSuggestMapImprovements called');
    storeClearAllStructuralSuggestions(); // Clear previous before fetching new
    try {
      await storeFetchStructuralSuggestions(); // This now handles loading state and sets suggestions in store
      // Toast for success/no new suggestions will be handled by the store action or here based on resulting state
      const { structuralSuggestions, structuralGroupSuggestions } = useConceptMapStore.getState();
      const totalSuggestions = (structuralSuggestions?.length || 0) + (structuralGroupSuggestions?.length || 0);
      if (totalSuggestions > 0) {
        toast({ title: "AI Map Analysis Complete", description: `${totalSuggestions} structural suggestions found.` });
      } else {
        toast({ title: "AI Map Analysis Complete", description: "No new structural suggestions found at this time.", variant: "default" });
      }
    } catch (error) { // This catch might be redundant if storeFetchStructuralSuggestions handles its own errors and toasts
      console.error("Error fetching structural suggestions from hook:", error);
      toast({ title: "AI Map Analysis Failed", description: (error as Error).message, variant: "destructive" });
    }
  }, [isViewOnlyMode, toast, addDebugLog, storeFetchStructuralSuggestions, storeClearAllStructuralSuggestions]);


  return {
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
    addStoreNode, addStoreEdge, // Exposing store actions directly for some cases like quick add child
    isRefineModalOpen, setIsRefineModalOpen, refineModalInitialData, openRefineSuggestionModal, handleRefineSuggestionConfirm,
    // For Intermediate Node
    isSuggestIntermediateNodeModalOpen, setIsSuggestIntermediateNodeModalOpen, intermediateNodeSuggestionData,
    handleSuggestIntermediateNode, confirmAddIntermediateNode, closeSuggestIntermediateNodeModal, isSuggestingIntermediateNode,
    // For Ghost Node Refinement (expansion previews)
    isRefineGhostNodeModalOpen, openRefineGhostNodeModal, closeRefineGhostNodeModal, handleConfirmRefineGhostNode, refiningGhostNodeData,
    handleAiTidyUpSelection,
    // For Structural Suggestions
    handleSuggestMapImprovements, // New function exposed
    isFetchingStructuralSuggestions: storeIsFetchingStructuralSuggestions, // Expose loading state from store
  };
}
