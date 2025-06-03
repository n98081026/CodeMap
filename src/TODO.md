
# CodeMap TODO List

## Supabase Backend Integration
This section outlines the tasks to migrate the application from mock backend services to a full Supabase backend.

**1. Supabase Setup & Initial Configuration**
- [ ] **Project Setup:**
    - [ ] Create a new Supabase project.
    - [ ] Configure Supabase project settings (e.g., database timezone, auth settings).
- [ ] **Client Library & Config:**
    - [ ] Install `@supabase/supabase-js` package.
    - [ ] Create Supabase client configuration file (e.g., `src/lib/supabaseClient.ts`).
    - [ ] Set up environment variables for Supabase URL and Anon Key (`.env` and deployment).
- [ ] **Database Schema Design (Initial Pass):**
    - [ ] Define table structures for `profiles`, `classrooms`, `classroom_students`, `concept_maps`, `project_submissions`.
    - [ ] Plan relationships (foreign keys) between tables.
- [ ] **Database Migrations:**
    - [ ] Set up Supabase CLI for local development and schema migrations.
    - [ ] Create initial schema migration SQL scripts.

**2. User Authentication & Profiles with Supabase Auth**
- [ ] **Users (`profiles`) Table:**
    - [ ] Create `profiles` table in Supabase (columns: `id` (FK to `auth.users.id`), `name`, `email`, `role`, `created_at`, `updated_at`).
    - [ ] Set up RLS policies for `profiles` (e.g., users can update their own profile, read their own, admins can manage).
- [ ] **`AuthContext` Refactor:**
    - [ ] Replace mock `login` with Supabase `signInWithPassword`.
    - [ ] Replace mock `register` with Supabase `signUp` (and trigger profile creation).
    - [ ] Replace mock `logout` with Supabase `signOut`.
    - [ ] Fetch user profile data from `profiles` table after Supabase auth state changes.
    - [ ] Implement session management using Supabase `onAuthStateChange`.
    - [ ] Remove old mock user data and local storage logic for user object.
- [ ] **`userService.ts` Refactor:**
    - [ ] `createUser`: On Supabase `signUp` success, create a corresponding record in the `profiles` table (can be done via a Supabase Function triggered on auth user creation, or client-side after sign-up).
    - [ ] `findUserByEmailAndRole`, `getUserById`: Query `profiles` table using `supabase-js`.
    - [ ] `updateUser`: Update `profiles` table. Supabase Auth methods for email/password change.
    - [ ] `deleteUser`: Delete from `profiles` and potentially `auth.users` (requires service_role key or admin privileges).
    - [ ] `changeUserPassword`: Use Supabase Auth `updateUser` method for password changes.
- [ ] **API Routes (`/api/auth/*`) Review/Refactor:**
    - [ ] Determine if `/api/auth/login` and `/api/auth/register` are still needed or if client-side Supabase calls suffice.
    - [ ] If kept, secure them and have them call Supabase admin functions if necessary.

**3. Classroom Management with Supabase**
- [ ] **`classrooms` Table:**
    - [ ] Create `classrooms` table (columns: `id` (PK, UUID), `name`, `description`, `teacher_id` (FK to `profiles.id`), `invite_code` (unique), `created_at`, `updated_at`).
    - [ ] RLS policies: Teachers CRUD their own. Students read enrolled. Admins full access.
- [ ] **`classroom_students` Table (Junction):**
    - [ ] Create `classroom_students` table (columns: `classroom_id` (FK), `student_id` (FK), `enrolled_at`). PK on (`classroom_id`, `student_id`).
    - [ ] RLS policies: Teachers manage their classroom enrollments. Students read their own. Admins full access.
- [ ] **`classroomService.ts` Refactor:**
    - [ ] `createClassroom`: Insert into `classrooms`.
    - [ ] `getClassroomsByTeacherId`, `getClassroomsByStudentId`: Query Supabase tables (may involve joins).
    - [ ] `getClassroomById`: Query `classrooms`, join with `profiles` for teacher name, and join with `classroom_students` then `profiles` for student list.
    - [ ] `addStudentToClassroom`, `removeStudentFromClassroom`: Manage records in `classroom_students`.
    - [ ] `updateClassroom`, `deleteClassroom`: Update/delete from `classrooms` table.
    - [ ] `getAllClassrooms`: Query for admin dashboard.

**4. Concept Map Management with Supabase**
- [ ] **`concept_maps` Table:**
    - [ ] Create `concept_maps` table (columns: `id` (PK, UUID), `name`, `owner_id` (FK to `profiles.id`), `map_data` (JSONB), `is_public` (boolean), `shared_with_classroom_id` (FK to `classrooms.id`, nullable), `created_at`, `updated_at`).
    - [ ] RLS policies: Owner CRUD. Classroom members read if shared. Public read if `is_public`. Admins full access.
- [ ] **`conceptMapService.ts` Refactor:**
    - [ ] All CRUD operations to interact with the `concept_maps` table using `supabase-js`.

**5. Project Submission & Analysis with Supabase**
- [ ] **`project_submissions` Table:**
    - [ ] Create `project_submissions` table (columns: `id` (PK, UUID), `student_id` (FK to `profiles.id`), `classroom_id` (FK, nullable), `original_file_name`, `file_size`, `submission_timestamp`, `analysis_status` (text enum), `analysis_error`, `generated_concept_map_id` (FK, nullable), `file_storage_path`).
    - [ ] RLS policies: Students CRUD their own. Teachers read for their classrooms. Admins full access.
- [ ] **Supabase Storage Setup:**
    - [ ] Create a storage bucket for project file uploads.
    - [ ] Define RLS policies for the storage bucket (e.g., students can upload to a path associated with their ID).
- [ ] **`projectSubmissionService.ts` Refactor:**
    - [ ] `createSubmission`: Upload file to Supabase Storage, then create record in `project_submissions` table with `file_storage_path`.
    - [ ] `getSubmissionById`, `getSubmissionsByStudentId`, `getSubmissionsByClassroomId`: Query `project_submissions` table.
    - [ ] `updateSubmissionStatus`: Update records in `project_submissions`.
    - [ ] `getAllSubmissions`: Query for admin dashboard.
- [ ] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
    - [ ] Modify flow to fetch project file from Supabase Storage (if direct file content isn't passed).
    - [ ] On successful map generation:
        - [ ] Call `conceptMapService.createConceptMap` (which will use Supabase) to save the new map.
        - [ ] Call `projectSubmissionService.updateSubmissionStatus` (which will use Supabase) to link the `generated_concept_map_id` and set status to 'completed'.

**6. API Route Refactoring**
- [ ] Review all existing API routes in `src/app/api/`.
- [ ] Refactor each route to:
    - [ ] Use the Supabase-powered service functions.
    - [ ] Implement proper Supabase session/JWT authentication and authorization checks (e.g., using Supabase helper functions for Next.js API routes if available, or manually verifying JWTs).
    - [ ] Ensure RLS policies in Supabase are the primary source of data access control, with API routes performing supplementary checks if needed.

**7. Frontend Connection to Supabase Backend**
- [ ] For each page/component currently fetching data via API routes:
    - [ ] Ensure API routes are correctly calling Supabase services.
    - [ ] Update error handling and loading states to reflect real asynchronous operations.
    - [ ] This is a broad task that touches most of the frontend.

## GenAI & AI Features (Comprehensive Enhancement Plan)

This section outlines improvements to make the GenAI Concept Map features more robust, useful, and "sensible".

**I. Enhance `generateMapFromProject` (Make it Practical & Insightful)**
- [ ] **File Upload & Backend Processing Pipeline:**
    - [ ] **Frontend**: Implement UI in `ProjectUploadForm` for project archive (.zip, .rar) uploads to Supabase Storage.
    - [ ] **API Endpoint**: Create/Modify an API route (e.g., `/api/projects/analyze-upload`) to:
        - [ ] Receive notification of successful upload to Supabase Storage (or handle file stream if direct upload to backend is chosen).
        - [ ] Trigger the `generateMapFromProject` Genkit flow, passing the file path/reference from Supabase Storage.
        - [ ] Consider using Supabase Functions for asynchronous processing triggered by file uploads to avoid long-running API requests.
- [ ] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`):**
    - [ ] **Tool Definition**: Define a new Genkit Tool (`ai.defineTool`).
    - [ ] **Input**: File path/reference from Supabase Storage (or file content if feasible for tool).
    - [ ] **Tool Logic - Phase 1 (Structure & Dependencies)**:
        - [ ] Securely download/access the file from Supabase Storage.
        - [ ] Unpack archive (handle .zip, potentially .rar if library available).
        - [ ] Traverse directory structure.
        - [ ] Identify key manifest files (e.g., `package.json`, `pom.xml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `.csproj`, etc.).
        - [ ] Extract basic project metadata: name, primary language/framework (infer if possible), main dependencies.
        - [ ] List major directories and count of significant file types within them (e.g., `.ts`, `.py`, `.java`).
    - [ ] **Tool Logic - Phase 2 (Basic Code Insights - Iterative)**:
        - [ ] For identified primary language(s), attempt to find main entry points or core modules (e.g., `main.ts`, `App.tsx`, `main.py`, `Program.cs`).
        - [ ] Extract names of primary classes/functions/exports from these key files (using regex or basic parsing; full AST parsing is complex).
    - [ ] **Output**: Structured text or JSON detailing for the LLM:
        - Project name, inferred primary language(s)/framework(s).
        - Key dependencies.
        - Directory tree summary (e.g., `src/ (components: 5, services: 2)`).
        - List of important files/modules and their apparent roles (e.g., "Auth Service: src/services/auth.ts", "UI Component: src/components/Button.tsx").
- [ ] **Modify `generateMapFromProject` Genkit Flow:**
    - [ ] **Input**: Update input schema to accept `projectStoragePath` (string) and optionally user goals or focus areas for the map.
    - [ ] **Tool Integration**: Instruct the LLM (via prompt) to utilize the `projectStructureAnalyzerTool` by providing it with the `projectStoragePath`.
    - [ ] **Refined Prompt**: Update the prompt for `generateMapFromProjectPrompt` to guide the LLM on how to interpret the output from `projectStructureAnalyzerTool`. Emphasize:
        - Identifying high-level architectural components (services, modules, UI views, data models) based on *analyzed structure and file names/types*.
        - Inferring primary relationships (e.g., "imports", "calls", "depends on", "interacts with").
        - Adhering to the specified node types (e.g., 'service_component', 'ui_view').
        - Generating a conceptually organized and understandable map, not just a file listing.
        - For example: "Based on the following project analysis from `projectStructureAnalyzerTool` for the project at `{{{projectStoragePath}}}`, generate a concept map... Output of tool: {{{tool_output_placeholder}}} " (LLM will call tool, get output, then continue generation).
- [ ] **Output Handling & User Interaction (Post Supabase Integration for Submissions & Maps):**
    - [ ] **Update `ProjectUploadForm`**:
        - [ ] On "Generate Map" confirmation (after file metadata submission to `projectSubmissions` table and file upload to Supabase Storage):
            - [ ] Trigger the enhanced `generateMapFromProject` flow (via API route or Supabase Function).
            - [ ] Update `ProjectSubmission` status to `PROCESSING`.
            - [ ] Provide better loading/progress feedback to the user (e.g., "AI analysis in progress...").
    - [ ] **Map Creation & Linking**:
        - [ ] When the Genkit flow successfully generates map data:
            - [ ] The flow (or the API route calling it) should use `conceptMapService` (now Supabase-backed) to create a *new* concept map record.
            - [ ] Update the `ProjectSubmission` record (via `projectSubmissionService`) with the `generated_concept_map_id` and set status to `COMPLETED`.
            - [ ] Notify the user (e.g., via toast and on the submissions page) that the map is ready.
    - [ ] **Viewing Generated Map**:
        - [ ] Ensure the `SubmissionListItem` correctly links to the `generated_concept_map_id` in the editor (in view-only mode initially).
    - [ ] (Advanced/Future) Allow selective merging/importing of parts of the AI-generated map into an *existing* map.

**II. Improve In-Editor AI Tool Interactions & Contextual Awareness**
- [ ] **Contextual Input for AI Tools:**
    - [ ] **`expandConcept`**:
        - [ ] Modify flow input (`ExpandConceptInputSchema` in `expand-concept.ts`) to optionally accept `existingMapContext: z.array(z.string()).optional().describe('Brief text of existing nodes in the map to provide context.')`.
        - [ ] In `ConceptMapEditorPage`, when calling `expandConcept`, pass a sample of existing node texts (e.g., selected node, or up to N random/nearby nodes).
        - [ ] Update prompt in `expandConceptPrompt`: "Given the concept '{{concept}}'{{#if existingMapContext}} within the context of this existing map data: {{#each existingMapContext}}- {{this}}{{/each}}{{/if}}, generate related ideas..."
    - [ ] **`suggestRelations`**:
        - [ ] Modify flow input (`SuggestRelationsInputSchema` in `suggest-relations.ts`) to operate on a *selection* of node texts from the current map (`concepts: z.array(z.string())`).
        - [ ] In `ConceptMapEditorPage`, when opening `SuggestRelationsModal`, pass the text of currently selected nodes (if 2+ selected), or a sample of all nodes.
        - [ ] Update prompt in `suggestRelationsPrompt`: "For the following concepts *already present in the map*: [list selected/all nodes], suggest meaningful relationships *between them*..."
    - [ ] **`extractConcepts`**:
        - [ ] (Future Feature) If text is extracted from a document upload (e.g., PDF, DOCX), pass document name/context to the AI flow.
- [ ] **Interactive AI Suggestions in `CanvasPlaceholder` / UI:**
    - [ ] **Selective Addition**:
        - [ ] For "Extracted Concepts": Display as a list with checkboxes in `CanvasPlaceholder`; allow user to select which ones to add as new nodes. The "Add All" button can remain, but also an "Add Selected" button.
        - [ ] For "Suggested Relations": Display as a list of "Source -> Relation -> Target" with checkboxes; adding should create the edge (and nodes if they don't exist from the selection).
        - [ ] For "Expanded Concepts": Display as a list with checkboxes.
    - [ ] **Edit Before Adding**: (Advanced) Allow users to click-to-edit the text of a suggested concept or relation label within the `CanvasPlaceholder` before adding it to the map.
    - [ ] **Clearer Visual Cues**: Make it more obvious which suggestions have already been added to the map or if they match existing nodes.

**III. General AI User Experience (UX)**
- [ ] **Tooltips & Guidance**: Enhance tooltips in `EditorToolbar` for AI buttons to clarify their function, expected input (e.g., "Select a node first"), and potential output.
- [ ] **Loading & Feedback**:
    - [ ] Consistent and more specific loading indicators for each AI modal/operation (some already exist, ensure uniformity).
    - [ ] Clearer error messages from AI flows, propagated to the user via toasts.
- [ ] **AI Suggestion Panel (`CanvasPlaceholder`)**:
    - [ ] Improve layout and clarity of how AI suggestions are displayed (e.g., better visual distinction between different types of suggestions).
    - [ ] Ensure panel is easily accessible and understandable.

## Frontend Enhancements (Existing - Review after Supabase integration)
- [x] **Key Concept Map Editor Components & Functionality:**
    - [x] **`EditorToolbar`**:
        - [x] Provides UI for Save, Add Node, Add Edge.
        - [x] GenAI tools (Extract Concepts, Suggest Relations, Expand Concept) open respective modals.
        - [x] "Add Edge" disabled if <2 nodes.
        - [x] Implement "New Map" button (navigates to new map route).
        - [x] Implement "Export Map" (JSON download of current map data).
        - [x] Add button to toggle Properties Inspector panel.
        - [x] Add button to toggle AI Suggestions / Map Info panel.
        - [x] Implement "Import Map" (JSON file upload and parsing).
        - [ ] Fix/Re-enable Undo/Redo buttons (connected to Zustand temporal store - temporarily disabled for diagnostics).
    - [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles. Node movement fixed. Connection logic working.
    - [x] **`PropertiesInspector`**:
        - [x] Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type) properties.
        - [x] Changes update Zustand store and are saved via toolbar.
        - [x] View-only mode implemented with disabled inputs and muted styling.
        - [x] Re-integrated as a toggleable right-hand sheet/drawer.
    - [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal` to interact with AI flows. Context menu actions now correctly target these.
    - [x/WIP] **`CanvasPlaceholder`** (AI Suggestions / Map Info Panel):
        - [x] Area displaying textual representation of map data.
        - [ ] AI suggestions (extracted concepts, suggested relations, expanded ideas) with improved "Add to Map" functionality (see GenAI section above).
        - [x] AI suggestions are cleared after being added to the map.
        - [x] Re-integrated as a toggleable bottom sheet/drawer.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages all client-side state for the concept map editor. Undo/Redo history (via `temporal` middleware) was temporarily disabled; needs re-evaluation.
- [ ] **Concept Map Editor - Further Enhancements (Future):**
    - [x] Implement a context menu (right-click) on canvas elements for quick actions (Node delete, AI actions for node).
    - [x] Add custom node types with distinct visual styling on the canvas.
    - [ ] Re-evaluate and implement robust Undo/Redo functionality in the editor (Zustand `temporal` store needs careful setup or alternative).
- [x] **State Management:**
    - [x] Zustand implemented for Concept Map Editor. `temporal` middleware needs review.
- [ ] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using Supabase Realtime) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling implemented. Re-evaluate with Supabase Realtime).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details, ensure consistency.
    - [x] Add more comprehensive loading states and error handling (Done for many list pages and dashboards using mock data. Re-evaluate with Supabase async operations).
    - [x] Enhance empty states.
    - [x] Implement user profile page and settings (Connected to mock service. Re-evaluate with Supabase Auth & Profiles).
    - [x] Add pagination and filtering for lists (Admin User Management, Teacher classrooms have pagination with mock data. Re-evaluate with Supabase queries).
    - [x] Add loading spinner to Login/Register pages.
    - [x] Make header icons link to main dashboards.
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode.
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (Connected to mock service. Re-evaluate with Supabase).
    - [x] Develop system settings interface (Mock save. Re-evaluate with Supabase).

## Testing & Deployment (Future - Out of Scope for AI Agent Implementation)
- [ ] **Testing:**
    - [ ] Write unit tests for critical components and utility functions.
    - [ ] Implement integration tests for user flows with Supabase.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline (e.g., GitHub Actions for Supabase migrations and Next.js deployment).
    - [ ] Configure production environment for Next.js and Supabase.

## Known Issues / Current State
- Backend services are being migrated from mock to Supabase.
- AuthContext is being migrated to Supabase Auth.
- Data persistence for all entities will be handled by Supabase.
- Concept map canvas is React Flow. Node dragging works. Connections from any handle to any other handle (source-to-target logic) are being finalized.
- AI for project analysis currently uses mock project structure; needs to integrate real file uploads and analysis tool.
- Zustand `temporal` middleware for undo/redo was causing issues and is temporarily disabled. Needs re-evaluation.
```
      </content>
  </change>
  <change>
    <file>/home/user/studio/src/components/concept-map/custom-node.tsx</file>
    <content><![CDATA[
"use client";
import React, { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Box, // Default
  Milestone, // key_feature
  ServerCog, // service_component
  MonitorPlay, // ui_view
  Database, // data_model
  FileCode2, // code_module
  ExternalLink, // external_dependency
  Users, // user_role
  Workflow, // core_process
  Brain, // ai-extracted-concept, ai-concept
  Lightbulb, // ai-extracted-concept, ai-concept
  Puzzle // manual-node
} from 'lucide-react';

// Data expected by our custom node
export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string; // e.g., 'key_feature', 'service_component' - can be used for styling later
}

const nodeTypeStyles: { [key: string]: string } = {
  key_feature: 'bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-600 text-blue-900 dark:text-blue-200',
  service_component: 'bg-green-100 dark:bg-green-900/50 border-green-500 dark:border-green-600 text-green-900 dark:text-green-200',
  ui_view: 'bg-purple-100 dark:bg-purple-900/50 border-purple-500 dark:border-purple-600 text-purple-900 dark:text-purple-200',
  data_model: 'bg-yellow-100 dark:bg-yellow-800/50 border-yellow-500 dark:border-yellow-600 text-yellow-900 dark:text-yellow-200',
  code_module: 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-500 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200',
  external_dependency: 'bg-pink-100 dark:bg-pink-900/50 border-pink-500 dark:border-pink-600 text-pink-900 dark:text-pink-200',
  user_role: 'bg-teal-100 dark:bg-teal-900/50 border-teal-500 dark:border-teal-600 text-teal-900 dark:text-teal-200',
  core_process: 'bg-orange-100 dark:bg-orange-800/50 border-orange-500 dark:border-orange-600 text-orange-900 dark:text-orange-200',
  'ai-extracted-concept': 'bg-slate-100 dark:bg-slate-700/50 border-slate-400 dark:border-slate-500 text-slate-800 dark:text-slate-300',
  'ai-concept': 'bg-gray-100 dark:bg-gray-700/50 border-gray-400 dark:border-gray-500 text-gray-800 dark:text-gray-300',
  'manual-node': 'bg-sky-100 dark:bg-sky-900/50 border-sky-500 dark:border-sky-600 text-sky-900 dark:text-sky-200',
  default: 'bg-card border-border text-card-foreground',
};

const nodeTypeIcons: { [key: string]: React.ElementType } = {
  key_feature: Milestone,
  service_component: ServerCog,
  ui_view: MonitorPlay,
  data_model: Database,
  code_module: FileCode2,
  external_dependency: ExternalLink,
  user_role: Users,
  core_process: Workflow,
  'ai-extracted-concept': Brain,
  'ai-concept': Lightbulb,
  'manual-node': Puzzle,
  default: Box,
};


const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, selected, isConnectable, id }) => {
  const baseStyle = "shadow-md rounded-lg transition-all duration-150 ease-in-out border-2";
  const selectedStyle = selected ? "ring-2 ring-primary ring-offset-2 dark:ring-offset-background shadow-2xl" : "hover:shadow-xl";
  const typeSpecificStyle = nodeTypeStyles[data.type || 'default'] || nodeTypeStyles['default'];
  const IconComponent = nodeTypeIcons[data.type || 'default'] || nodeTypeIcons['default'];

  const handleBaseStyle = {
    width: 8,
    height: 8,
    background: 'hsl(var(--muted))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '2px',
    transition: 'all 0.2s ease',
    pointerEvents: 'all' as React.CSSProperties['pointerEvents'],
  };

  return (
    <Card className={cn(baseStyle, selectedStyle, typeSpecificStyle, 'min-w-[160px] max-w-[280px] group')}>
      <CardHeader className={cn(
        "p-2.5 border-b border-[inherit] cursor-move flex flex-row items-center space-x-2",
        data.type && nodeTypeStyles[data.type] ? 'bg-opacity-20' : ''
      )}>
        <IconComponent className="h-4 w-4 text-[inherit] opacity-80 flex-shrink-0" />
        <CardTitle className="text-sm font-semibold text-center truncate group-hover:whitespace-normal flex-grow min-w-0">
          {data.label || 'Node'}
        </CardTitle>
      </CardHeader>
      {data.details && (
        <CardContent className="p-2.5 text-xs text-[inherit] opacity-90 truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:text-clip max-h-20 overflow-y-auto">
          {data.details}
        </CardContent>
      )}

      <Handle
        type="target" // Top is target
        position={Position.Top}
        id={`${id}-top`}
        style={{ ...handleBaseStyle, top: '-5px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="source" // Bottom is source
        position={Position.Bottom}
        id={`${id}-bottom`}
        style={{ ...handleBaseStyle, bottom: '-5px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="target" // Left is target
        position={Position.Left}
        id={`${id}-left`}
        style={{ ...handleBaseStyle, left: '-5px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
      <Handle
        type="source" // Right is source
        position={Position.Right}
        id={`${id}-right`}
        style={{ ...handleBaseStyle, right: '-5px' }}
        isConnectable={isConnectable}
        className="react-flow__handle-custom"
      />
    </Card>
  );
};

export default memo(CustomNodeComponent);

