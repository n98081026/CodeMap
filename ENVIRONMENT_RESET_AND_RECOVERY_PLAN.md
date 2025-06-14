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
        ```bash
        git clone <repository_url> <new_project_directory_name>
        ```
        *(Replace `<repository_url>` with the project's actual Git repository URL, and `<new_project_directory_name>` with a new name like `project-fresh-start` or `concept-map-clean-env`)*.
    *   **Important:** Do not perform these operations inside the old, potentially problematic project directory.

3.  **Navigate into the New Project Directory and Set Up Branch:**
    ```bash
    cd <new_project_directory_name>
    git checkout <main_development_branch>
    ```
    *(Replace `<main_development_branch>` with the primary branch used for development, e.g., `main`, `develop`, or the specific branch from which recent successful work was based. This should be the branch containing all previously submitted GAI features and planning work.)*

4.  **Install Dependencies:**
    *   Based on the project's package manager:
        *   If using `npm`:
            ```bash
            npm install
            ```
        *   If using `yarn`:
            ```bash
            yarn install
            ```

5.  **Initial Verification:**
    *   Attempt to start the development server:
        ```bash
        npm run dev
        ```
        *(or the project's specific command, e.g., `yarn dev`)*.
    *   Confirm that the project starts successfully without immediate critical errors. A basic launch confirmation is sufficient at this stage.

6.  **Inform Jules (AI Agent):**
    *   Once these steps are complete, please notify Jules that 'Operator Phase 1 is complete.'
    *   Specify the absolute path to the `<new_project_directory_name>` if Jules's tools might require it to target the correct workspace.

## 3. Next Steps for Jules (AI Agent) - Phase 2: Code Restoration & Validation

Once the new, clean environment is confirmed to be ready and accessible:

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

---
