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
  type SuggestEdgeLabelOutput
} from '@/ai/flows';
import { 
    rewriteNodeContent as aiRewriteNodeContent,
    type RewriteNodeContentOutput 
} from '@/ai/flows/rewrite-node-content-logic';
import type { ConceptExpansionPreviewNode, ConceptExpansionPreviewState } from '@/stores/concept-map-store';
import type {
  AskQuestionAboutNodeOutput,
  ExpandConceptOutput,
  GenerateMapSnippetOutput,
  GenerateQuickClusterOutput,
  SuggestRelationsOutput,
  SummarizeNodesOutput
} from '@/ai/flows'; 
import type { ConceptMapNode, RFNode } from '@/types';
import { getNodePlacement } from '@/lib/layout-utils'; // Ensure this is correctly imported
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import { Lightbulb, Sparkles, Brain, HelpCircle, PlusSquare, MessageSquareQuote } from 'lucide-react';

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

// Externalized logic for generating node suggestions
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
      const currentNodes = useConceptMapStore.getState().mapData.nodes; // Get fresh nodes
      const newPosition = getNodePlacementFunc(
        currentNodes,
        'child',
        sourceNode as ConceptMapNode,
        null,
        GRID_SIZE_FOR_AI_PLACEMENT,
        index,
        placeholderSuggestions.length
      );
      addNodeFunc({
        text: pSuggestion.text,
        type: pSuggestion.type,
        position: newPosition,
        parentNode: sourceNode.id
      });
      toastFunc({ title: "Node Added", description: `"${pSuggestion.text}" added near "${(sourceNode as ConceptMapNode).text}".` });
    }
  }));
};


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
    setConceptExpansionPreview,
    conceptExpansionPreview,
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
      const neighborIds = new Set<string>();
      mapData.edges?.forEach(edge => {
        if (edge.source === sourceNode.id) neighborIds.add(edge.target);
        if (edge.target === sourceNode.id) neighborIds.add(edge.source);
      });
      const existingMapContext = Array.from(neighborIds).map(id => mapData.nodes.find(n => n.id === id)?.text).filter(Boolean).slice(0, 2) as string[];
      const output: ExpandConceptOutput = await aiExpandConcept({
        concept: sourceNode.text, existingMapContext: existingMapContext,
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

  // This is the function that needs to be correctly returned and memoized by the hook.
  // It will call the external _generateNodeSuggestionsLogic.
  const memoizedGetNodeSuggestions = useCallback((sourceNode: RFNode<any> | ConceptMapNode): SuggestionAction[] => {
    // Now, call the external logic function, passing dependencies from the hook's scope
    return _generateNodeSuggestionsLogic(sourceNode, isViewOnlyMode, addStoreNode, getNodePlacement, toast);
  }, [isViewOnlyMode, addStoreNode, toast]); // getNodePlacement is stable as it's an import

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
        text: previewNode.text,
        type: 'ai-expanded',
        details: previewNode.details,
        position: position,
        parentNode: parentNodeId,
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

    // Find index of this node for placement (if multiple previews were shown)
    const nodeIndex = previewNodes.findIndex(pn => pn.id === previewNodeId);
    const totalNodesInPreview = previewNodes.length;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const position = getNodePlacement(currentNodes, 'child', parentNode, null, GRID_SIZE_FOR_AI_PLACEMENT, nodeIndex, totalNodesInPreview);

    const newNodeId = addStoreNode({
      text: previewNodeData.text,
      type: 'ai-expanded',
      details: previewNodeData.details,
      position: position,
      parentNode: parentNodeId,
    });
    addStoreEdge({ source: parentNodeId, target: newNodeId, label: previewNodeData.relationLabel });

    toast({ title: "Suggestion Added", description: `Concept "${previewNodeData.text}" added and linked.` });

    // Remove the accepted node from the preview list
    const remainingPreviewNodes = previewNodes.filter(pn => pn.id !== previewNodeId);
    if (remainingPreviewNodes.length > 0) {
      setConceptExpansionPreview({ parentNodeId, previewNodes: remainingPreviewNodes });
    } else {
      setConceptExpansionPreview(null); // Clear if all accepted
    }
  }, [conceptExpansionPreview, isViewOnlyMode, mapData.nodes, addStoreNode, addStoreEdge, toast, setConceptExpansionPreview]);

  const clearExpansionPreview = useCallback(() => {
    setConceptExpansionPreview(null);
  }, [setConceptExpansionPreview]);


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
    getNodeSuggestions: memoizedGetNodeSuggestions, // Return the memoized version
    fetchAndSetEdgeLabelSuggestions,
    edgeLabelSuggestions,
    setEdgeLabelSuggestions,
    conceptExpansionPreview,
    acceptAllExpansionPreviews,
    acceptSingleExpansionPreview,
    clearExpansionPreview,
    addStoreNode, 
    addStoreEdge,
  };
}

[end of src/hooks/useConceptMapAITools.ts]
