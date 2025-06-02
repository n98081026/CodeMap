
"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Classroom, User, ConceptMap, ProjectSubmission } from "@/types"; 
import { UserRole, ProjectSubmissionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Share2, FolderKanban, Trash2, Eye, Loader2, AlertTriangle, Inbox, FileText } from "lucide-react";
import Link from "next/link";
import { InviteStudentDialog } from "@/components/classrooms/invite-student-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";


export default function ClassroomDetailPage({ params }: { params: { classroomId: string } }) {
  const { user } = useAuth();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoadingClassroom, setIsLoadingClassroom] = useState(true);
  const [errorClassroom, setErrorClassroom] = useState<string | null>(null);
  const { toast } = useToast();

  const [classroomMaps, setClassroomMaps] = useState<ConceptMap[]>([]);
  const [isLoadingMaps, setIsLoadingMaps] = useState(false);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);

  const [classroomSubmissions, setClassroomSubmissions] = useState<ProjectSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [errorSubmissions, setErrorSubmissions] = useState<string | null>(null);

  let teacherDashboardLink = "/application/teacher/dashboard";
  if (user && user.role === UserRole.ADMIN && !user.role.includes(UserRole.TEACHER as any) ) {
     teacherDashboardLink = "/application/admin/dashboard";
  }

  const fetchClassroomDetails = useCallback(async () => {
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
      const errorMessage = (err as Error).message;
      setErrorClassroom(errorMessage);
      toast({ title: "Error Fetching Classroom", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingClassroom(false);
    }
  }, [params.classroomId, toast]);

  const fetchClassroomMaps = useCallback(async () => {
    setIsLoadingMaps(true);
    setErrorMaps(null);
    try {
      const response = await fetch(`/api/concept-maps?classroomId=${params.classroomId}`);
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
  }, [params.classroomId, toast]);

  const fetchClassroomSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    setErrorSubmissions(null);
    try {
      const response = await fetch(`/api/projects/submissions?classroomId=${params.classroomId}`);
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
  }, [params.classroomId, toast]);


  useEffect(() => {
    if (params.classroomId) {
      fetchClassroomDetails();
      fetchClassroomMaps();
      fetchClassroomSubmissions();
    }
  }, [params.classroomId, fetchClassroomDetails, fetchClassroomMaps, fetchClassroomSubmissions]);

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
      fetchClassroomDetails(); 
    } catch (errorMsg) { 
      toast({
        title: "Error Removing Student",
        description: (errorMsg as Error).message,
        variant: "destructive",
      });
    }
  };
  
  const handleStudentActionCompleted = () => {
    fetchClassroomDetails(); 
  };

  if (isLoadingClassroom && !classroom) { // Only show full page loader if classroom itself is loading for the first time
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Loading Classroom..." icon={Loader2} iconClassName="animate-spin" iconLinkHref={teacherDashboardLink}/>
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (errorClassroom || !classroom) {
    return (
      <div className="space-y-6 p-4">
        <DashboardHeader title="Error" icon={AlertTriangle} iconLinkHref={teacherDashboardLink} />
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
        icon={isLoadingClassroom ? Loader2 : Users}
        iconClassName={isLoadingClassroom ? "animate-spin" : ""}
        iconLinkHref={teacherDashboardLink}
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
              {isLoadingClassroom && !errorClassroom && <div className="flex items-center justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Loading students...</p></div>}
              {!isLoadingClassroom && errorClassroom && <div className="text-destructive p-4 border border-destructive rounded-md"><AlertTriangle className="inline mr-2"/>Error loading students. <Button onClick={fetchClassroomDetails} variant="link">Try Again</Button></div>}
              {!isLoadingClassroom && !errorClassroom && enrolledStudents.length === 0 && (
                <div className="text-center py-10">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No Students Enrolled</h3>
                    <p className="text-sm text-muted-foreground">
                        No students are currently enrolled in this classroom.
                        <br />
                        Use the &quot;Invite/Add Student&quot; button above to add students.
                    </p>
                </div>
              )}
              {!isLoadingClassroom && !errorClassroom && enrolledStudents.length > 0 && (
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
              )}
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
                {isLoadingMaps && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Loading maps...</p></div>}
                {errorMaps && !isLoadingMaps && <div className="text-destructive p-4 border border-destructive rounded-md"><AlertTriangle className="inline mr-2"/>{errorMaps} <Button onClick={fetchClassroomMaps} variant="link">Try Again</Button></div>}
                {!isLoadingMaps && !errorMaps && classroomMaps.length === 0 && (
                    <div className="text-center py-10">
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                        <h3 className="text-xl font-semibold text-muted-foreground">No Shared Maps</h3>
                        <p className="text-sm text-muted-foreground">No concept maps have been shared with this classroom yet.</p>
                    </div>
                )}
                {!isLoadingMaps && !errorMaps && classroomMaps.length > 0 && (
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
                        const owner = enrolledStudents.find(s => s.id === map.ownerId); 
                        return (
                            <TableRow key={map.id}>
                            <TableCell className="font-medium">{map.name}</TableCell>
                            <TableCell>{owner?.name || map.ownerId}</TableCell>
                            <TableCell>{new Date(map.updatedAt).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="ghost" size="icon" asChild title="View map">
                                <Link href={`/application/concept-maps/editor/${map.id}?viewOnly=true`}><Eye className="h-4 w-4" /></Link>
                                </Button>
                            </TableCell>
                            </TableRow>
                        );
                        })}
                    </TableBody>
                    </Table>
                )}
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
            {isLoadingSubmissions && <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-primary" /><p className="ml-2">Loading submissions...</p></div>}
            {errorSubmissions && !isLoadingSubmissions && <div className="text-destructive p-4 border border-destructive rounded-md"><AlertTriangle className="inline mr-2"/>{errorSubmissions} <Button onClick={fetchClassroomSubmissions} variant="link">Try Again</Button></div>}
            {!isLoadingSubmissions && !errorSubmissions && classroomSubmissions.length === 0 && (
                 <div className="text-center py-10">
                    <Inbox className="mx-auto h-12 w-12 text-muted-foreground/70 mb-4" />
                    <h3 className="text-xl font-semibold text-muted-foreground">No Submissions Yet</h3>
                    <p className="text-sm text-muted-foreground">Students in this classroom haven&apos;t submitted any projects for analysis.</p>
                </div>
            )}
            {!isLoadingSubmissions && !errorSubmissions && classroomSubmissions.length > 0 && (
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
                    const student = enrolledStudents.find(s => s.id === submission.studentId); 
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
                            <Button variant="ghost" size="icon" asChild title="View generated map">
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
            )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
// Helper for DashboardHeader to allow className on icon
declare module "@/components/dashboard/dashboard-header" {
  interface DashboardHeaderProps {
    iconClassName?: string;
  }
}

