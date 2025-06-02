
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
import { useNodesState, useEdgesState, type Node as RFNode, type Edge as RFEdge, MarkerType, type OnNodesChange, type OnEdgesChange } from 'reactflow';


import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
} from "@/components/concept-map/genai-modals";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;


export default function ConceptMapEditorPage({ params: paramsPromise }: { params: Promise<{ mapId: string }> }) {
  const actualParams = use(paramsPromise);
  const searchParams = useSearchParams(); 
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const isViewOnlyMode = searchParams.get('viewOnly') === 'true'; 

  const [isNewMapMode, setIsNewMapMode] = useState(actualParams.mapId === "new");
  const [currentMap, setCurrentMap] = useState<ConceptMap | null>(null); 
  
  const [mapName, setMapName] = useState(isNewMapMode ? "New Concept Map" : "Loading Map...");
  const [mapData, setMapData] = useState<ConceptMapData>({ nodes: [], edges: [] }); 
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(!isNewMapMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  const [aiExtractedConcepts, setAiExtractedConcepts] = useState<string[]>([]);

  // React Flow state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<ConceptMapNode[]>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<ConceptMapEdge[]>([]);


  const loadMapData = useCallback(async (id: string) => {
    if (id === "new") {
      setIsNewMapMode(true);
      setCurrentMap(null);
      setMapName("New Concept Map");
      setMapData({ nodes: [], edges: [] }); 
      setIsPublic(false);
      setSharedWithClassroomId(null);
      setAiExtractedConcepts([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsNewMapMode(false);
    setIsLoading(true);
    setError(null);
    setAiExtractedConcepts([]);
    try {
      const response = await fetch(`/api/concept-maps/${id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load map");
      }
      const data: ConceptMap = await response.json();
      setCurrentMap(data);
      setMapName(data.name);
      setMapData(data.mapData || { nodes: [], edges: [] }); 
      setIsPublic(data.isPublic);
      setSharedWithClassroomId(data.sharedWithClassroomId || null);
    } catch (err) {
      setError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      setMapName("Error Loading Map"); 
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (actualParams.mapId) {
      loadMapData(actualParams.mapId);
    }
  }, [actualParams.mapId, loadMapData]);

  // Sync mapData (our app's source of truth) to React Flow's internal state (rfNodes, rfEdges)
  useEffect(() => {
    const transformedNodes = (mapData.nodes || []).map((appNode, index) => {
      const existingRfNode = rfNodes.find(n => n.id === appNode.id);
      return {
        id: appNode.id,
        type: appNode.type || 'default', // Use appNode.type or default
        data: { label: appNode.text, details: appNode.details },
        position: existingRfNode?.position || { // Preserve existing position if node already in rfNodes
          x: appNode.x ?? (index % 5) * 200 + 50,
          y: appNode.y ?? Math.floor(index / 5) * 120 + 50,
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
    setRfNodes(transformedNodes as RFNode<ConceptMapNode>[]); // Cast needed if data type is more specific

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
    setRfEdges(transformedEdges as RFEdge<ConceptMapEdge>[]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapData.nodes, mapData.edges, setRfNodes, setRfEdges]); // Do not add rfNodes here to avoid loop

  const handleMapPropertiesChange = useCallback((properties: {
    name: string;
    isPublic: boolean;
    sharedWithClassroomId: string | null;
  }) => {
    setMapName(properties.name);
    setIsPublic(properties.isPublic);
    setSharedWithClassroomId(properties.sharedWithClassroomId);
  }, []);


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
    
    // Create nodes to save by taking current rfNodes and mapping them back to AppNode format
    const nodesToSave: ConceptMapNode[] = rfNodes.map(rfNode => ({
      id: rfNode.id,
      text: rfNode.data.label,
      type: rfNode.type || 'default',
      details: rfNode.data.details,
      x: rfNode.position.x,
      y: rfNode.position.y,
    }));

    // Edges are simpler for now as they don't have UI-modifiable positions in this step
    const edgesToSave: ConceptMapEdge[] = (mapData.edges || []).map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        label: edge.label,
    }));


    const mapDataToSave: ConceptMapData = {
      nodes: nodesToSave,
      edges: edgesToSave, 
    };

    const payload = {
      name: mapName,
      ownerId: user.id, 
      mapData: mapDataToSave,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      
      if (isNewMapMode || !currentMap?.id) { 
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
            ownerId: currentMap.ownerId, 
        };
        response = await fetch(`/api/concept-maps/${currentMap.id}`, {
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
      
      setCurrentMap(savedMap);
      // Update local state to reflect saved data, including potentially new ID for new maps
      setMapName(savedMap.name); 
      setMapData(savedMap.mapData || { nodes: [], edges: [] }); // This will trigger useEffect to update rfNodes/rfEdges
      setIsPublic(savedMap.isPublic);
      setSharedWithClassroomId(savedMap.sharedWithClassroomId);
      setIsNewMapMode(false); 
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      // If it was a new map, URL needs to change to the new ID
      if ((isNewMapMode || !currentMap?.id || actualParams.mapId === 'new') && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleConceptsExtracted = (concepts: string[]) => {
    setAiExtractedConcepts(concepts); 
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map.` });
    addConceptsToMapData(concepts, 'ai-extracted-concept');
  };

  const handleRelationsSuggested = (relations: Array<{ source: string; target: string; relation: string }>) => {
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map.` });
    handleAddSuggestedRelationsToMap(relations);
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas. You can add them to the map.` });
    addConceptsToMapData(newConcepts, 'ai-expanded-concept');
  };

  const addConceptsToMapData = (conceptsToAdd: string[], type: string) => {
    if (isViewOnlyMode) return;
    setMapData(prevMapData => {
      const newNodes = [...(prevMapData.nodes || [])];
      let conceptsActuallyAddedCount = 0;
      conceptsToAdd.forEach(conceptText => {
        if (!newNodes.some(node => node.text === conceptText)) {
          // For new nodes added by AI, x and y will be set by the useEffect syncing to rfNodes
          newNodes.push({ id: uniqueNodeId(), text: conceptText, type }); 
          conceptsActuallyAddedCount++;
        }
      });
      if (conceptsActuallyAddedCount > 0) {
        toast({ title: "Concepts Added to Map", description: `${conceptsActuallyAddedCount} new concepts added. Save the map to persist.` });
      } else {
        toast({ title: "No New Concepts Added", description: "All suggested concepts may already exist in the map.", variant: "default" });
      }
      return { ...prevMapData, nodes: newNodes };
    });
  };

  const handleAddSuggestedRelationsToMap = (relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    setMapData(prevMapData => {
      const currentNodes = [...(prevMapData.nodes || [])];
      const currentEdges = [...(prevMapData.edges || [])];
      let relationsActuallyAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;

      const updatedNodes = [...currentNodes];

      relations.forEach(rel => {
        let sourceNode = updatedNodes.find(node => node.text === rel.source);
        if (!sourceNode) {
          sourceNode = { id: uniqueNodeId(), text: rel.source, type: 'ai-concept' }; 
          updatedNodes.push(sourceNode);
          conceptsAddedFromRelationsCount++;
        }
        let targetNode = updatedNodes.find(node => node.text === rel.target);
        if (!targetNode) {
          targetNode = { id: uniqueNodeId(), text: rel.target, type: 'ai-concept' };
          updatedNodes.push(targetNode);
          conceptsAddedFromRelationsCount++;
        }

        if (!currentEdges.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
          currentEdges.push({ id: uniqueEdgeId(), source: sourceNode.id, target: targetNode.id, label: rel.relation });
          relationsActuallyAddedCount++;
        }
      });
      
      let toastMessage = "";
      if (relationsActuallyAddedCount > 0) {
        toastMessage += `${relationsActuallyAddedCount} new relations added. `;
      }
      if (conceptsAddedFromRelationsCount > 0) {
        toastMessage += `${conceptsAddedFromRelationsCount} new concepts (from relations) added. `;
      }
      
      if (toastMessage) {
        toast({ title: "Relations Added to Map", description: `${toastMessage.trim()} Save the map to persist.` });
      } else {
         toast({ title: "No New Relations Added", description: "All suggested relations/concepts may already exist.", variant: "default" });
      }

      return { nodes: updatedNodes, edges: currentEdges };
    });
  };

  const handleAddNodeToData = () => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${mapData.nodes.length + 1}`;
    const newNode: ConceptMapNode = {
      id: uniqueNodeId(),
      text: newNodeText,
      type: 'manual-node', 
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
    // Connect last two nodes for simplicity. In a real UI, user would select source/target.
    const sourceNode = mapData.nodes[mapData.nodes.length - 2];
    const targetNode = mapData.nodes[mapData.nodes.length - 1];

    const newEdge: ConceptMapEdge = {
      id: uniqueEdgeId(),
      source: sourceNode.id, 
      target: targetNode.id,
      label: 'connects',
    };
    setMapData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
    toast({ title: "Edge Added to Map", description: `Edge connecting "${sourceNode.text}" and "${targetNode.text}" added. Save to persist.`});
  };


  if (isLoading) {
    return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Loading Map..." icon={Loader2} iconClassName="animate-spin" iconLinkHref="/application/student/concept-maps" />
        <div className="flex justify-center items-center py-10 flex-grow">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !isNewMapMode) { 
     return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Error Loading Map" icon={AlertTriangle} iconLinkHref="/application/student/concept-maps" />
        <Card className="flex-grow">
          <CardHeader>
            <CardTitle className="text-destructive">Could not load map</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/application/student/concept-maps">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Maps
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const mapForInspector = currentMap || {
    id: actualParams.mapId, // Can be "new"
    name: mapName,
    ownerId: user?.id || "", 
    mapData: mapData,
    isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };


  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={isViewOnlyMode ? `Viewing: ${mapName}` : mapName}
        description={isViewOnlyMode ? "This map is in view-only mode. Node dragging is enabled." : "Create, edit, and visualize your ideas. Nodes are draggable."}
        icon={(isNewMapMode || !currentMap?.id) ? Compass : Share2}
        iconLinkHref={user?.role === 'student' ? "/application/student/concept-maps" : 
                       user?.role === 'teacher' ? "/application/teacher/dashboard" : 
                       user?.role === 'admin' ? "/application/admin/dashboard" : "/"}
      >
        {!isViewOnlyMode && (
          <Button onClick={handleSaveMap} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isSaving ? "Saving..." : "Save Map"}
          </Button>
        )}
        <Button asChild variant="outline">
          <Link href="/application/student/concept-maps"> 
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Maps
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
            onNodesChange={onNodesChange as OnNodesChange} // Cast for compatibility if types slightly differ
            onEdgesChange={onEdgesChange as OnEdgesChange} // Cast for compatibility
            isViewOnlyMode={isViewOnlyMode}
          />
        </div>
        <aside className="hidden w-80 flex-shrink-0 lg:block">
          <PropertiesInspector 
            currentMap={mapForInspector} 
            onMapPropertiesChange={handleMapPropertiesChange}
            isNewMapMode={(isNewMapMode || !currentMap?.id)}
            isViewOnlyMode={isViewOnlyMode}
          />
        </aside>
      </div>

      {isExtractConceptsModalOpen && !isViewOnlyMode && (
        <ExtractConceptsModal onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen} />
      )}
      {isSuggestRelationsModalOpen && !isViewOnlyMode && (
        <SuggestRelationsModal 
          onRelationsSuggested={handleRelationsSuggested} 
          initialConcepts={rfNodes.slice(0,5).map(n => n.data.label)} // Use concepts from current rfNodes
          onOpenChange={setIsSuggestRelationsModalOpen} 
        />
      )}
      {isExpandConceptModalOpen && !isViewOnlyMode && (
        <ExpandConceptModal 
          onConceptExpanded={handleConceptExpanded} 
          initialConcept={rfNodes.length > 0 ? rfNodes[0].data.label : ""} // Use concept from current rfNodes
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
    }
}
declare module "@/components/concept-map/editor-toolbar" {
  interface EditorToolbarProps {
    isViewOnlyMode?: boolean;
    onAddNodeToData?: () => void;
    onAddEdgeToData?: () => void;
  }
}
declare module "@/components/concept-map/interactive-canvas" { // Added this
  interface InteractiveCanvasProps {
    isViewOnlyMode?: boolean;
  }
}
