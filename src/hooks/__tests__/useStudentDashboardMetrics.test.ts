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
  const actual = await vi.importActual<typeof import('@/contexts/auth-context')>('@/contexts/auth-context');
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

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useStudentDashboardMetrics', () => {
  const createWrapper = () => {
    const Wrapper = ({ children }: { children: React.ReactNode }) => {
      return React.createElement(AuthProvider, null, children);
    };
    Wrapper.displayName = 'TestWrapper';
    return Wrapper;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ enrolledClassrooms: 5, projectSubmissions: 2 }),
    });

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.classrooms.isLoading).toBe(true);
    expect(result.current.submissions.isLoading).toBe(true);
  });

  it('should fetch and return metrics successfully', async () => {
    const mockData = { enrolledClassrooms: 3, projectSubmissions: 1 };
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

    expect(result.current.classrooms.count).toBe(3);
    expect(result.current.submissions.count).toBe(1);
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API is down'));

    const { result } = renderHook(() => useStudentDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.classrooms.error).toBe('Failed to fetch student metrics');
  });
});
