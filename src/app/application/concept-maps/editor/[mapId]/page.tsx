
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ReactFlowProvider } from 'reactflow';

import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
} from "@/components/concept-map/genai-modals";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from "@/types";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

import useConceptMapStore from '@/stores/concept-map-store';
import FlowCanvasCore from "@/components/concept-map/flow-canvas-core";

export default function ConceptMapEditorPage() {
  const paramsHook = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { toast } = useToast();
  const { user } = useAuth();

  const {
    mapId: storeMapId,
    mapName, currentMapOwnerId, currentMapCreatedAt, isPublic, sharedWithClassroomId, isNewMapMode,
    mapData: storeMapData,
    isLoading: isStoreLoading,
    isSaving, error: storeError,
    selectedElementId, selectedElementType,
    aiExtractedConcepts, aiSuggestedRelations, aiExpandedConcepts,
    initializeNewMap, setLoadedMap, setIsLoading: setStoreIsLoading, setError: setStoreError,
    setMapName: setStoreMapName, setIsPublic: setStoreIsPublic, setSharedWithClassroomId: setStoreSharedWithClassroomId,
    addNode: addStoreNode, updateNode: updateStoreNode, deleteNode: deleteStoreNode,
    addEdge: addStoreEdge, updateEdge: updateStoreEdge, deleteEdge,
    setSelectedElement: setStoreSelectedElement, setIsSaving: setStoreIsSaving,
    setAiExtractedConcepts: setStoreAiExtractedConcepts,
    setAiSuggestedRelations: setStoreAiSuggestedRelations,
    setAiExpandedConcepts: setStoreAiExpandedConcepts,
    resetAiSuggestions: resetStoreAiSuggestions
  } = useConceptMapStore();

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);


  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true';

  const loadMapData = useCallback(async (idToLoad: string) => {
    if (!idToLoad || idToLoad.trim() === '') {
      if (user && user.id) initializeNewMap(user.id);
      else setStoreError("Cannot initialize new map: User not found.");
      return;
    }
    if (idToLoad === "new") {
      if (user && user.id) {
        initializeNewMap(user.id);
      } else {
        setStoreError("User data not available for new map initialization.");
        toast({ title: "Authentication Error", description: "User data not available for new map.", variant: "destructive" });
      }
      return;
    }

    setStoreIsLoading(true);
    setStoreError(null);
    resetStoreAiSuggestions();
    try {
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load map");
      }
      const data: ConceptMap = await response.json();
      setLoadedMap(data);
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      setStoreMapName("Error Loading Map");
    } finally {
      setStoreIsLoading(false);
    }
  }, [user, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, toast, resetStoreAiSuggestions, setStoreMapName]);


  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    setStoreMapName(properties.name);
    setStoreIsPublic(properties.isPublic);
    setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [setStoreMapName, setStoreIsPublic, setStoreSharedWithClassroomId]);

  const handleFlowSelectionChange = useCallback((elementId: string | null, elementType: 'node' | 'edge' | null) => {
    setStoreSelectedElement(elementId, elementType);
  }, [setStoreSelectedElement]);

  const handleFlowElementUpdate = useCallback((
    elementId: string,
    elementType: 'node' | 'edge',
    updates: Partial<ConceptMapNode> | Partial<ConceptMapEdge>
  ) => {
    if (elementType === 'node') {
      updateStoreNode(elementId, updates as Partial<ConceptMapNode>);
    } else {
      updateStoreEdge(elementId, updates as Partial<ConceptMapEdge>);
    }
  }, [updateStoreNode, updateStoreEdge]);

  const handleSelectedElementPropertyUpdateInspector = useCallback((
    inspectorUpdates: any
  ) => {
    if (!selectedElementId || !selectedElementType || isViewOnlyMode) return;

    if (selectedElementType === 'node') {
      const nodeUpdates: Partial<ConceptMapNode> = {};
      if (inspectorUpdates.label !== undefined) nodeUpdates.text = inspectorUpdates.label;
      if (inspectorUpdates.details !== undefined) nodeUpdates.details = inspectorUpdates.details;
      if (inspectorUpdates.type !== undefined) nodeUpdates.type = inspectorUpdates.type;
      updateStoreNode(selectedElementId, nodeUpdates);
    } else if (selectedElementType === 'edge') {
      const edgeUpdates: Partial<ConceptMapEdge> = {};
      if (inspectorUpdates.label !== undefined) edgeUpdates.label = inspectorUpdates.label;
      updateStoreEdge(selectedElementId, edgeUpdates);
    }
  }, [selectedElementId, selectedElementType, isViewOnlyMode, updateStoreNode, updateStoreEdge]);


  const handleSaveMap = useCallback(async () => {
    if (isViewOnlyMode) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const mapDataToSave: ConceptMapData = storeMapData;

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? user.id : currentMapOwnerId;
    if (!payloadOwnerId) {
        toast({ title: "Authentication Error", description: "Cannot determine map owner. Please ensure you are logged in.", variant: "destructive"});
        setStoreIsSaving(false);
        return;
    }

    const payload = {
      name: mapName,
      ownerId: payloadOwnerId,
      mapData: mapDataToSave,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new') ? null : storeMapId;

      if (!currentMapIdForAPI) {
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName,
            mapData: mapDataToSave,
            isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: currentMapOwnerId,
        };
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMap: ConceptMap = await response.json();
      setLoadedMap(savedMap);
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new') && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    isViewOnlyMode, user, mapName, storeMapData,
    isNewMapMode, currentMapOwnerId, isPublic, sharedWithClassroomId,
    router, toast, storeMapId, setStoreIsSaving, setLoadedMap, setStoreError
  ]);

  const handleConceptsExtracted = useCallback((concepts: string[]) => {
    setStoreAiExtractedConcepts(concepts);
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map via the suggestions panel.` });
    setIsAiPanelOpen(true); // Open AI panel after extraction
  }, [setStoreAiExtractedConcepts, toast]);

  const handleRelationsSuggested = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    setStoreAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map via the suggestions panel.` });
    setIsAiPanelOpen(true);
  }, [setStoreAiSuggestedRelations, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    setStoreAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map via the suggestions panel.` });
    setIsAiPanelOpen(true);
  }, [setStoreAiExpandedConcepts, toast]);

  const get = useConceptMapStore.getState;

  const addConceptsToMapData = useCallback((conceptsToAdd: string[], type: 'ai-extracted-concept' | 'ai-expanded-concept') => {
    if (isViewOnlyMode) return;
    const existingNodeTexts = new Set(get().mapData.nodes.map(n => n.text));
    let addedCount = 0;
    conceptsToAdd.forEach(conceptText => {
      if (!existingNodeTexts.has(conceptText)) {
        addStoreNode({
          text: conceptText,
          type: type,
          position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 },
        });
        addedCount++;
      }
    });
    if (addedCount > 0) toast({ title: "Concepts Added", description: `${addedCount} new concepts added to map. Remember to save.` });
    else toast({ title: "No New Concepts", description: "All suggestions may already exist on the map.", variant: "default" });
    if (type === 'ai-extracted-concept') setStoreAiExtractedConcepts([]);
    else if (type === 'ai-expanded-concept') setStoreAiExpandedConcepts([]);
  }, [isViewOnlyMode, toast, addStoreNode, setStoreAiExtractedConcepts, setStoreAiExpandedConcepts, get]);

  const handleAddSuggestedRelationsToMap = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    let relationsAddedCount = 0;
    let conceptsAddedFromRelationsCount = 0;
    let currentNodesSnapshot = [...get().mapData.nodes];

    relations.forEach(rel => {
      let sourceNode = currentNodesSnapshot.find(node => node.text === rel.source);
      if (!sourceNode) {
        addStoreNode({ text: rel.source, type: 'ai-concept', position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 } });
        currentNodesSnapshot = [...get().mapData.nodes];
        sourceNode = currentNodesSnapshot.find(node => node.text === rel.source);
        if (sourceNode) conceptsAddedFromRelationsCount++; else return;
      }
      let targetNode = currentNodesSnapshot.find(node => node.text === rel.target);
      if (!targetNode) {
        addStoreNode({ text: rel.target, type: 'ai-concept', position: { x: Math.random() * 400 + 50, y: Math.random() * 300 + 50 } });
        currentNodesSnapshot = [...get().mapData.nodes];
        targetNode = currentNodesSnapshot.find(node => node.text === rel.target);
        if (targetNode) conceptsAddedFromRelationsCount++; else return;
      }
      const currentEdgesSnapshot = get().mapData.edges;
      if (sourceNode && targetNode && !currentEdgesSnapshot.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
        addStoreEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation });
        relationsAddedCount++;
      }
    });
    let toastMessage = "";
    if (relationsAddedCount > 0) toastMessage += `${relationsAddedCount} new relations added. `;
    if (conceptsAddedFromRelationsCount > 0) toastMessage += `${conceptsAddedFromRelationsCount} new concepts (from relations) added. `;
    if (toastMessage) toast({ title: "Relations Added", description: `${toastMessage.trim()} Remember to save the map.` });
    else toast({ title: "No New Relations", description: "All suggestions may already exist on the map.", variant: "default" });
    setStoreAiSuggestedRelations([]);
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, setStoreAiSuggestedRelations, get]);

  const handleAddNodeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${get().mapData.nodes.length + 1}`;
    addStoreNode({ text: newNodeText, type: 'manual-node', position: {x: Math.random() * 200 + 50, y: Math.random() * 100 + 50} });
    toast({ title: "Node Added", description: `"${newNodeText}" added. Remember to save.`});
  }, [isViewOnlyMode, toast, addStoreNode, get]);

  const handleAddEdgeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const nodes = get().mapData.nodes;
    if (nodes.length < 2) {
      toast({ title: "Cannot Add Edge", description: "Add at least two nodes to create an edge.", variant: "default" });
      return;
    }
    const sourceNode = nodes[nodes.length - 2];
    const targetNode = nodes[nodes.length - 1];
    if (!sourceNode || !targetNode) {
        toast({ title: "Error Adding Edge", description: "Could not find source/target nodes.", variant: "destructive" });
        return;
    }
    addStoreEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added", description: `Edge between "${sourceNode.text}" and "${targetNode.text}" added. Remember to save.`});
  }, [isViewOnlyMode, toast, addStoreEdge, get]);

  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return "/application/login";
    switch (user.role) {
      case UserRole.STUDENT: return "/application/student/dashboard";
      case UserRole.TEACHER: return "/application/teacher/dashboard";
      case UserRole.ADMIN: return "/application/admin/dashboard";
      default: return "/application/login";
    }
  }, [user]);

  const getBackLink = useCallback(() => {
    if (!user) return "/application/login";
    if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) {
        return getRoleBasedDashboardLink();
    }
    if (user.role === UserRole.STUDENT) return "/application/student/concept-maps";
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) return `/application/teacher/classrooms/${sharedWithClassroomId}`;
        return "/application/teacher/dashboard";
    }
    return getRoleBasedDashboardLink();
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId, getRoleBasedDashboardLink]);

  const getBackButtonText = useCallback(() => {
    if (!user) return "Back";
     if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) return "Back to Dashboard";
    if (user.role === UserRole.STUDENT) return "Back to My Maps";
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) return "Back to Classroom";
        return "Back to Dashboard";
    }
    return "Back";
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId]);

  useEffect(() => {
    if (typeof routeMapId === 'string') {
      loadMapData(routeMapId);
    } else if (user && user.id && !storeMapId && isNewMapMode) { // Ensure user.id exists
      initializeNewMap(user.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeMapId, user?.id]); // loadMapData and initializeNewMap are stable

  const onExtractConceptsOpen = useCallback(() => { resetStoreAiSuggestions(); setIsExtractConceptsModalOpen(true); }, [resetStoreAiSuggestions]);
  const onSuggestRelationsOpen = useCallback(() => { resetStoreAiSuggestions(); setIsSuggestRelationsModalOpen(true); }, [resetStoreAiSuggestions]);
  const onExpandConceptOpen = useCallback(() => { resetStoreAiSuggestions(); setIsExpandConceptModalOpen(true); }, [resetStoreAiSuggestions]);

  const onTogglePropertiesInspector = useCallback(() => setIsPropertiesInspectorOpen(prev => !prev), []);
  const onToggleAiPanel = useCallback(() => setIsAiPanelOpen(prev => !prev), []);

  let mapForInspector: ConceptMap | null = (storeMapId && storeMapId !== 'new' && currentMapOwnerId) ? {
    id: storeMapId, name: mapName, ownerId: currentMapOwnerId,
    mapData: storeMapData, isPublic: isPublic, sharedWithClassroomId: sharedWithClassroomId,
    createdAt: currentMapCreatedAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
  } : null;

  if ((isNewMapMode || storeMapId === 'new') && !mapForInspector && user) {
      mapForInspector = {
        id: 'new', name: mapName, ownerId: user.id,
        mapData: storeMapData, isPublic: isPublic, sharedWithClassroomId: sharedWithClassroomId,
        createdAt: currentMapCreatedAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
  }

  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    if (selectedElementType === 'node') actualSelectedElementForInspector = storeMapData.nodes.find(n => n.id === selectedElementId) || null;
    else if (selectedElementType === 'edge') actualSelectedElementForInspector = storeMapData.edges.find(e => e.id === selectedElementId) || null;
  }

  const canAddEdge = storeMapData.nodes.length >= 2;
  
  const handleNewMap = useCallback(() => {
    router.push('/application/concept-maps/editor/new');
    // The new route will trigger the useEffect to initialize a new map.
  }, [router]);

  const handleExportMap = useCallback(() => {
    const currentMapData = get().mapData;
    const currentMapName = get().mapName || 'concept-map';
    const filename = `${currentMapName.replace(/\s+/g, '_').toLowerCase()}.json`;
    const jsonStr = JSON.stringify(currentMapData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: "Map Exported", description: `Saved as ${filename}` });
  }, [toast, get]);

  return (
    <div className="flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col">
      <DashboardHeader
        title={isStoreLoading ? "Loading Map..." : (isViewOnlyMode ? `Viewing: ${mapName}` : mapName)}
        description={isStoreLoading ? "Please wait." : (isViewOnlyMode ? "This map is in view-only mode." : "Create, edit, and visualize your ideas.")}
        icon={isStoreLoading ? Loader2 : (isNewMapMode || storeMapId === 'new') ? Compass : Share2}
        iconClassName={isStoreLoading ? "animate-spin" : ""}
        iconLinkHref={getRoleBasedDashboardLink()}
      >
        {!isStoreLoading && !storeError && !isViewOnlyMode && (
          <Button onClick={handleSaveMap} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Map"}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href={getBackLink()}> <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()} </Link>
        </Button>
      </DashboardHeader>

      <ReactFlowProvider>
        <EditorToolbar
          onNewMap={handleNewMap}
          onSaveMap={handleSaveMap} isSaving={isSaving}
          onExportMap={handleExportMap}
          onExtractConcepts={onExtractConceptsOpen}
          onSuggestRelations={onSuggestRelationsOpen}
          onExpandConcept={onExpandConceptOpen}
          isViewOnlyMode={isViewOnlyMode}
          onAddNodeToData={handleAddNodeToData} onAddEdgeToData={handleAddEdgeToData} canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector}
          onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen}
          isAiPanelOpen={isAiPanelOpen}
        />
        <div className="flex-grow relative overflow-hidden"> {/* Added overflow-hidden */}
            <FlowCanvasCore
              mapDataFromStore={storeMapData}
              isViewOnlyMode={isViewOnlyMode}
              onSelectionChange={handleFlowSelectionChange}
              onNodesChangeInStore={updateStoreNode}
              onNodesDeleteInStore={deleteStoreNode}
              onEdgesDeleteInStore={deleteEdge}
              onConnectInStore={addStoreEdge}
            />
        </div>

        {/* Properties Inspector Sheet */}
        <Sheet open={isPropertiesInspectorOpen} onOpenChange={setIsPropertiesInspectorOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Map & Element Properties</SheetTitle>
              <SheetDescription>
                {isViewOnlyMode ? "Viewing properties. Editing is disabled." : "Edit map or selected element properties."}
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <PropertiesInspector
                currentMap={mapForInspector}
                onMapPropertiesChange={handleMapPropertiesChange}
                selectedElement={actualSelectedElementForInspector}
                selectedElementType={selectedElementType}
                onSelectedElementPropertyUpdate={handleSelectedElementPropertyUpdateInspector}
                isNewMapMode={isNewMapMode}
                isViewOnlyMode={isViewOnlyMode}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* AI Suggestions / Textual Map Data Sheet */}
        <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
          <SheetContent side="bottom" className="h-[40vh] sm:h-1/3"> {/* Adjust height as needed */}
            <SheetHeader>
              <SheetTitle>AI Suggestions & Map Data</SheetTitle>
              <SheetDescription>
                View AI-generated suggestions or textual representation of your map.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 h-[calc(100%-4rem)]"> {/* Adjust height for content */}
              <CanvasPlaceholder
                mapData={storeMapData}
                extractedConcepts={aiExtractedConcepts}
                suggestedRelations={aiSuggestedRelations}
                expandedConcepts={aiExpandedConcepts}
                onAddExtractedConcepts={addConceptsToMapData}
                onAddSuggestedRelations={handleAddSuggestedRelationsToMap}
                onAddExpandedConcepts={addConceptsToMapData}
                isViewOnlyMode={isViewOnlyMode}
              />
            </div>
          </SheetContent>
        </Sheet>

        {isExtractConceptsModalOpen && !isViewOnlyMode && (<ExtractConceptsModal onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen}/>)}
        {isSuggestRelationsModalOpen && !isViewOnlyMode && (<SuggestRelationsModal onRelationsSuggested={handleRelationsSuggested} initialConcepts={storeMapData.nodes.slice(0,5).map(n => n.text)} onOpenChange={setIsSuggestRelationsModalOpen}/>)}
        {isExpandConceptModalOpen && !isViewOnlyMode && (<ExpandConceptModal onConceptExpanded={handleConceptExpanded} initialConcept={storeMapData.nodes.length > 0 ? storeMapData.nodes[0].text : ""} onOpenChange={setIsExpandConceptModalOpen}/>)}
      </ReactFlowProvider>
    </div>
  );
}
