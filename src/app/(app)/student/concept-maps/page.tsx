"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Share2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { ConceptMap } from "@/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ConceptMapListItem } from "@/components/concept-map/concept-map-list-item";
import { EmptyState } from "@/components/ui/empty-state";

export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [conceptMaps, setConceptMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStudentConceptMaps = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    if (!user?.id) {
      setError("User not authenticated.");
      setIsLoading(false);
      toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/concept-maps?ownerId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch concept maps");
      }
      const data: ConceptMap[] = await response.json();
      setConceptMaps(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({ title: "Error Fetching Concept Maps", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchStudentConceptMaps();
    }
  }, [user?.id, fetchStudentConceptMaps]);

  const handleDeleteMap = useCallback(async (mapId: string, mapName: string) => {
    try {
      const response = await fetch(`/api/concept-maps/${mapId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete concept map");
      }
      toast({ title: "Concept Map Deleted", description: `"${mapName}" has been successfully deleted.` });
      fetchStudentConceptMaps(); // Refresh the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ title: "Error Deleting Map", description: errorMessage, variant: "destructive" });
    }
  }, [toast, fetchStudentConceptMaps]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-destructive" />}
          title="Error Loading Concept Maps"
          description={error}
          action={<Button onClick={fetchStudentConceptMaps}>Retry</Button>}
        />
      );
    }

    if (conceptMaps.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No Concept Maps Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You haven&apos;t created any concept maps. Click the button below to get started!</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {conceptMaps.map((map) => (
          <ConceptMapListItem
            key={map.id}
            map={map}
            onDelete={() => handleDeleteMap(map.id, map.name)}
            // viewLinkHref={`/concept-maps/editor/${map.id}`} // Default in component
            // editLinkHref={`/concept-maps/editor/${map.id}?edit=true`} // Default in component
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Concept Maps"
        description="Manage all your created and shared concept maps."
        icon={Share2} // Kept Share2 as per original, could be Brain, Lightbulb, etc.
      >
        <Button asChild>
          <Link href="/concept-maps/editor/new"> {/* Changed link to editor/new for consistency */}
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Map
          </Link>
        </Button>
      </DashboardHeader>
      {renderContent()}
    </div>
  );
}
