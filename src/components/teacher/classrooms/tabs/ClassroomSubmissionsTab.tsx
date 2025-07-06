'use client';

import {
  Loader2,
  AlertTriangle,
  Eye,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'; // Removed FolderKanban, Added Chevrons
import Link from 'next/link';
import React from 'react';

import type { ProjectSubmission, User } from '@/types';

import { EmptyState } from '@/components/layout/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectSubmissionStatus } from '@/types';

interface ClassroomSubmissionsTabProps {
  isLoading: boolean;
  error: string | null;
  submissions: ProjectSubmission[];
  enrolledStudents: User[]; // For resolving student name
  onFetchRetry: () => void;
  currentPage: number;
  totalPages: number;
  totalSubmissionsCount?: number;
  onPageChange: (newPage: number) => void;
}

export const ClassroomSubmissionsTab: React.FC<ClassroomSubmissionsTabProps> =
  React.memo(function ClassroomSubmissionsTab({
    isLoading,
    error,
    submissions,
    enrolledStudents,
    onFetchRetry,
    currentPage,
    totalPages,
    totalSubmissionsCount,
    onPageChange,
  }) {
    if (isLoading && submissions.length === 0) {
      return (
        <div className='flex justify-center items-center py-4'>
          <Loader2 className='h-6 w-6 animate-spin text-primary' />
          <p className='ml-2'>Loading submissions...</p>
        </div>
      );
    }

    if (error && !isLoading) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title='Error Loading Submissions'
          description={error}
          actionButton={
            <Button onClick={onFetchRetry} variant='link'>
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
          title={
            totalSubmissionsCount === 0
              ? 'No Submissions Yet'
              : 'No Submissions on This Page'
          }
          description={
            totalSubmissionsCount === 0
              ? "Students in this classroom haven't submitted any projects for analysis."
              : 'There are no submissions to display on the current page.'
          }
        />
      );
    }

    return (
      <>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>File Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead className='text-right'>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => {
              const student = enrolledStudents.find(
                (s) => s.id === submission.studentId
              );
              return (
                <TableRow key={submission.id}>
                  <TableCell className='font-medium'>
                    {student?.name || submission.studentId}
                  </TableCell>
                  <TableCell>{submission.originalFileName}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        submission.analysisStatus ===
                        ProjectSubmissionStatus.COMPLETED
                          ? 'default'
                          : submission.analysisStatus ===
                              ProjectSubmissionStatus.FAILED
                            ? 'destructive'
                            : 'secondary'
                      }
                      className='capitalize'
                    >
                      {submission.analysisStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(submission.submissionTimestamp).toLocaleString()}
                  </TableCell>
                  <TableCell className='text-right'>
                    {submission.generatedConceptMapId ? (
                      <Button
                        variant='ghost'
                        size='icon'
                        asChild
                        title='View generated map'
                      >
                        <Link
                          href={`/application/concept-maps/editor/${submission.generatedConceptMapId}?viewOnly=true`}
                        >
                          <Eye className='h-4 w-4' />
                        </Link>
                      </Button>
                    ) : (
                      <Button variant='ghost' size='icon' disabled>
                        <Eye className='h-4 w-4 opacity-50' />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {totalPages > 1 && (
          <div className='mt-4 flex justify-center items-center space-x-4'>
            <Button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isLoading}
              variant='outline'
              size='sm'
            >
              <ChevronLeft className='mr-1 h-4 w-4' /> Previous
            </Button>
            <span className='text-sm text-muted-foreground'>
              Page {currentPage} of {totalPages}
              {totalSubmissionsCount !== undefined &&
                ` (${totalSubmissionsCount} submissions)`}
            </span>
            <Button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isLoading}
              variant='outline'
              size='sm'
            >
              Next <ChevronRight className='ml-1 h-4 w-4' />
            </Button>
          </div>
        )}
      </>
    );
  });
ClassroomSubmissionsTab.displayName = 'ClassroomSubmissionsTab';
