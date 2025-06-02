
# CodeMap TODO List

## Core Functionality & Backend Integration
- [x] **User Authentication (Backend):**
    - [x] Refactor API routes (`/login`, `/register`) to use `userService`.
    - [x] Connect frontend `AuthContext` to live API (with mock service).
    - [ ] Implement actual API endpoints for JWT generation. (Pending real auth)
    - [ ] Secure password hashing and storage. (Pending real auth)
- [x] **Database & Models:** (Services use in-memory mock data)
    - [x] Set up database (PostgreSQL/MongoDB as per final decision). (Mocked)
    - [x] Define and implement database schemas for Users, Classrooms, ConceptMaps, ProjectSubmissions, etc. (Mocked)
    - [x] Create ORM/ODM layer (Prisma, Sequelize, etc.). (Mocked via services)
- [x] **Classroom Management (Backend & Frontend Integration):** (Core API & Service Done)
    - [x] Create `classroomService.ts` with mock data management.
    - [x] API endpoint for creating classrooms (`POST /api/classrooms`).
    - [x] API endpoint for listing classrooms by teacher (`GET /api/classrooms?teacherId=xxx`). (Supports pagination)
    - [x] API endpoint for listing classrooms by student (`GET /api/classrooms?studentId=xxx`).
    - [x] API endpoint for getting classroom details (`GET /api/classrooms/[classroomId]`).
    - [x] API endpoints for student enrollment (invites, joining with code - partially mocked with direct add/remove).
        - [x] API endpoint for adding a student to a classroom (`POST /api/classrooms/[classroomId]/students`). (Adds by ID)
        - [x] API endpoint for removing a student from a classroom (`DELETE /api/classrooms/[classroomId]/students/[studentId]`).
    - [x] API endpoints for updating, deleting classrooms (`PUT /api/classrooms/[classroomId]`, `DELETE /api/classrooms/[classroomId]`).
    - [x] Connect frontend classroom creation and listing UI (teacher) to live API (with mock service).
    - [ ] Connect frontend classroom listing UI (student) to live API (with mock service).
    - [x] Connect frontend classroom list UI for edit/delete actions (Teacher).
    - [x] Connect frontend classroom detail UI (teacher) to live API for details and student management (student list, map list, submission list connected. Add/remove student by ID working, list refreshes).
    - [ ] Connect frontend student classroom detail UI to live API for viewing classroom info and shared maps.
- [x] **Concept Map Service (Backend & Frontend Integration):** (Core API & Service Done)
    - [x] Create `conceptMapService.ts` with mock data management.
    - [x] API endpoints for CRUD operations on concept maps (`/api/concept-maps`, `/api/concept-maps/[mapId]`).
    - [x] API endpoint for listing concept maps by classroom (`GET /api/concept-maps?classroomId=xxx`).
    - [x] Logic for map ownership and sharing (with classrooms, public) - Basic ownership and `sharedWithClassroomId` implemented.
    - [ ] Connect frontend concept map listing (student) to live API for loading/deleting.
    - [x] Connect frontend concept map editor to live API for saving/loading new and existing maps (including properties like name, isPublic, sharedWithClassroomId from inspector).
- [x] **Project Submission & Analysis (Backend & Frontend Integration):** (Core API & Service Done for metadata, status updates robust, AI map gen saves real map)
    - [x] Create `projectSubmissionService.ts` with mock data management.
    - [x] API endpoint for project file uploads (`POST /api/projects/submissions` - metadata only, file handling mocked).
    - [x] API endpoint for listing student submissions (`GET /api/projects/submissions?studentId=xxx`).
    - [x] API endpoint for listing submissions by classroom (`GET /api/projects/submissions?classroomId=xxx`).
    - [x] API endpoint for getting submission details (`GET /api/projects/submissions/[submissionId]`).
    - [x] API endpoint for updating submission status (`PUT /api/projects/submissions/[submissionId]`). (Now updates status including real generated map ID)
    - [ ] File storage integration (S3, GCS, or local).
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue.
        - [ ] File downloader/unpacker.
        - [x] Code/Structure Parser Engine (start with basic, then add AST for specific languages). (Input refined for AI, actual parser out of scope for agent)
        - [x] LLM-Powered Structure-to-Map Converter (integrates with Gemini, parses output, creates new ConceptMap record, input string for structure enhanced).
        - [x] Map Data Formatter & Persister (saves generated map via service to mock DB, updates submission status with real map ID).
    - [x] Connect frontend project submission UI to live API (for metadata, including real AI map generation and saving, uses AlertDialog for confirmation).
    - [x] Connect frontend student submissions list to live API.
    - [x] Connect frontend Admin Dashboard to fetch user & classroom counts dynamically with individual loading/error states.
    - [x] Connect frontend Student Dashboard to fetch classroom, map & submission counts dynamically with individual loading/error states.
    - [x] Connect frontend Teacher Dashboard to fetch classroom & student counts dynamically with individual loading/error states.

## Frontend Enhancements
- [x] **Concept Map Editor (Canvas):**
    - [x] Implement actual canvas interactions (node/edge creation, drag, edit, delete).
    - [x] Zoom/pan functionality.
    - [x] Connect `PropertiesInspector` for map-level properties (name, public, classroomId); changes directly update parent state and are saved.
    - [x] Connect `PropertiesInspector` to selected elements on canvas (for element-specific properties, including node type).
    - [x] Visualize GenAI results (textually) on `CanvasPlaceholder` and allow adding to map.
    - [x] Simplify `PropertiesInspector` for map-level changes (remove local Apply/Cancel, changes directly update parent).
- [ ] **State Management:**
    - [ ] Implement a robust client-side state management solution (e.g., Zustand, Redux Toolkit) for managing complex app state beyond `AuthContext` and API data fetching.
- [x] **Real-time Features (Optional - Future Consideration):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using WebSockets) - (High Complexity - Deferred).
    - [x] Real-time updates for project submission status (Basic polling implemented in SubmissionListItem).
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design. (Ongoing)
    - [x] Add more comprehensive loading states and error handling. (Done for many list pages and dashboards)
    - [x] Enhance empty states for lists (e.g., no classrooms, no maps, no students in classroom). (Done for many list pages, including teacher classroom student list)
    - [x] Implement user profile page and settings (Profile page created, edit name/email working. Linked from Navbar and Sidebar).
    - [x] Add pagination and filtering for lists (Admin User Management page now has pagination, Teacher classrooms page has pagination).
    - [x] Add loading spinner to Login/Register pages during auth state check. (Current implementation prevents form flash, considered complete)
    - [x] Make header icons link to main dashboards for easier navigation (Role-based for Concept Map Editor).
    - [x] Implement "View Only" mode for Concept Map Editor.
    - [x] Refine `PropertiesInspector` in "View Only" mode (muted labels, inputs disabled).
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination, delete, edit connected to backend service; add user via register flow - Add button tooltip added).
    - [x] Develop system settings interface (Placeholder page created and linked from Admin Dashboard, Admin Dashboard link to it enabled. Settings form implemented with mock save).

## GenAI & AI Features
- [x] **Refine GenAI Prompts:**
    - [x] Iterate on prompts for `extractConcepts`, `suggestRelations`, `expandConcept` for better accuracy and relevance.
    - [x] Develop and refine advanced prompts for `generateMapFromProject` in the analysis microservice (Input structure refined).
- [x] **Integrate GenAI Output:**
    - [x] Develop intuitive ways for users to interact with and utilize the outputs of GenAI tools within the concept map editor.
        - [x] Add placeholder "Add to Map" indicators for AI-generated content in CanvasPlaceholder. (Reinstated and functional)
    - [x] Allow users to accept/reject/modify AI suggestions.
        - [x] Implement 'Add to Map' for AI suggestions, updating mapData state directly. (Reinstated and functional)

## Testing & Deployment (Future - Out of Scope for AI Agent Implementation)
- [ ] **Testing:**
    - [ ] Write unit tests for critical components and utility functions.
    - [ ] Implement integration tests for user flows.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline.
    - [ ] Configure production environment.
    - [ ] Database migrations strategy.

## Known Issues / Current Mocked Areas
- Backend services are currently mocked (in-memory data).
- AuthContext provides automatic login for test users (`student-test-id`, `teacher-test-id`, `admin1`) based on initial path for development convenience if no user is in localStorage. This behavior is enhanced to auto-login based on URL structure (e.g., /admin path logs in admin, /teacher logs in teacher, else student).
- Data persistence for anything beyond auth (localStorage for user object) is not implemented at the database level.
- Concept map canvas is now implemented using React Flow. Project Analysis now generates a real ConceptMap record from AI output.
- `next-themes` for theme toggling is integrated.
- App is focused on desktop experience; mobile-specific UI (like drawer navigation) has been removed.
- Some API actions (like full student invite flow via email) are not fully implemented on the frontend or are simplified (e.g., add student by ID).
- Admin "Add User" button is disabled with a tooltip explaining new users should register via the public page.
- [x] Implement change password functionality on profile page (mocked backend).

    