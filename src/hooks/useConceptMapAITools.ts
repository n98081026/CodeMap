
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
  generateMapSnippetFromText as aiGenerateMapSnippetFromText
} from '@/ai/flows'; // Assuming barrel export from flows
import type { 
  AskQuestionAboutNodeInput, AskQuestionAboutNodeOutput,
  ExpandConceptInput, ExpandConceptOutput,
  ExtractConceptsInput, ExtractConceptsOutput,
  GenerateMapSnippetInput, GenerateMapSnippetOutput,
  GenerateQuickClusterInput, GenerateQuickClusterOutput,
  SuggestRelationsInput, SuggestRelationsOutput
} from '@/ai/flows'; // Assuming barrel export for types

export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const {
    mapData,
    selectedElementId,
    multiSelectedNodeIds,
    setAiExtractedConcepts,
    setAiSuggestedRelations,
    setAiExpandedConcepts,
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
    let baseX = 50;
    let baseY = 50;
    const offsetX = 180; 
    const offsetY = 70;  
    const clusterOffsetX = 10; 
    const clusterOffsetY = 10;

    if (currentSelectedId) {
      const selectedNode = currentMapData.nodes.find(n => n.id === currentSelectedId);
      if (selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
        baseX = selectedNode.x + offsetX; 
        baseY = selectedNode.y + (index * offsetY);
        baseX += clusterIndex * clusterOffsetX;
        baseY += clusterIndex * clusterOffsetY;
        return { x: baseX, y: baseY };
      }
    }
    const nodesPerRow = clusterSize > 1 ? Math.ceil(Math.sqrt(clusterSize)) : 3;
    const rowIndex = Math.floor(index / nodesPerRow);
    const colIndex = index % nodesPerRow;
    
    return { 
      x: baseX + colIndex * offsetX + (clusterIndex * clusterOffsetX), 
      y: baseY + rowIndex * offsetY + (clusterIndex * clusterOffsetY)
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
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. View them in the AI Suggestions panel.` });
  }, [setAiExtractedConcepts, toast]);


  // --- Suggest Relations ---
  const openSuggestRelationsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    let concepts: string[] = [];
    if (nodeIdForContext) {
        const cNode = mapData.nodes.find(n => n.id === nodeIdForContext);
        if (cNode) {
            concepts.push(cNode.text);
            const neighborIds = new Set<string>();
            mapData.edges?.forEach(edge => {
                if (edge.source === cNode.id) neighborIds.add(edge.target);
                if (edge.target === cNode.id) neighborIds.add(edge.source);
            });
            concepts.push(...Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 4));
        }
    } else if (multiSelectedNodeIds.length >= 2) {
        concepts = multiSelectedNodeIds.map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text);
    } else if (multiSelectedNodeIds.length === 1) {
        const node = mapData.nodes.find(n => n.id === multiSelectedNodeIds[0]);
        if (node) { /* Similar logic to nodeIdForContext */ }
    } else if (mapData.nodes.length > 0) {
        concepts = mapData.nodes.slice(0, Math.min(5, mapData.nodes.length)).map(n => n.text);
    }
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example A", "Example B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, multiSelectedNodeIds, toast]);

  const handleRelationsSuggested = useCallback((relations: SuggestRelationsOutput) => {
    setAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations.` });
  }, [setAiSuggestedRelations, toast]);

  // --- Expand Concept ---
  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    resetAiSuggestions();
    let concept = ""; let context: string[] = [];
    const targetNodeId = nodeIdForContext || selectedElementId;
    if (targetNodeId) {
      const selectedNode = mapData.nodes.find(n => n.id === targetNodeId);
      if (selectedNode) { /* Logic to set concept and context */ }
    } else if (mapData.nodes.length > 0) { /* Fallback logic */ }
    setConceptToExpand(concept); setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, selectedElementId, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    setAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas.` });
  }, [setAiExpandedConcepts, toast]);

  // --- Quick Cluster ---
  const openQuickClusterModal = useCallback(() => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default" }); return; }
    setIsQuickClusterModalOpen(true);
  }, [isViewOnlyMode, toast]);

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
    setIsGenerateSnippetModalOpen(true);
  }, [isViewOnlyMode, toast]);

  const handleSnippetGenerated = useCallback((output: GenerateMapSnippetOutput) => {
    // Similar to handleClusterGenerated
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
    toast({ title: "AI Answer Received", description: answer.length > 150 ? `${answer.substring(0, 147)}...` : answer, duration: 7000 });
    console.log("AI Answer for node", nodeContextForQuestion?.id, ":\n", answer);
    setNodeContextForQuestion(null);
  }, [toast, nodeContextForQuestion]);

  return {
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpand, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered,
  };
}

    