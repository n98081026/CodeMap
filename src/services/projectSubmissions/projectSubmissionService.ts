
// src/services/projectSubmissions/projectSubmissionService.ts
'use server';

/**
 * @fileOverview Project Submission service for handling submission-related operations using Supabase.
 */

import type { ProjectSubmission } from '@/types';
import { ProjectSubmissionStatus, UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_PROJECT_SUBMISSION_STUDENT, MOCK_PROJECT_SUBMISSION_PROCESSING, MOCK_CLASSROOM_SHARED } from '@/lib/config';

// Mock data store for bypass mode
let MOCK_SUBMISSIONS_STORE: ProjectSubmission[] = [MOCK_PROJECT_SUBMISSION_STUDENT, MOCK_PROJECT_SUBMISSION_PROCESSING];

/**
 * Creates a new project submission record.
 */
export async function createSubmission(
  studentId: string,
  originalFileName: string,
  fileSize: number,
  classroomId?: string | null,
  fileStoragePath?: string | null 
): Promise<ProjectSubmission> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const student = await getUserById(studentId); // Uses mock if ID matches
    if (!student || student.role !== UserRole.STUDENT) {
      throw new Error("BYPASS_AUTH: Invalid student ID or user is not a student.");
    }
    const newSubmission: ProjectSubmission = {
      id: `sub-bypass-${Date.now()}`,
      studentId,
      originalFileName,
      fileSize,
      classroomId: classroomId || null,
      fileStoragePath: fileStoragePath || `mock/path/${originalFileName}`,
      submissionTimestamp: new Date().toISOString(),
      analysisStatus: ProjectSubmissionStatus.PENDING,
    };
    MOCK_SUBMISSIONS_STORE.push(newSubmission);
    return newSubmission;
  }

  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  const { data, error } = await supabase
    .from('project_submissions')
    .insert({
      student_id: studentId,
      original_file_name: originalFileName,
      file_size: fileSize,
      classroom_id: classroomId || null,
      file_storage_path: fileStoragePath || null, 
      submission_timestamp: new Date().toISOString(),
      analysis_status: ProjectSubmissionStatus.PENDING,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase createSubmission error:', error);
    throw new Error(`Failed to create project submission: ${error.message}`);
  }
  if (!data) throw new Error("Failed to create project submission: No data returned.");
  
  return {
    id: data.id,
    studentId: data.student_id,
    originalFileName: data.original_file_name,
    fileSize: data.file_size,
    classroomId: data.classroom_id,
    fileStoragePath: data.file_storage_path,
    submissionTimestamp: data.submission_timestamp,
    analysisStatus: data.analysis_status as ProjectSubmissionStatus,
    analysisError: data.analysis_error,
    generatedConceptMapId: data.generated_concept_map_id,
  };
}

/**
 * Retrieves a project submission by its ID.
 */
export async function getSubmissionById(submissionId: string): Promise<ProjectSubmission | null> {
  if (BYPASS_AUTH_FOR_TESTING) {
    return MOCK_SUBMISSIONS_STORE.find(s => s.id === submissionId) || null;
  }

  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error && error.code !== 'PGRST116') { 
    console.error('Supabase getSubmissionById error:', error);
    throw new Error(`Error fetching submission: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    studentId: data.student_id,
    originalFileName: data.original_file_name,
    fileSize: data.file_size,
    classroomId: data.classroom_id,
    fileStoragePath: data.file_storage_path,
    submissionTimestamp: data.submission_timestamp,
    analysisStatus: data.analysis_status as ProjectSubmissionStatus,
    analysisError: data.analysis_error,
    generatedConceptMapId: data.generated_concept_map_id,
  };
}

/**
 * Retrieves all submissions for a specific student.
 */
export async function getSubmissionsByStudentId(studentId: string): Promise<ProjectSubmission[]> {
  if (BYPASS_AUTH_FOR_TESTING && studentId === MOCK_STUDENT_USER.id) {
    return MOCK_SUBMISSIONS_STORE.filter(s => s.studentId === MOCK_STUDENT_USER.id)
      .sort((a, b) => new Date(b.submissionTimestamp).getTime() - new Date(a.submissionTimestamp).getTime());
  }
  if (BYPASS_AUTH_FOR_TESTING) return [];

  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('student_id', studentId)
    .order('submission_timestamp', { ascending: false });

  if (error) {
    console.error('Supabase getSubmissionsByStudentId error:', error);
    throw new Error(`Failed to fetch submissions for student: ${error.message}`);
  }
  return (data || []).map(s => ({
    id: s.id,
    studentId: s.student_id,
    originalFileName: s.original_file_name,
    fileSize: s.file_size,
    classroomId: s.classroom_id,
    fileStoragePath: s.file_storage_path,
    submissionTimestamp: s.submission_timestamp,
    analysisStatus: s.analysis_status as ProjectSubmissionStatus,
    analysisError: s.analysis_error,
    generatedConceptMapId: s.generated_concept_map_id,
  }));
}

/**
 * Retrieves all submissions for a specific classroom.
 */
export async function getSubmissionsByClassroomId(classroomId: string): Promise<ProjectSubmission[]> {
  if (BYPASS_AUTH_FOR_TESTING && classroomId === MOCK_CLASSROOM_SHARED.id) {
     return MOCK_SUBMISSIONS_STORE.filter(s => s.classroomId === MOCK_CLASSROOM_SHARED.id)
      .sort((a,b) => new Date(b.submissionTimestamp).getTime() - new Date(a.submissionTimestamp).getTime());
  }
  if (BYPASS_AUTH_FOR_TESTING) return [];


  const { data, error } = await supabase
    .from('project_submissions')
    .select('*, student:profiles(name)') 
    .eq('classroom_id', classroomId)
    .order('submission_timestamp', { ascending: false });

  if (error) {
    console.error('Supabase getSubmissionsByClassroomId error:', error);
    throw new Error(`Failed to fetch submissions for classroom: ${error.message}`);
  }
  return (data || []).map(s => ({
    id: s.id,
    studentId: s.student_id,
    originalFileName: s.original_file_name,
    fileSize: s.file_size,
    classroomId: s.classroom_id,
    fileStoragePath: s.file_storage_path,
    submissionTimestamp: s.submission_timestamp,
    analysisStatus: s.analysis_status as ProjectSubmissionStatus,
    analysisError: s.analysis_error,
    generatedConceptMapId: s.generated_concept_map_id,
  }));
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
  if (BYPASS_AUTH_FOR_TESTING) {
    const index = MOCK_SUBMISSIONS_STORE.findIndex(s => s.id === submissionId);
    if (index === -1) return null;
    MOCK_SUBMISSIONS_STORE[index] = {
      ...MOCK_SUBMISSIONS_STORE[index],
      analysisStatus: status,
      analysisError: analysisError === undefined ? MOCK_SUBMISSIONS_STORE[index].analysisError : analysisError,
      generatedConceptMapId: generatedConceptMapId === undefined ? MOCK_SUBMISSIONS_STORE[index].generatedConceptMapId : generatedConceptMapId,
    };
    return MOCK_SUBMISSIONS_STORE[index];
  }

  const updates: any = {
    analysis_status: status,
    analysis_error: analysisError === undefined ? null : analysisError,
    generated_concept_map_id: generatedConceptMapId === undefined ? null : generatedConceptMapId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('project_submissions')
    .update(updates)
    .eq('id', submissionId)
    .select()
    .single();
  
  if (error) {
    console.error('Supabase updateSubmissionStatus error:', error);
    throw new Error(`Failed to update submission status: ${error.message}`);
  }
  if (!data) return null; 

  return {
    id: data.id,
    studentId: data.student_id,
    originalFileName: data.original_file_name,
    fileSize: data.file_size,
    classroomId: data.classroom_id,
    fileStoragePath: data.file_storage_path,
    submissionTimestamp: data.submission_timestamp,
    analysisStatus: data.analysis_status as ProjectSubmissionStatus,
    analysisError: data.analysis_error,
    generatedConceptMapId: data.generated_concept_map_id,
  };
}

/**
 * Retrieves all project submissions (e.g., for admin).
 */
export async function getAllSubmissions(page: number = 1, limit: number = 10): Promise<{submissions: ProjectSubmission[], totalCount: number}> {
  if (BYPASS_AUTH_FOR_TESTING) {
    const totalCount = MOCK_SUBMISSIONS_STORE.length;
    const paginatedSubmissions = MOCK_SUBMISSIONS_STORE
      .sort((a,b) => new Date(b.submissionTimestamp).getTime() - new Date(a.submissionTimestamp).getTime())
      .slice((page - 1) * limit, page * limit);
    return { submissions: paginatedSubmissions, totalCount };
  }

  const { data, error, count } = await supabase
    .from('project_submissions')
    .select('*, student:profiles(name)', { count: 'exact' })
    .order('submission_timestamp', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);


  if (error) {
    console.error('Supabase getAllSubmissions error:', error);
    throw new Error(`Failed to fetch all submissions: ${error.message}`);
  }
  const submissions = (data || []).map(s => ({
    id: s.id,
    studentId: s.student_id,
    originalFileName: s.original_file_name,
    fileSize: s.file_size,
    classroomId: s.classroom_id,
    fileStoragePath: s.file_storage_path,
    submissionTimestamp: s.submission_timestamp,
    analysisStatus: s.analysis_status as ProjectSubmissionStatus,
    analysisError: s.analysis_error,
    generatedConceptMapId: s.generated_concept_map_id,
  }));
  return {submissions, totalCount: count || 0};
}
