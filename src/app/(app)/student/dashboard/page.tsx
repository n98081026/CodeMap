'use client';

import {
  BookOpen,
  FileText,
  Share2,
  FolderKanban,
  LayoutDashboard,
  Compass,
  Loader2,
  AlertTriangle,
  Users,
  Settings,
} from 'lucide-react'; // Added Users, Settings
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // For redirection
import React from 'react'; // Ensure React is imported for useMemo if not already via other imports
import { useEffect } from 'react'; // For redirection logic

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import StudentDashboardView from '@/components/dashboard/student/StudentDashboardView'; // Import the new shared view
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { useStudentDashboardMetrics } from '@/hooks/useStudentDashboardMetrics';
import { UserRole } from '@/types'; // Import UserRole

// import { DashboardHeader } from '@/components/dashboard/dashboard-header'; // Now in StudentDashboardView
// import { useStudentDashboardMetrics } from '@/hooks/useStudentDashboardMetrics'; // Now in StudentDashboardView
// import { DashboardLinkCard, type MetricState } from '@/components/dashboard/dashboard-link-card'; // Now in StudentDashboardView
// import { QuickActionsCard } from '@/components/dashboard/quick-actions-card'; // Now in StudentDashboardView

export default function StudentDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // AppLayout handles general authentication. This page adds role-specific redirection.
    if (!authIsLoading && user) {
      if (user.role !== UserRole.STUDENT) {
        // If the authenticated user is not a student, redirect them appropriately.
        // For example, redirect teachers to teacher dashboard, admins to admin dashboard.
        // Or a generic fallback if the role doesn't have a specific dashboard here.
        switch (user.role) {
          case UserRole.ADMIN:
            router.replace('/application/admin/dashboard');
            break;
          case UserRole.TEACHER:
            router.replace('/application/teacher/dashboard');
            break;
          default:
            router.replace('/'); // Fallback to a generic home or their (app) root if applicable
            break;
        }
      }
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
