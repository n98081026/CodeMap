
// src/lib/config.ts

// Set this to true to bypass Supabase auth and use a mock student user.
// REMEMBER TO SET TO FALSE FOR ACTUAL AUTH TESTING/PRODUCTION.
export const BYPASS_AUTH_FOR_TESTING = true;

// Define mock user data that can be shared across services when BYPASS_AUTH_FOR_TESTING is true.
import type { User, Classroom, ConceptMap, ProjectSubmission } from '@/types';
import { UserRole, ProjectSubmissionStatus } from '@/types';

export const MOCK_STUDENT_USER_V2: User = {
  id: 'student-mock-v2-a1b2', // New ID
  name: 'Beta Student (Bypass V2)', // New Name
  email: 'betastudent.bypass.v2@example.com', // New Email
  role: UserRole.STUDENT,
};

export const MOCK_TEACHER_USER_V2: User = {
  id: 'teacher-mock-v2-c3d4', // New ID
  name: 'Gamma Teacher (Bypass V2)', // New Name
  email: 'gammateacher.bypass.v2@example.com', // New Email
  role: UserRole.TEACHER,
};

export const MOCK_ADMIN_USER_V2: User = {
  id: 'admin-mock-v2-e5f6', // New ID
  name: 'Delta Admin (Bypass V2)', // New Name
  email: 'deltaadmin.bypass.v2@example.com', // New Email
  role: UserRole.ADMIN,
};

// Use the new versions for the main export if needed by AuthContext directly
export const MOCK_STUDENT_USER = MOCK_STUDENT_USER_V2;
export const MOCK_TEACHER_USER = MOCK_TEACHER_USER_V2;
export const MOCK_ADMIN_USER = MOCK_ADMIN_USER_V2;


export const MOCK_USERS: User[] = [MOCK_STUDENT_USER_V2, MOCK_TEACHER_USER_V2, MOCK_ADMIN_USER_V2];

export const MOCK_CLASSROOM_SHARED_V2: Classroom = {
  id: 'class-shared-v2-g7h8', // New ID
  name: 'Bypass Shared Classroom V2', // New Name
  teacherId: MOCK_TEACHER_USER_V2.id,
  teacherName: MOCK_TEACHER_USER_V2.name,
  studentIds: [MOCK_STUDENT_USER_V2.id, 'another-mock-student-v2-id'],
  inviteCode: 'BYPASSV2', // New Code
  description: 'A V2 classroom for bypass testing where student is enrolled.',
  subject: 'Advanced Bypassology',
  difficulty: 'advanced',
  enableStudentAiAnalysis: false,
};

export const MOCK_CLASSROOM_TEACHER_OWNED_V2: Classroom = {
  id: 'class-teacher-owned-v2-i9j0', // New ID
  name: 'Bypass Teacher Classroom V2', // New Name
  teacherId: MOCK_TEACHER_USER_V2.id,
  teacherName: MOCK_TEACHER_USER_V2.name,
  studentIds: ['mock-s1-v2', 'mock-s2-v2'],
  inviteCode: 'TEACHV2', // New Code
  description: 'A V2 classroom owned by the mock teacher.',
  subject: 'Modern Pedagogy',
  difficulty: 'beginner',
  enableStudentAiAnalysis: true,
};


export const MOCK_CONCEPT_MAP_STUDENT_V2: ConceptMap = {
  id: 'map-student-v2-k1l2', // New ID
  name: 'Student Bypass Map V2', // New Name
  ownerId: MOCK_STUDENT_USER_V2.id,
  mapData: { nodes: [{id: 'n1-v2', text: 'Bypass Node V2', type: 'default', x: 70, y:70}], edges: [] }, // Slightly different data
  isPublic: true,
  sharedWithClassroomId: MOCK_CLASSROOM_SHARED_V2.id,
  createdAt: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
  updatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
};

export const MOCK_CONCEPT_MAP_TEACHER_V2: ConceptMap = {
  id: 'map-teacher-v2-m3n4', // New ID
  name: 'Teacher Bypass Map V2', // New Name
  ownerId: MOCK_TEACHER_USER_V2.id,
  mapData: { nodes: [{id: 'nt1-v2', text: 'Teacher Node V2', type: 'important', x: 100, y:100}], edges: [] }, // Slightly different data
  isPublic: false,
  sharedWithClassroomId: MOCK_CLASSROOM_TEACHER_OWNED_V2.id,
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
  updatedAt: new Date().toISOString(),
};

// This is the specific map used by useConceptMapDataManager's MOCK_USER_FOR_TESTING_MAPS
export const MOCK_CONCEPT_MAP_STUDENT = MOCK_CONCEPT_MAP_STUDENT_V2;


export const MOCK_PROJECT_SUBMISSION_STUDENT_V2: ProjectSubmission = {
  id: 'sub-student-v2-q7r8', // New ID
  studentId: MOCK_STUDENT_USER_V2.id,
  originalFileName: 'final_bypass_project_v2.zip', // New filename
  fileSize: 234567,
  fileStoragePath: 'mock/final_bypass_project_v2.zip',
  submissionTimestamp: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
  analysisStatus: ProjectSubmissionStatus.COMPLETED,
  generatedConceptMapId: 'map-from-submission-v2-o5p6', // New related map ID
  classroomId: MOCK_CLASSROOM_SHARED_V2.id,
};

export const MOCK_PROJECT_SUBMISSION_PROCESSING_V2: ProjectSubmission = {
  id: 'sub-processing-v2-s9t0', // New ID
  studentId: MOCK_STUDENT_USER_V2.id,
  originalFileName: 'alpha_bypass_project_v2.rar', // New filename
  fileSize: 789000,
  fileStoragePath: 'mock/alpha_bypass_project_v2.rar',
  submissionTimestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  analysisStatus: ProjectSubmissionStatus.PROCESSING,
  classroomId: MOCK_CLASSROOM_SHARED_V2.id,
};

// For direct use by services in bypass mode
export let MOCK_CLASSROOMS_STORE: Classroom[] = [MOCK_CLASSROOM_SHARED_V2, MOCK_CLASSROOM_TEACHER_OWNED_V2];
export let MOCK_CLASSROOM_STUDENTS_STORE: Array<{classroom_id: string, student_id: string}> = [
    { classroom_id: MOCK_CLASSROOM_SHARED_V2.id, student_id: MOCK_STUDENT_USER_V2.id },
    { classroom_id: MOCK_CLASSROOM_SHARED_V2.id, student_id: 'another-mock-student-v2-id'},
    { classroom_id: MOCK_CLASSROOM_TEACHER_OWNED_V2.id, student_id: 'mock-s1-v2'},
    { classroom_id: MOCK_CLASSROOM_TEACHER_OWNED_V2.id, student_id: 'mock-s2-v2'},
];
export let MOCK_CONCEPT_MAPS_STORE: ConceptMap[] = [MOCK_CONCEPT_MAP_STUDENT_V2, MOCK_CONCEPT_MAP_TEACHER_V2];
export let MOCK_SUBMISSIONS_STORE: ProjectSubmission[] = [MOCK_PROJECT_SUBMISSION_STUDENT_V2, MOCK_PROJECT_SUBMISSION_PROCESSING_V2];

    