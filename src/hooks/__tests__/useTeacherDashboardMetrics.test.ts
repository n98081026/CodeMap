import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTeacherDashboardMetrics } from '../useTeacherDashboardMetrics';

import { AuthProvider } from '@/contexts/auth-context'; // Import AuthProvider
import { UserRole } from '@/types';

// Mock the fetch function
global.fetch = vi.fn();

// Mock useAuth to provide a user for the AuthProvider wrapper
vi.mock('@/contexts/auth-context', async () => {
  const actual = await vi.importActual('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'teacher-user-id', // Or use the mockUserId passed to the hook
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
  return ({ children }: { children: React.ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );
};

describe('useTeacherDashboardMetrics', () => {
  const mockUserId = 'teacher-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ classroomCount: 2, totalStudents: 25 }),
    });

    const { result } = renderHook(
      () => useTeacherDashboardMetrics(mockUserId),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.classroomCount).toBe(0);
    expect(result.current.totalStudents).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return teacher metrics successfully', async () => {
    const mockData = { classroomCount: 3, totalStudents: 45 };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(
      () => useTeacherDashboardMetrics(mockUserId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.classroomCount).toBe(3);
    expect(result.current.totalStudents).toBe(45);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useTeacherDashboardMetrics(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.classroomCount).toBe(0);
    expect(result.current.totalStudents).toBe(0);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(
      () => useTeacherDashboardMetrics(mockUserId),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch teacher metrics');
  });
});
