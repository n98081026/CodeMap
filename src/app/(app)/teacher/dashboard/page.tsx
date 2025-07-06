'use client';

import { Loader2 } from 'lucide-react'; // For loading state
import { useRouter } from 'next/navigation'; // For redirection
import React from 'react';
import { useEffect } from 'react'; // For redirection logic

import TeacherDashboardView from '@/components/dashboard/teacher/TeacherDashboardView'; // Import the shared view
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card'; // No longer needed
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
// import { BookOpen, Users, LayoutDashboard, AlertTriangle } from 'lucide-react'; // Icons are in TeacherDashboardView
// import { DashboardHeader } from '@/components/dashboard/dashboard-header'; // Now in TeacherDashboardView
// import { useTeacherDashboardMetrics } from '@/hooks/useTeacherDashboardMetrics'; // Now in TeacherDashboardView
// import { DashboardLinkCard, type MetricState } from '@/components/dashboard/dashboard-link-card'; // Now in TeacherDashboardView

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // AppLayout handles general authentication. This page adds role-specific redirection.
    if (!authIsLoading && user) {
      // This page is for TEACHERs. ADMINs might also access it (as per original logic showing Admin Panel link).
      // If a STUDENT lands here, redirect them to their dashboard.
      if (user.role === UserRole.STUDENT) {
        router.replace('/student/dashboard'); // Or /application/student/dashboard
      }
      // No explicit redirect for ADMIN, as they might be intentionally viewing a teacher-like dashboard
      // or the TeacherDashboardView itself might show admin-specific links if user.role is ADMIN.
      // If an ADMIN should *always* go to their own dashboard from this URL, a redirect can be added:
      // else if (user.role === UserRole.ADMIN) {
      //  router.replace('/admin/dashboard');
      // }
    }
    // If !user and !authIsLoading, AppLayout should handle the redirect to /login.
  }, [user, authIsLoading, router]);

  if (authIsLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (
    !user ||
    (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN)
  ) {
    // This primarily catches non-teacher, non-admin roles after auth.
    // AppLayout handles unauthenticated.
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  // If user is authenticated and is a TEACHER or ADMIN, render the TeacherDashboardView
  return <TeacherDashboardView user={user} />;
}
