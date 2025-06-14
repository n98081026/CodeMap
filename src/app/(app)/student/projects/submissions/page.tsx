"use client";

import type { ProjectSubmission } from "@/types";
import { ProjectSubmissionStatus } from "@/types";
import { SubmissionListItem } from "@/components/projects/submission-list-item";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FolderKanban, PlusCircle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data for submissions
const mockSubmissions: ProjectSubmission[] = [
  { 
    id: "sub1", 
    studentId: "student1", 
    originalFileName: "final-project.zip", 
    fileSize: 2345678, 
    submissionTimestamp: "2023-04-10T10:00:00Z", 
    analysisStatus: ProjectSubmissionStatus.COMPLETED, 
    generatedConceptMapId: "mapGen1" 
  },
  { 
    id: "sub2", 
    studentId: "student1", 
    originalFileName: "alpha-release.rar", 
    fileSize: 102400, 
    submissionTimestamp: "2023-04-12T14:30:00Z", 
    analysisStatus: ProjectSubmissionStatus.PROCESSING 
  },
  { 
    id: "sub3", 
    studentId: "student1", 
    originalFileName: "buggy-code.zip", 
    fileSize: 50000, 
    submissionTimestamp: "2023-04-13T09:15:00Z", 
    analysisStatus: ProjectSubmissionStatus.FAILED, 
    analysisError: "Unsupported file structure in archive." 
  },
   { 
    id: "sub4", 
    studentId: "student1", 
    originalFileName: "early-draft.zip", 
    fileSize: 50000, 
    submissionTimestamp: "2023-04-01T09:15:00Z", 
    analysisStatus: ProjectSubmissionStatus.PENDING
  },
];

export default function MySubmissionsPage() {
  // In a real app, fetch submissions for the current user
  // const { user } = useAuth();
  // const userSubmissions = mockSubmissions.filter(s => s.studentId === user?.id);
  const userSubmissions = mockSubmissions; // For demo purposes, show all

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Project Submissions"
        description="Track the status of your submitted projects and access generated concept maps."
        icon={FolderKanban}
      >
        <Button asChild>
          <Link href="/student/projects/submit">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit New Project
          </Link>
        </Button>
      </DashboardHeader>

      {userSubmissions.length === 0 ? (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>No Submissions Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">You haven&apos;t submitted any projects for analysis. Click the button above to submit your first project.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {userSubmissions.map((submission) => (
            <SubmissionListItem key={submission.id} submission={submission} />
          ))}
        </div>
      )}
    </div>
  );
}
