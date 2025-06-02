
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
  const [isLoadingStudents, setIsLoadingStudents] = useState(true); // Student count depends on classroom data
  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);
  const [errorStudents, setErrorStudents] = useState<string | null>(null);
  
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
        // For managedClassroomsCount, we use the paginated endpoint but only need totalCount from it
        // or fetch all if the non-paginated version is simpler for just a count.
        // Assuming the service returns Classroom[] if not paginated for teacherId query
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
        setErrorClassrooms(null); 
        setErrorStudents(null); // If classrooms fetch is successful, student count calculation is also successful

      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching teacher dashboard data:", errorMessage);
        toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
        setErrorClassrooms(errorMessage); 
        setErrorStudents(errorMessage); // Both are affected if classroom fetch fails
        setDashboardData(prev => prev || { managedClassroomsCount: 0, totalStudentsCount: 0 }); // Preserve old data on error or set to 0
      } finally {
        setIsLoadingClassrooms(false);
        setIsLoadingStudents(false);
      }
    };

    if (user) {
      fetchTeacherClassroomsAndStudentCount();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed toast from deps as it's stable

  if (!user && (isLoadingClassrooms || isLoadingStudents)) return <LoadingSpinner />;
  if (!user) return null; // Or redirect to login if preferred

  const displayCountOrError = (count: number | undefined, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    // If there's an error AND the count is 0 or undefined, show error.
    // This prevents showing error if count is >0 but a subsequent refresh failed.
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
        iconLinkHref="/application/teacher/dashboard"
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
