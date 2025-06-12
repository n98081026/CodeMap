
"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import type { Node as RFNode } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';
import dynamic from 'next/dynamic';

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


const FlowCanvasCore = dynamic(() => import('@/components/concept-map/flow-canvas-core'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>,
});


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
    setMapName: setStoreMapName, setIsPublic: setStoreIsPublic, setSharedWithClassroomId: setStoreSharedWithClassroomId,
    deleteNode: deleteStoreNode, updateNode: updateStoreNode,
    updateEdge: updateStoreEdge,
    setSelectedElement: setStoreSelectedElement, setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds,
    importMapData,
    setIsViewOnlyMode: setStoreIsViewOnlyMode,
    addDebugLog, // Added addDebugLog
  } = useConceptMapStore();

  useEffect(() => {
    // Log storeMapData changes
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
    addStoreNode: addNodeFromHook,
    addStoreEdge: addEdgeFromHook,
    // Ensure getNodePlacement is available if not already destructured, or use aiToolsHook.getNodePlacement
  } = aiToolsHook;

  // Memoized callback for saving the map
  const handleSaveMap = useCallback(() => {
    saveMap(storeIsViewOnlyMode);
  }, [saveMap, storeIsViewOnlyMode]);

  // Memoized callbacks for AI modal triggers
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
    const newNodeText = `Node ${storeMapData.nodes.length + 1}`; // Use storeMapData from store for length
    const { x, y } = aiToolsHook.getNodePlacement(storeMapData.nodes.length, 'generic', null, null, 20);
    addNodeFromHook({ text: newNodeText, type: 'manual-node', position: { x, y } });
    toast({ title: "Node Added", description: `"${newNodeText}" added.`});
  }, [storeIsViewOnlyMode, toast, aiToolsHook.getNodePlacement, addNodeFromHook, storeMapData.nodes]);

  const handleAddEdgeToData = useCallback(() => {
    if (storeIsViewOnlyMode) { toast({ title: "View Only Mode", variant: "default"}); return; }
    const nodes = storeMapData.nodes; // Use storeMapData from store
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
        name: mapName,
        mapData: storeMapData,
        isPublic: isPublic,
        sharedWithClassroomId: sharedWithClassroomId,
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

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    event.preventDefault();
    setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY, nodeId: node.id });
  }, []);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

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
          onSummarizeSelectedNodes={handleSummarizeSelectedNodes} {/* Assumed stable from hook */}
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
              onNodeContextMenu={handleNodeContextMenu}
              onNodeAIExpandTriggered={(nodeId) => aiToolsHook.openExpandConceptModal(nodeId)}
            />
          )}
        </div>
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
      </ReactFlowProvider>
    </div>
  );
}
