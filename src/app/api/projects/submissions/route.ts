
// src/app/api/projects/submissions/route.ts
import { NextResponse } from 'next/server';
import { createSubmission, getSubmissionsByStudentId, getSubmissionsByClassroomId, getAllSubmissions } from '@/services/projectSubmissions/projectSubmissionService';

export async function POST(request: Request) {
  try {
    const { studentId, originalFileName, fileSize, classroomId, fileStoragePath } = await request.json() as {
      studentId: string; 
      originalFileName: string;
      fileSize: number;
      classroomId?: string | null;
      fileStoragePath?: string | null; // Added fileStoragePath
    };

    if (!studentId || !originalFileName || fileSize === undefined) {
      return NextResponse.json({ message: "Student ID, original file name, and file size are required" }, { status: 400 });
    }
    // fileStoragePath is optional at this stage, can be null if upload happens elsewhere or fails.
    // Service handles nullability.

    const newSubmission = await createSubmission(studentId, originalFileName, fileSize, classroomId, fileStoragePath);
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
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 10; // Default to 10 if not specified for general queries
    
    if (classroomId) {
        const submissions = await getSubmissionsByClassroomId(classroomId); // This service might need pagination too
        return NextResponse.json(submissions);
    }

    if (studentId) { 
        const submissions = await getSubmissionsByStudentId(studentId); // This service might need pagination too
        return NextResponse.json(submissions);
    }
    
    // Admin: Get all submissions with pagination
    // Ensure RLS policies correctly restrict this if it's not intended for all authenticated users.
    const { submissions, totalCount } = await getAllSubmissions(page, limit); 
    return NextResponse.json({ submissions, totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) });

  } catch (error) {
    console.error("Get Project Submissions API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch submissions: ${errorMessage}` }, { status: 500 });
  }
}
