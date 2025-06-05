
"use client";

import { useState, useEffect, useCallback } from 'react';
import type { ProjectSubmission } from '@/types';
import { ProjectSubmissionStatus } from '@/types';
// import { useToast } from './use-toast'; // Toasting from hook might be too noisy for polling

const POLLING_INTERVAL = 7000; // Poll every 7 seconds

export function useSubmissionStatusPoller(initialSubmission: ProjectSubmission) {
  const [currentSubmission, setCurrentSubmission] = useState<ProjectSubmission>(initialSubmission);
  const [isPolling, setIsPolling] = useState(false);
  // const { toast } = useToast(); // If you decide to add toasts for polling errors

  useEffect(() => {
    // Ensure the hook's internal state updates if the initialSubmission prop changes identity
    // This is important if the parent list re-renders with new submission objects
    setCurrentSubmission(initialSubmission);
  }, [initialSubmission]);

  const fetchLatestStatus = useCallback(async () => {
    if (!currentSubmission || !currentSubmission.id) return; // Guard against missing ID

    // Do not set isPolling to true here if we want the RefreshCw button to have its own distinct loading state
    // If the button's loading state is driven by this hook's isPolling, then set it here.
    // For now, let's assume the button has its own temporary loading state or this hook manages general polling activity.
    // setIsPolling(true); // Re-evaluate if this is needed for general polling visual feedback

    try {
      const response = await fetch(`/api/projects/submissions/${currentSubmission.id}`);
      if (!response.ok) {
        console.error(`Polling failed for submission ${currentSubmission.id}: ${response.statusText}`);
        // Optionally show a toast for fetch error during polling from the component if desired
        return;
      }
      const updatedSubmissionData: ProjectSubmission = await response.json();
      setCurrentSubmission(updatedSubmissionData);
    } catch (error) {
      console.error(`Error polling for submission ${currentSubmission.id}:`, error);
    } finally {
      // setIsPolling(false); // Re-evaluate
    }
  }, [currentSubmission]); // currentSubmission.id is implicitly part of currentSubmission

  useEffect(() => {
    let intervalId: NodeJS.Timeout | undefined;

    const activeStatuses = [
      ProjectSubmissionStatus.PENDING,
      ProjectSubmissionStatus.QUEUED,
      ProjectSubmissionStatus.PROCESSING,
    ];

    if (currentSubmission && activeStatuses.includes(currentSubmission.analysisStatus)) {
      // fetchLatestStatus(); // Initial fetch if active status (optional, can be handled by manual refresh button too)
      intervalId = setInterval(fetchLatestStatus, POLLING_INTERVAL);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentSubmission, fetchLatestStatus]); // currentSubmission.analysisStatus implicitly part of currentSubmission

  // Function to be called manually by a refresh button
  const manualRefresh = async () => {
    if (isPolling) return; // Prevent multiple refreshes if one is already in progress
    setIsPolling(true); // Indicate manual refresh is happening
    await fetchLatestStatus();
    setIsPolling(false);
  };

  return { currentSubmission, isPolling, manualRefresh };
}
