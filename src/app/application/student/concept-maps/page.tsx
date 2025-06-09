
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ConceptMap } from "@/types";
import { UserRole } from "@/types"; 
import { PlusCircle, Share2, Loader2, AlertTriangle, Eye, Edit } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/layout/empty-state";
import { ConceptMapListItem } from "@/components/concept-map/concept-map-list-item";
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER_V3 } from '@/lib/config';


export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayMaps, setDisplayMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const studentDashboardLink = "/application/student/dashboard";

  const fetchUserMaps = useCallback(async () => {
    const userIdToFetch = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3.id : user?.id;

    if (!userIdToFetch) {
      setError("User ID not available for fetching maps.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = `/api/concept-maps?ownerId=${userIdToFetch}`;
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch concept maps");
      }
      const data: ConceptMap[] = await response.json();
      setDisplayMaps(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Concept Maps", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]); // Removed BYPASS_AUTH_FOR_TESTING from deps as it's a const

  useEffect(() => {
    // Check for user OR if bypass is active (which means user might be mocked)
    if (user || BYPASS_AUTH_FOR_TESTING) {
      fetchUserMaps();
    } else {
      setIsLoading(false); 
      //setError("Waiting for user authentication..."); // Avoid setting error if auth is just loading
    }
  }, [user, fetchUserMaps]); // Removed BYPASS_AUTH_FOR_TESTING from deps


  const handleDeleteMap = useCallback(async (mapId: string, mapName: string) => {
    const currentUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3.id : user?.id;
    if (!currentUserId) {
        toast({ title: "Authentication Error", description: "Cannot delete map.", variant: "destructive" });
        return;
    }
    try {
      const response = await fetch(`/api/concept-maps/${mapId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId: currentUserId }), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete concept map");
      }
      toast({ title: "Concept Map Deleted", description: `"${mapName}" has been deleted.` });
      fetchUserMaps(); 
    } catch (err) {
      toast({ title: "Error Deleting Map", description: (err as Error).message, variant: "destructive" });
    }
  }, [user, toast, fetchUserMaps]); // Removed BYPASS_AUTH_FOR_TESTING

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
            actionButton={<Button onClick={fetchUserMaps} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && displayMaps.length === 0 && (
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

      {!isLoading && !error && displayMaps.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayMaps.map((map) => (
            <ConceptMapListItem
              key={map.id}
              map={map}
              onDelete={handleDeleteMap}
              viewLinkHref={`/application/concept-maps/editor/${map.id}?viewOnly=true`}
              editLinkHref={`/application/concept-maps/editor/${map.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
