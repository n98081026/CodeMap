
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
  const { user } = useAuth(); 
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoadingData(false); 
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

        // Helper to process each response
        const processResponse = async (response: Response, itemName: string): Promise<number> => {
          if (response.ok) {
            const data = await response.json();
            return data.length;
          } else {
            let errorLead = `${itemName} API Error (${response.status})`;
            let errorDetail = response.statusText || "Unknown error";
            try {
              // Attempt to parse JSON error from API
              const errData = await response.json();
              errorDetail = errData.message || errorDetail;
            } catch (jsonError) {
              // If .json() fails, response was not JSON. Try to get text.
              const textError = await response.text().catch(() => "Could not read error response body.");
              errorDetail = `${errorDetail} (Response not JSON: ${textError.substring(0, 100)}${textError.length > 100 ? '...' : ''})`;
            }
            errors.push(`${errorLead}: ${errorDetail}`);
            return 0; // Return 0 for count on error
          }
        };

        classroomsCount = await processResponse(classroomsResponse, "Classrooms");
        mapsCount = await processResponse(mapsResponse, "Concept Maps");
        submissionsCount = await processResponse(submissionsResponse, "Project Submissions");
        
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

  if (!user) return <LoadingSpinner />;

  const displayCountOrError = (count: number | undefined, itemError: boolean) => {
    if (isLoadingData) {
      return <div className="flex items-center space-x-2"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading...</span></div>;
    }
    if (itemError && (count === 0 || count === undefined)) { // Show error if there was an error for this item and count is 0/undefined
        return <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{count ?? 0}</div>;
  };
  
  // Check if any part of the error message indicates a specific item failed.
  // This is a simplification; more granular error state per item would be better.
  const classroomError = !!error && (error.includes("Classrooms") || dashboardData?.enrolledClassroomsCount === 0 && isLoadingData === false);
  const mapsError = !!error && (error.includes("Concept Maps") || dashboardData?.conceptMapsCount === 0 && isLoadingData === false);
  const submissionsError = !!error && (error.includes("Submissions") || dashboardData?.projectSubmissionsCount === 0 && isLoadingData === false);


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
            {displayCountOrError(dashboardData?.enrolledClassroomsCount, classroomError)}
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
            {displayCountOrError(dashboardData?.conceptMapsCount, mapsError)}
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
             {displayCountOrError(dashboardData?.projectSubmissionsCount, submissionsError)}
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

    