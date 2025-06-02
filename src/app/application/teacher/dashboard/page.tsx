
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import type { Classroom, User } from "@/types";
import { UserRole } from "@/types";
import { BookOpen, Users, ArrowRight, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

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
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);
  const [errorStudents, setErrorStudents] = useState<string | null>(null);
  
  let adminDashboardLink = "/application/admin/dashboard";
  // let teacherDashboardLink = "/application/teacher/dashboard"; // Default for this page's header icon
  // if (user && user.role === UserRole.ADMIN && !user.role.includes(UserRole.TEACHER as any) ) {
  //    teacherDashboardLink = adminDashboardLink; // If admin only, main dashboard is admin's
  // } else if (user && user.role === UserRole.ADMIN && user.role.includes(UserRole.TEACHER as any)) {
  //   // teacher is also admin, keep teacherDashboardLink as is, Admin Panel button goes to adminDashboardLink
  // }
  const pageSpecificDashboardLink = "/"; // Link to root, which will redirect correctly


  useEffect(() => {
    const fetchTeacherClassrooms = async () => {
      if (!user) {
        setIsLoadingClassrooms(false);
        setIsLoadingStudents(false);
        return;
      }
      setIsLoadingClassrooms(true);
      setIsLoadingStudents(true); // student count depends on classrooms
      setErrorClassrooms(null);
      setErrorStudents(null);

      try {
        const response = await fetch(`/api/classrooms?teacherId=${user.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch classrooms");
        }
        const classrooms: Classroom[] = await response.json();
        
        const managedClassroomsCount = classrooms.length;
        let totalStudents = 0;
        classrooms.forEach(c => {
          totalStudents += c.studentIds?.length || 0;
        });

        setDashboardData({
          managedClassroomsCount: managedClassroomsCount,
          totalStudentsCount: totalStudents,
        });
        setErrorClassrooms(null); // Clear previous error if successful
        setErrorStudents(null);

      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching teacher dashboard data:", errorMessage);
        toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
        setErrorClassrooms(errorMessage); // Set error for classroom count
        setErrorStudents(errorMessage); // Set error for student count as it depends on classrooms
        setDashboardData(prev => prev || { managedClassroomsCount: 0, totalStudentsCount: 0 });
      } finally {
        setIsLoadingClassrooms(false);
        setIsLoadingStudents(false);
      }
    };

    if (user) {
      fetchTeacherClassrooms();
    }
  }, [user, toast]);

  if (!user) return <LoadingSpinner />;

  const displayCountOrError = (count: number | undefined, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error && (count === 0 || count === undefined)) {
        return <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{count ?? 0}</div>;
  };

  return (
    <div className="space-y-6">
       <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Manage your classrooms and student activities."
        icon={LayoutDashboard}
        iconLinkHref={pageSpecificDashboardLink}
      >
        {user.role === UserRole.ADMIN && (
          <Button asChild variant="outline">
            <Link href={adminDashboardLink}>Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Managed Classrooms</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {displayCountOrError(dashboardData?.managedClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
            <p className="text-xs text-muted-foreground mb-4">
              Classrooms you are currently teaching.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/teacher/classrooms">Manage Classrooms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Students</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {displayCountOrError(dashboardData?.totalStudentsCount, isLoadingStudents, errorStudents, "students")}
            <p className="text-xs text-muted-foreground mb-4">
              Students across all your classrooms.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/teacher/classrooms">View Student Lists <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
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
