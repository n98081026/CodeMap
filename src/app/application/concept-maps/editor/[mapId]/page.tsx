
"use client";

import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from 'next/navigation';

import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
} from "@/components/concept-map/genai-modals";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData } from "@/types";
import { useAuth } from "@/contexts/auth-context";


export default function ConceptMapEditorPage({ params }: { params: { mapId: string } }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const isNewMap = params.mapId === "new";
  const [currentMap, setCurrentMap] = useState<ConceptMap | null>(null); // Store loaded map details
  
  // State for map properties, managed by this page, updated by PropertiesInspector
  const [mapName, setMapName] = useState(isNewMap ? "New Concept Map" : "Loading Map...");
  const [mapData, setMapData] = useState<ConceptMapData>({ nodes: [], edges: [] }); // Actual map data for canvas
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(!isNewMap);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);

  const loadMapData = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/concept-maps/${id}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Failed to load map");
      }
      const data: ConceptMap = await response.json();
      setCurrentMap(data);
      setMapName(data.name);
      setMapData(data.mapData);
      setIsPublic(data.isPublic);
      setSharedWithClassroomId(data.sharedWithClassroomId || null);
    } catch (err) {
      setError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
      setMapName("Error Loading Map"); // Keep for display
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!isNewMap && params.mapId) {
      loadMapData(params.mapId);
    } else {
      // Initialize for a new map
      setCurrentMap(null);
      setMapName("New Concept Map");
      setMapData({ nodes: [], edges: [] });
      setIsPublic(false);
      setSharedWithClassroomId(null);
      setIsLoading(false);
    }
  }, [params.mapId, isNewMap, loadMapData]);

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
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }

    setIsSaving(true);
    const payload = {
      name: mapName,
      ownerId: user.id, // For new maps or to verify ownership on update
      mapData: mapData, // This is the state of your canvas (currently placeholder)
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      let newMapId = currentMap?.id;

      if (isNewMap || !currentMap?.id) { // Creating a new map
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else { // Updating an existing map
        // The API for PUT /api/concept-maps/[mapId] expects ownerId in body for auth check
        const updatePayload = {
            name: mapName,
            mapData: mapData,
            isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: currentMap.ownerId, // Critical for auth check in API
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
      setCurrentMap(savedMap); // Update currentMap with potentially new ID or updatedAt
      setMapName(savedMap.name); // Ensure name is updated if API modifies it
      setIsPublic(savedMap.isPublic);
      setSharedWithClassroomId(savedMap.sharedWithClassroomId);
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      if ((isNewMap || !currentMap?.id) && savedMap.id) {
         newMapId = savedMap.id;
         // Replace URL to reflect the new map ID without a full page reload
         router.replace(`/application/concept-maps/editor/${newMapId}`, { scroll: false });
      }
    } catch (err) {
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };


  const handleConceptsExtracted = (concepts: string[]) => {
    console.log("Extracted Concepts:", concepts);
    setExtractedConcepts(concepts);
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts.` });
  };

  const handleRelationsSuggested = (relations: any[]) => {
    console.log("Suggested Relations:", relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations.` });
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    console.log("Expanded Concepts:", newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas.` });
  };

  if (isLoading) {
    return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Loading Map..." icon={Loader2} iconClassName="animate-spin" />
        <div className="flex justify-center items-center py-10 flex-grow">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error && !isNewMap) { // Only show full page error if it was an attempt to load an existing map
     return (
      <div className="flex h-full flex-col space-y-4 p-4">
        <DashboardHeader title="Error Loading Map" icon={AlertTriangle} />
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
  
  // Construct a temporary map object for PropertiesInspector if it's a new, unsaved map
  const mapForInspector = currentMap || {
    id: "new", // Special ID for new maps
    name: mapName,
    ownerId: user?.id || "", // Tentative owner
    mapData: mapData,
    isPublic: isPublic,
    sharedWithClassroomId: sharedWithClassroomId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };


  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={mapName}
        description="Create, edit, and visualize your ideas."
        icon={isNewMap && !currentMap?.id ? Compass : Share2}
      >
        <Button onClick={handleSaveMap} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          {isSaving ? "Saving..." : "Save Map"}
        </Button>
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
      />

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-grow">
          <CanvasPlaceholder /> 
        </div>
        <aside className="hidden w-80 flex-shrink-0 lg:block">
          <PropertiesInspector 
            currentMap={mapForInspector} 
            onMapPropertiesChange={handleMapPropertiesChange}
          />
        </aside>
      </div>

      {isExtractConceptsModalOpen && (
        <ExtractConceptsModal onConceptsExtracted={handleConceptsExtracted} onOpenChange={setIsExtractConceptsModalOpen} />
      )}
      {isSuggestRelationsModalOpen && (
        <SuggestRelationsModal onRelationsSuggested={handleRelationsSuggested} initialConcepts={extractedConcepts.slice(0,3)} onOpenChange={setIsSuggestRelationsModalOpen} />
      )}
      {isExpandConceptModalOpen && (
        <ExpandConceptModal onConceptExpanded={handleConceptExpanded} initialConcept={extractedConcepts.length > 0 ? extractedConcepts[0] : ""} onOpenChange={setIsExpandConceptModalOpen} />
      )}
    </div>
  );
}

// Helper for DashboardHeader to allow className on icon
declare module "@/components/dashboard/dashboard-header" {
  interface DashboardHeaderProps {
    iconClassName?: string;
  }
}
