"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Node as RFNode, Edge as RFEdge } from 'reactflow';
import { ReactFlowProvider, useReactFlow } from 'reactflow';
import dynamic from 'next/dynamic';
import {
  DagreNodeInput,
  DagreEdgeInput,
  DagreNodeOutput as LayoutNodeUpdate,
} from '@/types/graph-adapter';
import type { ArrangeAction } from "@/components/concept-map/editor-toolbar";
import {
  AlignLeft, AlignCenterHorizontal, AlignRight,
  AlignTop, AlignCenterVertical, AlignBottom,
  Columns, Rows,
} from 'lucide-react';

import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { AISuggestionPanel } from "@/components/concept-map/ai-suggestion-panel";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save, EyeOff, HelpCircle } from "lucide-react";
import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
  AskQuestionModal,
} from "@/components/concept-map/genai-modals";
import { QuickClusterModal } from "@/components/concept-map/quick-cluster-modal";
import { GenerateSnippetModal } from "@/components/concept-map/generate-snippet-modal";
import { RewriteNodeContentModal } from "@/components/concept-map/rewrite-node-content-modal";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from "@/types";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';
import type { CustomNodeData } from '@/components/concept-map/custom-node';

import useConceptMapStore from '@/stores/concept-map-store';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import AISuggestionFloater, { type SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import AIStagingToolbar from '@/components/concept-map/ai-staging-toolbar';
import { Lightbulb, Sparkles, Brain, HelpCircle, CheckCircle, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { suggestSemanticParentNodeFlow, type SuggestSemanticParentOutputSchema, type SuggestSemanticParentInputSchema } from '@/ai/flows';
import * as z from 'zod';


const FlowCanvasCore = dynamic(() => import('@/components/concept-map/flow-canvas-core'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>,
});

const mockDagreLayout = (nodes: DagreNodeInput[], _edges: DagreEdgeInput[]): LayoutNodeUpdate[] => {
  let currentX = 50;
  const nodeY = 100;
  const spacing = 50;

  return nodes.map((node) => {
    const xPos = currentX;
    currentX += (node.width || 150) + spacing;
    return {
      id: node.id,
      x: xPos,
      y: nodeY,
    };
  });
};

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;

export default function ConceptMapEditorPage() {
  const paramsHook = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyModeQueryParam = searchParams.get('viewOnly') === 'true';

  const {
    mapId: storeMapId, mapName, currentMapOwnerId, currentMapCreatedAt, isPublic, sharedWithClassroomId, isNewMapMode, isViewOnlyMode: storeIsViewOnlyMode,
    mapData: storeMapData, isLoading: isStoreLoading, isSaving: isStoreSaving, error: storeError,
    selectedElementId, selectedElementType, multiSelectedNodeIds,
    aiExtractedConcepts, aiSuggestedRelations,
    isStagingActive, stagedMapData: storeStagedMapData,
    commitStagedMapData, clearStagedMapData, deleteFromStagedMapData,
    setMapName: setStoreMapName, setIsPublic: setStoreIsPublic, setSharedWithClassroomId: setStoreSharedWithClassroomId,
    deleteNode: deleteStoreNode, updateNode: updateStoreNode,
    updateEdge: updateStoreEdge,
    setSelectedElement: setStoreSelectedElement, setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds,
    importMapData,
    setIsViewOnlyMode: setStoreIsViewOnlyMode,
    addDebugLog,
    applyLayout,
  } = useConceptMapStore(
    useCallback(s => ({
      mapId: s.mapId, mapName: s.mapName, currentMapOwnerId: s.currentMapOwnerId, currentMapCreatedAt: s.currentMapCreatedAt,
      isPublic: s.isPublic, sharedWithClassroomId: s.sharedWithClassroomId, isNewMapMode: s.isNewMapMode,
      isViewOnlyMode: s.isViewOnlyMode, mapData: s.mapData, isLoading: s.isLoading, isSaving: s.isSaving,
      error: s.error, selectedElementId: s.selectedElementId, selectedElementType: s.selectedElementType,
      multiSelectedNodeIds: s.multiSelectedNodeIds, aiExtractedConcepts: s.aiExtractedConcepts,
      aiSuggestedRelations: s.aiSuggestedRelations,
      isStagingActive: s.isStagingActive, stagedMapData: s.stagedMapData,
      commitStagedMapData: s.commitStagedMapData, clearStagedMapData: s.clearStagedMapData, deleteFromStagedMapData: s.deleteFromStagedMapData,
      setMapName: s.setMapName, setIsPublic: s.setIsPublic, setSharedWithClassroomId: s.setSharedWithClassroomId,
      deleteNode: s.deleteNode, updateNode: s.updateNode, updateEdge: s.updateEdge,
      setSelectedElement: s.setSelectedElement, setMultiSelectedNodeIds: s.setMultiSelectedNodeIds,
      importMapData: s.importMapData, setIsViewOnlyMode: s.setIsViewOnlyMode, addDebugLog: s.addDebugLog,
      applyLayout: s.applyLayout,
    }), [])
  );

  const [aiSemanticGroupSuggestion, setAiSemanticGroupSuggestion] = useState<z.infer<typeof SuggestSemanticParentOutputSchema> | null>(null);
  const [isSuggestGroupDialogOpen, setIsSuggestGroupDialogOpen] = useState(false);
  const [isLoadingSemanticGroup, setIsLoadingSemanticGroup] = useState(false);

  useEffect(() => {
    addDebugLog(`[EditorPage V11] storeMapData processed. Nodes: ${storeMapData.nodes?.length ?? 'N/A'}, Edges: ${storeMapData.edges?.length ?? 'N/A'}. isLoading: ${isStoreLoading}, initialLoadComplete: ${useConceptMapStore.getState().initialLoadComplete}`);
  }, [storeMapData, isStoreLoading, addDebugLog]);

  useEffect(() => {
    setStoreIsViewOnlyMode(isViewOnlyModeQueryParam);
  }, [isViewOnlyModeQueryParam, setStoreIsViewOnlyMode]);

  const temporalStoreAPI = useConceptMapStore.temporal;
  const [temporalState, setTemporalState] = useState(temporalStoreAPI.getState());
  useEffect(() => {
    const unsubscribe = temporalStoreAPI.subscribe(setTemporalState, (state) => state);
    return unsubscribe;
  }, [temporalStoreAPI]);
  const canUndo = temporalState.pastStates.length > 0;
  const canRedo = temporalState.futureStates.length > 0;

  const { saveMap } = useConceptMapDataManager({ routeMapId, user });

  const aiToolsHook = useConceptMapAITools(storeIsViewOnlyMode);
  const {
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpandDetails, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered,
    isRewriteNodeContentModalOpen, setIsRewriteNodeContentModalOpen, nodeContentToRewrite, openRewriteNodeContentModal, handleRewriteNodeContentConfirm,
    handleSummarizeSelectedNodes,
    handleMiniToolbarQuickExpand,
    handleMiniToolbarRewriteConcise,
    addStoreNode: addNodeFromHook,
    addStoreEdge: addEdgeFromHook,
    getPaneSuggestions,
    getNodeSuggestions,
    fetchAndSetEdgeLabelSuggestions,
    fetchAIChildTextSuggestions,
    aiChildTextSuggestions,
    isLoadingAiChildTexts,
    edgeLabelSuggestions,
    setEdgeLabelSuggestions,
    conceptExpansionPreview,
    acceptAllExpansionPreviews,
    acceptSingleExpansionPreview,
    clearExpansionPreview,
    removeExtractedConceptsFromSuggestions,
  } = aiToolsHook;

  const reactFlowInstance = useReactFlow();
  const [selectedStagedElementIds, setSelectedStagedElementIds] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isStagingActive && selectedStagedElementIds.length > 0 && (event.key === 'Delete' || event.key === 'Backspace')) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        event.preventDefault();
        deleteFromStagedMapData(selectedStagedElementIds);
        setSelectedStagedElementIds([]);
        toast({ title: 'Staged Items Deleted', description: `${selectedStagedElementIds.length} item(s) removed from staging area.` });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isStagingActive, selectedStagedElementIds, deleteFromStagedMapData, toast, setSelectedStagedElementIds]);

  const handleSaveMap = useCallback(() => {
    saveMap(storeIsViewOnlyMode);
  }, [saveMap, storeIsViewOnlyMode]);

  const handleExtractConcepts = useCallback(() => {
    openExtractConceptsModal(selectedElementId || undefined);
  }, [openExtractConceptsModal, selectedElementId]);

  const handleSuggestRelations = useCallback(() => {
    openSuggestRelationsModal(selectedElementId || undefined);
  }, [openSuggestRelationsModal, selectedElementId]);

  const handleExpandConcept = useCallback(() => {
    openExpandConceptModal(selectedElementId || undefined);
  }, [openExpandConceptModal, selectedElementId]);

  const handleQuickCluster = useCallback(() => {
    openQuickClusterModal();
  }, [openQuickClusterModal]);

  const handleGenerateSnippetFromText = useCallback(() => {
    openGenerateSnippetModal();
  }, [openGenerateSnippetModal]);

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; nodeId: string | null; } | null>(null);
  const [lastPaneClickPosition, setLastPaneClickPosition] = useState<{ x: number; y: number } | null>(null);

  const [floaterState, setFloaterState] = useState<{
    isVisible: boolean;
    position: { x: number; y: number } | null;
    suggestions: SuggestionAction[];
    contextElementId?: string | null;
    contextType?: 'pane' | 'node' | 'edge' | 'conceptExpansionControls' | null;
    title?: string;
  }>({ isVisible: false, position: null, suggestions: [], contextElementId: null, contextType: null });

  const Floater_handleDismiss = useCallback(() => {
    const currentContextType = floaterState.contextType;
    setFloaterState(prev => ({ ...prev, isVisible: false, contextType: null, contextElementId: null }));
    if (currentContextType === 'edge' && setEdgeLabelSuggestions) {
      setEdgeLabelSuggestions(null);
    } else if (currentContextType === 'conceptExpansionControls' && clearExpansionPreview) {
      clearExpansionPreview();
    }
  }, [floaterState.contextType, setEdgeLabelSuggestions, clearExpansionPreview]);

  useEffect(() => {
    if (edgeLabelSuggestions?.edgeId && edgeLabelSuggestions.labels.length > 0) {
      const edge = reactFlowInstance.getEdge(edgeLabelSuggestions.edgeId);
      const allNodes = reactFlowInstance.getNodes();
      if (edge) {
        const sourceNode = allNodes.find(n => n.id === edge.source);
        const targetNode = allNodes.find(n => n.id === edge.target);
        let screenPos = { x: 0, y: 0 };
        if (sourceNode?.positionAbsolute && targetNode?.positionAbsolute) {
          const midXFlow = (sourceNode.positionAbsolute.x + targetNode.positionAbsolute.x) / 2;
          const midYFlow = (sourceNode.positionAbsolute.y + targetNode.positionAbsolute.y) / 2;
          screenPos = reactFlowInstance.project({ x: midXFlow, y: midYFlow - 30 });
        } else if (sourceNode?.positionAbsolute) {
           screenPos = reactFlowInstance.project({x: sourceNode.positionAbsolute.x + 100, y: sourceNode.positionAbsolute.y - 30});
        } else {
            const pane = reactFlowInstance.getViewport();
            screenPos = {x: pane.x + 300, y: pane.y + 100};
        }
        const edgeFloaterSuggestions: SuggestionAction[] = edgeLabelSuggestions.labels.map(label => ({
          id: `edge-label-${edgeLabelSuggestions.edgeId}-${label.replace(/\s+/g, '-')}`,
          label: label,
          action: () => {
            updateStoreEdge(edgeLabelSuggestions.edgeId, { label: label });
            Floater_handleDismiss();
          }
        }));
        setFloaterState({
          isVisible: true, position: screenPos, suggestions: edgeFloaterSuggestions,
          contextType: 'edge', contextElementId: edgeLabelSuggestions.edgeId, title: "Suggested Edge Labels"
        });
      }
    } else if (floaterState.isVisible && floaterState.contextType === 'edge' && !edgeLabelSuggestions) {
      Floater_handleDismiss();
    }
  }, [edgeLabelSuggestions, reactFlowInstance, updateStoreEdge, Floater_handleDismiss, floaterState.isVisible, floaterState.contextType]);

  const handleAddNodeFromFloater = useCallback((position?: {x: number, y: number}) => {
    if (storeIsViewOnlyMode) { toast({ title: "View Only Mode", variant: "default"}); return; }
    const newNodeText = `Node ${storeMapData.nodes.length + 1}`;
    const { x, y } = position || aiToolsHook.getNodePlacement(storeMapData.nodes.length, 'generic', null, null, 20);
    const newNodeId = addNodeFromHook({ text: newNodeText, type: 'manual-node', position: { x, y } });
    useConceptMapStore.getState().setEditingNodeId(newNodeId);
    toast({ title: "Node Added", description: `"${newNodeText}" added.`});
    Floater_handleDismiss();
  }, [storeIsViewOnlyMode, toast, aiToolsHook.getNodePlacement, addNodeFromHook, storeMapData.nodes, Floater_handleDismiss]);

  const handlePaneContextMenuRequest = useCallback((event: React.MouseEvent, positionInFlow: {x: number, y: number}) => {
    if (storeIsViewOnlyMode) return;
    if (contextMenu?.isOpen) closeContextMenu();
    setLastPaneClickPosition(positionInFlow);
    const rawSuggestions = getPaneSuggestions(positionInFlow);
    const suggestions = rawSuggestions.map(s => {
      if (s.id === 'pane-add-topic') {
        return { ...s, action: () => { s.action(); Floater_handleDismiss(); }};
      }
      return { ...s, action: () => { s.action(); Floater_handleDismiss(); } };
    });
    setFloaterState({ isVisible: true, position: { x: event.clientX, y: event.clientY }, suggestions, contextType: 'pane', contextElementId: null, title: "Pane Actions" });
  }, [storeIsViewOnlyMode, getPaneSuggestions, Floater_handleDismiss, contextMenu?.isOpen, closeContextMenu]);

  const handleNodeContextMenuRequest = useCallback(async (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    if (storeIsViewOnlyMode) return;
    event.preventDefault();
    if (contextMenu?.isOpen) closeContextMenu();
    Floater_handleDismiss();
    if (fetchAIChildTextSuggestions) {
      await fetchAIChildTextSuggestions(node);
    }
    let floaterTitle = "Node Actions";
    if (isLoadingAiChildTexts) {
      floaterTitle = "Loading Ideas...";
    } else if (aiChildTextSuggestions && aiChildTextSuggestions.length > 0) {
      floaterTitle = "Quick Add Ideas";
    }
    const rawSuggestions = getNodeSuggestions(node);
    const suggestions = rawSuggestions.map(s => ({ ...s, action: () => { s.action(); Floater_handleDismiss(); }}));
    setFloaterState({
      isVisible: true, position: { x: event.clientX, y: event.clientY }, suggestions: suggestions,
      contextType: 'node', contextElementId: node.id, title: floaterTitle
    });
  }, [
    storeIsViewOnlyMode, contextMenu?.isOpen, closeContextMenu, Floater_handleDismiss,
    getNodeSuggestions, fetchAIChildTextSuggestions, isLoadingAiChildTexts, aiChildTextSuggestions
  ]);

  const handleCommitStagedData = useCallback(() => {
    commitStagedMapData();
    toast({ title: 'AI Suggestions Committed', description: 'New elements added to your map.' });
  }, [commitStagedMapData, toast]);

  const handleClearStagedData = useCallback(() => {
    clearStagedMapData();
    toast({ title: 'AI Staging Cleared', description: 'AI suggestions have been discarded.' });
  }, [clearStagedMapData, toast]);

  const stagedItemCount = React.useMemo(() => ({
    nodes: storeStagedMapData?.nodes?.length || 0,
    edges: storeStagedMapData?.edges?.length || 0,
  }), [storeStagedMapData]);

  useEffect(() => {
    if (conceptExpansionPreview && conceptExpansionPreview.parentNodeId && reactFlowInstance) {
      const parentNode = reactFlowInstance.getNode(conceptExpansionPreview.parentNodeId);
      if (parentNode && parentNode.positionAbsolute) {
        const screenPos = reactFlowInstance.project({
          x: parentNode.positionAbsolute.x + (parentNode.width || 150) / 2,
          y: parentNode.positionAbsolute.y + (parentNode.height || 70) + 20,
        });
        const expansionControlSuggestions: SuggestionAction[] = [
          { id: 'accept-all-expansion', label: 'Accept All Suggestions', icon: CheckCircle, action: () => { acceptAllExpansionPreviews(); Floater_handleDismiss(); }},
          { id: 'clear-expansion', label: 'Clear All Suggestions', icon: XCircle, action: () => { clearExpansionPreview(); Floater_handleDismiss(); }}
        ];
        if (!floaterState.isVisible || floaterState.contextType === 'conceptExpansionControls') {
          setFloaterState({
            isVisible: true, position: screenPos, suggestions: expansionControlSuggestions,
            contextType: 'conceptExpansionControls', contextElementId: parentNode.id, title: "Expansion Preview Controls"
          });
        }
      }
    } else if (floaterState.isVisible && floaterState.contextType === 'conceptExpansionControls' && !conceptExpansionPreview) {
      Floater_handleDismiss();
    }
  }, [conceptExpansionPreview, reactFlowInstance, acceptAllExpansionPreviews, clearExpansionPreview, floaterState.isVisible, floaterState.contextType, Floater_handleDismiss]);

  const handleConceptSuggestionDrop = useCallback((conceptText: string, position: { x: number; y: number }) => {
    if (storeIsViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot add nodes from suggestions.", variant: "default" });
      return;
    }
    addNodeFromHook({ text: conceptText, type: 'ai-concept', position, details: '' });
    if (removeExtractedConceptsFromSuggestions) {
        removeExtractedConceptsFromSuggestions([conceptText]);
    }
    toast({ title: 'Concept Added', description: `'${conceptText}' added to the map from suggestion.` });
  }, [storeIsViewOnlyMode, addNodeFromHook, removeExtractedConceptsFromSuggestions, toast]);

  const handleMapPropertiesChange = useCallback((properties: { name: string; isPublic: boolean; sharedWithClassroomId: string | null; }) => {
    if (storeIsViewOnlyMode) { toast({ title: "View Only Mode", description: "Map properties cannot be changed.", variant: "default"}); return; }
    setStoreMapName(properties.name);
    setStoreIsPublic(properties.isPublic);
    setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [storeIsViewOnlyMode, toast, setStoreMapName, setStoreIsPublic, setStoreSharedWithClassroomId]);

  const handleFlowSelectionChange = useCallback((elementId: string | null, elementType: 'node' | 'edge' | null) => {
    setStoreSelectedElement(elementId, elementType);
  }, [setStoreSelectedElement]);

  const handleMultiNodeSelectionChange = useCallback((nodeIds: string[]) => {
    setStoreMultiSelectedNodeIds(nodeIds);
  }, [setStoreMultiSelectedNodeIds]);

  const handleAddNodeToData = useCallback(() => {
    if (storeIsViewOnlyMode) { toast({ title: "View Only Mode", variant: "default"}); return; }
    const newNodeText = `Node ${storeMapData.nodes.length + 1}`;
    const { x, y } = aiToolsHook.getNodePlacement(storeMapData.nodes.length, 'generic', null, null, 20);
    addNodeFromHook({ text: newNodeText, type: 'manual-node', position: { x, y } });
    toast({ title: "Node Added", description: `"${newNodeText}" added.`});
  }, [storeIsViewOnlyMode, toast, aiToolsHook.getNodePlacement, addNodeFromHook, storeMapData.nodes]);

  const handleAddEdgeToData = useCallback(() => {
    if (storeIsViewOnlyMode) { toast({ title: "View Only Mode", variant: "default"}); return; }
    const nodes = storeMapData.nodes;
    if (nodes.length < 2) { toast({ title: "Cannot Add Edge", description: "At least two nodes are required to add an edge.", variant: "default" }); return; }
    const sourceNode = nodes[nodes.length - 2]; const targetNode = nodes[nodes.length - 1];
    if (!sourceNode || !targetNode) { toast({ title: "Error Adding Edge", description: "Source or target node for edge not found.", variant: "destructive"}); return; }
    addEdgeFromHook({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added" });
  }, [storeIsViewOnlyMode, toast, addEdgeFromHook, storeMapData.nodes]);

  const getRoleBasedDashboardLink = useCallback(() => { return user ? `/application/${user.role}/dashboard` : '/login'; }, [user]);
  const getBackLink = useCallback(() => { return user && user.role === UserRole.TEACHER ? "/application/teacher/classrooms" : "/application/student/concept-maps"; }, [user]);
  const getBackButtonText = useCallback(() => { return user && user.role === UserRole.TEACHER ? "Back to Classrooms" : "Back to My Maps"; }, [user]);

  const onTogglePropertiesInspector = useCallback(() => setIsPropertiesInspectorOpen(prev => !prev), []);
  const onToggleAiPanel = useCallback(() => setIsAiPanelOpen(prev => !prev), []);

  let mapForInspector: ConceptMap | null = (storeMapId && storeMapId !== 'new' && currentMapOwnerId) ? {
    id: storeMapId, name: mapName, ownerId: currentMapOwnerId, mapData: storeMapData, isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId, createdAt: currentMapCreatedAt || "", updatedAt: new Date().toISOString(),
  } : null;
  if ((isNewMapMode || storeMapId === 'new') && !mapForInspector && user) {
      mapForInspector = { id: 'new', name: mapName, ownerId: user.id, mapData: storeMapData, isPublic: isPublic,
                          sharedWithClassroomId: sharedWithClassroomId, createdAt: currentMapCreatedAt || "", updatedAt: new Date().toISOString() };
  }
  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    actualSelectedElementForInspector = selectedElementType === 'node' ? storeMapData.nodes.find(n => n.id === selectedElementId) || null : storeMapData.edges.find(e => e.id === selectedElementId) || null;
  }
  const canAddEdge = storeMapData.nodes.length >= 2;

  const handleNewMap = useCallback(() => { router.push('/application/concept-maps/editor/new'); }, [router]);

  const handleExportMap = useCallback(() => {
    const mapToExport = {
        name: mapName, mapData: storeMapData, isPublic: isPublic, sharedWithClassroomId: sharedWithClassroomId,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mapToExport, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${mapName.replace(/\s+/g, '_') || 'concept_map'}.json`;
    link.click();
    toast({title: "Map Exported", description: `${mapName}.json has been downloaded.`});
  }, [mapName, storeMapData, isPublic, sharedWithClassroomId, toast]);

  const handleTriggerImport = useCallback(() => {
    if (!storeIsViewOnlyMode) fileInputRef.current?.click();
    else toast({title: "View Only Mode", description: "Import disabled."})
  }, [storeIsViewOnlyMode, toast]);

  const handleFileSelectedForImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (storeIsViewOnlyMode) return;
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const fileContent = await file.text();
      const importedJson = JSON.parse(fileContent);
      if (typeof importedJson.mapData !== 'object' || !Array.isArray(importedJson.mapData.nodes) || !Array.isArray(importedJson.mapData.edges)) {
        throw new Error("Invalid map data structure in JSON file.");
      }
      importMapData(importedJson.mapData, importedJson.name || file.name.replace(/\.json$/i, ''));
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Imported", description: `"${importedJson.name || file.name}" loaded successfully.`});
    } catch (e) {
      toast({ title: "Import Failed", description: `Error importing map: ${(e as Error).message}`, variant: "destructive"});
    }
    if(fileInputRef.current) fileInputRef.current.value = "";
  }, [storeIsViewOnlyMode, toast, importMapData, temporalStoreAPI]);

  const handleAutoLayout = useCallback(async () => {
    addDebugLog('[EditorPage] handleAutoLayout triggered.');
    if (storeIsViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Auto-layout is disabled in view-only mode.", variant: "default" });
      addDebugLog('[EditorPage] Auto-layout skipped: view-only mode.');
      return;
    }
    if (storeMapData.nodes.length === 0) {
      toast({ title: "Empty Map", description: "Cannot apply layout to an empty map.", variant: "default" });
      addDebugLog('[EditorPage] Auto-layout skipped: empty map.');
      return;
    }
    const loadingToast = toast({
      title: 'Applying Auto Layout...',
      description: <div className="flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait.</div>,
      duration: Infinity,
    });
    addDebugLog('[EditorPage] Auto-layout processing started.');
    try {
      const dagreNodes: DagreNodeInput[] = storeMapData.nodes.map(node => ({
        id: node.id, width: node.width || 150, height: node.height || 70,
      }));
      const dagreEdges: DagreEdgeInput[] = storeMapData.edges.map(edge => ({
        source: edge.source, target: edge.target,
      }));
      addDebugLog(`[EditorPage] Prepared ${dagreNodes.length} nodes and ${dagreEdges.length} edges for layout.`);
      const newPositions = mockDagreLayout(dagreNodes, dagreEdges);
      addDebugLog(`[EditorPage] Layout calculated. ${newPositions.length} new positions received.`);
      applyLayout(newPositions);
      addDebugLog('[EditorPage] applyLayout action called.');
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView();
          addDebugLog('[EditorPage] reactFlowInstance.fitView() called.');
        }
      }, 100);
      loadingToast.dismiss();
      toast({ title: "Layout Applied", description: "Nodes have been automatically arranged.", variant: "default" });
      addDebugLog('[EditorPage] Auto-layout successfully applied.');
    } catch (error) {
      addDebugLog(`[EditorPage] Error during auto-layout: ${error instanceof Error ? error.message : String(error)}`);
      loadingToast.dismiss();
      toast({
        title: "Layout Error",
        description: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  }, [ storeIsViewOnlyMode, storeMapData.nodes, storeMapData.edges, applyLayout, toast, reactFlowInstance, addDebugLog]);

  const handleStartConnectionFromNode = useCallback((nodeId: string) => {
    if (storeIsViewOnlyMode) {
      toast({ title: "View Only Mode", description: "Cannot start connections.", variant: "default" });
      return;
    }
    useConceptMapStore.getState().startConnectionMode(nodeId);
    addDebugLog(`[EditorPage] Start connection mode initiated from node: ${nodeId}`);
    toast({ title: "Start Connection", description: "Click on a target node to complete the edge.", duration: 3000 });
  }, [storeIsViewOnlyMode, toast, addDebugLog]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    event.preventDefault();
    setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleAlignLefts = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const minX = Math.min(...selectedNodes.map(n => n.x));
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({ id: n.id, x: minX, y: n.y }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to left." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleAlignCentersH = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const avgCenterX = selectedNodes.reduce((sum, n) => sum + (n.x + (n.width || DEFAULT_NODE_WIDTH) / 2), 0) / selectedNodes.length;
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({
      id: n.id,
      x: avgCenterX - (n.width || DEFAULT_NODE_WIDTH) / 2,
      y: n.y
    }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to horizontal center." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleAlignRights = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const maxRight = Math.max(...selectedNodes.map(n => n.x + (n.width || DEFAULT_NODE_WIDTH)));
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({
      id: n.id,
      x: maxRight - (n.width || DEFAULT_NODE_WIDTH),
      y: n.y
    }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to right." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleAlignTops = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const minY = Math.min(...selectedNodes.map(n => n.y));
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({ id: n.id, x: n.x, y: minY }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to top." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleAlignMiddlesV = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const avgCenterY = selectedNodes.reduce((sum, n) => sum + (n.y + (n.height || DEFAULT_NODE_HEIGHT) / 2), 0) / selectedNodes.length;
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({
      id: n.id,
      x: n.x,
      y: avgCenterY - (n.height || DEFAULT_NODE_HEIGHT) / 2
    }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to vertical middle." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleAlignBottoms = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Action Denied", description: "Select at least two nodes to arrange.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id));
    if (selectedNodes.length < 2) return;

    const maxBottom = Math.max(...selectedNodes.map(n => n.y + (n.height || DEFAULT_NODE_HEIGHT)));
    const updates: LayoutNodeUpdate[] = selectedNodes.map(n => ({
      id: n.id,
      x: n.x,
      y: maxBottom - (n.height || DEFAULT_NODE_HEIGHT)
    }));
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes aligned to bottom." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleDistributeHorizontally = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 3) {
      toast({ title: "Action Denied", description: "Select at least three nodes to distribute.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id)).sort((a, b) => a.x - b.x);
    if (selectedNodes.length < 3) return;

    const firstNode = selectedNodes[0];
    const lastNode = selectedNodes[selectedNodes.length - 1];
    const totalSpan = (lastNode.x + (lastNode.width || DEFAULT_NODE_WIDTH)) - firstNode.x;
    const sumOfNodeWidths = selectedNodes.reduce((sum, n) => sum + (n.width || DEFAULT_NODE_WIDTH), 0);

    if (totalSpan <= sumOfNodeWidths) {
        toast({ title: "Arrange Action", description: "Not enough space to distribute horizontally. Try moving nodes further apart.", variant: "default" });
        return;
    }

    const totalGapSpace = totalSpan - sumOfNodeWidths;
    const gap = totalGapSpace / (selectedNodes.length - 1);

    const updates: LayoutNodeUpdate[] = [];
    let currentX = firstNode.x;
    updates.push({ id: firstNode.id, x: firstNode.x, y: firstNode.y });

    for (let i = 1; i < selectedNodes.length; i++) {
      const prevNodeInLoop = selectedNodes[i-1];
      const prevNodeProcessedX = updates.find(u => u.id === prevNodeInLoop.id)?.x ?? prevNodeInLoop.x;

      currentX = prevNodeProcessedX + (prevNodeInLoop.width || DEFAULT_NODE_WIDTH) + gap;
      updates.push({ id: selectedNodes[i].id, x: currentX, y: selectedNodes[i].y });
    }
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes distributed horizontally." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const handleDistributeVertically = useCallback(() => {
    const { multiSelectedNodeIds: currentMultiSelectedNodeIds, mapData: currentMapData } = useConceptMapStore.getState();
    if (storeIsViewOnlyMode || currentMultiSelectedNodeIds.length < 3) {
      toast({ title: "Action Denied", description: "Select at least three nodes to distribute.", variant: "default" }); return;
    }
    const selectedNodes = currentMapData.nodes.filter(n => currentMultiSelectedNodeIds.includes(n.id)).sort((a, b) => a.y - b.y);
    if (selectedNodes.length < 3) return;

    const firstNode = selectedNodes[0];
    const lastNode = selectedNodes[selectedNodes.length - 1];
    const totalSpan = (lastNode.y + (lastNode.height || DEFAULT_NODE_HEIGHT)) - firstNode.y;
    const sumOfNodeHeights = selectedNodes.reduce((sum, n) => sum + (n.height || DEFAULT_NODE_HEIGHT), 0);

    if (totalSpan <= sumOfNodeHeights) {
        toast({ title: "Arrange Action", description: "Not enough space to distribute vertically. Try moving nodes further apart.", variant: "default" });
        return;
    }

    const totalGapSpace = totalSpan - sumOfNodeHeights;
    const gap = totalGapSpace / (selectedNodes.length - 1);

    const updates: LayoutNodeUpdate[] = [];
    let currentY = firstNode.y;
    updates.push({ id: firstNode.id, x: firstNode.x, y: currentY });

    for (let i = 1; i < selectedNodes.length; i++) {
      const prevNodeInLoop = selectedNodes[i-1];
      const prevNodeProcessedY = updates.find(u => u.id === prevNodeInLoop.id)?.y || prevNodeInLoop.y;

      currentY = prevNodeProcessedY + (prevNodeInLoop.height || DEFAULT_NODE_HEIGHT) + gap;
      updates.push({ id: selectedNodes[i].id, x: selectedNodes[i].x, y: currentY });
    }
    if (updates.length > 0) applyLayout(updates);
    toast({ title: "Arrange Action", description: "Nodes distributed vertically." });
  }, [storeIsViewOnlyMode, toast, applyLayout, storeMapData, multiSelectedNodeIds]);

  const arrangeActions = React.useMemo<ArrangeAction[]>(() => [
    { id: 'alignLeft', label: 'Align Lefts', icon: AlignLeft, action: handleAlignLefts },
    { id: 'alignCenterH', label: 'Align Centers (H)', icon: AlignCenterHorizontal, action: handleAlignCentersH },
    { id: 'alignRight', label: 'Align Rights', icon: AlignRight, action: handleAlignRights },
    { id: 'sep1', label: 'sep1', isSeparator: true, action: () => {} },
    { id: 'alignTop', label: 'Align Tops', icon: AlignTop, action: handleAlignTops },
    { id: 'alignMiddleV', label: 'Align Middles (V)', icon: AlignCenterVertical, action: handleAlignMiddlesV },
    { id: 'alignBottom', label: 'Align Bottoms', icon: AlignBottom, action: handleAlignBottoms },
    { id: 'sep2', label: 'sep2', isSeparator: true, action: () => {} },
    { id: 'distH', label: 'Distribute Horizontally', icon: Columns, action: handleDistributeHorizontally },
    { id: 'distV', label: 'Distribute Vertically', icon: Rows, action: handleDistributeVertically },
  ], [
    handleAlignLefts, handleAlignCentersH, handleAlignRights,
    handleAlignTops, handleAlignMiddlesV, handleAlignBottoms,
    handleDistributeHorizontally, handleDistributeVertically
  ]);

  const handleTriggerAISemanticGroup = useCallback(async () => {
    if (isLoadingSemanticGroup) {
      toast({ title: "AI Busy", description: "An AI grouping suggestion is already in progress.", variant: "default" });
      return;
    }
    // Retrieve current isViewOnlyMode and multiSelectedNodeIds from store for the checks
    const currentStoreState = useConceptMapStore.getState();
    const currentIsViewOnlyMode = currentStoreState.isViewOnlyMode;
    const currentMultiSelectedNodeIds = currentStoreState.multiSelectedNodeIds;

    if (currentIsViewOnlyMode) {
      toast({ title: "View Only Mode", description: "AI Grouping suggestion is disabled.", variant: "default" });
      return;
    }
    if (currentMultiSelectedNodeIds.length < 2) {
      toast({ title: "Selection Required", description: "Please select at least two nodes to suggest an AI group.", variant: "default" });
      return;
    }

    setIsLoadingSemanticGroup(true);
    const loadingToastId = toast({ title: "AI Suggesting Group...", description: "Analyzing selected nodes...", duration: Infinity }).id;
    addDebugLog(`[EditorPage] AI Semantic Grouping triggered for ${currentMultiSelectedNodeIds.length} nodes.`);

    const allNodes = currentStoreState.mapData.nodes;
    const selectedNodesContent = currentMultiSelectedNodeIds
      .map(id => allNodes.find(node => node.id === id))
      .filter(node => !!node) // Filter out any undefined nodes (shouldn't happen if IDs are valid)
      .map(node => ({ id: node!.id, text: node!.text, details: node!.details }));

    try {
      const result = await suggestSemanticParentNodeFlow({ selectedNodesContent });
      setAiSemanticGroupSuggestion(result);
      setIsSuggestGroupDialogOpen(true); // This will open the dialog (dialog UI to be built in next step)
      toast.dismiss(loadingToastId);
      toast({ title: "AI Suggestion Ready", description: "Review the proposed parent group." });
      addDebugLog(`[EditorPage] AI Semantic Grouping suggestion received: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error("Error suggesting semantic group:", error);
      addDebugLog(`[EditorPage] Error suggesting semantic group: ${(error as Error).message}`);
      toast.dismiss(loadingToastId);
      toast({ title: "AI Grouping Error", description: (error as Error).message || "Could not get group suggestion.", variant: "destructive" });
      setAiSemanticGroupSuggestion(null);
    } finally {
      setIsLoadingSemanticGroup(false);
    }
  }, [toast, addDebugLog]);

  const handleConfirmAISemanticGroup = useCallback(async () => {
    if (!aiSemanticGroupSuggestion || multiSelectedNodeIds.length < 2) {
      addDebugLog('[EditorPage] AI Semantic Group confirmation skipped: No suggestion or not enough nodes.');
      return;
    }

    const selectedNodesData = storeMapData.nodes.filter(node => multiSelectedNodeIds.includes(node.id));
    if (selectedNodesData.length === 0) {
      toast({ title: "Error", description: "Selected nodes not found.", variant: "destructive" });
      addDebugLog('[EditorPage] AI Semantic Group confirmation error: Selected nodes data not found.');
      return;
    }

    let totalX = 0;
    let totalY = 0;
    selectedNodesData.forEach(node => {
      totalX += (node.x ?? 0) + (node.width || DEFAULT_NODE_WIDTH) / 2;
      totalY += (node.y ?? 0) + (node.height || DEFAULT_NODE_HEIGHT) / 2;
    });
    const averageCenterX = totalX / selectedNodesData.length;
    const averageCenterY = totalY / selectedNodesData.length;

    const newParentX = averageCenterX - DEFAULT_NODE_WIDTH / 2;
    const newParentY = averageCenterY - DEFAULT_NODE_HEIGHT / 2;

    addDebugLog(`[EditorPage] Confirming AI Semantic Group. Parent: "${aiSemanticGroupSuggestion.parentNodeText}". Children: ${multiSelectedNodeIds.join(', ')}`);

    try {
      // 1. Add the new parent node
      const newParentNodeId = addNodeFromHook({
        text: aiSemanticGroupSuggestion.parentNodeText,
        position: { x: newParentX, y: newParentY },
        type: 'ai-group-parent', // Consider making this a distinct type
        // childIds will be set in a subsequent updateNode call for clarity and to ensure parent exists
      });
      addDebugLog(`[EditorPage] New parent node added with ID: ${newParentNodeId}`);

      // 2. Update children to link to the new parent
      for (const childId of multiSelectedNodeIds) {
        updateStoreNode(childId, { parentNode: newParentNodeId });
        addDebugLog(`[EditorPage] Updated child node ${childId} to link to parent ${newParentNodeId}`);
      }

      // 3. Update the parent node with its new children
      updateStoreNode(newParentNodeId, { childIds: multiSelectedNodeIds });
      addDebugLog(`[EditorPage] Updated parent node ${newParentNodeId} with childIds: ${multiSelectedNodeIds.join(', ')}`);

      toast({ title: "AI Group Created", description: `Nodes grouped under '${aiSemanticGroupSuggestion.parentNodeText}'.` });
      setIsSuggestGroupDialogOpen(false);
      setAiSemanticGroupSuggestion(null);
      // Optionally, clear multi-selected nodes or select the new parent node
      // setStoreMultiSelectedNodeIds([]);
      // setStoreSelectedElement(newParentNodeId, 'node');

    } catch (error) {
      console.error("Error confirming AI semantic group:", error);
      addDebugLog(`[EditorPage] Error confirming AI semantic group: ${(error as Error).message}`);
      toast({ title: "Grouping Error", description: "Could not create the group. " + (error as Error).message, variant: "destructive" });
    }
  }, [
    aiSemanticGroupSuggestion,
    multiSelectedNodeIds,
    storeMapData.nodes,
    addNodeFromHook,
    updateStoreNode,
    toast,
    addDebugLog,
    setAiSemanticGroupSuggestion, // ensure state setters are included if they are used
    setIsSuggestGroupDialogOpen
  ]);

  const handleDeleteNodeFromContextMenu = useCallback((nodeId: string) => {
    if(!storeIsViewOnlyMode) deleteStoreNode(nodeId);
    closeContextMenu();
  }, [storeIsViewOnlyMode, deleteStoreNode, closeContextMenu]);

  const handleSelectedElementPropertyUpdateInspector = useCallback((updates: any) => {
    if (storeIsViewOnlyMode || !selectedElementId || !selectedElementType ) return;
    if (selectedElementType === 'node') updateStoreNode(selectedElementId, updates);
    else if (selectedElementType === 'edge') updateStoreEdge(selectedElementId, updates);
  }, [storeIsViewOnlyMode, selectedElementId, selectedElementType, updateStoreNode, updateStoreEdge]);

  if (isStoreLoading && !storeError) { return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>; }
  if (storeError) { return <div className="p-4 text-destructive flex flex-col items-center justify-center h-full gap-4"><AlertTriangle className="h-10 w-10" /> <p>{storeError}</p> <Button asChild><Link href={getBackLink()}>{getBackButtonText()}</Link></Button></div>; }

  const showEmptyMapMessage =
    !isStoreLoading &&
    useConceptMapStore.getState().initialLoadComplete &&
    !storeError &&
    routeMapId !== 'new' &&
    storeMapData.nodes.length === 0 &&
    storeMapId === routeMapId;

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col">
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelectedForImport} style={{ display: 'none' }} disabled={storeIsViewOnlyMode} />
      <DashboardHeader
        title={mapName}
        description={storeIsViewOnlyMode ? "Currently in view-only mode." : "Create, edit, and visualize your ideas."}
        icon={storeIsViewOnlyMode ? EyeOff : (isNewMapMode || storeMapId === 'new') ? Compass : Share2}
        iconLinkHref={getRoleBasedDashboardLink()}
      >
        {!storeIsViewOnlyMode && <Button onClick={handleSaveMap} disabled={isStoreSaving || storeIsViewOnlyMode}>{isStoreSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>}
        <Button asChild variant="outline"><Link href={getBackLink()}><ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()}</Link></Button>
      </DashboardHeader>
      <ReactFlowProvider>
        <EditorToolbar
          onNewMap={handleNewMap}
          onSaveMap={handleSaveMap}
          isSaving={isStoreSaving}
          onExportMap={handleExportMap}
          onTriggerImport={handleTriggerImport}
          onExtractConcepts={handleExtractConcepts}
          onSuggestRelations={handleSuggestRelations}
          onExpandConcept={handleExpandConcept}
          onQuickCluster={handleQuickCluster}
          onGenerateSnippetFromText={handleGenerateSnippetFromText}
          onSummarizeSelectedNodes={handleSummarizeSelectedNodes}
          isViewOnlyMode={storeIsViewOnlyMode}
          onAddNodeToData={handleAddNodeToData}
          onAddEdgeToData={handleAddEdgeToData}
          canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector}
          onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen} isAiPanelOpen={isAiPanelOpen}
          onUndo={temporalStoreAPI.getState().undo} onRedo={temporalStoreAPI.getState().redo} canUndo={canUndo} canRedo={canRedo}
          selectedNodeId={selectedElementType === 'node' ? selectedElementId : null}
          numMultiSelectedNodes={multiSelectedNodeIds.length}
          onAutoLayout={handleAutoLayout}
          arrangeActions={arrangeActions}
          onSuggestAISemanticGroup={handleTriggerAISemanticGroup}
        />
        <div className="flex-grow relative overflow-hidden">
          {showEmptyMapMessage ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
              <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Map Loaded, But It's Empty</h3>
              <p className="text-muted-foreground">
                This concept map was loaded successfully but currently has no nodes.
              </p>
              <p className="text-muted-foreground mt-1">
                You can start building it by adding nodes using the toolbar above.
              </p>
            </div>
          ) : (
            <FlowCanvasCore
              mapDataFromStore={storeMapData} isViewOnlyMode={storeIsViewOnlyMode}
              onSelectionChange={handleFlowSelectionChange} onMultiNodeSelectionChange={handleMultiNodeSelectionChange}
              onNodesChangeInStore={updateStoreNode}
              onNodesDeleteInStore={deleteStoreNode}
              onEdgesDeleteInStore={(edgeId) => useConceptMapStore.getState().deleteEdge(edgeId)}
              onConnectInStore={addEdgeFromHook}
              onNodeContextMenuRequest={handleNodeContextMenuRequest}
              onPaneContextMenuRequest={handlePaneContextMenuRequest}
              onStagedElementsSelectionChange={setSelectedStagedElementIds}
              onNewEdgeSuggestLabels={fetchAndSetEdgeLabelSuggestions}
              onGhostNodeAcceptRequest={acceptSingleExpansionPreview}
              onConceptSuggestionDrop={handleConceptSuggestionDrop}
              onNodeAIExpandTriggered={(nodeId) => aiToolsHook.openExpandConceptModal(nodeId)}
              onNodeStartConnectionRequest={handleStartConnectionFromNode}
            />
          )}
        </div>
        <AIStagingToolbar
          isVisible={isStagingActive}
          onCommit={handleCommitStagedData}
          onClear={handleClearStagedData}
          stagedItemCount={stagedItemCount}
        />
        <AISuggestionFloater
          isVisible={floaterState.isVisible}
          position={floaterState.position || { x: 0, y: 0 }}
          suggestions={floaterState.suggestions}
          onDismiss={Floater_handleDismiss}
          title={floaterState.title || (floaterState.contextType === 'pane' ? "Pane Actions" : floaterState.contextType === 'node' ? "Node Actions" : "Quick Actions")}
        />
        {contextMenu?.isOpen && contextMenu.nodeId && (
          <NodeContextMenu x={contextMenu.x} y={contextMenu.y} nodeId={contextMenu.nodeId} onClose={closeContextMenu}
            onDeleteNode={handleDeleteNodeFromContextMenu}
            onExpandConcept={() => { openExpandConceptModal(contextMenu.nodeId!); closeContextMenu(); }}
            onSuggestRelations={() => { openSuggestRelationsModal(contextMenu.nodeId!); closeContextMenu(); }}
            onExtractConcepts={() => { openExtractConceptsModal(contextMenu.nodeId!); closeContextMenu(); }}
            onAskQuestion={() => { openAskQuestionModal(contextMenu.nodeId!); closeContextMenu(); }}
            onRewriteContent={() => { openRewriteNodeContentModal(contextMenu.nodeId!); closeContextMenu(); }}
            isViewOnlyMode={storeIsViewOnlyMode} />
        )}
        <Sheet open={isPropertiesInspectorOpen} onOpenChange={setIsPropertiesInspectorOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <PropertiesInspector currentMap={mapForInspector} onMapPropertiesChange={handleMapPropertiesChange}
              selectedElement={actualSelectedElementForInspector} selectedElementType={selectedElementType}
              onSelectedElementPropertyUpdate={handleSelectedElementPropertyUpdateInspector}
              isNewMapMode={isNewMapMode} isViewOnlyMode={storeIsViewOnlyMode} />
          </SheetContent>
        </Sheet>
        <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
          <SheetContent side="bottom" className="h-[40vh] sm:h-1/3">
            <AISuggestionPanel currentMapNodes={storeMapData.nodes}
              extractedConcepts={aiExtractedConcepts} suggestedRelations={aiSuggestedRelations}
              onAddExtractedConcepts={addExtractedConceptsToMap} onAddSuggestedRelations={addSuggestedRelationsToMap}
              onClearExtractedConcepts={() => useConceptMapStore.getState().setAiExtractedConcepts([])}
              onClearSuggestedRelations={() => useConceptMapStore.getState().setAiSuggestedRelations([])}
              isViewOnlyMode={storeIsViewOnlyMode} />
          </SheetContent>
        </Sheet>
        {isExtractConceptsModalOpen && !storeIsViewOnlyMode && <ExtractConceptsModal initialText={textForExtraction} onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen} />}
        {isSuggestRelationsModalOpen && !storeIsViewOnlyMode && <SuggestRelationsModal initialConcepts={conceptsForRelationSuggestion} onRelationsSuggested={handleRelationsSuggested} onOpenChange={setIsSuggestRelationsModalOpen} />}
        {isExpandConceptModalOpen && !storeIsViewOnlyMode && conceptToExpandDetails && (
          <ExpandConceptModal
            initialConceptText={conceptToExpandDetails.text}
            existingMapContext={mapContextForExpansion}
            onConceptExpanded={handleConceptExpanded}
            onOpenChange={setIsExpandConceptModalOpen}
          />
        )}
        {isQuickClusterModalOpen && !storeIsViewOnlyMode && <QuickClusterModal isOpen={isQuickClusterModalOpen} onOpenChange={setIsQuickClusterModalOpen} onClusterGenerated={handleClusterGenerated} />}
        {isGenerateSnippetModalOpen && !storeIsViewOnlyMode && <GenerateSnippetModal isOpen={isGenerateSnippetModalOpen} onOpenChange={setIsGenerateSnippetModalOpen} onSnippetGenerated={handleSnippetGenerated} />}
        {isAskQuestionModalOpen && !storeIsViewOnlyMode && nodeContextForQuestion && <AskQuestionModal nodeContext={nodeContextForQuestion} onQuestionAnswered={handleQuestionAnswered} onOpenChange={setIsAskQuestionModalOpen} />}
        {isRewriteNodeContentModalOpen && !storeIsViewOnlyMode && nodeContentToRewrite && <RewriteNodeContentModal nodeContent={nodeContentToRewrite} onRewriteConfirm={handleRewriteNodeContentConfirm} onOpenChange={setIsRewriteNodeContentModalOpen} />}

        {aiSemanticGroupSuggestion && (
          <AlertDialog open={isSuggestGroupDialogOpen} onOpenChange={(open) => {
            setIsSuggestGroupDialogOpen(open);
            if (!open) setAiSemanticGroupSuggestion(null); // Clear suggestion if dialog is closed
          }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>AI Grouping Suggestion</AlertDialogTitle>
                <AlertDialogDescription>
                  AI suggests grouping the selected {multiSelectedNodeIds.length} nodes under a new parent node:
                  <strong className="block mt-2 mb-1">{aiSemanticGroupSuggestion.parentNodeText}</strong>
                  {aiSemanticGroupSuggestion.groupingReason && (
                    <span className="text-xs text-muted-foreground">Reason: {aiSemanticGroupSuggestion.groupingReason}</span>
                  )}
                  <p className="mt-3 text-sm">If you confirm, the selected nodes will be structurally linked to this new parent.</p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => {
                  setAiSemanticGroupSuggestion(null);
                  // setIsSuggestGroupDialogOpen(false); // onOpenChange handles this
                }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmAISemanticGroup}>Confirm & Group</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </ReactFlowProvider>
    </div>
  );
}
