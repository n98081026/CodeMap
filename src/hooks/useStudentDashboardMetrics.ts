'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from './use-toast';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_STUDENT_USER,
  MOCK_CLASSROOM_SHARED,
  MOCK_CONCEPT_MAP_STUDENT,
  MOCK_PROJECT_SUBMISSION_STUDENT,
} from '@/lib/config';
import { getClassroomsByStudentId as getClassroomsService } from '@/services/classrooms/classroomService';
import { getConceptMapsByOwnerId as getConceptMapsService } from '@/services/conceptMaps/conceptMapService';
import { getSubmissionsByStudentId as getSubmissionsService } from '@/services/projectSubmissions/projectSubmissionService';

interface MetricState {
  count: number | null;
  isLoading: boolean;
  error: string | null;
}

interface StudentDashboardMetrics {
  classrooms: MetricState;
  conceptMaps: MetricState;
  submissions: MetricState;
  fetchMetrics: () => void;
}

export function useStudentDashboardMetrics(): StudentDashboardMetrics {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classroomsMetric, setClassroomsMetric] = useState<MetricState>({
    count: null,
    isLoading: true,
    error: null,
  });
  const [conceptMapsMetric, setConceptMapsMetric] = useState<MetricState>({
    count: null,
    isLoading: true,
    error: null,
  });
  const [submissionsMetric, setSubmissionsMetric] = useState<MetricState>({
    count: null,
    isLoading: true,
    error: null,
  });

  const fetchMetrics = useCallback(async () => {
    if (!user) {
      const errorMsg = 'User not authenticated.';
      setClassroomsMetric({ count: null, isLoading: false, error: errorMsg });
      setConceptMapsMetric({ count: null, isLoading: false, error: errorMsg });
      setSubmissionsMetric({ count: null, isLoading: false, error: errorMsg });
      return;
    }

    if (BYPASS_AUTH_FOR_TESTING && user.id === MOCK_STUDENT_USER.id) {
      setClassroomsMetric({
        count: [MOCK_CLASSROOM_SHARED].length,
        isLoading: false,
        error: null,
      });
      setConceptMapsMetric({
        count: [MOCK_CONCEPT_MAP_STUDENT].length,
        isLoading: false,
        error: null,
      });
      setSubmissionsMetric({
        count: [MOCK_PROJECT_SUBMISSION_STUDENT].length,
        isLoading: false,
        error: null,
      });
      return;
    }

    // Fetch Classrooms Count
    setClassroomsMetric((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const classroomsResponse = await fetch(
        `/api/classrooms?studentId=${user.id}`
      );
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(
          errData.message ||
            `Classrooms API Error (${classroomsResponse.status})`
        );
      }
      const data = await classroomsResponse.json(); // This API returns a direct array, not paginated for this specific query
      setClassroomsMetric({
        count: data.length,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setClassroomsMetric({ count: null, isLoading: false, error: msg });
    }

    // Fetch Concept Maps Count
    setConceptMapsMetric((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const mapsResponse = await fetch(`/api/concept-maps?ownerId=${user.id}`);
      if (!mapsResponse.ok) {
        const errData = await mapsResponse.json();
        throw new Error(
          errData.message || `Concept Maps API Error (${mapsResponse.status})`
        );
      }
      const data = (await mapsResponse.json()) as {
        maps: any[];
        totalCount: number;
      }; // API now returns paginated structure
      setConceptMapsMetric({
        count: data.totalCount,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setConceptMapsMetric({ count: null, isLoading: false, error: msg });
    }

    // Fetch Submissions Count
    setSubmissionsMetric((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const submissionsResponse = await fetch(
        `/api/projects/submissions?studentId=${user.id}`
      );
      if (!submissionsResponse.ok) {
        const errData = await submissionsResponse.json();
        throw new Error(
          errData.message ||
            `Submissions API Error (${submissionsResponse.status})`
        );
      }
      const data = (await submissionsResponse.json()) as {
        submissions: any[];
        totalCount: number;
      }; // API now returns paginated structure
      setSubmissionsMetric({
        count: data.totalCount,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setSubmissionsMetric({ count: null, isLoading: false, error: msg });
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchMetrics();
    } else {
      // Handle case where user is initially null (e.g. during auth loading)
      const errorMsg = 'User not available for fetching metrics.';
      setClassroomsMetric({ count: null, isLoading: false, error: errorMsg });
      setConceptMapsMetric({ count: null, isLoading: false, error: errorMsg });
      setSubmissionsMetric({ count: null, isLoading: false, error: errorMsg });
    }
  }, [user, fetchMetrics]);

  return {
    classrooms: classroomsMetric,
    conceptMaps: conceptMapsMetric,
    submissions: submissionsMetric,
    fetchMetrics,
  };
}
