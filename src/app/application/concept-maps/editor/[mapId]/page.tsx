
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { InteractiveCanvas } from "@/components/concept-map/interactive-canvas";
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import type { Node as RFNode, Edge as RFEdge, OnNodesChange, OnEdgesChange, OnNodesDelete, OnEdgesDelete, SelectionChanges, Connection } from 'reactflow';
import { useNodesState, useEdgesState, MarkerType, ReactFlowProvider } from 'reactflow';

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
import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import useConceptMapStore from '@/stores/concept-map-store';
import type { RFConceptMapNodeData, RFConceptMapEdgeData } from "@/components/concept-map/interactive-canvas";

export default function ConceptMapEditorPage() {
  // Group 1: Next.js router hooks
  const paramsHook = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Group 2: Context hooks
  const { toast } = useToast();
  const { user } = useAuth();

  // Group 3: Zustand store hook
  const store = useConceptMapStore();
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
    addEdge: addStoreEdge, updateEdge: updateStoreEdge, deleteEdge: deleteStoreEdge,
    setSelectedElement: setStoreSelectedElement, setIsSaving: setStoreIsSaving,
    setAiExtractedConcepts: setStoreAiExtractedConcepts,
    setAiSuggestedRelations: setStoreAiSuggestedRelations,
    setAiExpandedConcepts: setStoreAiExpandedConcepts,
    resetAiSuggestions: resetStoreAiSuggestions
  } = store;

  // Group 4: React Flow state hooks
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<RFConceptMapNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>([]);

  // Group 5: Local state for modals
  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);

  // Derived state (defined AFTER all hooks)
  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true';

  // Group 6: Callbacks (useCallback)
  const loadMapData = useCallback(async (id: string) => {
    if (!id || id.trim() === '') {
      console.warn("loadMapData called with invalid id:", id);
      if (user && user.id) initializeNewMap(user.id);
      else setStoreError("Cannot initialize new map: User not found.");
      return;
    }
    if (id === "new") {
      if (user && user.id) {
        initializeNewMap(user.id);
      } else {
        console.error("User data not available for initializing new map.");
        setStoreError("User data not available for new map initialization.");
        toast({ title: "Authentication Error", description: "User data not available for new map.", variant: "destructive" });
      }
      return;
    }

    setStoreIsLoading(true);
    setStoreError(null);
    resetStoreAiSuggestions();
    try {
      const response = await fetch(`/api/concept-maps/${id}`);
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
  }, [toast, user, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, setStoreMapName, resetStoreAiSuggestions]);

  const onRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes); // Apply changes using the handler from useNodesState
    changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) {
            updateStoreNode(change.id, { x: change.position.x, y: change.position.y });
        }
    });
  }, [isViewOnlyMode, updateStoreNode, onNodesChangeReactFlow]);


  const onRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onEdgesChangeReactFlow(changes); // Apply changes using the handler from useEdgesState
    // If you need to react to edge changes beyond React Flow's state update (e.g., persist to store), add here.
    // For now, this is typically less common for simple edge prop changes than node position changes.
  }, [isViewOnlyMode, onEdgesChangeReactFlow]);


  const handleRfNodesDeleted: OnNodesDelete = useCallback((deletedRfNodes) => {
    if (isViewOnlyMode) return;
    deletedRfNodes.forEach(node => deleteStoreNode(node.id));
    toast({ title: "Nodes Deleted", description: `${deletedRfNodes.length} node(s) and associated edges removed.` });
  }, [isViewOnlyMode, toast, deleteStoreNode]);

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback((deletedRfEdges) => {
    if (isViewOnlyMode) return;
    deletedRfEdges.forEach(edge => deleteStoreEdge(edge.id));
    toast({ title: "Edges Deleted", description: `${deletedRfEdges.length} edge(s) removed.` });
  }, [isViewOnlyMode, toast, deleteStoreEdge]);

  const handleRfConnect: (params: Connection) => void = useCallback((params) => {
    if (isViewOnlyMode) return;
    addStoreEdge({ source: params.source!, target: params.target!, label: "connects" });
    toast({ title: "Edge Created", description: `New connection added. Save map to persist.` });
  }, [isViewOnlyMode, toast, addStoreEdge]);


  const handleSelectionChange = useCallback((params: SelectionChanges) => {
    const { nodes, edges } = params;
    if (nodes.length === 1 && edges.length === 0) {
        setStoreSelectedElement(nodes[0].id, 'node');
    } else if (edges.length === 1 && nodes.length === 0) {
        setStoreSelectedElement(edges[0].id, 'edge');
    } else {
        setStoreSelectedElement(null, null);
    }
  }, [setStoreSelectedElement]);

  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    setStoreMapName(properties.name);
    setStoreIsPublic(properties.isPublic);
    setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [setStoreMapName, setStoreIsPublic, setStoreSharedWithClassroomId]);

  const handleSelectedElementPropertyUpdate = useCallback((
    updates: Partial<RFConceptMapNodeData> | Partial<RFConceptMapEdgeData>
  ) => {
    if (!selectedElementId || !selectedElementType || isViewOnlyMode) return;

    if (selectedElementType === 'node') {
      const nodeUpdates: Partial<ConceptMapNode> = {};
      const rfUpdates = updates as Partial<RFConceptMapNodeData>;
      if (rfUpdates.label !== undefined) nodeUpdates.text = rfUpdates.label;
      if (rfUpdates.details !== undefined) nodeUpdates.details = rfUpdates.details;
      if (rfUpdates.type !== undefined) nodeUpdates.type = rfUpdates.type;
      updateStoreNode(selectedElementId, nodeUpdates);
    } else if (selectedElementType === 'edge') {
      const edgeUpdates: Partial<ConceptMapEdge> = {};
      const rfUpdates = updates as Partial<RFConceptMapEdgeData>;
      if (rfUpdates.label !== undefined) edgeUpdates.label = rfUpdates.label;
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

    const finalNodesToSave = rfNodes.map(rfNode => {
        const appNodeFromStore = storeMapData.nodes.find(n => n.id === rfNode.id);
        return {
            ...(appNodeFromStore || { id: rfNode.id, text: rfNode.data.label, type: rfNode.data.type || 'default'}),
            x: rfNode.position.x,
            y: rfNode.position.y,
            text: rfNode.data.label,
            details: rfNode.data.details,
            type: rfNode.data.type || appNodeFromStore?.type || 'default'
        };
    });

    const mapDataToSave: ConceptMapData = {
      nodes: finalNodesToSave,
      edges: storeMapData.edges,
    };

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
            ownerId: currentMapOwnerId, // Required by API for auth check
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

      if (isNewMapMode && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    isViewOnlyMode, user, mapName, rfNodes, storeMapData,
    isNewMapMode, currentMapOwnerId, isPublic, sharedWithClassroomId,
    router, toast, storeMapId, setStoreIsSaving, setLoadedMap, setStoreError
  ]);

  const handleConceptsExtracted = useCallback((concepts: string[]) => {
    setStoreAiExtractedConcepts(concepts);
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map via the suggestions panel.` });
  }, [setStoreAiExtractedConcepts, toast]);

  const handleRelationsSuggested = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    setStoreAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map via the suggestions panel.` });
  }, [setStoreAiSuggestedRelations, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    setStoreAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map via the suggestions panel.` });
  }, [setStoreAiExpandedConcepts, toast]);

  const addConceptsToMapData = useCallback((conceptsToAdd: string[], type: 'ai-extracted-concept' | 'ai-expanded-concept') => {
    if (isViewOnlyMode) return;
    const existingNodeTexts = new Set(storeMapData.nodes.map(n => n.text));
    let addedCount = 0;
    conceptsToAdd.forEach(conceptText => {
      if (!existingNodeTexts.has(conceptText)) {
        addStoreNode({
          text: conceptText,
          type: type,
          position: { x: Math.random() * 400, y: Math.random() * 300 },
        });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      toast({ title: "Concepts Added to Map", description: `${addedCount} new concepts added. Save the map to persist.` });
    } else {
      toast({ title: "No New Concepts Added", description: "All suggested concepts may already exist in the map.", variant: "default" });
    }

    if (type === 'ai-extracted-concept') {
        setStoreAiExtractedConcepts([]);
    } else if (type === 'ai-expanded-concept') {
        setStoreAiExpandedConcepts([]);
    }
  }, [isViewOnlyMode, storeMapData, toast, addStoreNode, setStoreAiExtractedConcepts, setStoreAiExpandedConcepts]);

  const handleAddSuggestedRelationsToMap = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    let relationsActuallyAddedCount = 0;
    let conceptsAddedFromRelationsCount = 0;

    let currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 

    relations.forEach(rel => {
      let sourceNode = currentNodesSnapshot.find(node => node.text === rel.source);
      if (!sourceNode) {
        addStoreNode({ text: rel.source, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 
        sourceNode = currentNodesSnapshot.find(node => node.text === rel.source);
        if(sourceNode) conceptsAddedFromRelationsCount++; else return;
      }

      let targetNode = currentNodesSnapshot.find(node => node.text === rel.target);
      if (!targetNode) {
        addStoreNode({ text: rel.target, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        currentNodesSnapshot = [...useConceptMapStore.getState().mapData.nodes]; 
        targetNode = currentNodesSnapshot.find(node => node.text === rel.target);
        if(targetNode) conceptsAddedFromRelationsCount++; else return;
      }

      const currentEdgesSnapshot = useConceptMapStore.getState().mapData.edges;
      if (sourceNode && targetNode && !currentEdgesSnapshot.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
        addStoreEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation });
        relationsActuallyAddedCount++;
      }
    });

    let toastMessage = "";
    if (relationsActuallyAddedCount > 0) toastMessage += `${relationsActuallyAddedCount} new relations added. `;
    if (conceptsAddedFromRelationsCount > 0) toastMessage += `${conceptsAddedFromRelationsCount} new concepts (from relations) added. `;

    if (toastMessage) {
      toast({ title: "Relations Added to Map", description: `${toastMessage.trim()} Save the map to persist.` });
    } else {
       toast({ title: "No New Relations Added", description: "All suggested relations/concepts may already exist.", variant: "default" });
    }
    setStoreAiSuggestedRelations([]);
  }, [isViewOnlyMode, toast, addStoreNode, addStoreEdge, setStoreAiSuggestedRelations]);

  const handleAddNodeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${storeMapData.nodes.length + 1}`;
    addStoreNode({
      text: newNodeText,
      type: 'manual-node',
      position: {x: Math.random() * 200 + 50, y: Math.random() * 100 + 50},
    });
    toast({ title: "Node Added to Map", description: `"${newNodeText}" added. Save the map to persist changes.`});
  }, [isViewOnlyMode, storeMapData, toast, addStoreNode]);

  const handleAddEdgeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const nodes = storeMapData.nodes;
    if (nodes.length < 2) {
      toast({ title: "Cannot Add Edge", description: "Not enough nodes to create an edge. Add at least two nodes first.", variant: "default" });
      return;
    }
    const sourceNode = nodes.length >=2 ? nodes[nodes.length - 2] : nodes[0];
    const targetNode = nodes.length >=2 ? nodes[nodes.length - 1] : nodes[1];

    if (!sourceNode || !targetNode) {
        toast({ title: "Error Adding Edge", description: "Could not find suitable source/target nodes.", variant: "destructive" });
        return;
    }
    addStoreEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added to Map", description: `Edge connecting "${sourceNode.text}" and "${targetNode.text}" added. Save to persist.`});
  }, [isViewOnlyMode, storeMapData, toast, addStoreEdge]);

  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return "/";
    switch (user.role) {
      case UserRole.STUDENT: return "/application/student/dashboard";
      case UserRole.TEACHER: return "/application/teacher/dashboard";
      case UserRole.ADMIN: return "/application/admin/dashboard";
      default: return "/";
    }
  }, [user]);

  const getBackLink = useCallback(() => {
    if (!user) return "/";
    if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) {
        return getRoleBasedDashboardLink();
    }
    if (user.role === UserRole.STUDENT) {
        return "/application/student/concept-maps";
    }
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) {
            return `/application/teacher/classrooms/${sharedWithClassroomId}`;
        }
        return "/application/teacher/dashboard"; // Fallback for teacher if somehow no sharedClassroomId
    }
    return getRoleBasedDashboardLink();
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId, getRoleBasedDashboardLink]);

  const getBackButtonText = useCallback(() => {
    if (!user) return "Back";
     if (isNewMapMode || storeMapId === 'new' || (user.role === UserRole.ADMIN && !sharedWithClassroomId)) {
        return "Back to Dashboard";
    }
    if (user.role === UserRole.STUDENT) {
        return "Back to My Maps";
    }
    if (user.role === UserRole.TEACHER || (user.role === UserRole.ADMIN && sharedWithClassroomId)) {
        if (sharedWithClassroomId) {
            return "Back to Classroom";
        }
        return "Back to Dashboard";
    }
    return "Back";
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId]);


  // Group 7: Effects (useEffect)
  useEffect(() => {
    // Ensure routeMapId is a valid string before calling loadMapData
    if (typeof routeMapId === 'string' && routeMapId.trim() !== '') {
      loadMapData(routeMapId);
    }
  }, [routeMapId, loadMapData]);

  useEffect(() => {
    const transformedNodes = (storeMapData.nodes || []).map(appNode => {
      return {
        id: appNode.id,
        type: appNode.type || 'default',
        data: { label: appNode.text, details: appNode.details, type: appNode.type || 'default' },
        position: {
          x: appNode.x ?? (Math.random() * 400),
          y: appNode.y ?? (Math.random() * 300),
        },
        style: {
          border: '1px solid hsl(var(--border))',
          padding: '10px 15px',
          borderRadius: '8px',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--foreground))',
          boxShadow: '0 2px 4px hsla(var(--foreground), 0.1)',
          minWidth: 150,
          textAlign: 'center',
        }
      };
    });
    setRfNodes(transformedNodes as RFNode<RFConceptMapNodeData>[]);

    const transformedEdges = (storeMapData.edges || []).map(appEdge => ({
      id: appEdge.id,
      source: appEdge.source,
      target: appEdge.target,
      label: appEdge.label,
      type: 'smoothstep',
      animated: false,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    }));
    setRfEdges(transformedEdges as RFEdge<RFConceptMapEdgeData>[]);
  }, [storeMapData, setRfNodes, setRfEdges]);

  // This variable is for passing to PropertiesInspector. It's constructed based on current store state.
  let mapForInspector: ConceptMap | null = storeMapId && storeMapId !== 'new' ? {
    id: storeMapId,
    name: mapName,
    ownerId: currentMapOwnerId || user?.id || "", // Provide a fallback string for ownerId if null/undefined
    mapData: storeMapData,
    isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId,
    createdAt: currentMapCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } : null;
  
  if (isNewMapMode && !mapForInspector && user) {
      mapForInspector = { // Assign to the 'let' declared variable
        id: 'new',
        name: mapName,
        ownerId: user.id,
        mapData: storeMapData,
        isPublic: isPublic,
        sharedWithClassroomId: sharedWithClassroomId,
        createdAt: currentMapCreatedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
  }


  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    if (selectedElementType === 'node') {
      actualSelectedElementForInspector = storeMapData.nodes.find(n => n.id === selectedElementId) || null;
    } else if (selectedElementType === 'edge') {
      actualSelectedElementForInspector = storeMapData.edges.find(e => e.id === selectedElementId) || null;
    }
  }

  const canAddEdge = storeMapData.nodes.length >= 2;

  // ---- MAIN RENDER ----
  // Single return structure; content inside changes based on state
  return (
    <ReactFlowProvider>
      <div className="flex h-full flex-col space-y-4">
        <DashboardHeader
          title={isStoreLoading ? "Loading Map..." : (isViewOnlyMode ? `Viewing: ${mapName}` : mapName)}
          description={isStoreLoading ? "Please wait." : (isViewOnlyMode ? "This map is in view-only mode. Interactions are disabled." : "Create, edit, and visualize your ideas. Nodes are draggable.")}
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
            <Link href={getBackLink()}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()}
            </Link>
          </Button>
        </DashboardHeader>

        <div className="flex flex-1 flex-col gap-4 overflow-hidden">
          {isStoreLoading ? (
            <div className="flex flex-grow justify-center items-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : storeError ? (
            <Card className="flex-grow">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center"><AlertTriangle className="mr-2 h-5 w-5"/>Error Loading Map</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{storeError}</p>
                <Button onClick={() => routeMapId && loadMapData(routeMapId)} variant="outline" className="mt-4 mr-2">Try Again</Button>
                <Button asChild variant="secondary" className="mt-4">
                  <Link href={getBackLink()}> <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()} </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <EditorToolbar
                onSaveMap={handleSaveMap}
                isSaving={isSaving}
                onExtractConcepts={useCallback(() => { resetStoreAiSuggestions(); setIsExtractConceptsModalOpen(true); }, [resetStoreAiSuggestions])}
                onSuggestRelations={useCallback(() => { resetStoreAiSuggestions(); setIsSuggestRelationsModalOpen(true); }, [resetStoreAiSuggestions])}
                onExpandConcept={useCallback(() => { resetStoreAiSuggestions(); setIsExpandConceptModalOpen(true); }, [resetStoreAiSuggestions])}
                isViewOnlyMode={isViewOnlyMode}
                onAddNodeToData={handleAddNodeToData}
                onAddEdgeToData={handleAddEdgeToData}
                canAddEdge={canAddEdge}
              />

              <div className="flex flex-1 gap-4 overflow-hidden">
                <div className="flex-grow">
                  <InteractiveCanvas
                    nodes={rfNodes}
                    edges={rfEdges}
                    onNodesChange={onRfNodesChange}
                    onEdgesChange={onRfEdgesChange}
                    onNodesDelete={handleRfNodesDeleted}
                    onEdgesDelete={handleRfEdgesDeleted}
                    onSelectionChange={handleSelectionChange}
                    onConnect={handleRfConnect}
                    isViewOnlyMode={isViewOnlyMode}
                  />
                </div>
                <aside className="hidden w-80 flex-shrink-0 lg:block">
                  <PropertiesInspector
                    currentMap={mapForInspector}
                    onMapPropertiesChange={handleMapPropertiesChange}
                    selectedElement={actualSelectedElementForInspector}
                    selectedElementType={selectedElementType}
                    onSelectedElementPropertyUpdate={handleSelectedElementPropertyUpdate}
                    isNewMapMode={(isNewMapMode || storeMapId === 'new')}
                    isViewOnlyMode={isViewOnlyMode}
                  />
                </aside>
              </div>

              <div className="mt-4 max-h-96 overflow-y-auto border-t pt-4">
                <CanvasPlaceholder
                    mapData={storeMapData}
                    extractedConcepts={aiExtractedConcepts}
                    suggestedRelations={aiSuggestedRelations}
                    expandedConcepts={aiExpandedConcepts}
                    onAddExtractedConcepts={(concepts) => addConceptsToMapData(concepts, 'ai-extracted-concept')}
                    onAddSuggestedRelations={handleAddSuggestedRelationsToMap}
                    onAddExpandedConcepts={(concepts) => addConceptsToMapData(concepts, 'ai-expanded-concept')}
                    isViewOnlyMode={isViewOnlyMode}
                />
              </div>

              {isExtractConceptsModalOpen && !isViewOnlyMode && (
                <ExtractConceptsModal
                    onConceptsExtracted={handleConceptsExtracted}
                    onOpenChange={setIsExtractConceptsModalOpen}
                />
              )}
              {isSuggestRelationsModalOpen && !isViewOnlyMode && (
                <SuggestRelationsModal
                  onRelationsSuggested={handleRelationsSuggested}
                  initialConcepts={rfNodes.slice(0,5).map(n => n.data.label)}
                  onOpenChange={setIsSuggestRelationsModalOpen}
                />
              )}
              {isExpandConceptModalOpen && !isViewOnlyMode && (
                <ExpandConceptModal
                  onConceptExpanded={handleConceptExpanded}
                  initialConcept={rfNodes.length > 0 ? rfNodes[0].data.label : ""}
                  onOpenChange={setIsExpandConceptModalOpen}
                />
              )}
            </>
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
}
