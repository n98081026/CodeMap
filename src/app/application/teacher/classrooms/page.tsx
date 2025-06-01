// src/app/application/teacher/classrooms/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom } from "@/types";
import { PlusCircle, Users, ArrowRight, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacherClassrooms, setTeacherClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeacherClassrooms() {
      if (!user || !user.id) {
        setIsLoading(false);
        setError("User not authenticated.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/classrooms?teacherId=${user.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch classrooms");
        }
        const data: Classroom[] = await response.json();
        setTeacherClassrooms(data);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        toast({
          title: "Error Fetching Classrooms",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeacherClassrooms();
  }, [user, toast]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Classrooms"
        description="View, edit, and manage your classrooms."
        icon={BookOpen}
      >
        <Button asChild>
          <Link href="/application/teacher/classrooms/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
          </Link>
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading classrooms...</p>
        </div>
      )}

      {error && !isLoading && (
        <Card className="shadow-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Classrooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && teacherClassrooms.length === 0 && (
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

      {!isLoading && !error && teacherClassrooms.length > 0 && (
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
                  <Link href={`/application/teacher/classrooms/${classroom.id}`}>
                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
