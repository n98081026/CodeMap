export const Routes = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',

  Admin: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },

  Teacher: {
    DASHBOARD: '/teacher/dashboard',
    CLASSROOMS: '/teacher/classrooms',
    CLASSROOMS_NEW: '/teacher/classrooms/new',
    CLASSROOM_DETAIL: (id: string) => `/teacher/classrooms/${id}`,
  },

  Student: {
    DASHBOARD: '/student/dashboard',
    CONCEPT_MAPS: '/student/concept-maps',
    PROJECTS_SUBMIT: '/student/projects/submit',
    PROJECTS_SUBMISSIONS: '/student/projects/submissions',
    CLASSROOMS: '/student/classrooms',
  },

  Profile: '/profile',

  Examples: '/examples',

  ConceptMaps: {
    NEW: '/concept-maps/new',
    VIEW: (id: string) => `/concept-maps/${id}`,
    EDIT: (id: string) => `/concept-maps/${id}/edit`,
  },

  API: {
    // Add API routes here as needed
  },
} as const;
