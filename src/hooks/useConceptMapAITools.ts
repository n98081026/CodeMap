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
  type SuggestIntermediateNodeOutput,
  aiTidyUpSelectionFlow,
  type AiTidyUpSelectionInput,
  type AiTidyUpSelectionOutput,
  type NodeLayoutInfo
} from '@/ai/flows';
import { 
    rewriteNodeContent as aiRewriteNodeContent,
    type RewriteNodeContentOutput 
} from '@/ai/flows/rewrite-node-content-logic';
import type { ConceptMapNode, ConceptMapEdge, RFNode } from '@/types';
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

const _generateNodeSuggestionsLogic = (
  sourceNode: RFNode<any> | ConceptMapNode,
  isViewOnly: boolean,
  addNodeFunc: ReturnType<typeof useConceptMapStore>['addNode'],
  getNodePlacementFunc: typeof getNodePlacement,
  toastFunc: ReturnType<typeof useToast>['toast']
): SuggestionAction[] => {
  if (isViewOnly) return [];
  const placeholderSuggestions = [
    { text: "Related Idea Alpha", type: 'default' },
    { text: "Sub-topic Beta", type: 'default' },
    { text: "Supporting Detail Gamma", type: 'ai-suggested' },
  ];
  return placeholderSuggestions.map((pSuggestion, index) => ({
    id: `add-suggested-node-${sourceNode.id}-${index}`,
    label: pSuggestion.text,
    suggestionType: 'content_chip',
    action: () => {
      if (isViewOnly) return;
      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      const newPosition = getNodePlacementFunc(
        currentNodes, 'child', sourceNode as ConceptMapNode, null,
        GRID_SIZE_FOR_AI_PLACEMENT, index, placeholderSuggestions.length
      );
      addNodeFunc({
        text: pSuggestion.text, type: pSuggestion.type,
        position: newPosition, parentNode: sourceNode.id
      });
      toastFunc({ title: "Node Added", description: `"${pSuggestion.text}" added near "${(sourceNode as ConceptMapNode).text}".` });
    }
  }));
};


export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const {
    mapData, selectedElementId, multiSelectedNodeIds,
    setAiExtractedConcepts, setAiSuggestedRelations,
    removeExtractedConceptsFromSuggestions, removeSuggestedRelationsFromSuggestions,
    resetAiSuggestions, addNode: addStoreNode, updateNode: updateStoreNode,
    addEdge: addStoreEdge, setAiProcessingNodeId, setStagedMapData,
    setConceptExpansionPreview, conceptExpansionPreview,
    applyLayout,
  } = useConceptMapStore(
    useCallback(s => ({
      mapData: s.mapData, selectedElementId: s.selectedElementId, multiSelectedNodeIds: s.multiSelectedNodeIds,
      setAiExtractedConcepts: s.setAiExtractedConcepts, setAiSuggestedRelations: s.setAiSuggestedRelations,
      removeExtractedConceptsFromSuggestions: s.removeExtractedConceptsFromSuggestions,
      removeSuggestedRelationsFromSuggestions: s.removeSuggestedRelationsFromSuggestions,
      resetAiSuggestions: s.resetAiSuggestions, addNode: s.addNode, updateNode: s.updateNode,
      addEdge: s.addEdge, setAiProcessingNodeId: s.setAiProcessingNodeId,
      setStagedMapData: s.setStagedMapData, setConceptExpansionPreview: s.setConceptExpansionPreview,
      conceptExpansionPreview: s.conceptExpansionPreview,
      applyLayout: s.applyLayout,
    }), [])
  );

  // States for various modals
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
  const [intermediateNodeSuggestion, setIntermediateNodeSuggestion] = useState<IntermediateNodeSuggestionContext | null>(null);

  // State for AI-suggested child texts
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<string[]>([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);

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
        if (graphInstance.hasNode(selectedNode.id)) {
            const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
            concepts.push(...neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
        }
    } else if (currentMapData.nodes.length > 0) {
        concepts = currentMapData.nodes.slice(0, Math.min(5, currentMapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, selectedElementId, multiSelectedNodeIds, toast]);

  const handleRelationsSuggested = useCallback((relations: SuggestRelationsOutput) => {
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
      if (graphInstance.hasNode(selectedNode.id)) {
          const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { depth: 1, direction: 'all' });
          context = neighborNodeIds.map(id => graphInstance.nodesMap.get(id)?.text).filter((text): text is string => !!text).slice(0, 5);
      }
    } else if (currentMapData.nodes.length > 0) {
      conceptDetailsToSet = { id: null, text: "General Map Topic", node: undefined };
    } else {
        conceptDetailsToSet = {id: null, text: "", node: undefined};
    }
    setConceptToExpandDetails(conceptDetailsToSet);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, selectedElementId, toast]);

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
    resetAiSuggestions();
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    if (isViewOnlyMode) return;
    const tempNodes: ConceptMapNode[] = output.nodes.map((aiNode, index) => ({
      id: `staged-node-${Date.now()}-${index}`,
      text: aiNode.text, type: aiNode.type || 'ai-generated', details: aiNode.details || '',
      x: (index % 5) * 170, y: Math.floor(index / 5) * 120,
      width: 150, height: 70, childIds: [],
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
    toast({ title: "AI Cluster Ready for Staging", description: `Proposed ${tempNodes.length} nodes and ${tempEdges.length} edges.` });
  }, [isViewOnlyMode, setStagedMapData, toast]);

  // --- Generate Snippet ---
  const openGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    if (isViewOnlyMode) return;
    const tempNodes: ConceptMapNode[] = output.nodes.map((aiNode, index) => ({
      id: `staged-node-${Date.now()}-${index}`,
      text: aiNode.text, type: aiNode.type || 'text-derived-concept', details: aiNode.details || '',
      x: (index % 5) * 170, y: Math.floor(index / 5) * 120,
      width: 150, height: 70, childIds: [],
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
      if (graphInstance.hasNode(sourceNode.id)) {
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
  }, [isViewOnlyMode, toast, mapData, setConceptExpansionPreview, setAiProcessingNodeId]);

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
  }, [isViewOnlyMode, toast, mapData, updateStoreNode, setAiProcessingNodeId]);

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

  // --- Pane/Node Suggestions for Floater ---
  const getPaneSuggestions = useCallback((position: {x: number, y: number}): SuggestionAction[] => {
    if (isViewOnlyMode) return [];
    return [
      { id: 'pane-add-topic', label: 'Add New Node Here', icon: PlusSquare, action: () => addStoreNode({ text: 'New Node', type: 'default', position }) },
      { id: 'pane-quick-cluster', label: 'Quick AI Cluster', icon: Sparkles, action: () => openQuickClusterModal() },
    ];
  }, [isViewOnlyMode, addStoreNode, openQuickClusterModal]);

  const memoizedGetNodeSuggestions = useCallback((sourceNode: RFNode<any> | ConceptMapNode): SuggestionAction[] => {
    return _generateNodeSuggestionsLogic(sourceNode, isViewOnlyMode, addStoreNode, getNodePlacement, toast);
  }, [isViewOnlyMode, addStoreNode, toast]);

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
  }, [conceptExpansionPreview, isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast, setConceptExpansionPreview]);

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
  }, [conceptExpansionPreview, isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast, setConceptExpansionPreview]);

  const clearExpansionPreview = useCallback(() => {
    setConceptExpansionPreview(null);
  }, [setConceptExpansionPreview]);

  // --- Refine Suggestion Modal Logic ---
  const openRefineSuggestionModal = useCallback((previewNodeId: string, parentNodeIdForPreview: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", variant: "default" });
      return;
    }
    const currentPreview = useConceptMapStore.getState().conceptExpansionPreview;
    if (currentPreview && currentPreview.parentNodeId === parentNodeIdForPreview) {
      const nodeToRefine = currentPreview.previewNodes.find(n => n.id === previewNodeId);
      if (nodeToRefine) {
        setRefineModalInitialData({
          nodeId: nodeToRefine.id,
          parentNodeId: parentNodeIdForPreview,
          text: nodeToRefine.text,
          details: nodeToRefine.details
        });
        setIsRefineModalOpen(true);
      } else {
        toast({ title: "Error", description: "Preview node to refine not found.", variant: "destructive" });
      }
    } else {
      toast({ title: "Error", description: "No active expansion preview for this context.", variant: "destructive" });
    }
  }, [isViewOnlyMode, toast]);

  const handleRefineSuggestionConfirm = useCallback(async (refinementInstruction: string) => {
    if (!refineModalInitialData) {
      toast({ title: "Error", description: "No data available for refinement.", variant: "destructive" });
      return;
    }
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", variant: "default" });
      return;
    }

    const { nodeId: previewNodeId, parentNodeId, text: originalText, details: originalDetails } = refineModalInitialData;

    setAiProcessingNodeId(parentNodeId);
    setIsRefineModalOpen(false);

    try {
      const input: RefineNodeSuggestionInput = {
        originalText,
        originalDetails,
        userInstruction: refinementInstruction,
      };
      const output: RefineNodeSuggestionOutput = await refineNodeSuggestionFlow(input);

      useConceptMapStore.getState().updatePreviewNode(parentNodeId, previewNodeId, {
        text: output.refinedText,
        details: output.refinedDetails,
      });

      toast({ title: "Suggestion Refined", description: "The AI suggestion has been updated." });
    } catch (error) {
      console.error("Error refining suggestion:", error);
      toast({ title: "Refinement Failed", description: (error as Error).message, variant: "destructive" });
    } finally {
      setAiProcessingNodeId(null);
      setRefineModalInitialData(null);
    }
  }, [refineModalInitialData, isViewOnlyMode, toast, setAiProcessingNodeId]);

  // --- Suggest Intermediate Node Logic ---
  const handleSuggestIntermediateNodeRequest = useCallback(async (edgeId: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "AI suggestions are disabled." });
      return;
    }
    const { nodes, edges } = useConceptMapStore.getState().mapData;
    const originalEdge = edges.find(e => e.id === edgeId);
    if (!originalEdge) {
      toast({ title: "Error", description: "Original edge not found.", variant: "destructive" });
      return;
    }
    const sourceNode = nodes.find(n => n.id === originalEdge.source);
    const targetNode = nodes.find(n => n.id === originalEdge.target);
    if (!sourceNode || !targetNode) {
      toast({ title: "Error", description: "Source or target node for the edge not found.", variant: "destructive" });
      return;
    }
    setAiProcessingNodeId(edgeId);
    toast({ title: "AI Thinking...", description: "Suggesting an intermediate node." });
    try {
      const flowInput: SuggestIntermediateNodeInput = {
        sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details,
        targetNodeText: targetNode.text, targetNodeDetails: targetNode.details,
        existingEdgeLabel: originalEdge.label
      };
      const suggestionOutput = await suggestIntermediateNodeFlow(flowInput);
      setIntermediateNodeSuggestion({
        ...suggestionOutput,
        originalEdgeId: edgeId, sourceNode, targetNode
      });
    } catch (error) {
      console.error("Error suggesting intermediate node:", error);
      toast({ title: "AI Suggestion Failed", description: (error as Error).message, variant: "destructive" });
      setIntermediateNodeSuggestion(null);
    } finally {
      setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, setAiProcessingNodeId]);

  const confirmAddIntermediateNode = useCallback(() => {
    if (!intermediateNodeSuggestion) {
      toast({ title: "Error", description: "No suggestion to confirm.", variant: "destructive" });
      return;
    }
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot modify map." });
      setIntermediateNodeSuggestion(null);
      return;
    }
    const {
      intermediateNodeText, intermediateNodeDetails,
      labelSourceToIntermediate, labelIntermediateToTarget,
      originalEdgeId, sourceNode, targetNode
    } = intermediateNodeSuggestion;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const newPosition = getNodePlacement(
      currentNodes, 'child', sourceNode, null,
      GRID_SIZE_FOR_AI_PLACEMENT, (sourceNode.childIds?.length || 0), (sourceNode.childIds?.length || 0) + 1
    );
    const newNodeId = addStoreNode({
      text: intermediateNodeText, details: intermediateNodeDetails || '',
      type: 'ai-intermediate', position: newPosition,
    });
    useConceptMapStore.getState().deleteEdge(originalEdgeId);
    addStoreEdge({ source: sourceNode.id, target: newNodeId, label: labelSourceToIntermediate });
    addStoreEdge({ source: newNodeId, target: targetNode.id, label: labelIntermediateToTarget });
    toast({ title: "Intermediate Node Added", description: `Node "${intermediateNodeText}" added and connections updated.` });
    setIntermediateNodeSuggestion(null);
  }, [intermediateNodeSuggestion, isViewOnlyMode, addStoreNode, addStoreEdge, toast, getNodePlacement]);

  const clearIntermediateNodeSuggestion = useCallback(() => {
    setIntermediateNodeSuggestion(null);
  }, []);

  // --- AI Tidy-Up Selection ---
  const handleAiTidyUpSelection = useCallback(async () => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "AI Tidy Up is disabled." });
      return;
    }

    const currentMapDataNodes = useConceptMapStore.getState().mapData.nodes;
    const currentMultiSelectedNodeIds = useConceptMapStore.getState().multiSelectedNodeIds;
    const storeApplyLayout = useConceptMapStore.getState().applyLayout;

    if (currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Selection Required", description: "Please select at least two nodes to tidy up." });
      return;
    }

    const selectedNodesData: NodeLayoutInfo[] = currentMultiSelectedNodeIds
      .map(id => {
        const node = currentMapDataNodes.find(n => n.id === id);
        if (node &&
            typeof node.x === 'number' &&
            typeof node.y === 'number' &&
            typeof node.width === 'number' &&
            typeof node.height === 'number'
           ) {
          return {
            id: node.id,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            text: node.text,
            type: node.type
          };
        }
        return null;
      })
      .filter((n): n is NodeLayoutInfo => n !== null);

    if (selectedNodesData.length < 2) {
      toast({
        title: "Not Enough Valid Node Data",
        description: "Could not retrieve enough valid data (including position and dimensions) for the selected nodes to perform tidy up.",
        variant: "destructive"
      });
      return;
    }

    setAiProcessingNodeId("ai-tidy-up");
    toast({ title: "AI Tidy-Up", description: "AI is tidying up the selected nodes...", duration: 3000 });

    try {
      const input: AiTidyUpSelectionInput = { nodes: selectedNodesData };
      const output: AiTidyUpSelectionOutput = await aiTidyUpSelectionFlow(input);

      if (output.newPositions && output.newPositions.length > 0) {
        storeApplyLayout(output.newPositions);

        if (output.suggestedParentNode && output.suggestedParentNode.text) {
          const { text: parentText, type: parentType } = output.suggestedParentNode;

          let sumX = 0;
          let sumY = 0;

          const childrenNewPositions = output.newPositions.filter(p =>
            selectedNodesData.some(sn => sn.id === p.id)
          );

          if (childrenNewPositions.length > 0) {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            childrenNewPositions.forEach(p => {
              const originalNode = selectedNodesData.find(sn => sn.id === p.id);
              const nodeWidth = originalNode?.width || 150;
              const nodeHeight = originalNode?.height || 70;

              sumX += p.x + nodeWidth / 2;
              sumY += p.y + nodeHeight / 2;
              minX = Math.min(minX, p.x);
              minY = Math.min(minY, p.y);
              maxX = Math.max(maxX, p.x + nodeWidth);
              maxY = Math.max(maxY, p.y + nodeHeight);
            });
            const avgCenterX = sumX / childrenNewPositions.length;
            const avgCenterY = sumY / childrenNewPositions.length;

            const parentNodePosition = {
              x: Math.round((avgCenterX - (150 / 2)) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
              y: Math.round((avgCenterY - (70 / 2)) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT
            };

            const newParentNodeId = useConceptMapStore.getState().addNode({
              text: parentText,
              type: parentType || 'ai-group',
              position: parentNodePosition,
            });

            childrenNewPositions.forEach(childPos => {
              useConceptMapStore.getState().updateNode(childPos.id, { parentNode: newParentNodeId });
            });

            toast({ title: "AI Tidy-Up & Grouping Successful", description: `Selected nodes rearranged and grouped under "${parentText}".` });
          } else {
             toast({ title: "AI Tidy-Up Successful", description: "Selected nodes have been rearranged. Grouping was suggested but could not be applied." });
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
      currentNodes,
      'child',
      parentNode,
      null,
      GRID_SIZE_FOR_AI_PLACEMENT,
      childIndex,
      1,
      effectiveDirection
    );

    const newNodeId = addStoreNode({
      text: suggestedText,
      type: 'manual-node',
      position: newPosition,
      parentNode: parentNodeId,
    });

    addStoreEdge({
      source: parentNodeId,
      target: newNodeId,
      label: "relates to",
    });

    setAiChildTextSuggestions([]);
    toast({ title: "Child Node Added", description: `"${suggestedText}" added ${effectiveDirection} of "${parentNode.text}".` });
  }, [isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast]);

  const fetchAIChildTextSuggestions = useCallback(async (node: RFNode<CustomNodeData> | null) => {
    if (!node || isViewOnlyMode) {
      setAiChildTextSuggestions([]);
      return;
    }
    setIsLoadingAiChildTexts(true);
    setAiChildTextSuggestions([]);
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
          id: 'loading-ai-child-texts',
          label: "Loading ideas...",
          action: () => {},
          icon: Loader2,
          disabled: true,
        });
      } else if (aiChildTextSuggestions.length > 0) {
        aiChildTextSuggestions.forEach((text, index) => {
          quickAddSuggestions.push({
            id: `ai-add-child-bottom-${currentNode.id}-${index}`,
            label: `Add: "${text}" (below)`,
            icon: PlusSquare,
            action: () => handleAddQuickChildNode(currentNode.id, text, 'bottom')
          });
          quickAddSuggestions.push({
            id: `ai-add-child-right-${currentNode.id}-${index}`,
            label: `Add: "${text}" (right)`,
            icon: PlusSquare,
            action: () => handleAddQuickChildNode(currentNode.id, text, 'right')
          });
        });
        quickAddSuggestions.push({
          id: 'clear-ai-child-suggestions',
          label: 'Clear these suggestions',
          action: () => setAiChildTextSuggestions([]),
        });

      } else {
        quickAddSuggestions.push({
          id: `quick-add-child-bottom-${currentNode.id}`,
          label: "Add Child Below",
          icon: PlusSquare,
          action: () => handleAddQuickChildNode(currentNode.id, "New Idea", 'bottom')
        });
        quickAddSuggestions.push({
          id: `quick-add-child-right-${currentNode.id}`,
          label: "Add Child Right",
          icon: PlusSquare,
          action: () => handleAddQuickChildNode(currentNode.id, "New Idea", 'right')
        });
      }
    }
    return [...baseAISuggestions, ...quickAddSuggestions];
  }, [
    isViewOnlyMode,
    openExpandConceptModal,
    openSuggestRelationsModal,
    openRewriteNodeContentModal,
    openAskQuestionModal,
    handleAddQuickChildNode,
    isLoadingAiChildTexts,
    aiChildTextSuggestions
  ]);

  const getPaneSuggestions = useCallback((position?: {x: number, y: number}): SuggestionAction[] => {
    const baseSuggestions: SuggestionAction[] = [
      { id: 'pane-quick-cluster', label: "Quick Cluster (AI)", icon: Brain, action: openQuickClusterModal },
    ];
     if (!isViewOnlyMode && position) {
      baseSuggestions.unshift({
        id: 'pane-add-topic',
        label: "Add New Topic Here",
        icon: PlusSquare,
        action: () => {
            const newNodeId = addStoreNode({ text: "New Topic", type: 'manual-node', position });
            useConceptMapStore.getState().setEditingNodeId(newNodeId);
        }
      });
    }
    return baseSuggestions;
  }, [isViewOnlyMode, openQuickClusterModal, addStoreNode]);


  return {
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen,
    conceptToExpandDetails,
    mapContextForExpansion,
    openExpandConceptModal,
    handleConceptExpanded, 
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered, 
    isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen, nodeContentToRewrite, openRewriteNodeContentModal, handleRewriteNodeContentConfirm, 
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    getPaneSuggestions,
    getNodeSuggestions: memoizedGetNodeSuggestions,
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
    isRefineModalOpen,
    setIsRefineModalOpen,
    refineModalInitialData,
    openRefineSuggestionModal,
    handleRefineSuggestionConfirm,
    intermediateNodeSuggestion,
    handleSuggestIntermediateNodeRequest,
    confirmAddIntermediateNode,
    clearIntermediateNodeSuggestion,
    handleAiTidyUpSelection,
  };
}

[end of src/hooks/useConceptMapAITools.ts]
