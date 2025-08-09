// src/app/api/projects/submissions/route.ts
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getClassroomById } from '@/services/classrooms/classroomService';
import {
  createSubmission,
  getAllSubmissions,
  getSubmissionsByClassroomId,
  getSubmissionsByStudentId,
} from '@/services/projectSubmissions/projectSubmissionService';
import { UserRole } from '@/types';

interface SubmissionPayload {
  studentId: string;
  originalFileName: string;
  fileSize: number;
  classroomId?: string | null;
  fileStoragePath?: string | null;
}

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  return NextResponse.json(
    { message: `Failed to process request: ${errorMessage}` },
    { status: 500 }
  );
}

async function authorizeCreate(user: User, payload: SubmissionPayload): Promise<NextResponse | null> {
  if (user.id !== payload.studentId) {
    return NextResponse.json(
      { message: 'Forbidden: Students can only submit projects for themselves.' },
      { status: 403 }
    );
  }
  return null;
}

async function authorizeView(user: User, params: URLSearchParams): Promise<NextResponse | null> {
  const userRole = user.user_metadata?.role as UserRole;
  const studentId = params.get('studentId');
  const classroomId = params.get('classroomId');

  if (classroomId) {
    if (userRole === UserRole.ADMIN) return null;
    const classroom = await getClassroomById(classroomId);
    if (!classroom || classroom.teacherId !== user.id) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  } else if (studentId) {
    if (userRole !== UserRole.ADMIN && user.id !== studentId) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  } else if (userRole !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const payload = (await request.json()) as SubmissionPayload;
    if (!payload.studentId || !payload.originalFileName || payload.fileSize === undefined) {
      return NextResponse.json({ message: 'Missing required submission fields' }, { status: 400 });
    }

    const authError = await authorizeCreate(user, payload);
    if (authError) return authError;

    const newSubmission = await createSubmission(payload);
    return NextResponse.json(newSubmission, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Submission API error:');
  }
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const authError = await authorizeView(user, searchParams);
    if (authError) return authError;

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const studentId = searchParams.get('studentId');
    const classroomId = searchParams.get('classroomId');

    if (classroomId) {
      const result = await getSubmissionsByClassroomId(classroomId, page, limit);
      return NextResponse.json(result);
    }
    if (studentId) {
      const result = await getSubmissionsByStudentId(studentId, page, limit);
      return NextResponse.json(result);
    }

    const result = await getAllSubmissions(page, limit);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Get Submissions API error:');
  }
}
