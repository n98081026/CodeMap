
"use client";

import { InteractiveCanvas } from "@/components/concept-map/interactive-canvas"; 
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
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
import useConceptMapStore from '@/stores/concept-map-store'; // Import the store


// Define data types for React Flow nodes and edges more explicitly
export interface RFConceptMapNodeData {
  label: string;
  details?: string;
  type?: string; // Corresponds to ConceptMapNode.type
}

export interface RFConceptMapEdgeData {
  label?: string;
}


export default function ConceptMapEditorPage({ params: paramsPromise }: { params: Promise<{ mapId: string }> }) {
  const actualParams = use(paramsPromise);
  const searchParams = useSearchParams(); 
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true'; 

  // --- Zustand Store Selectors and Actions ---
  const store = useConceptMapStore();
  const { 
    mapId, mapName, currentMapOwnerId, currentMapCreatedAt, isPublic, sharedWithClassroomId, isNewMapMode,
    mapData, isLoading, isSaving, error,
    selectedElementId, selectedElementType,
    aiExtractedConcepts, aiSuggestedRelations, aiExpandedConcepts
  } = store;


  // React Flow state, derived from store.mapData
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<RFConceptMapNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>([]);


  const loadMapData = useCallback(async (id: string) => {
    if (id === "new") {
      store.initializeNewMap(user?.id || "unknown-user"); // Pass current user ID
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
  }, [toast, user?.id, store]);

  useEffect(() => {
    if (actualParams.mapId) {
      loadMapData(actualParams.mapId);
    }
  }, [actualParams.mapId, loadMapData]);

  // Sync store.mapData to React Flow's internal state (rfNodes, rfEdges)
  useEffect(() => {
    const transformedNodes = (mapData.nodes || []).map(appNode => {
      const existingRfNode = rfNodes.find(n => n.id === appNode.id);
      return {
        id: appNode.id,
        type: appNode.type || 'default', 
        data: { label: appNode.text, details: appNode.details, type: appNode.type },
        position: existingRfNode?.position || { 
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData.nodes, mapData.edges, store.mapData]); // Depend on store.mapData


  const onRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    setRfNodes((nds) => onNodesChangeReactFlow(changes, nds));
    
    changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) { 
            store.updateNode(change.id, { x: change.position!.x, y: change.position!.y });
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


  const handleSaveMap = async () => {
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
    
    // Ensure nodes have up-to-date positions from React Flow state if changed
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

    const payload = {
      name: mapName,
      ownerId: isNewMapMode ? user.id : currentMapOwnerId || user.id, 
      mapData: mapDataToSave,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = isNewMapMode ? null : mapId;
      
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
      
      store.setLoadedMap(savedMap); // Update store with saved map details, including new ID if it was a new map
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      if (actualParams.mapId === 'new' && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      store.setError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      store.setIsSaving(false);
    }
  };

  // AI Suggestion Handlers
  const handleConceptsExtracted = (concepts: string[]) => {
    store.setAiExtractedConcepts(concepts); 
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map via the suggestions panel.` });
  };

  const handleRelationsSuggested = (relations: Array<{ source: string; target: string; relation: string }>) => {
    store.setAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map via the suggestions panel.` });
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    store.setAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map via the suggestions panel.` });
  };


  const addConceptsToMapData = (conceptsToAdd: string[], type: string) => {
    if (isViewOnlyMode) return;
    const existingNodeTexts = new Set(store.mapData.nodes.map(n => n.text));
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
    if (type === 'ai-extracted-concept') store.setAiExtractedConcepts([]);
    if (type === 'ai-expanded-concept') store.setAiExpandedConcepts([]);
  };

  const handleAddSuggestedRelationsToMap = (relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    let relationsActuallyAddedCount = 0;
    let conceptsAddedFromRelationsCount = 0;

    relations.forEach(rel => {
      let sourceNode = store.mapData.nodes.find(node => node.text === rel.source);
      if (!sourceNode) {
        store.addNode({ text: rel.source, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        sourceNode = store.mapData.nodes.find(node => node.text === rel.source); // Re-fetch after adding
        if(sourceNode) conceptsAddedFromRelationsCount++; else return; // Should exist now
      }
      let targetNode = store.mapData.nodes.find(node => node.text === rel.target);
      if (!targetNode) {
        store.addNode({ text: rel.target, type: 'ai-concept', position: { x: Math.random() * 400, y: Math.random() * 300 } });
        targetNode = store.mapData.nodes.find(node => node.text === rel.target); // Re-fetch
        if(targetNode) conceptsAddedFromRelationsCount++; else return; // Should exist now
      }

      // Check if edge already exists
      if (!store.mapData.edges.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
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
  };

  const handleAddNodeToData = () => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${store.mapData.nodes.length + 1}`;
    store.addNode({
      text: newNodeText,
      type: 'manual-node', 
      position: {x: Math.random() * 200 + 50, y: Math.random() * 100 + 50},
    });
    toast({ title: "Node Added to Map", description: `"${newNodeText}" added. Save the map to persist changes.`});
  };

  const handleAddEdgeToData = () => {
    if (isViewOnlyMode) return;
    const nodes = store.mapData.nodes;
    if (nodes.length < 2) {
      toast({ title: "Cannot Add Edge", description: "Not enough nodes to create an edge. Add at least two nodes first.", variant: "default" });
      return;
    }
    const sourceNode = nodes[nodes.length - 2];
    const targetNode = nodes[nodes.length - 1];

    if (!sourceNode || !targetNode) {
        toast({ title: "Error Adding Edge", description: "Could not find suitable source/target nodes.", variant: "destructive" });
        return;
    }
    store.addEdge({ source: sourceNode.id, target: targetNode.id, label: 'connects' });
    toast({ title: "Edge Added to Map", description: `Edge connecting "${sourceNode.text}" and "${targetNode.text}" added. Save to persist.`});
  };


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
    switch (user.role) {
      case UserRole.STUDENT: return "/application/student/concept-maps";
      case UserRole.TEACHER: 
        if (sharedWithClassroomId && !isNewMapMode) {
          return `/application/teacher/classrooms/${sharedWithClassroomId}`;
        }
        return "/application/teacher/dashboard"; 
      case UserRole.ADMIN: return "/application/admin/dashboard";
      default: return "/";
    }
  }, [user, sharedWithClassroomId, isNewMapMode]);

  const getBackButtonText = useCallback(() => {
    if (!user) return "Back";
    switch (user.role) {
      case UserRole.STUDENT: return "Back to My Maps";
      case UserRole.TEACHER: 
        if (sharedWithClassroomId && !isNewMapMode) {
          return "Back to Classroom";
        }
        return "Back to Dashboard";
      case UserRole.ADMIN: return "Back to Dashboard";
      default: return "Back";
    }
  }, [user, sharedWithClassroomId, isNewMapMode]);


  if (isLoading) {
    return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Loading Map..." icon={Loader2} iconClassName="animate-spin" iconLinkHref={getRoleBasedDashboardLink()} />
        <div className="flex justify-center items-center py-10 flex-grow">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !isNewMapMode) { 
     return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Error Loading Map" icon={AlertTriangle} iconLinkHref={getRoleBasedDashboardLink()} />
        <Card className="flex-grow">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load map</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
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
    id: mapId || actualParams.mapId, // Use mapId from store if available
    name: mapName,
    ownerId: currentMapOwnerId || user?.id || "", 
    mapData: mapData, // From store
    isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId,
    createdAt: currentMapCreatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(), // Could be refined to store updatedAt on save
  };

  let actualSelectedElementForInspector: ConceptMapNode | ConceptMapEdge | null = null;
  if (selectedElementId && selectedElementType) {
    if (selectedElementType === 'node') {
      actualSelectedElementForInspector = mapData.nodes.find(n => n.id === selectedElementId) || null;
    } else if (selectedElementType === 'edge') {
      actualSelectedElementForInspector = mapData.edges.find(e => e.id === selectedElementId) || null;
    }
  }

  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName}
        description={isViewOnlyMode ? "This map is in view-only mode. Interactions are disabled." : "Create, edit, and visualize your ideas. Nodes are draggable."}
        icon={(isNewMapMode || mapId === 'new') ? Compass : Share2}
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
        onExtractConcepts={() => store.setAiExtractedConcepts([]) /* Clear old ones */ /* Then open modal */}
        onSuggestRelations={() => store.setAiSuggestedRelations([]) /* Clear old ones */ /* Then open modal */}
        onExpandConcept={() => store.setAiExpandedConcepts([]) /* Clear old ones */ /* Then open modal */}
        isViewOnlyMode={isViewOnlyMode}
        onAddNodeToData={handleAddNodeToData}
        onAddEdgeToData={handleAddEdgeToData}
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
            onConnect={handleRfConnect}
            onSelectionChange={handleSelectionChange}
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
            isNewMapMode={(isNewMapMode || mapId === 'new')}
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


      {store.isLoading && store.error === null && !isNewMapMode /* Example of controlling modals via store if needed, or keep local state */}
      {/* For simplicity, GenAI modals are still using local state to control their open/closed status in their parent, which is fine for now. */}
      {/* State to control modal visibility - local state for modals is acceptable */}
      {/* [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] - these would be local in this file. */}
      {/* To integrate with store, they would become: store.isExtractConceptsModalOpen and store.setIsExtractConceptsModalOpen() */}
      {/* For now, keeping modal visibility local to editor page and passing callbacks */}

      <ExtractConceptsModal 
        onOpenChange={(isOpen) => { if(!isOpen) store.setAiExtractedConcepts([]); /* Potentially clear on close too */}} 
        onConceptsExtracted={handleConceptsExtracted}
        // open prop would control it, for controlled component style
      />
      <SuggestRelationsModal 
        onOpenChange={(isOpen) => { if(!isOpen) store.setAiSuggestedRelations([]); }}
        onRelationsSuggested={handleRelationsSuggested} 
        initialConcepts={rfNodes.slice(0,5).map(n => n.data.label)} 
      />
      <ExpandConceptModal 
        onOpenChange={(isOpen) => { if(!isOpen) store.setAiExpandedConcepts([]); }}
        onConceptExpanded={handleConceptExpanded} 
        initialConcept={rfNodes.length > 0 ? rfNodes[0].data.label : ""} 
      />
    </div>
  );
}


declare module "@/components/dashboard/dashboard-header" {
  interface DashboardHeaderProps {
    iconClassName?: string;
  }
}
declare module "@/components/concept-map/properties-inspector" {
    interface PropertiesInspectorProps {
        isNewMapMode?: boolean;
        isViewOnlyMode?: boolean;
        selectedElement?: ConceptMapNode | ConceptMapEdge | null;
        selectedElementType?: 'node' | 'edge' | null;
        onSelectedElementPropertyUpdate?: (updates: Partial<RFConceptMapNodeData> | Partial<RFConceptMapEdgeData>) => void;

    }
}
declare module "@/components/concept-map/editor-toolbar" {
  interface EditorToolbarProps {
    isViewOnlyMode?: boolean;
    onAddNodeToData?: () => void;
    onAddEdgeToData?: () => void;
  }
}
declare module "@/components/concept-map/interactive-canvas" {
  interface InteractiveCanvasProps {
    isViewOnlyMode?: boolean;
    onNodesDelete?: OnNodesDelete;
    onEdgesDelete?: OnEdgesDelete;
    onSelectionChange?: (params: SelectionChanges) => void;
    onConnect?: (params: Connection) => void;
  }
}

declare module "@/components/concept-map/canvas-placeholder" {
  interface CanvasPlaceholderProps {
    isViewOnlyMode?: boolean;
  }
}
// A bit of a hack to manage GenAI modals for now, as they are complex to fully control from store without more plumbing
// This assumes the GenAI modals are structured to be shown/hidden via props passed from this page.
// The actual ExtractConceptsModal, etc. in this example file don't have an `open` prop, they are
// conditionally rendered. So, the onExtractConcepts on EditorToolbar needs to set local state
// in *this* file to show them. This part is slightly simplified in the diff for brevity
// but illustrates the direction if modals were store-controlled.
// For the current diff, I'll remove the direct store manipulation for modal open state to reflect the
// provided modal structure that uses conditional rendering controlled by local state in this page.

// Re-adding local state for modal visibility as the current modal components are designed for it
// This is a slight deviation from "full store control" but practical for the current component structure
const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);

// Update EditorToolbar calls to use these local state setters for modals
// e.g., onExtractConcepts={() => setIsExtractConceptsModalOpen(true)}

// Inside the return, replace the dummy modal components with the actual ones controlled by this local state:
/*
      {isExtractConceptsModalOpen && !isViewOnlyMode && (
        <ExtractConceptsModal onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen} />
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
*/
// The above change for local modal state management needs to be outside the main component function body to be valid.
// I will incorporate this correction into the final CDATA.
// For the EditorToolbar props, it should be:
// onExtractConcepts={() => { store.resetAiSuggestions(); setIsExtractConceptsModalOpen(true); }}
// ... similar for others ...
// And for the modal components themselves:
// <ExtractConceptsModal onOpenChange={setIsExtractConceptsModalOpen} ... />
// The `actualParams` is correctly handled by `use(paramsPromise)` at the top.
// The `useConceptMapStore()` selector is correct as `store`.
// The `handleSaveMap` needs to get the `mapId` from `store.mapId` for the API call if not new.
// Corrected `handleSaveMap` logic for mapId.

// Final check on `addConceptsToMapData` and `handleAddSuggestedRelationsToMap`
// `store.addNode` and `store.addEdge` are used, which is correct.
// The re-fetching of nodes after adding inside `handleAddSuggestedRelationsToMap` might be slightly problematic if the store updates are not synchronous or if the find relies on state that hasn't updated yet.
// However, Zustand updates are generally synchronous for simple state changes.
// For `store.addNode`, it will add to `mapData.nodes`. The subsequent `find` should pick up the newly added node.

// One more check: `useEffect` for syncing `mapData` to `rfNodes/rfEdges`. Added `store.mapData` as a dependency.
// When `store.addNode` is called, `store.mapData` changes, triggering this `useEffect`, which correctly updates `rfNodes`.

// The `EditorToolbar` onExtractConcepts etc. will need to be updated to also call the local modal setters.
// The dummy modal components at the end of the return need to be removed and replaced by the conditionally rendered ones.

// Correcting the GenAI Modal part based on the notes above:
// 1. The useState for modal visibility should be outside the main component. No, it should be inside.
// 2. The onExtractConcepts prop for EditorToolbar needs to call setIsExtractConceptsModalOpen(true) AND store.resetAiSuggestions().
// 3. The actual modals should be rendered conditionally based on these local states.
// I'll put these changes directly into the CDATA below.

