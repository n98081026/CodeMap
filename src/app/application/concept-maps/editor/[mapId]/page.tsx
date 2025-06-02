
"use client";

import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2, Loader2, AlertTriangle, Save } from "lucide-react";
import React, { useEffect, useState, useCallback, use } from "react"; // Added 'use'
import { useRouter } from 'next/navigation';

import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
} from "@/components/concept-map/genai-modals";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap, ConceptMapData } from "@/types";
import { useAuth } from "@/contexts/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


export default function ConceptMapEditorPage({ params: paramsPromise }: { params: Promise<{ mapId: string }> }) {
  const actualParams = use(paramsPromise); // Unwrap the params Promise
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();
  
  const [isNewMapMode, setIsNewMapMode] = useState(actualParams.mapId === "new");
  const [currentMap, setCurrentMap] = useState<ConceptMap | null>(null); // Store loaded map details
  
  // State for map properties, managed by this page, updated by PropertiesInspector
  const [mapName, setMapName] = useState(isNewMapMode ? "New Concept Map" : "Loading Map...");
  const [mapData, setMapData] = useState<ConceptMapData>({ nodes: [], edges: [] }); // Actual map data for canvas
  const [isPublic, setIsPublic] = useState(false);
  const [sharedWithClassroomId, setSharedWithClassroomId] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(!isNewMapMode);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);

  const loadMapData = useCallback(async (id: string) => {
    if (id === "new") {
      setIsNewMapMode(true);
      setCurrentMap(null);
      setMapName("New Concept Map");
      setMapData({ nodes: [], edges: [] }); // Reset map data for new map
      setIsPublic(false);
      setSharedWithClassroomId(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsNewMapMode(false);
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
      ownerId: user.id, 
      mapData: mapData, 
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
        const updatePayload = { // ownerId needed for service's mock auth
            name: mapName,
            mapData: mapData,
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
      setIsPublic(savedMap.isPublic);
      setSharedWithClassroomId(savedMap.sharedWithClassroomId);
      setIsNewMapMode(false); // It's no longer a "new" map after saving
      
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });
      
      if ((isNewMapMode || !currentMap?.id) && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}`, { scroll: false });
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
    id: "new", 
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
        title={mapName}
        description="Create, edit, and visualize your ideas."
        icon={isNewMapMode && !currentMap?.id ? Compass : Share2}
        iconLinkHref={user?.role === 'student' ? "/application/student/concept-maps" : 
                       user?.role === 'teacher' ? "/application/teacher/dashboard" : 
                       user?.role === 'admin' ? "/application/admin/dashboard" : "/"}
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
            isNewMapMode={isNewMapMode || !currentMap?.id}
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
declare module "@/components/concept-map/properties-inspector" {
    interface PropertiesInspectorProps {
        isNewMapMode?: boolean;
    }
}

