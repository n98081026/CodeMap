// src/app/api/classrooms/[classroomId]/students/[studentId]/route.ts
import { NextResponse } from 'next/server';
import { removeStudentFromClassroom } from '@/services/classrooms/classroomService';

interface ClassroomStudentDetailRouteParams {
  params: {
    classroomId: string;
    studentId: string;
  };
}

export async function DELETE(request: Request, { params }: ClassroomStudentDetailRouteParams) {
  try {
    const { classroomId, studentId } = params;

    if (!classroomId || !studentId) {
      return NextResponse.json({ message: "Classroom ID and Student ID are required" }, { status: 400 });
    }

    const updatedClassroom = await removeStudentFromClassroom(classroomId, studentId);
    if (!updatedClassroom) {
      // This case might be covered by specific errors thrown in the service
      return NextResponse.json({ message: "Failed to remove student or classroom/student not found" }, { status: 404 });
    }
    return NextResponse.json(updatedClassroom, { status: 200 });

  } catch (error) {
    console.error(`Remove Student from Classroom API error (Classroom ID: ${params.classroomId}, Student ID: ${params.studentId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    if (errorMessage.includes("Classroom not found")) return NextResponse.json({ message: errorMessage }, { status: 404 });
    return NextResponse.json({ message: `Failed to remove student: ${errorMessage}` }, { status: 500 });
  }
}
