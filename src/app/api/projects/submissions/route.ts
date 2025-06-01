// src/app/api/projects/submissions/route.ts
import { NextResponse } from 'next/server';
import { createSubmission, getSubmissionsByStudentId } from '@/services/projectSubmissions/projectSubmissionService';
// import { getAuth } from '@clerk/nextjs/server'; // Placeholder

export async function POST(request: Request) {
  try {
    // const { userId: studentIdFromAuth } = getAuth(request as any); // Example
    // if (!studentIdFromAuth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    
    const { studentId, originalFileName, fileSize, classroomId } = await request.json() as {
      studentId: string; // For now, client sends studentId
      originalFileName: string;
      fileSize: number;
      classroomId?: string | null;
    };

    // if (studentId !== studentIdFromAuth) { // Ensure user can only submit for themselves
    //    return NextResponse.json({ message: "Forbidden: Cannot submit for another user" }, { status: 403 });
    // }

    if (!studentId || !originalFileName || fileSize === undefined) {
      return NextResponse.json({ message: "Student ID, original file name, and file size are required" }, { status: 400 });
    }

    // Actual file upload would be handled here or via a presigned URL strategy.
    // For now, we just record the submission metadata.
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
    // const { userId: studentIdFromAuth } = getAuth(request as any); // Example

    // if (!studentIdFromAuth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    // if (studentId && studentId !== studentIdFromAuth) {
    //    return NextResponse.json({ message: "Forbidden: Cannot view submissions for another user" }, { status: 403 });
    // }
    
    // const targetStudentId = studentId || studentIdFromAuth; // Use authenticated user if no specific studentId query
    const targetStudentId = studentId; // For now, rely on query param

    if (!targetStudentId) {
      return NextResponse.json({ message: "Student ID is required to fetch submissions" }, { status: 400 });
    }

    const submissions = await getSubmissionsByStudentId(targetStudentId);
    return NextResponse.json(submissions);

  } catch (error) {
    console.error("Get Project Submissions API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ message: `Failed to fetch submissions: ${errorMessage}` }, { status: 500 });
  }
}
