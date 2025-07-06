'use client';
import {
  BookOpen,
  Users,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardLinkCard } from '@/components/dashboard/dashboard-link-card';
import TeacherDashboardView from '@/components/dashboard/teacher/TeacherDashboardView'; // Import the new shared view
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useTeacherDashboardMetrics } from '@/hooks/useTeacherDashboardMetrics';
import { UserRole, type User } from '@/types';
// Necessary imports for page-level logic
import { UserRole, type User } from '@/types';

// Removed imports that are now encapsulated in TeacherDashboardView:
// import { Button } from "@/components/ui/button";
// import Link from "next/link";
// import { BookOpen, Users, LayoutDashboard, AlertTriangle } from "lucide-react";
// import { DashboardHeader } from "@/components/dashboard/dashboard-header";
// import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";
// import { useTeacherDashboardMetrics } from "@/hooks/useTeacherDashboardMetrics";
// import { QuickActionsCard, type QuickActionItem } from "@/components/dashboard/quick-actions-card";

const LoadingSpinner = () => (
  <div className='flex h-screen w-screen items-center justify-center'>
    <Loader2 className='h-12 w-12 animate-spin text-primary' />
  </div>
);

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();

  if (authIsLoading || (!user && !authIsLoading)) {
    return <LoadingSpinner />;
  }

  // Ensure the user is either a TEACHER or an ADMIN to view this page.
  // AppLayout might handle the general !user case, but role check is specific here.
  if (
    !user ||
    (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN)
  ) {
    // In a real app, you might redirect or show an "Unauthorized" component.
    // For now, returning null relies on AppLayout's potential redirect or shows nothing.
    // Consider router.replace('/login') or router.replace('/unauthorized') if AppLayout doesn't cover this.
    return null;
  }

  // Render the shared TeacherDashboardView, passing the authenticated user
  return <TeacherDashboardView user={user} />;
}
