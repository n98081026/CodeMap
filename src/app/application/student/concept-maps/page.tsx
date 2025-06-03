
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { ConceptMap } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Share2, Eye, Edit, Trash2, Loader2, AlertTriangle } from "lucide-react"; 
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export default function StudentConceptMapsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentMaps, setStudentMaps] = useState<ConceptMap[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let studentDashboardLink = "/application/student/dashboard";
  if (user && user.role !== UserRole.STUDENT) {
    studentDashboardLink = user.role === UserRole.ADMIN ? "/application/admin/dashboard" : "/application/teacher/dashboard";
  }

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
        body: JSON.stringify({ ownerId: user.id }) 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete concept map");
      }
      toast({
        title: "Concept Map Deleted",
        description: `"${mapName}" has been deleted.`,
      });
      fetchStudentMaps(); 
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
         <Card className="shadow-md border-destructive">
          <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5"/>Error Loading Maps</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap break-words">{error}</p>
            <Button onClick={fetchStudentMaps} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && studentMaps.length === 0 && (
         <Card className="shadow-md w-full max-w-lg mx-auto">
            <CardHeader className="items-center text-center">
              <Share2 className="h-16 w-16 text-muted-foreground/70 mb-4" /> 
              <CardTitle>No Concept Maps Yet</CardTitle>
              <CardDescription>You haven&apos;t created any concept maps.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/application/concept-maps/editor/new">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Map
                </Link>
              </Button>
            </CardContent>
          </Card>
      )}

      {!isLoading && !error && studentMaps.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studentMaps.map((map) => (
            <Card key={map.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl">{map.name}</CardTitle>
                <CardDescription>
                  {map.isPublic ? "Public" : "Private"}
                  {map.sharedWithClassroomId && ` | Shared with: ${map.sharedWithClassroomId}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">
                  Last updated: {new Date(map.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
              <CardFooter className="grid grid-cols-3 gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/application/concept-maps/editor/${map.id}`}>
                    <Eye className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View</span>
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/application/concept-maps/editor/${map.id}?edit=true`}>
                    <Edit className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                  </Link>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the concept map "{map.name}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteMap(map.id, map.name)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
