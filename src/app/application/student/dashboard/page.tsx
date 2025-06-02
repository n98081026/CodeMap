
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, FileText, Share2, FolderKanban, ArrowRight, LayoutDashboard, Compass, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface StudentDashboardData {
  enrolledClassroomsCount: number;
  conceptMapsCount: number;
  projectSubmissionsCount: number;
}

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default function StudentDashboardPage() {
  const { user } = useAuth(); // Removed isLoading from here as MainLayout handles initial auth loading
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // Specific to dashboard data fetching
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoadingData(false); // Ensure loading stops if no user
        return;
      }
      setIsLoadingData(true); 
      setError(null); 

      try {
        const [classroomsResponse, mapsResponse, submissionsResponse] = await Promise.all([
          fetch(`/api/classrooms?studentId=${user.id}`),
          fetch(`/api/concept-maps?ownerId=${user.id}`),
          fetch(`/api/projects/submissions?studentId=${user.id}`)
        ]);

        let classroomsCount = 0;
        let mapsCount = 0;
        let submissionsCount = 0;
        let errors: string[] = [];

        if (classroomsResponse.ok) {
          const data = await classroomsResponse.json();
          classroomsCount = data.length;
        } else {
          const errData = await classroomsResponse.json().catch(() => ({ message: `Classrooms: ${classroomsResponse.statusText}` }));
          errors.push(errData.message || `Failed to fetch classrooms`);
        }

        if (mapsResponse.ok) {
          const data = await mapsResponse.json();
          mapsCount = data.length;
        } else {
          const errData = await mapsResponse.json().catch(() => ({ message: `Concept Maps: ${mapsResponse.statusText}` }));
          errors.push(errData.message || `Failed to fetch concept maps`);
        }

        if (submissionsResponse.ok) {
          const data = await submissionsResponse.json();
          submissionsCount = data.length;
        } else {
          const errData = await submissionsResponse.json().catch(() => ({ message: `Submissions: ${submissionsResponse.statusText}` }));
          errors.push(errData.message || `Failed to fetch submissions`);
        }
        
        setDashboardData({
          enrolledClassroomsCount: classroomsCount,
          conceptMapsCount: mapsCount,
          projectSubmissionsCount: submissionsCount,
        });

        if (errors.length > 0) {
          const combinedErrorMessage = errors.join('; ');
          throw new Error(combinedErrorMessage);
        }

      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching student dashboard data:", errorMessage);
        setError(errorMessage); 
        toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
        // Set counts to 0 or keep existing if partial data is preferred, error state will handle display
        setDashboardData(prev => prev || { enrolledClassroomsCount: 0, conceptMapsCount: 0, projectSubmissionsCount: 0 });
      } finally {
        setIsLoadingData(false); 
      }
    };

    if (user) {
      fetchDashboardData();
    } else {
       setIsLoadingData(false); 
    }
  }, [user, toast]);

  if (!user) return <LoadingSpinner />; // Handled by MainLayout usually, but good failsafe

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">My Classrooms</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" /> <span>Loading...</span>
              </div>
            ) : error && dashboardData?.enrolledClassroomsCount === 0 && !dashboardData ? ( // Show error if error exists and count is still 0 because it was never set
              <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>
            ) : (
              <div className="text-3xl font-bold">{dashboardData?.enrolledClassroomsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              Classrooms you are enrolled in.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/student/classrooms">View Classrooms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">My Concept Maps</CardTitle>
            <Share2 className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" /> <span>Loading...</span>
              </div>
            ) : error && dashboardData?.conceptMapsCount === 0 && !dashboardData ? (
              <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>
            ) : (
              <div className="text-3xl font-bold">{dashboardData?.conceptMapsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              Concept maps you have created or have access to.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/student/concept-maps">View Maps <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Project Submissions</CardTitle>
            <FolderKanban className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingData ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" /> <span>Loading...</span>
              </div>
            ) : error && dashboardData?.projectSubmissionsCount === 0 && !dashboardData ? (
              <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>
            ) : (
              <div className="text-3xl font-bold">{dashboardData?.projectSubmissionsCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              Projects you have submitted for analysis.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/student/projects/submissions">View Submissions <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks quickly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/application/concept-maps/editor/new">
              <Compass className="mr-2 h-5 w-5" /> Create New Concept Map
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/application/student/projects/submit">
              <FileText className="mr-2 h-5 w-5" /> Submit New Project
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
