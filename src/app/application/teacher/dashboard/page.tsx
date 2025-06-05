
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState } from "react";
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
  const { user } = useAuth();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<TeacherDashboardData | null>(null);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true); // Combined for simplicity in this case
  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);
  const [errorStudents, setErrorStudents] = useState<string | null>(null); // Combined

  const adminDashboardLink = "/application/admin/dashboard";

  useEffect(() => {
    const fetchTeacherClassroomsAndStudentCount = async () => {
      if (!user) {
        setIsLoadingClassrooms(false);
        setIsLoadingStudents(false);
        return;
      }
      setIsLoadingClassrooms(true);
      setIsLoadingStudents(true);
      setErrorClassrooms(null);
      setErrorStudents(null);

      try {
        // Teacher fetches their own classrooms. The API route for teacherId does not support totalCount directly for all classrooms,
        // so we fetch all and count, then sum studentIds.
        const response = await fetch(`/api/classrooms?teacherId=${user.id}`);
        if (!response.ok) {
          let errorMsg = `Classrooms API Error (${response.status})`;
          try {
            const errData = await response.json();
            errorMsg = `${errorMsg}: ${errData.message || response.statusText}`;
          } catch(e) {
            errorMsg = `${errorMsg}: ${response.statusText || "Failed to parse error"}`;
          }
          throw new Error(errorMsg);
        }
        const classrooms: Classroom[] = await response.json(); // API returns Classroom[] directly when not paginating

        const managedClassroomsCount = classrooms.length;
        let totalStudents = 0;
        classrooms.forEach(c => {
          // The service now populates studentIds as an array representing count
          totalStudents += c.studentIds?.length || 0;
        });

        setDashboardData({
          managedClassroomsCount: managedClassroomsCount,
          totalStudentsCount: totalStudents,
        });
        setErrorClassrooms(null);
        setErrorStudents(null);

      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching teacher dashboard data:", errorMessage);
        toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
        setErrorClassrooms(errorMessage); // Set error for both as they depend on the same call
        setErrorStudents(errorMessage);
        setDashboardData(prev => prev || { managedClassroomsCount: 0, totalStudentsCount: 0 });
      } finally {
        setIsLoadingClassrooms(false);
        setIsLoadingStudents(false);
      }
    };

    if (user) {
      fetchTeacherClassroomsAndStudentCount();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed toast from dependency array

  if (!user && (isLoadingClassrooms || isLoadingStudents)) return <LoadingSpinner />;
  if (!user) return null;

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
          count={renderCount(dashboardData?.managedClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
          icon={BookOpen}
          href="/application/teacher/classrooms"
          linkText="Manage Classrooms"
        />
        <DashboardLinkCard
          title="Total Students"
          description="Students across all your classrooms."
          count={renderCount(dashboardData?.totalStudentsCount, isLoadingStudents, errorStudents, "students")}
          icon={Users}
          href="/application/teacher/classrooms" // Link to classrooms page to view student lists per classroom
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

