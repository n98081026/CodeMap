// src/app/api/projects/submissions/[submissionId]/route.ts
import { NextResponse } from 'next/server';

import type { ProjectSubmissionStatus } from '@/types';

import {
  getSubmissionById,
  updateSubmissionStatus,
} from '@/services/projectSubmissions/projectSubmissionService';
// import { getAuth } from '@clerk/nextjs/server'; // Placeholder

export async function GET(
  request: Request,
  context: { params: { submissionId: string } }
) {
  try {
    const { submissionId } = context.params;
    // const { userId } = getAuth(request as any); // Example

    if (!submissionId) {
      return NextResponse.json(
        { message: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const submission = await getSubmissionById(submissionId);
    if (!submission) {
      return NextResponse.json(
        { message: 'Submission not found' },
        { status: 404 }
      );
    }

    // Authorization check: Ensure the logged-in user can view this submission
    // (e.g., is the owner or a teacher of the associated classroom)
    // if (userId !== submission.studentId /* && !isTeacherOfClassroom(userId, submission.classroomId) */) {
    //    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    // }

    return NextResponse.json(submission);
  } catch (error) {
    console.error(
      `Get Submission API error (ID: ${context.params.submissionId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch submission: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT might be used by an analysis worker to update status
export async function PUT(
  request: Request,
  context: { params: { submissionId: string } }
) {
  try {
    const { submissionId } = context.params;
    if (!submissionId) {
      return NextResponse.json(
        { message: 'Submission ID is required' },
        { status: 400 }
      );
    }
    const { status, analysisError, generatedConceptMapId } =
      (await request.json()) as {
        status: ProjectSubmissionStatus;
        analysisError?: string;
        generatedConceptMapId?: string;
      };

    if (!status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    // In a real app, this endpoint should be protected (e.g., only callable by internal services/workers)
    const updatedSubmission = await updateSubmissionStatus(
      submissionId,
      status,
      analysisError,
      generatedConceptMapId
    );
    if (!updatedSubmission) {
      return NextResponse.json(
        { message: 'Submission not found or update failed' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedSubmission);
  } catch (error) {
    console.error(
      `Update Submission API error (ID: ${context.params.submissionId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to update submission: ${errorMessage}` },
      { status: 500 }
    );
  }
}
