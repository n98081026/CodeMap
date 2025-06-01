
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Classroom, User, ConceptMap, ProjectSubmission } from "@/types"; // Keep ConceptMap, ProjectSubmission for other tabs
import { UserRole, ProjectSubmissionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Share2, FolderKanban, Trash2, Eye, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { InviteStudentDialog } from "@/components/classrooms/invite-student-dialog";
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


// Mock data for concept maps and submissions until their APIs are connected
const mockConceptMaps: ConceptMap[] = [
  { id: "map1", name: "Basic Algorithms", ownerId: "s1", sharedWithClassroomId: "class1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-01-10", updatedAt: "2023-01-11" },
  { id: "map2", name: "Sorting Techniques", ownerId: "s2", sharedWithClassroomId: "class1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-01-12", updatedAt: "2023-01-12" },
  { id: "map-test-student", name: "AI Intro Map", ownerId: "student-test-id", sharedWithClassroomId: "test-classroom-1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-04-01", updatedAt: "2023-04-01" },
];
const mockProjectSubmissions: ProjectSubmission[] = [
  { id: "sub1", studentId: "s1", classroomId: "class1", originalFileName: "project1.zip", fileSize: 1024, submissionTimestamp: "2023-01-15", analysisStatus: ProjectSubmissionStatus.COMPLETED, generatedConceptMapId: "genMap1" },
  { id: "sub2", studentId: "s3", classroomId: "class1", originalFileName: "project_final.rar", fileSize: 2048, submissionTimestamp: "2023-01-18", analysisStatus: ProjectSubmissionStatus.PROCESSING },
  { id: "sub-test-student", studentId: "student-test-id", classroomId: "test-classroom-1", originalFileName: "ai_project_draft.zip", fileSize: 1536, submissionTimestamp: "2023-04-02", analysisStatus: ProjectSubmissionStatus.COMPLETED, generatedConceptMapId: "map-ai-generated" },
];


export default function ClassroomDetailPage({ params }: { params: { classroomId: string } }) {
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchClassroomDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classrooms/${params.classroomId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classroom details");
      }
      const data: Classroom = await response.json();
      setClassroom(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (params.classroomId) {
      fetchClassroomDetails();
    }
  }, [params.classroomId]);

  const handleRemoveStudent = async (studentId: string, studentName: string) => {
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
      fetchClassroomDetails(); // Refresh classroom details
    } catch (error) {
      toast({
        title: "Error Removing Student",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const handleInviteSent = (studentEmail?: string, studentId?: string) => {
    // If studentId is provided (e.g. from a direct add by ID functionality)
    if (studentId && classroom) {
        // Potentially call addStudentToClassroom API here
        // For now, just refresh to see if manual add worked elsewhere or log
        console.log(`Student ID ${studentId} potentially added to classroom ${classroom.id}`);
        fetchClassroomDetails();
    } else if (studentEmail) {
        console.log(`Invite sent to ${studentEmail}, (mocked).`);
    }
    // Refresh student list or show a more persistent success message
    // fetchClassroomDetails(); // or update state locally if API returns updated classroom
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Loading Classroom..." icon={Loader2} />
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Error" icon={AlertTriangle} />
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Could not load classroom</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "The classroom data could not be found."}</p>
            <Button asChild variant="outline" className="mt-4">
              <Link href="/application/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const enrolledStudents = classroom.students || [];
  // TODO: Fetch actual maps and submissions for this classroom when APIs are ready
  const classroomMaps = mockConceptMaps.filter(m => m.sharedWithClassroomId === classroom.id);
  const classroomSubmissions = mockProjectSubmissions.filter(s => s.classroomId === classroom.id);

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={classroom.name}
        description={`Teacher: ${classroom.teacherName || 'N/A'} | Invite Code: ${classroom.inviteCode} | Manage students, maps, and submissions.`}
        icon={Users}
      >
         <Button asChild variant="outline">
          <Link href="/application/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
        </Button>
        <InviteStudentDialog classroomId={classroom.id} onInviteSent={handleInviteSent} />
      </DashboardHeader>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="students"><Users className="mr-2 h-4 w-4 sm:inline hidden" />Students ({enrolledStudents.length})</TabsTrigger>
          <TabsTrigger value="maps"><Share2 className="mr-2 h-4 w-4 sm:inline hidden" />Concept Maps ({classroomMaps.length})</TabsTrigger>
          <TabsTrigger value="submissions"><FolderKanban className="mr-2 h-4 w-4 sm:inline hidden" />Submissions ({classroomSubmissions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
              <CardDescription>List of students currently enrolled in this classroom.</CardDescription>
            </CardHeader>
            <CardContent>
              {enrolledStudents.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrolledStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell className="text-right">
                           <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Remove student">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action will remove {student.name} from the classroom. They will lose access to classroom materials.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveStudent(student.id, student.name)}>
                                  Remove Student
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground">No students enrolled yet. Use the "Invite Students" button to add students.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maps">
          <Card>
            <CardHeader>
              <CardTitle>Shared Concept Maps</CardTitle>
              <CardDescription>Concept maps created by students and shared with this classroom. (Mock Data)</CardDescription>
            </CardHeader>
            <CardContent>
               {classroomMaps.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Map Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classroomMaps.map((map) => {
                      const owner = enrolledStudents.find(s => s.id === map.ownerId); // Use fetched students
                      return (
                        <TableRow key={map.id}>
                          <TableCell className="font-medium">{map.name}</TableCell>
                          <TableCell>{owner?.name || map.ownerId}</TableCell>
                          <TableCell>{new Date(map.updatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild title="View map (disabled)">
                              <Link href={`/application/concept-maps/editor/${map.id}?viewOnly=true`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                 <p className="text-muted-foreground">No concept maps have been shared with this classroom yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions">
          <Card>
            <CardHeader>
              <CardTitle>Project Submissions</CardTitle>
              <CardDescription>Projects submitted by students in this classroom. (Mock Data)</CardDescription>
            </CardHeader>
            <CardContent>
            {classroomSubmissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>File Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classroomSubmissions.map((submission) => {
                    const student = enrolledStudents.find(s => s.id === submission.studentId); // Use fetched students
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{student?.name || submission.studentId}</TableCell>
                        <TableCell>{submission.originalFileName}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              submission.analysisStatus === ProjectSubmissionStatus.COMPLETED ? 'default' : 
                              submission.analysisStatus === ProjectSubmissionStatus.FAILED ? 'destructive' : 
                              'secondary'
                            }
                          >
                            {submission.analysisStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(submission.submissionTimestamp).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          {submission.generatedConceptMapId ? (
                            <Button variant="ghost" size="icon" asChild title="View generated map (disabled)">
                               <Link href={`/application/concept-maps/editor/${submission.generatedConceptMapId}?viewOnly=true`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" disabled><Eye className="h-4 w-4 opacity-50" /></Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground">No projects have been submitted for this classroom yet.</p>
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
