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
        - [x] File downloader from Supabase storage for AI tool implemented (supabaseFileFetcherTool). projectStructureAnalyzerTool now uses this to fetch file properties and performs: AST-based analysis for JavaScript (Acorn), TypeScript (TS Compiler API), and Python (python-parser) including semantic purpose summarization (via LLM) and detection of intra-file function/method calls (refactored for maintainability using shared utilities); basic content analysis for other common types. Further deep semantic analysis user-defined/pending. Unpacker out of scope. (generateMapFromProject flow prompt updated).
        - [x] Code/Structure Parser Engine (AI-based: Genkit flow `generateMapFromProject` serves as the core engine. `projectStructureAnalyzerTool` now performs real, refactored AST analysis for JS/TS/Python, accepts storage path and user goals, and special hints for predefined mock outputs for other types).
        - [x] LLM-Powered Structure-to-Map Converter (integrates with Genkit/Gemini, parses output from `projectStructureAnalyzerTool`, creates new ConceptMap record via Supabase service - handled in `ProjectUploadForm` flow after AI tool returns).
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
    - [x] **`AISuggestionPanel`**: Area (toggleable Sheet) displaying AI suggestions with "Add to Map" functionality. Suggestions persist, update status, can be edited before adding, removed after adding. "Expand Concept" feature now adds nodes directly to the map, bypassing this panel.
    - [x] **Zustand Store (`concept-map-store.ts`)**: Manages client-side state for the concept map editor, including map data, selections, AI suggestions, and UI states. Undo/Redo history implemented with `zundo`.
    - [x] **Custom Hooks:** `useConceptMapDataManager` (for load/save logic) and `useConceptMapAITools` (for AI modal management and integration) significantly modularize editor logic.
- [x] ### Component Refinements
    - [x] **`custom-node.tsx` Refinement:**
        - [x] Review `getNodeRect` function (currently commented out): confirm if it's still needed for any toolbar/element positioning logic or if it can be safely removed. (Considered resolved/not needed based on current editor stability and features)
- [x] **State Management:**
    - [x] Implement a robust client-side state management solution (Zustand for Concept Map Editor, `zundo` for history). Context API for Auth.
- [x] **Real-time Features (Optional - Future Consideration):**
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
    - [x] **(Advanced - Future) Explore "AI Structure Suggestions":** (Phase 1 implemented: AI can suggest a single new edge, intermediate node, or group via toolbar action and dialog. Full dynamic overlays or more proactive suggestions pending.)
        - [x] Analyze map structure and content to propose new connections or organizational improvements (e.g., "These 3 nodes seem related, would you like to group them?" or "Consider linking Node A to Node B because..."). (Initial version for single AI-chosen improvement implemented via toolbar action.)
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
    - [x] On node selection/right-click: Floater currently shows *actions*. Enhance to also show temporary "ghost" nodes/suggestion *chips for direct content addition* (e.g., "Child: [AI suggested text]"). (Direct add child with AI-suggested text and chip-styled floater actions implemented).
- [x] "AI Contextual Mini-Toolbar" on Node Hover/Selection:
    - [x] Display a small, floating toolbar near selected/hovered node with 2-3 most relevant AI actions (e.g., Expand, Summarize, Rewrite).
    - [x] Interaction: Icons for quick actions. Clicking an icon performs a default action or opens a streamlined input. (Core AI connections made, further refinement of actions can continue)
- [x] **SelectedNodeToolbar Enhancements:** (Change Color verified pre-existing; Start Connection implemented; Viewport-aware positioning reviewed and current state deemed sufficient)
    - [x] Implement "Change Color" functionality (e.g., via a popover color picker).
    - [x] Implement "Start Connection via button" (alternative to dragging handles).
    - [x] Investigate/Implement dynamic, viewport-aware positioning for the toolbar.
- [x] Drag-and-Drop from AI Panel with Preview:
    - [x] Allow dragging concepts/relations from AISuggestionPanel directly onto the canvas.
    - [x] Interaction: Show a preview of the node/edge under the cursor during drag. Release creates the element. (Dragging concepts done, preview on drag is implemented)
    - [x] Interaction: Activate snapping guides for drag preview from AI Panel. (Preview item now snaps its position to align with nodes/grid, and visual guide lines are shown for node-to-node alignments.)

### Iterative and Preview-Oriented AI Generation
- [x] "AI Staging Area" for Cluster/Snippet Generation:
    - [x] For "Quick AI Cluster" / "Generate Snippet": Output AI-generated elements into a temporary "staging area" on canvas or as a special selection group. (Store logic done, UI for stage elements done)
    - [x] Staging Area Interaction: Allow deletion of individual suggestions, quick label edits, slight repositioning. (Deletion of selected staged items done)
    - [x] Add "Commit to Map" button to finalize, and "X"/Esc to discard from staging area. (Toolbar with buttons done)
- [x] Refinable "Expand Concept" Previews:
        - [x] When "Expand Concept" is used, new child nodes are added directly to the map or via AISuggestionFloater for quick interaction.
        - [x] The older "ghost node preview" system (`conceptExpansionPreview`) with explicit "Refine" icons on ghost nodes for pre-acceptance editing has been removed in favor of more direct interaction flows. Current "ghost" nodes (`ghostPreviewData`) are primarily for layout previews (e.g., AI Tidy Up).

### AI-Powered Layout and Structuring Assistance
- [x] "AI Tidy-Up" / Smart Alignment (Contextual):
    - [x] On selection of multiple nodes, offer an "AI Tidy selection" option (Implemented in EditorToolbar, AI aligns/distributes).
    - [x] (Enhancement) AI attempts to also semantically group selected nodes (e.g., create temporary parent node). (AI flow can now suggest a parent, and hook logic implements its creation and re-parenting of children).
- [x] Dynamic "Structure Suggestion" Overlays (Evolution of existing TODO item):
    - [x] AI periodically/on-demand scans map for structural improvement opportunities. (On-demand implemented via EditorToolbar button calling `suggestMapImprovementsFlow`; periodic scanning is a future enhancement).
    - [x] Visuals: Draw temporary dashed line between nodes with "?" and suggested relation. Highlight node groups with pulsating overlay and tooltip "Group these concepts?". (Custom React Flow components like `SuggestionEdge.tsx`, `SuggestedIntermediateNode.tsx`, and `GroupSuggestionOverlayNode.tsx` are used to visually represent these suggestions).
    - [x] Interaction: Clicking suggestion accepts it (creates edge/group) or offers refine/dismiss options. (Implemented via component interactions with store actions and Popovers on suggestion components, allowing accept/dismiss actions that modify the map and remove the suggestion).

### Streamlined GAI Input & Feedback
- [x] Slash Commands ("/ai") in Node Text (Evolution of existing TODO item):
    - [x] While editing node label/details, typing "/ai" brings up a list of AI commands (e.g., /ai expand, /ai rewrite simple).
    - [x] Selecting command and providing input executes AI action directly on/related to the node.
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
**Status:** [x] Core libraries (`graphology`, `dagre`) installed and integrated. `GraphAdapterUtility` (graphology) used in store & AI tools. `DagreLayoutUtility` (dagre) powers selection and full-map layout. AI suggestions (group, edge, intermediate node) enhanced with hybrid Graphology+LLM approaches. Overall pros/cons reviewed.

This plan outlines a potential refactoring to incorporate Graphology for more robust data management and Dagre for automated graph layout. Implementation is contingent on tool stability and/or user provision of core utility libraries.

**Phase 1: Define Utility Interfaces & Core Store Logic**
- [x] **Define `DagreLayoutUtility` Interface:**
    - Input: `nodes: Array<{id, width, height}>`, `edges: Array<{source, target}>`, `options?: {direction?, rankSep?, nodeSep?}`.
    - Output: `nodes: Array<{id, x, y}>` (top-left coordinates for React Flow).
    - Responsibility: Encapsulates Dagre.js layout calculation.
- [x] **Define `GraphAdapter` Utility Interface (for Graphology):**
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
- [x] **Store: Refactor `deleteNode` Action (`concept-map-store.ts`):**
    - Internally use `GraphAdapter.fromArrays` and `GraphAdapter.getDescendants` to reliably identify all nodes to delete.
    - Update `mapData.nodes` and `mapData.edges` based on this.
    - Manage `childIds` on parent nodes if this feature is kept (or plan for its deprecation).

**Phase 2: UI Integration for Auto-Layout (Dagre)**
- [x] **UI: Add "Auto-layout Map" Button (`EditorToolbar.tsx`):**
    - Icon: `Network` or `LayoutDashboard`.
    - Disabled in `isViewOnlyMode`.
- [x] **Page Logic: Connect Button to Dagre Utility & Store (`mapId/page.tsx`):**
    - On button click: Get current nodes/edges, show loading, call `DagreLayoutUtility`, call store's `applyLayout`, handle loading/toast.
- [x] **React Flow: Ensure `fitView` after Layout (`FlowCanvasCore.tsx`):**
    - Verify/ensure `reactFlowInstance.fitView()` is called after `applyLayout`.

**Phase 3: Integrate Graphology Utilities into AI Features (`useConceptMapAITools.ts`)**
- [x] **AI Context Gathering: Refactor for Graphology:**
    - Update AI tool functions to use an on-demand Graphology instance (via `GraphAdapter`) for richer context (neighbors, ancestors).
- [x] **AI Output Processing: Pre-layout with Dagre for Staging/Preview:**
    - For "Quick Cluster", "Generate Snippet", "Expand Concept": After AI returns new elements, use Dagre on a temporary graph to pre-layout them before sending to staging/preview.
- [x] **Advanced GAI (Future): Plan New Features using Graphology/Dagre:**
    - [x] Design "AI Tidy-Up / Smart Alignment" (Dagre on selections). (Implemented using DagreLayoutUtility for selected nodes, triggered from SelectedNodeToolbar).
    - [x] Design "Dynamic Structure Suggestion Overlays" (Graphology for analysis).
        - [x] Implemented hybrid Graphology (Louvain community detection) + LLM validation/naming for PROPOSE_GROUP suggestions within `suggestNodeGroupCandidatesFlow`.
        - [x] Implemented hybrid Graphology (Jaccard Index on shared neighbors) + LLM validation/labeling for PROPOSE_EDGE suggestions via a new `suggestGraphologyEnhancedEdgeFlow`.
        - [x] Implemented hybrid Graphology (inter-community edge detection) + LLM content generation/validation for PROPOSE_INTERMEDIATE_NODE suggestions via a new `suggestGraphologyIntermediateNodeFlow`.

**Phase 4: Data Migration & Initialization (Conceptual - Low Impact for Hybrid)**
- [x] **Verify No Data Migration Needed for stored arrays.** (Confirmed)
- [x] **Verify No Initialization Change Needed for new maps.** (Confirmed)

**Phase 5: Documentation & Review**
- [x] Document interfaces for `DagreLayoutUtility` and `GraphAdapter`.
- [x] Document how store actions and AI tools utilize these.
- [x] Review pros/cons post-implementation (if undertaken). (Completed for store refactor, Dagre selection layout, Dagre full map layout, and Graphology-enhanced suggestions).

## Performance Optimizations
- [x] Review and optimize image usage: Ensure all important images use `next/image` with `width` and `height` props. Replace generic `<img>` tags or add placeholders for `next/image` where appropriate.
- [x] Investigate large list rendering: For pages like Admin User Management or long classroom student lists, evaluate if virtualization techniques (e.g., `react-window` or `tanstack-virtual`) are needed as data scales. (Admin Users page virtualization verified as pre-existing)
    - [x] **Visual Cues for AI-Generated Content:**
        - [x] Ensured AI-generated nodes (from panel, direct generation like "Summarize", "Rewrite", or "Expand Concept") have distinct visual styles and icons via `CustomNodeComponent`.
        - [x] Defined specific node types (`ai-summary-node`, `ai-rewritten-node`, `ai-expanded` for generated children, `ai-concept` from panel, `text-derived-concept`, `ai-generated`) and mapped them to styles/icons.
- [x] Conduct further React component memoization: Systematically review components, especially children of frequently re-rendering parents that receive stable props, and apply `React.memo`, `useCallback`, and `useMemo` where beneficial. (`SelectedNodeToolbar` and its props from `CustomNodeComponent` now memoized).
    - [x] Ensure callbacks passed as props *to* `EditorToolbar` from its parent page (e.g., `mapId/page.tsx`) are memoized using `useCallback`.
- [x] Refactor `projectStructureAnalyzerTool.ts` to use shared utility functions (`ast-utils.ts`) for AST element summarization and `DetailedNode` creation, improving code maintainability and reducing redundancy across JavaScript, TypeScript, and Python analyzers.

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
- [x] **Genkit Flow for Project Analysis (`generateMapFromProject`):**
        - [x] projectStructureAnalyzerTool now fetches project files and performs: AST-based analysis for JavaScript (Acorn), TypeScript (TS Compiler API), and Python (python-parser). This includes semantic purpose summarization (via LLM) for functions/classes and detection of intra-file function/method calls. The AST analysis logic has been refactored for better maintainability using shared utilities. It also performs basic content analysis for other common file types. Further deep semantic analysis is user-defined/pending. `generateMapFromProject` prompt updated.
        - [x] **Deeply Enhanced AST-based analysis for Python files in `projectStructureAnalyzerTool` using `python-parser`:**
            - Improved extraction of function/method return type annotations and parameter type annotations.
            - Added handling for `AnnAssign` to capture typed class attributes and their types.
            - Enhanced local call detection to include `super()` calls and calls to members of imported modules (basic identification).
            - Ensured more consistent population of `ExtractedCodeElement` fields (e.g., `parentName`, `isAsync`, `decorators`, `classProperties`, `returnType`, `params[].type`).
            - Added extraction of module-level variables (including typed assignments).
            - Updated `details` string for Python nodes to comprehensively include this richer information.
    - [x] On successful map generation: Save map and link submission via Supabase services. (Done in `ProjectUploadForm` flow).
    - [x] **MANUAL INTERVENTION RESOLVED**: Merge conflicts in `src/ai/tools/project-analyzer-tool.ts` resolved. The logic after the main try-catch block in `analyzeProjectStructure` function, which seemed to be a duplicate or misplaced call to `supabaseFileFetcherTool`, has been removed. The function now correctly returns the `output` variable from the primary analysis logic.

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
    - [x] Unit tests for `projectStructureAnalyzerTool`'s Python AST analysis (covering enhanced features).
    - [x] Unit tests for `projectStructureAnalyzerTool`'s JavaScript AST analysis (covering core features).
    - [x] Unit tests for `projectStructureAnalyzerTool`'s TypeScript AST analysis (covering core features and TS-specifics).
    - [x] Unit tests for `projectStructureAnalyzerTool`'s `determineEffectiveFileType` helper.
    - [x] Comprehensive unit tests for `concept-map-store.ts` (Zustand store) covering:
        - Initialization and Loading (new, load, import, reset).
        - Node CRUD operations (add, update, delete with descendants).
        - Edge CRUD operations.
        - Staging Area logic (set, clear, commit for various actionTypes, delete from stage).
        - Ghost Preview logic (set, accept, cancel).
        - Layout and View actions (applyLayout, overview mode, focus).
        - Structural Suggestions management and application (form group).
        - Basic Undo/Redo integration via Zundo.
    - [ ] Write unit tests for other critical components and utility functions (e.g., `useConceptMapAITools`, specific UI components with complex logic).
    - [ ] Implement integration tests for user flows with Supabase.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline.
    - [ ] Configure production environment for Next.js and Supabase.

## Known Issues / Current State
- Backend services fully migrated to Supabase (users, classrooms, concept_maps, project_submissions, system_settings). User must set up tables and RLS policies. Services respect `BYPASS_AUTH_FOR_TESTING` and return mock data.
- AuthContext migrated to Supabase Auth. User profile data fetched/created in Supabase `profiles` table. Respects `BYPASS_AUTH_FOR_TESTING`.
- Concept map canvas is React Flow. Undo/Redo implemented with `zundo`. Editor logic highly modularized with custom hooks, and foundational work for advanced graph operations (Graphology/Dagre concepts) using mock adapters is in place.
- Numerous new editor UX and AI-powered enhancements added, including: "Start Connection" button, AI-suggested text for quick-add child nodes (with chip-style floater), ghost node refinement for "Expand Concept" previews, slash commands for AI actions in node details, "Suggest Intermediate Node" for edges, algorithmic alignment/distribution tools, drag-and-drop preview from AI Panel, and initial phase of "AI Semantic Grouping" (suggestion, structural linking, and visual parent representation with child layout).
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
- Developer test buttons previously on Project UploadForm have been removed for simplicity.

This covers a very large portion of the Supabase integration tasks and modularization. The application is now significantly more robust, data-driven, and maintainable.
The main remaining area for full Supabase connection is:
*   Making the `projectStructureAnalyzerTool` actually process files from Supabase Storage (currently out of scope for me to implement the actual file parsing logic).
*   Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
*   Thorough testing and deployment preparations (out of scope).

## User Experience (UX) Enhancements - "Ordinary User" Perspective
- [ ] **Onboarding & Initial Experience:**
    - [ ] **"Guest Mode" or "Try Without Login":** Explore options for users to try basic features or view example maps without mandatory registration. (Higher effort)
    - [ ] **Interactive Tutorial/Walkthrough:** Implement a guided tour for first-time users highlighting key features like project upload, map generation, and basic AI interactions. (Higher effort)
    - [x] **Clearer "User Goals" Input:** Provide examples or tooltips for the "User Goals" field during project upload to reduce user confusion. (Implemented in `ProjectUploadForm`)
    - [x] **Role-Agnostic Starting Point:** Offer a clear "Personal Use" or "Quick Analyze" path for users not immediately identifying as "Student" or "Teacher". (Implemented: Default to student/general dashboard, sidebar adjusts roles)
- [ ] **Map Interaction & Interpretation:**
    - [x] **"Human-Readable" Summaries:** For generated maps, provide a high-level, plain-language summary of the project structure and key components alongside the visual map. (Implemented via "Summarize Map (AI)" button and modal)
    - [x] **Contextual Help for Map Elements:** Add tooltips or "?" icons to map nodes and properties inspector fields to explain technical terms in simple language. (Implemented for Node Type and Details in `PropertiesInspector`)
    - [x] **Smart Map Presentation (Super-Simple Overview Mode):**
        - [x] **Phase 1: AI-Generated High-Level Summary & Key Modules:**
            - [x] Create `generateProjectOverviewFlow` to produce a concise text summary and identify 3-5 top-level modules/components with plain-language descriptions. (Implemented in `generate-project-overview.ts`)
        - [x] **Phase 2: UI for Overview Mode:**
            - [x] Add "Overview Mode" toggle button to `EditorToolbar`. (Implemented)
            - [x] Add state management for overview mode (`isOverviewModeActive`, `projectOverviewData`, `isFetchingOverview`) and actions (`toggleOverviewMode`, `fetchProjectOverview`) in `concept-map-store.ts`. (Implemented)
            - [x] Create `ProjectOverviewDisplay.tsx` component to render the summary and key modules. (Implemented)
            - [x] Conditionally render `ProjectOverviewDisplay` or `FlowCanvasCore` in `mapId/page.tsx` based on `isOverviewModeActive`. (Implemented)
            - [x] When active, `ProjectOverviewDisplay` shows the AI-generated text summary. (Implemented)
            - [x] `ProjectOverviewDisplay` shows identified top-level modules as cards. (Implemented)
            - [x] Each module card in `ProjectOverviewDisplay` displays its plain-language description and shows key files in a tooltip. (Implemented)
            - [ ] (Deferred) `ProjectOverviewDisplay` shows simplified connections between key modules. (Deferred due to complexity of inferring/displaying meaningful top-level connections without direct AI output for it).
        - [x] **Phase 3 (Future): Interactive Drill-Down from Overview Mode:**
            - [x] Clicking a module in Overview Mode transitions the main map view to focus on/filter for that module's components. (Implemented)
    - [ ] **Visual Feedback & Progress:**
        - [ ] For long-running AI operations (analysis, suggestions), provide more engaging progress indicators or estimated time remaining.
        - [x] Ensure error messages are user-friendly and suggest potential solutions or next steps. (Enhanced in `callAIWithStandardFeedback`)
- [ ] **AI Interaction Refinements:**
    - [x] **AI Explanations ("Why?"):**
        - [x] **Suggest Relations:** Modify `suggestRelationsFlow` to include a `reason` field. (Implemented)
        - [x] **Suggest Relations UI:** Update `AISuggestionPanel` to display the `reason` for suggested relations. (Implemented)
        - [x] **Extract Concepts:** Modify `extractConceptsFlow` to include `context` and `source` for extracted concepts. (Implemented)
        - [x] **Extract Concepts UI:** Update `AISuggestionPanel` to display `context` and `source` for extracted concepts. (Implemented)
        - [x] **Expand Concept:** Modify `expandConceptFlow` to include `reasoning` for expanded ideas. (Implemented)
        - [x] **Expand Concept UI:** Update `useConceptMapAITools` to prepend `reasoning` to the `details` of new nodes from expansion. (Implemented)
    - [x] **Preview for AI Actions (Staging Area for Quick Cluster & Snippet):**
        - [x] Modified `QuickClusterModal` to send its output to `stagedMapData` in `concept-map-store`. (Implemented)
        - [x] Modified `GenerateSnippetModal` to send its output to `stagedMapData`. (Implemented)
        - [x] Removed/Adjusted `onClusterGenerated` and `onSnippetGenerated` props/handlers in `useConceptMapAITools` as direct map addition is now handled by Staging Area commit. (Props removed from modal calls and definitions; hook confirmed clean)
    - [x] **Simplified AI Prompts/Inputs & Enhanced Feedback:**
        - [x] Reviewed and updated UI text (titles, descriptions, placeholders, buttons) in `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `AskQuestionModal` (within `genai-modals.tsx`). (Implemented)
        - [x] Reviewed and updated UI text in `QuickClusterModal`, `GenerateSnippetModal`, `RewriteNodeContentModal`, `RefineSuggestionModal`, `SuggestIntermediateNodeModal`. (Implemented)
        - [x] Standardized loading states (button disabled + loader icon) and Toast notifications (start, success, user-friendly error) for AI operations called from `useConceptMapAITools` and directly within modals. (Implemented via `callAIWithStandardFeedback` and direct modal modifications)
- [ ] **Content & Help:**
    - [x] **"Ordinary User" Example Library (Framework):**
        - [x] **Content Curation & Data Definition:** Defined `ExampleProject` interface and `exampleProjects` array in `src/lib/example-data.ts` with metadata for 3 examples. (Implemented)
        - [x] **File Structure:** Created placeholder directories `public/examples/`, `public/images/examples/`, `src/lib/example-maps/`. (Implemented)
        - [x] **UI - Examples Page/Section:** Created `src/app/(app)/examples/page.tsx` to display example cards. (Implemented)
        - [x] **UI - Navigation:** Added "Examples" link to `SidebarNav`. (Implemented)
        - [x] **Functionality - Load Example:** Implemented `loadExampleMapData` action in `concept-map-store.ts` and `handleLoadExample` in `ExamplesPage` to fetch and load (mocked) JSON map data. (Implemented)
        - [ ] **Actual Example Content:** Populate `public/example-maps/` with actual JSON files and `public/images/examples/` with preview images. (Manual Task for User, Blocked for Agent)
- [ ] **Advanced UX Features (Future/Higher Effort - Needs Further Breakdown & Prioritization):**
    - [ ] **Full Interactive Tutorial/Onboarding:**
        - [ ] **Design Phase:** Define key user flows for tutorial (e.g., first project analysis, using a core AI tool).
        - [ ] **Tool Selection:** Evaluate and select a suitable frontend library (e.g., Shepherd.js, Intro.js) or decide on custom implementation.
        - [ ] **Content Creation:** Write tutorial steps, explanations, and highlight target UI elements.
        - [ ] **Implementation:** Integrate selected library/custom solution into relevant pages/components.
        - [ ] **State Management:** Implement logic to track tutorial completion for users (e.g., in user profile or local storage).
    - [ ] **Guest Mode:**
        - [ ] **Scope Definition:** Determine which features are available to guest users (e.g., view public examples only, limited analysis on predefined small projects).
        - [ ] **Auth Logic Modification:** Adjust `AuthContext` and routing to allow access to certain parts of the app without full authentication.
        - [ ] **UI Adaptation:** Design and implement a guest-specific UI layout, potentially with more prominent calls to action for registration/login.
        - [ ] **Data Handling:** Ensure guest user data (if any is generated temporarily) is handled appropriately (e.g., not persisted or clearly marked as temporary).
    - [x] **Overview Mode - Interactive Drill-Down (Phase 3):**
        - [x] **Design Interaction:** Define how clicking a module in overview mode affects the main map (e.g., filter nodes, zoom to relevant area, load a sub-map if applicable). (Implemented)
        - [x] **Store/State Logic:** Update `concept-map-store.ts` to handle focus/filter states based on overview module selection. (Implemented - existing action was suitable)
        - [x] **Component Updates:** Modify `ProjectOverviewDisplay.tsx` to trigger these actions and `FlowCanvasCore.tsx` to respond to filter/focus states. (Implemented)
    - [x] **Interactive Q&A - Contextual Q&A (Phase 2):**
        - [x] **Edge Q&A:** (Implemented)
            - [x] Design UI for asking questions about a selected edge (e.g., in `PropertiesInspector` or context menu). (Implemented in Properties Inspector)
            - [x] Create `askQuestionAboutEdgeFlow`: Input (source node, target node, edge label, user question), Output (answer). (Implemented)
            - [x] Integrate with UI. (Implemented via modal and hook)
        - [x] **Multi-Node/Map-Level Q&A:** (Implemented)
            - [x] Design UI for broader questions (e.g., a persistent chat icon, or a dedicated Q&A panel). (Implemented via Toolbar button and Modal)
            - [x] Create `askQuestionAboutMapContextFlow`: Input (current map nodes/edges or summary, user question), Output (answer). (Implemented)
            - [x] Integrate with UI. (Implemented via modal and hook)
    - [x] **Comprehensive AI Action Previews (Beyond Expand Concept):**
        - [x] **Phase 1: Review & Design (Current Focus)**
            - [x] **1.1: Review AI Tools & Identify Preview Needs**
                - [x] Systematically list AI tools modifying the map significantly (AI Tidy-Up/Semantic Grouping, Dynamic Structure Suggestions if they apply changes, Suggest Intermediate Node, AI-Suggested Relation Labels, Summarize Selected Nodes).
                - [x] For each, assess current preview, user confusion risk, and desirability of explicit preview.
            - [x] **1.2: Design UI/UX for Previews**
                - [x] Decided: Leverage AI Staging Area for `Suggest Intermediate Node` and `Summarize Selected Nodes (AI)`.
                - [x] Decided: Implement "Ghost Element Preview" with localized confirmation for `AI Tidy-Up (Align/Distribute)`.
                - [x] Decided: Refine `PROPOSE_GROUP` popover to allow inline name editing.
                - [x] Standardized "Accept", "Cancel" actions (either via Staging Toolbar or local popups).
                - [x] Evaluated `AIStagingToolbar` vs. localized confirmations based on context.
            - [x] **1.3: Design Technical Implementation Strategy**
                - [x] Staging Area Path: Defined `stagedMapData` extension, flow output requirements, store actions (`stageAIGeneratedElements`, `acceptStagedChanges` enhancement), and `useConceptMapAITools.ts` updates.
                - [x] Ghost Elements Path: Defined `ghostPreviewData` store slice & actions, `GhostNodeComponent`, `FlowCanvasCore.tsx` rendering logic, and `GhostPreviewToolbar`.
                - [x] Popover Refinement Path: Defined UI change for popover (text input) and store action update.
        - [x] **Phase 2: Implementation (Iterative) - NEXT** (Staging/Ghost previews for Suggest Intermediate Node, Summarize Selected Nodes, and AI Tidy-Up layout-only changes reviewed and refined)
            - [x] Implement for 1-2 high-priority tools (e.g., "Suggest Intermediate Node", "Summarize Selected Nodes"). (Verified these tools correctly use AI Staging Area; AI Tidy-Up uses Ghost Previews. Minor UX refinement for AIStagingToolbar tooltips added.)
            - [ ] Test thoroughly.
        - [ ] **Phase 3: Refinement & Rollout**
            - [ ] Gather feedback.
            - [ ] Refine based on feedback.
            - [ ] Roll out to other AI tools.
- [ ] **Continuous Improvement & Maintenance:**
    - [ ] **Performance for Large Projects:**
        - [ ] **Frontend Profiling:** Use React DevTools Profiler and browser performance tools to identify bottlenecks in rendering large maps (many nodes/edges).
        - [ ] **Optimization Techniques:** Investigate and implement techniques like node/edge virtualization (e.g., `react-flow-renderer`'s `onlyRenderVisibleElements` or custom solutions), debouncing updates, memoization.
        - [ ] **Backend/AI Flow Profiling:** For `projectStructureAnalyzerTool` and other potentially long-running flows, analyze execution time for large inputs and identify optimization opportunities (e.g., more efficient parsing, batched LLM calls if applicable).
    - [ ] **Clarity of Value Proposition (Iterative):**
        - [ ] **User Feedback Loop:** Establish a mechanism for collecting user feedback on UI clarity and perceived value (e.g., in-app feedback form, user surveys - external to agent).
        - [ ] **Landing Page/Homepage Review:** Periodically review and A/B test (if possible) homepage messaging to ensure it clearly communicates CodeMap's benefits to target users.
    - [ ] **Comprehensive Automated Testing:**
        - [ ] **Unit Tests for Core Logic:** Write Jest/Vitest unit tests for utility functions, complex store actions, and critical non-UI logic in services/hooks.
        - [ ] **Component Tests:** Use React Testing Library to test individual UI components, especially those with complex interactions or state.
        - [ ] **Integration Tests for AI Flows:** (Requires Genkit testing utilities or mocking strategies) Test individual Genkit flows with mock inputs and validate their output structure and key content.
        - [ ] **E2E Tests:** Plan and (manually or with tools like Playwright/Cypress) implement E2E tests for key user journeys (e.g., registration, project upload & analysis, core map interactions, AI tool usage).

# TODO - CodeMap 專案

## 已完成 (Guest Mode - Phase 1)

- [x] **設計 Guest Mode 範疇 (Phase 1)**
    - [x] 客戶可以唯讀模式檢視範例。
    - [x] 編輯、儲存和用戶特定功能被禁用。
    - [x] 顯示登入/註冊的 CTA。
- [x] **更新身份驗證和路由邏輯**
    - [x] 修改登陸頁面 (`src/app/page.tsx`) 以服務訪客內容。
    - [x] 修改 `src/app/(app)/layout.tsx` 以允許訪客存取 `/examples` 和範例地圖編輯器頁面 (`/concept-maps/editor/example-...?viewOnly=true`)。
    - [x] 保護其他應用程式路由。
- [x] **修改概念地圖編輯器以支援訪客唯讀模式**
    - [x] 更新 `useConceptMapDataManager` 以正確處理範例地圖的載入（不透過 API 呼叫使用者地圖）。
    - [x] 確保 `useConceptMapAITools` 和 `EditorToolbar` 中的 AI 工具和編輯功能在 `isViewOnlyMode` 為 true 時被禁用。
- [x] **實作訪客進入點和 CTA**
    - [x] 在 `/examples` 頁面為訪客新增 CTA橫幅。
    - [x] 在編輯器頁面為檢視範例的訪客新增 CTA橫幅。
- [x] **測試 (手動演練)**
    - [x] 驗證訪客可以存取登陸頁面、範例頁面和唯讀範例地圖。
    - [x] 確認 CTA 對訪客可見。
    - [x] 確認訪客無法存取受保護的路由（被重定向到登入頁面）。
    - [x] 確認已驗證的使用者具有正常的應用程式存取權限，並且看不到訪客 CTA。
- [x] **提交變更**
    - [x] 將所有 Guest Mode Phase 1 的變更提交到 `feat/guest-mode-phase-1` 分支。

## 下一步 (建議)

### Guest Mode - Phase 2 (潛在功能) - Implemented (Jules, Oct 2023 - Nov 2023)

- [x] **允許訪客「複製範例到工作區」：** (Implemented)
    - [x] 當訪客在唯讀模式下檢視範例時，提供一個按鈕「複製到我的工作區」或「開始編輯此範例」。 (Implemented on Examples page and Editor Toolbar)
    - [x] 點擊此按鈕會將他們重定向到登入/註冊頁面。 (Implemented with query params)
    - [x] 成功登入/註冊後，將範例地圖的副本複製到他們帳戶中，並以編輯模式開啟。 (Implemented in AuthContext post-login flow)
    - [x] 這需要後端 API 來處理地圖複製。 (Implemented - uses existing POST /api/concept-maps)
- [x] **更流暢的範例直接連結處理：** (Implemented)
    - [x] 如果訪客直接進入範例地圖 URL (`/concept-maps/editor/example-XYZ?viewOnly=true`) 但該範例資料尚未在 Zustand store 中（例如，透過直接連結或重新整理），考慮自動從 `/public/example-maps/` 的 JSON 檔案中抓取範例資料，而不是僅顯示錯誤並要求他們從範例庫導航。 (Implemented in useConceptMapDataManager)
    - [x] 這將使分享範例連結更加順暢。 (Achieved)
- [x] **UI/UX 細化：** (Partially Implemented - Tooltips improved, Sidebar review concluded no changes needed for guests)
    - [x] 檢閱所有訪客可見頁面上的導覽列/側邊欄，確保對訪客隱藏或禁用不相關的連結（例如「儀表板」、「設定」等）。目前 `AppLayout` 的重定向處理了大部分情況，但明確的 UI 調整可能更好。 (Reviewed: SidebarNav returns null for guests, which is acceptable. Navbar behavior is fine.)
    - [x] 在唯讀模式下，為已禁用的按鈕提供更一致的工具提示，明確說明為何禁用（例如「登入以使用此功能」）。 (Implemented for EditorToolbar)

### 其他潛在改進

- [ ] **測試覆蓋率：** (Verified as PENDING)
    - [ ] 為新的訪客模式邏輯和相關元件編寫自動化測試 (Vitest)。
    - [ ] 特別是測試 `AppLayout` 中的路由邏輯和 `useConceptMapDataManager` 中範例地圖的處理。
- [x] **錯誤處理與日誌記錄：** (Verified as IMPLEMENTED)
    - [x] 增強 `useConceptMapDataManager` 中範例地圖載入失敗時的錯誤處理/日誌記錄。 (Enhanced toasts and debug logs for direct example loading path)
- [ ] **安全性檢閱：** (Verified as PENDING - Requires Manual Review)
    - [ ] 對訪客模式進行一次快速的安全性檢閱，確保沒有意外的資料洩漏或功能存取。
