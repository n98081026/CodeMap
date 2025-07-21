import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useStudentDashboardMetrics } from '../useStudentDashboardMetrics';

import { AuthProvider } from '@/contexts/auth-context';
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

describe('useStudentDashboardMetrics', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    vi.clearAllMocks();
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

    expect(result.current.isLoading).toBe(true);
    expect(result.current.metrics.classroomCount).toBe(0);
    expect(result.current.metrics.conceptMaps.length).toBe(0);
    expect(result.current.metrics.submissions.length).toBe(0);
    expect(result.current.error).toBeNull();
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
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.metrics.classroomCount).toBe(4);
    expect(result.current.metrics.conceptMaps.length).toBe(12);
    expect(result.current.metrics.submissions.length).toBe(6);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.metrics.classroomCount).toBe(0);
    expect(result.current.metrics.conceptMaps.length).toBe(0);
    expect(result.current.metrics.submissions.length).toBe(0);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch student metrics');
  });
});
