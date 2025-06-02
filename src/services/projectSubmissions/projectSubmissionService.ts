
// src/services/projectSubmissions/projectSubmissionService.ts
'use server';

/**
 * @fileOverview Project Submission service for handling submission-related operations.
 */

import type { ProjectSubmission } from '@/types';
import { ProjectSubmissionStatus, UserRole } from '@/types';
import { getUserById } from '@/services/users/userService';

// Mock data for submissions
let mockSubmissionsData: ProjectSubmission[] = [
  { 
    id: "sub1", 
    studentId: "student-test-id", 
    originalFileName: "final-project.zip", 
    fileSize: 2345678, 
    submissionTimestamp: new Date("2023-04-10T10:00:00Z").toISOString(), 
    analysisStatus: ProjectSubmissionStatus.COMPLETED, 
    generatedConceptMapId: "mapA", 
    classroomId: "test-classroom-1",
  },
  { 
    id: "sub2", 
    studentId: "student-test-id", 
    originalFileName: "alpha-release.rar", 
    fileSize: 102400, 
    submissionTimestamp: new Date("2023-04-12T14:30:00Z").toISOString(), 
    analysisStatus: ProjectSubmissionStatus.PROCESSING,
    classroomId: "test-classroom-1",
  },
  { 
    id: "sub3", 
    studentId: "student1", 
    originalFileName: "buggy-code.zip", 
    fileSize: 50000, 
    submissionTimestamp: new Date("2023-04-13T09:15:00Z").toISOString(), 
    analysisStatus: ProjectSubmissionStatus.FAILED, 
    analysisError: "Unsupported file structure in archive.",
    classroomId: "class1",
  },
   { 
    id: "sub4", 
    studentId: "student1", 
    originalFileName: "early-draft.zip", 
    fileSize: 50000, 
    submissionTimestamp: new Date("2023-04-01T09:15:00Z").toISOString(), 
    analysisStatus: ProjectSubmissionStatus.PENDING,
    classroomId: "class1",
  },
  { 
    id: "sub5_class3", 
    studentId: "s6", 
    originalFileName: "web_project.zip", 
    fileSize: 78000, 
    submissionTimestamp: new Date("2023-05-01T11:00:00Z").toISOString(), 
    analysisStatus: ProjectSubmissionStatus.COMPLETED,
    generatedConceptMapId: "map_web_proj", 
    classroomId: "class3",
  },
];

/**
 * Creates a new project submission record.
 */
export async function createSubmission(
  studentId: string,
  originalFileName: string,
  fileSize: number,
  classroomId?: string | null
): Promise<ProjectSubmission> {
  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  const now = new Date().toISOString();
  const newSubmission: ProjectSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    studentId,
    originalFileName,
    fileSize,
    classroomId: classroomId || null,
    submissionTimestamp: now,
    analysisStatus: ProjectSubmissionStatus.PENDING,
  };
  mockSubmissionsData.unshift(newSubmission); 
  return newSubmission;
}

/**
 * Retrieves a project submission by its ID.
 */
export async function getSubmissionById(submissionId: string): Promise<ProjectSubmission | null> {
  const submission = mockSubmissionsData.find(s => s.id === submissionId);
  return submission || null;
}

/**
 * Retrieves all submissions for a specific student.
 */
export async function getSubmissionsByStudentId(studentId: string): Promise<ProjectSubmission[]> {
  return mockSubmissionsData.filter(s => s.studentId === studentId);
}

/**
 * Retrieves all submissions for a specific classroom.
 */
export async function getSubmissionsByClassroomId(classroomId: string): Promise<ProjectSubmission[]> {
    return mockSubmissionsData.filter(s => s.classroomId === classroomId);
}

/**
 * Updates the status of a project submission.
 */
export async function updateSubmissionStatus(
  submissionId: string,
  status: ProjectSubmissionStatus,
  analysisError?: string | null,
  generatedConceptMapId?: string | null
): Promise<ProjectSubmission | null> {
  const submissionIndex = mockSubmissionsData.findIndex(s => s.id === submissionId);
  if (submissionIndex === -1) {
    return null; 
  }

  const submission = mockSubmissionsData[submissionIndex];
  submission.analysisStatus = status;
  submission.analysisError = analysisError || null;
  submission.generatedConceptMapId = generatedConceptMapId || null;
  
  mockSubmissionsData[submissionIndex] = submission;
  return submission;
}

export async function getAllSubmissions(): Promise<ProjectSubmission[]> {
    return [...mockSubmissionsData]; // Return a copy
}

    