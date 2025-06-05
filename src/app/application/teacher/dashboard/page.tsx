
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { Classroom } from "@/types"; 
import { UserRole } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [managedClassroomsCount, setManagedClassroomsCount] = useState<number | null>(null);
  const [totalStudentsCount, setTotalStudentsCount] = useState<number | null>(null);

  const [isLoadingClassroomsAndStudents, setIsLoadingClassroomsAndStudents] = useState(true);
  const [errorClassroomsAndStudents, setErrorClassroomsAndStudents] = useState<string | null>(null);

  const adminDashboardLink = "/application/admin/dashboard";

  const fetchTeacherDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoadingClassroomsAndStudents(false);
      return;
    }
    setIsLoadingClassroomsAndStudents(true);
    setErrorClassroomsAndStudents(null);

    try {
      const classroomsResponse = await fetch(`/api/classrooms?teacherId=${user.id}&page=1&limit=1`); // For count
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(errData.message || `Classrooms API Error (${classroomsResponse.status})`);
      }
      const classroomsCountResult = await classroomsResponse.json() as { classrooms: Classroom[], totalCount: number };
      setManagedClassroomsCount(classroomsCountResult.totalCount);

      // Fetch all classrooms for this teacher to sum students (can be slow for many classrooms)
      // A dedicated backend endpoint would be better for totalStudentsCount.
      const allClassroomsForTeacherResponse = await fetch(`/api/classrooms?teacherId=${user.id}`); // No pagination
      if (!allClassroomsForTeacherResponse.ok) {
        const errData = await allClassroomsForTeacherResponse.json();
        throw new Error(errData.message || `Full Classrooms API Error (${allClassroomsForTeacherResponse.status})`);
      }
      const allClassroomsData = await allClassroomsForTeacherResponse.json() as {classrooms: Classroom[]}; // API returns paginated structure
      
      let currentTotalStudents = 0;
      if (allClassroomsData.classrooms && Array.isArray(allClassroomsData.classrooms)) {
        // Need to fetch full details for student IDs for each classroom or assume the list call already provides it.
        // Assuming /api/classrooms?teacherId=X returns studentIds array or count.
        // For now, we rely on the .studentIds.length from the paginated response. This might be inaccurate if the initial paginated call for count
        // does not return studentIds for all classrooms.
        // The service for getClassroomsByTeacherId was updated to populate studentIds.length correctly from classroom_students count.
         allClassroomsData.classrooms.forEach(c => {
            currentTotalStudents += c.studentIds?.length || 0;
        });
      }
      setTotalStudentsCount(currentTotalStudents);
      setErrorClassroomsAndStudents(null);

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching teacher dashboard data:", errorMessage);
      // toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
      setErrorClassroomsAndStudents(errorMessage);
      setManagedClassroomsCount(prev => prev ?? 0); // Keep existing if error or set to 0
      setTotalStudentsCount(prev => prev ?? 0);
    } finally {
      setIsLoadingClassroomsAndStudents(false);
    }
  }, [user, toast]);


  useEffect(() => {
     if (!authIsLoading && user) {
      fetchTeacherDashboardData();
    } else if (!authIsLoading && !user) {
      setIsLoadingClassroomsAndStudents(false);
    }
  }, [user, authIsLoading, fetchTeacherDashboardData]);


  if (authIsLoading || (!user && !authIsLoading)) return <LoadingSpinner />;
  if (!user) return null; 

  const renderCount = (count: number | null, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error && (count === 0 || count === null)) {
        return <div className="text-destructive flex items-center text-sm"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{count ?? 0}</div>;
  };

  return (
    <div className="space-y-6">
       <DashboardHeader
        title={`Welcome, ${user.name}!`}
        description="Manage your classrooms and student activities."
        icon={LayoutDashboard}
        iconLinkHref="/application/teacher/dashboard"
      >
        {user.role === UserRole.ADMIN && (
          <Button asChild variant="outline">
            <Link href={adminDashboardLink}>Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardLinkCard
          title="Managed Classrooms"
          description="Classrooms you are currently teaching."
          count={renderCount(managedClassroomsCount, isLoadingClassroomsAndStudents, errorClassroomsAndStudents, "classrooms")}
          icon={BookOpen}
          href="/application/teacher/classrooms"
          linkText="Manage Classrooms"
        />
        <DashboardLinkCard
          title="Total Students"
          description="Students across all your classrooms."
          count={renderCount(totalStudentsCount, isLoadingClassroomsAndStudents, errorClassroomsAndStudents, "students")}
          icon={Users}
          href="/application/teacher/classrooms" 
          linkText="View Student Lists"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for managing your teaching activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/application/teacher/classrooms/new">
              <Users className="mr-2 h-5 w-5" /> Create New Classroom
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

    