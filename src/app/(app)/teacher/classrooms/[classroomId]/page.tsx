"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Classroom, User, ConceptMap, ProjectSubmission } from "@/types";
import { UserRole, ProjectSubmissionStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Share2, FolderKanban, Trash2, Eye } from "lucide-react";
import Link from "next/link";
import { InviteStudentDialog } from "@/components/classrooms/invite-student-dialog";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";

// Mock data
const mockClassrooms: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", studentIds: ["s1", "s2", "s3"], inviteCode: "PROG101" },
  { id: "class2", name: "Advanced Data Structures", teacherId: "teacher1", studentIds: ["s4", "s5"], inviteCode: "DATA202" },
];
const mockStudents: User[] = [
  { id: "s1", name: "Alice Smith", email: "alice@example.com", role: UserRole.STUDENT },
  { id: "s2", name: "Bob Johnson", email: "bob@example.com", role: UserRole.STUDENT },
  { id: "s3", name: "Carol White", email: "carol@example.com", role: UserRole.STUDENT },
  { id: "s4", name: "David Brown", email: "david@example.com", role: UserRole.STUDENT },
  { id: "s5", name: "Eve Davis", email: "eve@example.com", role: UserRole.STUDENT },
];
const mockConceptMaps: ConceptMap[] = [
  { id: "map1", name: "Basic Algorithms", ownerId: "s1", sharedWithClassroomId: "class1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-01-10", updatedAt: "2023-01-11" },
  { id: "map2", name: "Sorting Techniques", ownerId: "s2", sharedWithClassroomId: "class1", mapData: { nodes: [], edges: [] }, isPublic: false, createdAt: "2023-01-12", updatedAt: "2023-01-12" },
];
const mockProjectSubmissions: ProjectSubmission[] = [
  { id: "sub1", studentId: "s1", classroomId: "class1", originalFileName: "project1.zip", fileSize: 1024, submissionTimestamp: "2023-01-15", analysisStatus: ProjectSubmissionStatus.COMPLETED, generatedConceptMapId: "genMap1" },
  { id: "sub2", studentId: "s3", classroomId: "class1", originalFileName: "project_final.rar", fileSize: 2048, submissionTimestamp: "2023-01-18", analysisStatus: ProjectSubmissionStatus.PROCESSING },
];


export default function ClassroomDetailPage({ params }: { params: { classroomId: string } }) {
  const classroom = mockClassrooms.find(c => c.id === params.classroomId);
  const { toast } = useToast();

  if (!classroom) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Classroom Not Found" />
        <p>The classroom you are looking for does not exist or you do not have permission to view it.</p>
        <Button asChild variant="outline">
          <Link href="/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
        </Button>
      </div>
    );
  }

  const enrolledStudents = mockStudents.filter(s => classroom.studentIds.includes(s.id));
  const classroomMaps = mockConceptMaps.filter(m => m.sharedWithClassroomId === classroom.id);
  const classroomSubmissions = mockProjectSubmissions.filter(s => s.classroomId === classroom.id);

  const handleRemoveStudent = (studentId: string, studentName: string) => {
    // Mock removal
    console.log(`Removing student ${studentId} from classroom ${classroom.id}`);
    toast({
      title: "Student Removed (Mock)",
      description: `${studentName} has been removed from the classroom.`,
    });
    // Here you would re-fetch or update local state
  };
  
  const handleInviteSent = () => {
    // Potentially refresh student list or show a more persistent success message
    console.log("Invite sent, potential refresh logic here.");
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={classroom.name}
        description={`Invite Code: ${classroom.inviteCode} | Manage students, maps, and submissions.`}
        icon={Users}
      >
         <Button asChild variant="outline">
          <Link href="/teacher/classrooms"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Classrooms</Link>
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
                          <Button variant="ghost" size="icon" onClick={() => handleRemoveStudent(student.id, student.name)} title="Remove student">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
              <CardDescription>Concept maps created by students and shared with this classroom.</CardDescription>
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
                      const owner = mockStudents.find(s => s.id === map.ownerId);
                      return (
                        <TableRow key={map.id}>
                          <TableCell className="font-medium">{map.name}</TableCell>
                          <TableCell>{owner?.name || 'Unknown'}</TableCell>
                          <TableCell>{new Date(map.updatedAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild title="View map">
                              <Link href={`/concept-maps/editor/${map.id}?viewOnly=true`}><Eye className="h-4 w-4" /></Link>
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
              <CardDescription>Projects submitted by students in this classroom.</CardDescription>
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
                    const student = mockStudents.find(s => s.id === submission.studentId);
                    return (
                      <TableRow key={submission.id}>
                        <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
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
                               <Link href={`/concept-maps/editor/${submission.generatedConceptMapId}?viewOnly=true`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>No map</Button>
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
