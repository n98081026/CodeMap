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
  suggestEdgeLabelFlow, // Added import
  type SuggestEdgeLabelInput, // Added import
  type SuggestEdgeLabelOutput // Added import
} from '@/ai/flows';
// Import directly from the flow file, using alias and ensuring .ts extension
import { 
    rewriteNodeContent as aiRewriteNodeContent,
    type RewriteNodeContentOutput 
} from '@/ai/flows/rewrite-node-content-logic.ts';
// Import store types for preview
import type { ConceptMapNode, ConceptMapEdge, RFNode } from '@/types'; // Added ConceptMapEdge
import type { ConceptExpansionPreviewNode, ConceptExpansionPreviewState } from '@/stores/concept-map-store';

import type {
  AskQuestionAboutNodeOutput,
  ExpandConceptOutput,
  GenerateMapSnippetOutput,
  GenerateQuickClusterOutput,
  SuggestRelationsOutput,
  SummarizeNodesOutput
} from '@/ai/flows'; 
// ConceptMapNode and RFNode are already imported above, ensure ConceptMapEdge is too.
import { getNodePlacement } from '@/lib/layout-utils';
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater'; // Import SuggestionAction
import { Lightbulb, Sparkles, Brain, HelpCircle, PlusSquare, MessageSquareQuote } from 'lucide-react'; // Import necessary icons

// --- Mock Graph Adapter ---
/**
 * Represents a simplified graph structure primarily for internal use within the MockGraphAdapter.
 * It holds a map of nodes for quick lookup and an array of edges.
 */
interface SimpleGraphInstance {
  nodesMap: Map<string, ConceptMapNode>;
  edges: ConceptMapEdge[];
}

/**
 * MockGraphAdapter for useConceptMapAITools.
 * This class provides a lightweight, standalone graph utility implementation,
 * primarily for gathering contextual information (like node neighbors) to be
 * passed to AI services. It avoids a direct dependency on heavier graph libraries
 * for these specific AI-related tasks within the hook.
 */
class MockGraphAdapter {
  fromArrays(nodes: ConceptMapNode[], edges: ConceptMapEdge[]): SimpleGraphInstance {
    const nodesMap = new Map<string, ConceptMapNode>();
    nodes.forEach(node => nodesMap.set(node.id, node));
    return { nodesMap, edges };
  }

  getNeighborhood(graphInstance: SimpleGraphInstance, nodeId: string, options?: { direction?: 'in' | 'out' | 'both' }): string[] {
    const neighbors = new Set<string>();
    const direction = options?.direction || 'both';

    graphInstance.edges.forEach(edge => {
      if (direction === 'out' || direction === 'both') {
        if (edge.source === nodeId) {
          neighbors.add(edge.target);
        }
      }
      if (direction === 'in' || direction === 'both') {
        if (edge.target === nodeId) {
          neighbors.add(edge.source);
        }
      }
    });
    return Array.from(neighbors);
  }
}
const graphAdapter = new MockGraphAdapter();

// --- Mock Dagre Layout ---
interface DagreNodeInput { id: string; width?: number; height?: number; }
interface DagreEdgeInput { source: string; target: string; }
interface LayoutNodeUpdate { id: string; x: number; y: number; }

/**
 * Provides a simple, deterministic layout for newly AI-generated nodes
 * before they are added to the staging area.
 * This function takes a list of nodes (and potentially edges, though unused in this mock)
 * and arranges them in a basic grid. This improves the initial presentation of
 * AI-generated content, making it more organized than random positioning.
 *
 * @param nodes - An array of nodes to be laid out, conforming to `DagreNodeInput`.
 * @param _edges - An array of edges (currently unused in this mock implementation but part of a typical layout signature).
 * @returns An array of `LayoutNodeUpdate` objects, each containing a node ID and its calculated x, y coordinates.
 */
const mockDagreLayoutForHook = (nodes: DagreNodeInput[], _edges: DagreEdgeInput[]): LayoutNodeUpdate[] => {
  return nodes.map((node, index) => ({
    id: node.id,
    x: (index % 4) * 200, // Simple grid
    y: Math.floor(index / 4) * 150,
  }));
};

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
    setStagedMapData,
    setConceptExpansionPreview, // Added for concept expansion preview
    conceptExpansionPreview,    // Added for concept expansion preview
  } = useConceptMapStore(
    useCallback(s => ({
      mapData: s.mapData,
      selectedElementId: s.selectedElementId,
      multiSelectedNodeIds: s.multiSelectedNodeIds,
      setAiExtractedConcepts: s.setAiExtractedConcepts,
      setAiSuggestedRelations: s.setAiSuggestedRelations,
      removeExtractedConceptsFromSuggestions: s.removeExtractedConceptsFromSuggestions,
      removeSuggestedRelationsFromSuggestions: s.removeSuggestedRelationsFromSuggestions,
      resetAiSuggestions: s.resetAiSuggestions,
      addNode: s.addNode,
      updateNode: s.updateNode,
      addEdge: s.addEdge,
      setAiProcessingNodeId: s.setAiProcessingNodeId,
      setStagedMapData: s.setStagedMapData,
      setConceptExpansionPreview: s.setConceptExpansionPreview,
      conceptExpansionPreview: s.conceptExpansionPreview,
    }), [])
  );

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
        const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
        // Use graph adapter to fetch neighbors of the selected node to provide context for AI relation suggestion.
        const neighborIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { direction: 'both' });
        concepts.push(...neighborIds.map(id => graphInstance.nodesMap.get(id)?.text).filter((text): text is string => !!text).slice(0, 4));
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
      const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
      // Use graph adapter to fetch neighbors of the selected node to provide context for AI concept expansion.
      const neighborIds = graphAdapter.getNeighborhood(graphInstance, selectedNode.id, { direction: 'both' });
      context = neighborIds.map(id => graphInstance.nodesMap.get(id)?.text).filter((text): text is string => !!text).slice(0, 5);
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
    if (isViewOnlyMode || !conceptToExpandDetails || !conceptToExpandDetails.id) {
        toast({ title: "Error", description: "Cannot expand concept without a source node ID.", variant: "destructive" });
        return;
    }
    
    const parentNodeId = conceptToExpandDetails.id;
    setAiProcessingNodeId(parentNodeId);

    try {
        if (output.expandedIdeas && output.expandedIdeas.length > 0) {
            const mappedPreviewNodes: ConceptExpansionPreviewNode[] = output.expandedIdeas.map((idea, index) => ({
                id: `preview-exp-${parentNodeId}-${Date.now()}-${index}`, // Temporary unique ID
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
      id: `staged-node-${Date.now()}-${index}`, // Temporary ID
      text: aiNode.text,
      type: aiNode.type || 'ai-generated',
      details: aiNode.details || '',
      // x, y will be set by layout
      width: 150, // Default width
      height: 70,  // Default height
      childIds: [], // Initialize childIds
    }));

    const tempEdgesInput: DagreEdgeInput[] = (output.edges || []).map(aiEdge => ({
        // For layout, we need to map original text to temporary IDs if AI provides text based edges
        // This part assumes AI output `aiEdge.sourceText` and `aiEdge.targetText` can be mapped to tempNode IDs
        // For simplicity, we'll assume the AI output nodes (tempNodes) are what we need to layout,
        // and the edges connect these tempNodes using their newly generated IDs.
        // If AI edge output is based on text, a mapping from text to temp ID is needed here.
        // Let's assume for now aiEdge gives source/target that match tempNode texts or can be mapped.
        // A robust solution would involve the AI giving temporary IDs or the backend resolving them.
        // For mockDagreLayout, we just need source/target IDs that exist in dagreNodesInput.
        // We'll create a temporary map from original text (if unique) to temp ID for edges.
      source: tempNodes.find(n => n.text === aiEdge.sourceText)?.id || `unknown-source-${aiEdge.sourceText}`,
      target: tempNodes.find(n => n.text === aiEdge.targetText)?.id || `unknown-target-${aiEdge.targetText}`,
    })).filter(e => !e.source.startsWith('unknown-') && !e.target.startsWith('unknown-'));

    const dagreNodesInput: DagreNodeInput[] = tempNodes.map(n => ({ id: n.id, width: n.width, height: n.height }));
    // Arrange the AI-generated nodes and edges into an initial layout before staging.
    const newPositions = mockDagreLayoutForHook(dagreNodesInput, tempEdgesInput);
    const positionsMap = new Map(newPositions.map(p => [p.id, { x: p.x, y: p.y }]));

    const positionedTempNodes = tempNodes.map(n => {
      const pos = positionsMap.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });

    // Create final edges using the (now consistent) temporary IDs from positionedTempNodes
    const finalTempEdges = (output.edges || []).map((aiEdge, index) => ({
      id: `staged-edge-${Date.now()}-${index}`,
      source: positionedTempNodes.find(n => n.text === aiEdge.sourceText)?.id || `error-source-${index}`,
      target: positionedTempNodes.find(n => n.text === aiEdge.targetText)?.id || `error-target-${index}`,
      label: aiEdge.relationLabel,
    })).filter(e => !e.source.startsWith('error-') && !e.target.startsWith('error-'));


    setStagedMapData({ nodes: positionedTempNodes, edges: finalTempEdges });
    toast({ title: "AI Cluster Ready for Staging", description: `Proposed ${positionedTempNodes.length} nodes and ${finalTempEdges.length} edges. View in staging area.` });
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
      id: `staged-node-${Date.now()}-${index}`, // Temporary ID
      text: aiNode.text,
      type: aiNode.type || 'text-derived-concept',
      details: aiNode.details || '',
      // x, y will be set by layout
      width: 150,
      height: 70,
      childIds: [],
    }));

    const tempEdgesInput: DagreEdgeInput[] = (output.edges || []).map(aiEdge => ({
      source: tempNodes.find(n => n.text === aiEdge.sourceText)?.id || `unknown-source-${aiEdge.sourceText}`,
      target: tempNodes.find(n => n.text === aiEdge.targetText)?.id || `unknown-target-${aiEdge.targetText}`,
    })).filter(e => !e.source.startsWith('unknown-') && !e.target.startsWith('unknown-'));

    const dagreNodesInput: DagreNodeInput[] = tempNodes.map(n => ({ id: n.id, width: n.width, height: n.height }));
    // Arrange the AI-generated nodes and edges from the snippet into an initial layout.
    const newPositions = mockDagreLayoutForHook(dagreNodesInput, tempEdgesInput);
    const positionsMap = new Map(newPositions.map(p => [p.id, { x: p.x, y: p.y }]));

    const positionedTempNodes = tempNodes.map(n => {
      const pos = positionsMap.get(n.id);
      return pos ? { ...n, x: pos.x, y: pos.y } : n;
    });

    const finalTempEdges = (output.edges || []).map((aiEdge, index) => ({
      id: `staged-edge-${Date.now()}-${index}`,
      source: positionedTempNodes.find(n => n.text === aiEdge.sourceText)?.id || `error-source-${index}`,
      target: positionedTempNodes.find(n => n.text === aiEdge.targetText)?.id || `error-target-${index}`,
      label: aiEdge.relationLabel,
    })).filter(e => !e.source.startsWith('error-') && !e.target.startsWith('error-'));

    setStagedMapData({ nodes: positionedTempNodes, edges: finalTempEdges });
    toast({ title: "AI Snippet Ready for Staging", description: `Proposed ${positionedTempNodes.length} nodes and ${finalTempEdges.length} edges. View in staging area.` });
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

  // --- Mini Toolbar Actions ---
  // Refactored handleMiniToolbarQuickExpand to use setConceptExpansionPreview
  const handleMiniToolbarQuickExpand = useCallback(async (nodeId: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", variant: "default" });
      return;
    }
    const sourceNode = mapData.nodes.find(n => n.id === nodeId);
    if (!sourceNode) {
      toast({ title: "Error", description: "Source node not found for Quick Expand.", variant: "destructive" });
      return;
    }

    setAiProcessingNodeId(nodeId);
    try {
      const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
      // Use graph adapter to fetch neighbors of the source node to provide context for AI quick expansion.
      const neighborIds = graphAdapter.getNeighborhood(graphInstance, sourceNode.id, { direction: 'both' });
      const existingMapContext = neighborIds.map(id => graphInstance.nodesMap.get(id)?.text).filter((text): text is string => !!text).slice(0, 2);

      const output: ExpandConceptOutput = await aiExpandConcept({
        concept: sourceNode.text,
        existingMapContext: existingMapContext,
        userRefinementPrompt: "Generate one concise, directly related child idea for this concept. Focus on a primary sub-topic or component.",
      });

      if (output.expandedIdeas && output.expandedIdeas.length > 0) {
        const idea = output.expandedIdeas[0]; // Take the first idea for quick expand
        const mappedPreviewNode: ConceptExpansionPreviewNode = {
          id: `preview-qexp-${nodeId}-${Date.now()}`, // Temporary unique ID
          text: idea.text,
          relationLabel: idea.relationLabel || 'related to',
          details: idea.details || '',
        };
        setConceptExpansionPreview({ parentNodeId: nodeId, previewNodes: [mappedPreviewNode] });
        toast({ title: "AI Suggestion Ready", description: "Review the suggested concept for expansion." });
      } else {
        toast({ title: "Quick Expand", description: "AI couldn't find a specific idea to expand on this topic.", variant: "default" });
        setConceptExpansionPreview(null); // Clear preview if no ideas
      }
    } catch (error) {
      toast({ title: "Error during Quick Expand", description: (error as Error).message, variant: "destructive" });
      setConceptExpansionPreview(null); // Clear preview on error
    } finally {
      setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, mapData, setConceptExpansionPreview, setAiProcessingNodeId]);

  const handleMiniToolbarRewriteConcise = useCallback(async (nodeId: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", variant: "default" });
      return;
    }
    const nodeToRewrite = mapData.nodes.find(n => n.id === nodeId);
    if (!nodeToRewrite) {
      toast({ title: "Error", description: "Node not found for Rewrite Concise.", variant: "destructive" });
      return;
    }

    setAiProcessingNodeId(nodeId);
    try {
      const output: RewriteNodeContentOutput = await aiRewriteNodeContent({
        currentText: nodeToRewrite.text,
        currentDetails: nodeToRewrite.details,
        // Assuming aiRewriteNodeContent can take a userInstruction or specific tone.
        // If not, the prompt within aiRewriteNodeContent itself needs to be flexible.
        // For this subtask, we'll pass it as a userInstruction.
        // The flow might need an update to accept { rewriteTone?: string; userInstruction?: string }
        userInstruction: "Make the text much more concise. If there are details, summarize them very briefly into the main text if possible, or omit them.",
        // rewriteTone: "concise", // Alternative if the flow supports it directly
      });

      updateStoreNode(nodeId, {
        text: output.newText,
        details: output.newDetails || '', // Use new details if provided, otherwise clear or keep old (current behavior: clear if not provided)
        type: 'ai-rewritten-node',
      });
      toast({ title: "Rewrite Concise Successful", description: "Node content has been made more concise." });
    } catch (error) {
      toast({ title: "Error during Rewrite Concise", description: (error as Error).message, variant: "destructive" });
    } finally {
      setAiProcessingNodeId(null);
    }
  }, [isViewOnlyMode, toast, mapData, updateStoreNode, setAiProcessingNodeId]);

  // --- Edge Label Suggestions ---
  const fetchAndSetEdgeLabelSuggestions = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => {
    if (isViewOnlyMode) return;
    useConceptMapStore.getState().addDebugLog(`[AITools] Fetching suggestions for edge ${edgeId}`);

    const currentNodes = useConceptMapStore.getState().mapData.nodes; // Get current nodes from store
    const sourceNode = currentNodes.find(n => n.id === sourceNodeId);
    const targetNode = currentNodes.find(n => n.id === targetNodeId);

    if (!sourceNode || !targetNode) {
      toast({ title: "Error", description: "Source or target node not found for edge label suggestion.", variant: "destructive" });
      return;
    }

    toast({ title: "AI Suggesting Labels...", description: "Fetching relevant labels for your new connection.", duration: 2000 });

    try {
      const input: SuggestEdgeLabelInput = {
        sourceNode: { text: sourceNode.text, details: sourceNode.details },
        targetNode: { text: targetNode.text, details: targetNode.details },
        existingLabel: existingLabel,
      };
      const output: SuggestEdgeLabelOutput = await suggestEdgeLabelFlow(input);

      if (output.suggestedLabels && output.suggestedLabels.length > 0) {
        setEdgeLabelSuggestions({ edgeId, labels: output.suggestedLabels });
        useConceptMapStore.getState().addDebugLog(`[AITools] Suggestions for edge ${edgeId}: ${output.suggestedLabels.join(', ')}`);
        // Example: Auto-apply the first suggestion. This can be changed later to show a dropdown.
        // updateStoreEdge(edgeId, { label: output.suggestedLabels[0] });
        // toast({ title: "AI Suggested Label Applied", description: `Label "${output.suggestedLabels[0]}" applied to new edge.` });
      } else {
        setEdgeLabelSuggestions(null);
      }
    } catch (error) {
      toast({ title: "AI Edge Suggestion Failed", description: (error as Error).message, variant: "destructive" });
      setEdgeLabelSuggestions(null);
    }
  }, [isViewOnlyMode, toast, updateStoreEdge]);

  const handleAddQuickChildNode = useCallback((parentNodeId: string, direction?: 'top' | 'right' | 'bottom' | 'left') => {
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
      null, // No specific selected node for this calculation
      GRID_SIZE_FOR_AI_PLACEMENT,
      childIndex,
      1, // Assuming we're placing one new child at a time for this action
      effectiveDirection
    );

    const newNodeId = addStoreNode({
      text: "New Idea",
      type: 'manual-node',
      position: newPosition,
      parentNode: parentNodeId,
    });

    addStoreEdge({
      source: parentNodeId,
      target: newNodeId,
      label: "relates to",
    });

    toast({ title: "Child Node Added", description: `New idea added ${effectiveDirection} of "${parentNode.text}".` });
  }, [isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast /* getNodePlacement is a pure util, not needed in deps */]);

  // getNodeSuggestions function (assuming it's defined within the hook or has access to its members)
  const getNodeSuggestions = useCallback((currentNode: RFNode<CustomNodeData>): SuggestionAction[] => {
    const suggestions: SuggestionAction[] = [
      { id: `expand-${currentNode.id}`, label: "Expand Concept (AI)", icon: Sparkles, action: () => openExpandConceptModal(currentNode.id) },
      { id: `suggest-relations-${currentNode.id}`, label: "Suggest Relations (AI)", icon: Lightbulb, action: () => openSuggestRelationsModal(currentNode.id) },
      { id: `rewrite-${currentNode.id}`, label: "Rewrite Content (AI)", icon: MessageSquareQuote, action: () => openRewriteNodeContentModal(currentNode.id) },
      { id: `ask-${currentNode.id}`, label: "Ask Question (AI)", icon: HelpCircle, action: () => openAskQuestionModal(currentNode.id) },
    ];

    if (!isViewOnlyMode) {
      suggestions.push({
        id: `quick-add-child-bottom-${currentNode.id}`,
        label: "Add Child Below",
        icon: PlusSquare,
        action: () => handleAddQuickChildNode(currentNode.id, 'bottom')
      });
      suggestions.push({
        id: `quick-add-child-right-${currentNode.id}`,
        label: "Add Child Right",
        icon: PlusSquare,
        action: () => handleAddQuickChildNode(currentNode.id, 'right')
      });
      suggestions.push({
        id: `quick-add-child-top-${currentNode.id}`,
        label: "Add Child Above",
        icon: PlusSquare,
        action: () => handleAddQuickChildNode(currentNode.id, 'top')
      });
      suggestions.push({
        id: `quick-add-child-left-${currentNode.id}`,
        label: "Add Child Left",
        icon: PlusSquare,
        action: () => handleAddQuickChildNode(currentNode.id, 'left')
      });
    }
    return suggestions;
  }, [isViewOnlyMode, openExpandConceptModal, openSuggestRelationsModal, openRewriteNodeContentModal, openAskQuestionModal, handleAddQuickChildNode]);

  const getPaneSuggestions = useCallback((position?: {x: number, y: number}): SuggestionAction[] => {
    const baseSuggestions: SuggestionAction[] = [
      { id: 'pane-quick-cluster', label: "Quick Cluster (AI)", icon: Brain, action: openQuickClusterModal },
      // { id: 'pane-generate-snippet', label: "Generate Snippet (AI)", icon: FileText, action: openGenerateSnippetModal },
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
    // Mini Toolbar specific functions
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    // Suggestion getter functions
    getPaneSuggestions,
    getNodeSuggestions,
    // Edge Label Suggestions
    fetchAndSetEdgeLabelSuggestions,
    edgeLabelSuggestions,
    setEdgeLabelSuggestions,
    // Expansion Preview State & Lifecycle
    conceptExpansionPreview, // State from store
    // setConceptExpansionPreview, // Action from store already used internally by handlers
    acceptAllExpansionPreviews,
    acceptSingleExpansionPreview,
    clearExpansionPreview,
    addStoreNode, 
    addStoreEdge,
  };
}
