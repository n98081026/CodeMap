
# CodeMap TODO List

## Core Functionality & Backend Integration
- [x] **User Authentication (Backend):**
    - [x] Refactor API routes (`/login`, `/register`) to use `userService`.
    - [x] Connect frontend `AuthContext` to live API (with mock service).
    - [ ] Implement actual API endpoints for JWT generation. (JWT part pending real auth)
    - [ ] Secure password hashing and storage. (Pending real auth)
- [x] **Database & Models:** (Services use in-memory mock data)
    - [x] Set up database (PostgreSQL/MongoDB as per final decision). (Mocked)
    - [x] Define and implement database schemas for Users, Classrooms, ConceptMaps, ProjectSubmissions, etc. (Mocked)
    - [x] Create ORM/ODM layer (Prisma, Sequelize, etc.). (Mocked via services)
- [x] **Classroom Management (Backend & Frontend Integration):** (Core API & Service Done)
    - [x] Create `classroomService.ts` with mock data management.
    - [x] API endpoint for creating classrooms (`POST /api/classrooms`).
    - [x] API endpoint for listing classrooms by teacher (`GET /api/classrooms?teacherId=xxx`).
    - [x] API endpoint for listing classrooms by student (`GET /api/classrooms?studentId=xxx`).
    - [x] API endpoint for getting classroom details (`GET /api/classrooms/[classroomId]`).
    - [x] API endpoints for student enrollment (invites, joining with code - partially mocked with direct add/remove).
        - [x] API endpoint for adding a student to a classroom (`POST /api/classrooms/[classroomId]/students`). (Adds by ID)
        - [x] API endpoint for removing a student from a classroom (`DELETE /api/classrooms/[classroomId]/students/[studentId]`).
    - [x] API endpoints for updating, deleting classrooms (`PUT /api/classrooms/[classroomId]`, `DELETE /api/classrooms/[classroomId]`).
    - [x] Connect frontend classroom creation and listing UI (teacher) to live API (with mock service).
    - [x] Connect frontend classroom listing UI (student) to live API (with mock service).
    - [x] Connect frontend classroom list UI for edit/delete actions (Teacher).
    - [x] Connect frontend classroom detail UI (teacher) to live API for details and student management (student list, map list, submission list connected. Add/remove student by ID working, list refreshes).
    - [x] Connect frontend student classroom detail UI to live API for viewing classroom info and shared maps.
- [x] **Concept Map Service (Backend & Frontend Integration):** (Core API & Service Done)
    - [x] Create `conceptMapService.ts` with mock data management.
    - [x] API endpoints for CRUD operations on concept maps (`/api/concept-maps`, `/api/concept-maps/[mapId]`).
    - [x] API endpoint for listing concept maps by classroom (`GET /api/concept-maps?classroomId=xxx`).
    - [x] Logic for map ownership and sharing (with classrooms, public) - Basic ownership and `sharedWithClassroomId` implemented.
    - [x] Connect frontend concept map listing (student) to live API for loading/deleting.
    - [x] Connect frontend concept map editor to live API for saving/loading new and existing maps (including properties like name, isPublic, sharedWithClassroomId from inspector).
- [x] **Project Submission & Analysis (Backend & Frontend Integration):** (Core API & Service Done for metadata, status updates robust)
    - [x] Create `projectSubmissionService.ts` with mock data management.
    - [x] API endpoint for project file uploads (`POST /api/projects/submissions` - metadata only, file handling mocked).
    - [x] API endpoint for listing student submissions (`GET /api/projects/submissions?studentId=xxx`).
    - [x] API endpoint for listing submissions by classroom (`GET /api/projects/submissions?classroomId=xxx`).
    - [x] API endpoint for getting submission details (`GET /api/projects/submissions/[submissionId]`).
    - [x] API endpoint for updating submission status (`PUT /api/projects/submissions/[submissionId]`). (Mock AI gen updates status)
    - [ ] File storage integration (S3, GCS, or local).
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue.
        - [ ] File downloader/unpacker.
        - [ ] Code/Structure Parser Engine (start with basic, then add AST for specific languages).
        - [ ] LLM-Powered Structure-to-Map Converter (refine prompts, integrate with Gemini).
        - [ ] Map Data Formatter & Persister (save generated map to DB, update submission status).
    - [x] Connect frontend project submission UI to live API (for metadata, including mock AI map gen status update).
    - [x] Connect frontend student submissions list to live API.
    - [x] Connect frontend Admin Dashboard to fetch user & classroom counts dynamically with individual loading/error states.
    - [x] Connect frontend Student Dashboard to fetch classroom, map & submission counts dynamically with individual loading/error states.
    - [x] Connect frontend Teacher Dashboard to fetch classroom & student counts dynamically with individual loading/error states.

## Frontend Enhancements
- [ ] **Concept Map Editor (Canvas):**
    - [ ] Implement actual canvas interactions (node/edge creation, drag, edit, delete).
    - [ ] Zoom/pan functionality.
    - [x] Connect `PropertiesInspector` to selected elements on canvas (map-level properties connected and saved).
    - [x] Visualize GenAI results (textually) on `CanvasPlaceholder`.
- [ ] **State Management:**
    - [ ] Implement a robust client-side state management solution (e.g., Zustand, Redux Toolkit) for managing complex app state beyond `AuthContext` and API data fetching.
- [ ] **Real-time Features (Optional):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using WebSockets).
    - [ ] Real-time updates for project submission status.
- [x] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design. (Ongoing)
    - [x] Add more comprehensive loading states and error handling. (Done for many list pages and dashboards)
    - [x] Enhance empty states for lists (e.g., no classrooms, no maps). (Done for many list pages)
    - [x] Implement user profile page and settings (Profile page created, edit name/email working. Linked from Navbar and Sidebar).
    - [x] Add pagination and filtering for lists (Admin User Management page now has pagination).
    - [x] Add loading spinner to Login/Register pages during auth state check.
    - [x] Make header icons link to main dashboards for easier navigation.
- [x] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view with pagination, delete, edit connected to backend service; add user via register flow - Add button tooltip added).
    - [x] Develop system settings interface (Placeholder page created and linked from Admin Dashboard, Admin Dashboard link to it enabled).

## GenAI & AI Features
- [x] **Refine GenAI Prompts:**
    - [x] Iterate on prompts for `extractConcepts`, `suggestRelations`, `expandConcept` for better accuracy and relevance.
    - [ ] Develop and refine advanced prompts for `generateMapFromProject` in the analysis microservice.
- [x] **Integrate GenAI Output:**
    - [x] Develop intuitive ways for users to interact with and utilize the outputs of GenAI tools within the concept map editor.
        - [x] Add placeholder "Add to Map" indicators for AI-generated content in CanvasPlaceholder.
    - [x] Allow users to accept/reject/modify AI suggestions.
        - [x] Implement 'Add to Map' for AI suggestions, updating mapData state directly.

## Testing & Deployment
- [ ] **Testing:**
    - [ ] Write unit tests for critical components and utility functions.
    - [ ] Implement integration tests for user flows.
    - [ ] Consider end-to-end testing.
- [ ] **Deployment:**
    - [ ] Set up CI/CD pipeline.
    - [ ] Configure production environment.
    - [ ] Database migrations strategy.

## Documentation
- [ ] **User Documentation:** Create guides for students and teachers.
- [ ] **Developer Documentation:** Document API endpoints, architecture, and setup instructions.

## Known Issues / Current Mocked Areas
- Backend services are currently mocked (in-memory data).
- Default test student and teacher accounts are set up for easier development and testing (see `AuthContext` and mock data files).
- Data persistence for anything beyond auth (localStorage for user object) is not implemented at the database level.
- Concept map canvas is a placeholder. Project analysis pipeline is mocked at the UI level (AI map gen call updates status).
- `next-themes` for theme toggling is integrated.
- App is focused on desktop experience; mobile-specific UI (like drawer navigation) has been removed.
- Some API actions (like full student invite flow via email) are not fully implemented on the frontend or are simplified (e.g., add student by ID).
- Admin "Add User" typically handled by registration. Tooltip added to button.
- Change password functionality on profile page is a placeholder.

    
