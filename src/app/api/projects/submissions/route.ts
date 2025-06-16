
// src/app/api/projects/submissions/route.ts
import { NextResponse } from 'next/server';
import { createSubmission, getSubmissionsByStudentId, getSubmissionsByClassroomId, getAllSubmissions } from '@/services/projectSubmissions/projectSubmissionService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';
import { getClassroomById } from '@/services/classrooms/classroomService'; // For checking teacher ownership

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) { return NextResponse.json({ message: "Authentication error" }, { status: 500 }); }
    if (!user) { return NextResponse.json({ message: "Authentication required" }, { status: 401 }); }

    const { studentId: studentIdFromRequest, originalFileName, fileSize, classroomId, fileStoragePath } = await request.json() as {
      studentId: string; 
      originalFileName: string;
      fileSize: number;
      classroomId?: string | null;
      fileStoragePath?: string | null;
    };

    if (!studentIdFromRequest || !originalFileName || fileSize === undefined) {
      return NextResponse.json({ message: "Student ID, original file name, and file size are required" }, { status: 400 });
    }

    // Authorization: Students can only submit projects for themselves.
    if (user.id !== studentIdFromRequest) {
      // Admins might be an exception, but typically submissions are user-centric.
      // If Admins need to submit on behalf of users, this check would need userRole check too.
      // For now, strictly user-for-themselves.
      return NextResponse.json({ message: "Forbidden: Students can only submit projects for themselves." }, { status: 403 });
    }

    // Optional: Further validation if classroomId is provided (e.g., student is enrolled).
    // This would involve fetching classroom enrollment data. For now, handled by service or RLS.

    const newSubmission = await createSubmission(studentIdFromRequest, originalFileName, fileSize, classroomId, fileStoragePath);
    return NextResponse.json(newSubmission, { status: 201 });

  } catch (error) {
    console.error("Create Project Submission API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to create submission: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) { return NextResponse.json({ message: "Authentication error" }, { status: 500 }); }
    if (!user) { return NextResponse.json({ message: "Authentication required" }, { status: 401 }); }

    const userRole = user.user_metadata?.role as UserRole;

    const { searchParams } = new URL(request.url);
    const studentIdParam = searchParams.get('studentId');
    const classroomIdParam = searchParams.get('classroomId');
    
    if (classroomIdParam) {
        if (userRole !== UserRole.ADMIN) {
          try {
            const classroom = await getClassroomById(classroomIdParam);
            if (!classroom || classroom.teacher_id !== user.id) {
              return NextResponse.json({ message: "Forbidden: Not authorized to view submissions for this classroom." }, { status: 403 });
            }
            // Teacher is authorized
          } catch (e) {
            // This includes classroom not found by ID
            return NextResponse.json({ message: "Error validating classroom access or classroom not found." }, { status: 404 });
          }
        }
        // Admin or authorized Teacher can proceed

        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        let page = 1;
        if (pageParam) {
          const parsedPage = parseInt(pageParam, 10);
          if (isNaN(parsedPage) || parsedPage < 1) {
            return NextResponse.json({ message: "Invalid 'page' parameter. Must be a positive integer." }, { status: 400 });
          }
          page = parsedPage;
        }
        let limit = 10; // Default limit
        if (limitParam) {
          const parsedLimit = parseInt(limitParam, 10);
          if (isNaN(parsedLimit) || parsedLimit < 1) {
            return NextResponse.json({ message: "Invalid 'limit' parameter. Must be a positive integer." }, { status: 400 });
          }
          limit = parsedLimit;
        }

        const { submissions, totalCount } = await getSubmissionsByClassroomId(classroomIdParam, page, limit);
        return NextResponse.json({
          submissions,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        });
    }

    if (studentIdParam) {
        if (userRole !== UserRole.ADMIN && user.id !== studentIdParam) {
          return NextResponse.json({ message: "Forbidden: Not authorized to view these submissions." }, { status: 403 });
        }

        // Parse and validate page/limit for studentId route
        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        let page = 1;
        if (pageParam) {
          const parsedPage = parseInt(pageParam, 10);
          if (isNaN(parsedPage) || parsedPage < 1) {
            return NextResponse.json({ message: "Invalid 'page' parameter. Must be a positive integer." }, { status: 400 });
          }
          page = parsedPage;
        }
        let limit = 10; // Default limit
        if (limitParam) {
          const parsedLimit = parseInt(limitParam, 10);
          if (isNaN(parsedLimit) || parsedLimit < 1) {
            return NextResponse.json({ message: "Invalid 'limit' parameter. Must be a positive integer." }, { status: 400 });
          }
          limit = parsedLimit;
        }

        const { submissions, totalCount } = await getSubmissionsByStudentId(studentIdParam, page, limit);
        return NextResponse.json({
          submissions,
          totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        });
    }
    
    // If neither classroomIdParam nor studentIdParam, only Admin can list all (this part already handles pagination)
    if (userRole !== UserRole.ADMIN) {
      return NextResponse.json({ message: "Forbidden: Only admins can list all submissions unless querying by studentId or classroomId." }, { status: 403 });
    }

    // Admin fetching all submissions - parse page/limit here for this case
    const pageParamForAll = searchParams.get('page');
    const limitParamForAll = searchParams.get('limit');
    let pageForAll = 1;
    if (pageParamForAll) {
        const parsedPage = parseInt(pageParamForAll, 10);
        if (isNaN(parsedPage) || parsedPage < 1) {
            return NextResponse.json({ message: "Invalid 'page' parameter for all submissions. Must be a positive integer." }, { status: 400 });
        }
        pageForAll = parsedPage;
    }
    let limitForAll = 10; // Default limit
    if (limitParamForAll) {
        const parsedLimit = parseInt(limitParamForAll, 10);
        if (isNaN(parsedLimit) || parsedLimit < 1) {
            return NextResponse.json({ message: "Invalid 'limit' parameter for all submissions. Must be a positive integer." }, { status: 400 });
        }
        limitForAll = parsedLimit;
    }

    const { submissions, totalCount } = await getAllSubmissions(pageForAll, limitForAll);
    return NextResponse.json({ submissions, totalCount, page: pageForAll, limit: limitForAll, totalPages: Math.ceil(totalCount / limitForAll) });

  } catch (error) {
    console.error("Get Project Submissions API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch submissions: ${errorMessage}` }, { status: 500 });
  }
}

    