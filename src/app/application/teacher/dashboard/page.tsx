
"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useEffect } from "react";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";
import { useTeacherDashboardMetrics } from "@/hooks/useTeacherDashboardMetrics";
import { QuickActionsCard, type QuickActionItem } from "@/components/dashboard/quick-actions-card";

const LoadingSpinner = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <Loader2 className="h-12 w-12 animate-spin text-primary" />
  </div>
);

export default function TeacherDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const {
    managedClassrooms: managedClassroomsMetric,
    totalStudents: totalStudentsMetric,
  } = useTeacherDashboardMetrics();

  const adminDashboardLink = "/application/admin/dashboard";

  useEffect(() => {
    // Hook handles fetching based on user role and availability
  }, [user]);

  if (authIsLoading || (!user && !authIsLoading)) return <LoadingSpinner />;
  if (!user || (user.role !== UserRole.TEACHER && user.role !== UserRole.ADMIN) ) return null;

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
        iconLinkHref="/application/teacher/dashboard"
      >
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
          href="/application/teacher/classrooms" // Link to classrooms page, student lists are per classroom
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
