export const Routes = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  Admin: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
  },

  Teacher: {
    DASHBOARD: '/teacher/dashboard',
    CLASSROOMS: '/teacher/classrooms',
    CLASSROOM_DETAIL: (id: string) => `/teacher/classrooms/${id}`,
  },

  Student: {
    DASHBOARD: '/student/dashboard',
    PROJECTS: '/student/projects',
  },

  Profile: '/profile',

  ConceptMaps: {
    VIEW: (id: string) => `/concept-maps/${id}`,
    EDIT: (id: string) => `/concept-maps/${id}/edit`,
  },

  API: {
    // Add API routes here as needed
  }
} as const;
