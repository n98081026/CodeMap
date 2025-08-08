// src/app/api/classrooms/[classroomId]/students/[studentId]/route.ts
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import {
  getClassroomById,
  removeStudentFromClassroom,
} from '@/services/classrooms/classroomService';
import { UserRole } from '@/types';

async function authorizeTeacherOrAdmin(
  classroomId: string
): Promise<{ user: User } | NextResponse> {
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

  const userRole = user.user_metadata?.role as UserRole;

  // Admin can always proceed
  if (userRole === UserRole.ADMIN) {
    return { user };
  }

  // If user is a teacher, they must own the classroom
  if (userRole === UserRole.TEACHER) {
    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
      return NextResponse.json(
        { message: 'Classroom not found' },
        { status: 404 }
      );
    }
    if (classroom.teacherId !== user.id) {
      return NextResponse.json(
        { message: 'Forbidden: You are not the teacher of this classroom' },
        { status: 403 }
      );
    }
    return { user };
  }

  // Other roles are not permitted
  return NextResponse.json(
    { message: 'Forbidden: Insufficient permissions' },
    { status: 403 }
  );
}

function handleApiError(error: unknown, context: string): NextResponse {
  console.error(context, error);
  const errorMessage =
    error instanceof Error ? error.message : 'An unexpected error occurred';
  if (errorMessage.toLowerCase().includes('not found')) {
    return NextResponse.json({ message: errorMessage }, { status: 404 });
  }
  return NextResponse.json(
    { message: `Failed to remove student: ${errorMessage}` },
    { status: 500 }
  );
}

export async function DELETE(
  _request: Request,
  context: { params: { classroomId: string; studentId: string } }
) {
  const { classroomId, studentId } = context.params;

  if (!classroomId || !studentId) {
    return NextResponse.json(
      { message: 'Classroom ID and Student ID are required' },
      { status: 400 }
    );
  }

  try {
    const authResult = await authorizeTeacherOrAdmin(classroomId);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const updatedClassroom = await removeStudentFromClassroom(
      classroomId,
      studentId
    );

    if (!updatedClassroom) {
      return NextResponse.json(
        { message: 'Failed to remove student or classroom/student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedClassroom, { status: 200 });
  } catch (error) {
    return handleApiError(
      error,
      `Remove Student from Classroom API error (Classroom ID: ${classroomId}, Student ID: ${studentId}):`
    );
  }
}
