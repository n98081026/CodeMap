
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Classroom, User, ConceptMap, ProjectSubmission } from "@/types";
import { ArrowLeft, Users, Share2, FolderKanban, Loader2, AlertTriangle, BookOpen } from "lucide-react";
import Link from "next/link";
import { InviteStudentDialog } from "@/components/classrooms/invite-student-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { EmptyState } from "@/components/layout/empty-state"; 

// Import new tab components
import { ClassroomStudentsTab } from "@/components/teacher/classrooms/tabs/ClassroomStudentsTab";
import { ClassroomMapsTab } from "@/components/teacher/classrooms/tabs/ClassroomMapsTab";
import { ClassroomSubmissionsTab } from "@/components/teacher/classrooms/tabs/ClassroomSubmissionsTab";


export default function ClassroomDetailPage() {
  const paramsHook = useParams();
  const routeClassroomId = paramsHook.classroomId as string;

  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoadingClassroom, setIsLoadingClassroom] = useState(true); // For main classroom details and students
  const [errorClassroom, setErrorClassroom] = useState<string | null>(null); // For main classroom details and students
  const { toast } = useToast();

  const [classroomMaps, setClassroomMaps] = useState<ConceptMap[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);

  const [classroomSubmissions, setClassroomSubmissions] = useState<ProjectSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [errorSubmissions, setErrorSubmissions] = useState<string | null>(null);

  const headerIconLink = "/application/teacher/dashboard";

  const fetchClassroomDetailsAndStudents = useCallback(async () => {
    setIsLoadingClassroom(true);
    setErrorClassroom(null);
    try {
      const response = await fetch(`/api/classrooms/${routeClassroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classroom details");
      }
      const data: Classroom = await response.json();
      setClassroom(data); // This data includes students array from the service
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorClassroom(errorMessage);
      toast({ title: "Error Fetching Classroom", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingClassroom(false);
    }
  }, [routeClassroomId, toast]);

  const fetchClassroomMaps = useCallback(async () => {
    setIsLoadingMaps(true);
    setErrorMaps(null);
    try {
      const response = await fetch(`/api/concept-maps?classroomId=${routeClassroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classroom maps");
      }
      const data: ConceptMap[] = await response.json();
      setClassroomMaps(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorMaps(errorMessage);
      toast({ title: "Error Fetching Maps", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingMaps(false);
    }
  }, [routeClassroomId, toast]);

  const fetchClassroomSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    setErrorSubmissions(null);
    try {
      const response = await fetch(`/api/projects/submissions?classroomId=${routeClassroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classroom submissions");
      }
      const data: ProjectSubmission[] = await response.json();
      setClassroomSubmissions(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setErrorSubmissions(errorMessage);
      toast({ title: "Error Fetching Submissions", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, [routeClassroomId, toast]);


  useEffect(() => {
    if (routeClassroomId) {
      fetchClassroomDetailsAndStudents();
      fetchClassroomMaps();
      fetchClassroomSubmissions();
    }
  }, [routeClassroomId, fetchClassroomDetailsAndStudents, fetchClassroomMaps, fetchClassroomSubmissions]);

  const handleRemoveStudent = useCallback(async (studentId: string, studentName: string) => {
    if (!classroom) return;
    try {
      const response = await fetch(`/api/classrooms/${classroom.id}/students/${studentId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to remove student");
      }
      toast({
        title: "Student Removed",
        description: `${studentName} has been removed from the classroom.`,
      });
      fetchClassroomDetailsAndStudents(); // Re-fetch classroom details to update student list
    } catch (errorMsg) {
      toast({
        title: "Error Removing Student",
        description: (errorMsg as Error).message,
        variant: "destructive",
      });
    }
  }, [classroom, toast, fetchClassroomDetailsAndStudents]);

  const handleStudentActionCompleted = useCallback(() => {
    fetchClassroomDetailsAndStudents(); // Re-fetch classroom details after invite/add
  }, [fetchClassroomDetailsAndStudents]);

  if (isLoadingClassroom && !classroom) { // Initial loading state for the whole page
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Loading Classroom..." icon={Loader2} iconClassName="animate-spin" iconLinkHref={headerIconLink}/>
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (errorClassroom || !classroom) { // Main error state if classroom itself fails to load
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Error" icon={AlertTriangle} iconLinkHref={headerIconLink} />
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Could not load classroom</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{errorClassroom || "The classroom data could not be found."}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/application/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enrolledStudents = classroom.students || [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title={classroom.name}
        description={`Teacher: ${classroom.teacherName || 'N/A'} | Invite Code: ${classroom.inviteCode} | Manage students, maps, and submissions.`}
        icon={BookOpen} // Changed from Users to BookOpen for general classroom icon
        iconClassName={isLoadingClassroom ? "animate-spin" : ""}
        iconLinkHref={headerIconLink}
      >
         <Button asChild variant="outline">
          <Link href="/application/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
        </Button>
        <InviteStudentDialog classroomId={classroom.id} onActionCompleted={handleStudentActionCompleted} />
      </DashboardHeader>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4 sm:inline hidden" />Students ({isLoadingClassroom ? '...' : enrolledStudents.length})</TabsTrigger>
          <TabsTrigger value="maps"><Share2 className="mr-2 h-4 w-4 sm:inline hidden" />Concept Maps ({isLoadingMaps ? '...' : classroomMaps.length})</TabsTrigger>
          <TabsTrigger value="submissions"><FolderKanban className="mr-2 h-4 w-4 sm:inline hidden" />Submissions ({isLoadingSubmissions ? '...' : classroomSubmissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>List of students currently enrolled in this classroom.</CardDescription>
            </CardHeader>
            <CardContent>
              <ClassroomStudentsTab
                isLoading={isLoadingClassroom}
                error={errorClassroom}
                students={enrolledStudents}
                onRemoveStudent={handleRemoveStudent}
                onFetchRetry={fetchClassroomDetailsAndStudents}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maps">
          <Card>
            <CardHeader>
              <CardTitle>Shared Concept Maps</CardTitle>
              <CardDescription>Concept maps created by students and shared with this classroom.</CardDescription>
            </CardHeader>
            <CardContent>
                <ClassroomMapsTab
                    isLoading={isLoadingMaps}
                    error={errorMaps}
                    maps={classroomMaps}
                    enrolledStudents={enrolledStudents} 
                    onFetchRetry={fetchClassroomMaps}
                />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Project Submissions</CardTitle>
              <CardDescription>Projects submitted by students in this classroom.</CardDescription>
            </CardHeader>
            <CardContent>
                <ClassroomSubmissionsTab
                    isLoading={isLoadingSubmissions}
                    error={errorSubmissions}
                    submissions={classroomSubmissions}
                    enrolledStudents={enrolledStudents} 
                    onFetchRetry={fetchClassroomSubmissions}
                />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
    
