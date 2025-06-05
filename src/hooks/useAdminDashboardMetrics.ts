
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { useToast } from './use-toast';

interface MetricState {
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

interface AdminDashboardMetrics {
  users: MetricState;
  classrooms: MetricState;
  fetchMetrics: () => void;
}

export function useAdminDashboardMetrics(): AdminDashboardMetrics {
  const { user } = useAuth();
  const { toast } = useToast();

  const [usersMetric, setUsersMetric] = useState<MetricState>({ count: null, isLoading: true, error: null });
  const [classroomsMetric, setClassroomsMetric] = useState<MetricState>({ count: null, isLoading: true, error: null });

  const fetchMetrics = useCallback(async () => {
    if (!user || user.role !== UserRole.ADMIN) {
      setUsersMetric({ count: null, isLoading: false, error: "User is not an admin or not authenticated." });
      setClassroomsMetric({ count: null, isLoading: false, error: "User is not an admin or not authenticated." });
      return;
    }

    // Fetch Users Count
    setUsersMetric(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const usersResponse = await fetch('/api/users?page=1&limit=1');
      if (!usersResponse.ok) {
        const errData = await usersResponse.json();
        throw new Error(`Failed to fetch users: ${errData.message || usersResponse.statusText}`);
      }
      const usersData = await usersResponse.json();
      setUsersMetric({ count: usersData.totalCount, isLoading: false, error: null });
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching users count for admin dashboard:", errorMessage);
      setUsersMetric({ count: null, isLoading: false, error: errorMessage });
      // toast({ title: "Error Fetching Users Count", description: errorMessage, variant: "destructive" });
    }

    // Fetch Classrooms Count
    setClassroomsMetric(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const classroomsResponse = await fetch('/api/classrooms');
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(`Failed to fetch classrooms: ${errData.message || classroomsResponse.statusText}`);
      }
      const classroomsData = await classroomsResponse.json();
      if (Array.isArray(classroomsData)) {
        setClassroomsMetric({ count: classroomsData.length, isLoading: false, error: null });
      } else { // Assuming paginated structure if not array
        setClassroomsMetric({ count: classroomsData.totalCount || 0, isLoading: false, error: null });
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching classrooms count for admin dashboard:", errorMessage);
      setClassroomsMetric({ count: null, isLoading: false, error: errorMessage });
      // toast({ title: "Error Fetching Classrooms Count", description: errorMessage, variant: "destructive" });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    users: usersMetric,
    classrooms: classroomsMetric,
    fetchMetrics,
  };
}
