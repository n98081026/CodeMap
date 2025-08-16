// src/app/api/projects/submissions/[submissionId]/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

import type { ProjectSubmissionStatus } from '@/types';

import {
  getSubmissionById,
  updateSubmissionStatus,
} from '@/services/projectSubmissions/projectSubmissionService';
import { getClassroomById } from '@/services/classrooms/classroomService';

export async function GET(
  request: Request,
  context: { params: { submissionId: string } }
) {
  try {
    const { submissionId } = context.params;
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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

    // Authorization check: User must be the student who submitted or the teacher of the classroom.
    let isTeacher = false;
    if (submission.classroomId) {
      const classroom = await getClassroomById(submission.classroomId);
      isTeacher = user.id === classroom?.teacherId;
    }
    const isOwner = user.id === submission.studentId;

    if (!isOwner && !isTeacher) {
      return NextResponse.json(
        { message: 'Forbidden: You do not have access to this submission.' },
        { status: 403 }
      );
    }

    return NextResponse.json(submission);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch submission: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// PUT is used by an analysis worker to update submission status.
export async function PUT(
  request: Request,
  context: { params: { submissionId: string } }
) {
  try {
    // This endpoint is protected by a service role key.
    const serviceRoleKey = process.env.SERVICE_ROLE_KEY;
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.split(' ')[1];

    if (!serviceRoleKey || !bearerToken || bearerToken !== serviceRoleKey) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to update submission: ${errorMessage}` },
      { status: 500 }
    );
  }
}
