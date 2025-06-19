// src/app/api/classrooms/[classroomId]/students/[studentId]/route.ts
import { NextResponse } from 'next/server';
import { removeStudentFromClassroom } from '@/services/classrooms/classroomService';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { UserRole } from '@/types';
import { getClassroomById } from '@/services/classrooms/classroomService';

export async function DELETE(request: Request, context: { params: { classroomId: string; studentId: string; } }) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) { return NextResponse.json({ message: "Authentication error" }, { status: 500 }); }
    if (!user) { return NextResponse.json({ message: "Authentication required" }, { status: 401 }); }

    const { classroomId, studentId } = context.params;

    if (!classroomId || !studentId) {
      return NextResponse.json({ message: "Classroom ID and Student ID are required" }, { status: 400 });
    }

    const userRole = user.user_metadata?.role as UserRole;

    if (userRole !== UserRole.ADMIN) {
      if (userRole === UserRole.TEACHER) {
        try {
          const classroom = await getClassroomById(classroomId);
          if (!classroom) {
            return NextResponse.json({ message: "Classroom not found." }, { status: 404 });
          }
          if (classroom.teacher_id !== user.id) {
            return NextResponse.json({ message: "Forbidden: You are not the teacher of this classroom." }, { status: 403 });
          }
          // Teacher owns the classroom, can proceed.
        } catch (e) {
          console.error("Error fetching classroom for auth check:", e);
          return NextResponse.json({ message: "Error validating classroom ownership." }, { status: 500 });
        }
      } else { // Other roles (e.g., Student) cannot remove students
        return NextResponse.json({ message: "Forbidden: Insufficient permissions." }, { status: 403 });
      }
    }
    // Admin or authorized Teacher can proceed.

    const updatedClassroom = await removeStudentFromClassroom(classroomId, studentId);
    // The service function `removeStudentFromClassroom` might throw an error if classroom/student not found,
    // or if student is not in the classroom, which will be caught by the generic catch block.
    // If it returns null/undefined without throwing for "not found" scenarios, this check is useful.
    if (!updatedClassroom) {
      return NextResponse.json({ message: "Failed to remove student or classroom/student not found" }, { status: 404 });
    }
    return NextResponse.json(updatedClassroom, { status: 200 });

  } catch (error) {
    console.error(`Remove Student from Classroom API error (Classroom ID: ${context.params.classroomId}, Student ID: ${context.params.studentId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    // Specific error messages from service like "Student not found in classroom" or "Classroom not found" should ideally have distinct error types or codes.
    // For now, if message includes "not found", assume 404.
    if (errorMessage.toLowerCase().includes("not found")) return NextResponse.json({ message: errorMessage }, { status: 404 });
    return NextResponse.json({ message: `Failed to remove student: ${errorMessage}` }, { status: 500 });
  }
}
