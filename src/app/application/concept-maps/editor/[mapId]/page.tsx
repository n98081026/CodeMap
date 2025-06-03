
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
import { useNodesState, useEdgesState, MarkerType } from 'reactflow';

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
    mapData, isLoading: isStoreLoading, isSaving, error: storeError, 
    selectedElementId, selectedElementType,
    aiExtractedConcepts, aiSuggestedRelations, aiExpandedConcepts
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
    if (id === "new") {
      if (user && user.id) {
        store.initializeNewMap(user.id);
      } else {
        console.error("User data not available for initializing new map.");
        store.setError("User data not available for new map initialization.");
        toast({ title: "Authentication Error", description: "User data not available for new map.", variant: "destructive" });
        return;
      }
      return;
    }

    store.setIsLoading(true);
    store.setError(null);
    store.resetAiSuggestions();
    try {
      const response = await fetch(`/api/concept-maps/${id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load map");
      }
      const data: ConceptMap = await response.json();
      store.setLoadedMap(data);
    } catch (err) {
      store.setError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      store.setMapName("Error Loading Map"); 
    } finally {
      store.setIsLoading(false);
    }
  }, [toast, user, store]);

  const onRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    setRfNodes((nds) => onNodesChangeReactFlow(changes, nds));
    changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) {
            store.updateNode(change.id, { x: change.position.x, y: change.position.y });
        }
    });
  }, [setRfNodes, onNodesChangeReactFlow, isViewOnlyMode, store]);


  const onRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    setRfEdges((eds) => onEdgesChangeReactFlow(changes, eds));
  }, [setRfEdges, onEdgesChangeReactFlow, isViewOnlyMode]);


  const handleRfNodesDeleted: OnNodesDelete = useCallback((deletedRfNodes) => {
    if (isViewOnlyMode) return;
    deletedRfNodes.forEach(node => store.deleteNode(node.id));
    toast({ title: "Nodes Deleted", description: `${deletedRfNodes.length} node(s) and associated edges removed.` });
  }, [isViewOnlyMode, toast, store]);

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback((deletedRfEdges) => {
    if (isViewOnlyMode) return;
    deletedRfEdges.forEach(edge => store.deleteEdge(edge.id));
    toast({ title: "Edges Deleted", description: `${deletedRfEdges.length} edge(s) removed.` });
  }, [isViewOnlyMode, toast, store]);

  const handleRfConnect: (params: Connection) => void = useCallback((params) => {
    if (isViewOnlyMode) return;
    store.addEdge({ source: params.source!, target: params.target!, label: "connects" });
    toast({ title: "Edge Created", description: `New connection added. Save map to persist.` });
  }, [isViewOnlyMode, toast, store]);


  const handleSelectionChange = useCallback((params: SelectionChanges) => {
    const { nodes, edges } = params;
    if (nodes.length === 1 && edges.length === 0) {
        store.setSelectedElement(nodes[0].id, 'node');
    } else if (edges.length === 1 && nodes.length === 0) {
        store.setSelectedElement(edges[0].id, 'edge');
    } else {
        store.setSelectedElement(null, null);
    }
  }, [store]);

  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    store.setMapName(properties.name);
    store.setIsPublic(properties.isPublic);
    store.setSharedWithClassroomId(properties.sharedWithClassroomId);
  }, [store]);

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
      store.updateNode(selectedElementId, nodeUpdates);
    } else if (selectedElementType === 'edge') {
      const edgeUpdates: Partial<ConceptMapEdge> = {};
      const rfUpdates = updates as Partial<RFConceptMapEdgeData>;
      if (rfUpdates.label !== undefined) edgeUpdates.label = rfUpdates.label;
      store.updateEdge(selectedElementId, edgeUpdates);
    }
  }, [selectedElementId, selectedElementType, isViewOnlyMode, store]);

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

    store.setIsSaving(true);

    const finalNodesToSave = rfNodes.map(rfNode => {
        const appNodeFromStore = mapData.nodes.find(n => n.id === rfNode.id);
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
      edges: mapData.edges,
    };

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? user.id : currentMapOwnerId;
    if (!payloadOwnerId) {
        toast({ title: "Authentication Error", description: "Cannot determine map owner. Please ensure you are logged in.", variant: "destructive"});
        store.setIsSaving(false);
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

      store.setLoadedMap(savedMap);

      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });

      if (isNewMapMode && savedMap.id) { 
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      store.setError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      store.setIsSaving(false);
    }
  }, [
    isViewOnlyMode, user, mapName, store, rfNodes, mapData, // Added mapData to dependency list for finalNodesToSave and mapDataToSave
    isNewMapMode, currentMapOwnerId, isPublic, sharedWithClassroomId,
    router, toast, storeMapId 
  ]);

  const handleConceptsExtracted = useCallback((concepts: string[]) => {
    store.setAiExtractedConcepts(concepts);
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map via the suggestions panel.` });
  }, [store, toast]);

  const handleRelationsSuggested = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    store.setAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map via the suggestions panel.` });
  }, [store, toast]);

  const handleConceptExpanded = useCallback((newConcepts: string[]) => {
    store.setAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map via the suggestions panel.` });
  }, [store, toast]);

  const addConceptsToMapData = useCallback((conceptsToAdd: string[], type: 'ai-extracted-concept' | 'ai-expanded-concept') => {
    if (isViewOnlyMode) return;
    const existingNodeTexts = new Set(mapData.nodes.map(n => n.text)); // Use mapData from store
    let addedCount = 0;
    conceptsToAdd.forEach(conceptText => {
      if (!existingNodeTexts.has(conceptText)) {
        store.addNode({
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
        store.setAiExtractedConcepts([]);
    } else if (type === 'ai-expanded-concept') {
        store.setAiExpandedConcepts([]);
    }
  }, [isViewOnlyMode, store, toast, mapData]); // Added mapData

  const handleAddSuggestedRelationsToMap = useCallback((relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    let relationsActuallyAddedCount = 0;
    let conceptsAddedFromRelationsCount = 0;
    
    // Get current nodes from the store for accurate checks
    let currentNodes = useConceptMapStore.getState().mapData.nodes;

    relations.forEach(rel => {
      let sourceNode = currentNodes.find(node => node.text === rel.source);
      if (!sourceNode) {
        store.addNode({ text: rel.source, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        currentNodes = useConceptMapStore.getState().mapData.nodes; // Re-fetch after adding
        sourceNode = currentNodes.find(node => node.text === rel.source);
        if(sourceNode) conceptsAddedFromRelationsCount++; else return;
      }

      let targetNode = currentNodes.find(node => node.text === rel.target);
      if (!targetNode) {
        store.addNode({ text: rel.target, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        currentNodes = useConceptMapStore.getState().mapData.nodes; // Re-fetch
        targetNode = currentNodes.find(node => node.text === rel.target);
        if(targetNode) conceptsAddedFromRelationsCount++; else return;
      }

      const currentEdges = useConceptMapStore.getState().mapData.edges;
      if (sourceNode && targetNode && !currentEdges.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
        store.addEdge({ source: sourceNode!.id, target: targetNode!.id, label: rel.relation });
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
    store.setAiSuggestedRelations([]);
  }, [isViewOnlyMode, store, toast]);

  const handleAddNodeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${mapData.nodes.length + 1}`; // Use mapData from store
    store.addNode({
      text: newNodeText,
      type: 'manual-node',
      position: {x: Math.random() * 200 + 50, y: Math.random() * 100 + 50},
    });
    toast({ title: "Node Added to Map", description: `"${newNodeText}" added. Save the map to persist changes.`});
  }, [isViewOnlyMode, store, toast, mapData]); // Added mapData

  const handleAddEdgeToData = useCallback(() => {
    if (isViewOnlyMode) return;
    const nodes = mapData.nodes; // Use mapData from store
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
    store.addEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added to Map", description: `Edge connecting "${sourceNode.text}" and "${targetNode.text}" added. Save to persist.`});
  }, [isViewOnlyMode, store, toast, mapData]); // Added mapData

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
    if (isNewMapMode || storeMapId === 'new' || user.role === UserRole.ADMIN) {
        return getRoleBasedDashboardLink();
    }
    if (user.role === UserRole.STUDENT) {
        return "/application/student/concept-maps";
    }
    if (user.role === UserRole.TEACHER) {
        if (sharedWithClassroomId) {
            return `/application/teacher/classrooms/${sharedWithClassroomId}`;
        }
        return "/application/teacher/dashboard";
    }
    return getRoleBasedDashboardLink();
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId, getRoleBasedDashboardLink]);

  const getBackButtonText = useCallback(() => {
    if (!user) return "Back";
     if (isNewMapMode || storeMapId === 'new' || user.role === UserRole.ADMIN) {
        return "Back to Dashboard";
    }
    if (user.role === UserRole.STUDENT) {
        return "Back to My Maps";
    }
    if (user.role === UserRole.TEACHER) {
        if (sharedWithClassroomId) {
            return "Back to Classroom";
        }
        return "Back to Dashboard";
    }
    return "Back";
  }, [user, isNewMapMode, storeMapId, sharedWithClassroomId]);

  // Group 7: Effects (useEffect)
  useEffect(() => {
    if (typeof routeMapId === 'string' && routeMapId.trim() !== '') {
      loadMapData(routeMapId);
    }
  }, [routeMapId, loadMapData]);

  useEffect(() => {
    const transformedNodes = (mapData.nodes || []).map(appNode => {
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

    const transformedEdges = (mapData.edges || []).map(appEdge => ({
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
  }, [mapData, setRfNodes, setRfEdges]);


  // ---- CONDITIONAL RENDERING LOGIC ----
  // All hooks have been called before this point.

  if (isStoreLoading) { 
    return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Loading Map..." icon={Loader2} iconClassName="animate-spin" iconLinkHref={getRoleBasedDashboardLink()} />
        <div className="flex justify-center items-center py-10 flex-grow">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const mapIdForErrorCheck = (isNewMapMode || storeMapId === 'new') ? 'new' : routeMapId;
  if (storeError && mapIdForErrorCheck !== 'new') { 
     return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Error Loading Map" icon={AlertTriangle} iconLinkHref={getRoleBasedDashboardLink()} />
        <Card className="flex-grow">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load map: {mapName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{storeError}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={getBackLink()}>
                <ArrowLeft className="mr-2 h-4 w-4" /> {getBackButtonText()}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const mapForInspector: ConceptMap = {
    id: storeMapId || routeMapId,
    name: mapName,
    ownerId: currentMapOwnerId || user?.id || "",
    mapData: mapData, 
    isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId,
    createdAt: currentMapCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    if (selectedElementType === 'node') {
      actualSelectedElementForInspector = mapData.nodes.find(n => n.id === selectedElementId) || null;
    } else if (selectedElementType === 'edge') {
      actualSelectedElementForInspector = mapData.edges.find(e => e.id === selectedElementId) || null;
    }
  }

  const canAddEdge = mapData.nodes.length >= 2;

  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName}
        description={isViewOnlyMode ? "This map is in view-only mode. Interactions are disabled." : "Create, edit, and visualize your ideas. Nodes are draggable."}
        icon={(isNewMapMode || storeMapId === 'new') ? Compass : Share2}
        iconLinkHref={getRoleBasedDashboardLink()}
      >
        {!isViewOnlyMode && (
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

      <EditorToolbar
        onSaveMap={handleSaveMap}
        isSaving={isSaving}
        onExtractConcepts={useCallback(() => { store.resetAiSuggestions(); setIsExtractConceptsModalOpen(true); }, [store])}
        onSuggestRelations={useCallback(() => { store.resetAiSuggestions(); setIsSuggestRelationsModalOpen(true); }, [store])}
        onExpandConcept={useCallback(() => { store.resetAiSuggestions(); setIsExpandConceptModalOpen(true); }, [store])}
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
            mapData={mapData} 
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
    </div>
  );
}
    
    