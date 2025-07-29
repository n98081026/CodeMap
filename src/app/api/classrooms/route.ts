// src/app/api/classrooms/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  createClassroom,
  getClassroomsByTeacherId,
  getClassroomsByStudentId,
  getAllClassrooms,
} from '@/services/classrooms/classroomService';
import { UserRole } from '@/types';

export async function POST(request: Request) {
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

    const {
      name,
      description,
      teacherId: teacherIdFromRequest,
      subject,
      difficulty,
      enableStudentAiAnalysis,
    } = (await request.json()) as {
      name: string;
      description?: string;
      teacherId: string;
      subject?: string;
      difficulty?: 'beginner' | 'intermediate' | 'advanced';
      enableStudentAiAnalysis?: boolean;
    };

    if (!name || !teacherIdFromRequest) {
      return NextResponse.json(
        { message: 'Classroom name and teacher ID are required' },
        { status: 400 }
      );
    }

    const userRole = user.user_metadata?.role as UserRole;
    if (userRole === UserRole.TEACHER) {
      if (user.id !== teacherIdFromRequest) {
        return NextResponse.json(
          {
            message:
              'Forbidden: Teachers can only create classrooms for themselves.',
          },
          { status: 403 }
        );
      }
    } else if (userRole !== UserRole.ADMIN) {
      return NextResponse.json(
        {
          message: 'Forbidden: Insufficient permissions to create a classroom.',
        },
        { status: 403 }
      );
    }

    const newClassroom = await createClassroom(
      name,
      description,
      teacherIdFromRequest,
      subject,
      difficulty,
      enableStudentAiAnalysis
    );
    return NextResponse.json(newClassroom, { status: 201 });
  } catch (error) {
    console.error('Create Classroom API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to create classroom: ${errorMessage}` },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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

    const userRole = user.user_metadata?.role as UserRole;

    const { searchParams } = new URL(request.url);
    const teacherIdParam = searchParams.get('teacherId');
    const studentIdParam = searchParams.get('studentId');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');
    const searchTerm = searchParams.get('search') || undefined;

    if (teacherIdParam) {
      if (
        userRole !== UserRole.ADMIN &&
        (userRole !== UserRole.TEACHER || user.id !== teacherIdParam)
      ) {
        return NextResponse.json(
          {
            message:
              'Forbidden: Insufficient permissions to view these classrooms.',
          },
          { status: 403 }
        );
      }
      const page = pageParam ? parseInt(pageParam, 10) : 1;
      const limit = limitParam ? parseInt(limitParam, 10) : 10;
      if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { message: 'Invalid page or limit parameters' },
          { status: 400 }
        );
      }
      const result = await getClassroomsByTeacherId(
        teacherIdParam,
        page,
        limit,
        searchTerm
      );
      return NextResponse.json(result);
    }

    if (studentIdParam) {
      if (
        userRole !== UserRole.ADMIN &&
        (userRole !== UserRole.STUDENT || user.id !== studentIdParam)
      ) {
        // TODO: Consider if teachers should be able to view classrooms for their students.
        // This would require checking enrollment status if such a feature is added.
        return NextResponse.json(
          {
            message:
              'Forbidden: Insufficient permissions to view these classrooms.',
          },
          { status: 403 }
        );
      }
      const classrooms = await getClassroomsByStudentId(studentIdParam);
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
    if (pageParam) {
      // pageParam and limitParam were already parsed from searchParams earlier
      const parsedPage = parseInt(pageParam, 10);
      // Silently use default if parsing fails or value is invalid, or return 400
      if (!isNaN(parsedPage) && parsedPage > 0) {
      } else {
        // Optional: Return 400 for explicitly invalid parameters by admin
        // return NextResponse.json({ message: "Invalid 'page' parameter for admin. Must be a positive integer." }, { status: 400 });
      }
    }

    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
      } else {
        // Optional: Return 400
        // return NextResponse.json({ message: "Invalid 'limit' parameter for admin. Must be a positive integer." }, { status: 400 });
      }
    }

    // getAllClassrooms service function already defaults page to 1 and limit to 10 if not provided.
    // Here, we ensure that if the API is called without params, it uses its own defaults before calling service.
    const result = await getAllClassrooms();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get Classrooms API error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json(
      { message: `Failed to fetch classrooms: ${errorMessage}` },
      { status: 500 }
    );
  }
}
