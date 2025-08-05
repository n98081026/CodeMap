'use client'; // Uses hooks

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
import {
  QuickActionsCard,
  type QuickActionItem,
} from '@/components/dashboard/quick-actions-card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context'; // To get user for role specific elements like Admin Panel link
import { useTeacherDashboardMetrics } from '@/hooks/useTeacherDashboardMetrics';
import { Routes } from '@/lib/routes';
import { UserRole, type User } from '@/types';

// Renamed from TeacherDashboardContent and made default export
export default function TeacherDashboardView({ user }: { user: User }) {
  const {
    managedClassrooms: managedClassroomsMetric,
    totalStudents: totalStudentsMetric,
  } = useTeacherDashboardMetrics();

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

  const teacherQuickActions: QuickActionItem[] = [
    {
      label: 'Create New Classroom',
      href: Routes.Teacher.CLASSROOMS_NEW,
      icon: Users,
      size: 'lg',
      className: 'w-full sm:w-auto',
    },
  ];

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title={`Welcome, ${user.name}!`}
        description='Manage your classrooms and student activities.'
        icon={LayoutDashboard}
      >
        {user.role === UserRole.ADMIN && (
          <Button asChild variant='outline'>
            <Link href={Routes.Admin.DASHBOARD}>Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className='grid gap-6 md:grid-cols-2'>
        <DashboardLinkCard
          title='Managed Classrooms'
          description='Classrooms you are currently teaching.'
          count={renderCount(managedClassroomsMetric, 'classrooms')}
          icon={BookOpen}
          href={Routes.Teacher.CLASSROOMS}
          linkText='Manage Classrooms'
        />
        <DashboardLinkCard
          title='Total Students'
          description='Students across all your classrooms.'
          count={renderCount(totalStudentsMetric, 'students')}
          icon={Users}
          href={Routes.Teacher.CLASSROOMS}
          linkText='View Student Lists'
        />
      </div>
      <QuickActionsCard
        actions={teacherQuickActions}
        title='Quick Actions'
        description='Common tasks for managing your teaching activities.'
      />
    </div>
  );
}
