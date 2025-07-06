# CodeMap Development Log

## Session 1: Initial Setup & Core UI Structure (YYYY-MM-DD)

**Implemented:**

1.  **Global Styling & Theming:**

    - Updated `globals.css` with the specified HSL color palette (Primary: Blue, Background: Light Desaturated Blue, Accent: Teal).
    - Configured `tailwind.config.ts` to use 'Inter' font for `font-body` and `font-headline`.
    - Updated `src/app/layout.tsx` to include 'Inter' Google Font and apply `font-body`.
    - Integrated `<Toaster />` for app-wide notifications.

2.  **Authentication Context & Pages:**

    - Created `AuthContext` (`src/contexts/auth-context.tsx`) with mocked authentication logic (login, logout, register) and user state management (including roles: Student, Teacher, Admin). User data is stored in localStorage for persistence during the session.
    - Developed Login (`src/app/(auth)/login/page.tsx`) and Register (`src/app/(auth)/register/page.tsx`) pages with respective forms (`LoginForm`, `RegisterForm`).
    - Implemented basic form validation using `zod` and `react-hook-form`.
    - Styled auth pages with a centered card layout and app logo.
    - Created an `(auth)` route group and layout for these pages.

3.  **Core Layout Components:**

    - `Navbar` (`src/components/layout/navbar.tsx`): Includes app logo/name, theme toggle (light/dark using `next-themes`), and a user profile dropdown (Login/Register or User Info/Logout).
    - `SidebarNav` (`src/components/layout/sidebar-nav.tsx`): Dynamic sidebar navigation based on user role.
    - `MainLayout` (`src/components/layout/main-layout.tsx`): Combines `Navbar` and `SidebarNav` for authenticated sections. Includes a scrollable content area.
    - Updated root `src/app/layout.tsx` to wrap children with `AuthProvider`.
    - Created `(app)` route group and layout that uses `MainLayout` and handles theme toggling via `next-themes`.

4.  **Routing & Redirection:**

    - `src/app/page.tsx` now redirects to `/login` if not authenticated, or to the respective user dashboard (`/student/dashboard`, `/teacher/dashboard`, `/admin/dashboard`) if authenticated.
    - `AuthContext` includes logic to redirect on login/logout and to protect routes by redirecting unauthenticated users from app pages.

5.  **Dashboard Pages (Initial Structure):**

    - Student Dashboard (`/student/dashboard/page.tsx`): Basic welcome message and card layout for quick links (My Classrooms, My Concept Maps, Project Submissions).
    - Teacher Dashboard (`/teacher/dashboard/page.tsx`): Basic welcome message and card layout for quick links (Manage Classrooms, Create Classroom). Includes a link to Admin Panel if user is also admin.
    - Admin Dashboard (`/admin/dashboard/page.tsx`): Basic welcome message and card layout for quick links (User Management, System Settings).
    - Created `DashboardHeader` component for consistent page titles.

6.  **Classroom Management (Teacher - UI Shells):**

    - `TeacherClassroomsPage` (`/teacher/classrooms/page.tsx`): Lists mock classrooms with cards. Link to create new classroom.
    - `CreateClassroomPage` (`/teacher/classrooms/new/page.tsx`): Form to create a new classroom (name, description). Mock submission logic.
    - `ClassroomDetailPage` (`/teacher/classrooms/[classroomId]/page.tsx`): Tabbed view for Students, Concept Maps, and Submissions within a classroom. Includes `InviteStudentDialog`.
    - `InviteStudentDialog` (`src/components/classrooms/invite-student-dialog.tsx`): Modal to "invite" students by email (mocked).

7.  **Student-Specific Views (UI Shells):**

    - `StudentClassroomsPage` (`/student/classrooms/page.tsx`): Lists classrooms the student is enrolled in (mock data).
    - `StudentConceptMapsPage` (`/student/concept-maps/page.tsx`): Lists concept maps owned by the student (mock data). Includes "Create New Map" button.
    - `SubmitProjectPage` (`/student/projects/submit/page.tsx`): Page with `ProjectUploadForm`.
    - `ProjectUploadForm` (`src/components/projects/project-upload-form.tsx`): Form for uploading project files (.rar/.zip) with basic client-side validation and mock submission. Includes an option to trigger mock AI map generation.
    - `MySubmissionsPage` (`/student/projects/submissions/page.tsx`): Lists project submissions with status using `SubmissionListItem`.
    - `SubmissionListItem` (`src/components/projects/submission-list-item.tsx`): Component to display individual project submission details.

8.  **Concept Map Editor (UI Shells & Basic AI Integration):**
    - `ConceptMapEditorPage` (`/concept-maps/editor/[mapId]/page.tsx`): Layout with `EditorToolbar`, `CanvasPlaceholder`, and `PropertiesInspector`. The `mapId` "new" is handled.
    - `EditorToolbar` (`src/components/concept-map/editor-toolbar.tsx`): Buttons for file ops, edit ops, insert elements, and GenAI tools (Extract Concepts, Suggest Relations, Expand Concept). Tooltips added.
    - `CanvasPlaceholder` (`src/components/concept-map/canvas-placeholder.tsx`): A visual placeholder for the map canvas.
    - `PropertiesInspector` (`src/components/concept-map/properties-inspector.tsx`): Placeholder panel for editing element properties.
    - `GenAIModals` (`src/components/concept-map/genai-modals.tsx`): Created modals for "Extract Concepts", "Suggest Relations", and "Expand Concept". These modals include forms and basic logic to call the provided AI flow functions (`extractConcepts`, `suggestRelations`, `expandConcept` from `src/ai/flows`). Error handling and loading states included.
    - The editor page now manages the state for opening these modals and handling their output (logging to console and showing toasts).

**Decisions & Notes:**

- Authentication is fully mocked on the client-side for rapid UI development.
- Data for classrooms, maps, submissions is mocked directly in the page components or imported as mock arrays.
- Focused on creating the page structure, navigation flow, and basic UI elements for each feature requested.
- Used ShadCN components extensively.
- `next-themes` was assumed for theme toggling and integrated into the `(app)/layout.tsx`.
- The provided AI flow functions are called from the GenAI modals with mock/simple inputs.
- Simplified some complex features (e.g., AST parsing for project analysis) to UI placeholders or mocked AI calls.

**Next Steps (from TODO.md):**

- Refine UI details and responsiveness.
- Implement client-side state management for dynamic data (e.g., Zustand or Redux Toolkit).
- Connect to actual backend APIs when available.
- Develop the actual concept map canvas interactions.

## Session 2: Supabase Integration & Core Feature Backend (YYYY-MM-DD)

**Implemented:**

1.  **Supabase Client Setup:**

    - Configured `src/lib/supabaseClient.ts` with environment variables.
    - Updated `.env.example` with Supabase URL and Anon Key.
    - Added `src/types/supabase.ts` (placeholder for user-generated types).

2.  **Authentication with Supabase:**

    - Refactored `AuthContext` (`src/contexts/auth-context.tsx`) to use Supabase for login, registration, logout, and session management.
    - Supabase Auth automatically handles JWTs and session persistence.
    - `AuthContext` now attempts to create/fetch a user profile from the `profiles` table upon successful Supabase Auth sign-in/up.
    - Deprecated old mock auth API routes (`/api/auth/login`, `/api/auth/register`).
    - Login and Register forms updated to use Supabase via `AuthContext`.

3.  **User Service (`userService.ts`) with Supabase:**

    - Refactored `src/services/users/userService.ts` to perform CRUD operations on the Supabase `profiles` table.
    - Includes `createUserProfile`, `getUserById`, `getAllUsers` (with pagination/search), `updateUser`, `deleteUser`.
    - Handles logic for preventing edits/deletes on pre-defined mock users.

4.  **Classroom Service (`classroomService.ts`) with Supabase:**

    - Refactored `src/services/classrooms/classroomService.ts` for CRUD on `classrooms` and `classroom_students` tables.
    - Functions include `createClassroom`, `getClassroomsByTeacherId` (with pagination/search), `getClassroomsByStudentId`, `getClassroomById` (populates student details), `addStudentToClassroom`, `removeStudentFromClassroom`, `updateClassroom`, `deleteClassroom`, `getAllClassrooms`.

5.  **Concept Map Service (`conceptMapService.ts`) with Supabase:**

    - Refactored `src/services/conceptMaps/conceptMapService.ts` for CRUD on `concept_maps` table.
    - Functions include `createConceptMap`, `getConceptMapById`, `getConceptMapsByOwnerId`, `getConceptMapsByClassroomId`, `updateConceptMap`, `deleteConceptMap`.

6.  **Project Submission Service (`projectSubmissionService.ts`) with Supabase:**

    - Refactored `src/services/projectSubmissions/projectSubmissionService.ts` for CRUD on `project_submissions` table.
    - Now includes `file_storage_path`.
    - Functions include `createSubmission`, `getSubmissionById`, `getSubmissionsByStudentId`, `getSubmissionsByClassroomId`, `updateSubmissionStatus`, `getAllSubmissions`.

7.  **Admin Settings Service (`settingsService.ts`) with Supabase:**

    - Created `src/services/admin/settingsService.ts` to manage system settings in a `system_settings` table (single row).
    - Includes `getSystemSettings` (with default creation) and `updateSystemSettings`.

8.  **API Route Refactoring:**

    - All relevant API routes in `src/app/api/` (users, classrooms, concept-maps, projects/submissions, admin/settings, users/change-password) updated to use their respective Supabase-backed services.
    - Basic authorization checks (e.g., for password change) use Supabase session. Primary data access control relies on RLS policies (user-defined).

9.  **Frontend Component & Page Connection to Supabase Services:**
    - Admin Dashboard: Counts for users and classrooms fetched via API.
    - Student Dashboard: Counts for classrooms, maps, submissions fetched via API.
    - Teacher Dashboard: Counts for classrooms and students fetched via API.
    - Admin User Management: Listing (with pagination/search), edit, delete connected.
    - Teacher Classroom Management: Create, list (with pagination/search), view details (including student list, shared maps, submissions), edit, delete, invite/add/remove student.
    - Student Classroom Management: List enrolled classrooms, view details (info, shared maps).
    - Student Concept Map Management: Create, list, view/edit, delete. Editor saves/loads to Supabase.
    - Student Project Submission: Upload form now uploads to Supabase Storage (user needs to set up bucket 'project_archives' and RLS), creates submission record with `fileStoragePath`, triggers mock AI analysis which saves a new concept map record. Submission list page connected.
    - Profile Page: Edit name/email, change password (uses Supabase Auth).
    - Admin Settings Page: Fetches and saves settings via API.

**Decisions & Notes:**

- The application is now heavily reliant on Supabase for backend operations. The user is responsible for setting up all Supabase tables, RLS policies, and storage buckets as detailed in `src/types/supabase.ts` and `TODO.md`.
- The `projectStructureAnalyzerTool` (Genkit) remains a mock for actual file content analysis. It receives the `projectStoragePath` and `userGoals`, but its internal logic to fetch and parse the file is not implemented by the AI agent.
- Client-side type generation for Supabase (`src/types/supabase.ts`) must be run by the user using the Supabase CLI.
- Navigation paths prefixed with `/application/` for authenticated routes.
- Focus was on core functionality migration to Supabase. Advanced features like real-time collaboration are out of scope.

## Session 3: Extensive Modularization (YYYY-MM-DD)

**Implemented:**

1.  **Reusable Dialog Components:**

    - Extracted `EditUserDialog` (`src/components/admin/users/edit-user-dialog.tsx`) from Admin Users page.
    - Extracted `EditClassroomDialog` (`src/components/teacher/classrooms/edit-classroom-dialog.tsx`) from Teacher Classrooms page.
    - Extracted `EditProfileDialog` and `ChangePasswordDialog` (`src/components/profile/`) from Profile page.
    - Parent pages updated to use these dialog components.

2.  **Reusable List Item Components:**

    - Created `ClassroomListItem` (`src/components/classrooms/classroom-list-item.tsx`) for displaying classroom cards. Student and Teacher classroom list pages now use this.
    - Created `ConceptMapListItem` (`src/components/concept-map/concept-map-list-item.tsx`). Student concept maps page uses this.
    - `SubmissionListItem` already existed and was updated to use `useSubmissionStatusPoller`.

3.  **Reusable Dashboard Components:**

    - Created `DashboardHeader` (`src/components/dashboard/dashboard-header.tsx`) for consistent page headers. (Props standardized).
    - Created `DashboardLinkCard` (`src/components/dashboard/dashboard-link-card.tsx`) for metric display cards on dashboards.
    - Created `QuickActionsCard` (`src/components/dashboard/quick-actions-card.tsx`) for prominent action buttons on dashboards.
    - All dashboard pages (Admin, Student, Teacher) refactored to use these components.

4.  **Custom Hooks for Data Fetching & Complex Logic:**

    - `useAdminDashboardMetrics`: For Admin Dashboard counts.
    - `useStudentDashboardMetrics`: For Student Dashboard counts.
    - `useTeacherDashboardMetrics`: For Teacher Dashboard counts.
    - `useSubmissionStatusPoller`: For polling project submission status.
    - `useSupabaseStorageUpload`: For handling file uploads to Supabase Storage in `ProjectUploadForm`.
    - `useConceptMapDataManager`: For managing loading, saving, and initialization of concept maps in the editor.
    - `useConceptMapAITools`: For managing AI modal states, AI flow calls, and integration of AI suggestions into the concept map editor.

5.  **Concept Map Editor Modularization:**

    - Core data lifecycle (load, save, new) moved to `useConceptMapDataManager`.
    - All AI modal interactions and AI-generated content integration logic moved to `useConceptMapAITools`.
    - `ConceptMapEditorPage` significantly simplified, acting as an orchestrator for hooks and UI components.
    - `FlowCanvasCore` component established to abstract React Flow setup.
    - `NodeContextMenu` handles AI actions triggered from nodes.
    - `AISuggestionPanel` (formerly `CanvasPlaceholder`) is now a toggleable sheet for AI suggestions.
    - Redundant `CanvasPlaceholder.tsx` file removed.

6.  **Reusable Layout Components:**

    - Created `EmptyState` (`src/components/layout/empty-state.tsx`) for standardized display of empty or error states. Integrated into multiple pages and tab components.

7.  **Code Cleanup and Type Safety:**
    - Standardized `DashboardHeaderProps`.
    - Added relevant types to `src/types/index.ts`.
    - Ensured barrel file (`src/ai/flows/index.ts`) for AI flows.

**Decisions & Notes:**

- The primary goal was to encapsulate reusable UI patterns and complex logic into dedicated components and hooks.
- This significantly improves separation of concerns, making page components cleaner and focused on layout and orchestration.
- The codebase is now highly modular, enhancing maintainability and scalability.
- Further micro-optimizations or abstractions might be identified as the app evolves, but the current structure provides a very solid foundation.

```

```
