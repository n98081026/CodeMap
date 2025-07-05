// src/app/api/classrooms/[classroomId]/route.ts
import { NextResponse } from 'next/server';
import {
  getClassroomById,
  updateClassroom,
  deleteClassroom,
} from '@/services/classrooms/classroomService';
import type { Classroom } from '@/types';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';

export async function GET(
  request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json(
        { message: 'Classroom ID is required' },
        { status: 400 }
      );
    }

    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
      return NextResponse.json(
        { message: 'Classroom not found' },
        { status: 404 }
      );
    }

    const userRole = user.user_metadata?.role as UserRole;
    if (userRole !== UserRole.ADMIN && user.id !== classroom.teacher_id) {
      // Students enrolled in the class might need access too, this would require checking enrollment.
      // For now, only admin or the classroom's teacher can fetch directly by classroom ID.
      return NextResponse.json(
        {
          message:
            'Forbidden: Insufficient permissions to view this classroom.',
        },
        { status: 403 }
      );
    }

    return NextResponse.json(classroom);
  } catch (error) {
    console.error(
      `Get Classroom API error (ID: ${context.params.classroomId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch classroom: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json(
        { message: 'Classroom ID is required' },
        { status: 400 }
      );
    }

    const classroomToUpdate = await getClassroomById(classroomId);
    if (!classroomToUpdate) {
      return NextResponse.json(
        { message: 'Classroom not found' },
        { status: 404 }
      );
    }

    const userRole = user.user_metadata?.role as UserRole;
    if (
      userRole !== UserRole.ADMIN &&
      user.id !== classroomToUpdate.teacher_id
    ) {
      return NextResponse.json(
        {
          message:
            'Forbidden: Insufficient permissions to update this classroom.',
        },
        { status: 403 }
      );
    }

    const updates = (await request.json()) as Partial<Classroom>;
    const updatedClassroom = await updateClassroom(classroomId, updates);
    if (!updatedClassroom) {
      // This case should ideally be covered by the previous check or service layer error
      return NextResponse.json(
        { message: 'Classroom not found or update failed post-authorization' },
        { status: 404 }
      );
    }
    return NextResponse.json(updatedClassroom);
  } catch (error) {
    console.error(
      `Update Classroom API error (ID: ${context.params.classroomId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to update classroom: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: { classroomId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { message: 'Authentication error' },
        { status: 500 }
      );
    }
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json(
        { message: 'Classroom ID is required' },
        { status: 400 }
      );
    }

    const classroomToDelete = await getClassroomById(classroomId);
    if (!classroomToDelete) {
      return NextResponse.json(
        { message: 'Classroom not found' },
        { status: 404 }
      );
    }

    const userRole = user.user_metadata?.role as UserRole;
    if (
      userRole !== UserRole.ADMIN &&
      user.id !== classroomToDelete.teacher_id
    ) {
      return NextResponse.json(
        {
          message:
            'Forbidden: Insufficient permissions to delete this classroom.',
        },
        { status: 403 }
      );
    }

    const deleted = await deleteClassroom(classroomId);
    if (!deleted) {
      // This case should ideally be covered by the previous check or service layer error
      return NextResponse.json(
        {
          message: 'Classroom not found or deletion failed post-authorization',
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: 'Classroom deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Delete Classroom API error (ID: ${context.params.classroomId}):`,
      error
    );
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to delete classroom: ${errorMessage}` },
      { status: 500 }
    );
  }
}
