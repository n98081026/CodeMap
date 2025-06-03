
// src/services/projectSubmissions/projectSubmissionService.ts
'use server';

/**
 * @fileOverview Project Submission service for handling submission-related operations using Supabase.
 */

import type { ProjectSubmission } from '@/types';
import { ProjectSubmissionStatus, UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import { getUserById } from '@/services/users/userService';

/**
 * Creates a new project submission record.
 * Includes the path to the file in Supabase Storage.
 */
export async function createSubmission(
  studentId: string,
  originalFileName: string,
  fileSize: number,
  classroomId?: string | null,
  fileStoragePath?: string | null // Added fileStoragePath parameter
): Promise<ProjectSubmission> {
  const student = await getUserById(studentId);
  if (!student || student.role !== UserRole.STUDENT) {
    throw new Error("Invalid student ID or user is not a student.");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('project_submissions')
    .insert({
      student_id: studentId,
      original_file_name: originalFileName,
      file_size: fileSize,
      classroom_id: classroomId || null,
      file_storage_path: fileStoragePath || null, // Store the file path
      submission_timestamp: now,
      analysis_status: ProjectSubmissionStatus.PENDING,
      updated_at: now,
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
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116: "Query returned no rows"
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
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
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
  // fileStoragePath could also be updated here if needed, e.g., after a retry or move
): Promise<ProjectSubmission | null> {
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
export async function getAllSubmissions(): Promise<ProjectSubmission[]> {
  const { data, error } = await supabase
    .from('project_submissions')
    .select('*')
    .order('submission_timestamp', { ascending: false });

  if (error) {
    console.error('Supabase getAllSubmissions error:', error);
    throw new Error(`Failed to fetch all submissions: ${error.message}`);
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

