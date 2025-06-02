
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { ArrowRight, BookOpen, User as UserIcon, Loader2, AlertTriangle } from "lucide-react"; // Removed Inbox
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";


export default function StudentClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enrolledClassrooms, setEnrolledClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let studentDashboardLink = "/application/student/dashboard";
  if (user && user.role !== UserRole.STUDENT) {
    // Fallback if a non-student somehow reaches this page, though unlikely with auth context
    studentDashboardLink = user.role === UserRole.ADMIN ? "/application/admin/dashboard" : "/application/teacher/dashboard";
  }


  const fetchEnrolledClassrooms = async () => {
    if (!user) {
        setIsLoading(false); 
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classrooms?studentId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch enrolled classrooms");
      }
      const data: Classroom[] = await response.json();
      setEnrolledClassrooms(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Classrooms", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrolledClassrooms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);


  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Classrooms"
        description="Here are the classrooms you are currently enrolled in."
        icon={BookOpen}
        iconLinkHref={studentDashboardLink}
      />

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your classrooms...</p>
        </div>
      )}

      {error && !isLoading && (
         <Card className="shadow-md border-destructive">
          <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5"/>Error Loading Classrooms</CardTitle></CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchEnrolledClassrooms} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && enrolledClassrooms.length === 0 && (
        <Card className="shadow-md w-full max-w-lg mx-auto">
          <CardHeader className="items-center text-center">
            <BookOpen className="h-16 w-16 text-muted-foreground/70 mb-4" /> {/* Changed icon */}
            <CardTitle>No Classrooms Yet</CardTitle>
            <CardDescription>You are not currently enrolled in any classrooms.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground">If you have an invite code from your teacher, they can provide instructions on how to join a classroom.</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && enrolledClassrooms.length > 0 && (
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
                {classroom.description && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{classroom.description}</p>}
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full" variant="outline">
                  <Link href={`/application/student/classrooms/${classroom.id}`}>View Classroom <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
