// src/app/api/classrooms/[classroomId]/route.ts
import { NextResponse } from 'next/server';
import { getClassroomById, updateClassroom, deleteClassroom } from '@/services/classrooms/classroomService';
import type { Classroom } from '@/types';

export async function GET(request: Request, context: { params: { classroomId: string } }) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: "Classroom ID is required" }, { status: 400 });
    }

    const classroom = await getClassroomById(classroomId);
    if (!classroom) {
      return NextResponse.json({ message: "Classroom not found" }, { status: 404 });
    }
    return NextResponse.json(classroom);

  } catch (error) {
    console.error(`Get Classroom API error (ID: ${context.params.classroomId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch classroom: ${errorMessage}` }, { status: 500 });
  }
}

export async function PUT(request: Request, context: { params: { classroomId: string } }) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: "Classroom ID is required" }, { status: 400 });
    }
    const updates = await request.json() as Partial<Classroom>;

    const updatedClassroom = await updateClassroom(classroomId, updates);
    if (!updatedClassroom) {
      return NextResponse.json({ message: "Classroom not found or update failed" }, { status: 404 });
    }
    return NextResponse.json(updatedClassroom);

  } catch (error) {
    console.error(`Update Classroom API error (ID: ${context.params.classroomId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to update classroom: ${errorMessage}` }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: { classroomId: string } }) {
  try {
    const { classroomId } = context.params;
    if (!classroomId) {
      return NextResponse.json({ message: "Classroom ID is required" }, { status: 400 });
    }

    const deleted = await deleteClassroom(classroomId);
    if (!deleted) {
      return NextResponse.json({ message: "Classroom not found or deletion failed" }, { status: 404 });
    }
    return NextResponse.json({ message: "Classroom deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error(`Delete Classroom API error (ID: ${context.params.classroomId}):`, error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to delete classroom: ${errorMessage}` }, { status: 500 });
  }
}
