
"use client";

import { useEffect, useState, useCallback } from "react";
import type { ProjectSubmission } from "@/types";
import { UserRole } from "@/types";
import { SubmissionListItem } from "@/components/projects/submission-list-item";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderKanban, PlusCircle, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/layout/empty-state";

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userSubmissions, setUserSubmissions] = useState<ProjectSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentDashboardLink = "/application/student/dashboard";


  const fetchSubmissions = useCallback(async () => {
    if (!user) {
      setIsLoading(false); // Stop loading if no user
      return;
    }
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
  }, [user, toast]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

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
        <EmptyState
          icon={AlertTriangle}
          title="Error Loading Submissions"
          description={error}
          actionButton={<Button onClick={fetchSubmissions} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && userSubmissions.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="No Submissions Yet"
          description="You haven't submitted any projects for analysis."
          actionButton={
            <Button asChild>
              <Link href="/application/student/projects/submit">
                <PlusCircle className="mr-2 h-4 w-4" /> Submit Your First Project
              </Link>
            </Button>
          }
        />
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

