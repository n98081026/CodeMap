
"use client";

import type { ProjectSubmission } from "@/types";
import { ProjectSubmissionStatus } from "@/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Eye, FileArchive, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface SubmissionListItemProps {
  submission: ProjectSubmission;
}

const POLLING_INTERVAL = 7000; // Poll every 7 seconds

export const SubmissionListItem = React.memo(function SubmissionListItem({ submission: initialSubmission }: SubmissionListItemProps) {
  const [currentSubmission, setCurrentSubmission] = useState<ProjectSubmission>(initialSubmission);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentSubmission(initialSubmission); 
  }, [initialSubmission]);

  const fetchLatestStatus = useCallback(async () => {
    setIsPolling(true);
    try {
      const response = await fetch(`/api/projects/submissions/${currentSubmission.id}`);
      if (!response.ok) {
        console.error(`Polling failed for submission ${currentSubmission.id}: ${response.statusText}`);
        // Optionally show a toast for fetch error during polling
        // toast({ title: "Status Update Failed", description: "Could not fetch latest status.", variant: "destructive" });
        return;
      }
      const updatedSubmission: ProjectSubmission = await response.json();
      setCurrentSubmission(updatedSubmission);
    } catch (error) {
      console.error(`Error polling for submission ${currentSubmission.id}:`, error);
      // toast({ title: "Status Update Error", description: "An error occurred while fetching status.", variant: "destructive" });
    } finally {
      setIsPolling(false);
    }
  }, [currentSubmission.id]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const activeStatuses = [
      ProjectSubmissionStatus.PENDING,
      ProjectSubmissionStatus.QUEUED,
      ProjectSubmissionStatus.PROCESSING,
    ];

    if (activeStatuses.includes(currentSubmission.analysisStatus)) {
      fetchLatestStatus(); // Initial fetch if active
      intervalId = setInterval(fetchLatestStatus, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentSubmission.analysisStatus, fetchLatestStatus]); 

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
          {(currentSubmission.analysisStatus === ProjectSubmissionStatus.PENDING || 
            currentSubmission.analysisStatus === ProjectSubmissionStatus.QUEUED || 
            currentSubmission.analysisStatus === ProjectSubmissionStatus.PROCESSING) && (
            <Button variant="ghost" size="icon" onClick={fetchLatestStatus} disabled={isPolling} className="h-6 w-6 ml-auto">
              <RefreshCw className={`h-4 w-4 ${isPolling ? 'animate-spin' : ''}`} />
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
