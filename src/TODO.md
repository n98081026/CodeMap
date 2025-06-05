
# CodeMap TODO List

## Core Functionality & Backend Integration
- [x] **User Authentication (Backend):**
    - [x] Refactor API routes (`/login`, `/register`) to use `userService`.
    - [x] Connect frontend `AuthContext` to live API (with Supabase service).
    - [x] Remove old mock user data and local storage logic for user object session (Supabase handles its own session).
    - [ ] Implement actual API endpoints for JWT generation. (Out of Scope: Supabase handles JWTs)
    - [ ] Secure password hashing and storage. (Out of Scope: Supabase handles this)
- [x] **Database & Models:** (Services now use Supabase)
    - [x] Set up database (PostgreSQL/MongoDB as per final decision). (User to set up Supabase tables & RLS).
    - [x] Define and implement database schemas for Users, Classrooms, ConceptMaps, ProjectSubmissions, etc. (User to implement in Supabase; types defined in `src/types/supabase.ts` and `src/types/index.ts`).
    - [x] Create ORM/ODM layer (Prisma, Sequelize, etc.). (Replaced with Supabase client in services).
- [x] **Classroom Management (Backend & Frontend Integration):** (Core API & Service Done with Supabase)
    - [x] Create `classroomService.ts` with Supabase data management.
    - [x] API endpoint for creating classrooms (`POST /api/classrooms`).
    - [x] API endpoint for listing classrooms by teacher (`GET /api/classrooms?teacherId=xxx`). (Supports pagination)
    - [x] API endpoint for listing classrooms by student (`GET /api/classrooms?studentId=xxx`).
    - [x] API endpoint for getting classroom details (`GET /api/classrooms/[classroomId]`).
    - [x] API endpoints for student enrollment (invites, joining with code - partially mocked with direct add/remove).
        - [x] API endpoint for adding a student to a classroom (`POST /api/classrooms/[classroomId]/students`). (Adds by ID)
        - [x] API endpoint for removing a student from a classroom (`DELETE /api/classrooms/[classroomId]/students/[studentId]`).
    - [x] API endpoints for updating, deleting classrooms (`PUT /api/classrooms/[classroomId]`, `DELETE /api/classrooms/[classroomId]`).
    - [x] Connect frontend classroom creation and listing UI (teacher) to live API (with Supabase service).
    - [x] Connect frontend classroom listing UI (student) to live API (with Supabase service).
    - [x] Connect frontend classroom list UI for edit/delete actions (Teacher) to live API (with Supabase service).
    - [x] Connect frontend classroom detail UI (teacher) to live API for details and student management (student list, map list, submission list connected. Add/remove student by ID working, list refreshes).
    - [x] Connect frontend student classroom detail UI to live API for viewing classroom info and shared maps (with Supabase service).
- [x] **Concept Map Service (Backend & Frontend Integration):** (Core API & Service Done with Supabase)
    - [x] Create `conceptMapService.ts` with Supabase data management.
    - [x] API endpoints for CRUD operations on concept maps (`/api/concept-maps`, `/api/concept-maps/[mapId]`).
    - [x] API endpoint for listing concept maps by classroom (`GET /api/concept-maps?classroomId=xxx`).
    - [x] Logic for map ownership and sharing (with classrooms, public) - Implemented in Supabase service.
    - [x] Connect frontend concept map listing (student) to live API for loading/deleting (with Supabase service).
    - [x] Connect frontend concept map editor to live API for saving/loading new and existing maps (including properties like name, isPublic, sharedWithClassroomId from inspector, using Supabase service).
- [x] **Project Submission & Analysis (Backend & Frontend Integration):** (Core API & Service Done for metadata with Supabase, status updates robust, AI map gen saves real map record to Supabase via service)
    - [x] Create `projectSubmissionService.ts` with Supabase data management (now includes `fileStoragePath`).
    - [x] API endpoint for project file uploads (`POST /api/projects/submissions` - now handles `fileStoragePath` for metadata).
    - [x] API endpoint for listing student submissions (`GET /api/projects/submissions?studentId=xxx`).
    - [x] API endpoint for listing submissions by classroom (`GET /api/projects/submissions?classroomId=xxx`).
    - [x] API endpoint for getting submission details (`GET /api/projects/submissions/[submissionId]`).
    - [x] API endpoint for updating submission status (`PUT /api/projects/submissions/[submissionId]`). (Now updates status including real generated map ID via Supabase service).
    - [x] File storage integration (S3, GCS, or local - Supabase Storage). (User needs to create 'project_archives' bucket in Supabase Storage and `file_storage_path` column in `project_submissions` table, and configure RLS policies). Client-side upload implemented.
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.). (Out of Scope: Requires setup and configuration of external message queuing services and integration logic, typically part of a separate backend infrastructure).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue. (Out of Scope: Microservice architecture and inter-service communication via message queues are beyond the scope of this Next.js application's prototyping).
        - [ ] File downloader/unpacker. (Out of Scope: Secure file handling from storage and decompression logic typically reside in a dedicated backend service, not directly within the Next.js frontend application. Needs to be part of `projectStructureAnalyzerTool` logic).
        - [x] Code/Structure Parser Engine (AI-based: Genkit flow `generateMapFromProject` serves as the core engine. Input refined for AI. `projectStructureAnalyzerTool` has mock logic; real parsing is user's responsibility).
        - [x] LLM-Powered Structure-to-Map Converter (integrates with Genkit/Gemini, parses output, creates new ConceptMap record via Supabase service).
        - [x] Map Data Formatter & Persister (saves generated map via Supabase service, updates submission status with real map ID).
    - [x] Connect frontend project submission UI to live API (for metadata, including client-side upload to Supabase Storage and passing real storage path to AI trigger; AI map generation and saving to Supabase, uses AlertDialog for confirmation).
    - [x] Connect frontend student submissions list to live API (with Supabase service and polling).
    - [x] Connect frontend Admin Dashboard to fetch user & classroom counts dynamically with individual loading/error states (using Supabase-backed services).
    - [x] Connect frontend Student Dashboard to fetch classroom, map & submission counts dynamically with individual loading/error states (using Supabase-backed services).
    - [x] Connect frontend Teacher Dashboard to fetch classroom & student counts dynamically with individual loading/error states (using Supabase-backed services).
    - [x] Ensure navigation paths are consistent (e.g. `/application/...` prefix).

## Frontend Enhancements
- [x] **Key Concept Map Editor Components & Functionality:**
    - [x] **`EditorToolbar`**: Provides UI for Save, Add Node, Add Edge. GenAI tools (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet) open respective modals. "New Map" and "Export Map" always enabled. "Add Edge" disabled if &lt;2 nodes. Undo/Redo buttons added. Toggle for AI Panel and Properties Inspector.
    - [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles.
    - [x] **`PropertiesInspector`**: Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type) properties. Changes update Zustand store and are saved via toolbar. View-only mode implemented with disabled inputs and muted styling. Toggleable via Sheet.
    - [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `QuickClusterModal`, `AskQuestionModal`, `GenerateSnippetModal` to interact with AI flows. Context menu now correctly opens these.
    - [x] **`AISuggestionPanel` (formerly `CanvasPlaceholder`)**: Area (now a toggleable Sheet) displaying textual representation of map data and AI suggestions (extracted concepts, suggested relations, expanded ideas) with "Add to Map" functionality. AI suggestions persist and update status. Suggestions can be edited before adding. Enhanced empty state logic.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages all client-side state for the concept map editor, including map data, selections, AI suggestions, and UI states. Undo/Redo history implemented with `zundo`.
- [x] **State Management:**
    - [x] Implement a robust client-side state management solution (Zustand implemented for Concept Map Editor, including `zundo` middleware).
- [ ] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using Supabase Realtime) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling implemented in SubmissionListItem. Could be enhanced with Supabase Realtime).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design. (Largely addressed, ongoing process, including empty state icon refinements and navigation path consistency)
    - [x] Add more comprehensive loading states and error handling. (Done for many list pages and dashboards using Supabase-backed services)
    - [x] Enhance empty states for lists (e.g., no classrooms, no maps, no students in classroom, updated icons for thematic relevance in Teacher Classroom Detail and dashboard pages).
    - [x] Implement user profile page and settings (Profile page created, edit name/email working. Change password functionality using Supabase Auth implemented. Linked from Navbar and Sidebar).
    - [x] Add pagination and filtering for lists (Admin User Management page and Teacher classrooms page now have pagination with Supabase-backed services).
    - [x] Add loading spinner to Login/Register pages. (Current implementation prevents form flash, considered complete)
    - [x] Make header icons link to main dashboards for easier navigation (Role-based for Concept Map Editor, Teacher pages, and main Admin/Student/Teacher dashboards. Simplified for some role-specific subpages).
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode (muted labels, inputs disabled).
    - [x] Implement change password functionality on profile page (uses Supabase Auth via API).
    - [x] **[CRITICAL TEMPORARY CHANGE]** Revert automatic admin login bypass in `src/app/page.tsx` and `src/app/(auth)/login/page.tsx`. These files were modified to force mock admin login for testing purposes. (Now defaults to mock student login for testing).
    - [x] Developer/Testing: Role switcher on Profile page for testing. Should be removed or properly secured for production. (Added)
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination, delete, edit connected to Supabase-backed service; add user via register flow - Add button tooltip added).
    - [x] Develop system settings interface (Admin Settings page now fetches and saves settings to Supabase via API. Linked from Admin Dashboard).

## GenAI & AI Features - In-Editor Enhancements (Whimsical-Inspired)
- [x] **File Upload UI Adaptation for Project Analysis**: (Covered by general project submission section)
- [ ] **API Endpoint & Backend Processing Pipeline for Project Analysis**: (Covered by general project submission section - User to implement)
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`)**: (Covered by general project submission section - Mock logic, user to implement real parsing)
- [x] **Modify `generateMapFromProject` Genkit Flow for Tool Use**: (Covered by general project submission section)
- [x] **Output Handling & User Interaction for Project Analysis**: (Covered by general project submission section - Links to map view-only)

- [x] **Improve Core AI-Powered Concept Mapping Tools (Whimsical-Inspired Focus):**
    - [x] **Canvas-Integrated AI Brainstorming & Expansion:**
        - [x] **Context Menu AI Actions:** Implement AI actions (Expand, Suggest Relations, Extract Concepts, Ask AI Question) directly on node right-click context menus.
        - [x] **"Quick AI Node/Cluster" on Canvas:** Implemented via Toolbar Modal (`QuickClusterModal`) to generate a new node or a small cluster of related nodes directly onto the map.
        - [x] **AI for Structuring Text into Map Snippets:** Implemented `GenerateSnippetModal` and corresponding AI flow to allow pasting larger text blocks and generating a small, structured set of interconnected nodes.
        - [ ] **Direct AI Output Visualization:** For AI-suggested nodes/edges, investigate options for previewing them directly on the canvas (e.g., as ghost elements or in a temporary layer) before final addition, rather than solely relying on the `AISuggestionPanel`.
    - [x] **Enhanced Context for In-Editor AI Tools:**
        - [x] **`extractConcepts` Context:** Allows extraction from selected node text (single or multiple) or notes on the map.
        - [x] **`suggestRelations` Context:** Revise `SuggestRelationsModal` and underlying logic to better utilize multiple selected nodes from the canvas as primary input, or a single node and its neighbors.
        - [x] **`expandConcept` Context:** Ensure clear visual feedback to the user about which node is being used for expansion, especially when triggered from toolbar vs. context menu. Allow expansion based on multiple selected nodes to find common themes or bridging concepts.
    - [x] **Iterate on GenAI Prompts for Quality & Relevance:**
        - [x] Continuously review and refine prompts for `extractConcepts`, `suggestRelations`, `expandConcept`, `generateQuickCluster`, `askQuestionAboutNode`, `generateMapSnippetFromText` in `src/ai/flows/` to improve the quality, relevance, conciseness, and actionability of suggestions. Aim for fewer, high-impact suggestions if current output is noisy or too generic. (Prompt for `expandConcept` enhanced for diversity).
        - [ ] Explore prompt strategies for more diverse types of suggestions (e.g., analogies, counter-arguments, examples) in other flows.

- [x] **Refine `AISuggestionPanel` Workflow & User Experience:**
    - [x] **Workflow Review**: Re-evaluate the entire workflow from invoking an AI tool to seeing suggestions and adding them to the map. Identify and smooth out friction points. The panel should be a helpful companion, not a bottleneck. (Suggestions now persist and update status, not cleared immediately).
    - [x] **Visual Feedback on "Add to Map"**: Provide clearer visual feedback within the panel when a suggestion is successfully added to the map (e.g., item grays out, shows a checkmark, or is removed from the "new" list, rather than just disappearing). (Items now persist, update status to 'exact-match' or 'similar-match', checkboxes disable for exact matches).
    - [x] **Smart Placement for Panel-Added Nodes**: When adding AI-suggested nodes *from the panel*, refine the placement strategy on the canvas (e.g., near related existing nodes if context is known, or in an open canvas area) rather than just random positions. (Implemented: Places near selected node or cascades from top-left).
    - [x] **Selective Addition**: "Add Selected" and "Add All New" implemented.
    - [x] **Edit Before Adding**: Suggestions can be edited in the panel.
    - [x] **Clearer Visual Cues**: Differentiates existing/similar suggestions.
    - [x] **Panel Styling and Usability**: Improved layout, distinct cards.
    - [x] **Toggleable Panel**: AI Suggestion Panel is now toggleable via a button in the Editor Toolbar and rendered in a `&lt;Sheet&gt;`.

- [x] **Improve General AI User Experience (UX) for In-Editor Tools:**
    - [x] **Tooltips & In-UI Guidance**: Review and enhance tooltips for AI toolbar buttons. Add brief, contextual help within modals or the `AISuggestionPanel` on how to best use each feature and interpret its results. (Modals updated, tooltips present).
    - [x] **Loading & Feedback**: Consistent loading indicators, clearer error messages for AI operations.

## Supabase Backend Integration (Remaining from previous master TODO)
This section outlines tasks to fully migrate to Supabase. Many are now complete.
**1. Supabase Setup & Initial Configuration**
- [x] **Project Setup:** (Assumed user has done)
- [x] **Client Library & Config:** (`src/lib/supabaseClient.ts` and `.env` setup done).
- [ ] **Database Schema Design (User Task):** (User needs to implement in Supabase: `profiles`, `classrooms`, `classroom_students`, `concept_maps`, `project_submissions` (add `file_storage_path TEXT NULLABLE`), `system_settings` and RLS policies).
- [x] **Database Migrations:** (User to handle CLI setup and SQL scripts. `src/types/supabase.ts` placeholder created; user must run typegen).

**2. User Authentication & Profiles with Supabase Auth**
- [x] **Users (`profiles`) Table:** (User needs to create this in their Supabase project + RLS).
- [x] **`AuthContext` Refactor:** (Complete: Supabase login, register, logout, session, profile fetching).
- [x] **`userService.ts` Refactor:** (Complete: All user service functions use Supabase).
- [x] **API Routes (`/api/auth/*`) Review/Refactor:** (Complete: Marked deprecated).

**3. Classroom Management with Supabase**
- [ ] **`classrooms` Table:** (User needs to create + RLS).
- [ ] **`classroom_students` Table (Junction):** (User needs to create + RLS).
- [x] **`classroomService.ts` Refactor:** (Complete: All classroom service functions use Supabase).
- [x] **Connect frontend classroom UI (teacher, student) to live API (with Supabase service).** (Complete)

**4. Concept Map Management with Supabase**
- [ ] **`concept_maps` Table:** (User needs to create + RLS).
- [x] **`conceptMapService.ts` Refactor:** (Complete: All concept map service functions use Supabase).
- [x] **Connect frontend concept map UI (student, editor) to live API (with Supabase service).** (Complete)

**5. Project Submission & Analysis with Supabase**
- [ ] **`project_submissions` Table:** (User needs to create + RLS, and add `file_storage_path TEXT NULLABLE` column).
- [ ] **Supabase Storage Setup:** (User needs to create bucket `project_archives` + RLS that allows authenticated users to upload to path `user-&lt;user_id&gt;/*`).
- [x] **`projectSubmissionService.ts` Refactor:** (Complete: All submission service functions use Supabase, including `fileStoragePath`).
- [x] **Connect frontend project submission UI to live API (for metadata, actual file upload to Supabase Storage, AI trigger with real storage path and user goals, linking map using Supabase service).** (Complete)
- [ ] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
    - [ ] Modify flow to fetch project file from Supabase Storage (User to implement when `projectStructureAnalyzerTool` is made real).
    - [x] On successful map generation: Save map and link submission via Supabase services. (Done)

**6. API Route Refactoring (General Review for Supabase)**
- [x] Review all existing API routes in `src/app/api/`. (Done for users, classrooms, conceptmaps, submissions, admin settings, user password change).
- [x] Refactor each route to use Supabase-powered service functions. (Done)
- [ ] Implement proper Supabase session/JWT authentication and authorization checks in API routes. (Partially done for password change and admin settings. Others rely on service logic or need explicit auth checks by user, RLS is primary).

**7. Frontend Connection to Supabase Backend (General Review)**
- [x] For each page/component currently fetching data via API routes:
    - [x] Ensure API routes are correctly calling Supabase services. (Done for dashboard counts, classroom lists, user lists, concept map list, submission list, admin settings page for Admin, Teacher, Student.)
    - [x] Update error handling and loading states to reflect real asynchronous operations. (Largely done.)

## Testing & Deployment (Future - Out of Scope for AI Agent Implementation)
- [ ] **Testing:**
    - [ ] Write unit tests for critical components and utility functions.
    - [ ] Implement integration tests for user flows with Supabase.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline (e.g., GitHub Actions for Supabase migrations and Next.js deployment).
    - [ ] Configure production environment for Next.js and Supabase.

## Known Issues / Current State
- Backend services largely migrated from mock to Supabase (users, classrooms, concept_maps, project_submissions, system_settings).
- AuthContext migrated to Supabase Auth. User profile data fetched from Supabase `profiles` table. Mock admin/student login via form preserved for testing.
- Data persistence for all entities handled by Supabase (requires user to set up tables &amp; RLS).
- Concept map canvas is React Flow. Undo/Redo implemented with `zundo`.
- AI for project analysis uses mock project structure (`projectStructureAnalyzerTool`); needs real file uploads and tool logic.
- Supabase client library installed and configured. User needs to run typegen for `src/types/supabase.ts`.
- For public registration via `AuthContext -&gt; supabase.auth.signUp()`, a Supabase Function trigger (or similar mechanism) is needed by the user to create the corresponding `profiles` table entry automatically.
- API routes rely on Supabase-backed services. Further auth checks (JWT verification, role-based access) for API routes might be needed based on specific security requirements. RLS in Supabase is the primary data access control.
- Client-side file upload for project analysis now uploads to Supabase Storage (bucket 'project_archives', path `user-&lt;user_id&gt;/&lt;timestamp&gt;-&lt;filename&gt;`).
- User needs to create the 'project_archives' bucket and add `file_storage_path TEXT NULLABLE` to `project_submissions` table, and set up RLS for the bucket.
- Mock admin/student user profiles cannot be edited or passwords changed via the UI to prevent breaking the mock login flow. Real accounts created via Supabase registration can.
- Dragging nodes and creating connections in the concept map editor should now be working correctly. If issues persist, further investigation into React Flow event handling or CSS conflicts might be needed.
