'use client';

import { useState, useEffect, useCallback } from 'react';

import { useToast } from './use-toast';

import { useAuth } from '@/contexts/auth-context';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_TEACHER_USER,
  MOCK_CLASSROOM_TEACHER_OWNED,
} from '@/lib/config';
import { getClassroomsByTeacherId as getClassroomsService } from '@/services/classrooms/classroomService';
import { UserRole, type Classroom } from '@/types';

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

  const [managedClassroomsMetric, setManagedClassroomsMetric] =
    useState<MetricState>({ count: null, isLoading: true, error: null });
  const [totalStudentsMetric, setTotalStudentsMetric] = useState<MetricState>({
    count: null,
    isLoading: true,
    error: null,
  });

  const fetchMetrics = useCallback(async () => {
    if (
      !user ||
      (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN)
    ) {
      const errorMsg = 'User is not a teacher/admin or not authenticated.';
      setManagedClassroomsMetric({
        count: null,
        isLoading: false,
        error: errorMsg,
      });
      setTotalStudentsMetric({
        count: null,
        isLoading: false,
        error: errorMsg,
      });
      return;
    }

    if (BYPASS_AUTH_FOR_TESTING && user.id === MOCK_TEACHER_USER.id) {
      const mockClassrooms = [MOCK_CLASSROOM_TEACHER_OWNED];
      setManagedClassroomsMetric({
        count: mockClassrooms.length,
        isLoading: false,
        error: null,
      });
      let studentCount = 0;
      mockClassrooms.forEach(
        (c) => (studentCount += c.studentIds?.length || 0)
      );
      setTotalStudentsMetric({
        count: studentCount,
        isLoading: false,
        error: null,
      });
      return;
    }

    setManagedClassroomsMetric((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));
    setTotalStudentsMetric((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Fetch managed classrooms count (paginated for efficiency, just need totalCount)
      const classroomsCountResponse = await fetch(
        `/api/classrooms?teacherId=${user.id}&page=1&limit=1`
      );
      if (!classroomsCountResponse.ok) {
        const errData = await classroomsCountResponse.json();
        throw new Error(
          errData.message ||
            `Classrooms Count API Error (${classroomsCountResponse.status})`
        );
      }
      const classroomsCountResult = await classroomsCountResponse.json();
      setManagedClassroomsMetric({
        count: classroomsCountResult.totalCount,
        isLoading: false,
        error: null,
      });

      // Fetch all classrooms for this teacher to sum students
      // This relies on the classroom service populating studentIds.length correctly
      const allClassroomsResponse = await fetch(
        `/api/classrooms?teacherId=${user.id}`
      ); // No pagination
      if (!allClassroomsResponse.ok) {
        const errData = await allClassroomsResponse.json();
        throw new Error(
          errData.message ||
            `Full Classrooms API Error (${allClassroomsResponse.status})`
        );
      }
      const allClassroomsData = (await allClassroomsResponse.json()) as {
        classrooms: Classroom[];
      };

      let currentTotalStudents = 0;
      if (
        allClassroomsData.classrooms &&
        Array.isArray(allClassroomsData.classrooms)
      ) {
        allClassroomsData.classrooms.forEach((c) => {
          // Prioritize studentCount if available, otherwise fallback to studentIds.length
          if (c.studentIds) {
            // Fallback, log if this happens often
            currentTotalStudents += c.studentIds.length;
            console.warn(
              `[useTeacherDashboardMetrics] Classroom ${c.id} missing studentCount, falling back to studentIds.length. API/service might need update.`
            );
          }
        });
      }
      setTotalStudentsMetric({
        count: currentTotalStudents,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error('Error fetching teacher dashboard data:', errorMessage);
      setManagedClassroomsMetric((prev) => ({
        ...prev,
        isLoading: false,
        error: prev.error || errorMessage,
      }));
      setTotalStudentsMetric((prev) => ({
        ...prev,
        isLoading: false,
        error: prev.error || errorMessage,
      }));
    }
  }, [user, toast]);

  useEffect(() => {
    if (
      user &&
      (user.role === UserRole.TEACHER || user.role === UserRole.ADMIN)
    ) {
      fetchMetrics();
    } else {
      const errorMsg =
        'User not available or not authorized for fetching teacher metrics.';
      setManagedClassroomsMetric({
        count: null,
        isLoading: false,
        error: errorMsg,
      });
      setTotalStudentsMetric({
        count: null,
        isLoading: false,
        error: errorMsg,
      });
    }
  }, [user, fetchMetrics]);

  return {
    managedClassrooms: managedClassroomsMetric,
    totalStudents: totalStudentsMetric,
    fetchMetrics,
  };
}
