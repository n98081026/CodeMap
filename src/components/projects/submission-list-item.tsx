
"use client";

import type { ProjectSubmission } from "@/types";
import { ProjectSubmissionStatus } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye, FileArchive, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import React from "react"; 
import { useSubmissionStatusPoller } from "@/hooks/useSubmissionStatusPoller"; 

interface SubmissionListItemProps {
  submission: ProjectSubmission;
}

export const SubmissionListItem = React.memo(function SubmissionListItem({ submission: initialSubmission }: SubmissionListItemProps) {
  const { currentSubmission, isPolling: isAutoPollingActive, manualRefresh } = useSubmissionStatusPoller(initialSubmission);
  const [isManualRefreshing, setIsManualRefreshing] = React.useState(false);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    await manualRefresh();
    setIsManualRefreshing(false);
  };
  
  const getStatusIconAndColor = () => {
    switch (currentSubmission.analysisStatus) {
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

  const isRefreshable = [
      ProjectSubmissionStatus.PENDING,
      ProjectSubmissionStatus.QUEUED,
      ProjectSubmissionStatus.PROCESSING,
  ].includes(currentSubmission.analysisStatus);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{currentSubmission.originalFileName}</CardTitle>
            <CardDescription>
              Submitted: {new Date(currentSubmission.submissionTimestamp).toLocaleString()}
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
              currentSubmission.analysisStatus === ProjectSubmissionStatus.COMPLETED ? 'default' :
              currentSubmission.analysisStatus === ProjectSubmissionStatus.FAILED ? 'destructive' :
              'secondary'
            }
            className="capitalize"
          >
            {currentSubmission.analysisStatus}
          </Badge>
          {isRefreshable && (
            <Button variant="ghost" size="icon" onClick={handleManualRefresh} disabled={isManualRefreshing || isAutoPollingActive} className="h-6 w-6 ml-auto">
              <RefreshCw className={`h-4 w-4 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
        </div>
        {currentSubmission.analysisStatus === ProjectSubmissionStatus.FAILED && currentSubmission.analysisError && (
          <p className="text-xs text-destructive">Error: {currentSubmission.analysisError}</p>
        )}
        <p className="text-xs text-muted-foreground">File Size: {(currentSubmission.fileSize / 1024).toFixed(2)} KB</p>
        {currentSubmission.classroomId && <p className="text-xs text-muted-foreground">Classroom ID: {currentSubmission.classroomId}</p>}
      </CardContent>
      <CardFooter>
        {currentSubmission.analysisStatus === ProjectSubmissionStatus.COMPLETED && currentSubmission.generatedConceptMapId ? (
          <Button asChild className="w-full">
            <Link href={`/application/concept-maps/editor/${currentSubmission.generatedConceptMapId}?viewOnly=true`}>
              <Eye className="mr-2 h-4 w-4" /> View Generated Map
            </Link>
          </Button>
        ) : (
          <Button className="w-full" variant="outline" disabled>
            {currentSubmission.analysisStatus === ProjectSubmissionStatus.PROCESSING || currentSubmission.analysisStatus === ProjectSubmissionStatus.QUEUED ? "Analysis in Progress" : "Map Not Available"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
});
SubmissionListItem.displayName = "SubmissionListItem";

