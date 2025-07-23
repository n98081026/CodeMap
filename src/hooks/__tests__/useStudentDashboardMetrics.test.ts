import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { useStudentDashboardMetrics } from '../useStudentDashboardMetrics';

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
        id: 'student-user-id',
        name: 'Student User',
        email: 'student@example.com',
        role: UserRole.STUDENT,
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

describe.skip('useStudentDashboardMetrics', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        classroomCount: 3,
        conceptMapCount: 7,
        submissionCount: 2,
      }),
    });

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.classrooms.isLoading).toBe(true);
    expect(result.current.conceptMaps.isLoading).toBe(true);
    expect(result.current.submissions.isLoading).toBe(true);
    expect(result.current.classrooms.count).toBe(0);
    expect(result.current.conceptMaps.count).toBe(0);
    expect(result.current.submissions.count).toBe(0);
    expect(result.current.classrooms.error).toBeNull();
    expect(result.current.conceptMaps.error).toBeNull();
    expect(result.current.submissions.error).toBeNull();
  });

  it('should fetch and return student metrics successfully', async () => {
    const mockData = {
      classroomCount: 4,
      conceptMapCount: 12,
      submissionCount: 6,
    };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.classrooms.count).toBe(4);
    expect(result.current.conceptMaps.count).toBe(12);
    expect(result.current.submissions.count).toBe(6);
    expect(result.current.classrooms.error).toBeNull();
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.classrooms.isLoading).toBe(false);
    expect(result.current.classrooms.count).toBe(0);
    expect(result.current.conceptMaps.count).toBe(0);
    expect(result.current.submissions.count).toBe(0);
    expect(result.current.classrooms.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.classrooms.error).toBe('Failed to fetch student metrics');
  });
});
