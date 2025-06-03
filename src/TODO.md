
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
        - [x] Add Undo/Redo buttons (connected to Zustand temporal store).
    - [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Now takes up main editor area. Nodes now have 4 connection handles.
    - [x] **`PropertiesInspector`**:
        - [x] Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type) properties.
        - [x] Changes update Zustand store and are saved via toolbar.
        - [x] View-only mode implemented with disabled inputs and muted styling.
        - [x] Re-integrated as a toggleable right-hand sheet/drawer.
    - [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal` to interact with AI flows. Context menu actions now correctly target these.
    - [x] **`CanvasPlaceholder`** (AI Suggestions / Map Info Panel):
        - [x] Area displaying textual representation of map data and AI suggestions (extracted concepts, suggested relations, expanded ideas) with "Add to Map" functionality.
        - [x] AI suggestions are cleared after being added to the map.
        - [x] Re-integrated as a toggleable bottom sheet/drawer.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages all client-side state for the concept map editor, including map data, selections, AI suggestions, UI states, and Undo/Redo history (via `temporal` middleware).
- [ ] **Concept Map Editor - Further Enhancements (Future):**
    - [x] Implement a context menu (right-click) on canvas elements for quick actions (Node delete, AI actions for node).
    - [x] Add custom node types with distinct visual styling on the canvas (Base for custom types is in with `CustomNodeComponent`, further styling added).
    - [ ] Implement robust Undo/Redo functionality in the editor (Zustand temporal store setup complete, UI buttons added. Needs thorough testing).
- [x] **State Management:**
    - [x] Implement a robust client-side state management solution (Zustand implemented for Concept Map Editor, including `temporal` middleware for undo/redo).
- [ ] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using Supabase Realtime) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling implemented in SubmissionListItem. Re-evaluate with Supabase Realtime for better UX).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design. (Largely addressed, ongoing process, including empty state icon refinements and navigation path consistency)
    - [x] Add more comprehensive loading states and error handling. (Done for many list pages and dashboards using mock data. Re-evaluate with Supabase async operations).
    - [x] Enhance empty states for lists (e.g., no classrooms, no maps, no students in classroom, updated icons for thematic relevance in Teacher Classroom Detail).
    - [x] Implement user profile page and settings (Profile page created, edit name/email connected to mock service. Change password mock connected. Re-evaluate with Supabase Auth & Profiles).
    - [x] Add pagination and filtering for lists (Admin User Management page, Teacher classrooms page have pagination with mock data. Re-evaluate with Supabase queries).
    - [x] Add loading spinner to Login/Register pages during auth state check. (Current implementation prevents form flash, considered complete. Supabase integration might change this).
    - [x] Make header icons link to main dashboards for easier navigation (Role-based for Concept Map Editor, Teacher pages, and main Admin/Student/Teacher dashboards).
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode (muted labels, inputs disabled).
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination, delete, edit connected to mock service; add user via register flow - Add button tooltip added. Re-evaluate with Supabase).
    - [x] Develop system settings interface (Placeholder page created and linked from Admin Dashboard. Settings form implemented with mock save. Re-evaluate where to store these settings with Supabase - e.g. a dedicated settings table).

## GenAI & AI Features (Existing - Review after Supabase integration)
- [x] **Refine GenAI Prompts:**
    - [x] Iterate on prompts for `extractConcepts`, `suggestRelations`, `expandConcept` for better accuracy and relevance.
    - [x] Develop and refine advanced prompts for `generateMapFromProject` in the analysis microservice (Input structure refined, "Whimsical-style" guidance added. Re-evaluate with Supabase file handling).
- [x] **Integrate GenAI Output:**
    - [x] Develop intuitive ways for users to interact with and utilize the outputs of GenAI tools within the concept map editor.
        - [x] Add placeholder "Add to Map" indicators for AI-generated content in CanvasPlaceholder. (Functional, adds to Zustand store)
    - [x] Allow users to accept/reject/modify AI suggestions.
        - [x] Implement 'Add to Map' for AI suggestions, updating mapData state directly in Zustand store. (Suggestions cleared after adding)

## Testing & Deployment (Future - Out of Scope for AI Agent Implementation)
- [ ] **Testing:**
    - [ ] Write unit tests for critical components and utility functions.
    - [ ] Implement integration tests for user flows with Supabase.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline (e.g., GitHub Actions for Supabase migrations and Next.js deployment).
    - [ ] Configure production environment for Next.js and Supabase.

## Known Issues / Current Mocked Areas (Pre-Supabase)
- Backend services are currently mocked (in-memory data). This entire section will be superseded by Supabase integration.
- AuthContext provides automatic login for test users. Supabase will handle real auth.
- Data persistence beyond auth (localStorage for user object) is not DB-backed. Supabase will handle persistence.
- Concept map canvas is React Flow. Project Analysis generates ConceptMap record (mock DB). AI map gen will save to Supabase.
- `next-themes` for theme toggling is integrated.
- App is focused on desktop experience.
- Admin "Add User" directs to register page. This is fine.
- Real file uploads and message queues were out of scope for mock. Supabase Storage will handle uploads. Genkit flow will process.

This has been added to your `src/TODO.md` file.
