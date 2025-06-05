
"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { Users, Settings, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";
import { useAdminDashboardMetrics } from "@/hooks/useAdminDashboardMetrics";

export default function AdminDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { users: usersMetric, classrooms: classroomsMetric, fetchMetrics } = useAdminDashboardMetrics();

  useEffect(() => {
    if (!authIsLoading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== UserRole.ADMIN) {
        router.replace('/login'); // Or a more appropriate unauthorized page
      }
    }
  }, [user, authIsLoading, router]);

  if (authIsLoading || !user) {
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  if (user.role !== UserRole.ADMIN) return null;


  const renderCount = (metric: { count: number | null, isLoading: boolean, error: string | null }, itemName: string) => {
    if (metric.isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (metric.error && (metric.count === 0 || metric.count === null)) {
        return <div className="text-destructive flex items-center text-sm"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{metric.count ?? 0}</div>;
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Admin Dashboard"
        description="System overview and management tools."
        icon={LayoutDashboard}
        iconLinkHref="/application/admin/dashboard"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardLinkCard
          title="User Management"
          description="Total registered users in the system."
          count={renderCount(usersMetric, "users")}
          icon={Users}
          href="/application/admin/users"
          linkText="Manage Users"
        />
        <DashboardLinkCard
          title="System Settings"
          description="Active classrooms. Configure system parameters here."
          count={renderCount(classroomsMetric, "classrooms")}
          icon={Settings}
          href="/application/admin/settings"
          linkText="Configure Settings"
        />
      </div>
    </div>
  );
}
