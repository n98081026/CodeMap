import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { useTeacherDashboardMetrics } from '../useTeacherDashboardMetrics';

import { AuthProvider } from '@/contexts/auth-context';
import { UserRole } from '@/types';

// Mock the fetch function
global.fetch = jest.fn();

// Mock useAuth to provide a user for the AuthProvider wrapper
jest.mock('@/contexts/auth-context', async () => {
  const actual = await jest.requireActual('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'teacher-user-id',
        name: 'Teacher User',
        email: 'teacher@example.com',
        role: UserRole.TEACHER,
      },
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

// Wrapper component that includes the AuthProvider
const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(AuthProvider, null, children);
};

describe.skip('useTeacherDashboardMetrics', () => {
  const mockUserId = 'teacher-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classroomCount: 2, totalStudents: 25 }),
    });

    const { result } = renderHook(() => useTeacherDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.managedClassrooms.isLoading).toBe(true);
    expect(result.current.totalStudents.isLoading).toBe(true);
    expect(result.current.managedClassrooms.count).toBe(0);
    expect(result.current.totalStudents.count).toBe(0);
    expect(result.current.managedClassrooms.error).toBeNull();
    expect(result.current.totalStudents.error).toBeNull();
  });

  it('should fetch and return teacher metrics successfully', async () => {
    const mockData = { classroomCount: 3, totalStudents: 45 };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useTeacherDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.managedClassrooms.isLoading).toBe(false);
    });

    expect(result.current.managedClassrooms.count).toBe(3);
    expect(result.current.totalStudents.count).toBe(45);
    expect(result.current.managedClassrooms.error).toBeNull();
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useTeacherDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.managedClassrooms.isLoading).toBe(false);
    expect(result.current.managedClassrooms.count).toBe(0);
    expect(result.current.totalStudents.count).toBe(0);
    expect(result.current.managedClassrooms.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTeacherDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.managedClassrooms.isLoading).toBe(false);
    });

    expect(result.current.managedClassrooms.error).toBe('Failed to fetch teacher metrics');
  });
});
