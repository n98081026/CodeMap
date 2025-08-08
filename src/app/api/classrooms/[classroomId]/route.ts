// src/app/api/classrooms/[classroomId]/route.ts
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  deleteClassroom,
  getClassroomById,
  updateClassroom,
} from '@/services/classrooms/classroomService';
import type { Classroom } from '@/types';
import { UserRole } from '@/types';

// This helper function centralizes authentication and authorization for the classroom resource.
async function authorizeRequest(
  classroomId: string
): Promise<{ user: User; classroom: Classroom } | NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json(
      { message: 'Authentication required' },
      { status: 401 }
    );
  }

  const classroom = await getClassroomById(classroomId);
  if (!classroom) {
    return NextResponse.json(
      { message: 'Classroom not found' },
      { status: 404 }
    );
  }

  // Note: We are assuming the 'role' is properly set in the user's metadata.
  // This could be app_metadata or user_metadata depending on setup. Sticking with user_metadata for consistency.
  const userRole = user.user_metadata?.role as UserRole;
  if (userRole !== UserRole.ADMIN && user.id !== classroom.teacherId) {
    return NextResponse.json(
      { message: 'Forbidden: Insufficient permissions' },
      { status: 403 }
    );
  }

  return { user, classroom };
}

function handleApiError(
  error: unknown,
  context: string
): NextResponse {
    console.error(context, error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to process request: ${errorMessage}` },
      { status: 500 }
    );
}

export async function GET(
  _request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: 'Classroom ID is required' }, { status: 400 });
    }

    const authResult = await authorizeRequest(classroomId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    return NextResponse.json(authResult.classroom);
  } catch (error) {
    return handleApiError(error, `Get Classroom API error (ID: ${context.params.classroomId}):`);
  }
}

export async function PUT(
  request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: 'Classroom ID is required' }, { status: 400 });
    }

    const authResult = await authorizeRequest(classroomId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const updates = (await request.json()) as Partial<Classroom>;
    const updatedClassroom = await updateClassroom(classroomId, updates);

    return NextResponse.json(updatedClassroom);
  } catch (error) {
    return handleApiError(error, `Update Classroom API error (ID: ${context.params.classroomId}):`);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: 'Classroom ID is required' }, { status: 400 });
    }

    const authResult = await authorizeRequest(classroomId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    await deleteClassroom(classroomId);

    return NextResponse.json(
      { message: 'Classroom deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error, `Delete Classroom API error (ID: ${context.params.classroomId}):`);
  }
}
