**Note:** This is the primary TODO list. The duplicate file `src/TODO.md` has been marked as obsolete (emptied) and can be removed from version control.

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
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.). (Out of Scope).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue. (Out of Scope).
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
- [x] **Key Concept Map Editor Components & Functionality (Highly Modularized):**
    - [x] **`EditorToolbar`**: Provides UI for Save, Add Node, Add Edge. GenAI tools (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) open respective modals. "New Map" and "Export Map" always enabled. "Add Edge" disabled if <2 nodes. Undo/Redo buttons added. Toggle for AI Panel and Properties Inspector.
    - [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles. Managed by `FlowCanvasCore`.
    - [x] **`PropertiesInspector`**: Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type) properties. Changes update Zustand store and are saved via toolbar. View-only mode implemented. Toggleable via Sheet.
    - [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `QuickClusterModal`, `AskQuestionModal`, `GenerateSnippetModal`, `RewriteNodeContentModal` to interact with AI flows. Context menu now correctly opens these. Logic managed by `useConceptMapAITools`.
    - [x] **`AISuggestionPanel`**: Area (toggleable Sheet) displaying AI suggestions with "Add to Map" functionality. Suggestions persist, update status, can be edited before adding, removed after adding. Integration logic handled by `useConceptMapAITools`. "Expand Concept" feature now adds nodes directly to the map, bypassing this panel.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages client-side state for the concept map editor, including map data, selections, AI suggestions, and UI states. Undo/Redo history implemented with `zundo`.
    - [x] **Custom Hooks:** `useConceptMapDataManager` (for load/save logic) and `useConceptMapAITools` (for AI modal management and integration) significantly modularize editor logic.
- [ ] ### Component Refinements
    - [ ] **`custom-node.tsx` Refinement:**
        - [x] Review `getNodeRect` function (currently commented out): confirm if it's still needed for any toolbar/element positioning logic or if it can be safely removed.
- [x] **State Management:**
    - [x] Implement a robust client-side state management solution (Zustand for Concept Map Editor, `zundo` for history). Context API for Auth.
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
    - [x] REMOVED: "Dev: Quick AI Map Gen (Mock Project)" and "Test AI Map (Fixed Mock Project)" buttons from `ProjectUploadForm` as they were causing confusion. Direct testing of AI flows can be done via Genkit dev UI or unit tests if needed.
- [x] **API Endpoint & Backend Processing Pipeline for Project Analysis**:
    - [x] `ProjectSubmission` type and service now handle `fileStoragePath`.
    - [x] Submission API route `POST /api/projects/submissions` now accepts `fileStoragePath`.
    - [x] Frontend calls `generateMapFromProject` after user confirmation, passing `fileStoragePath` and `userGoals`.
    - [x] Frontend handles saving the generated map (via API) and updating submission status (within `ProjectUploadForm` and `useConceptMapAITools` for other AI-generated maps).
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`)**:
    - [x] Input schema updated to `projectStoragePath` and `userHint`.
    - [x] Mock logic acknowledges inputs and varies output based on hints (e.g., "e-commerce", "data pipeline", basic "node" `package.json` parsing).
    - [x] Mock logic supports a `_USE_FIXED_MOCK_PROJECT_A_` hint for a predefined detailed static analysis.
    - [x] Mock logic supports a `_USE_SIMULATED_FS_NODE_PROJECT_` hint for a richer Node.js project simulation (includes conceptual `package.json`, `README.md`, `.js` files, `config/settings.json`; basic content extraction).
    - [x] Mock logic supports a `_USE_SIMULATED_FS_PY_PROJECT_` hint for a richer Python project simulation (includes conceptual `.py` files, `requirements.txt`, `README.md`; basic content extraction).
    - [x] Mock logic supports a `_USE_SIMULATED_FS_JAVA_PROJECT_` hint for a richer Java (Maven/Spring Boot) project simulation (includes conceptual `pom.xml`, `.java` files in packages, `README.md`; basic content extraction).
    - [x] Mock logic now also supports a `_USE_SIMULATED_FS_CSHARP_PROJECT_` hint for a richer C# (ASP.NET Core) project simulation (includes conceptual `.csproj`, `appsettings.json`, `.cs` files in namespaces, `README.md`; basic content extraction like dependencies, classes, methods, properties, usings). (Note: All File System (FS) simulations are still mocks with no real file system operations or Supabase Storage integration).
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
        - [x] **"Quick AI Node/Cluster" on Canvas:** Implemented via Toolbar Modal (`QuickClusterModal`, managed by `useConceptMapAITools`).
        - [x] **AI for Structuring Text into Map Snippets:** Implemented `GenerateSnippetModal` and flow (managed by `useConceptMapAITools`).
    - [x] **Enhanced Context for In-Editor AI Tools:** (Context gathering for modals from selected nodes/neighbors is implemented in `useConceptMapAITools`)
        - [x] **`extractConcepts` Context:** From selected node(s) text/details.
        - [x] **`suggestRelations` Context:** Uses multiple selected nodes or a node and its neighbors.
        - [x] **`expandConcept` Context:** Uses selected node and its neighbors.
    - [x] **Refine "Generate Ideas" / "Expand Concept" Interaction:**
        - [x] Option A: Direct child node generation from an "Expand" or "Generate Ideas" action (new nodes automatically appear around the source node, with relation labels).
        - [x] Option C: Allow user to refine prompts for "Generate Ideas" / "Expand Concept" within their respective modals.
        - (Note: AISuggestionPanel population for "Expand Concept" was removed in favor of direct node addition.)
    - [x] **Implement "Summarize Selected Nodes (AI)" Feature:**
        - [x] Trigger: Toolbar button when multiple nodes are selected.
        - [x] Creates Genkit flow (`summarizeNodesFlow`) and a new `ai-summary-node`.
    - [x] **Implement "Rewrite Node Content (AI) / Change Tone" Feature:**
        - [x] Trigger: Context menu on a node.
        - [x] Uses `RewriteNodeContentModal` for tone selection and preview.
        - [x] Creates Genkit flow (`rewriteNodeContentFlow`). Updates node content and type to `ai-rewritten-node`.
    - [ ] **(Advanced - Future) Explore "AI Structure Suggestions":**
        - [ ] Analyze map structure and content to propose new connections or organizational improvements (e.g., "These 3 nodes seem related, would you like to group them?" or "Consider linking Node A to Node B because...").
    - [x] **Iterate on GenAI Prompts for Quality & Relevance:** (Prompts refined for core tools, an ongoing process).
- [x] **Refine `AISuggestionPanel` Workflow & User Experience:**
    - [x] **Workflow Review**: Suggestions persist, update status, removed from panel after adding to map. "Expand Concept" no longer populates this panel.
    - [x] **Visual Feedback on "Add to Map"**: Items persist, status updates.
    - [x] **Smart Placement for Panel-Added Nodes**: Basic logic implemented in `useConceptMapAITools`.
    - [x] **Selective Addition**: "Add Selected" and "Add All New/Similar" implemented.
    - [x] **Edit Before Adding**: Suggestions can be edited.
    - [x] **Clearer Visual Cues**: Differentiates existing/similar suggestions.
    - [x] **Panel Styling and Usability**: Improved layout, cards. (Sheet used for panel).
    - [x] **Toggleable Panel**: Panel is toggleable sheet.
- [x] **Improve General AI User Experience (UX) for In-Editor Tools:**
    - [x] **Tooltips & In-UI Guidance**: Modals updated, tooltips present.
    - [x] **Loading & Feedback**: Consistent loading indicators, clearer error messages for AI modals.

## GAI Concept Map Refactoring (Whimsical-Inspired Enhancements II)
### Enhanced In-Canvas AI Interactions
- [x] "AI Quick-Add" / Floating AI Suggestions:
    - [x] On empty canvas right-click: Suggest common starting points or nodes based on recent activity. (Done via Floater)
    - [x] Interaction: Clicking a suggestion triggers AI action or adds node. Dismissed on mouse out or Esc. (Done via Floater)
    - [x] On node selection/right-click: Floater currently shows *actions*. Enhance to also show temporary "ghost" nodes/suggestion *chips for direct content addition* (e.g., "Child: [AI suggested text]").
- [x] "AI Contextual Mini-Toolbar" on Node Hover/Selection:
    - [x] Display a small, floating toolbar near selected/hovered node with 2-3 most relevant AI actions (e.g., Expand, Summarize, Rewrite).
    - [x] Interaction: Icons for quick actions. Clicking an icon performs a default action or opens a streamlined input. (Core AI connections made, further refinement of actions can continue)
- [x] **SelectedNodeToolbar Enhancements:**
    - [x] Implement "Change Color" functionality (e.g., via a popover color picker).
    - [x] Implement "Start Connection via button" (alternative to dragging handles).
    - [x] Investigate/Implement dynamic, viewport-aware positioning for the toolbar.
- [x] Drag-and-Drop from AI Panel with Preview:
    - [x] Allow dragging concepts/relations from AISuggestionPanel directly onto the canvas.
    - [x] Interaction: Show a preview of the **node** under the cursor during drag (snapped to grid). (Implemented for nodes dragged from AI Panel).
    - [x] Interaction (Enhancement): Show a preview for dragging **edges** from AI Panel (label with attached visual line segment follows cursor). (Implemented for relations from AI Panel).
    - [x] Interaction (Enhancement): Ensure node-to-node snapping guides actively interact with the node drag preview (current preview snaps to grid). (Node preview snaps to grid and other nodes).

### Iterative and Preview-Oriented AI Generation
- [x] "AI Staging Area" for Cluster/Snippet Generation:
    - [x] For "Quick AI Cluster" / "Generate Snippet": Output AI-generated elements into a temporary "staging area" on canvas or as a special selection group. (Store logic done, UI for stage elements done)
    - [x] Staging Area Interaction: Allow deletion of individual suggestions, quick label edits, slight repositioning. (Deletion of selected staged items done)
    - [x] Add "Commit to Map" button to finalize, and "X"/Esc to discard from staging area. (Toolbar with buttons done)
- [x] Refinable "Expand Concept" Previews:
    - [x] When "Expand Concept" is used, first show new child nodes as temporary "ghost" nodes.
    - [x] Interaction: Allow clicking individual ghost nodes to accept. Add "Accept All" / "Cancel" controls. (Core acceptance logic done via click and floater)
    - [x] Interaction (Enhancement): Display "Refine" icon on hover over a ghost node to alter its suggestion before acceptance.

### AI-Powered Layout and Structuring Assistance
- [x] "AI Tidy-Up" / Smart Alignment (Contextual):
    - [x] On selection of multiple nodes, offer an "AI Tidy selection" option (Implemented in EditorToolbar, AI aligns/distributes).
    - [x] (Enhancement) AI attempts to also semantically group selected nodes (e.g., create temporary parent node). (AI flow can now suggest a parent, and hook logic implements its creation and re-parenting of children).
- [ ] Dynamic "Structure Suggestion" Overlays (Evolution of existing TODO item):
    - [ ] AI periodically/on-demand scans map for structural improvement opportunities.
    - [ ] Visuals: Draw temporary dashed line between nodes with "?" and suggested relation. Highlight node groups with pulsating overlay and tooltip "Group these concepts?".
    - [ ] Interaction: Clicking suggestion accepts it (creates edge/group) or offers refine/dismiss options.

### Streamlined GAI Input & Feedback
- [ ] Slash Commands ("/ai") in Node Text (Evolution of existing TODO item):
    - [ ] While editing node label/details, typing "/ai" brings up a list of AI commands (e.g., /ai expand, /ai rewrite simple).
    - [ ] Selecting command and providing input executes AI action directly on/related to the node.
- [x] Node-Specific AI Progress Indicators (Enhanced):
    - [x] For AI actions creating new nodes from a source (e.g., Expand), new nodes initially appear with "AI generating..." state/animation before content populates. (Handled by `aiProcessingNodeId` and spinner in `CustomNodeComponent`)

### GAI for Edges
- [x] AI-Suggested Relation Labels:
    - [x] When a user manually draws an edge, AI automatically suggests a relevant label based on source/target content. (Genkit flow created, hook updated, suggestions shown in floater)
    - [x] Interaction: Suggested label appears temporarily. User can click to accept, type to overwrite, or ignore. (Floater shows suggestions, click updates label)
- [x] "Suggest Intermediate Node" on Edge Selection: (Implemented via Properties Inspector for selected edge)
    - [x] If an edge is selected, AI action to "Suggest intermediate concept".
    - [x] AI proposes a node to sit between source/target, splitting original edge and linking through the new node.

## Data Structure & Layout Refactoring Plan (Graphology/Dagre Integration)

This plan outlines a potential refactoring to incorporate Graphology for more robust data management and Dagre for automated graph layout. Implementation is contingent on tool stability and/or user provision of core utility libraries.

**Phase 1: Define Utility Interfaces & Core Store Logic**
- [ ] **Define `DagreLayoutUtility` Interface:**
    - Input: `nodes: Array<{id, width, height}>`, `edges: Array<{source, target}>`, `options?: {direction?, rankSep?, nodeSep?}`.
    - Output: `nodes: Array<{id, x, y}>` (top-left coordinates for React Flow).
    - Responsibility: Encapsulates Dagre.js layout calculation.
- [ ] **Define `GraphAdapter` Utility Interface (for Graphology):**
    - `fromArrays(nodes, edges) => GraphologyInstance`
    - `toArrays(graphInstance) => {nodes, edges}` (if needed for full graph conversion)
    - `getDescendants(graphInstance, nodeId) => string[]`
    - `getAncestors(graphInstance, nodeId) => string[]`
    - `getNeighborhood(graphInstance, nodeId, options) => string[]`
    - `getSubgraph(graphInstance, nodeIds) => {nodes, edges}` (React Flow compatible arrays)
    - Responsibility: Encapsulates common Graphology operations on data sourced from store arrays.
- [x] **Store: Implement `applyLayout` Action (`concept-map-store.ts`):**
    - Takes `updatedNodePositions: Array<{id, x, y}>` (from `DagreLayoutUtility`).
    - Updates `x, y` for corresponding nodes in `mapData.nodes`.
    - Ensure undoable with Zundo (via `mapData` tracking).
- [ ] **Store: Refactor `deleteNode` Action (`concept-map-store.ts`):**
    - Internally use `GraphAdapter.fromArrays` and `GraphAdapter.getDescendants` to reliably identify all nodes to delete.
    - Update `mapData.nodes` and `mapData.edges` based on this.
    - Manage `childIds` on parent nodes if this feature is kept (or plan for its deprecation).

**Phase 2: UI Integration for Auto-Layout (Dagre)**
- [ ] **UI: Add "Auto-layout Map" Button (`EditorToolbar.tsx`):**
    - Icon: `Network` or `LayoutDashboard`.
    - Disabled in `isViewOnlyMode`.
- [ ] **Page Logic: Connect Button to Dagre Utility & Store (`mapId/page.tsx`):**
    - On button click: Get current nodes/edges, show loading, call `DagreLayoutUtility`, call store's `applyLayout`, handle loading/toast.
- [ ] **React Flow: Ensure `fitView` after Layout (`FlowCanvasCore.tsx`):**
    - Verify/ensure `reactFlowInstance.fitView()` is called after `applyLayout`.

**Phase 3: Integrate Graphology Utilities into AI Features (`useConceptMapAITools.ts`)**
- [ ] **AI Context Gathering: Refactor for Graphology:**
    - Update AI tool functions to use an on-demand Graphology instance (via `GraphAdapter`) for richer context (neighbors, ancestors).
- [ ] **AI Output Processing: Pre-layout with Dagre for Staging/Preview:**
    - For "Quick Cluster", "Generate Snippet", "Expand Concept": After AI returns new elements, use Dagre on a temporary graph to pre-layout them before sending to staging/preview.
- [ ] **Advanced GAI (Future): Plan New Features using Graphology/Dagre:**
    - Design "AI Tidy-Up / Smart Alignment" (Dagre on selections).
    - Design "Dynamic Structure Suggestion Overlays" (Graphology for analysis).

**Phase 4: Data Migration & Initialization (Conceptual - Low Impact for Hybrid)**
- [x] **Verify No Data Migration Needed for stored arrays.** (Confirmed)
- [x] **Verify No Initialization Change Needed for new maps.** (Confirmed)

**Phase 5: Documentation & Review**
- [ ] Document interfaces for `DagreLayoutUtility` and `GraphAdapter`.
- [ ] Document how store actions and AI tools utilize these.
- [ ] Review pros/cons post-implementation (if undertaken).

## Performance Optimizations
- [ ] Review and optimize image usage: Ensure all important images use `next/image` with `width` and `height` props. Replace generic `<img>` tags or add placeholders for `next/image` where appropriate. (Current usage of SVGs via lucide-react is good; this is a guideline for future raster image assets).
- [ ] Investigate large list rendering: For pages like Admin User Management or long classroom student lists, evaluate if virtualization techniques (e.g., `react-window` or `tanstack-virtual`) are needed as data scales. (Admin/Teacher lists already have some virtualization)
    - [ ] Monitor performance for lists rendering `ConceptMapListItem` and `SubmissionListItem`; consider virtualization in parent components if performance issues arise with large datasets.
    - [x] **Visual Cues for AI-Generated Content:**
        - [x] Ensured AI-generated nodes (from panel, direct generation like "Summarize", "Rewrite", or "Expand Concept") have distinct visual styles and icons via `CustomNodeComponent`.
        - [x] Defined specific node types (`ai-summary-node`, `ai-rewritten-node`, `ai-expanded` for generated children, `ai-concept` from panel, `text-derived-concept`, `ai-generated`) and mapped them to styles/icons.
- [ ] Conduct further React component memoization: Systematically review components, especially children of frequently re-rendering parents that receive stable props, and apply `React.memo`, `useCallback`, and `useMemo` where beneficial. (`SelectedNodeToolbar` and its props from `CustomNodeComponent` now memoized).
    - [x] Ensure callbacks passed as props *to* `EditorToolbar` from its parent page (e.g., `mapId/page.tsx`) are memoized using `useCallback`.
## Performance Optimizations
// This section was duplicated, the content above is the primary one. Removing this duplicate.

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
- AI for project analysis uses mock project structure (`projectStructureAnalyzerTool`); needs real file processing from Supabase Storage by the user if desired. `projectStructureAnalyzerTool` mock logic has been enhanced for varied outputs based on hints.
- Supabase client library installed and configured. User needs to run typegen for `src/types/supabase.ts`.
- API routes rely on Supabase-backed services. RLS in Supabase is the primary data access control.
- Client-side file upload for project analysis uploads to Supabase Storage (bucket 'project_archives').
- Admin User Management page and Profile Page are connected to Supabase for CRUD and password changes.
- Dashboard counts are fetched from Supabase-backed APIs using custom hooks, which also respect `BYPASS_AUTH_FOR_TESTING`.
- Classroom management, Concept Map management, and Student Submissions list are connected to Supabase and use modular components.
- The application is highly modular, with reusable components for UI patterns, custom hooks for complex logic, and service layers for backend interaction.
- Core in-editor AI features (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) are implemented with specific visual cues for AI-generated/modified nodes.
- View-only mode for concept map editor is implemented.
- Developer role switcher added to profile page for easier testing.
- Developer test buttons previously on Project Upload Form have been removed for simplicity.

This covers a very large portion of the Supabase integration tasks and modularization. The application is now significantly more robust, data-driven, and maintainable.
The main remaining area for full Supabase connection is:
*   Making the `projectStructureAnalyzerTool` actually process files from Supabase Storage (currently out of scope for me to implement the actual file parsing logic).
*   Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
*   Thorough testing and deployment preparations (out of scope).

This covers a very large portion of the Supabase integration tasks and modularization. The application is now significantly more robust, data-driven, and maintainable.
The main remaining area for full Supabase connection is:
*   Making the `projectStructureAnalyzerTool` actually process files from Supabase Storage (currently out of scope for me to implement the actual file parsing logic).
*   Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
*   Thorough testing and deployment preparations (out of scope).
