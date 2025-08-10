'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import AdminDashboardView from '@/components/dashboard/admin/AdminDashboardView'; // Import the new shared view
import { useAuth } from '@/contexts/auth-context';
import { Routes } from '@/lib/routes';
import { UserRole } from '@/types';

// DashboardHeader, useAdminDashboardMetrics, DashboardLinkCard, MetricState, Loader2, AlertTriangle, Users, Settings, LayoutDashboard
// are now encapsulated within AdminDashboardView or not directly needed by this page component.

// Loader2 might still be needed for the top-level loading state if not handled by AppLayout sufficiently

export default function AdminDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();

  // isLoading from useAuth in AppLayout handles the initial loading state.
  // This page should only render if authentication is complete and successful.
  // If AppLayout is already showing a loader, this might be redundant or can be simplified.
  if (authIsLoading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  if (!user || user.role !== UserRole.ADMIN) {
    // This state should ideally be caught by AppLayout's redirect or the useEffect above.
    // Returning null or a minimal loader avoids rendering content if there's a brief moment before redirect.
    return (
      <div className='flex h-full items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
      </div>
    );
  }

  // Render the shared view component
  // The 'user' prop might be passed if AdminDashboardView needs it,
  // though AdminDashboardView itself uses useAdminDashboardMetrics which doesn't strictly need user from props.
  return <AdminDashboardView />;
}
