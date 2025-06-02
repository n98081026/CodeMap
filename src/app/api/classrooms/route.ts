
// src/app/api/classrooms/route.ts
import { NextResponse } from 'next/server';
import { createClassroom, getClassroomsByTeacherId, getClassroomsByStudentId, getAllClassrooms } from '@/services/classrooms/classroomService';

export async function POST(request: Request) {
  try {
    const { name, description, teacherId } = await request.json() as { name: string; description?: string; teacherId: string };

    if (!name || !teacherId) {
      return NextResponse.json({ message: "Classroom name and teacher ID are required" }, { status: 400 });
    }
    const newClassroom = await createClassroom(name, description, teacherId);
    return NextResponse.json(newClassroom, { status: 201 });

  } catch (error) {
    console.error("Create Classroom API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to create classroom: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');
    const studentId = searchParams.get('studentId');

    if (teacherId) {
      const classrooms = await getClassroomsByTeacherId(teacherId);
      return NextResponse.json(classrooms);
    }
    
    if (studentId) {
      const classrooms = await getClassroomsByStudentId(studentId);
      return NextResponse.json(classrooms);
    }
    
    // If no specific ID, assume it's an admin request for all classrooms (can be refined with auth)
    // For Admin Dashboard count
    const allClassrooms = await getAllClassrooms();
    return NextResponse.json(allClassrooms);


  } catch (error) {
    console.error("Get Classrooms API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch classrooms: ${errorMessage}` }, { status: 500 });
  }
}

    