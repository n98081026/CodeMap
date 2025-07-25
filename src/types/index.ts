import type { LucideIcon } from 'lucide-react';

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
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  enableStudentAiAnalysis?: boolean;
}

export interface ConceptMapNode {
  id: string;
  text: string;
  type:
    | 'default'
    | 'manual-node'
    | 'key_feature'
    | 'service_component'
    | 'ui_view'
    | 'data_model'
    | 'code_module'
    | 'external_dependency'
    | 'user_role'
    | 'core_process'
    | 'security_concept'
    | 'ai-concept'
    | 'ai-expanded'
    | 'ai-summary-node'
    | 'ai-rewritten-node'
    | 'text-derived-concept'
    | 'ai-generated'
    | 'ai-group-parent';
  details?: string;
  x?: number;
  y?: number;
  parentNode?: string; // Added for hierarchy
  childIds?: string[]; // Added for explicit child ordering
  backgroundColor?: string;
  shape?: 'rectangle' | 'ellipse';
  width?: number;
  height?: number;
  highlight?: boolean; // New property
}

export interface ConceptMapEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  color?: string;
  lineType?: 'solid' | 'dashed';
  markerStart?: string; // e.g., "none", "arrow", "arrowclosed"
  markerEnd?: string; // e.g., "none", "arrow", "arrowclosed"
}

export interface ConceptMapData {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  projectFileStoragePath?: string;
}

export interface ConceptMap {
  id: string;
  name: string;
  ownerId: string;
  mapData: ConceptMapData | null;
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
  default_concept_map_visibility: 'public' | 'private';
  max_project_file_size_mb: number;
}

export type SystemSettingsFromClient = Omit<
  SystemSettings,
  'id' | 'updated_at'
>;

// Added VisualEdgeSuggestion interface
export interface VisualEdgeSuggestion {
  id: string; // Unique ID for the suggestion itself (e.g., generated with uuid or timestamp)
  sourceNodeId: string;
  targetNodeId: string;
  label: string;
  reason?: string;
}
