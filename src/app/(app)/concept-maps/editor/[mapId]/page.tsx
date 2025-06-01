"use client";

import { CanvasPlaceholder } from "@/components/concept-map/canvas-placeholder";
import { EditorToolbar } from "@/components/concept-map/editor-toolbar";
import { PropertiesInspector } from "@/components/concept-map/properties-inspector";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Compass, Share2 } from "lucide-react";
import { useState } from "react";
import {
  ExtractConceptsModal,
  SuggestRelationsModal,
  ExpandConceptModal,
} from "@/components/concept-map/genai-modals"; // Ensure correct path
import { useToast } from "@/hooks/use-toast";


export default function ConceptMapEditorPage({ params }: { params: { mapId: string } }) {
  const { toast } = useToast();
  const mapName = params.mapId === "new" ? "New Concept Map" : `Concept Map: ${params.mapId}`; // Placeholder name

  // State to control modal visibility
  const [isExtractConceptsModalOpen, setIsExtractConceptsModalOpen] = useState(false);
  const [isSuggestRelationsModalOpen, setIsSuggestRelationsModalOpen] = useState(false);
  const [isExpandConceptModalOpen, setIsExpandConceptModalOpen] = useState(false);
  
  // State for GenAI results (example)
  const [extractedConcepts, setExtractedConcepts] = useState<string[]>([]);
  const [suggestedRelations, setSuggestedRelations] = useState<any[]>([]);
  const [expandedConcepts, setExpandedConcepts] = useState<string[]>([]);

  const handleConceptsExtracted = (concepts: string[]) => {
    console.log("Extracted Concepts:", concepts);
    setExtractedConcepts(concepts); // Store or use these concepts
    toast({ title: "AI: Concepts Ready", description: `Found ${concepts.length} concepts.` });
    // Further logic: add concepts to map, display them, etc.
  };

  const handleRelationsSuggested = (relations: any[]) => {
    console.log("Suggested Relations:", relations);
    setSuggestedRelations(relations);
    toast({ title: "AI: Relations Ready", description: `Found ${relations.length} relations.` });
    // Further logic: display suggestions, allow user to add to map
  };

  const handleConceptExpanded = (newConcepts: string[]) => {
    console.log("Expanded Concepts:", newConcepts);
    setExpandedConcepts(newConcepts);
    toast({ title: "AI: Expansion Ready", description: `Found ${newConcepts.length} new ideas.` });
    // Further logic: display new concepts, allow user to add to map
  };


  return (
    <div className="flex h-full flex-col space-y-4">
      <DashboardHeader
        title={mapName}
        description="Create, edit, and visualize your ideas."
        icon={params.mapId === "new" ? Compass : Share2}
      >
        <Button asChild variant="outline">
          <Link href="/student/concept-maps"> {/* Adjust link based on role or context */}
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Maps
          </Link>
        </Button>
      </DashboardHeader>

      <EditorToolbar
        onExtractConcepts={() => setIsExtractConceptsModalOpen(true)}
        onSuggestRelations={() => setIsSuggestRelationsModalOpen(true)}
        onExpandConcept={() => setIsExpandConceptModalOpen(true)}
      />

      <div className="flex flex-1 gap-4 overflow-hidden">
        <div className="flex-grow">
          <CanvasPlaceholder />
        </div>
        <aside className="hidden w-80 flex-shrink-0 lg:block">
          <PropertiesInspector />
        </aside>
      </div>

      {/* GenAI Modals - controlled by state */}
      {isExtractConceptsModalOpen && (
        <ExtractConceptsModal onConceptsExtracted={handleConceptsExtracted} />
      )}
      {isSuggestRelationsModalOpen && (
        // Pass selected concepts from map if available
        <SuggestRelationsModal onRelationsSuggested={handleRelationsSuggested} initialConcepts={extractedConcepts.slice(0,3)} />
      )}
      {isExpandConceptModalOpen && (
        // Pass selected concept from map if available
        <ExpandConceptModal onConceptExpanded={handleConceptExpanded} initialConcept={extractedConcepts.length > 0 ? extractedConcepts[0] : ""} />
      )}
    </div>
  );
}
