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
    - [x] Set up environment variables for Supabase URL and Anon Key (`.env` and deployment). (User needs to fill in values)
- [x] **Database Schema Design (Initial Pass):**
    - [x] Define table structures for `profiles`, `classrooms`, `classroom_students`, `concept_maps`, `project_submissions`. (Assumed conceptual definition, user needs to implement in Supabase)
    - [x] Plan relationships (foreign keys) between tables. (Assumed conceptual definition)
- [x] **Database Migrations:**
    - [x] Set up Supabase CLI for local development and schema migrations. (Assumed user will do)
    - [x] Create initial schema migration SQL scripts. (Assumed user will do)
    - [x] Generate TypeScript types from your Supabase schema using `supabase gen types typescript --project-id <your-project-id> --schema public > src/types/supabase.ts` and update `supabaseClient.ts`. **(User has run this command).** Placeholder file `src/types/supabase.ts` created and client updated.

**2. User Authentication & Profiles with Supabase Auth**
- [ ] **Users (`profiles`) Table:**
    - [x] Create `profiles` table in Supabase (columns: `id` (FK to `auth.users.id`), `name`, `email`, `role` (e.g., using a `user_role_enum`), `created_at`, `updated_at`). (User needs to create this in their Supabase project)
    - [ ] Set up RLS policies for `profiles` (e.g., users can update their own profile, read their own, admins can manage). (User needs to implement RLS)
- [x] **`AuthContext` Refactor:**
    - [x] Replace mock `login` with Supabase `signInWithPassword`.
    - [x] Replace mock `register` with Supabase `signUp`. (Profile creation post-signup is a separate step).
    - [x] Replace mock `logout` with Supabase `signOut`.
    - [x] Fetch user profile data from `profiles` table after Supabase auth state changes (Initial implementation, user to complete actual fetch).
    - [x] Implement session management using Supabase `onAuthStateChange`.
    - [x] Remove old mock user data and local storage logic for user object session.
- [x] **`userService.ts` Refactor:**
    - [x] `createUserProfile`: New function to create a corresponding record in the `profiles` table after Supabase `signUp` (to be called by a trigger or separate API). Original `createUser` concept adapted.
    - [x] `findUserByEmail`, `getUserById`: Query `profiles` table using `supabase-js`.
    - [x] `updateUser`: Update `profiles` table. Supabase Auth methods for email/password change handled separately.
    - [x] `deleteUserProfile`: Delete from `profiles`. Actual `auth.users` deletion needs service_role.
    - [x] `changeUserPassword`: Use Supabase Auth `updateUser` method for password changes (client-side context).
- [x] **API Routes (`/api/auth/*`) Review/Refactor:**
    - [x] `/api/auth/login` and `/api/auth/register` are no longer needed; client-side Supabase calls in `AuthContext` suffice. Marked for deletion. (Files updated to reflect deprecation, user can delete them).
    - [ ] Secure other API routes and have them call Supabase admin functions if necessary.

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
- [ ] Review all existing API routes in `src/app/api/` (excluding `/auth/*` which are deprecated).
- [ ] Refactor each route to:
    - [ ] Use the Supabase-powered service functions.
    - [ ] Implement proper Supabase session/JWT authentication and authorization checks (e.g., using Supabase helper functions for Next.js API routes if available, or manually verifying JWTs).
    - [ ] Ensure RLS policies in Supabase are the primary source of data access control, with API routes performing supplementary checks if needed.

**7. Frontend Connection to Supabase Backend**
- [ ] For each page/component currently fetching data via API routes:
    - [ ] Ensure API routes are correctly calling Supabase services.
    - [ ] Update error handling and loading states to reflect real asynchronous operations.
    - [ ] This is a broad task that touches most of the frontend.

## GenAI & AI Features (Comprehensive Enhancement Plan) - Enhanced

This section outlines improvements to make the GenAI Concept Map features more robust, useful, and "sensible". The focus is on delivering a practical and user-friendly initial version, especially for the project analysis tool.

**I. Enhance `generateMapFromProject` (Make it Practical & Insightful)**
- [x] **File Upload & Backend Processing Pipeline:**
    - [x] **Frontend**: Implement UI in `ProjectUploadForm` for project archive (.zip, .rar, .tar.gz, .tgz) uploads. (Actual Supabase Storage upload pending, UI flow for archive selection and metadata submission is adapted. Validation for archives done).
    - [ ] **API Endpoint**: Create/Modify an API route (e.g., `/api/projects/analyze-upload`) to:
        - [ ] Receive notification of successful upload to Supabase Storage (or handle file stream if direct upload to backend is chosen).
        - [ ] Trigger the `generateMapFromProject` Genkit flow, passing the file path/reference from Supabase Storage.
        - [ ] Consider using Supabase Functions for asynchronous processing triggered by file uploads to avoid long-running API requests.
- [ ] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`):**
    - [ ] **Tool Definition**: Define a new Genkit Tool (`ai.defineTool`).
    - [ ] **Input**:
        - `projectStoragePath`: string (File path/reference from Supabase Storage).
        - `userHint` (optional string): User-provided hint about the project's nature or focus area (e.g., "e-commerce backend," "data processing pipeline").
    - [ ] **Tool Logic - Phase 1 (Structure & Dependencies - Core Functionality)**:
        - [ ] Securely download/access the file from Supabase Storage.
        - [ ] Unpack archive (handle .zip, .rar if library available, .tar.gz, .tgz). Implement robust error handling for corrupted archives.
        - [ ] Traverse directory structure.
            - Implement exclusion patterns (e.g., `node_modules`, `.git`, `dist/`, `build/`, `target/`, `venv/`, `__pycache__`).
            - Identify and parse README files (e.g., `README.md`, `README.txt`) at various levels for project description hints.
        - [ ] Identify key manifest files and configuration files (e.g., `package.json`, `pom.xml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `.csproj`, `build.gradle`, `setup.py`, `Dockerfile`, `docker-compose.yml`, `serverless.yml`, common CI/CD config files like `.gitlab-ci.yml`, `Jenkinsfile`).
        - [ ] Extract basic project metadata:
            - Project name (from manifest or directory).
            - Primary language(s)/framework(s) (infer from manifest, file extensions, and known file structures; assign confidence scores if possible).
            - Main dependencies (grouped by type, e.g., "npm packages", "maven dependencies").
        - [ ] List major directories and count of significant file types within them (e.g., `.ts`, `.py`, `.java`, `.go`, `.cs`, `.rb`, `.php`, `.html`, `.css`, `.sql`).
        - [ ] Identify potential entry points or core modules:
            - Look for common entry files (e.g., `main.ts`, `App.tsx`, `main.py`, `Program.cs`, `index.js`, `cmd/.../main.go`).
            - Identify files in directories often containing core logic (e.g., `src/`, `app/`, `lib/`, `pkg/`).
    - [ ] **Tool Logic - Phase 2 (Basic Code & Structural Insights - Iterative & Simplified)**:
        - [ ] For identified primary language(s) and key files/directories:
            - Extract names of primary declarations (e.g., top-level classes, functions, interfaces, components, services, controllers, models) using regex or very basic parsing (avoid full AST for simplicity initially). Focus on exported symbols if easily identifiable.
            - Infer module/file purpose from names and directory structure (e.g., `authController.ts` likely handles authentication; `userModel.java` likely defines a user data structure).
            - (Optional Basic) Extract high-level comments/docstrings from key files/modules if easily parsable.
    - [ ] **Output (Structured JSON for LLM)**: This structured output is key for the LLM to effectively generate a sensible map.
        ```json
        {
          "projectName": "string | null",
          "inferredLanguagesFrameworks": [
            { "name": "string (e.g., TypeScript, Spring Boot)", "confidence": "high | medium | low" }
          ],
          "projectSummary": "string | null (from README or userHint)",
          "dependencies": {
            "npm": ["string"],
            "maven": ["string"],
            "pip": ["string"]
          },
          "directoryStructureSummary": [
            {
              "path": "string (e.g., src/services)",
              "fileCounts": { ".ts": 10, ".js": 2 },
              "inferredPurpose": "string | null (e.g., Business Logic Services)"
            }
          ],
          "keyFiles": [
            {
              "filePath": "string",
              "type": "entry_point | configuration | service_definition | ui_component | model | utility | unknown",
              "extractedSymbols": ["string (e.g., AuthController, processOrderFunction)"],
              "briefDescription": "string | null (e.g., Handles user authentication endpoints)"
            }
          ],
          "potentialArchitecturalComponents": [
            {
              "name": "string (e.g., User Service, Payment Gateway)",
              "type": "service | module | ui_area | data_store_interface",
              "relatedFiles": ["string (paths)"]
            }
          ],
          "parsingErrors": ["string (e.g., Could not parse requirements.txt)"]
        }
        ```
    - [ ] **Error Handling & Resource Limits**:
        - Implement timeouts for unpacking and analysis to prevent runaway processes.
        - Gracefully handle unparseable files or unrecognized structures, logging these and including them in `parsingErrors`.
- [x] **Modify `generateMapFromProject` Genkit Flow:**
    - [x] **Input**: Update input schema to accept `projectStoragePath` (string) and `userGoals` (optional string, for focus areas). (Descriptions updated, actual storage path use pending tool).
    - [ ] **Tool Integration**: Instruct the LLM (via prompt) to utilize the `projectStructureAnalyzerTool` by providing it with the `projectStoragePath` (and `userHint` if `userGoals` is provided).
    - [x] **Refined Prompt**: Update the prompt for `generateMapFromProjectPrompt` to guide the LLM on how to interpret the structured JSON output from `projectStructureAnalyzerTool`. (Prompt adjusted to expect analyzed structure).
- [x] **Output Handling & User Interaction (Post Supabase Integration for Submissions & Maps):**
    - [x] **Update `ProjectUploadForm`**:
        - [x] On "Generate Map" confirmation (after file metadata submission to `projectSubmissions` table and file upload to Supabase Storage): (UI flow adapted, actual storage & tool call pending).
            - [x] Trigger the enhanced `generateMapFromProject` flow (via API route or Supabase Function). (Flow is called, but with mock structure for now).
            - [x] Update `ProjectSubmission` status to `PROCESSING`. (Implemented)
            - [x] Provide better loading/progress feedback to the user (e.g., "AI analysis in progress..."). (Implemented in dialog)
    - [x] **Map Creation & Linking**:
        - [x] When the Genkit flow successfully generates map data:
            - [x] The flow (or the API route calling it) should use `conceptMapService` (now Supabase-backed) to create a *new* concept map record. (Uses mock service currently)
            - [x] Update the `ProjectSubmission` record (via `projectSubmissionService`) with the `generated_concept_map_id` and set status to `COMPLETED`. (Uses mock service currently)
            - [x] Notify the user (e.g., via toast and on the submissions page) that the map is ready. (Implemented)
    - [x] **Viewing Generated Map**:
        - [x] Ensure the `SubmissionListItem` correctly links to the `generated_concept_map_id` in the editor (in view-only mode initially). (Implemented)
    - [ ] (Advanced/Future) Allow selective merging/importing of parts of the AI-generated map into an *existing* map.

**II. Improve In-Editor AI Tool Interactions & Contextual Awareness**
- [x] **Contextual Input for AI Tools:**
    - [x] **`expandConcept`**:
        - [x] Modify flow input (`ExpandConceptInputSchema` in `expand-concept.ts`) to optionally accept `existingMapContext: z.array(z.string()).optional().describe('Brief text of existing nodes in the map to provide context.')`.
        - [x] In `ConceptMapEditorPage`, when calling `expandConcept`, pass a sample of existing node texts (e.g., selected node, its direct neighbors).
        - [x] Update prompt in `expandConceptPrompt`.
    - [x] **`suggestRelations`**:
        - [x] Modify flow input (`SuggestRelationsInputSchema` in `suggest-relations.ts`) to operate on a selection of node texts from the current map (`concepts: z.array(z.string())`, min 1 element - updated from min 2 based on modal use).
        - [x] In `ConceptMapEditorPage`, when opening `SuggestRelationsModal`, pass the text of currently selected/relevant nodes.
        - [x] Update prompt in `suggestRelationsPrompt`.
    - [ ] **`extractConcepts`**:
        - [ ] (Future Feature) If text is extracted from a document upload (e.g., PDF, DOCX), pass document name/context and potentially a summary of the document to the AI flow.
- [x] **Interactive AI Suggestions in `CanvasPlaceholder` / UI (AISuggestionPanel):**
    - [x] **Selective Addition (Key for Usability)**:
        - [x] For "Extracted Concepts", "Suggested Relations", "Expanded Concepts": Display as a list with checkboxes; allow user to select which ones to add. "Add Selected" and "Add All New" buttons implemented.
    - [ ] **(Future - Nice to have for basic) Edit Before Adding**: Allow users to click-to-edit the text of a suggested concept or relation label within the `AISuggestionPanel` before adding it to the map.
    - [x] **Clearer Visual Cues**:
        - [x] Make it more obvious which suggestions have already been added to the map (by disabling checkbox and showing "(already on map)" text or similar visual cue like "(exists)" for relation nodes).
        - [ ] Visually differentiate suggestions that closely match existing nodes. (Partially done by greying out / label)
        - [x] Provide a "Clear" option for suggestion categories. (Implemented for each category via trash icon in header)

**III. General AI User Experience (UX)**
- [x] **Tooltips & Guidance**:
    - [x] Enhance tooltips in `EditorToolbar` for AI buttons to clarify function, expected input, and output.
    - [ ] Provide brief in-UI guidance for new users.
- [x] **Loading & Feedback**:
    - [x] Consistent and more specific loading indicators for each AI modal/operation. (Modals reviewed, buttons show loading state).
    - [ ] Clearer error messages from AI flows, propagated to the user via toasts. Offer actionable advice if possible.
- [x] **AI Suggestion Panel (`AISuggestionPanel` - formerly `CanvasPlaceholder`):**
    - [x] Improve layout and clarity of how AI suggestions are displayed (distinct cards, better empty states for each category).
    - [x] Ensure panel is easily accessible (toggle button in toolbar).
    - [x] Suggestions grouped by type (Extracted, Relations, Expanded) in their own styled cards.

Key Philosophy for this Enhancement:
*   **Practicality First**: The `projectStructureAnalyzerTool` should aim for "good enough" insights from common project structures without requiring perfect parsing of every language.
*   **User Control**: Give users clear choices about what AI suggestions to incorporate.
*   **Iterative Improvement**: This plan lays a solid foundation. More advanced parsing, deeper code analysis, and more sophisticated AI interactions can be built on top of this.
*   **LLM-Friendly Output**: The structure of the `projectStructureAnalyzerTool` output is crucial for the LLM to generate useful maps.

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
- AuthContext is being migrated to Supabase Auth.
- Data persistence for all entities will be handled by Supabase.
- Concept map canvas is React Flow. Node dragging &amp; connections working.
- AI for project analysis currently uses mock project structure; needs to integrate real file uploads and analysis tool.
- Zustand `temporal` middleware for undo/redo was causing issues and is temporarily disabled. Needs re-evaluation.
- Supabase client library installed and basic config file created. `.env` updated with placeholders. `src/types/supabase.ts` created with placeholder and instructions for user. User has run typegen.
- `userService.ts` refactored for Supabase profile operations. Old `/api/auth/*` routes marked deprecated.
- For public registration via `AuthContext -> supabase.auth.signUp()`, a mechanism to create the corresponding `profiles` table entry (e.g., Supabase Function trigger) is still needed by the user.
