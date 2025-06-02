
// src/app/api/projects/submissions/route.ts
import { NextResponse } from 'next/server';
import { createSubmission, getSubmissionsByStudentId, getSubmissionsByClassroomId, getAllSubmissions } from '@/services/projectSubmissions/projectSubmissionService';

export async function POST(request: Request) {
  try {
    const { studentId, originalFileName, fileSize, classroomId } = await request.json() as {
      studentId: string; 
      originalFileName: string;
      fileSize: number;
      classroomId?: string | null;
    };

    if (!studentId || !originalFileName || fileSize === undefined) {
      return NextResponse.json({ message: "Student ID, original file name, and file size are required" }, { status: 400 });
    }

    const newSubmission = await createSubmission(studentId, originalFileName, fileSize, classroomId);
    return NextResponse.json(newSubmission, { status: 201 });

  } catch (error) {
    console.error("Create Project Submission API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to create submission: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const classroomId = searchParams.get('classroomId');
    
    if (classroomId) {
        const submissions = await getSubmissionsByClassroomId(classroomId);
        return NextResponse.json(submissions);
    }

    if (studentId) { 
        const submissions = await getSubmissionsByStudentId(studentId);
        return NextResponse.json(submissions);
    }
    
    // If no specific ID, assume admin request for all submissions (e.g. for Admin Dashboard)
    // This path could be secured for admin role only in a real app.
    const allSubmissionsData = await getAllSubmissions();
    return NextResponse.json(allSubmissionsData);

  } catch (error) {
    console.error("Get Project Submissions API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch submissions: ${errorMessage}` }, { status: 500 });
  }
}

    