
"use client";

// import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder"; // Replaced
import { InteractiveCanvas } from "@/components/concept-map/interactive-canvas"; // Added
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import React, { useEffect, useState, useCallback, use } from "react";
import { useRouter, useSearchParams } from 'next/navigation';

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
// const uniqueMockItemId = () => `mock-${Date.now()}-${Math.random().toString(16).slice(2)}`; // No longer adding mock items

// Interface for visual mock items - no longer used for canvas display
// interface MockCanvasItem {
//   id: string;
//   type: 'node' | 'edge';
//   label: string;
// }

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
  
  const [aiExtractedConcepts, setAiExtractedConcepts] = useState<string[]>([]); // Kept for modals, not canvas display
  // const [aiSuggestedRelations, setAiSuggestedRelations] = useState<Array<{ source: string; target: string; relation: string }>>([]); // Kept for modals
  // const [aiExpandedConcepts, setAiExpandedConcepts] = useState<string[]>([]); // Kept for modals

  // const [mockCanvasItems, setMockCanvasItems] = useState<MockCanvasItem[]>([]); // No longer used for canvas display


  const loadMapData = useCallback(async (id: string) => {
    if (id === "new") {
      setIsNewMapMode(true);
      setCurrentMap(null);
      setMapName("New Concept Map");
      setMapData({ nodes: [], edges: [] }); 
      // setMockCanvasItems([]); // No longer needed
      setIsPublic(false);
      setSharedWithClassroomId(null);
      setAiExtractedConcepts([]);
      // setAiSuggestedRelations([]); // No longer needed for canvas display
      // setAiExpandedConcepts([]); // No longer needed for canvas display
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsNewMapMode(false);
    setIsLoading(true);
    setError(null);
    setAiExtractedConcepts([]);
    // setAiSuggestedRelations([]); // No longer needed for canvas display
    // setAiExpandedConcepts([]); // No longer needed for canvas display
    // setMockCanvasItems([]); // No longer needed
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
    // TODO: Later, capture node positions from React Flow and include in mapData before saving
    const payload = {
      name: mapName,
      ownerId: user.id, 
      mapData: mapData, // This mapData might not have updated x/y from ReactFlow yet
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
            mapData: mapData, // This mapData might not have updated x/y from ReactFlow yet
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
      setMapName(savedMap.name); 
      setMapData(savedMap.mapData || { nodes: [], edges: [] });
      setIsPublic(savedMap.isPublic);
      setSharedWithClassroomId(savedMap.sharedWithClassroomId);
      setIsNewMapMode(false); 
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      if ((isNewMapMode || !currentMap?.id) && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleConceptsExtracted = (concepts: string[]) => {
    setAiExtractedConcepts(concepts); // Store for potential use (e.g., modal prefill)
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts. You can add them to the map.` });
    // Optionally auto-add to mapData here or provide a button as before
    addConceptsToMapData(concepts, 'ai-extracted-concept');
  };

  const handleRelationsSuggested = (relations: Array<{ source: string; target: string; relation: string }>) => {
    // setAiSuggestedRelations(relations); // Store for potential use
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations. You can add them to the map.` });
    handleAddSuggestedRelationsToMap(relations);
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    // setAiExpandedConcepts(newConcepts); // Store for potential use
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
          newNodes.push({ id: uniqueNodeId(), text: conceptText, type }); // x, y will be default in React Flow
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

  // No longer separate functions for adding AI results, directly add to mapData
  // const handleAddExtractedConceptsToMap = (concepts: string[]) => {
  //   addConceptsToMapData(concepts, 'ai-extracted-concept');
  // };

  // const handleAddExpandedConceptsToMap = (concepts: string[]) => {
  //   addConceptsToMapData(concepts, 'ai-expanded-concept');
  // };

  const handleAddSuggestedRelationsToMap = (relations: Array<{ source: string; target: string; relation: string }>) => {
    if (isViewOnlyMode) return;
    setMapData(prevMapData => {
      const newNodes = [...(prevMapData.nodes || [])];
      const newEdges = [...(prevMapData.edges || [])];
      let relationsActuallyAddedCount = 0;
      let conceptsAddedFromRelationsCount = 0;

      relations.forEach(rel => {
        let sourceNode = newNodes.find(node => node.text === rel.source);
        if (!sourceNode) {
          sourceNode = { id: uniqueNodeId(), text: rel.source, type: 'ai-concept' }; // x,y default in RF
          newNodes.push(sourceNode);
          conceptsAddedFromRelationsCount++;
        }
        let targetNode = newNodes.find(node => node.text === rel.target);
        if (!targetNode) {
          targetNode = { id: uniqueNodeId(), text: rel.target, type: 'ai-concept' }; // x,y default in RF
          newNodes.push(targetNode);
          conceptsAddedFromRelationsCount++;
        }

        if (!newEdges.some(edge => edge.source === sourceNode!.id && edge.target === targetNode!.id && edge.label === rel.relation)) {
          newEdges.push({ id: uniqueEdgeId(), source: sourceNode.id, target: targetNode.id, label: rel.relation });
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

      return { nodes: newNodes, edges: newEdges };
    });
  };

  const handleAddNodeToData = () => {
    if (isViewOnlyMode) return;
    const newNodeText = `Node ${mapData.nodes.length + 1}`;
    const newNode: ConceptMapNode = {
      id: uniqueNodeId(),
      text: newNodeText,
      type: 'manual-node', // Example type
      // x, y will be defaulted by React Flow initially
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
    const newEdge: ConceptMapEdge = {
      id: uniqueEdgeId(),
      source: mapData.nodes[mapData.nodes.length - 2].id, // Connects last two nodes for simplicity
      target: mapData.nodes[mapData.nodes.length - 1].id,
      label: 'connects',
    };
    setMapData(prev => ({ ...prev, edges: [...prev.edges, newEdge] }));
    toast({ title: "Edge Added to Map", description: `Edge connecting "${mapData.nodes[mapData.nodes.length - 2].text}" and "${mapData.nodes[mapData.nodes.length - 1].text}" added. Save to persist.`});
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
    id: actualParams.mapId,
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
          <InteractiveCanvas mapData={mapData} />
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
          initialConcepts={aiExtractedConcepts.slice(0,3)} // Use concepts from state
          onOpenChange={setIsSuggestRelationsModalOpen} 
        />
      )}
      {isExpandConceptModalOpen && !isViewOnlyMode && (
        <ExpandConceptModal 
          onConceptExpanded={handleConceptExpanded} 
          initialConcept={aiExtractedConcepts.length > 0 ? aiExtractedConcepts[0] : ""} // Use concept from state
          onOpenChange={setIsExpandConceptModalOpen} 
        />
      )}
    </div>
  );
}

// Removed declare module for CanvasPlaceholder as it's no longer directly used here for props extension.
// General global declarations if needed should be in a .d.ts file.

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
// No longer needed for CanvasPlaceholder
// declare module "@/components/concept-map/canvas-placeholder" {
//   interface CanvasPlaceholderProps {
//     mapData?: ConceptMapData; 
//     extractedConcepts?: string[];
//     suggestedRelations?: Array<{ source: string; target: string; relation: string }>;
//     expandedConcepts?: string[];
//     mockCanvasItems?: Array<{ id: string; type: 'node' | 'edge'; label: string }>;
//     onAddExtractedConcepts?: (concepts: string[]) => void;
//     onAddSuggestedRelations?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
//     onAddExpandedConcepts?: (concepts: string[]) => void;
//     isViewOnlyMode?: boolean;
//   }
// }
declare module "@/components/concept-map/editor-toolbar" {
  interface EditorToolbarProps {
    isViewOnlyMode?: boolean;
    onAddNodeToData?: () => void;
    onAddEdgeToData?: () => void;
  }
}
