'use client'; // Uses hooks

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context"; // To get user for role specific elements like Admin Panel link
import { UserRole, type User } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";
import { useTeacherDashboardMetrics } from "@/hooks/useTeacherDashboardMetrics";
import { QuickActionsCard, type QuickActionItem } from "@/components/dashboard/quick-actions-card";

// Renamed from TeacherDashboardContent and made default export
export default function TeacherDashboardView({ user }: { user: User }) {
  const {
    managedClassrooms: managedClassroomsMetric,
    totalStudents: totalStudentsMetric,
  } = useTeacherDashboardMetrics();

  const adminDashboardLink = "/application/admin/dashboard";

  const renderCount = (metric: { count: number | null, isLoading: boolean, error: string | null }, itemName: string) => {
    if (metric.isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (metric.error && (metric.count === 0 || metric.count === null)) {
        return <div className="text-destructive flex items-center text-sm"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{metric.count ?? 0}</div>;
  };

  const teacherQuickActions: QuickActionItem[] = [
    {
      label: "Create New Classroom",
      href: "/application/teacher/classrooms/new",
      icon: Users,
      size: "lg",
      className: "w-full sm:w-auto"
    }
  ];

  return (
    <div className="space-y-6">
       <DashboardHeader
        title={`Welcome, ${user.name}!`}
        description="Manage your classrooms and student activities."
        icon={LayoutDashboard}
        // iconLinkHref could be passed as prop if needed, or removed if generic enough.
        // For example: iconLinkHref="/application/teacher/dashboard"
      >
        {/* Display Admin Panel link if the current user (who might be a teacher viewing their own dash, or an admin viewing a teacher's) is an ADMIN */}
        {/* This requires the `user` prop passed to TeacherDashboardView to be the *currently authenticated* user, not necessarily the teacher whose dashboard is being viewed (if that scenario exists) */}
        {/* For simplicity, assuming `user` is the logged-in user. */}
        {user.role === UserRole.ADMIN && (
          <Button asChild variant="outline">
            <Link href={adminDashboardLink}>Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardLinkCard
          title="Managed Classrooms"
          description="Classrooms you are currently teaching."
          count={renderCount(managedClassroomsMetric, "classrooms")}
          icon={BookOpen}
          href="/application/teacher/classrooms"
          linkText="Manage Classrooms"
        />
        <DashboardLinkCard
          title="Total Students"
          description="Students across all your classrooms."
          count={renderCount(totalStudentsMetric, "students")}
          icon={Users}
          href="/application/teacher/classrooms" // Link to view students, likely within classroom management
          linkText="View Student Lists"
        />
      </div>
      <QuickActionsCard
        actions={teacherQuickActions}
        title="Quick Actions"
        description="Common tasks for managing your teaching activities."
      />
    </div>
  );
}
