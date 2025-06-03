
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ConceptMap } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Share2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/layout/empty-state";
import { ConceptMapListItem } from "@/components/concept-map/concept-map-list-item";

export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentMaps, setStudentMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentDashboardLink = "/application/student/dashboard";


  const fetchStudentMaps = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/concept-maps?ownerId=${user.id}`);
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch concept maps (Status: ${response.status})`);
        } else {
          let errorText = await response.text();
          if (errorText.length > 200) errorText = errorText.substring(0, 200) + "...";
          throw new Error(`Server error (Status: ${response.status}). Response: ${errorText}`);
        }
      }
      const data: ConceptMap[] = await response.json();
      setStudentMaps(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Maps", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchStudentMaps();
    }
  }, [user, fetchStudentMaps]);

  const handleDeleteMap = useCallback(async (mapId: string, mapName: string) => {
    if (!user) return;
    try {
      const response = await fetch(`/api/concept-maps/${mapId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: user.id }) // Send ownerId for backend authorization check
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete concept map");
      }
      toast({
        title: "Concept Map Deleted",
        description: `"${mapName}" has been deleted.`,
      });
      fetchStudentMaps(); // Re-fetch maps to update the list
    } catch (errorMsg) {
      toast({
        title: "Error Deleting Map",
        description: (errorMsg as Error).message,
        variant: "destructive",
      });
    }
  }, [user, toast, fetchStudentMaps]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Concept Maps"
        description="Manage all your created and shared concept maps."
        icon={Share2}
        iconLinkHref={studentDashboardLink}
      >
        <Button asChild>
          <Link href="/application/concept-maps/editor/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Map
          </Link>
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading maps...</p>
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
            icon={AlertTriangle}
            title="Error Loading Maps"
            description={error}
            actionButton={<Button onClick={fetchStudentMaps} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && studentMaps.length === 0 && (
        <EmptyState
          icon={Share2}
          title="No Concept Maps Yet"
          description="You haven't created any concept maps."
          actionButton={
            <Button asChild>
              <Link href="/application/concept-maps/editor/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Map
              </Link>
            </Button>
          }
        />
      )}

      {!isLoading && !error && studentMaps.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentMaps.map((map) => (
            <ConceptMapListItem
              key={map.id}
              map={map}
              onDelete={handleDeleteMap}
            />
          ))}
        </div>
      )}
    </div>
  );
}
