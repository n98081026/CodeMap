
// src/lib/config.ts

// Set this to true to bypass Supabase auth and use a mock student user.
// REMEMBER TO SET TO FALSE FOR ACTUAL AUTH TESTING/PRODUCTION.
export const BYPASS_AUTH_FOR_TESTING = true;

// Define mock user data that can be shared across services when BYPASS_AUTH_FOR_TESTING is true.
import type { User, Classroom, ConceptMap, ProjectSubmission } from '@/types';
import { UserRole, ProjectSubmissionStatus } from '@/types';

export const MOCK_STUDENT_USER_V3: User = {
  id: 'student-mock-v3-s001',
  name: 'Alpha Student (Bypass V3)',
  email: 'alphastudent.bypass.v3@example.com',
  role: UserRole.STUDENT,
};

export const MOCK_TEACHER_USER_V3: User = {
  id: 'teacher-mock-v3-t001',
  name: 'Bravo Teacher (Bypass V3)',
  email: 'bravoteacher.bypass.v3@example.com',
  role: UserRole.TEACHER,
};

export const MOCK_ADMIN_USER_V3: User = {
  id: 'admin-mock-v3-a001',
  name: 'Charlie Admin (Bypass V3)',
  email: 'charlieadmin.bypass.v3@example.com',
  role: UserRole.ADMIN,
};

// Default exports for easier use in AuthContext if only one set of mocks is primarily used
export const MOCK_STUDENT_USER = MOCK_STUDENT_USER_V3;
export const MOCK_TEACHER_USER = MOCK_TEACHER_USER_V3;
export const MOCK_ADMIN_USER = MOCK_ADMIN_USER_V3;

export const MOCK_USERS: User[] = [MOCK_STUDENT_USER_V3, MOCK_TEACHER_USER_V3, MOCK_ADMIN_USER_V3];

export const MOCK_CLASSROOM_SHARED_V3: Classroom = {
  id: 'class-shared-v3-cs01',
  name: 'Bypass Shared Classroom V3',
  teacherId: MOCK_TEACHER_USER_V3.id,
  teacherName: MOCK_TEACHER_USER_V3.name,
  studentIds: [MOCK_STUDENT_USER_V3.id, 'another-mock-student-v3-s002'],
  inviteCode: 'BYPASSV3',
  description: 'A V3 classroom for bypass testing where student is enrolled.',
  subject: 'Advanced Bypassology V3',
  difficulty: 'advanced',
  enableStudentAiAnalysis: false,
};

export const MOCK_CLASSROOM_TEACHER_OWNED_V3: Classroom = {
  id: 'class-teacher-owned-v3-ct01',
  name: 'Bypass Teacher Classroom V3',
  teacherId: MOCK_TEACHER_USER_V3.id,
  teacherName: MOCK_TEACHER_USER_V3.name,
  studentIds: ['mock-v3-s003', 'mock-v3-s004'],
  inviteCode: 'TEACHV3',
  description: 'A V3 classroom owned by the mock teacher.',
  subject: 'Modern Pedagogy V3',
  difficulty: 'beginner',
  enableStudentAiAnalysis: true,
};

export const MOCK_CLASSROOMS_STORE: Classroom[] = [MOCK_CLASSROOM_SHARED_V3, MOCK_CLASSROOM_TEACHER_OWNED_V3];
export const MOCK_CLASSROOM_STUDENTS_STORE: Array<{classroom_id: string, student_id: string}> = [
    { classroom_id: MOCK_CLASSROOM_SHARED_V3.id, student_id: MOCK_STUDENT_USER_V3.id },
    { classroom_id: MOCK_CLASSROOM_SHARED_V3.id, student_id: 'another-mock-student-v3-s002'},
    { classroom_id: MOCK_CLASSROOM_TEACHER_OWNED_V3.id, student_id: 'mock-v3-s003'},
    { classroom_id: MOCK_CLASSROOM_TEACHER_OWNED_V3.id, student_id: 'mock-v3-s004'},
];

export const MOCK_CONCEPT_MAP_STUDENT_V3: ConceptMap = {
  id: 'map-student-v3-ms01',
  name: 'Student Bypass Map V3 Alpha',
  ownerId: MOCK_STUDENT_USER_V3.id,
  mapData: { nodes: [{id: 'n1-v3-alpha', text: 'Bypass Node V3 Alpha', type: 'default', x: 70, y:70}], edges: [] },
  isPublic: true,
  sharedWithClassroomId: MOCK_CLASSROOM_SHARED_V3.id,
  createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  updatedAt: new Date(Date.now() - 86400000).toISOString(),
};

export const MOCK_CONCEPT_MAP_TEACHER_V3: ConceptMap = {
  id: 'map-teacher-v3-mt01',
  name: 'Teacher Bypass Map V3 Beta',
  ownerId: MOCK_TEACHER_USER_V3.id,
  mapData: { nodes: [{id: 'nt1-v3-beta', text: 'Teacher Node V3 Beta', type: 'important', x: 100, y:100}], edges: [] },
  isPublic: false,
  sharedWithClassroomId: MOCK_CLASSROOM_TEACHER_OWNED_V3.id,
  createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_CONCEPT_MAPS_STORE: ConceptMap[] = [MOCK_CONCEPT_MAP_STUDENT_V3, MOCK_CONCEPT_MAP_TEACHER_V3];
// This is the specific map used by useConceptMapDataManager's MOCK_USER_FOR_TESTING_MAPS
export const MOCK_CONCEPT_MAP_STUDENT = MOCK_CONCEPT_MAP_STUDENT_V3;


export const MOCK_PROJECT_SUBMISSION_STUDENT_V3: ProjectSubmission = {
  id: 'sub-student-v3-sps01',
  studentId: MOCK_STUDENT_USER_V3.id,
  originalFileName: 'final_bypass_project_v3.zip',
  fileSize: 234567,
  fileStoragePath: 'mock/final_bypass_project_v3.zip',
  submissionTimestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
  analysisStatus: ProjectSubmissionStatus.COMPLETED,
  generatedConceptMapId: 'map-from-submission-v3-sgs01',
  classroomId: MOCK_CLASSROOM_SHARED_V3.id,
};

export const MOCK_PROJECT_SUBMISSION_PROCESSING_V3: ProjectSubmission = {
  id: 'sub-processing-v3-spp01',
  studentId: MOCK_STUDENT_USER_V3.id,
  originalFileName: 'alpha_bypass_project_v3.rar',
  fileSize: 789000,
  fileStoragePath: 'mock/alpha_bypass_project_v3.rar',
  submissionTimestamp: new Date(Date.now() - 86400000).toISOString(),
  analysisStatus: ProjectSubmissionStatus.PROCESSING,
  classroomId: MOCK_CLASSROOM_SHARED_V3.id,
};

export const MOCK_SUBMISSIONS_STORE: ProjectSubmission[] = [MOCK_PROJECT_SUBMISSION_STUDENT_V3, MOCK_PROJECT_SUBMISSION_PROCESSING_V3];

// This is the critical object for useConceptMapDataManager bypass logic
export const MOCK_USER_FOR_TESTING_MAPS: { [key: string]: ConceptMap } = {
  [MOCK_CONCEPT_MAP_STUDENT_V3.id]: MOCK_CONCEPT_MAP_STUDENT_V3,
  [MOCK_CONCEPT_MAP_TEACHER_V3.id]: MOCK_CONCEPT_MAP_TEACHER_V3,
  // Add other specific mock maps here by their ID if needed for testing other routes
  // e.g., if you had map-from-submission-v3-sgs01 defined as a full ConceptMap object:
  // 'map-from-submission-v3-sgs01': { id: 'map-from-submission-v3-sgs01', name: 'AI Map from Submission V3', ... }
};
