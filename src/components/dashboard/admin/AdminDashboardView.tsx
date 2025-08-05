'use client'; // Keep 'use client' as it uses hooks

import {
  Users,
  Settings,
  LayoutDashboard,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';

// Removed useRouter and useEffect as they are page-level concerns for auth
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardLinkCard } from '@/components/dashboard/dashboard-link-card';
import { useAdminDashboardMetrics } from '@/hooks/useAdminDashboardMetrics';
import { Routes } from '@/lib/routes';
import { type User } from '@/types'; // Assuming User type is needed and correctly pathed

// Renamed from AdminDashboardContent and made default export
export default function AdminDashboardView({ user }: { user: User }) {
  // user prop might not be strictly needed if not used directly for display here
  const { users: usersMetric, classrooms: classroomsMetric } =
    useAdminDashboardMetrics();

  const renderCount = (
    metric: { count: number | null; isLoading: boolean; error: string | null },
    itemName: string
  ) => {
    if (metric.isLoading) {
      return (
        <div className='flex items-center space-x-2 text-muted-foreground'>
          <Loader2 className='h-6 w-6 animate-spin' />{' '}
          <span>Loading {itemName}...</span>
        </div>
      );
    }
    if (metric.error && (metric.count === 0 || metric.count === null)) {
      return (
        <div className='text-destructive flex items-center text-sm'>
          <AlertTriangle className='mr-1 h-5 w-5' /> Error
        </div>
      );
    }
    return <div className='text-3xl font-bold'>{metric.count ?? 0}</div>;
  };

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='Admin Dashboard'
        description='System overview and management tools.'
        icon={LayoutDashboard}
        // iconLinkHref might need to be passed as a prop if it varies,
        // or removed if the header doesn't need a link specific to this view's context.
        // For now, let's assume it's generic or handled by the page using this view.
        // Example: iconLinkHref='/application/admin/dashboard' (or remove if not needed by the shared view itself)
      />

      <div className='grid gap-6 md:grid-cols-2'>
        <DashboardLinkCard
          title='User Management'
          description='Total registered users in the system.'
          count={renderCount(usersMetric, 'users')}
          icon={Users}
          href={Routes.Admin.USERS}
          linkText='Manage Users'
        />
        <DashboardLinkCard
          title='System Settings'
          description='Active classrooms. Configure system parameters here.'
          count={renderCount(classroomsMetric, 'classrooms')}
          icon={Settings}
          href={Routes.Admin.SETTINGS}
          linkText='Configure Settings'
        />
      </div>
    </div>
  );
}
