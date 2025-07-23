import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

import { useAdminDashboardMetrics } from '../useAdminDashboardMetrics';

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
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
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

describe.skip('useAdminDashboardMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userCount: 10, classroomCount: 5 }),
    });

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.users.isLoading).toBe(true);
    expect(result.current.classrooms.isLoading).toBe(true);
    expect(result.current.users.count).toBe(0);
    expect(result.current.classrooms.count).toBe(0);
    expect(result.current.users.error).toBeNull();
    expect(result.current.classrooms.error).toBeNull();
  });

  it('should fetch and return metrics successfully', async () => {
    const mockData = { userCount: 15, classroomCount: 8 };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.users.isLoading).toBe(false);
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.users.count).toBe(15);
    expect(result.current.classrooms.count).toBe(8);
    expect(result.current.users.error).toBeNull();
    expect(result.current.classrooms.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.users.isLoading).toBe(false);
    });

    expect(result.current.users.count).toBe(0);
    expect(result.current.classrooms.count).toBe(0);
    expect(result.current.users.error).toBe('Failed to fetch admin metrics');
  });

  it('should handle non-ok response', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.users.isLoading).toBe(false);
    });

    expect(result.current.users.error).toBe('Failed to fetch admin metrics');
  });
});
