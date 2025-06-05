
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
  summarizeNodes as aiSummarizeNodes // Import the new flow
} from '@/ai/flows';
import type {
  AskQuestionAboutNodeOutput,
  ExpandConceptOutput,
  ExtractConceptsOutput,
  GenerateMapSnippetOutput,
  GenerateQuickClusterOutput,
  SuggestRelationsOutput,
  SummarizeNodesOutput // Import the new type
} from '@/ai/flows';

export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const {
    mapData,
    selectedElementId,
    multiSelectedNodeIds,
    setAiExtractedConcepts,
    setAiSuggestedRelations,
    setAiExpandedConcepts,
    removeExtractedConceptsFromSuggestions,
    removeSuggestedRelationsFromSuggestions,
    removeExpandedConceptsFromSuggestions,
    resetAiSuggestions,
    addNode: addStoreNode,
    addEdge: addStoreEdge,
  } = useConceptMapStore();

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [textForExtraction, setTextForExtraction] = useState("");

  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [conceptsForRelationSuggestion, setConceptsForRelationSuggestion] = useState<string[]>([]);

  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  const [conceptToExpand, setConceptToExpand] = useState("");
  const [mapContextForExpansion, setMapContextForExpansion] = useState<string[]>([]);

  const [isQuickClusterModalOpen, setIsQuickClusterModalOpen] = useState(false);
  const [isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen] = useState(false);

  const [isAskQuestionModalOpen, setIsAskQuestionModalOpen] = useState(false);
  const [nodeContextForQuestion, setNodeContextForQuestion] = useState<{ text: string; details?: string, id: string } | null>(null);

  const getNodePlacementPosition = useCallback((index: number, clusterSize: number = 1, clusterIndex: number = 0): { x: number; y: number } => {
    const currentStoreState = useConceptMapStore.getState();
    const { selectedElementId: currentSelectedId, mapData: currentMapData } = currentStoreState;
    let baseX = 50 + Math.random() * 50; 
    let baseY = 50 + Math.random() * 50;
    const offsetX = 200;
    const offsetY = 80;
    const clusterOffsetX = 15;
    const clusterOffsetY = 15;

    if (currentSelectedId && currentMapData.nodes.length > 0) {
      const selectedNode = currentMapData.nodes.find(n => n.id === currentSelectedId);
      if (selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
        baseX = selectedNode.x + offsetX;
        baseY = selectedNode.y + (index * offsetY);
      } else if (currentMapData.nodes.length > 0 && currentMapData.nodes[0] && typeof currentMapData.nodes[0].x === 'number' && typeof currentMapData.nodes[0].y === 'number' ) {
        // Fallback to first node if selected is somehow invalid or not found (should not happen often)
        baseX = currentMapData.nodes[0].x + offsetX;
        baseY = currentMapData.nodes[0].y + (index * offsetY);
      }
    } else if (currentMapData.nodes.length > 0 && currentMapData.nodes[0] && typeof currentMapData.nodes[0].x === 'number' && typeof currentMapData.nodes[0].y === 'number') {
        // Fallback if no node is selected
        baseX = currentMapData.nodes[0].x + offsetX;
        baseY = currentMapData.nodes[0].y + (index * offsetY);
    }

    baseX += clusterIndex * clusterOffsetX;
    baseY += clusterIndex * clusterOffsetY;
    const nodesPerRow = clusterSize > 1 ? Math.ceil(Math.sqrt(clusterSize)) : 3;
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
    // toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. View them in the AI Suggestions panel.` });
  }, [setAiExtractedConcepts]);

  const addExtractedConceptsToMap = useCallback((selectedConcepts: string[]) => {
    if (isViewOnlyMode || selectedConcepts.length === 0) return;
    let addedCount = 0;
    selectedConcepts.forEach((conceptText, index) => {
      addStoreNode({ text: conceptText, type: 'ai-concept', position: getNodePlacementPosition(index, selectedConcepts.length, 0) });
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
    // toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations.` });
  }, [setAiSuggestedRelations]);

  const addSuggestedRelationsToMap = useCallback((selectedRelations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode || selectedRelations.length === 0) return;
    let relationsAddedCount = 0; let conceptsAddedFromRelationsCount = 0;
    selectedRelations.forEach((rel, index) => {
      let currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes];
      let sourceNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.source.toLowerCase().trim());
      if (!sourceNode) {
        const newSourceNodeId = addStoreNode({ text: rel.source, type: 'ai-concept', position: getNodePlacementPosition(conceptsAddedFromRelationsCount, selectedRelations.length, index + conceptsAddedFromRelationsCount) });
        sourceNode = useConceptMapStore.getState().mapData.nodes.find(node => node.id === newSourceNodeId);
        if (sourceNode) conceptsAddedFromRelationsCount++; else return;
      }
      let targetNode = currentNodesSnapshot.find(node => node.text.toLowerCase().trim() === rel.target.toLowerCase().trim());
      if (!targetNode) {
        const newTargetNodeId = addStoreNode({ text: rel.target, type: 'ai-concept', position: getNodePlacementPosition(conceptsAddedFromRelationsCount, selectedRelations.length, index + conceptsAddedFromRelationsCount + 1) }); // Offset slightly more
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

  // --- Expand Concept ---
  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    let concept = ""; let context: string[] = [];
    const targetNodeId = nodeIdForContext || selectedElementId;
    const selectedNode = targetNodeId ? mapData.nodes.find(n => n.id === targetNodeId) : null;

    if (selectedNode) {
      concept = selectedNode.text;
      const neighborIds = new Set<string>();
      mapData.edges?.forEach(edge => {
        if (edge.source === selectedNode.id) neighborIds.add(edge.target);
        if (edge.target === selectedNode.id) neighborIds.add(edge.source);
      });
      context = Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 5);
    } else if (mapData.nodes.length > 0) {
      concept = mapData.nodes[0].text; 
    }
    setConceptToExpand(concept); setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, selectedElementId, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    setAiExpandedConcepts(newConcepts);
    // toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas.` });
  }, [setAiExpandedConcepts]);

  const addExpandedConceptsToMap = useCallback((selectedConcepts: string[]) => {
    if (isViewOnlyMode || selectedConcepts.length === 0) return;
    let addedCount = 0;
    selectedConcepts.forEach((conceptText, index) => {
      addStoreNode({ text: conceptText, type: 'ai-expanded', position: getNodePlacementPosition(index, selectedConcepts.length, addedCount + 2) }); // Offset more
      addedCount++;
    });
    if (addedCount > 0) {
      toast({ title: "Expanded Ideas Added", description: `${addedCount} new ideas added to the map.` });
      removeExpandedConceptsFromSuggestions(selectedConcepts);
    }
  }, [isViewOnlyMode, toast, addStoreNode, getNodePlacementPosition, removeExpandedConceptsFromSuggestions]);


  // --- Quick Cluster ---
  const openQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleClusterGenerated = useCallback((output: GenerateQuickClusterOutput) => {
    const newNodesMap = new Map<string, string>(); let addedNodesCount = 0;
    output.nodes.forEach((aiNode, index) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'ai-generated', details: aiNode.details || '', position: getNodePlacementPosition(index, output.nodes.length, addedNodesCount) });
      newNodesMap.set(aiNode.text, newNodeId); addedNodesCount++;
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Cluster Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, getNodePlacementPosition]);

  // --- Generate Snippet ---
  const openGenerateSnippetModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    const newNodesMap = new Map<string, string>(); let addedNodesCount = 0;
    output.nodes.forEach((aiNode, index) => {
      const newNodeId = addStoreNode({ text: aiNode.text, type: aiNode.type || 'text-derived-concept', details: aiNode.details || '', position: getNodePlacementPosition(index, output.nodes.length, addedNodesCount + 5) });
      newNodesMap.set(aiNode.text, newNodeId); addedNodesCount++;
    });
    output.edges?.forEach(aiEdge => {
      const sourceId = newNodesMap.get(aiEdge.sourceText); const targetId = newNodesMap.get(aiEdge.targetText);
      if (sourceId && targetId) addStoreEdge({ source: sourceId, target: targetId, label: aiEdge.relationLabel });
    });
    toast({ title: "AI Snippet Added", description: `Added ${output.nodes.length} nodes and ${output.edges?.length || 0} edges.` });
  }, [addStoreNode, addStoreEdge, toast, getNodePlacementPosition]);

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
            : getNodePlacementPosition(0);


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
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpand, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded, addExpandedConceptsToMap,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered,
    handleSummarizeSelectedNodes, // Export new handler
  };
}
