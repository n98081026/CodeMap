
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
  ExtractConceptsOutput,
  GenerateMapSnippetOutput,
  GenerateQuickClusterOutput,
  SuggestRelationsOutput,
  SummarizeNodesOutput,
  RewriteNodeContentOutput
} from '@/ai/flows';
import type { ConceptMapNode } from '@/types';


// Define a more specific type for the concept to expand, including its ID
interface ConceptToExpandDetails {
  id: string | null; // ID of the source node, null if not expanding from a specific node
  text: string;
}

export interface NodeContentToRewrite {
    id: string;
    text: string;
    details?: string;
}

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


  const getNodePlacementPosition = useCallback((
    index: number, 
    totalNewNodes: number = 1, 
    sourceNodePos?: { x: number, y: number } | null,
    radius: number = 150, 
    startAngle: number = -90 
  ): { x: number; y: number } => {
    
    if (sourceNodePos && totalNewNodes > 0) {
      if (totalNewNodes === 1) {
        return { x: sourceNodePos.x + radius, y: sourceNodePos.y };
      }
      const angleStep = 360 / totalNewNodes;
      const angle = startAngle + index * angleStep;
      const radians = (angle * Math.PI) / 180;
      return {
        x: sourceNodePos.x + radius * Math.cos(radians) + (Math.random() * 20 - 10), 
        y: sourceNodePos.y + radius * Math.sin(radians) + (Math.random() * 20 - 10),
      };
    }

    const currentStoreState = useConceptMapStore.getState();
    const { selectedElementId: currentSelectedId, mapData: currentMapData } = currentStoreState;
    let baseX = 50 + Math.random() * 50; 
    let baseY = 50 + Math.random() * 50;
    const offsetX = 200; 
    const offsetY = 80;  
    
    if (currentSelectedId && currentMapData.nodes.length > 0) {
      const selectedNode = currentMapData.nodes.find(n => n.id === currentSelectedId);
      if (selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
        baseX = selectedNode.x + offsetX;
        baseY = selectedNode.y + (index * offsetY);
      }
    } else if (currentMapData.nodes.length > 0) {
        const lastNode = currentMapData.nodes[currentMapData.nodes.length - 1];
        if (lastNode && typeof lastNode.x === 'number' && typeof lastNode.y === 'number') {
             baseX = lastNode.x + offsetX /2;
             baseY = lastNode.y + offsetY /2 + (index * (offsetY/2));
        }
    }
    
    const nodesPerRow = totalNewNodes > 1 ? Math.ceil(Math.sqrt(totalNewNodes)) : 3;
    const rowIndex = Math.floor(index / nodesPerRow);
    const colIndex = index % nodesPerRow;

    return {
      x: baseX + colIndex * offsetX,
      y: baseY + rowIndex * offsetY
    };
  }, []);


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
    selectedConcepts.forEach((conceptText, index) => {
      addStoreNode({ text: conceptText, type: 'ai-concept', position: getNodePlacementPosition(index, selectedConcepts.length) });
      addedCount++;
    });
    if (addedCount > 0) {
      toast({ title: "Concepts Added", description: `${addedCount} new concepts added to the map.` });
      removeExtractedConceptsFromSuggestions(selectedConcepts);
    }
  }, [isViewOnlyMode, toast, addStoreNode, getNodePlacementPosition, removeExtractedConceptsFromSuggestions]);


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
    selectedRelations.forEach((rel, index) => {
      const currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes];
      let sourceNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.source.toLowerCase().trim());
      if (!sourceNode) {
        const newSourceNodeId = addStoreNode({ text: rel.source, type: 'ai-concept', position: getNodePlacementPosition(conceptsAddedFromRelationsCount, selectedRelations.length) });
        sourceNode = useConceptMapStore.getState().mapData.nodes.find(node => node.id === newSourceNodeId);
        if (sourceNode) conceptsAddedFromRelationsCount++; else return;
      }
      let targetNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.target.toLowerCase().trim());
      if (!targetNode) {
        const newTargetNodeId = addStoreNode({ text: rel.target, type: 'ai-concept', position: getNodePlacementPosition(conceptsAddedFromRelationsCount + 1, selectedRelations.length) }); 
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
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, getNodePlacementPosition, removeSuggestedRelationsFromSuggestions]);

  // --- Expand Concept (Direct Addition) ---
  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    
    let conceptDetails: ConceptToExpandDetails | null = null;
    let context: string[] = [];
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? mapData.nodes.find(n => n.id === targetNodeId) : null;

    if (selectedNode) {
      conceptDetails = { id: selectedNode.id, text: selectedNode.text };
      const neighborIds = new Set<string>();
      mapData.edges?.forEach(edge => {
        if (edge.source === selectedNode.id) neighborIds.add(edge.target);
        if (edge.target === selectedNode.id) neighborIds.add(edge.source);
      });
      context = Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 5);
    } else if (mapData.nodes.length > 0) {
      conceptDetails = { id: null, text: "General Map Topic" }; 
    } else {
        conceptDetails = {id: null, text: ""}; 
    }
    setConceptToExpandDetails(conceptDetails); 
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, mapData, selectedElementId, toast]);

  const handleConceptExpanded = useCallback((output: ExpandConceptOutput) => {
    if (isViewOnlyMode || !conceptToExpandDetails) return;

    const sourceNodeId = conceptToExpandDetails.id;
    let sourceNodePos: { x: number; y: number } | null = null;

    if (sourceNodeId) {
        const node = mapData.nodes.find(n => n.id === sourceNodeId);
        if (node && typeof node.x === 'number' && typeof node.y === 'number') {
            sourceNodePos = { x: node.x, y: node.y };
        }
    }

    let addedNodesCount = 0;
    output.expandedIdeas.forEach((idea, index) => {
      const newNodeId = addStoreNode({
        text: idea.text,
        type: 'ai-expanded',
        position: getNodePlacementPosition(index, output.expandedIdeas.length, sourceNodePos),
      });
      addedNodesCount++;
      if (sourceNodeId && newNodeId) {
        addStoreEdge({
          source: sourceNodeId,
          target: newNodeId,
          label: idea.relationLabel || 'related to',
        });
      }
    });

    if (addedNodesCount > 0) {
      toast({ title: "Concept Expanded", description: `${addedNodesCount} new ideas directly added to the map.` });
    }
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, getNodePlacementPosition, conceptToExpandDetails, mapData.nodes]);


  // --- Quick Cluster ---
  const openQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    const newNodesMap = new Map<string, string>(); let addedNodesCount = 0;
    const sourceNode = selectedElementId ? mapData.nodes.find(n => n.id === selectedElementId) : null;
    const sourcePos = sourceNode && typeof sourceNode.x === 'number' && typeof sourceNode.y === 'number' ? { x: sourceNode.x, y: sourceNode.y } : null;

    output.nodes.forEach((aiNode, index) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'ai-generated', details: aiNode.details || '', position: getNodePlacementPosition(index, output.nodes.length, sourcePos) });
      newNodesMap.set(aiNode.text, newNodeId); addedNodesCount++;
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Cluster Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, getNodePlacementPosition, selectedElementId, mapData.nodes]);

  // --- Generate Snippet ---
  const openGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    const newNodesMap = new Map<string, string>(); let addedNodesCount = 0;
    const sourceNode = selectedElementId ? mapData.nodes.find(n => n.id === selectedElementId) : null;
    const sourcePos = sourceNode && typeof sourceNode.x === 'number' && typeof sourceNode.y === 'number' ? { x: sourceNode.x, y: sourceNode.y } : null;

    output.nodes.forEach((aiNode, index) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'text-derived-concept', details: aiNode.details || '', position: getNodePlacementPosition(index, output.nodes.length, sourcePos, 200) });
      newNodesMap.set(aiNode.text, newNodeId); addedNodesCount++;
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Snippet Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, getNodePlacementPosition, selectedElementId, mapData.nodes]);

  // --- Ask Question ---
  const openAskQuestionModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) { setNodeContextForQuestion({ text: node.text, details: node.details, id: node.id }); setIsAskQuestionModalOpen(true); }
    else { toast({ title: "Error", description: "Node not found.", variant: "destructive" }); }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleQuestionAnswered = useCallback((answer: string) => {
    toast({ title: "AI Answer Received", description: answer.length > 150 ? `${answer.substring(0, 147)}...` : answer, duration: 10000 });
  }, [toast]);
  
  // --- Rewrite Node Content ---
  const openRewriteNodeContentModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) { setNodeContentToRewrite({ id: node.id, text: node.text, details: node.details }); setIsRewriteNodeContentModalOpen(true); }
    else { toast({ title: "Error", description: "Node not found for rewrite.", variant: "destructive" }); }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleRewriteNodeContentConfirm = useCallback(async (nodeId: string, newText: string, newDetails?: string, tone?: string) => {
    if (isViewOnlyMode) return;
    updateStoreNode(nodeId, { text: newText, details: newDetails, type: 'ai-rewritten-node' });
    toast({ title: "Node Content Rewritten", description: `Node updated by AI (Tone: ${tone || 'Default'}).` });
  }, [isViewOnlyMode, updateStoreNode, toast]);

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
    
    try {
        toast({ title: "AI Summarization", description: "Processing selected nodes...", duration: 3000});
        const result: SummarizeNodesOutput = await aiSummarizeNodes({ nodeContents });
        
        let avgX = 0; let avgY = 0; let count = 0;
        multiSelectedNodeIds.forEach(id => {
            const node = mapData.nodes.find(n => n.id === id);
            if (node && typeof node.x === 'number' && typeof node.y === 'number') {
                avgX += node.x;
                avgY += node.y;
                count++;
            }
        });
        const position = count > 0 
            ? { x: avgX / count + 100, y: avgY / count + 50 } 
            : getNodePlacementPosition(0, 1);


        addStoreNode({
            text: `Summary of ${multiSelectedNodeIds.length} nodes`,
            type: 'ai-summary-node',
            details: result.summary,
            position: position
        });
        toast({ title: "AI Summary Created", description: "A new node with the summary has been added to the map.", duration: 7000 });
    } catch (error) {
        toast({ title: "Error Summarizing Nodes", description: (error as Error).message, variant: "destructive" });
    }

  }, [isViewOnlyMode, multiSelectedNodeIds, mapData.nodes, toast, addStoreNode, getNodePlacementPosition]);


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
    deleteEdge: addStoreEdge, 
    addStoreNode, 
  };
}

