"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types"; // Assuming UserRole is defined
import { PlusCircle, Users, ArrowRight, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Mock data for classrooms
const mockClassrooms: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", studentIds: ["s1", "s2", "s3"], inviteCode: "PROG101" },
  { id: "class2", name: "Advanced Data Structures", teacherId: "teacher1", studentIds: ["s4", "s5"], inviteCode: "DATA202" },
  { id: "class3", name: "Web Development Basics", teacherId: "teacher2", studentIds: ["s1", "s6", "s7", "s8"], inviteCode: "WEBDEV" },
];

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  // Filter classrooms for the current teacher (mock logic)
  const teacherClassrooms = user ? mockClassrooms.filter(c => c.teacherId === user.id) : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Classrooms"
        description="View, edit, and manage your classrooms."
        icon={BookOpen}
      >
        <Button asChild>
          <Link href="/teacher/classrooms/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
          </Link>
        </Button>
      </DashboardHeader>
      
      {teacherClassrooms.length === 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>No Classrooms Yet</CardTitle>
            <CardDescription>You haven&apos;t created or been assigned to any classrooms.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Click the button above to create your first classroom.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {teacherClassrooms.map((classroom) => (
          <Card key={classroom.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl">{classroom.name}</CardTitle>
              <CardDescription>Invite Code: <span className="font-mono text-primary">{classroom.inviteCode}</span></CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="mr-2 h-4 w-4" />
                <span>{classroom.studentIds.length} Students</span>
              </div>
              {/* Add more details like last activity, number of maps/submissions */}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={`/teacher/classrooms/${classroom.id}`}>
                  View Details <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
