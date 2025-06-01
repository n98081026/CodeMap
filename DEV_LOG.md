# CodeMap Development Log

## Session 1: Initial Setup & Core UI Structure (YYYY-MM-DD)

**Implemented:**

1.  **Global Styling & Theming:**
    *   Updated `globals.css` with the specified HSL color palette (Primary: Blue, Background: Light Desaturated Blue, Accent: Teal).
    *   Configured `tailwind.config.ts` to use 'Inter' font for `font-body` and `font-headline`.
    *   Updated `src/app/layout.tsx` to include 'Inter' Google Font and apply `font-body`.
    *   Integrated `<Toaster />` for app-wide notifications.

2.  **Authentication Context & Pages:**
    *   Created `AuthContext` (`src/contexts/auth-context.tsx`) with mocked authentication logic (login, logout, register) and user state management (including roles: Student, Teacher, Admin). User data is stored in localStorage for persistence during the session.
    *   Developed Login (`src/app/(auth)/login/page.tsx`) and Register (`src/app/(auth)/register/page.tsx`) pages with respective forms (`LoginForm`, `RegisterForm`).
    *   Implemented basic form validation using `zod` and `react-hook-form`.
    *   Styled auth pages with a centered card layout and app logo.
    *   Created an `(auth)` route group and layout for these pages.

3.  **Core Layout Components:**
    *   `Navbar` (`src/components/layout/navbar.tsx`): Includes app logo/name, theme toggle (light/dark using `next-themes`), and a user profile dropdown (Login/Register or User Info/Logout).
    *   `SidebarNav` (`src/components/layout/sidebar-nav.tsx`): Dynamic sidebar navigation based on user role.
    *   `MainLayout` (`src/components/layout/main-layout.tsx`): Combines `Navbar` and `SidebarNav` for authenticated sections. Includes a scrollable content area.
    *   Updated root `src/app/layout.tsx` to wrap children with `AuthProvider`.
    *   Created `(app)` route group and layout that uses `MainLayout` and handles theme toggling via `next-themes`.

4.  **Routing & Redirection:**
    *   `src/app/page.tsx` now redirects to `/login` if not authenticated, or to the respective user dashboard (`/student/dashboard`, `/teacher/dashboard`, `/admin/dashboard`) if authenticated.
    *   `AuthContext` includes logic to redirect on login/logout and to protect routes by redirecting unauthenticated users from app pages.

5.  **Dashboard Pages (Initial Structure):**
    *   Student Dashboard (`/student/dashboard/page.tsx`): Basic welcome message and card layout for quick links (My Classrooms, My Concept Maps, Project Submissions).
    *   Teacher Dashboard (`/teacher/dashboard/page.tsx`): Basic welcome message and card layout for quick links (Manage Classrooms, Create Classroom). Includes a link to Admin Panel if user is also admin.
    *   Admin Dashboard (`/admin/dashboard/page.tsx`): Basic welcome message and card layout for quick links (User Management, System Settings).
    *   Created `DashboardHeader` component for consistent page titles.

6.  **Classroom Management (Teacher - UI Shells):**
    *   `TeacherClassroomsPage` (`/teacher/classrooms/page.tsx`): Lists mock classrooms with cards. Link to create new classroom.
    *   `CreateClassroomPage` (`/teacher/classrooms/new/page.tsx`): Form to create a new classroom (name, description). Mock submission logic.
    *   `ClassroomDetailPage` (`/teacher/classrooms/[classroomId]/page.tsx`): Tabbed view for Students, Concept Maps, and Submissions within a classroom. Includes `InviteStudentDialog`.
    *   `InviteStudentDialog` (`src/components/classrooms/invite-student-dialog.tsx`): Modal to "invite" students by email (mocked).

7.  **Student-Specific Views (UI Shells):**
    *   `StudentClassroomsPage` (`/student/classrooms/page.tsx`): Lists classrooms the student is enrolled in (mock data).
    *   `StudentConceptMapsPage` (`/student/concept-maps/page.tsx`): Lists concept maps owned by the student (mock data). Includes "Create New Map" button.
    *   `SubmitProjectPage` (`/student/projects/submit/page.tsx`): Page with `ProjectUploadForm`.
    *   `ProjectUploadForm` (`src/components/projects/project-upload-form.tsx`): Form for uploading project files (.rar/.zip) with basic client-side validation and mock submission. Includes an option to trigger mock AI map generation.
    *   `MySubmissionsPage` (`/student/projects/submissions/page.tsx`): Lists project submissions with status using `SubmissionListItem`.
    *   `SubmissionListItem` (`src/components/projects/submission-list-item.tsx`): Component to display individual project submission details.

8.  **Concept Map Editor (UI Shells & Basic AI Integration):**
    *   `ConceptMapEditorPage` (`/concept-maps/editor/[mapId]/page.tsx`): Layout with `EditorToolbar`, `CanvasPlaceholder`, and `PropertiesInspector`. The `mapId` "new" is handled.
    *   `EditorToolbar` (`src/components/concept-map/editor-toolbar.tsx`): Buttons for file ops, edit ops, insert elements, and GenAI tools (Extract Concepts, Suggest Relations, Expand Concept). Tooltips added.
    *   `CanvasPlaceholder` (`src/components/concept-map/canvas-placeholder.tsx`): A visual placeholder for the map canvas.
    *   `PropertiesInspector` (`src/components/concept-map/properties-inspector.tsx`): Placeholder panel for editing element properties.
    *   `GenAIModals` (`src/components/concept-map/genai-modals.tsx`): Created modals for "Extract Concepts", "Suggest Relations", and "Expand Concept". These modals include forms and basic logic to call the provided AI flow functions (`extractConcepts`, `suggestRelations`, `expandConcept` from `src/ai/flows`). Error handling and loading states included.
    *   The editor page now manages the state for opening these modals and handling their output (logging to console and showing toasts).

**Decisions & Notes:**

*   Authentication is fully mocked on the client-side for rapid UI development.
*   Data for classrooms, maps, submissions is mocked directly in the page components or imported as mock arrays.
*   Focused on creating the page structure, navigation flow, and basic UI elements for each feature requested.
*   Used ShadCN components extensively.
*   `next-themes` was assumed for theme toggling and integrated into the `(app)/layout.tsx`.
*   The provided AI flow functions are called from the GenAI modals with mock/simple inputs.
*   Simplified some complex features (e.g., AST parsing for project analysis) to UI placeholders or mocked AI calls.

**Next Steps (from TODO.md):**

*   Refine UI details and responsiveness.
*   Implement client-side state management for dynamic data (e.g., Zustand or Redux Toolkit).
*   Connect to actual backend APIs when available.
*   Develop the actual concept map canvas interactions.
