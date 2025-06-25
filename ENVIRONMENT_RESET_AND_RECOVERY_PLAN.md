# Environment Reset and Code Recovery Plan

This document outlines the issues encountered with the development tool environment and the steps to reset it, followed by the plan for restoring previously completed work.

## 1. Summary of Observed Tool/Environment Issues

During recent development attempts, persistent stability issues with the automated coding tools have been observed. These include:

*   **Incorrect Task Execution:** Subtasks (automated code modification or script execution actions) have been frequently re-running operations from much earlier in the session, rather than the currently requested task.
*   **File System Instability:** Requested file modifications (creating new files, changing existing files) sometimes do not persist, appear to be rolled back, or are not applied as instructed.
*   **Inability to Retrieve Execution Output:** When subtasks involve running scripts to test functionality or gather data (like logs), the environment has often failed to return the output of these scripts, usually due to the aforementioned rollbacks or other unexpected errors during file system reconciliation by the tool.

These issues make it unreliable to proceed with new coding, refactoring, or even detailed testing that involves file system changes or script execution, as the integrity and success of these operations cannot be guaranteed.

## 2. Instructions for Operator - Phase 1: New Environment Initialization

**Objective:** Create a 100% clean, trustworthy working directory for the project, abandoning the old one. These steps should be performed by a human operator with direct access to the development environment.

**Steps:**

1.  **Backup Critical Untracked Files (if any) from the OLD Project Directory:**
    *   Manually check the *current, old* project directory for important files not tracked by Git (e.g., `.env`, `.env.local`, personal notes, uncommitted local experiments).
    *   Copy these essential untracked files to a safe, temporary location *outside* the old project directory.

2.  **Create a Brand New Workspace (Crucial Step):**
    *   Navigate to a directory *outside* the current project folder (e.g., if the project is in `~/projects/old-project-name`, navigate to `~/projects/`).
    *   Clone the repository into a **new folder** with a fresh name:

        *(Replace `<repository_url>` with the project's actual Git repository URL, and `<new_project_directory_name>` with a new name like `project-fresh-start` or `concept-map-clean-env`)*.
    *   **Important:** Do not perform these operations inside the old, potentially problematic project directory.

3.  **Navigate into the New Project Directory and Set Up Branch:**

    *(Replace `<main_development_branch>` with the primary branch used for development, e.g., `main`, `develop`, or the specific branch from which recent successful work was based. This should be the branch containing all previously submitted GAI features and planning work.)*

4.  **Install Dependencies:**
    *   Based on the project's package manager:
        *   If using `npm`:

        *   If using `yarn`:


5.  **Initial Verification:**
    *   Attempt to start the development server:

        *(or the project's specific command, e.g., `yarn dev`)*.
    *   Confirm that the project starts successfully without immediate critical errors. A basic launch confirmation is sufficient at this stage.

6.  **Inform Jules (AI Agent):**
    *   Once these steps are complete, please notify Jules that 'Operator Phase 1 is complete.'
    *   Specify the absolute path to the `<new_project_directory_name>` if Jules's tools might require it to target the correct workspace.

## 3. Next Steps for Jules (AI Agent) - Phase 2: Code Restoration & Validation

Once the new, clean environment is confirmed to be ready and accessible:

<<<<<<< HEAD
1.  **Verify Access:** Perform a simple read operation (e.g., `ls` in the new project root, or reading `package.json`) to confirm tools are targeting the new directory.

2.  **Systematic Code Re-application:** The following features and fixes, previously completed and submitted, will be re-applied systematically. Each major feature will be committed separately if possible to isolate changes.

    *   **Batch 1: Core GAI Features & Foundational Fixes:**

        *   **A. Core Node Display Fixes:**
            *   **File:** `src/stores/concept-map-store.ts`
                *   In `addNode` action: Define `NODE_DEFAULT_WIDTH = 150`, `NODE_DEFAULT_HEIGHT = 70`.
                *   Ensure `newNode` object creation uses these defaults for `width` and `height` if not provided in `options` (e.g., `width: options.width ?? NODE_DEFAULT_WIDTH`).
            *   **File:** `src/components/concept-map/flow-canvas-core.tsx`
                *   Refactor node and edge synchronization: Remove `useMemo` for `initialRfNodes`/`initialRfEdges` that were passed to `useNodesState`/`useEdgesState` initializers.
                *   Initialize `useNodesState` and `useEdgesState` for main map elements, staged elements, and preview elements with empty arrays (`[]`).
                *   Implement distinct `useEffect` hooks for each set (main, staged, preview) that:
                    *   Depend on their respective source data from the store (e.g., `mapDataFromStore.nodes` for main nodes).
                    *   Map the source data to React Flow compatible node/edge arrays.
                    *   Call the appropriate `setRfNodes` / `setRfEdges` (or `setRfStagedNodes`, `setRfPreviewNodes`, etc.).
                    *   Ensure flags like `isStaged: true` or `isGhost: true` are correctly applied in the `data` object of respective nodes during mapping.

        *   **B. AI Contextual Mini-Toolbar:**
            *   **File:** `src/components/concept-map/ai-mini-toolbar.tsx` (Create if not present)
                *   Define component with props: `nodeId`, `nodeRect`, `isVisible`, `onQuickExpand`, `onRewriteConcise`.
                *   Layout with buttons for "Quick Expand" and "Rewrite Concise".
            *   **File:** `src/components/concept-map/custom-node.tsx`
                *   Add hover state (`isHoveredForToolbar`) and `nodeRef`.
                *   Conditionally render `AISuggestionMiniToolbar` on hover (if not `isGhost` or `isViewOnlyMode`).
                *   Pass handlers that will call AI tool hook functions.
            *   **File:** `src/hooks/useConceptMapAITools.ts`
                *   Implement `handleMiniToolbarQuickExpand(nodeId)`: Calls `aiExpandConcept` (prompted for one idea), then sets `conceptExpansionPreview` (as per "Refinable Expand" logic).
                *   Implement `handleMiniToolbarRewriteConcise(nodeId)`: Calls `aiRewriteNodeContent` (prompted for conciseness), updates node in store.
            *   **File:** `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
                *   Ensure `useConceptMapAITools` is used and its functions are available for `CustomNodeComponent` to call (e.g. by `CustomNodeComponent` using the hook directly).

        *   **C. AI Quick-Add / Floating AI Suggestions (`AISuggestionFloater`):**
            *   **File:** `src/components/concept-map/ai-suggestion-floater.tsx` (Create if not present)
                *   Define component with props: `isVisible`, `position`, `suggestions: SuggestionAction[]`, `onDismiss`, `title?`.
                *   Renders a floating panel with clickable suggestion items. Handles Escape/click-outside for dismissal.
            *   **File:** `src/hooks/useConceptMapAITools.ts`
                *   Implement `getPaneSuggestions(panePosition)`: Returns `SuggestionAction[]` for pane context.
                *   Implement `getNodeSuggestions(node)`: Returns `SuggestionAction[]` for node context.
            *   **File:** `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
                *   Add `floaterState` to manage visibility, position, suggestions.
                *   Implement `handlePaneContextMenuRequest` and `handleNodeContextMenuRequest` to use suggestion getters and update `floaterState`.
                *   Implement `Floater_handleDismiss`.
            *   **File:** `src/components/concept-map/flow-canvas-core.tsx`
                *   Add `onPaneContextMenuRequest` and `onNodeContextMenuRequest` props.
                *   Implement `onPaneContextMenu` and `onNodeContextMenu` handlers.

        *   **D. AI Staging Area:**
            *   **File:** `src/stores/concept-map-store.ts`
                *   Add state: `stagedMapData`, `isStagingActive`. Actions: `setStagedMapData`, `clearStagedMapData`, `commitStagedMapData`.
            *   **File:** `src/hooks/useConceptMapAITools.ts`
                *   Refactor `handleClusterGenerated`, `handleSnippetGenerated` to call `setStagedMapData`.
            *   **File:** `src/components/concept-map/flow-canvas-core.tsx`
                *   Subscribe to staging state. Add `rfStagedNodes`, etc. `useEffect` to map `stagedMapData` with `isStaged: true` flag. Add to `combinedNodes`.
            *   **File:** `src/components/concept-map/custom-node.tsx`
                *   Add `isStaged?: boolean` to `CustomNodeData`. Apply distinct styling.
            *   **File:** `src/components/concept-map/ai-staging-toolbar.tsx` (Create)
                *   Props: `isVisible`, `onCommit`, `onClear`, `stagedItemCount`.
            *   **File:** `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
                *   Integrate `AIStagingToolbar`. Implement deletion from stage.

        *   **E. AI-Suggested Relation Labels:**
            *   **File:** `src/ai/flows/suggest-edge-label.ts` (Create) - `suggestEdgeLabelFlow`.
            *   **File:** `src/hooks/useConceptMapAITools.ts`
                *   Add `edgeLabelSuggestions` state (e.g. an object with edgeId and labels array). Implement `fetchAndSetEdgeLabelSuggestions`.
            *   **File:** `src/stores/concept-map-store.ts`: `addEdge` returns new edge ID.
            *   **File:** `src/components/concept-map/flow-canvas-core.tsx`: `handleRfConnect` calls `props.onNewEdgeSuggestLabels`.
            *   **File:** `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`:
                *   `useEffect` on `edgeLabelSuggestions` shows `AISuggestionFloater`. Actions call `updateStoreEdge`.

        *   **F. Refinable 'Expand Concept' Previews:**
            *   **File:** `src/stores/concept-map-store.ts`
                *   Add state: `conceptExpansionPreview`. Action: `setConceptExpansionPreview`.
            *   **File:** `src/hooks/useConceptMapAITools.ts`
                *   Refactor `handleConceptExpanded`, `handleMiniToolbarQuickExpand` to call `setConceptExpansionPreview`.
                *   Implement `acceptAllExpansionPreviews`, `acceptSingleExpansionPreview`, `clearExpansionPreview`.
            *   **File:** `src/components/concept-map/flow-canvas-core.tsx`
                *   Subscribe to preview state. Add `rfPreviewNodes`, etc. `useEffect` to map `conceptExpansionPreview.previewNodes` with `isGhost: true` flag. Add to `combinedNodes`. Implement `onNodeClick` for ghost acceptance.
            *   **File:** `src/components/concept-map/custom-node.tsx`
                *   Add `isGhost?: boolean` to `CustomNodeData`. Apply styling. Disable hover toolbar.
            *   **File:** `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
                *   Pass `acceptSingleExpansionPreview` as `onGhostNodeAcceptRequest`. `useEffect` on preview state shows `AISuggestionFloater` with Accept All/Clear All actions.

    *   **Batch 2: Initial Refactoring Plan Code (Interfaces & Store Actions):**

        *   **A. Create `src/types/graph-adapter.ts`:**
            *   Define interfaces for Dagre and GraphAdapter utilities.
        *   **B. Implement `applyLayout` Action in `src/stores/concept-map-store.ts`:**
            *   Add `applyLayout(updatedNodePositions: LayoutNodeUpdate[])` action.
        *   **C. Refactor `deleteNode` Action in `src/stores/concept-map-store.ts`:**
            *   Modify `deleteNode` to use (mocked) `GraphAdapter.getDescendants`.

3.  **Final Verification (Attempt Previously Failed UI Task):**

    *   **A. Add "Auto-layout Map" Button to `src/components/concept-map/editor-toolbar.tsx`:**
        *   Add button, icon, props for `onAutoLayout`.
    *   **B. Connect Button in `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`:**
        *   Define placeholder `handleAutoLayout`. Pass prop to `EditorToolbar`.

4.  **Submit Restored Work:** (If all successful)
    *   Commit all changes to a new branch.

5.  **Await Further Instructions:** Report completion.
=======
1.  **Verify Access:** Perform a simple read operation (e.g., `ls` in the new project root) to confirm tools are targeting the new directory.
2.  **Systematic Code Re-application:**
    *   **Batch 1: Core GAI Features & Fixes:** Re-implement (via focused subtasks) the previously completed and submitted features:
        *   Core Node Display Fixes (default dimensions in store, `FlowCanvasCore` sync logic).
        *   AI Contextual Mini-Toolbar.
        *   AI Quick-Add / Floating AI Suggestions.
        *   AI Staging Area (including store changes, display logic, toolbar, and delete-from-stage).
        *   AI-Suggested Relation Labels.
        *   Refinable 'Expand Concept' Previews.
    *   **Batch 2: Initial Refactoring Plan Code:** Re-apply the committed planning artifacts and initial store changes:
        *   Create `src/types/graph-adapter.ts` with interface definitions.
        *   Implement the `applyLayout` action in `src/stores/concept-map-store.ts`.
        *   Implement the refactored `deleteNode` action (with its mock adapter) in `src/stores/concept-map-store.ts`.
3.  **Final Verification:** Attempt the previously failing UI task as a key test:
    *   Add the "Auto-layout Map" button to `EditorToolbar.tsx`.
    *   Connect this button in the editor page (`page.tsx`) to its (initially placeholder) handler.
4.  **Submit Restored Work:** If all re-application and verification steps are successful, commit the consolidated, restored work to a new branch in the clean repository.
5.  **Await Further Instructions:** Report completion to you and await direction for new development tasks based on the updated `TODO.md`.

>>>>>>> master
---
