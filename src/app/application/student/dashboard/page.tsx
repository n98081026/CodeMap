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
} from 'lucide-react';
import Link from 'next/link';

import type { User } from '@/types';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardLinkCard } from '@/components/dashboard/dashboard-link-card';
// import { DashboardHeader } from "@/components/dashboard/dashboard-header"; // Now in StudentDashboardView
// import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card"; // Now in StudentDashboardView
// import { useStudentDashboardMetrics } from "@/hooks/useStudentDashboardMetrics"; // Now in StudentDashboardView
// import { QuickActionsCard, type QuickActionItem } from "@/components/dashboard/quick-actions-card"; // Now in StudentDashboardView
import StudentDashboardView from '@/components/dashboard/student/StudentDashboardView'; // Import the new shared view
import { useAuth } from '@/contexts/auth-context';
import { useStudentDashboardMetrics } from '@/hooks/useStudentDashboardMetrics';

const LoadingSpinner = () => (
  <div className='flex h-screen w-screen items-center justify-center'>
    <Loader2 className='h-12 w-12 animate-spin text-primary' />
  </div>
);

export default function StudentDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();

  if (authIsLoading || (!user && !authIsLoading)) {
    // AppLayout also handles redirects if !isAuthenticated after loading,
    // but this ensures StudentDashboardPage doesn't try to render content prematurely.
    return <LoadingSpinner />;
  }

  if (!user) {
    // This case should ideally be handled by AppLayout's redirect.
    // If reached, it means auth loaded, but user is null (not authenticated).
    // Or, if this page is meant ONLY for students, a role check could be added here too,
    // though AppLayout is a more general place for auth checks.
    return null;
  }

  // At this point, user is authenticated.
  // Pass the user prop to the shared view.
  return <StudentDashboardView user={user} />;
}
