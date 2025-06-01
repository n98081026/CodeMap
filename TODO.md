# CodeMap TODO List

## Core Functionality & Backend Integration
- [x] **User Authentication (Backend):**
    - [x] Refactor API routes (`/login`, `/register`) to use `userService`. (Mock service implemented)
    - [ ] Implement actual API endpoints for register, login, JWT generation. (JWT part pending real auth)
    - [ ] Secure password hashing and storage. (Pending real auth)
    - [x] Connect frontend `AuthContext` to live API (with mock service).
- [ ] **Database & Models:**
    - [ ] Set up database (PostgreSQL/MongoDB as per final decision).
    - [ ] Define and implement database schemas for Users, Classrooms, ConceptMaps, ProjectSubmissions, etc.
    - [ ] Create ORM/ODM layer (Prisma, Sequelize, etc.).
- [ ] **Classroom Management (Backend):** (In Progress)
    - [x] Create `classroomService.ts` with mock data management.
    - [x] API endpoint for creating classrooms (`POST /api/classrooms`).
    - [x] API endpoint for listing classrooms by teacher (`GET /api/classrooms?teacherId=xxx`).
    - [x] API endpoint for getting classroom details (`GET /api/classrooms/[classroomId]`).
    - [ ] API endpoints for student enrollment (invites, joining with code - partially mocked with direct add/remove).
        - [x] API endpoint for adding a student to a classroom (`POST /api/classrooms/[classroomId]/students`). (Mocked: adds by ID)
        - [x] API endpoint for removing a student from a classroom (`DELETE /api/classrooms/[classroomId]/students/[studentId]`).
    - [ ] API endpoints for updating, deleting classrooms. (Service methods exist, API endpoints pending)
    - [x] Connect frontend classroom creation and listing UI to live API (with mock service).
    - [x] Connect frontend classroom detail UI to live API for details and student management (with mock service).
- [ ] **Concept Map Service (Backend):** (In Progress)
    - [x] Create `conceptMapService.ts` with mock data management.
    - [x] API endpoints for CRUD operations on concept maps (`/api/concept-maps`, `/api/concept-maps/[mapId]`).
    - [ ] Logic for map ownership and sharing (with classrooms, public) - Basic ownership implemented.
    - [x] Connect frontend concept map listing (student) to live API for loading/deleting.
    - [x] Connect frontend concept map editor to live API for saving/loading new and existing maps.
- [ ] **Project Submission & Analysis (Backend):** (In Progress)
    - [x] Create `projectSubmissionService.ts` with mock data management.
    - [x] API endpoint for project file uploads (`POST /api/projects/submissions` - metadata only, file handling mocked).
    - [x] API endpoint for listing student submissions (`GET /api/projects/submissions?studentId=xxx`).
    - [x] API endpoint for getting submission details (`GET /api/projects/submissions/[submissionId]`).
    - [ ] File storage integration (S3, GCS, or local).
    - [ ] Message Queue setup (RabbitMQ, Redis, etc.).
    - [ ] Develop Project Analysis Microservice:
        - [ ] Task consumer from message queue.
        - [ ] File downloader/unpacker.
        - [ ] Code/Structure Parser Engine (start with basic, then add AST for specific languages).
        - [ ] LLM-Powered Structure-to-Map Converter (refine prompts, integrate with Gemini).
        - [ ] Map Data Formatter & Persister (save generated map to DB, update submission status).
    - [x] Connect frontend project submission UI to live API (for metadata).
    - [x] Connect frontend student submissions list to live API.

## Frontend Enhancements
- [ ] **Concept Map Editor (Canvas):**
    - [ ] Implement actual canvas interactions (node/edge creation, drag, edit, delete).
    - [ ] Zoom/pan functionality.
    - [ ] Connect `PropertiesInspector` to selected elements on canvas.
    - [ ] Visualize GenAI results (extracted concepts, suggested relations, expanded concepts) on the canvas or allow adding them.
- [ ] **State Management:**
    - [ ] Implement a robust client-side state management solution (e.g., Zustand, Redux Toolkit) for managing complex app state beyond `AuthContext` and API data fetching.
- [ ] **Real-time Features (Optional):**
    - [ ] Consider real-time collaboration on concept maps (e.g., using WebSockets).
    - [ ] Real-time updates for project submission status.
- [ ] **User Interface & User Experience (Desktop Focus):**
    - [x] Refine UI details for some pages, ensure consistency and professional design.
    - [ ] Add more comprehensive loading states and error handling (partially done).
    - [ ] Enhance empty states for lists (e.g., no classrooms, no maps) (partially done).
    - [ ] Implement user profile page and settings.
    - [ ] Add pagination and filtering for lists (users, classrooms, maps, submissions).
- [ ] **Admin Panel:**
    - [x] Implement CRUD operations for user management (view implemented, connected to backend service).
    - [ ] Develop system settings interface.

## GenAI & AI Features
- [ ] **Refine GenAI Prompts:**
    - [ ] Iterate on prompts for `extractConcepts`, `suggestRelations`, `expandConcept` for better accuracy and relevance.
    - [ ] Develop and refine advanced prompts for `generateMapFromProject` in the analysis microservice.
- [ ] **Integrate GenAI Output:**
    - [ ] Develop intuitive ways for users to interact with and utilize the outputs of GenAI tools within the concept map editor.
    - [ ] Allow users to accept/reject/modify AI suggestions.

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
- Default test student and teacher accounts with a pre-configured classroom are set up for easier development and testing (see `AuthContext` and mock data files).
- Data persistence for anything beyond auth (localStorage for user object) is not implemented at the database level.
- Concept map canvas is a placeholder.
- Project analysis pipeline is mocked at the UI level.
- `next-themes` for theme toggling is integrated.
- App is focused on desktop experience; mobile-specific UI (like drawer navigation) has been removed.
- Some API actions (like full student invite flow, classroom updates/deletes) are not fully implemented on the frontend or are simplified.
