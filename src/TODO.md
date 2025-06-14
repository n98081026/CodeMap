

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
    - [x] Connect frontend project submission UI to live API (for metadata, client-side upload to Supabase Storage, AI trigger with real storage path and user goals, linking map using Supabase service - handled in `ProjectUploadForm` flow).
    - [x] Connect frontend student submissions list to live API. (Modularized with `SubmissionListItem` and `useSubmissionStatusPoller` hook).
    - [x] Connect frontend Admin Dashboard to fetch user & classroom counts dynamically with individual loading/error states (using `useAdminDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Connect frontend Student Dashboard to fetch classroom, map & submission counts dynamically with individual loading/error states (using `useStudentDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Connect frontend Teacher Dashboard to fetch classroom & student counts dynamically with individual loading/error states (using `useTeacherDashboardMetrics` hook and `DashboardLinkCard` component, respects BYPASS_AUTH).
    - [x] Ensure navigation paths are consistent (e.g. `/application/...` prefix).
    - [x] Removed redundant `/application/layout.tsx`.

## Frontend Enhancements

### Whimsical-Inspired Editor UX Enhancements
- [x] **Node Data Structure (Advanced Custom Layouts):**
    - [x] `parentNode` field added to `ConceptMapNode` type for hierarchy (used by React Flow).
    - [x] **Explicit `childIds` for Advanced Custom Layouts:**
        - [x] Extend node data structure with `childIds: string[]`.
        - [x] Implement basic store logic (`addNode`, `deleteNode`) to manage `childIds` for parent-child relationships.
        - [ ] Implement UI logic to manage `childIds` order (e.g., drag to reorder, creation order). (Future Consideration)
        - [ ] **Custom Layout Hook/Component (`useCustomLayout` or similar):** (Future Consideration)
            - [ ] Identify parent nodes needing custom layout (e.g., via type or flag).
            - [ ] Listen to parent/child changes (size, position, `childIds` list).
            - [ ] Fetch/estimate child node dimensions for precise layout.
            - [ ] Implement specific layout algorithms (e.g., fishbone branches, strict row/column within parent).
            - [ ] Calculate and apply child node positions (relative to parent or absolute).
            - [ ] Update child node positions via store/React Flow methods.
        - [ ] **UI for Custom Parent-Child Relationships:** (Future Consideration)
            - [ ] Design UI for establishing these specific layout relationships (e.g., context menu action "Add as fishbone child").
            - [ ] Define child node drag behavior within custom layouts (constrained, free, or trigger re-layout).
        - [ ] **Performance Considerations for Custom Layouts:** (Future Consideration - dependent on custom layouts)
            - [ ] Employ memoization and optimized change detection.
            - [ ] Investigate batch updates for node positions if performance issues arise.
        - [ ] **Coordination with React Flow `parentNode`:** (Future Consideration - dependent on custom layouts)
            - [ ] Clarify if `parentNode` is still used alongside `childIds` for custom layouts (likely yes, for grouping benefits).
            - [ ] Define precedence if conflicts arise between default library layout and custom layout.
- [x] **Floating Node Creation**: Implement: Double-click on canvas to create a new node at mouse position. New node is selected and label auto-focused.
- [x] **Child Node Creation via "+" Hover Buttons**: Implement: "+" icons on node hover (top, right, bottom, left). Clicking "+" adds a new child node in that direction, connects it, sets `parentNode`, selects, and auto-focuses label.
- [x] **Keyboard-driven Node Creation**: Implement: Selected Node + `Tab` key creates child node. Selected Node + `Enter` key creates sibling node. New nodes are auto-positioned, connected (for child), parented, selected, and label auto-focused (via `editingNodeId`).
- [x] **Auto-focus for New Nodes**: (Implemented with `editingNodeId` state. `PropertiesInspector` uses this to focus its label input).
- [x] **Hierarchical Node Movement**: Verified: React Flow's `parentNode` feature handles moving descendants with parent. (Ensured `parentNode` is managed in store).
- [x] **Recursive deletion of child nodes when parent is deleted**: Implemented in Zustand store's `deleteNode` action.
- [x] **Improved Connector Experience (`OrthogonalEdge.tsx` and beyond):**
    - [x] Custom Edge Type (`OrthogonalEdge.tsx`): Path calculation reviewed and confirmed to produce robust Manhattan-style (HVH/VHV) paths with straight exits/entries and clear label placement across various handle orientations. Sharp/rounded corners logic implemented.
    - [ ] **(Highly Advanced - Future Consideration) Edge Obstacle Avoidance for `OrthogonalEdge`:**
        - [ ] Research pathfinding algorithms (e.g., A* variants suitable for grid/orthogonal paths) or simplified heuristics.
        - [ ] Implement collision detection between edge segments and other node bounding boxes.
        - [ ] Develop strategies for rerouting or adjusting paths (e.g., adding bends, "pushing" segments away from nodes).
        - [ ] Requires access to all node positions/dimensions on the canvas.
        - [ ] Evaluate performance implications thoroughly; may require debouncing or offloading calculation.
        - [ ] Consider if existing pathfinding libraries can be adapted/integrated.
    - [x] **SVG Path Generation Refinements:**
        - [x] Implemented rounded corners at bends using SVG arc commands.
        - [x] Implemented sharp corners for orthogonal edges when segments are too short for rounded bends.
- [x] **Edge Style Editing**:
    - [x] Allow modifying edge label directly on canvas (double-click) - Verified for `OrthogonalEdge`.
    - [x] Allow modifying edge label, color, line type (solid, dashed) from `PropertiesInspector`.
    - [x] Allow modifying arrow styles (start/end: none, arrow, arrowclosed) from `PropertiesInspector`.
- [x] **Snapping Guides**:
    - [x] Full center-to-center and edge-to-edge node snapping implemented with visual guides.
    - [x] Snap-to-grid functionality (nodes align to grid on creation and drag if not node-snapped, node-to-node takes precedence) - Implement and verify.
- [x] **Node Auto-Sizing**: Implement & Verify: Nodes dynamically adjust size based on content (label, details) within min/max Tailwind CSS constraints. Details section becomes scrollable if content exceeds `max-h`. Explicitly set dimensions from store override auto-sizing.
- [x] **Node Dimension Editing**: Implement: Users can set explicit width/height for nodes in `PropertiesInspector`. Clearing reverts to auto-size.
- [x] **Refined Pan & Zoom**:
    - [x] Min/max zoom levels explicitly set (0.1 - 4.0) - Verified active.
    - [x] Modifier key for pan (Spacebar + drag) implemented - Verified.
    - [x] **Panning Extents:**
        - [x] Calculate content bounding box - Implemented via dynamic `translateExtent`.
        - [x] Prevent panning too far beyond content by dynamically setting `translateExtent` - Implemented and verified (padding calculation refined for consistency).
        - [ ] (Optional Refinement) Implement "elastic" edges if hard limits feel too abrupt. (Future Consideration)
    - [x] **Zoom Center (Verification/Enhancement):**
        - [x] Verified default zoom-to-mouse behavior.
        - [ ] (Future Consideration) Consider an option or alternative for zoom-to-center if needed.
    - [ ] **(Highly Advanced - Future Consideration) Level of Detail (LOD) Rendering:**
        - [ ] At small zoom levels, render simplified nodes (e.g., colored rectangles, hide text/details).
        - [ ] Render thinner or simplified edges.
        - [ ] Consider node/data aggregation at very distant zoom levels.
    - [x] **Tool Interaction with Pan/Zoom:**
        - [x] Verified selection mode vs. pan mode (Spacebar) is clear and functional.
        - [x] Test selection box tool behavior during pan/zoom operations - Verified, React Flow default with `selectionOnDrag={true}` works as expected.
    - [x] **Minimap/Navigator Enhancements (If React Flow's default needs more):**
        - [x] Ensure minimap syncs correctly with main canvas pan/zoom. (React Flow default is good) - Verified.
        - [ ] (Future Consideration) Evaluate if custom styling or behavior for minimap is needed.
    - [x] **Touch Support (Verification/Enhancement):**
        - [x] Verified (React Flow defaults enabled & props confirmed): Thoroughly test pinch-to-zoom on touch devices.
        - [x] Verified (React Flow defaults enabled & props confirmed): Test one-finger and two-finger pan on touch devices.
    - [x] Verify/Adjust default pan/zoom sensitivity and step sizes - Verified, React Flow defaults acceptable.
    - [x] Ensure API for programmatic pan/zoom is usable if needed (e.g., focus on node via `fitView` or `setCenter`) - Verified, React Flow provides.
    - [x] Visual grid background added and verified.


### Key Concept Map Editor Components & Functionality (Highly Modularized)
- [x] **`EditorToolbar`**: Provides UI for Save, Add Node, Add Edge. GenAI tools (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) open respective modals. "New Map" and "Export Map" always enabled. "Add Edge" disabled if &lt;2 nodes. Undo/Redo buttons added. Toggle for AI Panel and Properties Inspector. "Expand Concept" and "Summarize Selected Nodes" buttons have context-aware disabling and tooltips.
- [x] **`InteractiveCanvas` (React Flow)**: Core canvas for node/edge display, direct manipulation (drag, create, delete), zoom/pan. Nodes now have 4 connection handles. Managed by `FlowCanvasCore`.
- [x] **`PropertiesInspector`**: Panel for editing map-level (name, visibility, classroom sharing) and selected element (label, details, type, width, height, background color, shape for nodes; label, color, lineType, markerStart, markerEnd for edges) properties. Changes update Zustand store and are saved via toolbar. View-only mode implemented.
    - [x] Granular Node Style Editing: Allow modifying individual node background color, shape (rectangle, ellipse) from `PropertiesInspector`.
- [x] **`GenAIModals`**: Dialogs for `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `QuickClusterModal`, `AskQuestionModal`, `GenerateSnippetModal`, `RewriteNodeContentModal` to interact with AI flows. Context menu now correctly opens these. Logic managed by `useConceptMapAITools`. Modal descriptions updated for clarity on output handling.
- [x] **`AISuggestionPanel`**: Area (toggleable Sheet) displaying AI suggestions (primarily for Extract Concepts, Suggest Relations) with "Add to Map" functionality. Suggestions persist, update status, can be edited before adding, removed from panel after adding. Integration logic handled by `useConceptMapAITools`. "Expand Concept" feature now adds nodes directly to the map, bypassing this panel. Scroll behavior improved (removed nested scrolls).
    - [x] Selective Addition: "Add Selected" and "Add All New/Similar" implemented.
    - [x] "Clear All" button for suggestion categories.
    - [x] Clearer visual cues for suggestion status (exact, similar, new - icons added).
    - [x] Empty states are context-aware.
- [x] **Zustand Store (`concept-map-store.ts`)**: Manages client-side state for the concept map editor, including map data, selections, AI suggestions, and UI states. Undo/Redo history implemented with `zundo`. `parentNode` added to node structure. `childIds` added to node structure and managed on add/delete. `aiProcessingNodeId` added for node-specific AI loading state. Recursive node deletion logic implemented. `editingNodeId` added for auto-focus.
- [x] **Custom Hooks:** `useConceptMapDataManager` (for load/save logic) and `useConceptMapAITools` (for AI modal management and integration) significantly modularize editor logic.

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
    - [x] Add pagination and filtering for lists (Admin User Management and Teacher classrooms pages have pagination and filtering with Supabase; Admin Users now uses virtualization).
    - [x] Add loading spinner to Login/Register pages. (Verified, already implemented).
    - [x] Make header icons link to main dashboards. (Implemented for `DashboardHeader` icons and `Navbar` logo via `iconLinkHref`).
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode. (Verified: controls are disabled as expected).
    - [x] Implement change password functionality on profile page (uses Supabase Auth via API).
    - [x] Developer/Testing: Role switcher on Profile page for testing (local context update).
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination and filtering, delete, edit profile connected to Supabase; add user via register flow. `EditUserDialog` extracted. List now virtualized).
    - [x] Develop system settings interface (Admin Settings page fetches/saves to Supabase via API).

## GenAI & AI Features - In-Editor Enhancements (Whimsical-Inspired) - MARKED COMPLETE
- [x] **File Upload UI Adaptation for Project Analysis**
- [x] **API Endpoint & Backend Processing Pipeline for Project Analysis**
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`)**
- [x] **Modify `generateMapFromProject` Genkit Flow for Tool Use**
- [x] **Output Handling & User Interaction for Project Analysis**
- [x] **Improve Core AI-Powered Concept Mapping Tools (Whimsical-Inspired Focus):**
    - [x] **Canvas-Integrated AI Brainstorming & Expansion**
        - [x] **Context Menu AI Actions:** Expand, Suggest Relations, Extract Concepts, Ask AI Question, Rewrite Content on node context menus (handled by `useConceptMapAITools` and `NodeContextMenu`).
        - [x] **"Quick AI Node/Cluster" on Canvas:** Implemented via Toolbar Modal (`QuickClusterModal`, managed by `useConceptMapAITools`).
        - [x] **AI for Structuring Text into Map Snippets:** Implemented `GenerateSnippetModal` and flow (managed by `useConceptMapAITools`).
    - [x] **Enhanced Context for In-Editor AI Tools** (Context gathering for modals from selected nodes/neighbors is implemented in `useConceptMapAITools`)
    - [x] **Refine "Expand Concept" Interaction**
    - [x] **Implement "Summarize Selected Nodes (AI)" Feature**
    - [x] **Implement "Rewrite Node Content (AI) / Change Tone" Feature**
    - [ ] **Alternative GAI Trigger Points (Future Consideration):**
        - [ ] Implement floating "AI Expand" button (or similar quick action) on selected node hover.
        - [ ] (Future Consideration) Explore slash commands (`/ai ...`) in node text editor for GAI actions.
        - [ ] (Future Consideration) Consider a global AI input box/panel on the canvas for broader queries/commands.
    - [x] **GAI Action Feedback**:
        - [x] Visual cues for AI-generated/modified nodes (type, icon).
        - [x] Implement loading state/spinner directly on/near a node when a GAI action is triggered from its context menu or floating "AI Expand" button (Spinner respects node shape).
    - [ ] **(Highly Advanced - Future Consideration) Explore "AI Structure Suggestions":**
        - [ ] Develop Genkit flow to analyze map structure & content.
        - [ ] Define criteria for "good" structure suggestions (e.g., grouping related ideas, suggesting missing links).
        - [ ] Design UI for presenting structure suggestions (e.g., non-intrusive hints on canvas or in AI panel).
        - [ ] Implement user actions to accept/reject suggestions.
    - [x] **Iterate on GenAI Prompts for Quality & Relevance:** (Prompts refined for core tools, an ongoing process).
- [x] **Refine `AISuggestionPanel` Workflow & User Experience:**
    - [x] Clearer visual cues for suggestion status (exact, similar, new - icons added).
    - [x] "Clear All" button for suggestion categories.
    - [x] Selective Addition: "Add Selected" and "Add All New/Similar" implemented.
    - [x] Empty states are context-aware.
    - [x] Scroll behavior improved (removed nested scrollbars for categories).
- [x] **Improve General AI User Experience (UX) for In-Editor Tools:**
    - [x] Tooltips & In-UI Guidance (Modals updated with clearer descriptions of output handling. Toolbar button tooltips and disable states refined. Floating node AI button tooltip improved).

## GAI Concept Map Refactoring (Whimsical-Inspired Enhancements II)
### Enhanced In-Canvas AI Interactions
- [x] "AI Quick-Add" / Floating AI Suggestions:
    - [x] On empty canvas right-click: Suggest common starting points or nodes based on recent activity. (Done via Floater)
    - [x] Interaction: Clicking a suggestion triggers AI action or adds node. Dismissed on mouse out or Esc. (Done via Floater)
    - [ ] On node selection/right-click: Floater currently shows *actions*. Enhance to also show temporary "ghost" nodes/suggestion *chips for direct content addition* (e.g., "Child: [AI suggested text]").
- [x] "AI Contextual Mini-Toolbar" on Node Hover/Selection:
    - [x] Display a small, floating toolbar near selected/hovered node with 2-3 most relevant AI actions (e.g., Expand, Summarize, Rewrite).
    - [x] Interaction: Icons for quick actions. Clicking an icon performs a default action or opens a streamlined input. (Core AI connections made, further refinement of actions can continue)
- [x] Drag-and-Drop from AI Panel with Preview:
    - [x] Allow dragging concepts/relations from AISuggestionPanel directly onto the canvas.
    - [ ] Interaction: Show a preview of the node/edge under the cursor during drag. Activate snapping guides. Release creates the element. (Dragging concepts done, preview on drag is a UX enhancement for later)

### Iterative and Preview-Oriented AI Generation
- [x] "AI Staging Area" for Cluster/Snippet Generation:
    - [x] For "Quick AI Cluster" / "Generate Snippet": Output AI-generated elements into a temporary "staging area" on canvas or as a special selection group. (Store logic done, UI for stage elements done)
    - [x] Staging Area Interaction: Allow deletion of individual suggestions, quick label edits, slight repositioning. (Deletion of selected staged items done)
    - [x] Add "Commit to Map" button to finalize, and "X"/Esc to discard from staging area. (Toolbar with buttons done)
- [x] Refinable "Expand Concept" Previews:
    - [x] When "Expand Concept" is used, first show new child nodes as temporary "ghost" nodes.
    - [x] Interaction: Allow clicking individual ghost nodes to accept. Add "Accept All" / "Cancel" controls. (Core acceptance logic done via click and floater)
    - [ ] Interaction (Enhancement): Display "Refine" icon on hover over a ghost node to alter its suggestion before acceptance.

### AI-Powered Layout and Structuring Assistance
- [ ] "AI Tidy-Up" / Smart Alignment (Contextual):
    - [ ] On selection of multiple nodes, offer an "AI Tidy selection" option (mini-toolbar/context menu).
    - [ ] AI attempts to align, distribute, or semantically group (e.g., temporary parent node).
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
- [ ] "Suggest Intermediate Node" on Edge Selection:
    - [ ] If an edge is selected, AI action to "Suggest intermediate concept".
    - [ ] AI proposes a node to sit between source/target, splitting original edge and linking through the new node.

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
- [x] **Rendering:**
    - [x] **Virtualization (Occlusion Culling for Canvas):** Investigated and `onlyRenderVisibleElements` applied.
    - [ ] (Future Consideration) **Layered Rendering:** Consider separating static elements (like complex backgrounds or many edges) from interactive elements (nodes) if performance degrades with many edges. (React Flow's approach offers some implicit layering).
- [x] **Interactions:**
    - [x] **Event Throttling/Debouncing:**
        - [x] Verified React Flow's internal event handling for drag/zoom for common scenarios. Snapping logic is lightweight.
        - [ ] (Future Consideration) If custom heavy interactions are added (e.g., advanced orthogonal edge routing), implement throttling/debouncing for them.
- [x] **Data Handling & General:**
    - [x] **Image Optimization:** Reviewed and confirmed that important images use `next/image` with necessary props or are SVGs. Generic `<img>` tags are not prevalent for content images.
    - [x] **Large List Rendering:**
        - [x] Implement virtualization for Admin User Management page using `@tanstack/react-virtual`.
        - [x] Implement virtualization for Teacher Classroom Student List using `@tanstack/react-virtual`.
    - [x] **React Component Memoization:**
        - [x] Key callbacks in `ConceptMapEditorPage` memoized with `useCallback`.
        - [x] Key reusable display components memoized with `React.memo` (`DashboardHeader`, `DashboardLinkCard`, `QuickActionsCard`, `EmptyState`, list items, `CustomNodeComponent`, `OrthogonalEdge`, `EditorToolbar`, `Navbar`, `SidebarNav`).
        - [x] Tab components in Teacher Classroom Detail page (`ClassroomStudentsTab`, `ClassroomMapsTab`, `ClassroomSubmissionsTab`) memoized with `React.memo`.
    - [x] **Code Splitting:**
        - [x] Use `next/dynamic` for `FlowCanvasCore`.
        - [x] Use `next/dynamic` for `AISuggestionPanel` and `PropertiesInspector` in `ConceptMapEditorPage`.
        - [x] Use `next/dynamic` for GenAI modals in `ConceptMapEditorPage`.
        - [x] Use `next/dynamic` for `DebugLogViewerDialog` in `ConceptMapEditorPage`.
    - [ ] **Bundle Size Analysis:** (Future Task - Out of Scope for AI Agent) Periodically analyze the application bundle size and identify areas for reduction.
    - [x] Removed redundant `CanvasPlaceholder.tsx`.
    - [x] Removed redundant `/application/layout.tsx`.
    - [x] Ensured React Flow `nodeTypes` and `edgeTypes` are stable references.

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
- [x] **Connect frontend classroom UI (teacher, student) to live API (with Supabase service).** (Teacher detail page modularized with tabs.)

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
- Concept map canvas is React Flow. Undo/Redo implemented with `zundo`. Editor logic highly modularized with custom hooks. `editingNodeId` added for auto-focus in Properties Inspector. Node hierarchy (`parentNode`, `childIds`) and recursive deletion implemented in store. Floating node creation (double-click) and keyboard node creation (Tab/Enter) implemented. Pan/Zoom refined with dynamic `translateExtent` and Spacebar panning. Node snapping (node-to-node & grid) with visual guides implemented. Orthogonal edges have rounded/sharp corners. Node auto-sizing and explicit dimension/style editing via Properties Inspector implemented. Child node creation via hover "+" buttons is implemented. Visual grid background is active. Node-specific AI loading spinner implemented.
- AI for project analysis uses mock project structure (`projectStructureAnalyzerTool`); needs real file processing from Supabase Storage by the user if desired. `projectStructureAnalyzerTool` mock logic has been enhanced for varied outputs based on hints and a fixed mock project structure.
- Supabase client library installed and configured. User needs to run typegen for `src/types/supabase.ts`.
- API routes rely on Supabase-backed services. RLS in Supabase is the primary data access control.
- Client-side file upload for project analysis uploads to Supabase Storage (bucket 'project_archives').
- Admin User Management page and Profile Page are connected to Supabase for CRUD and password changes. Admin User list is virtualized. Teacher classroom student list is virtualized.
- Dashboard counts are fetched from Supabase-backed APIs using custom hooks, which also respect `BYPASS_AUTH_FOR_TESTING`. `QuickActionsCard` integrated.
- Classroom management, Concept Map management, and Student Submissions list are connected to Supabase and use modular components. Student Classroom Detail page implemented.
- The application is highly modular, with reusable components for UI patterns, custom hooks for complex logic, and service layers for backend interaction.
- Core in-editor AI features (Extract Concepts, Suggest Relations, Expand Concept, Quick Cluster, Generate Snippet, Summarize Selection, Rewrite Content) are implemented with specific visual cues for AI-generated/modified nodes. "Expand Concept", "Summarize Selection", and "Rewrite Content" now directly add/modify content on the map. Context menu AI actions are fully wired up.
- View-only mode for concept map editor is implemented. `PropertiesInspector` is fully refined for view-only mode.
- Developer role switcher added to profile page for easier testing.
- Developer test buttons previously on Project UploadForm have been removed for simplicity.
- `AISuggestionPanel` enhancements (visual cues, clear buttons, context-aware empty states) are implemented.
- Key callbacks in `ConceptMapEditorPage` and several reusable display components have been memoized with `React.memo` or `useCallback`. Components within teacher classroom detail tabs are also memoized. `EditorToolbar`, `Navbar`, `SidebarNav` are memoized. Toolbar AI buttons ("Expand Concept", "Summarize Selection") have context-aware disabling and tooltips.
- React Flow canvas uses `onlyRenderVisibleElements` for potential performance improvement on large maps. React Flow `nodeTypes`/`edgeTypes` warnings resolved.
- `PropertiesInspector`, `AISuggestionPanel`, all GenAI modals, and `DebugLogViewerDialog` are dynamically imported in `ConceptMapEditorPage`.
- Redundant `CanvasPlaceholder.tsx` and `/application/layout.tsx` files have been removed.

This covers a very large portion of the Supabase integration tasks and modularization. The application is now significantly more robust, data-driven, and maintainable.
The main remaining area for full Supabase connection is:
*   Making the `projectStructureAnalyzerTool` actually process files from Supabase Storage (currently out of scope for me to implement the actual file parsing logic).
*   Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
*   Thorough testing and deployment preparations (out of scope).

Advanced Editor Enhancements (From User Document):
*   See "Whimsical-Inspired Editor UX Enhancements" sub-sections above for items from this document.

```
