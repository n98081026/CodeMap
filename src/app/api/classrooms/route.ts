// src/app/api/classrooms/route.ts
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  createClassroom,
  getAllClassrooms,
  getClassroomsByStudentId,
  getClassroomsByTeacherId,
} from '@/services/classrooms/classroomService';
import { UserRole } from '@/types';

interface ClassroomCreationPayload {
  name: string;
  description?: string;
  teacherId: string;
  subject?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  enableStudentAiAnalysis?: boolean;
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

async function authorizeCreateClassroom(
  user: User,
  payload: ClassroomCreationPayload
): Promise<NextResponse | null> {
  const userRole = user.user_metadata?.role as UserRole;

  if (userRole === UserRole.TEACHER) {
    if (user.id !== payload.teacherId) {
      return NextResponse.json(
        { message: 'Forbidden: Teachers can only create classrooms for themselves.' },
        { status: 403 }
      );
    }
  } else if (userRole !== UserRole.ADMIN) {
    return NextResponse.json(
      { message: 'Forbidden: Insufficient permissions to create a classroom.' },
      { status: 403 }
    );
  }

  return null; // Authorization successful
}

async function authorizeViewClassrooms(
  user: User,
  params: URLSearchParams
): Promise<NextResponse | null> {
  const userRole = user.user_metadata?.role as UserRole;
  const teacherId = params.get('teacherId');
  const studentId = params.get('studentId');

  if (teacherId) {
    if (userRole !== UserRole.ADMIN && (userRole !== UserRole.TEACHER || user.id !== teacherId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  } else if (studentId) {
    if (userRole !== UserRole.ADMIN && (userRole !== UserRole.STUDENT || user.id !== studentId)) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }
  } else if (userRole !== UserRole.ADMIN) {
    return NextResponse.json({ message: 'Forbidden: Only admins can list all classrooms.' }, { status: 403 });
  }

  return null; // Authorization successful
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const payload = (await request.json()) as ClassroomCreationPayload;
    if (!payload.name || !payload.teacherId) {
      return NextResponse.json({ message: 'Classroom name and teacher ID are required' }, { status: 400 });
    }

    const authError = await authorizeCreateClassroom(user, payload);
    if (authError) {
      return authError;
    }

    const newClassroom = await createClassroom(payload);
    return NextResponse.json(newClassroom, { status: 201 });
  } catch (error) {
    return handleApiError(error, 'Create Classroom API error:');
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
    const authError = await authorizeViewClassrooms(user, searchParams);
    if (authError) {
      return authError;
    }

    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const searchTerm = searchParams.get('search') || undefined;

    if (teacherId) {
      const result = await getClassroomsByTeacherId(teacherId, page, limit, searchTerm);
      return NextResponse.json(result);
    }

    if (studentId) {
      const classrooms = await getClassroomsByStudentId(studentId);
      return NextResponse.json(classrooms);
    }

    // If neither teacherIdParam nor studentIdParam is provided, fetch all classrooms (admin only)
    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can list all classrooms.' },
        { status: 403 }
      );
    }

    // Admin path: Fetch all classrooms with pagination

    // getAllClassrooms service function already defaults page to 1 and limit to 10 if not provided.
    // Here, we ensure that if the API is called without params, it uses its own defaults before calling service.
    const result = await getAllClassrooms();
    const result = await getAllClassrooms(page, limit, searchTerm);
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, 'Get Classrooms API error:');
  }
}
