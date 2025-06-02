
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Classroom, ConceptMap } from "@/types";
import { ArrowLeft, BookOpen, Users, Share2, Loader2, AlertTriangle, Eye, FileText } from "lucide-react";
import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";

export default function StudentClassroomDetailPage({ params }: { params: { classroomId: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [sharedMaps, setSharedMaps] = useState<ConceptMap[]>([]);
  const [isLoadingClassroom, setIsLoadingClassroom] = useState(true);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [errorClassroom, setErrorClassroom] = useState<string | null>(null);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);

  const fetchClassroomDetails = useCallback(async () => {
    if (!params.classroomId) return;
    setIsLoadingClassroom(true);
    setErrorClassroom(null);
    try {
      const response = await fetch(`/api/classrooms/${params.classroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classroom details");
      }
      const data: Classroom = await response.json();
      setClassroom(data);
    } catch (err) {
      setErrorClassroom((err as Error).message);
      toast({ title: "Error Fetching Classroom Details", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingClassroom(false);
    }
  }, [params.classroomId, toast]);

  const fetchSharedMaps = useCallback(async () => {
    if (!params.classroomId) return;
    setIsLoadingMaps(true);
    setErrorMaps(null);
    try {
      const response = await fetch(`/api/concept-maps?classroomId=${params.classroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch shared concept maps");
      }
      const data: ConceptMap[] = await response.json();
      setSharedMaps(data);
    } catch (err) {
      setErrorMaps((err as Error).message);
      toast({ title: "Error Fetching Shared Maps", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsLoadingMaps(false);
    }
  }, [params.classroomId, toast]);

  useEffect(() => {
    fetchClassroomDetails();
    fetchSharedMaps();
  }, [fetchClassroomDetails, fetchSharedMaps]);

  if (isLoadingClassroom) {
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Loading Classroom..." icon={Loader2} iconClassName="animate-spin" />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (errorClassroom || !classroom) {
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Error" icon={AlertTriangle} />
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Could not load classroom</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{errorClassroom || "The classroom data could not be found."}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/application/student/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to My Classrooms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={classroom.name}
        description={`Teacher: ${classroom.teacherName || "N/A"}. ${classroom.studentIds.length} students enrolled.`}
        icon={BookOpen}
      >
        <Button asChild variant="outline">
          <Link href="/application/student/classrooms">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to My Classrooms
          </Link>
        </Button>
      </DashboardHeader>

      {classroom.description && (
        <Card>
          <CardHeader>
            <CardTitle>Classroom Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{classroom.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center"><Share2 className="mr-2 h-5 w-5 text-primary" /> Shared Concept Maps</CardTitle>
          <CardDescription>Concept maps shared by the teacher or students in this classroom.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMaps && (
            <div className="flex justify-center items-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" /> <p className="ml-2">Loading maps...</p>
            </div>
          )}
          {errorMaps && !isLoadingMaps && (
            <div className="text-destructive p-4 border border-destructive rounded-md">
              <AlertTriangle className="inline mr-2"/>{errorMaps}
              <Button onClick={fetchSharedMaps} variant="link">Try Again</Button>
            </div>
          )}
          {!isLoadingMaps && !errorMaps && sharedMaps.length === 0 && (
            <div className="text-center py-6">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                <p className="text-muted-foreground">No concept maps have been shared with this classroom yet.</p>
            </div>
          )}
          {!isLoadingMaps && !errorMaps && sharedMaps.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedMaps.map((map) => (
                <Card key={map.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{map.name}</CardTitle>
                    <CardDescription>Last updated: {new Date(map.updatedAt).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">Owner ID: {map.ownerId}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" size="sm" className="w-full">
                      <Link href={`/application/concept-maps/editor/${map.id}?viewOnly=true`}>
                        <Eye className="mr-2 h-4 w-4" /> View Map
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper for DashboardHeader to allow className on icon
declare module "@/components/dashboard/dashboard-header" {
  interface DashboardHeaderProps {
    iconClassName?: string;
  }
}
