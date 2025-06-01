// src/app/api/classrooms/[classroomId]/students/route.ts
import { NextResponse } from 'next/server';
import { addStudentToClassroom } from '@/services/classrooms/classroomService';

interface ClassroomStudentsRouteParams {
  params: {
    classroomId: string;
  };
}

export async function POST(request: Request, { params }: ClassroomStudentsRouteParams) {
  try {
    const { classroomId } = params;
    const { studentId } = await request.json() as { studentId: string };

    if (!classroomId || !studentId) {
      return NextResponse.json({ message: "Classroom ID and Student ID are required" }, { status: 400 });
    }

    const updatedClassroom = await addStudentToClassroom(classroomId, studentId);
    if (!updatedClassroom) {
      // This case might be covered by specific errors thrown in the service
      return NextResponse.json({ message: "Failed to add student to classroom" }, { status: 404 }); 
    }
    return NextResponse.json(updatedClassroom, { status: 200 });

  } catch (error) {
    console.error(`Add Student to Classroom API error (Classroom ID: ${params.classroomId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    // More specific error codes based on service error
    if (errorMessage.includes("Classroom not found")) return NextResponse.json({ message: errorMessage }, { status: 404 });
    if (errorMessage.includes("Invalid student ID")) return NextResponse.json({ message: errorMessage }, { status: 400 });
    return NextResponse.json({ message: `Failed to add student: ${errorMessage}` }, { status: 500 });
  }
}
