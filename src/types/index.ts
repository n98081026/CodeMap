export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Classroom {
  id: string;
  name: string;
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
  students?: User[]; // Populated on demand
  inviteCode?: string;
}

export interface ConceptMapNode {
  id: string;
  text: string;
  type: string;
  details?: string;
  x?: number;
  y?: number;
}

export interface ConceptMapEdge {
  id:string;
  source: string;
  target: string;
  label: string;
}

export interface ConceptMapData {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
}

export interface ConceptMap {
  id: string;
  name: string;
  ownerId: string;
  mapData: ConceptMapData;
  isPublic: boolean;
  sharedWithClassroomId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export enum ProjectSubmissionStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ProjectSubmission {
  id: string;
  studentId: string;
  classroomId?: string | null;
  originalFileName: string;
  fileSize: number;
  submissionTimestamp: string;
  analysisStatus: ProjectSubmissionStatus;
  analysisError?: string | null;
  generatedConceptMapId?: string | null;
  generatedConceptMap?: ConceptMap | null; // Populated on demand
}
