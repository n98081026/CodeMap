
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
  rewriteNodeContent as aiRewriteNodeContent
} from '@/ai/flows';
import type {
  AskQuestionAboutNodeOutput,
  ExpandConceptOutput,
  GenerateMapSnippetOutput,
  GenerateQuickClusterOutput,
  SuggestRelationsOutput,
  SummarizeNodesOutput,
  RewriteNodeContentOutput,
} from '@/ai/flows';
import type { ConceptMapNode } from '@/types';
import { getNodePlacement } from '@/lib/layout-utils';

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
    addEdge: addStoreEdge,
    setAiProcessingNodeId, 
  } = useConceptMapStore();

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
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? mapData.nodes.find(n => n.id === targetNodeId) : null;

    if (multiSelectedNodeIds.length >= 2) {
        concepts = multiSelectedNodeIds.map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text);
    } else if (selectedNode) {
        concepts.push(selectedNode.text);
        const neighborIds = new Set<string>();
        mapData.edges?.forEach(edge => {
            if (edge.source === selectedNode.id) neighborIds.add(edge.target);
            if (edge.target === selectedNode.id) neighborIds.add(edge.source);
        });
        concepts.push(...Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
    } else if (mapData.nodes.length > 0) {
        concepts = mapData.nodes.slice(0, Math.min(5, mapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example Concept A", "Example Concept B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, selectedElementId, multiSelectedNodeIds, toast]);

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
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? mapData.nodes.find(n => n.id === targetNodeId) : null;

    if (selectedNode) {
      conceptDetailsToSet = { id: selectedNode.id, text: selectedNode.text, node: selectedNode };
      const neighborIds = new Set<string>();
      mapData.edges?.forEach(edge => {
        if (edge.source === selectedNode.id) neighborIds.add(edge.target);
        if (edge.target === selectedNode.id) neighborIds.add(edge.source);
      });
      context = Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 5);
    } else if (mapData.nodes.length > 0) {
      conceptDetailsToSet = { id: null, text: "General Map Topic", node: undefined };
    } else {
        conceptDetailsToSet = {id: null, text: "", node: undefined};
    }
    setConceptToExpandDetails(conceptDetailsToSet);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, mapData, selectedElementId, toast]);

  const handleConceptExpanded = useCallback(async (output: ExpandConceptOutput) => {
    if (isViewOnlyMode || !conceptToExpandDetails) return;
    
    const sourceNodeIdForAI = conceptToExpandDetails.id;
    if (sourceNodeIdForAI) setAiProcessingNodeId(sourceNodeIdForAI);

    try {
        const sourceNode = conceptToExpandDetails.node;
        let addedNodesCount = 0;
        const currentNodes = useConceptMapStore.getState().mapData.nodes;

        output.expandedIdeas.forEach((idea) => {
        const newNodeId = addStoreNode({
            text: idea.text,
            type: 'ai-expanded',
            position: getNodePlacement(currentNodes, 'child', sourceNode, null, GRID_SIZE_FOR_AI_PLACEMENT),
            parentNode: sourceNodeIdForAI || undefined,
        });
        addedNodesCount++;
        if (sourceNodeIdForAI && newNodeId) {
            addStoreEdge({
            source: sourceNodeIdForAI,
            target: newNodeId,
            label: idea.relationLabel || 'related to',
            });
        }
        });

        if (addedNodesCount > 0) {
        toast({ title: "Concept Expanded", description: `${addedNodesCount} new ideas directly added to the map.` });
        }
    } catch (error) {
        toast({ title: "Error Applying Expansion", description: (error as Error).message, variant: "destructive" });
    } finally {
        if (sourceNodeIdForAI) setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, conceptToExpandDetails, setAiProcessingNodeId]);

  // --- Quick Cluster ---
  const openQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    const newNodesMap = new Map<string, string>();
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const selectedNodeForPlacement = selectedElementId ? currentNodes.find(n => n.id === selectedElementId) : null;

    output.nodes.forEach((aiNode) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'ai-generated', details: aiNode.details || '', position: getNodePlacement(currentNodes, 'generic', null, selectedNodeForPlacement, GRID_SIZE_FOR_AI_PLACEMENT) });
      newNodesMap.set(aiNode.text, newNodeId);
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Cluster Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, selectedElementId]);

  // --- Generate Snippet ---
  const openGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    const newNodesMap = new Map<string, string>();
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const selectedNodeForPlacement = selectedElementId ? currentNodes.find(n => n.id === selectedElementId) : null;

    output.nodes.forEach((aiNode) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'text-derived-concept', details: aiNode.details || '', position: getNodePlacement(currentNodes, 'generic', null, selectedNodeForPlacement, GRID_SIZE_FOR_AI_PLACEMENT) });
      newNodesMap.set(aiNode.text, newNodeId);
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Snippet Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, selectedElementId]);

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
            nodeText: nodeCtx.text,
            nodeDetails: nodeCtx.details,
            question: question,
        });
        toast({ title: "AI Answer Received", description: result.answer.length > 150 ? `${result.answer.substring(0, 147)}...` : result.answer, duration: 10000 });
    } catch (error) {
        toast({ title: "Error Getting Answer", description: (error as Error).message, variant: "destructive" });
    } finally {
        setAiProcessingNodeId(null);
    }
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
    } catch (error) {
      toast({ title: "Error Applying Rewrite", description: (error as Error).message, variant: "destructive" });
    } finally {
      setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, updateStoreNode, toast, setAiProcessingNodeId]);

  // --- Summarize Selected Nodes ---
  const handleSummarizeSelectedNodes = useCallback(async () => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    if (multiSelectedNodeIds.length < 2) {
        toast({ title: "Selection Required", description: "Please select at least two nodes to summarize.", variant: "default"});
        return;
    }
    const nodeContents = multiSelectedNodeIds.map(id => {
        const node = mapData.nodes.find(n => n.id === id);
        return node ? (node.details ? `${node.text}: ${node.details}` : node.text) : '';
    }).filter(Boolean);

    if (nodeContents.length === 0) {
        toast({ title: "No Content", description: "Selected nodes have no text content to summarize.", variant: "default"});
        return;
    }
    
    setAiProcessingNodeId('summarizing_selection'); 
    try {
        toast({ title: "AI Summarization", description: "Processing selected nodes...", duration: 3000});
        const result: SummarizeNodesOutput = await aiSummarizeNodes({ nodeContents });
        
        const currentNodes = useConceptMapStore.getState().mapData.nodes;
        let avgX = 0; let avgY = 0; let count = 0;
        multiSelectedNodeIds.forEach(id => {
            const node = currentNodes.find(n => n.id === id);
            if (node && typeof node.x === 'number' && typeof node.y === 'number') {
                avgX += node.x; avgY += node.y; count++;
            }
        });
        const position = count > 0
            ? { x: Math.round((avgX / count + 100)/GRID_SIZE_FOR_AI_PLACEMENT)*GRID_SIZE_FOR_AI_PLACEMENT, y: Math.round((avgY / count + 50)/GRID_SIZE_FOR_AI_PLACEMENT)*GRID_SIZE_FOR_AI_PLACEMENT }
            : getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT);

        addStoreNode({
            text: `Summary of ${multiSelectedNodeIds.length} nodes`,
            type: 'ai-summary-node',
            details: result.summary,
            position: position
        });
        toast({ title: "AI Summary Created", description: "A new node with the summary has been added to the map.", duration: 7000 });
    } catch (error) {
        toast({ title: "Error Summarizing Nodes", description: (error as Error).message, variant: "destructive" });
    } finally {
        setAiProcessingNodeId(null);
    }

  }, [isViewOnlyMode, multiSelectedNodeIds, mapData.nodes, toast, addStoreNode, setAiProcessingNodeId]);


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
    addStoreNode, 
    addStoreEdge,
  };
}


