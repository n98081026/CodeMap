
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
  
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);
  const [errorSubmissions, setErrorSubmissions] = useState<string | null>(null);


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        setIsLoadingClassrooms(false);
        setIsLoadingMaps(false);
        setIsLoadingSubmissions(false);
        return;
      }

      // Reset states for each item
      setIsLoadingClassrooms(true); setErrorClassrooms(null);
      setIsLoadingMaps(true); setErrorMaps(null);
      setIsLoadingSubmissions(true); setErrorSubmissions(null);

      let classroomsCount = 0;
      let mapsCount = 0;
      let submissionsCount = 0;

      try {
        const classroomsResponse = await fetch(`/api/classrooms?studentId=${user.id}`);
        if (!classroomsResponse.ok) {
          let errorMsg = `Classrooms API Error (${classroomsResponse.status})`;
          try { const errData = await classroomsResponse.json(); errorMsg = `${errorMsg}: ${errData.message || classroomsResponse.statusText}`; }
          catch(e) { errorMsg = `${errorMsg}: ${classroomsResponse.statusText || "Failed to parse error"}`;}
          setErrorClassrooms(errorMsg);
          // toast({ title: "Error Fetching Classrooms", description: errorMsg, variant: "destructive" }); // Already shown on list page
        } else {
          const data = await classroomsResponse.json();
          classroomsCount = data.length;
        }
      } catch (err) {
        const errorMessage = (err as Error).message;
        setErrorClassrooms(errorMessage);
        // toast({ title: "Error Fetching Classrooms", description: errorMessage, variant: "destructive" }); // Already shown on list page
      } finally {
        setIsLoadingClassrooms(false);
      }

      try {
        const mapsResponse = await fetch(`/api/concept-maps?ownerId=${user.id}`);
         if (!mapsResponse.ok) {
          let errorMsg = `Concept Maps API Error (${mapsResponse.status})`;
          try { const errData = await mapsResponse.json(); errorMsg = `${errorMsg}: ${errData.message || mapsResponse.statusText}`; }
          catch(e) { errorMsg = `${errorMsg}: ${mapsResponse.statusText || "Failed to parse error"}`;}
          setErrorMaps(errorMsg);
          // toast({ title: "Error Fetching Concept Maps", description: errorMsg, variant: "destructive" }); // Already shown on list page
        } else {
          const data = await mapsResponse.json();
          mapsCount = data.length;
        }
      } catch (err) {
        const errorMessage = (err as Error).message;
        setErrorMaps(errorMessage);
        // toast({ title: "Error Fetching Concept Maps", description: errorMessage, variant: "destructive" }); // Already shown on list page
      } finally {
        setIsLoadingMaps(false);
      }
      
      try {
        const submissionsResponse = await fetch(`/api/projects/submissions?studentId=${user.id}`);
        if (!submissionsResponse.ok) {
          let errorMsg = `Submissions API Error (${submissionsResponse.status})`;
          try { const errData = await submissionsResponse.json(); errorMsg = `${errorMsg}: ${errData.message || submissionsResponse.statusText}`; }
          catch(e) { errorMsg = `${errorMsg}: ${submissionsResponse.statusText || "Failed to parse error"}`;}
          setErrorSubmissions(errorMsg);
          // toast({ title: "Error Fetching Submissions", description: errorMsg, variant: "destructive" }); // Already shown on list page
        } else {
          const data = await submissionsResponse.json();
          submissionsCount = data.length;
        }
      } catch (err) {
        const errorMessage = (err as Error).message;
        setErrorSubmissions(errorMessage);
        // toast({ title: "Error Fetching Submissions", description: errorMsg, variant: "destructive" }); // Already shown on list page
      } finally {
        setIsLoadingSubmissions(false);
      }
      
      setDashboardData({
        enrolledClassroomsCount: classroomsCount,
        conceptMapsCount: mapsCount,
        projectSubmissionsCount: submissionsCount,
      });
    };

    if (user) {
      fetchDashboardData();
    } else {
       setIsLoadingClassrooms(false);
       setIsLoadingMaps(false);
       setIsLoadingSubmissions(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Removed toast from deps as it's stable

  if (!user && (isLoadingClassrooms || isLoadingMaps || isLoadingSubmissions)) return <LoadingSpinner />;
  if (!user) return null; // Or redirect to login if preferred

  const displayCountOrError = (count: number | undefined, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error) { // Show error if there was an error for this item, regardless of count
        return <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{count ?? 0}</div>;
  };
  
  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
        iconLinkHref="/application/student/dashboard"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">My Classrooms</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {displayCountOrError(dashboardData?.enrolledClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
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
            {displayCountOrError(dashboardData?.conceptMapsCount, isLoadingMaps, errorMaps, "maps")}
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
             {displayCountOrError(dashboardData?.projectSubmissionsCount, isLoadingSubmissions, errorSubmissions, "submissions")}
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
