
"use client";

import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import { useEffect, useState } from "react";
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
  const { user } = useAuth(); // Needed for saving maps (ownerId)
  
  const isNewMap = params.mapId === "new";
  const [mapName, setMapName] = useState(isNewMap ? "New Concept Map" : "Loading Map...");
  const [mapData, setMapData] = useState<ConceptMapData>({ nodes: [], edges: [] }); // Actual map data for canvas
  const [currentMap, setCurrentMap] = useState<ConceptMap | null>(null); // Store loaded map details

  const [isLoading, setIsLoading] = useState(!isNewMap); // Only load if not a new map
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);


  // State to control modal visibility
  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);


  useEffect(() => {
    if (!isNewMap && params.mapId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/concept-maps/${params.mapId}`)
        .then(async res => {
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to load map");
          }
          return res.json();
        })
        .then((data: ConceptMap) => {
          setMapName(data.name);
          setMapData(data.mapData); // This should be the data for the canvas component
          setCurrentMap(data);
        })
        .catch(err => {
          setError((err as Error).message);
          toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
          setMapName("Error Loading Map");
        })
        .finally(() => setIsLoading(false));
    } else {
        setMapName("New Concept Map");
        // For new maps, initialize with potentially a default name input or allow user to set it.
        // For now, the mapData is empty, canvas would be blank.
    }
  }, [params.mapId, isNewMap, toast]);


  const handleSaveMap = async () => {
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        // Potentially open a dialog to set map name if it's a new map and name is default.
        return;
    }

    setIsSaving(true);
    const payload = {
      name: mapName, // This might need to be editable via PropertiesInspector or a dedicated field
      ownerId: user.id,
      mapData: mapData, // This is the state of your canvas
      isPublic: currentMap?.isPublic ?? false, // Default to private for new maps
      sharedWithClassroomId: currentMap?.sharedWithClassroomId ?? null,
    };

    try {
      let response;
      if (isNewMap || !currentMap?.id) { // Creating a new map
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else { // Updating an existing map
        response = await fetch(`/api/concept-maps/${currentMap.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          // Send ownerId for auth check during update
          body: JSON.stringify({ ...payload, ownerId: currentMap.ownerId }), 
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMap: ConceptMap = await response.json();
      setCurrentMap(savedMap);
      setMapName(savedMap.name);
      // If it was a new map, router.replace might be needed to update URL with new mapId
      // For now, just show success
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      if (isNewMap && savedMap.id) {
        // router.replace(`/application/concept-maps/editor/${savedMap.id}`); // Optional: update URL
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
        <DashboardHeader title="Loading Map..." icon={Loader2} />
        <div className="flex justify-center items-center py-10 flex-grow">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
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

  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={mapName} // Display current map name (can be updated via input)
        description="Create, edit, and visualize your ideas."
        icon={isNewMap ? Compass : Share2}
      >
        {/* TODO: Add an input field here or in PropertiesInspector to change mapName */}
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
          {/* Pass mapData and a setter to CanvasPlaceholder/ActualCanvas */}
          <CanvasPlaceholder /> 
        </div>
        <aside className="hidden w-80 flex-shrink-0 lg:block">
          {/* Pass currentMap and mapName setter to PropertiesInspector */}
          <PropertiesInspector currentMap={currentMap} onMapNameChange={setMapName}/>
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
