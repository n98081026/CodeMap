
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { UserRole, type Classroom } from '@/types'; // Ensure Classroom is imported
import { useToast } from './use-toast';

interface MetricState {
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

interface TeacherDashboardMetrics {
  managedClassrooms: MetricState;
  totalStudents: MetricState;
  fetchMetrics: () => void;
}

export function useTeacherDashboardMetrics(): TeacherDashboardMetrics {
  const { user } = useAuth();
  const { toast } = useToast();

  const [managedClassroomsMetric, setManagedClassroomsMetric] = useState<MetricState>({ count: null, isLoading: true, error: null });
  const [totalStudentsMetric, setTotalStudentsMetric] = useState<MetricState>({ count: null, isLoading: true, error: null });

  const fetchMetrics = useCallback(async () => {
    if (!user || (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN)) {
      const errorMsg = "User is not a teacher/admin or not authenticated.";
      setManagedClassroomsMetric({ count: null, isLoading: false, error: errorMsg });
      setTotalStudentsMetric({ count: null, isLoading: false, error: errorMsg });
      return;
    }

    setManagedClassroomsMetric(prev => ({ ...prev, isLoading: true, error: null }));
    setTotalStudentsMetric(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch managed classrooms count (paginated for efficiency, just need totalCount)
      const classroomsCountResponse = await fetch(`/api/classrooms?teacherId=${user.id}&page=1&limit=1`);
      if (!classroomsCountResponse.ok) {
        const errData = await classroomsCountResponse.json();
        throw new Error(errData.message || `Classrooms Count API Error (${classroomsCountResponse.status})`);
      }
      const classroomsCountResult = await classroomsCountResponse.json();
      setManagedClassroomsMetric({ count: classroomsCountResult.totalCount, isLoading: false, error: null });

      // Fetch all classrooms for this teacher to sum students
      // This relies on the classroom service populating studentIds.length correctly
      const allClassroomsResponse = await fetch(`/api/classrooms?teacherId=${user.id}`); // No pagination
      if (!allClassroomsResponse.ok) {
        const errData = await allClassroomsResponse.json();
        throw new Error(errData.message || `Full Classrooms API Error (${allClassroomsResponse.status})`);
      }
      const allClassroomsData = await allClassroomsResponse.json() as { classrooms: Classroom[] };
      
      let currentTotalStudents = 0;
      if (allClassroomsData.classrooms && Array.isArray(allClassroomsData.classrooms)) {
         allClassroomsData.classrooms.forEach(c => {
            currentTotalStudents += c.studentIds?.length || 0; // studentIds is now populated by service
        });
      }
      setTotalStudentsMetric({ count: currentTotalStudents, isLoading: false, error: null });

    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching teacher dashboard data:", errorMessage);
      setManagedClassroomsMetric(prev => ({ ...prev, isLoading: false, error: prev.error || errorMessage }));
      setTotalStudentsMetric(prev => ({ ...prev, isLoading: false, error: prev.error || errorMessage }));
      // toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
    }
  }, [user, toast]);

  useEffect(() => {
     if (user && (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN)) {
      fetchMetrics();
    } else {
      const errorMsg = "User not available or not authorized for fetching teacher metrics.";
      setManagedClassroomsMetric({ count: null, isLoading: false, error: errorMsg });
      setTotalStudentsMetric({ count: null, isLoading: false, error: errorMsg });
    }
  }, [user, fetchMetrics]);

  return {
    managedClassrooms: managedClassroomsMetric,
    totalStudents: totalStudentsMetric,
    fetchMetrics,
  };
}
