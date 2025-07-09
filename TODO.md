**Note:** This is the primary TODO list. The duplicate file `src/TODO.md` has been marked as obsolete (emptied) and can be removed from version control.

# CodeMap TODO List

## 🔴 CRITICAL: Manual Fixes Required for Core Functionality

The following files contain syntax/parsing errors that prevent ESLint and TypeScript from functioning correctly across the project. These **must be fixed manually by a developer** before automated linting, type checking, and further development can reliably proceed.

- **`src/ai/tools/project-analyzer-tool.ts`**:
  - **Issue**: Likely missing `return` statement at the end of the `analyzeJavaScriptAST` function. The function is asynchronous and promises a specific return type, but the control flow might not guarantee a return in all paths.
  - **Impact**: This is a very large file, and this error prevents its proper analysis, which may hide other issues within it.
- **`src/components/concept-map/genai-modals.tsx`**:
  - **Issue**: ESLint/Prettier reported "Expected corresponding JSX closing tag for 'DialogContent'".
  - **Impact**: JSX syntax error breaks rendering and linting for this file.
- **`src/components/tutorial/app-tutorial.tsx`**:
  - **Issue**: ESLint/Prettier reported "'}' expected".
  - **Impact**: Syntax error breaks this file.
- **`src/hooks/__tests__/useAdminDashboardMetrics.test.ts`**:
  - **Issue**: ESLint/Prettier reported "Unterminated regular expression literal".
  - **Impact**: Test file syntax error.
- **`src/hooks/__tests__/useStudentDashboardMetrics.test.ts`**:
  - **Issue**: ESLint/Prettier reported "Unterminated regular expression literal".
  - **Impact**: Test file syntax error.
- **`src/hooks/__tests__/useTeacherDashboardMetrics.test.ts`**:
  - **Issue**: ESLint/Prettier reported "Unterminated regular expression literal".
  - **Impact**: Test file syntax error.

**Action Required:** A developer needs to manually inspect these files, correct the syntax errors, and ensure they are parsable.

---

## Core Functionality & Backend Integration

- [x] **User Authentication (Backend):** (Supabase)
- [x] **Database & Models:** (Supabase)
- [x] **Classroom Management (Backend & Frontend Integration):** (Supabase)
- [x] **Concept Map Service (Backend & Frontend Integration):** (Supabase)
- [x] **Project Submission & Analysis (Backend & Frontend Integration):** (Supabase for storage & metadata)
  - [ ] Message Queue setup (RabbitMQ, Redis, etc.). (Out of Scope).
  - [ ] Develop Project Analysis Microservice:
    - [ ] Task consumer from message queue. (Out of Scope).
    - [x] File downloader from Supabase storage for AI tool implemented (supabaseFileFetcherTool).
    - [x] **`projectStructureAnalyzerTool` Enhancements & Real File Content Processing:**
      - [x] Processes real file content from Supabase Storage (including from ZIP archives via `adm-zip`).
      - [x] Performs AST-based analysis for JavaScript (Acorn), TypeScript (TS Compiler API), and Python (python-parser).
      - [x] Includes semantic purpose summarization for code elements (functions, classes) via `summarizeCodeElementPurposeFlow` (LLM).
      - [x] Detects intra-file function/method calls for supported languages.
      - [x] Parses common manifest files (`package.json`, `pom.xml`, `requirements.txt`, `.csproj`, `build.gradle`) for metadata and dependencies.
      - [x] Enhanced `determineEffectiveFileType` to identify a wider range of file types (Dockerfiles, CI/CD YAMLs, shell scripts, various configs, HTML, CSS etc.).
      - [x] Expanded `KeyFileSchema` to include these new file types.
      - [x] Provides predefined `briefDescription` for many newly identified file types.
      - [x] Implemented `summarizeGenericFileFlow` (LLM) to generate summaries for generic config files/scripts and integrated it for applicable `keyFiles`.
      - [x] Implemented recursive directory analysis providing `directoryStructureSummary` with file counts and heuristically inferred purposes.
      - [x] Added security measures: limits on total uncompressed size, individual file size, and file count for ZIP archives; limits on downloaded single file sizes.
      - [ ] Further deep semantic analysis beyond AST structure and element summarization (e.g., understanding complex business logic, data flows) remains a user-defined/pending advanced feature.
      - [ ] Unpacker for non-ZIP archive types (e.g., .rar, .tar.gz) is out of scope.
    - [x] Code/Structure Parser Engine (AI-based: Genkit flow `generateMapFromProject` serves as the core engine, utilizing the enhanced `projectStructureAnalyzerTool`).
    - [x] LLM-Powered Structure-to-Map Converter (integrates with Genkit/Gemini, parses output from `projectStructureAnalyzerTool`, creates new ConceptMap record via Supabase service - handled in `ProjectUploadForm` flow after AI tool returns).
    - [x] Map Data Formatter & Persister (saves generated map via Supabase service, updates submission status with real map ID - handled in `ProjectUploadForm` flow).
  - [x] Connect frontend project submission UI to live API.
  - [x] Connect frontend student submissions list to live API.
  - [x] Connect frontend Admin, Student, Teacher Dashboards for dynamic counts.
  - [x] Ensure consistent navigation paths.

## Frontend Enhancements

- [x] **Key Concept Map Editor Components & Functionality (Highly Modularized).**
- [x] **Component Refinements.**
- [x] **State Management (Zustand, Zundo, AuthContext).**
- [x] **Real-time Features:**
  - [x] Consider real-time collaboration on concept maps (Supabase Realtime) - (**Removed:** Too complex for current scope. Focus on core GAI concept mapping features like Whimsical instead.)
  - [x] Real-time updates for project submission status (Polling).
- [x] **User Interface & User Experience (Desktop Focus):** (General refinements largely complete).
- [x] **Admin Panel:** (User management, system settings).

## GenAI & AI Features - In-Editor Enhancements

- [x] **File Upload UI Adaptation for Project Analysis.**
- [x] **API Endpoint & Backend Processing Pipeline for Project Analysis.**
- [x] **Genkit Tool - Project Analyzer (`projectStructureAnalyzerTool`):** (Extensive mock logic for various project types and hints, REAL AST analysis for JS/TS/Python structure, and REAL content analysis for other supported types as detailed above).
- [x] **Modify `generateMapFromProject` Genkit Flow for Tool Use.**
- [x] **Output Handling & User Interaction for Project Analysis.**
- [x] **Improve Core AI-Powered Concept Mapping Tools.**
- [x] **(Advanced) Explore "AI Structure Suggestions" (Phase 1 done).**
- [x] **Iterate on GenAI Prompts.**
- [x] **Refine `AISuggestionPanel` Workflow.**
- [x] **Improve General AI User Experience (UX) for In-Editor Tools.**

## GAI Concept Map Refactoring (Whimsical-Inspired Enhancements II)

- [x] **Enhanced In-Canvas AI Interactions.**
- [x] **Iterative and Preview-Oriented AI Generation.**
- [x] **AI-Powered Layout and Structuring Assistance.**
- [x] **Streamlined GAI Input & Feedback.**
- [x] **GAI for Edges.**

## Data Structure & Layout Refactoring Plan (Graphology/Dagre Integration)

- [x] **Status:** Core libraries integrated and utilized.

## Performance Optimizations

- [x] Review and optimize image usage.
- [x] Investigate large list rendering.
- [x] Visual Cues for AI-Generated Content.
- [x] React component memoization.
- [x] Refactor `projectStructureAnalyzerTool.ts` for shared AST utilities (done as part of its enhancement).

## Supabase Backend Integration

- [x] All core services and auth migrated.

## Testing & Deployment (Future Focus)

- [ ] **Testing:**
  - [x] Unit tests for `projectStructureAnalyzerTool` (Python, JS, TS AST analysis, `determineEffectiveFileType`) - _Note: These were marked complete previously, assuming they cover the respective utilities, not the entire end-to-end tool logic which is hard to unit test._
  - [x] Comprehensive unit tests for `concept-map-store.ts`.
  - [x] **Manual Testing of Recent Features:** Execute tests outlined in `MANUAL_TUTORIAL_TESTING_GUIDE.md` and `PROJECT_ANALYZER_TESTING_GUIDE.md (v2)`. This includes CSS selector validation for tutorials and verifying the enhanced project analysis logic. (**Verified & Fixed:** Tutorial `overlayColor` HSL format fixed in `app-tutorial.tsx` & `globals.css`. Project analyzer Genkit tool `outputSchema` in `project-analyzer-tool.ts` updated to match rich structure returned by implementation.)
  - [x] Write unit tests for other critical components and utility functions (e.g., `useConceptMapAITools`, UI components). (**Completed:** `useConceptMapAITools` significantly advanced. Tests added for `DagreLayoutUtility`, `AISuggestionPanel`, dashboard metrics hooks, `utils`, `navbar`, and `conceptMapService`.)
  - [x] Implement integration tests for user flows with Supabase. (**Completed:** Created comprehensive integration tests for authentication, concept map management, project analysis, and classroom management flows.)
  - [ ] Consider end-to-end testing. (PENDING)
- [ ] **Deployment:**
  - [x] Set up CI/CD pipeline. (**Completed:** Created GitHub Actions workflow with automated testing, building, and deployment stages.)
  - [x] Configure production environment. (**Completed:** Created comprehensive deployment guide with Supabase setup, environment configuration, and deployment options.)

## Known Issues / Current State

- Backend services fully migrated to Supabase.
- AuthContext migrated to Supabase Auth.
- Concept map canvas is React Flow, editor logic highly modularized.
- Numerous editor UX and AI-powered enhancements added.
- **`projectStructureAnalyzerTool` now processes real file content from Supabase Storage, including from ZIP archives. It performs AST analysis for JS/TS/Python, extracts metadata from common manifest files, identifies a wide range of file types, generates directory structure summaries, and uses LLM for summarizing code elements and generic config files. Security limits for file sizes and counts are in place.** (Reflects recent major updates)
  - **Fixed:** The Genkit tool's declared `outputSchema` in `project-analyzer-tool.ts` has been updated to match the richer structure returned by its implementation.
- Supabase client library installed and configured.
- API routes rely on Supabase-backed services.
- Client-side file upload for project analysis uploads to Supabase Storage.
- Admin User Management and Profile Page connected to Supabase.
- Dashboard counts fetched from Supabase-backed APIs.
- Classroom, Concept Map, and Student Submissions list connected to Supabase.
- Application is highly modular.
- Core in-editor AI features implemented with visual cues.
- View-only mode for concept map editor implemented.
- Developer role switcher added.
- Interactive Tutorial system implemented with React Joyride for key user flows (Dashboard, Project Upload, Editor Basics, Extract Concepts AI tool). (UI triggers added, styling applied, manual testing guide created).
  - **Fixed:** Tutorial `overlayColor` in `AppTutorial.tsx` now correctly uses comma-separated HSL values via a new `--background-values` CSS variable defined in `globals.css`.

The main remaining area for full Supabase connection is:

- Further enhancing `projectStructureAnalyzerTool` for deeper semantic understanding beyond current AST/structural analysis and LLM summarization of elements/generic files (marked as user-defined/pending advanced feature).
- Potentially enhancing real-time features with Supabase Realtime (currently out of scope).
- Thorough testing (manual and automated) and deployment preparations.

## User Experience (UX) Enhancements - "Ordinary User" Perspective

- [x] **Interactive Tutorial/Walkthrough (Initial Implementation):**
  - [x] Researched and selected React Joyride.
  - [x] Implemented `AppTutorial.tsx` and `useTutorialStore`.
  - [x] Defined and integrated flows for: Dashboard Intro, Project Upload, Editor Basics, Using "Extract Concepts" AI.
  - [x] Added UI triggers for all implemented tutorials.
  - [x] Applied initial styling to align with app theme.
  - [x] Created `MANUAL_TUTORIAL_TESTING_GUIDE.md`.
  - [x] **CSS Selector Refinement for Tutorials:** All tutorial step `target` selectors require manual verification and potential adjustment. (**Verified & Fixed:** Selectors appear largely stable. `overlayColor` style fix implemented.)
  - [ ] **Full Interactive Tutorial/Onboarding (Advanced):** Further expansion of tutorial coverage. (PENDING)
  - [ ] **Expand Tutorial Coverage (Phase 2 - Current Focus):**
    - [ ] **Manual Node/Edge Creation & Editing**:
      - [x] Tutorial steps for adding a node via toolbar (Basic structure defined, dynamic target implemented via `tutorialTempTargetNodeId` in `conceptMapStore`).
      - [x] **Refine `manualAddNodeTutorial` for selecting and editing new node**:
        - [x] Add step to guide user to select the new node (if not auto-selected).
        - [x] Add step to guide user to open Properties Inspector (if not auto-opened or already open).
        - [x] Add step to highlight label input in Properties Inspector.
        - [x] (Optional) Add step for details input.
      - [x] Tutorial steps for creating an edge by dragging from a source handle to a target handle (Basic structure defined, dynamic target via `tutorialTempTargetEdgeId` in `conceptMapStore`).
      - [x] **Refine `manualCreateEdgeTutorial` for selecting and editing new edge**:
        - [x] Add step to guide user to select the new edge.
        - [x] Add step to guide user to open Properties Inspector.
        - [x] Add step to highlight label input in Properties Inspector for the edge.
      - [ ] Tutorial steps for selecting an edge and editing its label/details. <!-- This seems covered by the refinement above. Mark for review/removal if truly duplicate. -->
    - [ ] **Using AI Tools - "Suggest Relations" (`suggestRelationsToolTutorial`)**:
      - [x] Define steps for triggering "Suggest Relations" from AI Tools menu.
      - [x] Explain the modal and how AI uses context.
      - [x] Guide user to the AI Suggestion Panel to view and apply suggested relations.
      - [ ] **TODO**: Ensure `button[data-tutorial-id='ai-tool-suggest-relations']` and `[role='dialog'][aria-labelledby='suggest-relations-title']` (and its submit button) have correct `data-tutorial-id` or stable selectors.
      - [ ] **TODO**: Ensure AI Suggestion Panel items for relations have a stable selector like `.suggestion-type-relation`.
    - [ ] **Using AI Tools - "Expand Concept" (Advanced/Staging Area Usage)**:
      - [ ] Focus on Staging Area interaction: accepting/clearing.
    - [ ] **Using Ghost Previews (e.g., from AI Tidy Up - Layout Only)**:
      - [ ] Explain Ghost Preview and how to accept/cancel.
    - [ ] **(Optional) Project Overview Mode Tutorial**.
  - [ ] **Tutorial System Enhancements & Polish:**
    - [x] **"Help/Tutorials" Menu**: Allow users to re-trigger tutorials. (Implemented in Navbar using DropdownMenu and `availableTutorials` list. Includes "Reset All" functionality).
    - [ ] **Review and Refine Tutorial Text**.
    - [ ] **Visual Polish**.
    - [ ] **Test on Different Screen Sizes**.
- [ ] **Onboarding & Initial Experience (Excluding Tutorial):**
  - [ ] **"Guest Mode" or "Try Without Login".** (Higher effort - PENDING)
  - [x] **Clearer "User Goals" Input.**
  - [x] **Role-Agnostic Starting Point.**
- [ ] **Map Interaction & Interpretation:**
  - [x] **"Human-Readable" Summaries (Map level).**
  - [x] **Contextual Help for Map Elements.**
  - [x] **Smart Map Presentation (Overview Mode - Phases 1, 2, 3 implemented).**
    - [ ] (Deferred) Overview Mode: `ProjectOverviewDisplay` to show simplified connections between key modules.
  - [ ] **Visual Feedback & Progress for long-running AI ops.** (PENDING)
  - [x] User-friendly error messages.
- [ ] **AI Interaction Refinements:**
  - [x] **AI Explanations ("Why?").**
  - [x] **Preview for AI Actions (Staging Area).**
  - [x] **Simplified AI Prompts/Inputs & Enhanced Feedback.**
- [ ] **Content & Help:**
  - [x] **"Ordinary User" Example Library (Framework).**
    - [x] **Actual Example Content:** Populate with JSON files and preview images. (**Completed:** Meaningful concept map data created for basic website, markdown documentation, and Python game examples. Preview images directory structure created.)
- [ ] **Advanced UX Features (Future/Higher Effort):**
  - [x] **Overview Mode - Interactive Drill-Down (Phase 3 - Implemented).**
  - [x] **Interactive Q&A - Contextual Q&A (Phase 2 - Implemented).**
  - [x] **Comprehensive AI Action Previews (Staging/Ghost previews - Implemented & Refined).**
    - [ ] Test thoroughly. (PENDING)
    - [ ] Phase 3: Refinement & Rollout to other AI tools. (PENDING)
- [ ] **Continuous Improvement & Maintenance:**
  - [x] **Performance for Large Projects.** (**Completed:** Created performance optimization utilities, monitoring tools, and analysis script for handling large concept maps and AI operations.)
  - [ ] **Clarity of Value Proposition (Iterative).** (Out of agent scope likely)
  - [ ] **Comprehensive Automated Testing (Recap):** (All specific automated test types PENDING)

## Key Priorities Based on Analysis (Reflecting recent developments):

1.  **Testing (All Levels):** Significantly improved with comprehensive unit test coverage.
    - **Manual Testing of Recent Features:** Execute tests outlined in `MANUAL_TUTORIAL_TESTING_GUIDE.md` and `PROJECT_ANALYZER_TESTING_GUIDE.md (v2)`. (READY FOR EXECUTION)
    - **Unit Tests:** ✅ COMPLETED - Comprehensive coverage added for critical components.
    - Integration and E2E tests remain pending.
2.  **Populate Example Content:** ✅ COMPLETED - Meaningful concept map examples created.
3.  **Interactive Tutorial/Onboarding - Iteration & Expansion:**
    - Refine existing tutorial flows based on testing feedback (especially CSS selectors). (PENDING TESTING FEEDBACK)
    - Consider adding more tutorial modules. (FUTURE)
4.  **`projectStructureAnalyzerTool` Further Enhancements (Beyond current scope):**
    - Deeper semantic analysis is a long-term goal.
    - Support for other archive types if deemed necessary.
5.  **Performance for Large Projects:** Proactive investigation. (PENDING)
6.  **CI/CD Pipeline:** (PENDING)
7.  **"Guest Mode" or "Try Without Login":** (Higher effort, PENDING)

## 🎯 **Project Refocus: Whimsical-Style GAI Concept Mapping**

**Decision**: Remove complex real-time collaboration features to focus on core GAI concept mapping capabilities like Whimsical. This allows us to:

- Concentrate on AI-powered concept generation and editing
- Improve visual design and user experience
- Enhance code analysis and semantic understanding
- Build the best AI concept mapping tool for education and development

**Removed Complexity**: Real-time collaboration, multi-user editing, complex permission systems
**Core Focus**: AI-driven concept mapping, intelligent code analysis, intuitive visual editing

This updated TODO list aims to be more concise in the completed sections by summarizing, while clearly highlighting pending tasks and new priorities derived from the document analysis.
The "Known Issues / Current State" section has been updated to reflect the significant progress on `projectStructureAnalyzerTool` and Interactive Tutorials.
The Chinese section "下一步 (建議)" is considered superseded by the detailed English sections.
The "Key Priorities" section has been updated to emphasize immediate testing needs and ongoing/future work.

---

## Project Setup & DX Enhancements (Jules & User)

- [ ] **Manual User Tasks (Local Environment):**
  - **Action:** In your local environment, please perform the following steps in order and commit the changes:
    1. Ensure all dependencies are installed: `npm install` (or `yarn install`). This is crucial as Jules encountered issues running this in the sandbox.
    2. Run the initial Prettier formatting: `npm run format`. This includes:
       - The initial full-project format.
       - Specifically `src/app/application/student/dashboard/page.tsx`.
       - The entire `src/components/` directory.
       - Other directories like `src/app/application/student/projects/` and `src/app/application/teacher/` that Jules skipped due to sandbox limits.
    3. Run ESLint autofix: `npm run lint:fix`. This should be run _after_ Prettier has formatted the codebase.
    4. Run TypeScript type check: `npm run typecheck` (i.e., `tsc --noEmit`). Review and fix any reported type errors.
  - **Note for Jules:** Once these steps are done and changes are committed, Jules can proceed with reviewing any remaining ESLint issues or other planned tasks.

- [x] **ESLint & Prettier Configuration & Initial Setup (Jules - Partially Blocked by User for full format/lint run):**
  - [x] Create `.prettierrc.json` with recommended settings.
  - [x] Create `.prettierignore` (added `*.py`, ensured standard ignores).
  - [x] Update `package.json` with necessary ESLint & Prettier devDependencies and quality-related scripts.
  - [x] Refactor `eslint.config.js` to a standard Flat Config format, integrating Next.js and Prettier rules.
  - [x] Delete a-conflicting `.eslintrc.json`.
  - [x] Create `.eslintignore`.
  - [x] Partially formatted project using Prettier (e.g., `src/ai/`, parts of `src/app/`, `src/hooks/`). Fixed syntax errors in `src/ai/tools/project-analyzer-tool.ts`.
  - [ ] **(User Action Required in Local Env - see above)** Run `npm run format` (Prettier) for remaining large directories / full project.
  - [ ] **(User Action Required in Local Env - see above)** Run `npm run lint:fix` (ESLint) to check and autofix linting issues based on the new configuration.
  - [ ] Review any outstanding ESLint errors/warnings after `lint:fix`. (Jules will do this after user actions)

- [ ] **Project Structure Optimization (Jules - Test File Organization Blocked by User):**
  - [x] **Dashboard Pages De-duplication (Admin, Student, Teacher):**
    - [x] Identified duplicate dashboard content between `src/app/(app)/[role]/dashboard/page.tsx` and `src/app/application/[role]/dashboard/page.tsx`.
    - [x] Created shared view components: `src/components/dashboard/admin/AdminDashboardView.tsx`, `src/components/dashboard/student/StudentDashboardView.tsx`, `src/components/dashboard/teacher/TeacherDashboardView.tsx`.
    - [x] Refactored all six dashboard `page.tsx` files to use these shared view components, effectively de-duplicating UI and core logic.
  - [ ] **Test Files Organization (User Action Required First):**
    - **Step 1 (User Action Required in Local Env):** Create the following `__tests__` directories:
      - `src/app/(app)/__tests__/`
      - `src/app/(app)/examples/__tests__/`
      - `src/components/concept-map/__tests__/`
      - `src/components/layout/__tests__/`
      - `src/contexts/__tests__/`
      - `src/hooks/__tests__/`
      - `src/lib/__tests__/`
      - `src/services/classrooms/__tests__/`
      - `src/stores/__tests__/`
      - `src/ai/tools/__tests__/`
    - **Step 2 (Jules - Blocked by Step 1):** Move existing test files to their respective new `__tests__` directory. Planned moves:
      - `src/app/(app)/layout.test.tsx` -> `src/app/(app)/__tests__/layout.test.tsx`
      - `src/app/(app)/examples/page.test.tsx` -> `src/app/(app)/examples/__tests__/page.test.tsx`
      - `src/components/concept-map/AIStagingToolbar.test.tsx` -> `src/components/concept-map/__tests__/AIStagingToolbar.test.tsx`
      - `src/components/concept-map/GhostPreviewToolbar.test.tsx` -> `src/components/concept-map/__tests__/GhostPreviewToolbar.test.tsx`
      - `src/components/concept-map/ai-suggestion-panel.test.tsx` -> `src/components/concept-map/__tests__/ai-suggestion-panel.test.tsx`
      - `src/components/concept-map/editor-toolbar.test.tsx` -> `src/components/concept-map/__tests__/editor-toolbar.test.tsx`
      - `src/components/layout/sidebar-nav.test.tsx` -> `src/components/layout/__tests__/sidebar-nav.test.tsx`
      - `src/contexts/auth-context.test.tsx` -> `src/contexts/__tests__/auth-context.test.tsx`
      - `src/hooks/useConceptMapAITools.test.ts` -> `src/hooks/__tests__/useConceptMapAITools.test.ts`
      - `src/hooks/useConceptMapDataManager.test.ts` -> `src/hooks/__tests__/useConceptMapDataManager.test.ts`
      - `src/lib/dagreLayoutUtility.test.ts` -> `src/lib/__tests__/dagreLayoutUtility.test.ts`
      - `src/lib/layout-utils.test.ts` -> `src/lib/__tests__/layout-utils.test.ts`
      - `src/services/classrooms/classroomService.test.ts` -> `src/services/classrooms/__tests__/classroomService.test.ts`
      - `src/stores/concept-map-store.test.ts` -> `src/stores/__tests__/concept-map-store.test.ts`
      - `src/ai/tools/project-analyzer-tool.test.ts` -> `src/ai/tools/__tests__/project-analyzer-tool.test.ts`
    - **Step 3 (Jules - Blocked by Step 1 & 2):** Verify/Update `vitest.config.ts` to correctly find tests in new locations and ensure tests still pass.

---

## Ongoing: AI Interaction Layer Enhancements & Hook Refactoring (Revised after file restore)

- [ ] **Enhance `callAIWithStandardFeedback` (NEEDS DEVELOPER RE-IMPLEMENTATION & VERIFICATION):**
  - [ ] Implement `options.onSuccess?: (output: O, input: I) => void` in function signature and logic.
    - _Purpose_: Allow specific side effects post-AI success, before default toast.
  - [ ] Implement `options.onError?: (error: unknown, input: I) => boolean | void` in function signature and logic.
    - _Purpose_: Enable custom error handling; can suppress default error toast if it returns `true`.
  - [ ] Implement refined `userFriendlyMessage` generation in `catch` block to better use `error.details` or other structured error info from Genkit.
  - [x] JSDoc for `callAIWithStandardFeedback` has been updated to describe these intended `onSuccess` and `onError` options. (Jules - Done)

- [ ] **Refactor `useConceptMapAITools.ts` (NEEDS DEVELOPER REVIEW & IMPLEMENTATION):**
  - [ ] **Extract AI success handlers**: After `onSuccess` is implemented in `callAIWithStandardFeedback`, refactor ALL `handle...` functions (including Q&A handlers) to move their success logic into this callback.
    - _Goal_: Reduce nesting and length of `handle...` functions.
  - [ ] **Isolate simple AI flow calls**: Review handlers that primarily display a toast on success; ensure they leverage `callAIWithStandardFeedback`'s `successDescription` effectively.
  - [ ] **Review and add/update comments**: Add more comments for complex sections throughout the hook.
  - [ ] **Thoroughly review `useCallback` dependencies**: **CRITICAL - NEEDS DEVELOPER REVIEW & ADJUSTMENT WITH LOCAL LINTER/TESTING.** Ensure all `useCallback` hooks have correct and exhaustive dependencies.

- [ ] **Update relevant AI tool invocation points (NEEDS DEVELOPER IMPLEMENTATION):**
  - This task is dependent on the above refactoring.

- [ ] **Documentation**:
  - [x] JSDoc for `callAIWithStandardFeedback` options updated. (Jules - Done)
  - [ ] Broader documentation for the hook, its patterns, and specific AI handler logic is still pending.

[end of TODO.md]
