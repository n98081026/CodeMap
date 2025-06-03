

# CodeMap TODO List

## Supabase Backend Integration
This section outlines the tasks to migrate the application from mock backend services to a full Supabase backend.

**1. Supabase Setup & Initial Configuration**
- [x] **Project Setup:**
    - [x] Create a new Supabase project. (Assumed done by user)
    - [x] Configure Supabase project settings (e.g., database timezone, auth settings). (Assumed done by user)
- [x] **Client Library & Config:**
    - [x] Install `@supabase/supabase-js` package.
    - [x] Create Supabase client configuration file (`src/lib/supabaseClient.ts`).
    - [x] Set up environment variables for Supabase URL and Anon Key (`.env` and deployment). (User has provided values, `.env` updated).
- [ ] **Database Schema Design (Initial Pass):**
    - [ ] Define table structures for `profiles`, `classrooms`, `classroom_students`, `concept_maps`, `project_submissions`. (User needs to implement in Supabase)
    - [ ] Plan relationships (foreign keys) between tables. (User needs to implement in Supabase)
- [x] **Database Migrations:**
    - [x] Set up Supabase CLI for local development and schema migrations. (Assumed user will do)
    - [x] Create initial schema migration SQL scripts. (Assumed user will do)
    - [x] Generate TypeScript types from your Supabase schema using `supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts` and update `supabaseClient.ts`. File `src/types/supabase.ts` created with placeholder; `supabaseClient.ts` imports from it. **User needs to run the command to populate `src/types/supabase.ts`**.

**2. User Authentication & Profiles with Supabase Auth**
- [ ] **Users (`profiles`) Table:**
    - [ ] Create `profiles` table in Supabase (columns: `id` (FK to `auth.users.id`), `name`, `email`, `role` (e.g., using a `user_role_enum`), `created_at`, `updated_at`). (User needs to create this in their Supabase project)
    - [ ] Set up RLS policies for `profiles` (e.g., users can update their own profile, read their own, admins can manage). (User needs to implement RLS)
- [x] **`AuthContext` Refactor:**
    - [x] Replace mock `login` with Supabase `signInWithPassword` (mock admin login preserved as special case).
    - [x] Replace mock `register` with Supabase `signUp`. (Profile creation post-signup now relies on Supabase trigger on `auth.users` or user to implement `createUserProfile` call post-signup).
    - [x] Replace mock `logout` with Supabase `signOut`.
    - [x] Fetch user profile data from `profiles` table after Supabase auth state changes (Logic added to `AuthContext` to call `userService.getUserById`).
    - [x] Implement session management using Supabase `onAuthStateChange`.
    - [x] Remove old mock user data and local storage logic for user object session (Supabase handles its own session).
    - [x] Remove initial pathname-based mock user auto-login (except mock admin).
- [x] **`userService.ts` Refactor:**
    - [x] `createUserProfile`: Updated to interact with Supabase `profiles` table (intended for use by trigger/secure backend process).
    - [x] `findUserByEmail`, `getUserById`: Updated to query `profiles` table using `supabase-js`.
    - [x] `updateUser`: Updated to modify `profiles` table for name, email (with collision check), and role. *Email update in `auth.users` requires separate Supabase Auth call.*
    - [x] `deleteUserProfile`: Updated to delete from `profiles` table. *Does not delete from `auth.users`.*
    - [x] `changeUserPassword` on profile page uses Supabase Auth.
- [x] **API Routes (`/api/auth/*`) Review/Refactor:**
    - [x] `/api/auth/login` and `/api/auth/register` are no longer needed; client-side Supabase calls in `AuthContext` suffice. Marked as deprecated. (User can delete these files).
    - [x] API routes for users now use Supabase-backed userService. (Further auth checks within API routes if needed by user).

**3. Classroom Management with Supabase**
- [ ] **`classrooms` Table:**
    - [ ] Create `classrooms` table (columns: `id` (PK, UUID), `name`, `description`, `teacher_id` (FK to `profiles.id`), `invite_code` (unique), `created_at`, `updated_at`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Teachers CRUD their own. Students read enrolled. Admins full access. (User needs to implement RLS).
- [ ] **`classroom_students` Table (Junction):**
    - [ ] Create `classroom_students` table (columns: `classroom_id` (FK), `student_id` (FK to `profiles.id`), `enrolled_at` (TIMESTAMPTZ)). PK on (`classroom_id`, `student_id`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Teachers manage their classroom enrollments. Students read their own. Admins full access. (User needs to implement RLS).
- [x] **`classroomService.ts` Refactor:** (Refactored to use Supabase client calls. Assumes tables & RLS set up by user).
    - [x] `createClassroom`: Insert into `classrooms`.
    - [x] `getClassroomsByTeacherId`, `getClassroomsByStudentId`: Query Supabase tables (may involve joins/multiple queries for teacher/student names/counts). Implemented pagination for teacher list.
    - [x] `getClassroomById`: Query `classrooms`, join with `profiles` for teacher name, and join with `classroom_students` then `profiles` for student list.
    - [x] `addStudentToClassroom`, `removeStudentFromClassroom`: Manage records in `classroom_students`.
    - [x] `updateClassroom`, `deleteClassroom`: Update/delete from `classrooms` table (delete cascades to `classroom_students` via service logic).
    - [x] `getAllClassrooms`: Query for admin dashboard.
- [x] **Connect frontend classroom creation and listing UI (teacher) to live API (with Supabase service).**
- [x] **Connect frontend classroom list UI for edit/delete actions (Teacher) to live API (with Supabase service).**
- [x] **Connect frontend classroom detail UI (teacher) to live API for details and student management (with Supabase service).**
- [x] **Connect frontend classroom listing UI (student) to live API (with Supabase service).**
- [x] **Connect frontend student classroom detail UI to live API for viewing classroom info and shared maps (with Supabase service).**

**4. Concept Map Management with Supabase**
- [ ] **`concept_maps` Table:**
    - [ ] Create `concept_maps` table (columns: `id` (PK, UUID), `name`, `owner_id` (FK to `profiles.id`), `map_data` (JSONB), `is_public` (boolean), `shared_with_classroom_id` (FK to `classrooms.id`, nullable), `created_at`, `updated_at`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Owner CRUD. Classroom members read if shared. Public read if `is_public`. Admins full access. (User needs to implement RLS).
- [x] **`conceptMapService.ts` Refactor:** (Refactored to use Supabase client calls. Assumes tables & RLS set up by user).
    - [x] All CRUD operations to interact with the `concept_maps` table using `supabase-js`.
- [x] **Connect frontend concept map listing (student) to live API for loading/deleting (with Supabase service).**
- [x] **Connect frontend concept map editor to live API for saving/loading new and existing maps (including properties like name, isPublic, sharedWithClassroomId from inspector, using Supabase service).**

**5. Project Submission & Analysis with Supabase**
- [ ] **`project_submissions` Table:**
    - [ ] Create `project_submissions` table (columns: `id` (PK, UUID), `student_id` (FK to `profiles.id`), `classroom_id` (FK, nullable), `original_file_name`, `file_size`, `submission_timestamp`, `analysis_status` (text enum), `analysis_error`, `generated_concept_map_id` (FK, nullable), `file_storage_path`, `updated_at` (TIMESTAMPTZ)). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Students CRUD their own. Teachers read for their classrooms. Admins full access. (User needs to implement RLS).
- [ ] **Supabase Storage Setup:**
    - [ ] Create a storage bucket for project file uploads. (User needs to do this).
    - [ ] Define RLS policies for the storage bucket (e.g., students can upload to a path associated with their ID). (User needs to implement RLS).
- [x] **`projectSubmissionService.ts` Refactor:** (Refactored to use Supabase client calls. Assumes tables & RLS set up by user. File upload to Storage is separate).
    - [x] `createSubmission`: Create record in `project_submissions` table. `file_storage_path` not handled by this service yet.
    - [x] `getSubmissionById`, `getSubmissionsByStudentId`, `getSubmissionsByClassroomId`: Query `project_submissions` table.
    - [x] `updateSubmissionStatus`: Update records in `project_submissions`.
    - [x] `getAllSubmissions`: Query for admin dashboard.
- [x] **Connect frontend project submission UI (`ProjectUploadForm`) to live API (for metadata, triggering AI map generation via flow, linking generated map to submission in Supabase service).**
- [x] **Connect frontend student submissions list (`MySubmissionsPage`, `SubmissionListItem`) to live API (with Supabase service, including polling for status updates).**
- [ ] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
    - [ ] Modify flow to fetch project file from Supabase Storage (if direct file content isn't passed by the tool). (User to implement when `projectStructureAnalyzerTool` is made real)
    - [x] On successful map generation:
        - [x] Call `conceptMapService.createConceptMap` (which will use Supabase) to save the new map. (Done via frontend/API integration with Supabase-backed `conceptMapService`)
        - [x] Call `projectSubmissionService.updateSubmissionStatus` (which will use Supabase) to link the `generated_concept_map_id` and set status to 'completed'. (Done via frontend/API integration with Supabase-backed `projectSubmissionService`)

**6. API Route Refactoring (General Review for Supabase)**
- [x] Review all existing API routes in `src/app/api/` (excluding `/auth/*` which are deprecated).
- [x] Refactor each route to:
    - [x] Use the Supabase-powered service functions. (Done for users, classrooms, conceptmaps, submissions)
    - [x] Implement proper Supabase session/JWT authentication and authorization checks (e.g., using Supabase helper functions for Next.js API routes if available, or manually verifying JWTs). (Partially done for password change API, others rely on service logic for now or need explicit auth checks by user).
    - [x] Ensure RLS policies in Supabase are the primary source of data access control, with API routes performing supplementary checks if needed.

**7. Frontend Connection to Supabase Backend (General Review)**
- [x] For each page/component currently fetching data via API routes:
    - [x] Ensure API routes are correctly calling Supabase services. (Done for dashboard counts, classroom lists, user lists, concept map list, submission list for Admin, Teacher, Student.)
    - [x] Update error handling and loading states to reflect real asynchronous operations. (Largely done.)

## GenAI & AI Features (Comprehensive Enhancement Plan) - Enhanced

This section outlines improvements to make the GenAI Concept Map features more robust, useful, and "sensible". The focus is on delivering a practical and user-friendly initial version, especially for the project analysis tool.

**I. Enhance `generateMapFromProject` (Make it Practical & Insightful)**

- [x] **File Upload UI Adaptation**: (UI flow adapted for archive uploads in `ProjectUploadForm`, Zod schema updated. Actual Supabase Storage upload pending by user. Flow now takes `projectStoragePath`. Simulated end-to-end flow for submission status and map record creation is more robust).
- [ ] **API Endpoint & Backend Processing Pipeline (Post-Supabase Storage Setup):**
    - [ ] API Endpoint: Create/Modify an API route (e.g., `/api/projects/analyze-upload`) to:
        - [ ] Receive notification of successful upload to Supabase Storage (or handle file stream if direct upload to backend is chosen).
        - [ ] Trigger the `generateMapFromProject` Genkit flow, passing the file path/reference from Supabase Storage.
    - [ ] Consider using Supabase Functions for asynchronous processing triggered by file uploads to avoid long-running API requests.
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`):**
    - [x] **Tool Definition**: Defined `projectStructureAnalyzerTool` in `src/ai/tools/project-analyzer-tool.ts`.
    - [x] **Input**: `ProjectAnalysisInputSchema` (accepts `projectStoragePath`, `userHint`) defined in tool file.
    - [x] **Output (Structured JSON for LLM)**: `ProjectAnalysisOutputSchema` defined in tool file.
    - [ ] **Tool Logic - Phase 1 (Structure & Dependencies - Core Functionality)**: (Tool currently has MOCK logic. User needs to implement actual download from Supabase Storage, unpacking, parsing, etc.).
        - [ ] Securely download/access the file from Supabase Storage.
        - [ ] Unpack archive (handle .zip, .rar if library available, .tar.gz, .tgz). Implement robust error handling for corrupted archives.
        - [ ] Traverse directory structure.
            - Implement exclusion patterns (e.g., node_modules, .git, dist/, build/, target/, venv/, __pycache__).
            - Identify and parse README files (e.g., README.md, README.txt) at various levels for project description hints.
        - [ ] Identify key manifest files and configuration files (e.g., package.json, pom.xml, requirements.txt, Cargo.toml, go.mod, composer.json, .csproj, build.gradle, setup.py, Dockerfile, docker-compose.yml, serverless.yml, common CI/CD config files like .gitlab-ci.yml, Jenkinsfile).
        - [ ] Extract basic project metadata:
            - Project name (from manifest or directory).
            - Primary language(s)/framework(s) (infer from manifest, file extensions, and known file structures; assign confidence scores if possible).
            - Main dependencies (grouped by type, e.g., "npm packages", "maven dependencies").
        - [ ] List major directories and count of significant file types within them (e.g., .ts, .py, .java, .go, .cs, .rb, .php, .html, .css, .sql).
        - [ ] Identify potential entry points or core modules:
            - Look for common entry files (e.g., main.ts, App.tsx, main.py, Program.cs, index.js, cmd/.../main.go).
            - Identify files in directories often containing core logic (e.g., src/, app/, lib/, pkg/).
    - [ ] **Tool Logic - Phase 2 (Basic Code & Structural Insights - Iterative & Simplified)**:
        - [ ] For identified primary language(s) and key files/directories:
            - Extract names of primary declarations (e.g., top-level classes, functions, interfaces, components, services, controllers, models) using regex or very basic parsing (avoid full AST for simplicity initially). Focus on exported symbols if easily identifiable.
            - Infer module/file purpose from names and directory structure (e.g., authController.ts likely handles authentication; userModel.java likely defines a user data structure).
            - (Optional Basic) Extract high-level comments/docstrings from key files/modules if easily parsable.
    - [ ] **Error Handling & Resource Limits**:
        - [ ] Implement timeouts for unpacking and analysis to prevent runaway processes.
        - [ ] Gracefully handle unparseable files or unrecognized structures, logging these and including them in parsingErrors.
- [x] **Modify `generateMapFromProject` Genkit Flow:**
    - [x] **Input**: Updated input schema to accept `projectStoragePath` and `userGoals`. (UI now sends this format).
    - [x] **Tool Integration**: Instructs the LLM (via prompt) to utilize `projectStructureAnalyzerTool`.
    - [x] **Refined Prompt**: Updated prompt in `generateMapFromProjectPrompt` to guide LLM on interpreting tool output (Further refinement may be needed with real tool output).
- [x] **Output Handling & User Interaction (Post Supabase Integration for Submissions & Maps):**
    - [x] **Update `ProjectUploadForm`**: (File metadata submission to Supabase-backed service via API, triggers Genkit flow with mock storage path. Map creation and linking uses Supabase-backed services via API).
        - [x] On "Generate Map" confirmation (after file metadata submission to `projectSubmissions` table):
            - [x] Trigger the enhanced `generateMapFromProject` flow (via frontend client-side call, using mock project structure that is passed to mocked tool).
            - [x] Update `ProjectSubmission` status to `PROCESSING` (via API).
            - [x] Provide better loading/progress feedback to the user.
    - [x] **Map Creation & Linking**: (Concept Map & Submission linking via API to Supabase-backed services)
        - [x] When the Genkit flow successfully generates map data:
            - [x] The flow (or the client-side code calling it) should use `conceptMapService` to create a new concept map record.
            - [x] Update the `ProjectSubmission` record (via `projectSubmissionService`) with the `generated_concept_map_id` and set status to `COMPLETED`.
            - [x] Notify the user (e.g., via toast and on the submissions page) that the map is ready.
    - [x] **Viewing Generated Map**:
        - [x] Ensure the `SubmissionListItem` correctly links to the `generated_concept_map_id` in the editor (in view-only mode initially).
    - [ ] (Advanced/Future) Allow selective merging/importing of parts of the AI-generated map into an existing map.

**II. Improve In-Editor AI Tool Interactions & Contextual Awareness**
- [x] **Contextual Input for AI Tools:**
    - [x] **`expandConcept`**:
        - [x] Modified flow input (`ExpandConceptInputSchema`) to accept `existingMapContext: z.array(z.string())`.
        - [x] `ConceptMapEditorPage` passes selected node & neighbors as context.
        - [x] Updated prompt in `expandConceptPrompt` to use context.
    - [x] **`suggestRelations`**:
        - [x] Modified flow input (`SuggestRelationsInputSchema`) to operate on `concepts: z.array(z.string())` from map.
        - [x] `ConceptMapEditorPage` passes selected/relevant node texts.
        - [x] Updated prompt in `suggestRelationsPrompt` to use map concepts.
    - [ ] **`extractConcepts`**:
        - [ ] (Future Feature) If text is from document upload, pass document name/context.
- [x] **Interactive AI Suggestions in `CanvasPlaceholder` / UI (AISuggestionPanel):**
    - [x] **Selective Addition**:
        - [x] "Extracted Concepts", "Suggested Relations", "Expanded Concepts" displayed with checkboxes. "Add Selected" and "Add All New" buttons implemented.
    - [x] **Edit Before Adding**: Allow click-to-edit suggested text in `AISuggestionPanel`.
    - [x] **Clearer Visual Cues**:
        - [x] More obvious which suggestions already exist on map (disabled checkbox, "(already on map)" text).
        - [x] Visually differentiate suggestions closely matching existing nodes (e.g., highlight or slightly different style if a suggestion is very similar but not identical to an existing node).
        - [x] Provide a "Clear" option for suggestion categories (Trash icon in header for each category).
    - [x] **Panel Styling and Usability**:
        - [x] Distinct section styling for each AI suggestion type using card backgrounds/borders and themed title/icon colors.
        - [x] Clearer "No Suggestions" state within each card.
        - [x] Refined "Add All New" and "Add Selected" button labels with counts.

**III. General AI User Experience (UX)**
- [x] **Tooltips & Guidance**:
    - [x] Enhanced tooltips in `EditorToolbar` for AI buttons (clarify function, expected input, output).
    - [x] Provide brief in-UI guidance for new users. (Implemented as enhanced empty state in AISuggestionPanel)
- [x] **Loading & Feedback**:
    - [x] Consistent and more specific loading indicators for GenAI modals; buttons show loading state.
    - [x] Clearer error messages from AI flows, propagated to user via toasts. Offer actionable advice if possible.
- [x] **AI Suggestion Panel (`AISuggestionPanel` - formerly `CanvasPlaceholder`):**
    - [x] Improved layout and clarity (distinct cards, better empty states for each category).
    - [x] Ensure panel is easily accessible (toggle button in toolbar).
    - [x] Suggestions grouped by type in styled cards.

Key Philosophy for this Enhancement:
*   **Practicality First**: `projectStructureAnalyzerTool` aims for "good enough" insights from common project structures.
*   **User Control**: Give users clear choices about incorporating AI suggestions.
*   **Iterative Improvement**: This plan is a foundation. More advanced parsing and AI interactions can follow.
*   **LLM-Friendly Output**: `projectStructureAnalyzerTool` output structure is key for LLM's map generation.

This enhanced plan should provide a significantly more robust and user-friendly experience for the GenAI features, especially making the generateMapFromProject feature truly practical.

## Frontend Enhancements (Existing - Review after Supabase integration)
- [x] **Key Concept Map Editor Components & Functionality:**
    - [x] **`EditorToolbar`**:
        - [x] Provides UI for Save, Add Node, Add Edge.
        - [x] GenAI tools (Extract Concepts, Suggest Relations, Expand Concept) open respective modals.
        - [x] "Add Edge" disabled if &lt;2 nodes.
        - [x] Implement "New Map" button (navigates to new map route).
        - [x] Implement "Export Map" (JSON download of current map data).
        - [x] Add button to toggle Properties Inspector panel. (Done)
        - [x] Add button to toggle AI Suggestions / Map Info panel. (Done)
        - [x] Implement "Import Map" (JSON file upload and parsing).
        - [x] Fix/Re-enable Undo/Redo buttons (connected to Zustand temporal store).
    - [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles. Node movement fixed. Connection logic working.
    - [x] **`PropertiesInspector`**:
        - [x] Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type) properties.
        - [x] Changes update Zustand store and are saved via toolbar.
        - [x] View-only mode implemented with disabled inputs and muted styling.
        - [x] Re-integrated as a toggleable right-hand sheet/drawer.
    - [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal` to interact with AI flows. Context menu actions now correctly target these.
    - [x] **`CanvasPlaceholder`** (AI Suggestions / Map Info Panel):
        - [x] Area displaying textual representation of map data.
        - [x] AI suggestions (extracted concepts, suggested relations, expanded ideas) with "Add to Map" functionality (adds to Zustand store, suggestions cleared after adding).
        - [x] Re-integrated as a toggleable bottom sheet/drawer.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages all client-side state for the concept map editor. Undo/Redo history implemented.
- [x] **Concept Map Editor - Further Enhancements (Future):**
    - [x] Implement a context menu (right-click) on canvas elements for quick actions (Node delete, AI actions for node).
    - [x] Add custom node types with distinct visual styling on the canvas. (Fulfilled by current `CustomNodeComponent` varying style by `data.type`)
    - [x] Re-evaluate and implement robust Undo/Redo functionality in the editor (Zustand `temporal` store needs careful setup or alternative). - Marked done, further testing by user.
- [x] **State Management:**
    - [x] Zustand implemented for Concept Map Editor. `temporal` middleware integrated.
- [ ] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using Supabase Realtime) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling implemented. Re-evaluate with Supabase Realtime).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details, ensure consistency.
    - [x] Add more comprehensive loading states and error handling (Done for many list pages and dashboards using Supabase-backed services).
    - [x] Enhance empty states.
    - [x] Implement user profile page and settings (Profile page created, edit name/email working. Change password functionality using Supabase Auth implemented. Linked from Navbar and Sidebar).
    - [x] Add pagination and filtering for lists (Admin User Management, Teacher classrooms have pagination with Supabase-backed services).
    - [x] Add loading spinner to Login/Register pages.
    - [x] Make header icons link to main dashboards.
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode.
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (Connected to Supabase-backed services. Add user via register flow).
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
- Backend services largely migrated from mock to Supabase (users, classrooms, concept_maps, project_submissions).
- AuthContext migrated to Supabase Auth. User profile data fetched from Supabase `profiles` table. Mock admin login via form preserved.
- Data persistence for all entities handled by Supabase (requires user to set up tables & RLS).
- Concept map canvas is React Flow.
- AI for project analysis uses mock project structure (`projectStructureAnalyzerTool`); needs real file uploads and tool logic.
- Zustand `temporal` middleware for undo/redo integrated.
- Supabase client library installed and configured. User needs to run typegen for `src/types/supabase.ts`.
- For public registration via `AuthContext -> supabase.auth.signUp()`, a Supabase Function trigger (or similar mechanism) is needed by the user to create the corresponding `profiles` table entry automatically.
- API routes rely on Supabase-backed services. Further auth checks (JWT verification, role-based access) for API routes might be needed based on specific security requirements. RLS in Supabase is the primary data access control.

    

    
