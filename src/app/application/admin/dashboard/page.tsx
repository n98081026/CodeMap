'use client';
import {
  Users,
  Settings,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import AdminDashboardView from '@/components/dashboard/admin/AdminDashboardView'; // Import the new shared view
import { DashboardHeader } from '@/components/dashboard/dashboard-header'; // Kept for context, though AdminDashboardView also imports it
// import { DashboardLinkCard } from '@/components/dashboard/dashboard-link-card'; // Now part of AdminDashboardView
// import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics'; // Now part of AdminDashboardView
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { useAuth } from '@/contexts/auth-context';
import { UserRole, type User } from '@/types';

export default function AdminDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== UserRole.ADMIN) {
        router.replace('/login'); // Or a more specific unauthorized page for non-admins
      }
    }
  }, [user, authIsLoading, router]);

  if (authIsLoading || !user) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  if (user.role !== UserRole.ADMIN) {
    // This case should ideally be handled by the redirect in useEffect,
    // but returning null prevents rendering the content component if role mismatch occurs briefly.
    return null;
  }

  // Render the shared view component, passing the user prop
  return <AdminDashboardView user={user} />;
}
