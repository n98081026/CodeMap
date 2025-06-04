
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ConceptMap } from "@/types";
import { UserRole } from "@/types"; // Make sure UserRole is imported
import { PlusCircle, Share2, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/layout/empty-state";
import { ConceptMapListItem } from "@/components/concept-map/concept-map-list-item";

// Mock data for concept maps
const mockAllConceptMaps: ConceptMap[] = [
  { id: "map-student-alpha", name: "Alpha's Biology Notes", ownerId: "student-test-id", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-10-01", updatedAt: "2023-10-02" },
  { id: "map-student-beta", name: "Beta's History Project", ownerId: "student-another-id", mapData: { nodes: [], edges: [] }, isPublic: true, sharedWithClassroomId: "class-history-101", createdAt: "2023-10-05", updatedAt: "2023-10-08" },
  { id: "map-admin-test", name: "Admin's Test Map (Shared)", ownerId: "admin-mock-id", mapData: { nodes: [], edges: [] }, isPublic: false, sharedWithClassroomId: "class-cs-50", createdAt: "2023-09-15", updatedAt: "2023-09-15" },
  { id: "map-unowned-public", name: "Public Template: Research Paper Outline", ownerId: "system-template-user", mapData: { nodes: [], edges: [] }, isPublic: true, createdAt: "2023-01-01", updatedAt: "2023-01-01" },
];


export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  // State for maps to display, initially empty or based on role immediately
  const [displayMaps, setDisplayMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Keep loading state for potential future API integration
  const [error, setError] = useState<string | null>(null);

  const studentDashboardLink = "/application/student/dashboard";

  // Simulate fetching or filtering maps
  useEffect(() => {
    setIsLoading(true);
    if (user) {
      if (user.role === UserRole.ADMIN) {
        // Admin sees all mock maps for testing
        setDisplayMaps(mockAllConceptMaps);
      } else if (user.role === UserRole.STUDENT) {
        // Student sees only their own maps
        setDisplayMaps(mockAllConceptMaps.filter(m => m.ownerId === user.id));
      } else {
        // Other roles (e.g. Teacher, if they access this page, though not typical) see none by default
        setDisplayMaps([]);
      }
    } else {
      setDisplayMaps([]); // No user, no maps
    }
    setIsLoading(false);
    setError(null); // Assuming mock data load is always successful
  }, [user]);


  const handleDeleteMap = useCallback(async (mapId: string, mapName: string) => {
    if (!user) return;
    // This is a mock delete. In a real app, this would call an API.
    // For now, it just shows a toast and doesn't modify the `displayMaps` state.
    // To see a change, you would need to implement client-side state update or re-filter.
    toast({
      title: "Concept Map Deleted (Mock)",
      description: `"${mapName}" (ID: ${mapId}) has been 'deleted'. This is a mock action.`,
    });
    console.log(`Mock delete for map ID: ${mapId}, Name: ${mapName}, by User: ${user.id}`);
    // To truly update the list for testing, you might filter displayMaps:
    // setDisplayMaps(prevMaps => prevMaps.filter(m => m.id !== mapId));
    // But this would make the mock data disappear until next "fetch" or page load.
  }, [user, toast]);

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
            actionButton={<Button onClick={() => { /* Simulate refetch for mock */ setIsLoading(true); setTimeout(() => { setIsLoading(false); setError(null); if(user?.role === UserRole.ADMIN) setDisplayMaps(mockAllConceptMaps); else if(user) setDisplayMaps(mockAllConceptMaps.filter(m => m.ownerId === user.id)) }, 500 ) }} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && displayMaps.length === 0 && (
        <EmptyState
          icon={Share2}
          title="No Concept Maps Yet"
          description={user?.role === UserRole.ADMIN ? "No mock concept maps found for any user, or the admin filter isn't working." : "You haven't created any concept maps."}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
