
"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle, Eye, FolderKanban, Inbox } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/layout/empty-state";
import type { ProjectSubmission, User } from "@/types";
import { ProjectSubmissionStatus } from "@/types";

interface ClassroomSubmissionsTabProps {
  isLoading: boolean;
  error: string | null;
  submissions: ProjectSubmission[];
  enrolledStudents: User[];
  onFetchRetry: () => void;
}

export const ClassroomSubmissionsTab: React.FC<ClassroomSubmissionsTabProps> = ({
  isLoading,
  error,
  submissions,
  enrolledStudents,
  onFetchRetry,
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-4">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="ml-2">Loading submissions...</p>
      </div>
    );
  }

  if (error && !isLoading) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Error Loading Submissions"
        description={error}
        actionButton={
          <Button onClick={onFetchRetry} variant="link">
            Try Again
          </Button>
        }
      />
    );
  }

  if (!isLoading && !error && submissions.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No Submissions Yet"
        description="Students in this classroom haven't submitted any projects for analysis."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>File Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Submitted At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {submissions.map((submission) => {
          const student = enrolledStudents.find(
            (s) => s.id === submission.studentId
          );
          return (
            <TableRow key={submission.id}>
              <TableCell className="font-medium">
                {student?.name || submission.studentId}
              </TableCell>
              <TableCell>{submission.originalFileName}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    submission.analysisStatus ===
                    ProjectSubmissionStatus.COMPLETED
                      ? "default"
                      : submission.analysisStatus ===
                        ProjectSubmissionStatus.FAILED
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {submission.analysisStatus}
                </Badge>
              </TableCell>
              <TableCell>
                {new Date(submission.submissionTimestamp).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {submission.generatedConceptMapId ? (
                  <Button variant="ghost" size="icon" asChild title="View generated map">
                    <Link href={`/application/concept-maps/editor/${submission.generatedConceptMapId}?viewOnly=true`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon" disabled>
                    <Eye className="h-4 w-4 opacity-50" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
    
