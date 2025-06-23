"use client";

import { useState, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
import { DagreLayoutUtility, type NodeLayoutInput, type EdgeLayoutInput, type DagreLayoutOptions } from '@/lib/dagreLayoutUtility';
import {
  extractConcepts as aiExtractConcepts, type ExtractConceptsInput, type ExtractConceptsOutput, type ExtractedConceptItem,
  suggestRelations as aiSuggestRelations, type SuggestRelationsInput, type SuggestRelationsOutput,
  expandConcept as aiExpandConcept, type ExpandConceptInput, type ExpandConceptOutput,
  askQuestionAboutNode as aiAskQuestionAboutNode, type AskQuestionAboutNodeOutput, type AskQuestionAboutNodeInput,
  generateQuickCluster as aiGenerateQuickCluster, type GenerateQuickClusterInput, type GenerateQuickClusterOutput,
  generateMapSnippetFromText as aiGenerateMapSnippetFromText, type GenerateMapSnippetInput, type GenerateMapSnippetOutput,
  summarizeNodes as aiSummarizeNodes, type SummarizeNodesInput, type SummarizeNodesOutput,
  suggestEdgeLabelFlow, type SuggestEdgeLabelInput, type SuggestEdgeLabelOutput,
  suggestQuickChildTextsFlow, type SuggestQuickChildTextsInput, type SuggestQuickChildTextsOutput,
  refineNodeSuggestionFlow, type RefineNodeSuggestionInput, type RefineNodeSuggestionOutput,
  suggestIntermediateNodeFlow, type SuggestIntermediateNodeInput, type SuggestIntermediateNodeOutput,
  aiTidyUpSelectionFlow, type AiTidyUpSelectionInput, type AiTidyUpSelectionOutput,
  suggestChildNodesFlow, type SuggestChildNodesRequest, type SuggestChildNodesResponse,
  suggestMapImprovementsFlow, type SuggestedImprovements,
  rewriteNodeContent as aiRewriteNodeContent, type RewriteNodeContentInput, type RewriteNodeContentOutput,
  generateMapSummaryFlow, type GenerateMapSummaryInput, type GenerateMapSummaryOutput
} from '@/ai/flows';
import type { ConceptMapNode, RFNode, CustomNodeData, ConceptMapData } from '@/types';
import { getNodePlacement } from '@/lib/layout-utils';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import { useReactFlow } from 'reactflow';
import type { SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;
const GRID_SIZE_FOR_AI_PLACEMENT = 20;

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

export function useConceptMapAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const {
    mapData, selectedElementId, multiSelectedNodeIds,
    setAiExtractedConcepts, setAiSuggestedRelations,
    removeExtractedConceptsFromSuggestions, removeSuggestedRelationsFromSuggestions,
    resetAiSuggestions, addNode: addStoreNode, updateNode: updateStoreNode,
    addEdge: addStoreEdge, setAiProcessingNodeId,
    setStagedMapData, setConceptExpansionPreview, conceptExpansionPreview,
    applyLayout,
  } = useConceptMapStore(
    useCallback(s => ({
      mapData: s.mapData, selectedElementId: s.selectedElementId, multiSelectedNodeIds: s.multiSelectedNodeIds,
      setAiExtractedConcepts: s.setAiExtractedConcepts, setAiSuggestedRelations: s.setAiSuggestedRelations,
      removeExtractedConceptsFromSuggestions: s.removeExtractedConceptsFromSuggestions,
      removeSuggestedRelationsFromSuggestions: s.removeSuggestedRelationsFromSuggestions,
      resetAiSuggestions: s.resetAiSuggestions, addNode: s.addNode, updateNode: s.updateNode,
      addEdge: s.addEdge, setAiProcessingNodeId: s.setAiProcessingNodeId,
      setStagedMapData: s.setStagedMapData,
      setConceptExpansionPreview: s.setConceptExpansionPreview, conceptExpansionPreview: s.conceptExpansionPreview,
      applyLayout: s.applyLayout,
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
  // const [intermediateNodeSuggestion, setIntermediateNodeSuggestion] = useState<IntermediateNodeSuggestionContext | null>(null); // Removed for staging area
  const [aiChildTextSuggestions, setAiChildTextSuggestions] = useState<string[]>([]);
  const [isLoadingAiChildTexts, setIsLoadingAiChildTexts] = useState(false);
  const [isDagreTidying, setIsDagreTidying] = useState(false);
  const [isSummarizingMap, setIsSummarizingMap] = useState(false);
  const [mapSummaryResult, setMapSummaryResult] = useState<GenerateMapSummaryOutput | null>(null);
  const [isMapSummaryModalOpen, setIsMapSummaryModalOpen] = useState(false);


  const callAIWithStandardFeedback = useCallback(async <I, O>(
    aiFunctionName: string,
    aiFlowFunction: (input: I) => Promise<O>,
    input: I,
    options?: {
        loadingMessage?: string;
        successTitle?: string;
        successDescription?: (output: O) => string;
        hideSuccessToast?: boolean;
        processingId?: string | null;
    }
  ): Promise<O | null> => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: `${aiFunctionName} is disabled.`, variant: "default" });
      return null;
    }
    const currentProcessingId = options?.processingId !== undefined ? options.processingId : aiFunctionName;
    addDebugLog(`[AITools] Starting: ${aiFunctionName} (ID: ${currentProcessingId})`);
    if(currentProcessingId) setAiProcessingNodeId(currentProcessingId);

    const loadingToast = toast({
      title: "AI Processing...",
      description: options?.loadingMessage || `AI is working on ${aiFunctionName.toLowerCase()}. Please wait.`,
      duration: 999999,
    });

    try {
      const result = await aiFlowFunction(input);
      loadingToast.dismiss();
      if (!options?.hideSuccessToast) {
        toast({
          title: options?.successTitle || `${aiFunctionName} Successful!`,
          description: options?.successDescription ? options.successDescription(result) : "AI operation completed.",
        });
      }
      addDebugLog(`[AITools] Success: ${aiFunctionName} (ID: ${currentProcessingId})`);
      return result;
    } catch (error: any) {
      loadingToast.dismiss();
      console.error(`Error in ${aiFunctionName} (ID: ${currentProcessingId}):`, error);
      let userFriendlyMessage = `The AI operation "${aiFunctionName}" failed. `;
      if (error.message) {
        // Try to make some common errors more friendly
        if (error.message.toLowerCase().includes('deadline_exceeded') || error.message.toLowerCase().includes('timeout')) {
          userFriendlyMessage += "The request timed out. This might be due to high server load or a complex request. Please try again in a few moments.";
        } else if (error.message.toLowerCase().includes('resource_exhausted')) {
          userFriendlyMessage += "The AI resources are temporarily unavailable. Please try again later.";
        } else if (error.message.toLowerCase().includes('api key not valid')) {
          userFriendlyMessage = "AI service configuration error. Please contact support."; // More generic for API key issues
        }
        else {
          userFriendlyMessage += `Details: ${error.message}`;
        }
      } else {
        userFriendlyMessage += "No specific error details available.";
      }
      // Add general advice only if not an API key error (which has its own specific advice)
      if (!error.message?.toLowerCase().includes('api key not valid')) {
        userFriendlyMessage += " Please try again shortly. If the issue persists, check the developer console for more technical information or contact support.";
      }

      toast({
        title: `Error: Could not complete ${aiFunctionName}`,
        description: userFriendlyMessage,
        variant: "destructive",
        duration: 7000,
      });
      addDebugLog(`[AITools] Error in ${aiFunctionName} (ID: ${currentProcessingId}): ${error.message}`);
      return null;
    } finally {
      if(currentProcessingId && useConceptMapStore.getState().aiProcessingNodeId === currentProcessingId) {
        setAiProcessingNodeId(null);
      }
    }
  }, [isViewOnlyMode, toast, addDebugLog, setAiProcessingNodeId]);

  const openExtractConceptsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", description: "AI tools are disabled."}); return; }
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

  const handleConceptsExtracted = useCallback(async (text: string) => {
    const output = await callAIWithStandardFeedback<ExtractConceptsInput, ExtractConceptsOutput>(
        "Extract Concepts", aiExtractConcepts, { text },
        { successDescription: (res) => `${res.concepts.length} concepts found. View in AI Panel.`}
    );
    if (output) setAiExtractedConcepts(output.concepts); // output.concepts is ExtractedConceptItem[]
    return !!output;
  }, [callAIWithStandardFeedback, setAiExtractedConcepts]);

  const addExtractedConceptsToMap = useCallback((selectedConcepts: ExtractedConceptItem[]) => {
    if (isViewOnlyMode || selectedConcepts.length === 0) return;
    let addedCount = 0;
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    selectedConcepts.forEach((conceptItem) => {
      addStoreNode({
          text: conceptItem.concept, type: 'ai-concept',
          position: getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE_FOR_AI_PLACEMENT),
          details: conceptItem.context ? `Context: ${conceptItem.context}${conceptItem.source ? `\nSource: "${conceptItem.source}"` : ''}` : conceptItem.source ? `Source: "${conceptItem.source}"` : ''
      });
      addedCount++;
    });
    if (addedCount > 0) {
      toast({ title: "Concepts Added", description: `${addedCount} new concepts added.` });
      removeExtractedConceptsFromSuggestions(selectedConcepts.map(c => c.concept));
    }
  }, [isViewOnlyMode, toast, addStoreNode, removeExtractedConceptsFromSuggestions]);

  const openSuggestRelationsModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode"}); return; }
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
    setConceptsForRelationSuggestion(concepts.length > 0 ? concepts : ["Example A", "Example B"]);
    setIsSuggestRelationsModalOpen(true);
  }, [isViewOnlyMode, resetAiSuggestions, mapData, selectedElementId, multiSelectedNodeIds, toast]);

  const handleRelationsSuggested = useCallback(async (concepts: string[]) => {
    const output = await callAIWithStandardFeedback<SuggestRelationsInput, SuggestRelationsOutput>(
        "Suggest Relations", aiSuggestRelations, { concepts },
        { successDescription: (res) => `${res.length} relations suggested. View in AI Panel.`}
    );
    if (output) setAiSuggestedRelations(output);
    return !!output;
  }, [callAIWithStandardFeedback, setAiSuggestedRelations]);

  const addSuggestedRelationsToMap = useCallback((selectedRelations: SuggestRelationsOutput) => {
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
        addStoreEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation, details: rel.reason });
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

  const openExpandConceptModal = useCallback((nodeIdForContext?: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode"}); return; }
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
          context = neighborNodeIds.map(id => currentMapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 5);
      }
    } else if (currentMapData.nodes.length > 0) {
      conceptDetailsToSet = { id: null, text: "General Map Topic", node: undefined };
    } else {
        conceptDetailsToSet = {id: null, text: "", node: undefined};
    }
    setConceptToExpandDetails(conceptDetailsToSet);
    setMapContextForExpansion(context);
    setIsExpandConceptModalOpen(true);
  }, [isViewOnlyMode, mapData, selectedElementId, toast]);

  const handleConceptExpanded = useCallback(async (input: ExpandConceptInput) => {
    if (isViewOnlyMode || !conceptToExpandDetails || !conceptToExpandDetails.id) {
        toast({ title: "Error", description: "Cannot expand concept without a source node.", variant: "destructive" });
        return null;
    }
    const parentNodeId = conceptToExpandDetails.id;
    const output = await callAIWithStandardFeedback<ExpandConceptInput, ExpandConceptOutput>(
        "Expand Concept", aiExpandConcept, input,
        {
            loadingMessage: `AI is expanding on "${input.concept}"...`,
            successTitle: "AI Suggestions Ready",
            successDescription: (res) => `${res.expandedIdeas.length} new ideas suggested. Review them for placement.`,
            processingId: parentNodeId
        }
    );
    if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
        const mappedPreviewNodes = output.expandedIdeas.map((idea, index:number) => ({
            id: `preview-exp-${parentNodeId}-${Date.now()}-${index}`,
            text: idea.text,
            relationLabel: idea.relationLabel || 'related to',
            details: idea.reasoning ? `AI Rationale: ${idea.reasoning}` : '',
        }));
        setConceptExpansionPreview({ parentNodeId, previewNodes: mappedPreviewNodes });
    } else if(output) {
        setConceptExpansionPreview(null);
    }
    return !!output;
  }, [isViewOnlyMode, toast, conceptToExpandDetails, setConceptExpansionPreview, callAIWithStandardFeedback]);

  const openAskQuestionModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) {
      setNodeContextForQuestion({ text: node.text, details: node.details, id: node.id });
      setIsAskQuestionModalOpen(true);
    } else {
      toast({ title: "Error", description: "Node not found.", variant: "destructive" });
    }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleQuestionAnswered = useCallback(async (question: string, nodeCtx: { text: string; details?: string; id: string; }) => {
    const node = mapData.nodes.find(n=>n.id === nodeCtx.id);
    await callAIWithStandardFeedback<AskQuestionAboutNodeInput, AskQuestionAboutNodeOutput>(
        "Ask AI About Node", aiAskQuestionAboutNode,
        { nodeId: nodeCtx.id, nodeText: nodeCtx.text, nodeDetails: nodeCtx.details, nodeType: node?.type, userQuestion: question },
        {
            successTitle: "AI Answer:",
            successDescription: (res) => res.answer,
            hideSuccessToast: false,
            processingId: nodeCtx.id
        }
    );
  }, [callAIWithStandardFeedback, mapData.nodes]);

  const openRewriteNodeContentModal = useCallback((nodeId: string) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode" }); return; }
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (node) {
      setNodeContentToRewrite({ id: node.id, text: node.text, details: node.details });
      setIsRewriteNodeContentModalOpen(true);
    } else {
      toast({ title: "Error", description: "Node not found.", variant: "destructive" });
    }
  }, [isViewOnlyMode, mapData.nodes, toast]);

  const handleRewriteNodeContentConfirm = useCallback(async (nodeId: string, newText: string, newDetails?: string, tone?: string) => {
    if (isViewOnlyMode) return;
    addDebugLog(`[AITools] Applying rewritten content for node ${nodeId}. Tone: ${tone}`);
    updateStoreNode(nodeId, { text: newText, details: newDetails, type: 'ai-rewritten-node' });
    toast({ title: "Node Content Updated", description: "Content rewritten by AI has been applied." });
  }, [isViewOnlyMode, updateStoreNode, toast, addDebugLog]);

  const handleSummarizeSelectedNodes = useCallback(async () => {
    const selectedNodes = mapData.nodes.filter(node => multiSelectedNodeIds.includes(node.id));
    if (selectedNodes.length === 0 && !isViewOnlyMode) { // Changed from < 2 to === 0 to allow single node summary
      toast({ title: "Selection Error", description: "Please select at least one node to summarize.", variant: "destructive" });
      return;
    }
    const output = await callAIWithStandardFeedback<SummarizeNodesInput, SummarizeNodesOutput>(
        "Summarize Selection", aiSummarizeNodes,
        { nodes: selectedNodes.map(n => ({ id: n.id, text: n.text, details: n.details })) },
        {
            loadingMessage: `AI is summarizing ${selectedNodes.length} selected node(s)...`,
            successTitle: "AI Summary Created!",
            successDescription: (res) => res.summary?.text ? "A new node with the summary has been added." : "AI could not generate a specific summary for the selection.",
            processingId: multiSelectedNodeIds.length > 0 ? multiSelectedNodeIds[0] : 'summarize-selection' // Use first selected node ID or generic
        }
    );
    if (output && output.summary && output.summary.text) {
        const centralPoint = selectedNodes.reduce((acc, node) => ({ x: acc.x + (node.x || 0), y: acc.y + (node.y || 0) }), { x: 0, y: 0 });
        centralPoint.x = selectedNodes.length > 0 ? centralPoint.x / selectedNodes.length : (reactFlowInstance.getViewport().x + (reactFlowInstance.getViewport().width || DEFAULT_NODE_WIDTH) / 2);
        centralPoint.y = selectedNodes.length > 0 ? centralPoint.y / selectedNodes.length : (reactFlowInstance.getViewport().y + (reactFlowInstance.getViewport().height || DEFAULT_NODE_HEIGHT) / 2);

        const summaryNodePosition = getNodePlacement( mapData.nodes, 'generic', null,
            {id: 'summary-center', x: centralPoint.x, y: centralPoint.y, width: 0, height: 0, text:'', type:''},
            GRID_SIZE_FOR_AI_PLACEMENT);

        const tempSummaryNodeId = `staged-summary-${Date.now()}`;
        const summaryNode: ConceptMapNode = {
            id: tempSummaryNodeId,
            text: output.summary.text,
            details: output.summary.details || `Summary of: ${selectedNodes.map(n => n.text).join(', ')}`,
            type: 'ai-summary-node', // Or 'staged-ai-summary'
            position: { x: summaryNodePosition.x, y: summaryNodePosition.y - (selectedNodes.length > 1 ? 100 : 0) },
            width: 200,
            height: 100,
            childIds: [],
        };

        const edgesToSummarizedNodes: ConceptMapEdge[] = selectedNodes.map(node => ({
            id: `staged-summaryedge-${node.id}-${Date.now()}`, // Temporary ID
            source: tempSummaryNodeId,
            target: node.id,
            label: 'summary of',
        }));

        useConceptMapStore.getState().setStagedMapData({
            nodes: [summaryNode],
            edges: edgesToSummarizedNodes,
            actionType: 'summarizeNodes',
        });
        // Old direct add: addStoreNode({ ... });
    }
  }, [isViewOnlyMode, mapData.nodes, multiSelectedNodeIds, toast, callAIWithStandardFeedback, reactFlowInstance]);
  // Removed addStoreNode from dependency array as it's no longer directly called.

  const handleMiniToolbarQuickExpand = useCallback(async (nodeId: string) => {
    const sourceNode = mapData.nodes.find(n => n.id === nodeId);
    if (!sourceNode) { toast({ title: "Error", description: "Source node not found.", variant: "destructive" }); return; }

    const output = await callAIWithStandardFeedback<ExpandConceptInput, ExpandConceptOutput>(
        "Quick Expand", aiExpandConcept,
        {
            concept: sourceNode.text,
            existingMapContext: (() => {
                const graphAdapter = new GraphAdapterUtility();
                const graphInstance = graphAdapter.fromArrays(mapData.nodes, mapData.edges);
                if (graphInstance.hasNode(sourceNode.id)) {
                    const neighborNodeIds = graphAdapter.getNeighborhood(graphInstance, sourceNode.id, { depth: 1, direction: 'all' });
                    return neighborNodeIds.map(id => mapData.nodes.find(n => n.id === id)?.text).filter((text): text is string => !!text).slice(0, 2);
                }
                return [];
            })(),
            userRefinementPrompt: "Generate one concise, directly related child idea. Focus on a primary sub-topic or component.",
        },
        {
            loadingMessage: `AI is quickly expanding on "${sourceNode.text}"...`,
            successTitle: "AI Suggestion Ready",
            successDescription: (res) => res.expandedIdeas?.length > 0 ? "Review the suggested concept." : "AI found no specific idea for quick expansion.",
            processingId: nodeId
        }
    );
    if (output && output.expandedIdeas && output.expandedIdeas.length > 0) {
        const idea = output.expandedIdeas[0];
        const mappedPreviewNode = {
          id: `preview-qexp-${nodeId}-${Date.now()}`, text: idea.text,
          relationLabel: idea.relationLabel || 'related to',
          details: idea.reasoning ? `AI Rationale: ${idea.reasoning}` : (idea.details || ''),
        };
        setConceptExpansionPreview({ parentNodeId: nodeId, previewNodes: [mappedPreviewNode] });
    } else if (output) {
        setConceptExpansionPreview(null);
    }
  }, [isViewOnlyMode, toast, mapData, setConceptExpansionPreview, callAIWithStandardFeedback]);

  const handleMiniToolbarRewriteConcise = useCallback(async (nodeId: string) => {
    const node = mapData.nodes.find(n => n.id === nodeId);
    if (!node) { toast({ title: "Error", description: "Node not found.", variant: "destructive" }); return; }
    const output = await callAIWithStandardFeedback<RewriteNodeContentInput, RewriteNodeContentOutput>(
        "Concise Rewrite", aiRewriteNodeContent,
        { currentText: node.text, currentDetails: node.details, targetTone: "concise" },
        {
            loadingMessage: `AI is making "${node.text}" more concise...`,
            successTitle: "Content Rewritten Concisely!",
            successDescription: (res) => res.rewrittenText ? "Node content updated." : "AI could not make it more concise.",
            hideSuccessToast: !output?.rewrittenText,
            processingId: nodeId
        }
    );
    if (output && output.rewrittenText) {
        updateStoreNode(nodeId, { text: output.rewrittenText, details: output.rewrittenDetails, type: 'ai-rewritten-node' });
    }
  }, [isViewOnlyMode, toast, mapData.nodes, updateStoreNode, callAIWithStandardFeedback]);

  const fetchAndSetEdgeLabelSuggestions = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => {
    const sourceNode = mapData.nodes.find(n => n.id === sourceNodeId);
    const targetNode = mapData.nodes.find(n => n.id === targetNodeId);
    if (!sourceNode || !targetNode) { toast({ title: "Error", description: "Source or target node not found for edge label suggestion.", variant: "destructive" }); return; }

    const output = await callAIWithStandardFeedback<SuggestEdgeLabelInput, SuggestEdgeLabelOutput>(
        "Suggest Edge Labels", suggestEdgeLabelFlow,
        { sourceNode: { text: sourceNode.text, details: sourceNode.details }, targetNode: { text: targetNode.text, details: targetNode.details }, existingLabel },
        { loadingMessage: "AI is thinking of edge labels...", successTitle: "Edge Label Suggestions Ready", hideSuccessToast: true } // Hide success, shown in floater
    );
    if (output && output.suggestedLabels.length > 0) {
      setEdgeLabelSuggestions({ edgeId, labels: output.suggestedLabels });
    } else if (output) {
      setEdgeLabelSuggestions({ edgeId, labels: ["related to"] });
    }
  }, [mapData.nodes, toast, callAIWithStandardFeedback]);

  const fetchAIChildTextSuggestions = useCallback(async (node: RFNode<CustomNodeData> | null) => {
    if (!node) return;
    setIsLoadingAiChildTexts(true);
    const output = await callAIWithStandardFeedback<SuggestQuickChildTextsInput, SuggestQuickChildTextsOutput>(
        "Suggest Child Node Texts", suggestQuickChildTextsFlow,
        { parentNodeText: node.data.label, parentNodeDetails: node.data.details, existingChildTexts: node.data.childIds?.map(id => mapData.nodes.find(n=>n.id===id)?.text).filter(Boolean) as string[] || [] },
        { loadingMessage: "AI is brainstorming child node ideas...", successTitle: "Child Node Ideas Ready", hideSuccessToast: true, processingId: node.id }
    );
    if (output) setAiChildTextSuggestions(output.suggestedChildTexts);
    setIsLoadingAiChildTexts(false);
  }, [callAIWithStandardFeedback, mapData.nodes, setIsLoadingAiChildTexts]);

  const handleRefineSuggestionConfirm = useCallback(async (nodeId: string, refinementInstruction: string) => {
    const previewState = conceptExpansionPreview;
    const nodeToRefine = previewState?.previewNodes.find(n => n.id === nodeId);
    if (!nodeToRefine || !previewState?.parentNodeId) {
      toast({ title: "Error", description: "Could not find the suggestion to refine.", variant: "destructive" });
      return;
    }
    const output = await callAIWithStandardFeedback<RefineNodeSuggestionInput, RefineNodeSuggestionOutput>(
        "Refine Suggestion", refineNodeSuggestionFlow,
        { originalText: nodeToRefine.text, originalDetails: nodeToRefine.details, refinementInstruction },
        { loadingMessage: "AI is refining the suggestion...", successTitle: "Suggestion Refined!", processingId: nodeId }
    );
    if (output) {
      useConceptMapStore.getState().updateConceptExpansionPreviewNode(nodeId, output.refinedText, output.refinedDetails);
    }
  }, [conceptExpansionPreview, toast, callAIWithStandardFeedback]);

  const handleSuggestIntermediateNodeRequest = useCallback(async (edgeId: string, sourceNodeId: string, targetNodeId: string) => {
    const sourceNode = mapData.nodes.find(n => n.id === sourceNodeId);
    const targetNode = mapData.nodes.find(n => n.id === targetNodeId);
    const edge = mapData.edges.find(e => e.id === edgeId);
    if (!sourceNode || !targetNode || !edge) { toast({ title: "Error", description: "Edge context not found.", variant: "destructive"}); return; }

    const output = await callAIWithStandardFeedback<SuggestIntermediateNodeInput, SuggestIntermediateNodeOutput>(
        "Suggest Intermediate Node", suggestIntermediateNodeFlow,
        { sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details, targetNodeText: targetNode.text, targetNodeDetails: targetNode.details, existingEdgeLabel: edge.label },
        { loadingMessage: "AI is thinking of an intermediate concept...", successTitle: "Intermediate Node Suggested", successDescription: (res) => `AI suggests adding '${res.intermediateNodeText}'. Review the details.`}
    );
    if (output) {
        // Construct node and edges for staging
        const tempNodeId = `staged-intermediate-${Date.now()}`;
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;

        const intermediateNode: ConceptMapNode = {
            id: tempNodeId, // Temporary ID for staging
            text: output.intermediateNodeText,
            details: output.intermediateNodeDetails ? `${output.intermediateNodeDetails}${output.reasoning ? `\n\nAI Rationale: ${output.reasoning}` : ''}` : (output.reasoning ? `AI Rationale: ${output.reasoning}` : ''),
            type: 'ai-intermediate', // Or a more generic 'staged-ai' type
            position: { x: midX, y: midY + 30 }, // Adjust position as needed
            width: DEFAULT_NODE_WIDTH,
            height: DEFAULT_NODE_HEIGHT,
            childIds: [],
        };
        const edgeToIntermediate: ConceptMapEdge = {
            id: `staged-edge1-${Date.now()}`, // Temporary ID
            source: sourceNode.id,
            target: tempNodeId,
            label: output.labelSourceToIntermediate,
        };
        const edgeFromIntermediate: ConceptMapEdge = {
            id: `staged-edge2-${Date.now()}`, // Temporary ID
            source: tempNodeId,
            target: targetNode.id,
            label: output.labelIntermediateToTarget,
        };

        useConceptMapStore.getState().setStagedMapData({
            nodes: [intermediateNode],
            edges: [edgeToIntermediate, edgeFromIntermediate],
            actionType: 'intermediateNode',
            originalElementId: edge.id,
        });
    }
  }, [mapData, toast, callAIWithStandardFeedback]); // Removed addStoreNode, addStoreEdge from deps

  // confirmAddIntermediateNode and clearIntermediateNodeSuggestion are removed as staging toolbar handles this.

  const handleAiTidyUpSelection = useCallback(async () => {
    if (multiSelectedNodeIds.length < 2) { toast({ title: "Selection Required", description: "Select at least two nodes for AI Tidy Up."}); return; }
    const nodesToTidy = mapData.nodes.filter(n => multiSelectedNodeIds.includes(n.id))
                           .map(n => ({ id: n.id, text: n.text, x: n.x, y: n.y, width: n.width, height: n.height, type: n.type, details: n.details, parentNode: n.parentNode, childIds: n.childIds, backgroundColor: n.backgroundColor, shape: n.shape }));

    const output = await callAIWithStandardFeedback<AiTidyUpSelectionInput, AiTidyUpSelectionOutput>(
        "AI Tidy Up Selection", aiTidyUpSelectionFlow,
        { nodes: nodesToTidy, mapLayoutContext: { /* Potentially add viewport or other context */ } },
        { loadingMessage: "AI is tidying up your selection...", successTitle: "Selection Tidied by AI!" }
    );

    // Output from aiTidyUpSelectionFlow is { newPositions: NodeNewPositionSchema[], suggestedParentNode?: { text: string, type: string } }
    if (output && output.newPositions) {
      if (output.suggestedParentNode) {
        // Structural change: new parent node suggested. Send to staging.
        const newParentNodeId = `staged-parent-${Date.now()}`;

        // Calculate parent position and dimensions to encompass children
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        output.newPositions.forEach(p => {
          const originalNode = nodesToTidy.find(n => n.id === p.id);
          const w = originalNode?.width || DEFAULT_NODE_WIDTH;
          const h = originalNode?.height || DEFAULT_NODE_HEIGHT;
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x + w);
          maxY = Math.max(maxY, p.y + h);
        });
        const PADDING = 30; // Padding around children for parent
        const parentWidth = (maxX - minX) + 2 * PADDING;
        const parentHeight = (maxY - minY) + 2 * PADDING;
        const parentX = minX - PADDING;
        const parentY = minY - PADDING;

        const stagedParentNode: ConceptMapNode = {
          id: newParentNodeId,
          text: output.suggestedParentNode.text,
          type: output.suggestedParentNode.type || 'ai-group-parent',
          position: { x: parentX, y: parentY },
          width: parentWidth,
          height: parentHeight,
          details: `AI suggested parent for ${nodesToTidy.length} nodes.`,
          childIds: output.newPositions.map(p => p.id), // Tentatively, store will finalize parenting
        };

        const stagedChildNodes: ConceptMapNode[] = output.newPositions.map(p => {
          const originalNode = nodesToTidy.find(n => n.id === p.id);
          return {
            ...(originalNode as ConceptMapNode), // Spread original properties
            id: p.id, // Keep original ID
            x: p.x,
            y: p.y,
            parentNode: newParentNodeId, // Assign new staged parent
            // Ensure width and height are carried over
            width: originalNode?.width || DEFAULT_NODE_WIDTH,
            height: originalNode?.height || DEFAULT_NODE_HEIGHT,
          };
        });

        useConceptMapStore.getState().setStagedMapData({
          nodes: [stagedParentNode, ...stagedChildNodes],
          edges: [], // No new edges suggested by this specific flow, parent-child links are via node.parentNode
          actionType: 'aiTidyUpComplete', // Use a general type or 'aiTidyUpWithNewParent'
          originalElementIds: nodesToTidy.map(n => n.id), // IDs of nodes being modified
        });
        toast({ title: "AI Tidy Up Suggestion Ready", description: "Review the proposed grouping and layout in the staging area." });

      } else {
        // ONLY layout updates (newPositions), use ghost preview
        const layoutUpdatesWithDimensions = output.newPositions.map(lu => {
          const originalNode = nodesToTidy.find(n => n.id === lu.id);
          return {
            id: lu.id,
            x: lu.x,
            y: lu.y,
            width: originalNode?.width || DEFAULT_NODE_WIDTH,
            height: originalNode?.height || DEFAULT_NODE_HEIGHT,
          };
        });
        useConceptMapStore.getState().setGhostPreview(layoutUpdatesWithDimensions);
        toast({ title: "Layout Preview Ready", description: "AI Tidy Up proposes new layout. Accept or Cancel." });
      }
    }
  }, [multiSelectedNodeIds, mapData.nodes, callAIWithStandardFeedback, toast]); // Removed direct store manipulation functions

  const handleSuggestMapImprovements = useCallback(async () => {
    const currentNodes = mapData.nodes.map(n => ({ id: n.id, text: n.text, details: n.details || "" }));
    const currentEdges = mapData.edges.map(e => ({ source: e.source, target: e.target, label: e.label || "" }));

    const output = await callAIWithStandardFeedback<any, SuggestedImprovements>(
        "Suggest Map Improvements", suggestMapImprovementsFlow,
        { nodes: currentNodes, edges: currentEdges },
        { loadingMessage: "AI is analyzing your map for improvements...", successTitle: "Improvement Suggestions Ready!", successDescription: (res) => `Found ${res.suggestedEdges.length} edge and ${res.suggestedGroups.length} group suggestions.`}
    );
    if (output) {
        useConceptMapStore.getState().setStructuralSuggestions(output);
    }
  }, [mapData, callAIWithStandardFeedback]);

  const handleDagreLayoutSelection = useCallback(async () => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", description: "Layout changes are disabled."}); return; }
    const { multiSelectedNodeIds: currentSelectedIds, mapData: currentMapData } = useConceptMapStore.getState();
    const { nodes: allNodes, edges: allEdges } = currentMapData;
    if (currentSelectedIds.length < 2) { toast({ title: "Selection Required", description: "Please select at least 2 nodes." }); return; }

    setIsDagreTidying(true);
    const loadingToast = toast({ title: "Arranging Selection...", description: "Using Dagre for layout. Please wait.", duration: 999999 });

    try {
      const selectedNodesFromStore = allNodes.filter(n => currentSelectedIds.includes(n.id));
      const nodesForDagre = selectedNodesFromStore.map(n => {
        const rfn = reactFlowInstance.getNode(n.id);
        return { id: n.id, width: rfn?.width || n.width || DEFAULT_NODE_WIDTH, height: rfn?.height || n.height || DEFAULT_NODE_HEIGHT, label: n.text };
      }).filter(n => n.width && n.height);

      if (nodesForDagre.length < 2) { toast({ title: "Layout Error", description: "Not enough valid nodes with dimensions." }); setIsDagreTidying(false); loadingToast.dismiss(); return; }

      const selectedNodeIdSet = new Set(currentSelectedIds);
      const edgesForDagre = allEdges.filter(e => selectedNodeIdSet.has(e.source) && selectedNodeIdSet.has(e.target)).map(e => ({ source: e.source, target: e.target, id: e.id, label: e.label }));

      let sumX = 0, sumY = 0; let validInitialNodes = 0;
      selectedNodesFromStore.forEach(n => {
        const rfn = reactFlowInstance.getNode(n.id);
        const xPos = rfn?.position?.x ?? n.x; const yPos = rfn?.position?.y ?? n.y;
        if (xPos !== undefined && yPos !== undefined) { sumX += xPos; sumY += yPos; validInitialNodes++; }
      });
      if (validInitialNodes === 0) { toast({ title: "Layout Error", description: "Cannot get initial positions."}); setIsDagreTidying(false); loadingToast.dismiss(); return; }
      const initialCentroidX = sumX / validInitialNodes; const initialCentroidY = sumY / validInitialNodes;

      const dagreUtil = new DagreLayoutUtility();
      const dagreOptions: DagreLayoutOptions = { direction: 'TB', ranksep: 70, nodesep: 70, edgesep: 20, defaultNodeWidth: DEFAULT_NODE_WIDTH, defaultNodeHeight: DEFAULT_NODE_HEIGHT };
      const newRelativePositions = await dagreUtil.layout(nodesForDagre, edgesForDagre, dagreOptions);

      if (!newRelativePositions || newRelativePositions.length === 0) { toast({ title: "Layout Error", description: "Dagre returned no positions."}); setIsDagreTidying(false); loadingToast.dismiss(); return; }

      let sumDagreX = 0, sumDagreY = 0;
      newRelativePositions.forEach(p => {
        const nodeDetails = nodesForDagre.find(n => n.id === p.id);
        sumDagreX += p.x + (nodeDetails?.width || DEFAULT_NODE_WIDTH) / 2;
        sumDagreY += p.y + (nodeDetails?.height || DEFAULT_NODE_HEIGHT) / 2;
      });
      const dagreCentroidX = sumDagreX / newRelativePositions.length; const dagreCentroidY = sumDagreY / newRelativePositions.length;
      const offsetX = initialCentroidX - dagreCentroidX + (nodesForDagre[0]?.width || DEFAULT_NODE_WIDTH)/2;
      const offsetY = initialCentroidY - dagreCentroidY + (nodesForDagre[0]?.height || DEFAULT_NODE_HEIGHT)/2;

      const finalPositions = newRelativePositions.map(p => ({
        id: p.id,
        x: Math.round((p.x + offsetX) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
        y: Math.round((p.y + offsetY) / GRID_SIZE_FOR_AI_PLACEMENT) * GRID_SIZE_FOR_AI_PLACEMENT,
      }));

      // Call setGhostPreview instead of applyLayout directly
      const positionsWithDimensions = finalPositions.map(fp => {
        const nodeDetail = nodesForDagre.find(nfd => nfd.id === fp.id);
        return {
          id: fp.id,
          x: fp.x,
          y: fp.y,
          width: nodeDetail?.width || DEFAULT_NODE_WIDTH,
          height: nodeDetail?.height || DEFAULT_NODE_HEIGHT,
        };
      });
      useConceptMapStore.getState().setGhostPreview(positionsWithDimensions);
      // applyLayout(finalPositions); // Old direct application
      toast({ title: "Layout Preview Ready", description: `Previewing new layout for ${finalPositions.length} nodes. Accept or Cancel via toolbar.` });
    } catch (error) {
      console.error("Dagre layout error:", error);
      toast({ title: "Layout Error", description: `Failed to arrange: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setIsDagreTidying(false);
      loadingToast.dismiss();
    }
  }, [isViewOnlyMode, toast, reactFlowInstance, applyLayout, mapData.nodes, mapData.edges, multiSelectedNodeIds]);

  const getPaneSuggestions = useCallback((): SuggestionAction[] => [], []);
  const getNodeSuggestions = useCallback((_node: RFNode<CustomNodeData>): SuggestionAction[] => [], []);
  const acceptAllExpansionPreviews = useCallback(() => {}, []);
  const acceptSingleExpansionPreview = useCallback((_previewNodeId: string) => {}, []);
  const clearExpansionPreview = useCallback(() => {}, []);
  const openRefineSuggestionModal = useCallback((_previewNodeId: string, _parentNodeId: string) => {}, []);

  return {
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpandDetails, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered, 
    isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen, nodeContentToRewrite, openRewriteNodeContentModal, handleRewriteNodeContentConfirm, 
    isRefineModalOpen, setIsRefineModalOpen, refineModalInitialData, openRefineSuggestionModal, handleRefineSuggestionConfirm,
    handleSuggestIntermediateNodeRequest, // intermediateNodeSuggestion, confirmAddIntermediateNode, clearIntermediateNodeSuggestion removed
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    getPaneSuggestions,
    getNodeSuggestions,
    fetchAIChildTextSuggestions, aiChildTextSuggestions, isLoadingAiChildTexts,
    fetchAndSetEdgeLabelSuggestions, edgeLabelSuggestions, setEdgeLabelSuggestions,
    conceptExpansionPreview, acceptAllExpansionPreviews, acceptSingleExpansionPreview, clearExpansionPreview,
    addStoreNode, addStoreEdge,
    handleAiTidyUpSelection,
    handleDagreLayoutSelection, isDagreTidying,
    askQuestionAboutNode,
    handleSuggestMapImprovements,
    // Map Summary
    handleSummarizeMap: async () => {
      const currentMapData = useConceptMapStore.getState().mapData;
      if (currentMapData.nodes.length === 0) {
        toast({ title: "Empty Map", description: "Cannot summarize an empty map.", variant: "default" });
        return;
      }
      setIsSummarizingMap(true); // Set loading state for the button
      const output = await callAIWithStandardFeedback<GenerateMapSummaryInput, GenerateMapSummaryOutput>(
        "Summarize Map", generateMapSummaryFlow,
        { nodes: currentMapData.nodes, edges: currentMapData.edges },
        {
          loadingMessage: "AI is analyzing and summarizing your map...",
          successTitle: "Map Summary Ready!",
          hideSuccessToast: true, // Summary will be shown in a modal
          processingId: 'summarize-entire-map'
        }
      );
      setIsSummarizingMap(false);
      if (output) {
        setMapSummaryResult(output);
        setIsMapSummaryModalOpen(true);
      } else {
        // Error toast is already handled by callAIWithStandardFeedback
        setMapSummaryResult(null);
      }
    },
    isSummarizingMap,
    mapSummaryResult,
    isMapSummaryModalOpen,
    setIsMapSummaryModalOpen,
    clearMapSummaryResult: () => setMapSummaryResult(null),
  };
}

[end of src/hooks/useConceptMapAITools.ts]
