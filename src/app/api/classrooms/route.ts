// src/app/api/classrooms/route.ts
import { NextResponse } from 'next/server';
import { createClassroom, getClassroomsByTeacherId, getClassroomsByStudentId, getAllClassrooms } from '@/services/classrooms/classroomService';

export async function POST(request: Request) {
  try {
    const { name, description, teacherId, subject, difficulty, enableStudentAiAnalysis } = await request.json() as { 
      name: string; 
      description?: string; 
      teacherId: string;
      subject?: string;
      difficulty?: "beginner" | "intermediate" | "advanced";
      enableStudentAiAnalysis?: boolean;
    };

    if (!name || !teacherId) {
      return NextResponse.json({ message: "Classroom name and teacher ID are required" }, { status: 400 });
    }
    const newClassroom = await createClassroom(name, description, teacherId, subject, difficulty, enableStudentAiAnalysis);
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
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    if (teacherId) {
      const page = pageParam ? parseInt(pageParam, 10) : 1; // Default to page 1
      const limit = limitParam ? parseInt(limitParam, 10) : 10; // Default to limit 10

      if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
        return NextResponse.json({ message: "Invalid page or limit parameters" }, { status: 400 });
      }
      
      const result = await getClassroomsByTeacherId(teacherId, page, limit); // Service handles pagination
      return NextResponse.json(result);
    }
    
    if (studentId) {
      const classrooms = await getClassroomsByStudentId(studentId);
      return NextResponse.json(classrooms); 
    }
    
    // Admin: Get all classrooms (for count or full list if needed, here assuming for count)
    const allClassrooms = await getAllClassrooms(); 
    return NextResponse.json(allClassrooms); 

  } catch (error) {
    console.error("Get Classrooms API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch classrooms: ${errorMessage}` }, { status: 500 });
  }
}