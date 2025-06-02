
"use client";

import { useEffect, useState } from "react";
import type { ProjectSubmission } from "@/types";
import { UserRole } from "@/types";
import { SubmissionListItem } from "@/components/projects/submission-list-item";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderKanban, PlusCircle, Loader2, AlertTriangle } from "lucide-react"; // Removed Inbox
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userSubmissions, setUserSubmissions] = useState<ProjectSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  let studentDashboardLink = "/application/student/dashboard";
  if (user && user.role !== UserRole.STUDENT) {
    studentDashboardLink = user.role === UserRole.ADMIN ? "/application/admin/dashboard" : "/application/teacher/dashboard";
  }

  const fetchSubmissions = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/submissions?studentId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch submissions");
      }
      const data: ProjectSubmission[] = await response.json();
      setUserSubmissions(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Submissions", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchSubmissions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Project Submissions"
        description="Track the status of your submitted projects and access generated concept maps."
        icon={FolderKanban}
        iconLinkHref={studentDashboardLink}
      >
        <Button asChild>
          <Link href="/application/student/projects/submit">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit New Project
          </Link>
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading submissions...</p>
        </div>
      )}

      {error && !isLoading && (
         <Card className="shadow-md border-destructive">
          <CardHeader><CardTitle className="flex items-center text-destructive"><AlertTriangle className="mr-2 h-5 w-5"/>Error Loading Submissions</CardTitle></CardHeader>
          <CardContent><p>{error}</p><Button onClick={fetchSubmissions} className="mt-4">Try Again</Button></CardContent>
        </Card>
      )}

      {!isLoading && !error && userSubmissions.length === 0 && (
        <Card className="shadow-md w-full max-w-lg mx-auto">
          <CardHeader className="items-center text-center">
            <FolderKanban className="h-16 w-16 text-muted-foreground/70 mb-4" /> {/* Changed icon */}
            <CardTitle>No Submissions Yet</CardTitle>
            <CardDescription>You haven&apos;t submitted any projects for analysis.</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
             <Button asChild>
                <Link href="/application/student/projects/submit">
                  <PlusCircle className="mr-2 h-4 w-4" /> Submit Your First Project
                </Link>
              </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && userSubmissions.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userSubmissions.map((submission) => (
            <SubmissionListItem key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
