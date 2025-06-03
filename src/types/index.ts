
import type { LucideIcon } from "lucide-react"; // Added for EmptyState

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
}

export interface ConceptMapNode {
  id: string;
  text: string; // Label for the node
  type: string; // e.g., 'key_feature', 'service_component', 'customConceptNode' (for React Flow type)
  details?: string;
  x?: number; // Position x
  y?: number; // Position y
  // React Flow specific properties like 'position' are typically handled by React Flow state,
  // but storing initial/saved x,y is good.
}

export interface ConceptMapEdge {
  id:string;
  source: string; // Source node ID
  target: string; // Target node ID
  label: string; // Label for the edge
  sourceHandle?: string | null; // Optional: specific source handle ID
  targetHandle?: string | null; // Optional: specific target handle ID
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
  generatedConceptMap?: ConceptMap | null;
}

// Interface for the EmptyState component props
export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionButton?: React.ReactNode;
}

// Interface for DashboardLinkCard component props
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
  // No 'id' or 'updated_at' here, as they are DB implementation details
  // or handled by the service/API layer for the single settings row.
}

export type SystemSettingsFromClient = Omit<SystemSettings, 'id' | 'updated_at'>;

