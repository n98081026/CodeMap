
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom, User } from "@/types";
import { UserRole } from "@/types";
import { ArrowRight, BookOpen, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Mock data
const mockClassroomsData: Classroom[] = [
  { id: "class1", name: "Introduction to Programming", teacherId: "teacher1", teacherName: "Dr. Code", studentIds: ["student1", "s2", "s3"], inviteCode: "PROG101" },
  { id: "class2", name: "Advanced Data Structures", teacherId: "teacher1", teacherName: "Dr. Code", studentIds: ["student1", "s5"], inviteCode: "DATA202" },
  { id: "class3", name: "Web Development Basics", teacherId: "teacher2", teacherName: "Ms. Script", studentIds: ["s1", "s6", "s7", "s8"], inviteCode: "WEBDEV" },
  { 
    id: "test-classroom-1", 
    name: "Introduction to AI", 
    teacherId: "teacher-test-id", 
    teacherName: "Test Teacher", 
    studentIds: ["student-test-id", "s2"], 
    inviteCode: "AI101TEST" 
  },
];


export default function StudentClassroomsPage() {
  const { user } = useAuth();
  // Filter classrooms where the current student is enrolled
  const enrolledClassrooms = user ? mockClassroomsData.filter(c => c.studentIds.includes(user.id)) : [];

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Classrooms"
        description="Here are the classrooms you are currently enrolled in."
        icon={BookOpen}
      />

      {enrolledClassrooms.length === 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Not Enrolled in Any Classrooms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You are not currently enrolled in any classrooms. If you have an invite code, your teacher can provide instructions on how to join.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {enrolledClassrooms.map((classroom) => (
          <Card key={classroom.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl">{classroom.name}</CardTitle>
              <CardDescription className="flex items-center">
                <UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                Teacher: {classroom.teacherName || 'N/A'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <p className="text-sm text-muted-foreground">
                {classroom.studentIds.length} students in this class.
              </p>
              {/* Placeholder for more classroom details for students */}
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline" disabled>
                {/* Link to a student-specific view of classroom if needed, or just info display */}
                <span className="cursor-not-allowed">View Classroom <ArrowRight className="ml-2 h-4 w-4" /></span>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

