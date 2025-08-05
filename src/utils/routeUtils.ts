/**
 * Utility functions for route management and navigation
 */

import { UserRole } from '@/types';

/**
 * Gets the appropriate dashboard route for a user role
 */
export function getDashboardRoute(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return '/admin/dashboard';
    case UserRole.TEACHER:
      return '/teacher/dashboard';
    case UserRole.STUDENT:
      return '/student/dashboard';
    default:
      return '/';
  }
}

/**
 * Gets the appropriate home route for a user role
 */
export function getHomeRoute(role: UserRole): string {
  return getDashboardRoute(role);
}

/**
 * Validates if a route is accessible for a given user role
 */
export function isRouteAccessible(route: string, role: UserRole): boolean {
  // Admin can access all routes
  if (role === UserRole.ADMIN) {
    return true;
  }

  // Teacher routes
  if (route.startsWith('/teacher/')) {
    return role === UserRole.TEACHER;
  }

  // Student routes
  if (route.startsWith('/student/')) {
    return role === UserRole.STUDENT;
  }

  // Admin-only routes
  if (route.startsWith('/admin/')) {
    return role === UserRole.ADMIN;
  }

  // Public routes (concept maps, etc.)
  if (route.startsWith('/concept-maps/') || route === '/') {
    return true;
  }

  return false;
}

/**
 * Gets all available routes for a user role
 */
export function getAvailableRoutes(role: UserRole): string[] {
  const commonRoutes = [
    '/',
    '/concept-maps/new',
    '/concept-maps/editor/[mapId]',
  ];

  switch (role) {
    case UserRole.ADMIN:
      return [
        ...commonRoutes,
        '/admin/dashboard',
        '/admin/users',
        '/admin/settings',
        '/teacher/dashboard',
        '/teacher/classrooms',
        '/teacher/classrooms/new',
        '/teacher/classrooms/[classroomId]',
        '/student/dashboard',
        '/student/classrooms',
        '/student/concept-maps',
        '/student/projects/submit',
        '/student/projects/submissions',
      ];

    case UserRole.TEACHER:
      return [
        ...commonRoutes,
        '/teacher/dashboard',
        '/teacher/classrooms',
        '/teacher/classrooms/new',
        '/teacher/classrooms/[classroomId]',
      ];

    case UserRole.STUDENT:
      return [
        ...commonRoutes,
        '/student/dashboard',
        '/student/classrooms',
        '/student/classrooms/[classroomId]',
        '/student/concept-maps',
        '/student/projects/submit',
        '/student/projects/submissions',
      ];

    default:
      return commonRoutes;
  }
}

/**
 * Redirects user to appropriate route based on their role
 */
export function getRedirectRoute(currentRoute: string, role: UserRole): string | null {
  if (isRouteAccessible(currentRoute, role)) {
    return null; // No redirect needed
  }

  return getDashboardRoute(role);
}