// src/app/api/classrooms/route.ts
import { NextResponse } from 'next/server';
import { createClassroom, getClassroomsByTeacherId } from '@/services/classrooms/classroomService';
import { UserRole } from '@/types';
// In a real app, you'd get the authenticated user's ID from the session/token
// For now, we might need to pass teacherId for GET or rely on it being in POST body for creation context

export async function POST(request: Request) {
  try {
    // Assuming the authenticated user's ID is available (e.g., via middleware or token introspection)
    // For this mock, let's require teacherId in the body for clarity, or derive it if we had auth
    const { name, description, teacherId } = await request.json() as { name: string; description?: string; teacherId: string };

    if (!name || !teacherId) {
      return NextResponse.json({ message: "Classroom name and teacher ID are required" }, { status: 400 });
    }

    // In a real app, teacherId would be validated or come from authenticated session.
    // The service should validate if the teacherId corresponds to a valid teacher.
    const newClassroom = await createClassroom(name, description, teacherId);
    return NextResponse.json(newClassroom, { status: 201 });

  } catch (error) {
    console.error("Create Classroom API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "Failed to create classroom: " + errorMessage }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacherId');

    if (!teacherId) {
      return NextResponse.json({ message: "Teacher ID is required to fetch classrooms" }, { status: 400 });
    }

    // Validate teacherId if necessary, or assume it's valid for now
    const classrooms = await getClassroomsByTeacherId(teacherId);
    return NextResponse.json(classrooms);

  } catch (error) {
    console.error("Get Classrooms API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: "Failed to fetch classrooms: " + errorMessage }, { status: 500 });
  }
}
