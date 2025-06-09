
import type { LucideIcon } from "lucide-react"; 

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
  description?: string;
  teacherId: string;
  teacherName?: string;
  studentIds: string[];
  students?: User[];
  inviteCode?: string;
  subject?: string; 
  difficulty?: "beginner" | "intermediate" | "advanced"; 
  enableStudentAiAnalysis?: boolean; 
}

export interface ConceptMapNode {
  id: string;
  text: string; 
  type: string; 
  details?: string;
  x?: number; 
  y?: number; 
  parentNode?: string;
  backgroundColor?: string; 
  shape?: 'rectangle' | 'ellipse'; 
  width?: number; 
  height?: number; 
}

export interface ConceptMapEdge {
  id:string;
  source: string; 
  target: string; 
  label: string; 
  sourceHandle?: string | null; 
  targetHandle?: string | null; 
  color?: string;
  lineType?: 'solid' | 'dashed';
  markerStart?: string; // e.g., "none", "arrow", "arrowclosed"
  markerEnd?: string;   // e.g., "none", "arrow", "arrowclosed"
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
  fileStoragePath?: string | null; 
  submissionTimestamp: string;
  analysisStatus: ProjectSubmissionStatus;
  analysisError?: string | null;
  generatedConceptMapId?: string | null;
  generatedConceptMap?: ConceptMap | null; 
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

export interface DashboardLinkCardProps {
  title: string;
  description: string;
  count?: React.ReactNode;
  icon: LucideIcon;
  href: string;
  linkText: string;
}

export interface SystemSettings {
  enable_ai_project_analysis: boolean;
  default_concept_map_visibility: "public" | "private";
  max_project_file_size_mb: number;
}

export type SystemSettingsFromClient = Omit<SystemSettings, 'id' | 'updated_at'>;
