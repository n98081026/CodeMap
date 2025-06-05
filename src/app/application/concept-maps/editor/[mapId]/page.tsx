
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
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
  AskQuestionModal,
} from "@/components/concept-map/genai-modals";
import { QuickClusterModal } from "@/components/concept-map/quick-cluster-modal";
import { GenerateSnippetModal } from "@/components/concept-map/generate-snippet-modal";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from "@/types";
// import { UserRole } from "@/types"; // UserRole not directly used here
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
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true';

  const {
    mapId: storeMapId, mapName, currentMapOwnerId, currentMapCreatedAt, isPublic, sharedWithClassroomId, isNewMapMode,
    mapData: storeMapData, isLoading: isStoreLoading, isSaving: isStoreSaving, error: storeError,
    selectedElementId, selectedElementType,
    aiExtractedConcepts, aiSuggestedRelations, aiExpandedConcepts,
    setMapName: setStoreMapName, setIsPublic: setStoreIsPublic, setSharedWithClassroomId: setStoreSharedWithClassroomId,
    deleteNode: deleteStoreNode, updateNode: updateStoreNode,
    updateEdge: updateStoreEdge,
    setSelectedElement: setStoreSelectedElement, setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds,
    importMapData,
  } = useConceptMapStore();

  const temporalStoreAPI = useConceptMapStore.temporal;
  const [temporalState, setTemporalState] = useState(temporalStoreAPI.getState());
  useEffect(() => {
    const unsubscribe = temporalStoreAPI.subscribe(setTemporalState, (state) => state);
    return unsubscribe;
  }, [temporalStoreAPI]);
  const canUndo = temporalState.pastStates.length > 0;
  const canRedo = temporalState.futureStates.length > 0;

  const { saveMap } = useConceptMapDataManager({ routeMapId, user });

  const {
    isExtractConceptsModalOpen, setIsExtractConceptsModalOpen, textForExtraction, openExtractConceptsModal, handleConceptsExtracted, addExtractedConceptsToMap,
    isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen, conceptsForRelationSuggestion, openSuggestRelationsModal, handleRelationsSuggested, addSuggestedRelationsToMap,
    isExpandConceptModalOpen, setIsExpandConceptModalOpen, conceptToExpand, mapContextForExpansion, openExpandConceptModal, handleConceptExpanded, addExpandedConceptsToMap,
    isQuickClusterModalOpen, setIsQuickClusterModalOpen, openQuickClusterModal, handleClusterGenerated,
    isGenerateSnippetModalOpen, setIsGenerateSnippetModalOpen, openGenerateSnippetModal, handleSnippetGenerated,
    isAskQuestionModalOpen, setIsAskQuestionModalOpen, nodeContextForQuestion, openAskQuestionModal, handleQuestionAnswered,
    handleSummarizeSelectedNodes, // Get the new handler from the hook
  } = useConceptMapAITools(isViewOnlyMode);


  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{ isOpen: boolean; x: number; y: number; nodeId: string | null; } | null>(null);

  const handleMapPropertiesChange = useCallback((properties: { name: string; isPublic: boolean; sharedWithClassroomId: string | null; }) => {
    if (isViewOnlyMode) { toast({ title: "View Only Mode", variant: "default"}); return; }
    setStoreMapName(properties.name);
    setStoreIsPublic(properties.isPublic);
    setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [isViewOnlyMode, toast, setStoreMapName, setStoreIsPublic, setStoreSharedWithClassroomId]);

  const handleFlowSelectionChange = useCallback((elementId: string | null, elementType: 'node' | 'edge' | null) => {
    setStoreSelectedElement(elementId, elementType);
  }, [setStoreSelectedElement]);

  const handleMultiNodeSelectionChange = useCallback((nodeIds: string[]) => {
    setStoreMultiSelectedNodeIds(nodeIds);
  }, [setStoreMultiSelectedNodeIds]);
  
  const aiToolsHook = useConceptMapAITools(isViewOnlyMode);

  const handleAddNodeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`;
    const { x, y } = aiToolsHook.getNodePlacementPosition(useConceptMapStore.getState().mapData.nodes.length);
    aiToolsHook.addStoreNode({ text: newNodeText, type: 'manual-node', position: { x, y } });
    toast({ title: "Node Added", description: `"${newNodeText}" added.`});
  }, [isViewOnlyMode, toast, aiToolsHook]);

  const handleAddEdgeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const nodes = useConceptMapStore.getState().mapData.nodes;
    if (nodes.length < 2) { toast({ title: "Cannot Add Edge", variant: "default" }); return; }
    const sourceNode = nodes[nodes.length - 2]; const targetNode = nodes[nodes.length - 1];
    if (!sourceNode || !targetNode) { toast({ title: "Error Adding Edge", variant: "destructive"}); return; }
    aiToolsHook.addStoreEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added" });
  }, [isViewOnlyMode, toast, aiToolsHook]);

  const getRoleBasedDashboardLink = useCallback(() => { return user ? `/application/${user.role}/dashboard` : '/login'; }, [user]);
  const getBackLink = useCallback(() => { return "/application/student/concept-maps"; }, []);
  const getBackButtonText = useCallback(() => { return "Back to My Maps"; }, []);

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

  const handleTriggerImport = useCallback(() => { if (!isViewOnlyMode) fileInputRef.current?.click(); }, [isViewOnlyMode]);
  const handleFileSelectedForImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isViewOnlyMode) return; const file = event.target.files?.[0]; if (!file) return;
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
  }, [isViewOnlyMode, toast, importMapData, temporalStoreAPI]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    event.preventDefault(); if (isViewOnlyMode) return;
    setContextMenu({ isOpen: true, x: event.clientX, y: event.clientY, nodeId: node.id });
  }, [isViewOnlyMode]);
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const handleDeleteNodeFromContextMenu = useCallback((nodeId: string) => { if(!isViewOnlyMode) deleteStoreNode(nodeId); closeContextMenu(); }, [isViewOnlyMode, deleteStoreNode, closeContextMenu]);

  const handleSelectedElementPropertyUpdateInspector = useCallback((updates: any) => {
    if (isViewOnlyMode || !selectedElementId || !selectedElementType ) return;
    if (selectedElementType === 'node') updateStoreNode(selectedElementId, updates);
    else if (selectedElementType === 'edge') updateEdge(selectedElementId, updates);
  }, [isViewOnlyMode, selectedElementId, selectedElementType, updateStoreNode, updateEdge]);

  if (isStoreLoading && !storeError) { return <div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>; }
  if (storeError) { return <div className="p-4 text-destructive"><AlertTriangle /> {storeError} <Button asChild><Link href={getBackLink()}>{getBackButtonText()}</Link></Button></div>; }

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col">
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileSelectedForImport} style={{ display: 'none' }} disabled={isViewOnlyMode} />
      <DashboardHeader title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName} description={isViewOnlyMode ? "View-only mode." : "Create & visualize."} icon={(isNewMapMode || storeMapId === 'new') ? Compass : Share2} iconLinkHref={getRoleBasedDashboardLink()}>
        {!isViewOnlyMode && <Button onClick={() => saveMap(isViewOnlyMode)} disabled={isStoreSaving}>{isStoreSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Save</Button>}
        <Button asChild variant="outline"><Link href={getBackLink()}><ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()}</Link></Button>
      </DashboardHeader>
      <ReactFlowProvider>
        <EditorToolbar
          onNewMap={handleNewMap} onSaveMap={() => saveMap(isViewOnlyMode)} isSaving={isStoreSaving} onExportMap={handleExportMap} onTriggerImport={handleTriggerImport}
          onExtractConcepts={() => openExtractConceptsModal()} onSuggestRelations={() => openSuggestRelationsModal()} onExpandConcept={() => openExpandConceptModal()}
          onQuickCluster={openQuickClusterModal} onGenerateSnippetFromText={openGenerateSnippetModal}
          onSummarizeSelectedNodes={handleSummarizeSelectedNodes} // Pass new handler
          isViewOnlyMode={isViewOnlyMode} onAddNodeToData={handleAddNodeToData} onAddEdgeToData={handleAddEdgeToData} canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector} onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen} isAiPanelOpen={isAiPanelOpen}
          onUndo={temporalStoreAPI.getState().undo} onRedo={temporalStoreAPI.getState().redo} canUndo={canUndo} canRedo={canRedo}
        />
        <div className="flex-grow relative overflow-hidden">
            <FlowCanvasCore
              mapDataFromStore={storeMapData} isViewOnlyMode={isViewOnlyMode}
              onSelectionChange={handleFlowSelectionChange} onMultiNodeSelectionChange={handleMultiNodeSelectionChange}
              onNodesChangeInStore={updateStoreNode} onNodesDeleteInStore={deleteStoreNode}
              onEdgesDeleteInStore={aiToolsHook.deleteEdge} onConnectInStore={aiToolsHook.addStoreEdge}
              onNodeContextMenu={handleNodeContextMenu}
              onNodeDragStop={ (event, node) => { if (!isViewOnlyMode && node.position && typeof node.position.x === 'number' && typeof node.position.y === 'number') updateStoreNode(node.id, { x: node.position.x, y: node.position.y }); }}
            />
        </div>
        {contextMenu?.isOpen && contextMenu.nodeId && (
          <NodeContextMenu x={contextMenu.x} y={contextMenu.y} nodeId={contextMenu.nodeId} onClose={closeContextMenu}
            onDeleteNode={handleDeleteNodeFromContextMenu} onExpandConcept={() => { openExpandConceptModal(contextMenu.nodeId!); closeContextMenu(); }}
            onSuggestRelations={() => { openSuggestRelationsModal(contextMenu.nodeId!); closeContextMenu(); }}
            onExtractConcepts={() => { openExtractConceptsModal(contextMenu.nodeId!); closeContextMenu(); }}
            onAskQuestion={() => { openAskQuestionModal(contextMenu.nodeId!); closeContextMenu(); }}
            isViewOnlyMode={isViewOnlyMode} />
        )}
        <Sheet open={isPropertiesInspectorOpen} onOpenChange={setIsPropertiesInspectorOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <PropertiesInspector currentMap={mapForInspector} onMapPropertiesChange={handleMapPropertiesChange}
              selectedElement={actualSelectedElementForInspector} selectedElementType={selectedElementType}
              onSelectedElementPropertyUpdate={handleSelectedElementPropertyUpdateInspector}
              isNewMapMode={isNewMapMode} isViewOnlyMode={isViewOnlyMode} />
          </SheetContent>
        </Sheet>
        <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
          <SheetContent side="bottom" className="h-[40vh] sm:h-1/3">
            <AISuggestionPanel currentMapNodes={storeMapData.nodes}
              extractedConcepts={aiExtractedConcepts} suggestedRelations={aiSuggestedRelations} expandedConcepts={aiExpandedConcepts}
              onAddExtractedConcepts={addExtractedConceptsToMap} onAddSuggestedRelations={addSuggestedRelationsToMap} onAddExpandedConcepts={addExpandedConceptsToMap}
              onClearExtractedConcepts={() => useConceptMapStore.getState().setAiExtractedConcepts([])}
              onClearSuggestedRelations={() => useConceptMapStore.getState().setAiSuggestedRelations([])}
              onClearExpandedConcepts={() => useConceptMapStore.getState().setAiExpandedConcepts([])}
              isViewOnlyMode={isViewOnlyMode} />
          </SheetContent>
        </Sheet>
        {isExtractConceptsModalOpen && !isViewOnlyMode && <ExtractConceptsModal initialText={textForExtraction} onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen} />}
        {isSuggestRelationsModalOpen && !isViewOnlyMode && <SuggestRelationsModal initialConcepts={conceptsForRelationSuggestion} onRelationsSuggested={handleRelationsSuggested} onOpenChange={setIsSuggestRelationsModalOpen} />}
        {isExpandConceptModalOpen && !isViewOnlyMode && <ExpandConceptModal initialConcept={conceptToExpand} existingMapContext={mapContextForExpansion} onConceptExpanded={handleConceptExpanded} onOpenChange={setIsExpandConceptModalOpen} />}
        {isQuickClusterModalOpen && !isViewOnlyMode && <QuickClusterModal isOpen={isQuickClusterModalOpen} onOpenChange={setIsQuickClusterModalOpen} onClusterGenerated={handleClusterGenerated} />}
        {isGenerateSnippetModalOpen && !isViewOnlyMode && <GenerateSnippetModal isOpen={isGenerateSnippetModalOpen} onOpenChange={setIsGenerateSnippetModalOpen} onSnippetGenerated={handleSnippetGenerated} />}
        {isAskQuestionModalOpen && !isViewOnlyMode && nodeContextForQuestion && <AskQuestionModal nodeContext={nodeContextForQuestion} onQuestionAnswered={handleQuestionAnswered} onOpenChange={setIsAskQuestionModalOpen} />}
      </ReactFlowProvider>
    </div>
  );
}
