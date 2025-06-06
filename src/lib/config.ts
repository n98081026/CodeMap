// src/lib/config.ts

// Set this to true to bypass Supabase auth and use a mock student user.
// REMEMBER TO SET TO FALSE FOR ACTUAL AUTH TESTING/PRODUCTION.
export const BYPASS_AUTH_FOR_TESTING = true;

// Define mock user data that can be shared across services when BYPASS_AUTH_FOR_TESTING is true.
import type { User, Classroom, ConceptMap, ProjectSubmission } from '@/types';
import { UserRole, ProjectSubmissionStatus } from '@/types';

export const MOCK_STUDENT_USER: User = {
  id: 'student-test-id',
  name: 'Test Student (Bypass)',
  email: 'teststudent.bypass@example.com',
  role: UserRole.STUDENT,
};

export const MOCK_TEACHER_USER: User = {
  id: 'teacher-test-id',
  name: 'Test Teacher (Bypass)',
  email: 'testteacher.bypass@example.com',
  role: UserRole.TEACHER,
};

export const MOCK_ADMIN_USER: User = {
  id: 'admin-mock-id', // Used in AuthContext for initial bypass
  name: 'Test Admin (Bypass)',
  email: 'testadmin.bypass@example.com',
  role: UserRole.ADMIN,
};

export const MOCK_USERS: User[] = [MOCK_STUDENT_USER, MOCK_TEACHER_USER, MOCK_ADMIN_USER];

export const MOCK_CLASSROOM_SHARED: Classroom = {
  id: 'class-shared-bypass',
  name: 'Bypass Shared Classroom',
  teacherId: MOCK_TEACHER_USER.id,
  teacherName: MOCK_TEACHER_USER.name,
  studentIds: [MOCK_STUDENT_USER.id, 'another-mock-student-id'],
  inviteCode: 'BYPASS01',
  description: 'A classroom for bypass testing where student is enrolled.',
  subject: 'Bypassology',
  difficulty: 'intermediate',
  enableStudentAiAnalysis: true,
};

export const MOCK_CLASSROOM_TEACHER_OWNED: Classroom = {
  id: 'class-teacher-owned-bypass',
  name: 'Bypass Teacher Classroom',
  teacherId: MOCK_TEACHER_USER.id,
  teacherName: MOCK_TEACHER_USER.name,
  studentIds: ['mock-s1', 'mock-s2'],
  inviteCode: 'TEACHBYPASS',
  description: 'A classroom owned by the mock teacher.',
  subject: 'Pedagogy',
  difficulty: 'advanced',
  enableStudentAiAnalysis: false,
};


export const MOCK_CONCEPT_MAP_STUDENT: ConceptMap = {
  id: 'map-student-bypass-1',
  name: 'Student Bypass Map 1',
  ownerId: MOCK_STUDENT_USER.id,
  mapData: { nodes: [{id: 'n1', text: 'Bypass Node', type: 'default', x: 50, y:50}], edges: [] },
  isPublic: false,
  sharedWithClassroomId: MOCK_CLASSROOM_SHARED.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_CONCEPT_MAP_TEACHER: ConceptMap = {
  id: 'map-teacher-bypass-1',
  name: 'Teacher Bypass Map 1',
  ownerId: MOCK_TEACHER_USER.id,
  mapData: { nodes: [{id: 'nt1', text: 'Teacher Node', type: 'default', x: 50, y:50}], edges: [] },
  isPublic: true,
  sharedWithClassroomId: MOCK_CLASSROOM_TEACHER_OWNED.id,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const MOCK_PROJECT_SUBMISSION_STUDENT: ProjectSubmission = {
  id: 'sub-student-bypass-1',
  studentId: MOCK_STUDENT_USER.id,
  originalFileName: 'bypass_project.zip',
  fileSize: 123456,
  fileStoragePath: 'mock/bypass_project.zip',
  submissionTimestamp: new Date(Date.now() - 86400000).toISOString(), // Yesterday
  analysisStatus: ProjectSubmissionStatus.COMPLETED,
  generatedConceptMapId: 'map-from-bypass-submission',
  classroomId: MOCK_CLASSROOM_SHARED.id,
};

export const MOCK_PROJECT_SUBMISSION_PROCESSING: ProjectSubmission = {
  id: 'sub-student-bypass-processing',
  studentId: MOCK_STUDENT_USER.id,
  originalFileName: 'processing_project.rar',
  fileSize: 789012,
  fileStoragePath: 'mock/processing_project.rar',
  submissionTimestamp: new Date().toISOString(),
  analysisStatus: ProjectSubmissionStatus.PROCESSING,
  classroomId: MOCK_CLASSROOM_SHARED.id,
};
