"use client";

import type { ProjectSubmission } from "@/types";
import { ProjectSubmissionStatus } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye, FileArchive, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface SubmissionListItemProps {
  submission: ProjectSubmission;
}

export function SubmissionListItem({ submission }: SubmissionListItemProps) {
  const getStatusIconAndColor = () => {
    switch (submission.analysisStatus) {
      case ProjectSubmissionStatus.COMPLETED:
        return { icon: CheckCircle2, color: "text-green-500" };
      case ProjectSubmissionStatus.PROCESSING:
      case ProjectSubmissionStatus.QUEUED:
        return { icon: Loader2, color: "text-blue-500 animate-spin" };
      case ProjectSubmissionStatus.FAILED:
        return { icon: AlertTriangle, color: "text-red-500" };
      default: // PENDING
        return { icon: FileArchive, color: "text-muted-foreground" };
    }
  };

  const { icon: StatusIcon, color: statusColor } = getStatusIconAndColor();

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{submission.originalFileName}</CardTitle>
            <CardDescription>
              Submitted: {new Date(submission.submissionTimestamp).toLocaleString()}
            </CardDescription>
          </div>
          <StatusIcon className={`h-6 w-6 ${statusColor}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-sm font-medium">Status:</span>
          <Badge 
            variant={
              submission.analysisStatus === ProjectSubmissionStatus.COMPLETED ? 'default' :
              submission.analysisStatus === ProjectSubmissionStatus.FAILED ? 'destructive' :
              'secondary'
            }
            className="capitalize"
          >
            {submission.analysisStatus}
          </Badge>
        </div>
        {submission.analysisStatus === ProjectSubmissionStatus.FAILED && submission.analysisError && (
          <p className="text-xs text-destructive">Error: {submission.analysisError}</p>
        )}
        <p className="text-xs text-muted-foreground">File Size: {(submission.fileSize / 1024).toFixed(2)} KB</p>
        {submission.classroomId && <p className="text-xs text-muted-foreground">Classroom ID: {submission.classroomId}</p>}
      </CardContent>
      <CardFooter>
        {submission.analysisStatus === ProjectSubmissionStatus.COMPLETED && submission.generatedConceptMapId ? (
          <Button asChild className="w-full">
            <Link href={`/concept-maps/editor/${submission.generatedConceptMapId}`}>
              <Eye className="mr-2 h-4 w-4" /> View Generated Map
            </Link>
          </Button>
        ) : (
          <Button className="w-full" variant="outline" disabled>
            {submission.analysisStatus === ProjectSubmissionStatus.PROCESSING || submission.analysisStatus === ProjectSubmissionStatus.QUEUED ? "Analysis in Progress" : "Map Not Available"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
