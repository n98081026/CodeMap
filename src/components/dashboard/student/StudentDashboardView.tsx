'use client'; // Keep 'use client' as it uses hooks

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

import type { User } from '@/types';

import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardLinkCard } from '@/components/dashboard/dashboard-link-card';
import {
  QuickActionsCard,
  type QuickActionItem,
} from '@/components/dashboard/quick-actions-card';
import { useStudentDashboardMetrics } from '@/hooks/useStudentDashboardMetrics';
import { Routes } from '@/lib/routes';

// Renamed from StudentDashboardContent and made default export
export default function StudentDashboardView({ user }: { user: User }) {
  const {
    classrooms: classroomsMetric,
    conceptMaps: conceptMapsMetric,
    submissions: submissionsMetric,
  } = useStudentDashboardMetrics();

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

  const studentQuickActions: QuickActionItem[] = [
    {
      label: 'Create New Concept Map',
      href: Routes.ConceptMaps.NEW,
      icon: Compass,
      size: 'lg',
      className: 'w-full',
    },
    {
      label: 'Submit New Project',
      href: Routes.Student.PROJECTS_SUBMIT,
      icon: FileText,
      variant: 'secondary',
      size: 'lg',
      className: 'w-full',
    },
  ];

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title={`Welcome, ${user.name}!`}
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
      />

      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3'>
        <DashboardLinkCard
          title='My Classrooms'
          description='Classrooms you are enrolled in.'
          count={renderCount(classroomsMetric, 'classrooms')}
          icon={BookOpen}
          href={Routes.Student.CLASSROOMS}
          linkText='View Classrooms'
        />
        <DashboardLinkCard
          title='My Concept Maps'
          description='Concept maps you have created or have access to.'
          count={renderCount(conceptMapsMetric, 'maps')}
          icon={Share2}
          href={Routes.Student.CONCEPT_MAPS}
          linkText='View Maps'
        />
        <DashboardLinkCard
          title='Project Submissions'
          description='Projects you have submitted for analysis.'
          count={renderCount(submissionsMetric, 'submissions')}
          icon={FolderKanban}
          href={Routes.Student.PROJECTS_SUBMISSIONS}
          linkText='View Submissions'
        />
      </div>
      <QuickActionsCard actions={studentQuickActions} />
    </div>
  );
}
