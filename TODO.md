# Code Quality and Refactoring Roadmap

This document tracks the ongoing effort to improve the quality, maintainability, and stability of the codebase.

## Ⅰ. Foundational Stability (In Progress)

### 1. [CRITICAL BLOCKER] Unstable Development Environment

**Problem:** The development environment's file system is unstable. Any attempt to read the contents of the `src/app` directory (using `ls`, `find`, or `grep`) results in a command timeout. This is a hard blocker for any development work inside the application's core directory.
**Action:**
- **[PENDING]** The environment needs to be reset, repaired, or replaced. All development work on the code is paused until this is resolved.

This phase focuses on establishing a reliable and trustworthy test suite, which is the bedrock for all future refactoring and feature development.

### 2. [COMPLETED] Stabilize Core Test Environment & Undo/Redo Functionality

**Problem:** The test suite was fundamentally broken. A misconfigured test setup file (`src/tests/setup.ts`) incorrectly mocked `zustand` and `zundo`, causing a cascade of failures and making it impossible to test state management reliably. This also broke the tests for the critical undo/redo feature.

**Action:**
- **[DONE]** Diagnosed and removed the incorrect global mocks for `zustand` and `zundo` from `src/tests/setup.ts`.
- **[DONE]** Identified and fixed a circular dependency in the `concept-map-store` by making state-update actions atomic.
- **[DONE]** Refactored the `concept-map-store.test.ts` file to correctly interact with the real store and its temporal (undo/redo) API.
- **[DONE]** Un-skipped and verified that all 29 tests in `concept-map-store.test.ts`, including for the undo/redo functionality, are now passing.

**Outcome:** The core state management of the application is now stable and fully tested. We have a reliable foundation to build upon.

### 2. [COMPLETED] Fix Brittle Component Tests

**Problem:** Component tests were failing intermittently when run as a group. The root cause was DOM pollution between test runs, causing non-unique query matches.

**Action:**
- **[DONE]** Systematically refactored the failing test suites in `src/components/concept-map/__tests__/`.
- **[DONE]** Scoped test queries using `within()` and component-level `data-testid` attributes to ensure queries were isolated to the correct component instance.
- **[DONE]** Added an `afterEach(cleanup)` hook to each test suite to guarantee a clean DOM before every test, preventing state leakage.

**Outcome:** The component tests are now robust and reliable. The test suites for `editor-toolbar`, `GhostPreviewToolbar`, `AIStagingToolbar`, and `ai-suggestion-panel` now pass consistently when run together.

### 3. [HIGH PRIORITY] Eliminate Skipped Tests

**Problem:** A large number of tests are currently skipped, creating a false sense of security.

**Action:**
- Systematically re-enable skipped tests (`*.test.tsx?skip=true`, `it.skip`, etc.).
- Debug and fix the failures in these re-enabled suites until they pass. This is a critical part of increasing overall test coverage.

### 4. [MEDIUM PRIORITY] Investigate and Fix Memory Leak

**Problem:** The full test suite (`npm test`) still crashes with a "JavaScript heap out of memory" error, even after stabilizing the core components.

**Action:**
- Once other tests are fixed, profile the test suite to identify the source(s) of the memory leak.
- Investigate component rendering, mock setups, and potential issues in test libraries as primary suspects.
- Implement a fix to ensure the full test suite can run to completion without crashing.

## Ⅱ. Codebase Refactoring

This phase focuses on improving the long-term health and maintainability of the code.

### 1. [HIGH PRIORITY] Eliminate `any` Type Usage

**Problem:** The codebase has a significant number of `any` types, undermining TypeScript's static typing benefits and increasing the risk of runtime errors.

**Action:**
- Systematically replace all instances of `any` with specific, appropriate types.
- Create and use interfaces and type aliases for complex data structures.
- Use `unknown` for values that are truly unknown and perform runtime type checking.

### 2. [MEDIUM PRIORITY] Refactor Large Components

**Problem:** Some components (`page.tsx`, `ai-suggestion-panel.tsx`, etc.) have grown too large and are violating the single-responsibility principle.

**Action:**
- Decompose large components into smaller, focused sub-components.
- Extract business logic into custom hooks (`use...`) to improve reusability and separation of concerns.

### 3. [MEDIUM PRIORITY] Improve Code Readability and Consistency

**Problem:** There are inconsistencies in coding style, naming conventions, and code organization.

**Action:**
- Enforce a consistent coding style using the existing Prettier and ESLint configurations.
- Refactor code to improve clarity (e.g., more descriptive variable names, breaking down complex functions).

## Ⅲ. Performance & Optimization

### 1. [LOW PRIORITY] Review and Refactor CSS

**Problem:** The current CSS is not well-organized and could be improved for better scalability.

**Action:**
- Review global styles vs. component-scoped styles.
- Refactor CSS to use more variables and utility classes for better consistency.

### 2. [LOW PRIORITY] Optimize Performance

**Problem:** There are potential performance bottlenecks in the application, such as unnecessary re-renders.

**Action:**
- Use `React.memo`, `useMemo`, and `useCallback` where appropriate to prevent unnecessary re-renders.
- Analyze the bundle size and look for opportunities to reduce it.
