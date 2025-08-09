'use client';

import { Loader2 } from 'lucide-react'; // For loading state
import { useRouter } from 'next/navigation'; // For redirection
import { useEffect } from 'react'; // For redirection logic

import TeacherDashboardView from '@/components/dashboard/teacher/TeacherDashboardView'; // Import the shared view
import { useAuth } from '@/contexts/auth-context';
import { Routes } from '@/lib/routes';
import { UserRole } from '@/types';
// import { BookOpen, Users, LayoutDashboard, AlertTriangle } from 'lucide-react'; // Icons are in TeacherDashboardView
// import { DashboardHeader } from '@/components/dashboard/dashboard-header'; // Now in TeacherDashboardView
// import { useTeacherDashboardMetrics } from '@/hooks/useTeacherDashboardMetrics'; // Now in TeacherDashboardView
// import { DashboardLinkCard, type MetricState } from '@/components/dashboard/dashboard-link-card'; // Now in TeacherDashboardView

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();

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
  if (!user) {
    // This case should ideally not be reached due to the checks above,
    // but it satisfies TypeScript's null analysis.
    return null;
  }

  return <TeacherDashboardView user={user} />;
}
