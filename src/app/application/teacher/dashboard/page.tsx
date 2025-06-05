"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { Classroom } from "@/types"; // Ensure Classroom type is imported
import { UserRole } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";

interface TeacherDashboardData {
  managedClassroomsCount: number;
  totalStudentsCount: number;
}

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [isLoadingClassroomsAndStudents, setIsLoadingClassroomsAndStudents] = useState(true);
  const [errorClassroomsAndStudents, setErrorClassroomsAndStudents] = useState<string | null>(null);

  const adminDashboardLink = "/application/admin/dashboard";

  const fetchTeacherClassroomsAndStudentCount = useCallback(async () => {
    if (!user) {
      setIsLoadingClassroomsAndStudents(false);
      return;
    }
    setIsLoadingClassroomsAndStudents(true);
    setErrorClassroomsAndStudents(null);

    try {
      // Fetch classrooms with pagination to get totalCount for managedClassroomsCount
      const classroomsResponse = await fetch(`/api/classrooms?teacherId=${user.id}&page=1&limit=1`);
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(errData.message || `Classrooms API Error (${classroomsResponse.status})`);
      }
      const classroomsResult = await classroomsResponse.json() as { classrooms: Classroom[], totalCount: number };
      const managedClassroomsCount = classroomsResult.totalCount;

      // To get totalStudentsCount, we might need to fetch all classrooms for the teacher
      // or have a dedicated API endpoint for this aggregated data.
      // For simplicity, if the first fetch returns all classrooms (if totalCount <= limit used, e.g. 1), use that.
      // Otherwise, this count might be slightly off or require another more comprehensive fetch.
      // A better approach for totalStudentsCount would be an aggregate query on the backend.
      // For this example, we'll sum from the paginated result if it's the only page, or make a broader call.
      
      let totalStudents = 0;
      if (classroomsResult.classrooms.length === managedClassroomsCount) { // All classrooms fetched in one go
         classroomsResult.classrooms.forEach(c => {
           totalStudents += c.studentIds?.length || 0;
         });
      } else {
        // If more classrooms exist than fetched in the count query, fetch all to sum students
        // This is not ideal for performance if a teacher has many classrooms.
        // A dedicated backend aggregate query is better.
        const allClassroomsResponse = await fetch(`/api/classrooms?teacherId=${user.id}`); // No pagination
        if(!allClassroomsResponse.ok) { /* handle error */ }
        else {
            const allClassesData = await allClassroomsResponse.json() as { classrooms: Classroom[], totalCount: number } | Classroom[];
            const classroomsArray = Array.isArray(allClassesData) ? allClassesData : allClassesData.classrooms;
            classroomsArray.forEach(c => {
                totalStudents += c.studentIds?.length || 0;
            });
        }
      }


      setDashboardData({
        managedClassroomsCount: managedClassroomsCount,
        totalStudentsCount: totalStudents,
      });
      setErrorClassroomsAndStudents(null);

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching teacher dashboard data:", errorMessage);
      toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
      setErrorClassroomsAndStudents(errorMessage);
      setDashboardData(prev => prev || { managedClassroomsCount: 0, totalStudentsCount: 0 });
    } finally {
      setIsLoadingClassroomsAndStudents(false);
    }
  }, [user, toast]);


  useEffect(() => {
     if (!authIsLoading && user) {
      fetchTeacherClassroomsAndStudentCount();
    } else if (!authIsLoading && !user) {
      setIsLoadingClassroomsAndStudents(false);
    }
  }, [user, authIsLoading, fetchTeacherClassroomsAndStudentCount]);


  if (authIsLoading || (!user && !authIsLoading)) return <LoadingSpinner />;
  if (!user) return null; // Should be handled by AppLayout redirect

  const renderCount = (count: number | undefined, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error && (count === 0 || count === undefined)) {
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
          count={renderCount(dashboardData?.managedClassroomsCount, isLoadingClassroomsAndStudents, errorClassroomsAndStudents, "classrooms")}
          icon={BookOpen}
          href="/application/teacher/classrooms"
          linkText="Manage Classrooms"
        />
        <DashboardLinkCard
          title="Total Students"
          description="Students across all your classrooms."
          count={renderCount(dashboardData?.totalStudentsCount, isLoadingClassroomsAndStudents, errorClassroomsAndStudents, "students")}
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