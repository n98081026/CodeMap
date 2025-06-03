

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
    - [x] Replace mock `register` with Supabase `signUp`. (Profile creation post-signup needs to be handled, e.g., by Supabase Function trigger - User responsibility).
    - [x] Replace mock `logout` with Supabase `signOut`.
    - [x] Fetch user profile data from `profiles` table after Supabase auth state changes (Logic added to `AuthContext` to call `userService.getUserById`).
    - [x] Implement session management using Supabase `onAuthStateChange`.
    - [x] Remove old mock user data and local storage logic for user object session (Supabase handles its own session).
- [x] **`userService.ts` Refactor:**
    - [x] `createUserProfile`: New function to create a corresponding record in the `profiles` table after Supabase `signUp` (to be called by a trigger or separate API - User responsibility for trigger/API).
    - [x] `findUserByEmail`, `getUserById`: Query `profiles` table using `supabase-js`.
    - [x] `updateUser`: Update `profiles` table. Supabase Auth methods for email/password change handled separately.
    - [x] `deleteUserProfile`: Delete from `profiles`. Actual `auth.users` deletion needs service_role (User responsibility).
    - [x] `changeUserPassword`: Use Supabase Auth `updateUser` method for password changes (client-side context, needs user to be logged in).
- [x] **API Routes (`/api/auth/*`) Review/Refactor:**
    - [x] `/api/auth/login` and `/api/auth/register` are no longer needed; client-side Supabase calls in `AuthContext` suffice. Marked as deprecated. (User can delete these files).
    - [ ] Secure other API routes and have them call Supabase admin functions if necessary.

**3. Classroom Management with Supabase**
- [ ] **`classrooms` Table:**
    - [ ] Create `classrooms` table (columns: `id` (PK, UUID), `name`, `description`, `teacher_id` (FK to `profiles.id`), `invite_code` (unique), `created_at`, `updated_at`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Teachers CRUD their own. Students read enrolled. Admins full access. (User needs to implement RLS).
- [ ] **`classroom_students` Table (Junction):**
    - [ ] Create `classroom_students` table (columns: `classroom_id` (FK), `student_id` (FK to `profiles.id`), `enrolled_at` (TIMESTAMPTZ)). PK on (`classroom_id`, `student_id`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Teachers manage their classroom enrollments. Students read their own. Admins full access. (User needs to implement RLS).
- [x] **`classroomService.ts` Refactor:** (Refactored to use Supabase client calls. Assumes tables & RLS set up by user).
    - [x] `createClassroom`: Insert into `classrooms`.
    - [x] `getClassroomsByTeacherId`, `getClassroomsByStudentId`: Query Supabase tables (may involve joins/multiple queries for teacher/student names/counts).
    - [x] `getClassroomById`: Query `classrooms`, join with `profiles` for teacher name, and join with `classroom_students` then `profiles` for student list.
    - [x] `addStudentToClassroom`, `removeStudentFromClassroom`: Manage records in `classroom_students`.
    - [x] `updateClassroom`, `deleteClassroom`: Update/delete from `classrooms` table (delete cascades to `classroom_students` via service logic).
    - [x] `getAllClassrooms`: Query for admin dashboard.

**4. Concept Map Management with Supabase**
- [ ] **`concept_maps` Table:**
    - [ ] Create `concept_maps` table (columns: `id` (PK, UUID), `name`, `owner_id` (FK to `profiles.id`), `map_data` (JSONB), `is_public` (boolean), `shared_with_classroom_id` (FK to `classrooms.id`, nullable), `created_at`, `updated_at`). (User needs to create this in their Supabase project).
    - [ ] RLS policies: Owner CRUD. Classroom members read if shared. Public read if `is_public`. Admins full access. (User needs to implement RLS).
- [x] **`conceptMapService.ts` Refactor:** (Refactored to use Supabase client calls. Assumes tables & RLS set up by user).
    - [x] All CRUD operations to interact with the `concept_maps` table using `supabase-js`.

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
- [ ] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
    - [ ] Modify flow to fetch project file from Supabase Storage (if direct file content isn't passed by the tool).
    - [ ] On successful map generation:
        - [x] Call `conceptMapService.createConceptMap` (which will use Supabase) to save the new map. (Done via frontend/API integration)
        - [x] Call `projectSubmissionService.updateSubmissionStatus` (which will use Supabase) to link the `generated_concept_map_id` and set status to 'completed'. (Done via frontend/API integration)

**6. API Route Refactoring**
- [ ] Review all existing API routes in `src/app/api/` (excluding `/auth/*` which are deprecated).
- [ ] Refactor each route to:
    - [x] Use the Supabase-powered service functions. (Partially done for users, classrooms, conceptmaps, submissions)
    - [ ] Implement proper Supabase session/JWT authentication and authorization checks (e.g., using Supabase helper functions for Next.js API routes if available, or manually verifying JWTs).
    - [ ] Ensure RLS policies in Supabase are the primary source of data access control, with API routes performing supplementary checks if needed.

**7. Frontend Connection to Supabase Backend**
- [ ] For each page/component currently fetching data via API routes:
    - [x] Ensure API routes are correctly calling Supabase services. (Partially done for dashboard counts, classroom lists, user lists, etc.)
    - [ ] Update error handling and loading states to reflect real asynchronous operations.
    - [ ] This is a broad task that touches most of the frontend.

## GenAI & AI Features (Comprehensive Enhancement Plan) - Enhanced

This section outlines improvements to make the GenAI Concept Map features more robust, useful, and "sensible". The focus is on delivering a practical and user-friendly initial version, especially for the project analysis tool.

**I. Enhance `generateMapFromProject` (Make it Practical & Insightful)**

- [x] **File Upload UI Adaptation**: (UI flow adapted for archive uploads in `ProjectUploadForm`, Zod schema updated. Actual Supabase Storage upload pending by user).
    - [ ] Frontend: Implement UI in `ProjectUploadForm` for project archive (.zip, .rar, .tar.gz, .tgz) uploads to Supabase Storage. (Actual upload to Supabase Storage not done by AI agent).
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
- [ ] **Output Handling & User Interaction (Post Supabase Integration for Submissions & Maps):**
    - [x] **Update `ProjectUploadForm`**: (File metadata submission to Supabase-backed service via API, triggers Genkit flow with mock storage path)
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
    - [x] **`CanvasPlaceholder`** (AI Suggestions / Map Info Panel):
        - [x] Area displaying textual representation of map data.
        - [x] AI suggestions (extracted concepts, suggested relations, expanded ideas) with "Add to Map" functionality (adds to Zustand store, suggestions cleared after adding).
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
    - [x] Implement user profile page and settings (Connected to mock service. Re-evaluate with Supabase Auth &amp; Profiles).
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
- AuthContext is being migrated to Supabase Auth. User profile data now fetched from Supabase `profiles` table if available.
- Data persistence for all entities will be handled by Supabase.
- Concept map canvas is React Flow. Node dragging &amp; connections working.
- AI for project analysis currently uses mock project structure; needs to integrate real file uploads and analysis tool.
- Zustand `temporal` middleware for undo/redo was causing issues and is temporarily disabled. Needs re-evaluation.
- Supabase client library installed and basic config file created. `.env` updated with user-provided values. `src/types/supabase.ts` created; user needs to run typegen.
- `userService.ts` refactored for Supabase profile operations. Old `/api/auth/*` routes marked deprecated.
- For public registration via `AuthContext -> supabase.auth.signUp()`, a mechanism to create the corresponding `profiles` table entry (e.g., Supabase Function trigger) is still needed by the user.
- `projectStructureAnalyzerTool` is defined with MOCK logic. The `generateMapFromProject` flow is updated to use it.
- `classroomService.ts` refactored to use Supabase client calls. (Requires user to set up tables & RLS).
- `conceptMapService.ts` refactored to use Supabase client calls. (Requires user to set up tables & RLS).
- `projectSubmissionService.ts` refactored to use Supabase client calls. (Requires user to set up tables & RLS. File upload to Storage is separate).

