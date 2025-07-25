# Technical Debt and Action Plan

This document outlines the current technical debt, primarily focusing on type errors and failing tests, and the plan to address them.

## Current Issues

### 1. Failing Tests in Core Hooks

A significant number of tests are failing, particularly in the following hooks:

-   `useConceptMapDataManager.test.ts`
-   `useMapLoader.test.ts`
-   `useMapSaver.test.ts`

The root causes for these failures appear to be:

-   **`currentMapOwnerId is not defined`**: This recurring error in `useMapLoader` and `useConceptMapDataManager` suggests that the authentication context, which provides the `user` object, is not being properly mocked or provided in the test environment. The hooks rely on `user.id` to determine ownership, and its absence is causing the tests to crash.
-   **Incorrect Mocking in `useMapSaver`**:
    -   The tests for `useMapSaver` are failing because the mocked `updateConceptMap` and `createConceptMap` service functions are not being called as expected.
    -   A critical error, `Failed to parse URL from /api/concept-maps/map-123`, is being thrown, which indicates that a dependency, likely a global object like `window.location`, is not being mocked. This premature error is preventing the save logic from reaching the point where the service functions are called.

### 2. Skipped and Broken Tests

Several test files are currently skipped or commented out, leading to a false sense of security. These include:

-   `classroom-management-flow.test.ts`
-   `ai-suggestion-panel.test.tsx`
-   `editor-toolbar.test.tsx`
-   `classroomService.test.ts`
-   And others...

These tests need to be re-enabled and fixed to ensure full test coverage.

### 3. Module Resolution Error

The `useConceptMapAITools.test.ts` test is failing due to a module resolution error for `@/ai/flows`. This indicates that the corresponding directory and/or files do not exist.

## Action Plan

The following steps will be taken to address these issues:

1.  **Fix `useMapLoader` and `useMapSaver` Tests:**
    -   **`useMapLoader`**: Properly mock the `useAuth` hook to provide a `user` object in the test setup, resolving the `currentMapOwnerId is not defined` error.
    -   **`useMapSaver`**: Mock the necessary global objects (e.g., `window.location`) to prevent the URL parsing error. Correct the mocks for the map services to ensure they are called correctly.

2.  **Re-enable and Fix Skipped Tests:**
    -   Systematically uncomment all skipped test suites.
    -   Run the tests and address any failures in these re-enabled suites.

3.  **Fix `useConceptMapAITools.test.ts`:**
    -   Create the `src/ai/flows` directory and any necessary placeholder files to resolve the import error.
    -   Ensure the tests in this suite pass.

4.  **Full Test Suite Verification:**
    -   Run the entire test suite to confirm that all tests are passing and no new regressions have been introduced.
    -   Iteratively debug and fix any remaining issues until the test suite is 100% green.
