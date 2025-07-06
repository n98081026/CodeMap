import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useTeacherDashboardMetrics } from '../useTeacherDashboardMetrics';

// Mock the fetch function
global.fetch = vi.fn();

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

    const { result } = renderHook(() => useTeacherDashboardMetrics(mockUserId));

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

    const { result } = renderHook(() => useTeacherDashboardMetrics(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.classroomCount).toBe(3);
    expect(result.current.totalStudents).toBe(45);
    expect(result.current.error).toBeNull();
  });

  it('should not fetch when userId is not provided', () => {
    const { result } = renderHook(() => useTeacherDashboardMetrics(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.classroomCount).toBe(0);
    expect(result.current.totalStudents).toBe(0);
    expect(result.current.error).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTeacherDashboardMetrics(mockUserId));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch teacher metrics');
  });
});
