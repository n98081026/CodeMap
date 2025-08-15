import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAdminDashboardMetrics } from '../useAdminDashboardMetrics';

import { AuthProvider } from '@/contexts/auth-context';
import { UserRole } from '@/types';

// Mock the fetch function
global.fetch = vi.fn();

// Define a stable mock user object
const mockAdminUser = {
  id: 'admin-user-id',
  name: 'Admin User',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

// Mock useAuth to provide a stable user for the AuthProvider wrapper
vi.mock('@/contexts/auth-context', async () => {
  const actual = await vi.importActual<
    typeof import('@/contexts/auth-context')
  >('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: () => ({
      user: mockAdminUser,
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

describe('useAdminDashboardMetrics', () => {
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
    // No fetch mock needed as we are checking initial state before useEffect runs
    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    expect(result.current.users.isLoading).toBe(true);
    expect(result.current.classrooms.isLoading).toBe(true);
    expect(result.current.users.count).toBeNull(); // Correct initial state
    expect(result.current.classrooms.count).toBeNull(); // Correct initial state
    expect(result.current.users.error).toBeNull();
    expect(result.current.classrooms.error).toBeNull();
  });

  it('should fetch and return metrics successfully', async () => {
    // Mock separate fetches for users and classrooms
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalCount: 15 }), // Mock for users fetch
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ totalCount: 8 }), // Mock for classrooms fetch
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
    (fetch as any).mockRejectedValue(new Error('Network error')); // mockRejectedValue for all fetches

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.users.isLoading).toBe(false);
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.users.count).toBeNull();
    expect(result.current.classrooms.count).toBeNull();
    expect(result.current.users.error).toBe('Network error');
    expect(result.current.classrooms.error).toBe('Network error');
  });

  it('should handle non-ok response', async () => {
    (fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ message: 'Server Error' }),
    });

    const { result } = renderHook(() => useAdminDashboardMetrics(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.users.isLoading).toBe(false);
      expect(result.current.classrooms.isLoading).toBe(false);
    });

    expect(result.current.users.error).toBe(
      'Failed to fetch users: Server Error'
    );
    expect(result.current.classrooms.error).toBe(
      'Failed to fetch classrooms: Server Error'
    );
  });
});
