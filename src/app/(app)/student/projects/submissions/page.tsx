'use client';

import {
  FolderKanban,
  PlusCircle,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState, useEffect, useCallback } from 'react';

import type { ProjectSubmission } from '@/types';

// import { ProjectSubmissionStatus } from "@/types"; // Not strictly needed if only displaying
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { SubmissionListItem } from '@/components/projects/submission-list-item';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';

const SUBMISSIONS_PER_PAGE = 9;

export default function MySubmissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalSubmissions, setTotalSubmissions] = useState(0);

  const fetchSubmissions = useCallback(
    async (pageToFetch: number) => {
      setIsLoading(true);
      setError(null);

      if (!user?.id) {
        setError('User not authenticated.');
        setIsLoading(false);
        toast({
          title: 'Authentication Error',
          description: 'User not authenticated.',
          variant: 'destructive',
        });
        return;
      }

      try {
        const response = await fetch(
          `/api/projects/submissions?studentId=${user.id}&page=${pageToFetch}&limit=${SUBMISSIONS_PER_PAGE}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch submissions');
        }
        const data = await response.json();
        setSubmissions(data.submissions);
        setTotalSubmissions(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.page);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          title: 'Error Fetching Submissions',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id, toast]
  );

  useEffect(() => {
    if (user?.id) {
      fetchSubmissions(currentPage);
    }
  }, [user?.id, currentPage, fetchSubmissions]);

  const handlePreviousPage = () => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  };

  const renderContent = () => {
    if (isLoading && submissions.length === 0) {
      return (
        <div className='flex justify-center items-center h-64'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
        </div>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon={<AlertTriangle className='h-12 w-12 text-destructive' />}
          title='Error Loading Submissions'
          description={error}
          action={
            <Button onClick={() => fetchSubmissions(currentPage)}>Retry</Button>
          }
        />
      );
    }

    if (totalSubmissions === 0 && !isLoading) {
      return (
        <Card className='shadow-md'>
          <CardHeader>
            <CardTitle>No Submissions Yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground'>
              You haven&apos;t submitted any projects for analysis. Click the
              button above to submit your first project.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <>
        <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {submissions.map((submission) => (
            <SubmissionListItem key={submission.id} submission={submission} />
          ))}
        </div>
        {totalPages > 1 && (
          <div className='mt-8 flex justify-center items-center space-x-4'>
            <Button
              onClick={handlePreviousPage}
              disabled={currentPage <= 1 || isLoading}
              variant='outline'
            >
              <ArrowLeft className='mr-2 h-4 w-4' /> Previous
            </Button>
            <span className='text-sm text-muted-foreground'>
              Page {currentPage} of {totalPages} ({totalSubmissions}{' '}
              submissions)
            </span>
            <Button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || isLoading}
              variant='outline'
            >
              Next <ArrowRight className='ml-2 h-4 w-4' />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='My Project Submissions'
        description='Track the status of your submitted projects and access generated concept maps.'
        icon={FolderKanban}
      >
        <Button asChild>
          <Link href='/student/projects/submit'>
            <PlusCircle className='mr-2 h-4 w-4' /> Submit New Project
          </Link>
        </Button>
      </DashboardHeader>
      {renderContent()}
    </div>
  );
}
