"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, FileText, Share2, FolderKanban, LayoutDashboard, Compass, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";

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
  const { user, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<StudentDashboardData | null>(null);

  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);
  const [isLoadingMaps, setIsLoadingMaps] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);
  const [errorMaps, setErrorMaps] = useState<string | null>(null);
  const [errorSubmissions, setErrorSubmissions] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!user) {
      setIsLoadingClassrooms(false);
      setIsLoadingMaps(false);
      setIsLoadingSubmissions(false);
      return;
    }

    setIsLoadingClassrooms(true); setErrorClassrooms(null);
    setIsLoadingMaps(true); setErrorMaps(null);
    setIsLoadingSubmissions(true); setErrorSubmissions(null);

    let classroomsCount = 0;
    let mapsCount = 0;
    let submissionsCount = 0;

    // Fetch Classrooms
    try {
      const classroomsResponse = await fetch(`/api/classrooms?studentId=${user.id}`);
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(errData.message || `Classrooms API Error (${classroomsResponse.status})`);
      }
      const data = await classroomsResponse.json();
      classroomsCount = data.length;
    } catch (err) {
      const msg = (err as Error).message;
      setErrorClassrooms(msg);
      toast({ title: "Error Fetching Classrooms", description: msg, variant: "destructive" });
    } finally {
      setIsLoadingClassrooms(false);
    }

    // Fetch Concept Maps
    try {
      const mapsResponse = await fetch(`/api/concept-maps?ownerId=${user.id}`);
       if (!mapsResponse.ok) {
        const errData = await mapsResponse.json();
        throw new Error(errData.message || `Concept Maps API Error (${mapsResponse.status})`);
      }
      const data = await mapsResponse.json();
      mapsCount = data.length;
    } catch (err) {
      const msg = (err as Error).message;
      setErrorMaps(msg);
      toast({ title: "Error Fetching Concept Maps", description: msg, variant: "destructive" });
    } finally {
      setIsLoadingMaps(false);
    }

    // Fetch Submissions
    try {
      const submissionsResponse = await fetch(`/api/projects/submissions?studentId=${user.id}`);
      if (!submissionsResponse.ok) {
        const errData = await submissionsResponse.json();
        throw new Error(errData.message || `Submissions API Error (${submissionsResponse.status})`);
      }
      const data = await submissionsResponse.json();
      submissionsCount = data.length;
    } catch (err) {
      const msg = (err as Error).message;
      setErrorSubmissions(msg);
      toast({ title: "Error Fetching Submissions", description: msg, variant: "destructive" });
    } finally {
      setIsLoadingSubmissions(false);
    }

    setDashboardData({
      enrolledClassroomsCount: classroomsCount,
      conceptMapsCount: mapsCount,
      projectSubmissionsCount: submissionsCount,
    });
  }, [user, toast]);


  useEffect(() => {
    if (!authIsLoading && user) {
      fetchDashboardData();
    } else if (!authIsLoading && !user) {
       setIsLoadingClassrooms(false);
       setIsLoadingMaps(false);
       setIsLoadingSubmissions(false);
       // AuthProvider or page layout should handle redirection if user is null
    }
  }, [user, authIsLoading, fetchDashboardData]);

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
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
        iconLinkHref="/application/student/dashboard"
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardLinkCard
          title="My Classrooms"
          description="Classrooms you are enrolled in."
          count={renderCount(dashboardData?.enrolledClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
          icon={BookOpen}
          href="/application/student/classrooms"
          linkText="View Classrooms"
        />
        <DashboardLinkCard
          title="My Concept Maps"
          description="Concept maps you have created or have access to."
          count={renderCount(dashboardData?.conceptMapsCount, isLoadingMaps, errorMaps, "maps")}
          icon={Share2}
          href="/application/student/concept-maps"
          linkText="View Maps"
        />
        <DashboardLinkCard
          title="Project Submissions"
          description="Projects you have submitted for analysis."
          count={renderCount(dashboardData?.projectSubmissionsCount, isLoadingSubmissions, errorSubmissions, "submissions")}
          icon={FolderKanban}
          href="/application/student/projects/submissions"
          linkText="View Submissions"
        />
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