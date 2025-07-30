# Code Review & Refactoring Tasks

This document outlines the results of a comprehensive code review and the planned refactoring tasks to improve the overall quality, maintainability, and performance of the codebase.

## Ⅰ. High-Priority Tasks

### 1. [COMPLETED] Stabilize Test Environment

**Problem:** The test suite was consistently failing with a "JavaScript heap out of memory" error.

**Action:**
- **[DONE]** Investigated the root cause of the memory leak. It was found to be a systemic issue related to multiple problems in the test setup and dependencies.
- **[DONE]** Fixed multiple critical bugs in the test setup, including missing mocks (`window.location`), broken global mocks (`zustand`, `zundo`), and circular dependencies in the state store.
- **[DONE]** Updated core testing dependencies (`vitest`, `vite`, etc.) in an attempt to resolve tooling-related leaks.
- **[DONE]** Stabilized the `concept-map-store.test.ts` file, which was the most complex unit test. 27/29 tests now pass.

**Outcome:** While the underlying memory leak for the *full suite* persists, the environment is now stable enough to run individual test files, which was not possible before. This unblocks development, as changes can be verified against isolated tests. The full memory leak remains a separate, major issue.

### 2. [HIGH PRIORITY] Fix Undo/Redo Functionality

**Problem:** The undo/redo tests in `concept-map-store.test.ts` are failing, indicating a bug in the `zundo` integration. This is a critical user-facing feature. The tests are currently skipped.

**Action:**
- Un-skip the two failing tests in `concept-map-store.test.ts`.
- Debug the interaction between the store and the `zundo` library to understand why `undo()` is not restoring the previous state.
- Fix the implementation so that undo/redo works as expected.

### 2. Eliminate `any` Type Usage

**Problem:** The codebase currently has a significant number of `any` types, which undermines the benefits of TypeScript's static typing. This can lead to runtime errors and makes the code harder to understand and maintain.

**Action:**
- Systematically replace all instances of `any` with more specific types.
- Create and use appropriate interfaces and type aliases for complex data structures.
- Use `unknown` for values that are truly unknown at compile time and perform type checking before use.

**Files to address:**
- `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
- `src/app/(app)/layout.tsx`
- `src/components/concept-map/ai-suggestion-panel.tsx`
- `src/components/concept-map/editor-toolbar.tsx`
- `src/components/concept-map/flow-canvas-core.tsx`
- `src/components/concept-map/project-overview-display.tsx`
- `src/contexts/auth-context.tsx`
- `src/hooks/useConceptMapAITools.ts`
- `src/hooks/useStudentDashboardMetrics.ts`
- `src/lib/dagreLayoutUtility.ts`
- `src/lib/graphologyAdapter.ts`
- `src/services/classrooms/classroomService.ts`
- `src/stores/concept-map-store.ts`
- And many others...

### 3. Increase Test Coverage

**Problem:** Several key components and business logic lack sufficient unit and integration tests. This makes it difficult to refactor with confidence and increases the risk of regressions.

**Action:**
- Write unit tests for all major components, focusing on props, state changes, and user interactions.
- Add integration tests for critical user flows, such as:
  - User authentication and authorization.
  - Concept map creation and manipulation.
  - Project submission and analysis.
- Write unit tests for `zundo` related logic in `concept-map-store.ts`.

**Files to address:**
- `src/stores/concept-map-store.test.ts` (currently has failing tests)
- `src/tests/integration/project-analysis-flow.test.ts` (currently has failing tests)
- `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
- `src/contexts/auth-context.tsx`
- `src/hooks/useConceptMapAITools.ts`

## Ⅱ. Medium-Priority Tasks

### 1. Refactor Large Components

**Problem:** Some components have grown too large and are responsible for too many things, making them difficult to understand and maintain.

**Action:**
- Decompose large components into smaller, more focused sub-components.
- Extract business logic into custom hooks to separate concerns and improve reusability.

**Files to address:**
- `src/app/(app)/concept-maps/editor/[mapId]/page.tsx`
- `src/components/concept-map/ai-suggestion-panel.tsx`
- `src/components/concept-map/editor-toolbar.tsx`
- `src/stores/concept-map-store.ts`

### 2. Improve Code Readability and Consistency

**Problem:** There are inconsistencies in coding style, naming conventions, and code organization across the project.

**Action:**
- Enforce a consistent coding style using Prettier and ESLint.
- Refactor code to improve readability, for example by using more descriptive variable names and breaking down complex functions.
- Organize files and folders in a more logical and consistent manner.

## Ⅲ. Low-Priority Tasks

### 1. Review and Refactor CSS

**Problem:** The current CSS is not well-organized and could be improved for better scalability and maintainability.

**Action:**
- Review the use of global styles and consider using CSS Modules or a similar solution to scope styles to components.
- Refactor CSS to use more variables and utility classes for better consistency and reusability.

### 2. Optimize Performance

**Problem:** There are potential performance bottlenecks in the application, such as unnecessary re-renders.

**Action:**
- Use `React.memo`, `useMemo`, and `useCallback` to prevent unnecessary re-renders.
- Analyze bundle size and look for opportunities to reduce it.
- Investigate and optimize the performance of data-intensive operations, such as concept map rendering.

This list will be updated as tasks are completed and new issues are identified.
