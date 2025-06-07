
# CodeMap TODO List

## Core Functionality & Backend Integration
- [x] **User Authentication (Backend):**
    - [x] Refactor API routes (`/login`, `/register`) - Deprecated, handled by Supabase client.
    - [x] Connect frontend `AuthContext` to live API (with Supabase service).
    - [x] Remove old mock user data and local storage logic for user object session (Supabase handles its own session).
    - [x] Implement Supabase Auth for user login, registration, logout.
    - [x] Ensure profile data is fetched/created in `profiles` table (via `userService` in `AuthContext`).
- [x] **Database & Models:** (Services now use Supabase)
    - [x] Set up database (PostgreSQL via Supabase). (User to set up Supabase tables & RLS).
    - [x] Define and implement database schemas for Users, Classrooms, ConceptMaps, ProjectSubmissions, etc. (User to implement in Supabase; types defined in `src/types/supabase.ts` (placeholder) and `src/types/index.ts`).
    - [x] Create ORM/ODM layer (Replaced with Supabase client in services).
- [x] **Classroom Management (Backend & Frontend Integration):**
    - [x] Create `classroomService.ts` with Supabase data management.
    - [x] API endpoint for creating classrooms (`POST /api/classrooms`).
    - [x] API endpoint for listing classrooms by teacher (`GET /api/classrooms?teacherId=xxx`). (Supports pagination & search)
    - [x] API endpoint for listing classrooms by student (`GET /api/classrooms?studentId=xxx`).
    - [x] API endpoint for getting classroom details (`GET /api/classrooms/[classroomId]`). (Includes student list)
    - [x] API endpoints for student enrollment.
        - [x] API endpoint for adding a student to a classroom (`POST /api/classrooms/[classroomId]/students`). (Adds by ID)
        - [x] API endpoint for removing a student from a classroom (`DELETE /api/classrooms/[classroomId]/students/[studentId]`).
    - [x] API endpoints for updating, deleting classrooms (`PUT /api/classrooms/[classroomId]`, `DELETE /api/classrooms/[classroomId]`).
    - [x] Connect frontend classroom creation and listing UI (teacher) to live API (with Supabase service). (Modularized with `ClassroomListItem` and `EditClassroomDialog`)
    - [x] Connect frontend classroom listing UI (student) to live API (with Supabase service). (Modularized with `ClassroomListItem`)
    - [x] Connect frontend classroom list UI for edit/delete actions (Teacher) to live API (with Supabase service).
    - [x] Connect frontend classroom detail UI (teacher) to live API for details and student management. (Modularized with tab components: `ClassroomStudentsTab`, `ClassroomMapsTab`, `ClassroomSubmissionsTab`)
    - [x] Connect frontend student classroom detail UI to live API for viewing classroom info and shared maps.
- [x] **Concept Map Service (Backend & Frontend Integration):**
    - [x] Create `conceptMapService.ts` with Supabase data management.
    - [x] API endpoints for CRUD operations on concept maps (`/api/concept-maps`, `/api/concept-maps/[mapId]`).
    - [x] API endpoint for listing concept maps by classroom (`GET /api/concept-maps?classroomId=xxx`).
    - [x] Logic for map ownership and sharing (with classrooms, public) - Implemented in Supabase service.
    - [x] Connect frontend concept map listing (student) to live API for loading/deleting. (Modularized with `ConceptMapListItem`)
    - [x] Connect frontend concept map editor to live API for saving/loading new and existing maps. (Modularized with `useConceptMapDataManager` hook)
- [x] **Project Submission & Analysis (Backend & Frontend Integration):**
    - [x] Create `projectSubmissionService.ts` with Supabase data management (now includes `fileStoragePath`).
    - [x] API endpoint for project file uploads (`POST /api/projects/submissions` - now handles `fileStoragePath` for metadata).
    - [x] API endpoint for listing student submissions (`GET /api/projects/submissions?studentId=xxx`).
    - [x] API endpoint for listing submissions by classroom (`GET /api/projects/submissions?classroomId=xxx`).
    - [x] API endpoint for getting submission details (`GET /api/projects/submissions/[submissionId]`).
    - [x] API endpoint for updating submission status (`PUT /api/projects/submissions/[submissionId]`).
    - [x] File storage integration (Supabase Storage). (User needs to create 'project_archives' bucket and configure RLS policies). Client-side upload implemented in `ProjectUploadForm` using `useSupabaseStorageUpload` hook.
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.). (Out of Scope for current iteration).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue. (Out of Scope for current iteration).
        - [ ] File downloader/unpacker from Supabase storage for AI tool. (Mocked by `projectStructureAnalyzerTool`; real processing is user's responsibility within the tool).
        - [x] Code/Structure Parser Engine (AI-based: Genkit flow `generateMapFromProject` serves as the core engine. `projectStructureAnalyzerTool` is mock, now accepts storage path and user goals, and special hints for predefined mock outputs).
        - [x] LLM-Powered Structure-to-Map Converter (integrates with Genkit/Gemini, parses output, creates new ConceptMap record via Supabase service - handled in `ProjectUploadForm` flow after AI tool returns).
        - [x] Map Data Formatter & Persister (saves generated map via Supabase service, updates submission status with real map ID - handled in `ProjectUploadForm` flow).
    - [x] Connect frontend project submission UI to live API (for metadata, client-side upload to Supabase Storage, AI trigger with real storage path and user goals, linking map using Supabase service - handled in `ProjectUploadForm`).
    - [x] Connect frontend student submissions list to live API. (Modularized with `SubmissionListItem` and `useSubmissionStatusPoller` hook).
    - [x] Connect frontend Admin Dashboard to fetch user & classroom counts dynamically with individual loading/error states (using `useAdminDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Connect frontend Student Dashboard to fetch classroom, map & submission counts dynamically with individual loading/error states (using `useStudentDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Connect frontend Teacher Dashboard to fetch classroom & student counts dynamically with individual loading/error states (using `useTeacherDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Ensure navigation paths are consistent (e.g. `/application/...` prefix).

## Frontend Enhancements

### Whimsical-Inspired Editor UX Enhancements
- [x] **Node Data Structure:**
    - [x] `parentNode` field added to `ConceptMapNode` type for hierarchy (used by React Flow).
    - [ ] (Advanced) Consider explicit `childIds` in `ConceptMapNode` state if needed for advanced custom layouts beyond React Flow's `parentNode` grouping.
- [x] **Floating Node Creation**:
    - [x] Implement double-click on canvas to create a new node at mouse position.
    - [x] New node is selected.
- [x] **Child Node Creation via "+" Hover Buttons**:
    - [x] Display "+" icons on node hover (top, right, bottom, left).
    - [x] Clicking "+" adds a new child node in that direction, automatically connects it, sets `parentNode`.
    - [x] New child node is selected.
- [x] **Keyboard-driven Node Creation**:
    - [x] Selected Node + `Tab` key: Create child node, auto-position, connect, set `parentNode`. New node is selected.
    - [x] Selected Node + `Enter` key: Create sibling node (at the same level as selected), auto-position. New node is selected.
- [x] **Auto-focus for New Nodes**:
    - [x] New nodes created via double-click, "+ hover buttons", or keyboard shortcuts (`Tab`/`Enter`) automatically enter label edit mode.
- [x] **Hierarchical Node Movement**:
    - [x] Ensure dragging a parent node correctly moves all its descendants while maintaining relative positions (Leveraging React Flow's `parentNode` feature - Verified).
    - [x] Recursive deletion of child nodes when parent is deleted.
- [ ] **Improved Connector Experience**:
    - [x] Custom Edge Type (`OrthogonalEdge.tsx`): Basic setup using `getSmoothStepPath` with `borderRadius:0` for step-like lines with sharp corners.
    - [ ] (Advanced) Refine `OrthogonalEdge.tsx` path calculation for more robust true orthogonal routing:
        - [ ] Investigate/Implement simple Manhattan routing algorithm (or similar) for `OrthogonalEdge`.
        - [ ] Ensure lines exit handles straight for a short distance before turning.
        - [ ] (Highly Advanced) Add logic to avoid path overlaps with other nodes.
- [x] **Edge Style Editing**:
    - [x] Allow modifying edge label directly on canvas (double-click).
    - [x] Allow modifying edge label, color, line type (solid, dashed) from `PropertiesInspector`.
    - [x] Allow modifying arrow styles (start/end: none, arrow, arrowclosed) from `PropertiesInspector`.
- [ ] **Snapping Guides**:
    - [x] Basic center-to-center snapping implemented with visual guides.
    - [x] Add snapping to node edges (top, bottom, left, right alignment).
    - [x] Implement visual guides for edge snapping.
    - [x] Consider snap-to-grid functionality. (Implemented)
- [x] **Node Auto-Sizing**: Ensure custom nodes dynamically adjust size based on content (text length, details), within reasonable min/max bounds.
- [ ] **Refined Pan & Zoom**:
    - [ ] Verify/enhance pan/zoom interactions if default React Flow behavior needs tweaking.
    - [ ] Consider adding modifier key for pan (e.g., Spacebar + drag).

### Key Concept Map Editor Components & Functionality (Highly Modularized)
- [x] **`EditorToolbar`**: Provides UI for Save, Add Node, Add Edge. GenAI tools (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) open respective modals. "New Map" and "Export Map" always enabled. "Add Edge" disabled if <2 nodes. Undo/Redo buttons added. Toggle for AI Panel and Properties Inspector.
- [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles. Managed by `FlowCanvasCore`. Visual grid background added.
- [x] **`PropertiesInspector`**: Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type for nodes; label, color, lineType, markerStart, markerEnd for edges) properties. Changes update Zustand store and are saved via toolbar. View-only mode implemented. Toggleable via Sheet.
    - [x] Granular Node Style Editing: Allow modifying individual node background color, shape (rectangle, ellipse) from `PropertiesInspector`.
- [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `QuickClusterModal`, `AskQuestionModal`, `GenerateSnippetModal`, `RewriteNodeContentModal` to interact with AI flows. Context menu now correctly opens these. Logic managed by `useConceptMapAITools`.
- [x] **`AISuggestionPanel`**: Area (toggleable Sheet) displaying AI suggestions (primarily for Extract Concepts, Suggest Relations) with "Add to Map" functionality. Suggestions persist, update status, can be edited before adding, removed after adding. Integration logic handled by `useConceptMapAITools`. "Expand Concept" feature now adds nodes directly to the map, bypassing this panel.
- [x] **Zustand Store (`concept-map-store.ts`)**: Manages client-side state for the concept map editor, including map data, selections, AI suggestions, and UI states. Undo/Redo history implemented with `zundo`. `parentNode` added to node structure. `aiProcessingNodeId` added for node-specific AI loading state.
- [x] **Custom Hooks:** `useConceptMapDataManager` (for load/save logic) and `useConceptMapAITools` (for AI modal management and integration) significantly modularize editor logic. `getNodePlacement` utility from `src/lib/layout-utils.ts` used for node placement and supports grid snapping.

### State Management & UI/UX
- [x] **State Management:** Implement a robust client-side state management solution (Zustand for Concept Map Editor, `zundo` for history). Context API for Auth.
- [ ] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using Supabase Realtime) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling in `SubmissionListItem` via `useSubmissionStatusPoller` hook).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design. (Extensive modularization with reusable components like `DashboardHeader`, `DashboardLinkCard`, `EmptyState`, `ClassroomListItem`, `ConceptMapListItem`, `QuickActionsCard`, extracted dialogs). Standardized `DashboardLinkCard` description height.
    - [x] Add more comprehensive loading states and error handling (Done for many list pages, dashboards, and API interactions with Supabase, often managed by custom hooks).
    - [x] Enhance empty states for lists (Largely done with `EmptyState` component and specific icons. Verified and improved for Teacher Classroom Detail tabs).
    - [x] Implement user profile page and settings (Profile page created, edit name/email working. Change password functionality using Supabase Auth implemented. Dialogs extracted: `EditProfileDialog`, `ChangePasswordDialog`).
    - [x] Add pagination and filtering for lists (Admin User Management and Teacher classrooms pages have pagination and filtering with Supabase).
    - [x] Add loading spinner to Login/Register pages. (Verified, already implemented).
    - [x] Make header icons link to main dashboards. (Implemented for `DashboardHeader` icons and `Navbar` logo).
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode.
    - [x] Implement change password functionality on profile page (uses Supabase Auth via API).
    - [x] Developer/Testing: Role switcher on Profile page for testing (local context update).
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination and filtering, delete, edit profile connected to Supabase; add user via register flow. `EditUserDialog` extracted).
    - [x] Develop system settings interface (Admin Settings page fetches/saves to Supabase via API).

## GenAI & AI Features - In-Editor Enhancements (Whimsical-Inspired)
- [x] **File Upload UI Adaptation for Project Analysis**:
    - [x] Add `userGoals` input to `ProjectUploadForm`.
    - [x] Use `AlertDialog` to confirm AI analysis post-submission record creation.
    - [x] REMOVED: Developer test buttons ("Dev: AI Map (Hint-Based Mock)", "Dev: AI Map (Fixed Mock Project)") from `ProjectUploadForm` for UI simplification. Genkit dev UI or unit tests can be used for direct flow testing.
- [x] **API Endpoint & Backend Processing Pipeline for Project Analysis**:
    - [x] `ProjectSubmission` type and service now handle `fileStoragePath`.
    - [x] Submission API route `POST /api/projects/submissions` now accepts `fileStoragePath`.
    - [x] Frontend calls `generateMapFromProject` after user confirmation, passing `fileStoragePath` and `userGoals`.
    - [x] Frontend handles saving the generated map (via API) and updating submission status (within `ProjectUploadForm` and `useConceptMapAITools` for other AI-generated maps).
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`)**:
    - [x] Input schema updated to `projectStoragePath` and `userHint`.
    - [x] Mock logic acknowledges these inputs and varies output based on hint (e.g., "e-commerce", "data pipeline").
    - [x] Mock logic supports a special hint (`_USE_FIXED_MOCK_PROJECT_A_`) to return a predefined, detailed project analysis object.
- [x] **Modify `generateMapFromProject` Genkit Flow for Tool Use**:
    - [x] Input schema updated to `projectStoragePath` and `userGoals`.
    - [x] Prompt explicitly instructs use of `projectStructureAnalyzerTool` with these inputs.
- [x] **Output Handling & User Interaction for Project Analysis**:
    - [x] Submission process creates a new `ConceptMap` record from AI output.
    - [x] Submission status updated to `COMPLETED` or `FAILED` with map ID or error.
    - [x] Submission list item links to the generated map.
- [x] **Improve Core AI-Powered Concept Mapping Tools (Whimsical-Inspired Focus):**
    - [x] **Canvas-Integrated AI Brainstorming & Expansion:**
        - [x] **Context Menu AI Actions:** Expand, Suggest Relations, Extract Concepts, Ask AI Question, Rewrite Content on node context menus (handled by `useConceptMapAITools` and `NodeContextMenu`).
        - [x] **"Quick AI Node/Cluster" on Canvas:** Implemented via Toolbar Modal (`QuickClusterModal`, managed by `useConceptMapAITools`). Generates nodes/edges directly on map.
        - [x] **AI for Structuring Text into Map Snippets:** Implemented `GenerateSnippetModal` and flow (managed by `useConceptMapAITools`). Generates nodes/edges directly on map.
    - [x] **Enhanced Context for In-Editor AI Tools:** (Context gathering for modals from selected nodes/neighbors is implemented in `useConceptMapAITools`)
        - [x] **`extractConcepts` Context:** From selected node(s) text/details. Populates `AISuggestionPanel`.
        - [x] **`suggestRelations` Context:** Uses multiple selected nodes or a node and its neighbors. Populates `AISuggestionPanel`.
        - [x] **`expandConcept` Context:** Uses selected node and its neighbors.
    - [x] **Refine "Expand Concept" Interaction:**
        - [x] Direct child node generation from an "Expand" action (new nodes automatically appear around the source node, with relation labels). This is now the default for "Expand Concept".
        - [x] Option C: Allow user to refine prompts for "Expand Concept" within their respective modals.
        - [x] (Note: `AISuggestionPanel` population for "Expand Concept" was removed in favor of direct node addition.)
    - [x] **Implement "Summarize Selected Nodes (AI)" Feature:**
        - [x] Trigger: Toolbar button when multiple nodes are selected.
        - [x] Creates Genkit flow (`summarizeNodesFlow`) and a new `ai-summary-node` directly on the map.
    - [x] **Implement "Rewrite Node Content (AI) / Change Tone" Feature:**
        - [x] Trigger: Context menu on a node.
        - [x] Uses `RewriteNodeContentModal` for tone selection and preview.
        - [x] Creates Genkit flow (`rewriteNodeContentFlow`). Updates node content and type to `ai-rewritten-node` directly on the map.
    - [ ] **Alternative GAI Trigger Points (Future Consideration):**
        - [ ] Implement floating "AI Expand" button (or similar quick action) on selected node hover.
        - [ ] Explore slash commands (`/ai ...`) in node text editor for GAI actions.
        - [ ] Consider a global AI input box/panel on the canvas for broader queries/commands.
    - [x] **GAI Action Feedback**:
        - [x] Visual cues for AI-generated/modified nodes (type, icon).
        - [x] Implement loading state/spinner directly on/near a node when a GAI action is triggered from its context menu or future floating buttons.
    - [ ] **(Advanced - Future) Explore "AI Structure Suggestions":**
        - [ ] Develop Genkit flow to analyze map structure & content.
        - [ ] Define criteria for "good" structure suggestions (e.g., grouping related ideas, suggesting missing links).
        - [ ] Design UI for presenting structure suggestions (e.g., non-intrusive hints on canvas or in AI panel).
        - [ ] Implement user actions to accept/reject suggestions.
    - [x] **Iterate on GenAI Prompts for Quality & Relevance:** (Prompts refined for core tools, an ongoing process).
- [x] **Refine `AISuggestionPanel` Workflow & User Experience:**
    - [x] **Workflow Review**: Suggestions (Extract Concepts, Suggest Relations) persist, update status, removed from panel after adding to map. "Expand Concept" no longer populates this panel.
    - [x] **Visual Feedback on "Add to Map"**: Items persist, status updates.
    - [x] **Smart Placement for Panel-Added Nodes**: Basic logic implemented in `useConceptMapAITools`.
    - [x] **Selective Addition**: "Add Selected" and "Add All New/Similar" implemented.
    - [x] **Edit Before Adding**: Suggestions can be edited.
    - [x] **Clearer Visual Cues**: Differentiates existing/similar suggestions.
    - [x] **Panel Styling and Usability**: Improved layout, cards. (Sheet used for panel).
    - [x] **Toggleable Panel**: Panel is toggleable sheet.
- [x] **Improve General AI User Experience (UX) for In-Editor Tools:**
    - [x] **Tooltips & In-UI Guidance**: Modals updated, tooltips present.
    - [x] **Loading & Feedback**: Consistent loading indicators, clearer error messages for AI modals. (Node-specific loading added for context menu actions).
    - [x] **Visual Cues for AI-Generated Content:**
        - [x] Ensured AI-generated nodes (from panel, direct generation like "Summarize", "Rewrite", or "Expand Concept") have distinct visual styles and icons via `CustomNodeComponent`.
        - [x] Defined specific node types (`ai-summary-node`, `ai-rewritten-node`, `ai-expanded` for generated children, `ai-concept` from panel, `text-derived-concept`, `ai-generated`) and mapped them to styles/icons.

## Performance Optimizations
- [ ] **Rendering:**
    - [ ] **Virtualization (Occlusion Culling):**
        - [ ] Investigate React Flow built-in virtualization/occlusion culling for large maps.
        - [ ] If needed, implement custom occlusion culling for nodes/edges outside viewport.
    - [ ] **Layered Rendering:** Consider separating static elements (like complex backgrounds or many edges) from interactive elements (nodes) if performance degrades with many edges.
- [ ] **Interactions:**
    - [ ] **Event Throttling/Debouncing:**
        - [x] Verify React Flow's internal event handling for drag/zoom for common scenarios. (Basic node drag snapping logic is now in place, needs monitoring for complex maps).
        - [ ] If custom heavy interactions are added (e.g., complex snapping calculations beyond current), implement throttling/debouncing for them.
- [ ] **Data Handling & General:**
    - [ ] **Image Optimization:** Review and optimize image usage: Ensure all important images use `next/image` with `width` and `height` props. Replace generic `<img>` tags or add placeholders for `next/image` where appropriate.
    - [ ] **Large List Rendering:** For pages like Admin User Management or long classroom student lists, evaluate if virtualization techniques (e.g., `react-window` or `tanstack-virtual`) are needed as data scales.
    - [ ] **React Component Memoization:** Systematically review components, especially children of frequently re-rendering parents that receive stable props, and apply `React.memo`, `useCallback`, and `useMemo` where beneficial. (Some already done, can be an ongoing process).
    - [x] **Code Splitting:** Use `next/dynamic` for heavy components or libraries not needed on initial load (already done for `FlowCanvasCore`, review for others).
    - [ ] **Bundle Size Analysis:** Periodically analyze the application bundle size and identify areas for reduction.

## Supabase Backend Integration (All core services and auth are migrated)
This section outlines tasks to fully migrate to Supabase.
**1. Supabase Setup & Initial Configuration**
- [x] **Project Setup:** (User Task)
- [x] **Client Library & Config:** (`src/lib/supabaseClient.ts` and `.env` setup done).
- [x] **Database Schema Design (User Task):** (User needs to implement in Supabase: `profiles`, `classrooms`, `classroom_students`, `concept_maps`, `project_submissions` (add `file_storage_path TEXT NULLABLE`), `system_settings` and RLS policies).
- [x] **Database Migrations:** (User to handle CLI setup and SQL scripts. `src/types/supabase.ts` needs generation by user).

**2. User Authentication & Profiles with Supabase Auth**
- [x] **Users (`profiles`) Table:** (User needs to create this in their Supabase project + RLS).
- [x] **`AuthContext` Refactor:** (Complete: Supabase login, register, logout, session, profile fetching & creation, respects BYPASS_AUTH_FOR_TESTING).
- [x] **`userService.ts` Refactor:** (Complete: All user service functions use Supabase, respects BYPASS_AUTH_FOR_TESTING).
- [x] **API Routes (`/api/auth/*`) Review/Refactor:** (Marked deprecated).

**3. Classroom Management with Supabase**
- [x] **`classrooms` Table:** (User needs to create + RLS).
- [x] **`classroom_students` Table (Junction):** (User needs to create + RLS).
- [x] **`classroomService.ts` Refactor:** (Complete: All classroom service functions use Supabase, respects BYPASS_AUTH_FOR_TESTING).
- [x] **Connect frontend classroom UI (teacher, student) to live API (with Supabase service).**

**4. Concept Map Management with Supabase**
- [x] **`concept_maps` Table:** (User needs to create + RLS).
- [x] **`conceptMapService.ts` Refactor:** (Complete: All concept map service functions use Supabase, respects BYPASS_AUTH_FOR_TESTING).
- [x] **Connect frontend concept map UI (student, editor) to live API (with Supabase service).**

**5. Project Submission & Analysis with Supabase**
- [x] **`project_submissions` Table:** (User needs to create + RLS, and add `file_storage_path TEXT NULLABLE` column).
- [x] **Supabase Storage Setup:** (User needs to create bucket `project_archives` + RLS that allows authenticated users to upload to path `user-<user_id>/*`).
- [x] **`projectSubmissionService.ts` Refactor:** (Complete: All submission service functions use Supabase, respects BYPASS_AUTH_FOR_TESTING, including `fileStoragePath`).
- [x] **Connect frontend project submission UI to live API (for metadata, actual file upload to Supabase Storage, AI trigger with real storage path and user goals, linking map using Supabase service).** (Complete via `ProjectUploadForm` and `useSupabaseStorageUpload` hook).
- [x] **Connect frontend student submissions list to live API.**
- [ ] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
    - [ ] Modify `projectStructureAnalyzerTool` to fetch project file from Supabase Storage and perform real analysis. (User to implement if desired, currently mock).
    - [x] On successful map generation: Save map and link submission via Supabase services. (Done in `ProjectUploadForm` flow).

**6. API Route Refactoring (General Review for Supabase)**
- [x] Review all existing API routes in `src/app/api/`. (Done for users, classrooms, conceptmaps, submissions, admin settings, user password change).
- [x] Refactor each route to use Supabase-powered service functions. (Done)
- [x] Implement Supabase session/JWT authentication and authorization checks in API routes where necessary. (Partially done for password change and admin settings. Others rely on service logic or RLS is primary).

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
    - [ ] Set up CI/CD pipeline.
    - [ ] Configure production environment for Next.js and Supabase.

## Known Issues / Current State
- Backend services fully migrated to Supabase (users, classrooms, concept_maps, project_submissions, system_settings). User must set up tables and RLS policies. Services respect `BYPASS_AUTH_FOR_TESTING` and return mock data.
- AuthContext migrated to Supabase Auth. User profile data fetched/created in Supabase `profiles` table. Respects `BYPASS_AUTH_FOR_TESTING`.
- Concept map canvas is React Flow. Undo/Redo implemented with `zundo`. Editor logic highly modularized with custom hooks.
- **Whimsical-style interactions implemented:** Floating node creation (double-click), child node creation via "+" hover buttons, keyboard-driven node creation (Tab/Enter), auto-focus for new nodes, hierarchical node movement (via React Flow `parentNode`), recursive deletion of children.
- **Snapping implemented:** Basic center-to-center and edge-to-edge node snapping with visual guides. Snap-to-grid implemented for node creation and dragging (node-to-node takes precedence). Visual grid background added.
- Custom edge type `OrthogonalEdge` implemented, using `getSmoothStepPath` with `borderRadius:0` for step-like lines. Edge label, color, line type, and start/end arrow styles are editable via PropertiesInspector and direct label edit on canvas.
- **Node Style Customization:** Individual node background color and shape (rectangle/ellipse) are editable via PropertiesInspector. Nodes auto-size based on content (label wrapping, details contributing to height, dynamic width up to a max).
- **GAI Action Feedback**: Loading spinner added to nodes when AI operations are triggered via context menu.
- AI for project analysis uses mock project structure (`projectStructureAnalyzerTool`); needs real file processing from Supabase Storage by the user if desired. `projectStructureAnalyzerTool` mock logic has been enhanced for varied outputs based on hints and a fixed mock project structure.
- Supabase client library installed and configured. User needs to run typegen for `src/types/supabase.ts`.
- API routes rely on Supabase-backed services. RLS in Supabase is the primary data access control.
- Client-side file upload for project analysis uploads to Supabase Storage (bucket 'project_archives').
- Admin User Management page and Profile Page are connected to Supabase for CRUD and password changes.
- Dashboard counts are fetched from Supabase-backed APIs using custom hooks, which also respect `BYPASS_AUTH_FOR_TESTING`.
- Classroom management, Concept Map management, and Student Submissions list are connected to Supabase and use modular components.
- The application is highly modular, with reusable components for UI patterns, custom hooks for complex logic, and service layers for backend interaction.
- Core in-editor AI features (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) are implemented with specific visual cues for AI-generated/modified nodes. "Expand Concept", "Summarize Selection", and "Rewrite Content" now directly add/modify content on the map.
- View-only mode for concept map editor is implemented.
- Developer role switcher added to profile page for easier testing.
- Developer test buttons previously on Project Upload Form have been removed for simplicity.
- `AISuggestionPanel` no longer handles "Expand Concept" results; primarily for "Extract Concepts" and "Suggest Relations".

This covers a very large portion of the Supabase integration tasks and modularization. The application is now significantly more robust, data-driven, and maintainable.
The main remaining area for full Supabase connection is:
*   Making the `projectStructureAnalyzerTool` actually process files from Supabase Storage (currently out of scope for me to implement the actual file parsing logic).
*   Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
*   Thorough testing and deployment preparations (out of scope).
