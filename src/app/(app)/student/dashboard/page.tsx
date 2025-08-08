'use client';

import { Loader2 } from 'lucide-react'; // Added Users, Settings

import StudentDashboardView from '@/components/dashboard/student/StudentDashboardView'; // Import the new shared view
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types'; // Import UserRole

// import { DashboardHeader } from '@/components/dashboard/dashboard-header'; // Now in StudentDashboardView
// import { useStudentDashboardMetrics } from '@/hooks/useStudentDashboardMetrics'; // Now in StudentDashboardView
// import { DashboardLinkCard, type MetricState } from '@/components/dashboard/dashboard-link-card'; // Now in StudentDashboardView
// import { QuickActionsCard } from '@/components/dashboard/quick-actions-card'; // Now in StudentDashboardView

export default function StudentDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();

  if (authIsLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!user || user.role !== UserRole.STUDENT) {
    // Display loading or null while redirecting or if auth state is briefly inconsistent.
    // AppLayout should prevent unauthenticated access. This primarily handles incorrect role access.
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  // If user is authenticated and is a student, render the StudentDashboardView
  return <StudentDashboardView user={user} />;
}
