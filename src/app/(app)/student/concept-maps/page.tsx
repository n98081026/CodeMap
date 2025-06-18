"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ConceptMap } from "@/types";
import { PlusCircle, Share2, Eye, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import React, { useCallback } from "react"; // Import React and useCallback

// Mock data for concept maps
const mockConceptMaps: ConceptMap[] = [
  { id: "mapA", name: "My First Project Overview", ownerId: "student1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-03-01", updatedAt: "2023-03-02" },
  { id: "mapB", name: "Algorithm Study Notes", ownerId: "student1", mapData: { nodes: [], edges: [] }, isPublic: true, sharedWithClassroomId: "class1", createdAt: "2023-03-05", updatedAt: "2023-03-08" },
  { id: "mapC", name: "Database Design Ideas", ownerId: "anotherStudent", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-03-10", updatedAt: "2023-03-10" },
];

// Define the new memoized component for displaying a single student concept map card
interface StudentConceptMapCardProps {
  map: ConceptMap;
  onDelete: (mapId: string, mapName: string) => void;
}

const StudentConceptMapCard: React.FC<StudentConceptMapCardProps> = React.memo(({ map, onDelete }) => {
  return (
    <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">{map.name}</CardTitle>
        <CardDescription>
          {map.isPublic ? "Public" : "Private"}
          {map.sharedWithClassroomId && ` | Shared with Classroom ID: ${map.sharedWithClassroomId}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-sm text-muted-foreground">
          Last updated: {new Date(map.updatedAt).toLocaleDateString()}
        </p>
        {/* Add more details like node/edge count if available */}
      </CardContent>
      <CardFooter className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/concept-maps/editor/${map.id}`}>
            <Eye className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View</span>
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/concept-maps/editor/${map.id}?edit=true`}>
            <Edit className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
          </Link>
        </Button>
        <Button variant="destructive" size="sm" onClick={() => onDelete(map.id, map.name)}>
          <Trash2 className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
        </Button>
      </CardFooter>
    </Card>
  );
});
StudentConceptMapCard.displayName = 'StudentConceptMapCard';

export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  // Filter maps for the current student
  const studentMaps = user ? mockConceptMaps.filter(m => m.ownerId === user.id) : [];

  const handleDeleteMap = useCallback((mapId: string, mapName: string) => {
    // Mock deletion
    console.log(`Deleting map ${mapId}`);
    toast({
      title: "Concept Map Deleted (Mock)",
      description: `"${mapName}" has been deleted.`,
    });
    // Re-fetch or update local state
  }, [toast]); // Add other dependencies if the real implementation needs them

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Concept Maps"
        description="Manage all your created and shared concept maps."
        icon={Share2}
      >
        <Button asChild>
          <Link href="/concept-maps/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Map
          </Link>
        </Button>
      </DashboardHeader>

      {studentMaps.length === 0 && (
         <Card className="shadow-md">
          <CardHeader>
            <CardTitle>No Concept Maps Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You haven&apos;t created any concept maps. Click the button above to get started!</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {studentMaps.map((map) => (
          <StudentConceptMapCard key={map.id} map={map} onDelete={handleDeleteMap} />
        ))}
      </div>
    </div>
  );
}
