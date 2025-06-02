
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
import { useNodesState, useEdgesState, MarkerType, addEdge as rfAddEdge } from 'reactflow';


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


const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

  const [isNewMapMode, setIsNewMapMode] = useState(actualParams.mapId === "new");
  
  // mapData is the single source of truth for content
  const [mapData, setMapData] = useState<ConceptMapData>({ nodes: [], edges: [] }); 
  
  // Map-level properties managed directly
  const [mapName, setMapName] = useState(isNewMapMode ? "New Concept Map" : "Loading Map...");
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);
  const [currentMapOwnerId, setCurrentMapOwnerId] = useState<string | null>(null); // To track owner for saving existing maps
  const [currentMapCreatedAt, setCurrentMapCreatedAt] = useState<string | null>(null);


  const [isLoading, setIsLoading] = useState(!isNewMapMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  // States for AI suggestions before they are added to the map
  const [aiExtractedConcepts, setAiExtractedConcepts] = useState<string[]>([]);
  const [aiSuggestedRelations, setAiSuggestedRelations] = useState<Array<{ source: string; target: string; relation: string }>>([]);
  const [aiExpandedConcepts, setAiExpandedConcepts] = useState<string[]>([]);


  // React Flow state, derived from mapData
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<RFConceptMapNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>([]);

  // State for selected element
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedElementType, setSelectedElementType] = useState<'node' | 'edge' | null>(null);


  const loadMapData = useCallback(async (id: string) => {
    if (id === "new") {
      setIsNewMapMode(true);
      setMapName("New Concept Map");
      setMapData({ nodes: [], edges: [] }); 
      setIsPublic(false);
      setSharedWithClassroomId(null);
      setCurrentMapOwnerId(user?.id || null); // New map owned by current user
      setCurrentMapCreatedAt(new Date().toISOString());
      setAiExtractedConcepts([]);
      setAiSuggestedRelations([]);
      setAiExpandedConcepts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsNewMapMode(false);
    setIsLoading(true);
    setError(null);
    setAiExtractedConcepts([]);
    setAiSuggestedRelations([]);
    setAiExpandedConcepts([]);
    try {
      const response = await fetch(`/api/concept-maps/${id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load map");
      }
      const data: ConceptMap = await response.json();
      setMapName(data.name);
      setMapData(data.mapData || { nodes: [], edges: [] }); 
      setIsPublic(data.isPublic);
      setSharedWithClassroomId(data.sharedWithClassroomId || null);
      setCurrentMapOwnerId(data.ownerId);
      setCurrentMapCreatedAt(data.createdAt);
    } catch (err) {
      setError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      setMapName("Error Loading Map"); 
    } finally {
      setIsLoading(false);
    }
  }, [toast, user?.id]);

  useEffect(() => {
    if (actualParams.mapId) {
      loadMapData(actualParams.mapId);
    }
  }, [actualParams.mapId, loadMapData]);

  // Sync mapData to React Flow's internal state (rfNodes, rfEdges)
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
  }, [mapData.nodes, mapData.edges]); 


  const onRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    setRfNodes((nds) => onNodesChangeReactFlow(changes, nds));
    
    changes.forEach(change => {
        if (change.type === 'position' && change.position && change.dragging === false) { // Update only on drag end
            setMapData(prevMapData => ({
                ...prevMapData,
                nodes: prevMapData.nodes.map(n => 
                    n.id === change.id ? { ...n, x: change.position!.x, y: change.position!.y } : n
                )
            }));
        }
    });
  }, [setRfNodes, onNodesChangeReactFlow, isViewOnlyMode]);


  const onRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    setRfEdges((eds) => onEdgesChangeReactFlow(changes, eds));
  }, [setRfEdges, onEdgesChangeReactFlow, isViewOnlyMode]);


  const handleRfNodesDeleted: OnNodesDelete = useCallback((deletedRfNodes) => {
    if (isViewOnlyMode) return;
    const deletedNodeIds = new Set(deletedRfNodes.map(n => n.id));
    setMapData(prevMapData => ({
      nodes: prevMapData.nodes.filter(node => !deletedNodeIds.has(node.id)),
      edges: prevMapData.edges.filter(edge => !deletedNodeIds.has(edge.source) && !deletedNodeIds.has(edge.target)),
    }));
    toast({ title: "Nodes Deleted", description: `${deletedNodeIds.size} node(s) and associated edges removed.` });
  }, [isViewOnlyMode, toast]);

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback((deletedRfEdges) => {
    if (isViewOnlyMode) return;
    const deletedEdgeIds = new Set(deletedRfEdges.map(e => e.id));
    setMapData(prevMapData => ({
      ...prevMapData,
      edges: prevMapData.edges.filter(edge => !deletedEdgeIds.has(edge.id)),
    }));
    toast({ title: "Edges Deleted", description: `${deletedEdgeIds.size} edge(s) removed.` });
  }, [isViewOnlyMode, toast]);

  const handleRfConnect: (params: Connection) => void = useCallback((params) => {
    if (isViewOnlyMode) return;
    const newEdge: ConceptMapEdge = {
        id: uniqueEdgeId(),
        source: params.source!,
        target: params.target!,
        label: "connects", // Default label for new edges
    };
    setMapData(prev => ({
        ...prev,
        edges: [...prev.edges, newEdge]
    }));
    toast({ title: "Edge Created", description: `New connection added. Save map to persist.` });
  }, [isViewOnlyMode, toast]);


  const handleSelectionChange = useCallback((params: SelectionChanges) => {
    const { nodes, edges } = params;
    if (nodes.length === 1 && edges.length === 0) {
        setSelectedElementId(nodes[0].id);
        setSelectedElementType('node');
    } else if (edges.length === 1 && nodes.length === 0) {
        setSelectedElementId(edges[0].id);
        setSelectedElementType('edge');
    } else {
        setSelectedElementId(null);
        setSelectedElementType(null);
    }
  }, []);

  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    setMapName(properties.name);
    setIsPublic(properties.isPublic);
    setSharedWithClassroomId(properties.sharedWithClassroomId);
  }, []);

  const handleSelectedElementPropertyUpdate = useCallback((
    updates: Partial<RFConceptMapNodeData> | Partial<RFConceptMapEdgeData>
  ) => {
    if (!selectedElementId || !selectedElementType || isViewOnlyMode) return;

    setMapData(prevMapData => {
      if (selectedElementType === 'node') {
        return {
          ...prevMapData,
          nodes: prevMapData.nodes.map(node => {
            if (node.id === selectedElementId) {
              const nodeUpdates: Partial<ConceptMapNode> = {};
              const rfUpdates = updates as Partial<RFConceptMapNodeData>;
              if (rfUpdates.label !== undefined) nodeUpdates.text = rfUpdates.label;
              if (rfUpdates.details !== undefined) nodeUpdates.details = rfUpdates.details;
              if (rfUpdates.type !== undefined) nodeUpdates.type = rfUpdates.type; 
              return { ...node, ...nodeUpdates };
            }
            return node;
          })
        };
      } else if (selectedElementType === 'edge') {
         return {
          ...prevMapData,
          edges: prevMapData.edges.map(edge => {
            if (edge.id === selectedElementId) {
              const edgeUpdates: Partial<ConceptMapEdge> = {};
              const rfUpdates = updates as Partial<RFConceptMapEdgeData>;
              if (rfUpdates.label !== undefined) edgeUpdates.label = rfUpdates.label;
              return { ...edge, ...edgeUpdates };
            }
            return edge;
          })
        };
      }
      return prevMapData;
    });
  }, [selectedElementId, selectedElementType, isViewOnlyMode]);


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

    setIsSaving(true);
    
    const finalNodesToSave = rfNodes.map(rfNode => {
        const appNode = mapData.nodes.find(n => n.id === rfNode.id);
        return {
            ...(appNode || { id: rfNode.id, text: rfNode.data.label, type: rfNode.data.type || 'default'}), // Fallback if not in mapData.nodes
            x: rfNode.position.x,
            y: rfNode.position.y,
            text: rfNode.data.label, // Ensure text is from React Flow node data
            details: rfNode.data.details,
            type: rfNode.data.type || appNode?.type || 'default'
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
      const currentMapIdForAPI = isNewMapMode ? null : actualParams.mapId;
      
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
      
      setMapName(savedMap.name); 
      setMapData(savedMap.mapData || { nodes: [], edges: [] });
      setIsPublic(savedMap.isPublic);
      setSharedWithClassroomId(savedMap.sharedWithClassroomId);
      setCurrentMapOwnerId(savedMap.ownerId);
      setCurrentMapCreatedAt(savedMap.createdAt);
      setIsNewMapMode(false); 
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      if (actualParams.mapId === 'new' && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // AI Suggestion Handlers
  const handleConceptsExtracted = (concepts: string[]) => {
    setAiExtractedConcepts(concepts); 
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map via the suggestions panel.` });
  };

  const handleRelationsSuggested = (relations: Array<{ source: string; target: string; relation: string }>) => {
    setAiSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map via the suggestions panel.` });
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    setAiExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map via the suggestions panel.` });
  };


  const addConceptsToMapData = (conceptsToAdd: string[], type: string) => {
    if (isViewOnlyMode) return;
    setMapData(prevMapData => {
      const existingNodeTexts = new Set(prevMapData.nodes.map(n => n.text));
      const newNodes = conceptsToAdd
        .filter(conceptText => !existingNodeTexts.has(conceptText))
        .map(conceptText => ({
          id: uniqueNodeId(),
          text: conceptText,
          type: type,
          x: Math.random() * 400, 
          y: Math.random() * 300,
        }));

      if (newNodes.length > 0) {
        toast({ title: "Concepts Added to Map", description: `${newNodes.length} new concepts added. Save the map to persist.` });
        if (type === 'ai-extracted-concept') setAiExtractedConcepts([]);
        if (type === 'ai-expanded-concept') setAiExpandedConcepts([]);
        return { ...prevMapData, nodes: [...prevMapData.nodes, ...newNodes] };
      } else {
        toast({ title: "No New Concepts Added", description: "All suggested concepts may already exist in the map.", variant: "default" });
        if (type === 'ai-extracted-concept') setAiExtractedConcepts([]);
        if (type === 'ai-expanded-concept') setAiExpandedConcepts([]);
        return prevMapData;
      }
    });
  };

  const handleAddSuggestedRelationsToMap = (relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    setMapData(prevMapData => {
      const modifiableNodes = [...prevMapData.nodes];
      const modifiableEdges = [...prevMapData.edges];
      let relationsActuallyAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;

      relations.forEach(rel => {
        let sourceNode = modifiableNodes.find(node => node.text === rel.source);
        if (!sourceNode) {
          sourceNode = { id: uniqueNodeId(), text: rel.source, type: 'ai-concept', x: Math.random() * 400, y: Math.random() * 300 }; 
          modifiableNodes.push(sourceNode);
          conceptsAddedFromRelationsCount++;
        }
        let targetNode = modifiableNodes.find(node => node.text === rel.target);
        if (!targetNode) {
          targetNode = { id: uniqueNodeId(), text: rel.target, type: 'ai-concept', x: Math.random() * 400, y: Math.random() * 300 };
          modifiableNodes.push(targetNode);
          conceptsAddedFromRelationsCount++;
        }

        if (!modifiableEdges.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
          modifiableEdges.push({ id: uniqueEdgeId(), source: sourceNode.id, target: targetNode.id, label: rel.relation });
          relationsActuallyAddedCount++;
        }
      });
      
      let toastMessage = "";
      if (relationsActuallyAddedCount > 0) toastMessage += `${relationsActuallyAddedCount} new relations added. `;
      if (conceptsAddedFromRelationsCount > 0) toastMessage += `${conceptsAddedFromRelationsCount} new concepts (from relations) added. `;
      
      if (toastMessage) {
        toast({ title: "Relations Added to Map", description: `${toastMessage.trim()} Save the map to persist.` });
        setAiSuggestedRelations([]);
        return { nodes: modifiableNodes, edges: modifiableEdges };
      } else {
         toast({ title: "No New Relations Added", description: "All suggested relations/concepts may already exist.", variant: "default" });
         setAiSuggestedRelations([]);
         return prevMapData;
      }
    });
  };

  const handleAddNodeToData = () => {
    if (isViewOnlyMode) return;
    const newNode: ConceptMapNode = {
      id: uniqueNodeId(),
      text: `Node ${mapData.nodes.length + 1}`,
      type: 'manual-node', 
      x: Math.random() * 200 + 50,
      y: Math.random() * 100 + 50,
    };
    setMapData(prev => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    toast({ title: "Node Added to Map", description: `"${newNode.text}" added. Save the map to persist changes.`});
  };

  const handleAddEdgeToData = () => {
    if (isViewOnlyMode) return;
    if (mapData.nodes.length < 2) {
      toast({ title: "Cannot Add Edge", description: "Not enough nodes to create an edge. Add at least two nodes first.", variant: "default" });
      return;
    }
    const sourceNode = mapData.nodes[mapData.nodes.length - 2];
    const targetNode = mapData.nodes[mapData.nodes.length - 1];

    if (!sourceNode || !targetNode) {
        toast({ title: "Error Adding Edge", description: "Could not find suitable source/target nodes.", variant: "destructive" });
        return;
    }

    const newEdge: ConceptMapEdge = {
      id: uniqueEdgeId(),
      source: sourceNode.id, 
      target: targetNode.id,
      label: 'connects',
    };
    setMapData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
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
        return "/application/teacher/dashboard"; // Fallback for teacher if no specific classroom context or new map
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
    id: actualParams.mapId, 
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

  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName}
        description={isViewOnlyMode ? "This map is in view-only mode." : "Create, edit, and visualize your ideas. Nodes are draggable."}
        icon={(isNewMapMode || actualParams.mapId === 'new') ? Compass : Share2}
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
        onExtractConcepts={() => setIsExtractConceptsModalOpen(true)}
        onSuggestRelations={() => setIsSuggestRelationsModalOpen(true)}
        onExpandConcept={() => setIsExpandConceptModalOpen(true)}
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
            isNewMapMode={(isNewMapMode || actualParams.mapId === 'new')}
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

