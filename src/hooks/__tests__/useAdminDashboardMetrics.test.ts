import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAdminDashboardMetrics } from '../useAdminDashboardMetrics';

// Mock the fetch function
global.fetch = vi.fn();

describe('useAdminDashboardMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ userCount: 10, classroomCount: 5 }),
    });

    const { result } = renderHook(() => useAdminDashboardMetrics());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.userCount).toBe(0);
    expect(result.current.classroomCount).toBe(0);
    expect(result.current.error).toBeNull();
  });

  it('should fetch and return metrics successfully', async () => {
    const mockData = { userCount: 15, classroomCount: 8 };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useAdminDashboardMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userCount).toBe(15);
    expect(result.current.classroomCount).toBe(8);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAdminDashboardMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userCount).toBe(0);
    expect(result.current.classroomCount).toBe(0);
    expect(result.current.error).toBe('Failed to fetch admin metrics');
  });

  it('should handle non-ok response', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useAdminDashboardMetrics());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch admin metrics');
  });
});
