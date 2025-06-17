
"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { Users, Settings, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useAdminDashboardMetrics } from "@/hooks/useAdminDashboardMetrics";
import { DashboardLinkCard, type MetricState } from "@/components/dashboard/dashboard-link-card";


export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { users, classrooms } = useAdminDashboardMetrics();

  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.replace('/login'); // Or a more appropriate redirect
    }
  }, [user, router]);

  if (!user || user.role !== UserRole.ADMIN) {
    return null; // Or a loading/unauthorized state
  }

  const renderMetricCount = (metric: MetricState) => {
    if (metric.isLoading) return <Loader2 className="h-7 w-7 animate-spin text-primary" />;
    if (metric.error) return <AlertTriangle className="h-7 w-7 text-destructive" title={metric.error} />;
    return metric.count !== null ? metric.count : '-';
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Admin Dashboard"
        description="System overview and management tools."
        icon={LayoutDashboard}
        iconLinkHref="/" // Or link to a main admin overview if different from current page
      />

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardLinkCard
          title="User Management"
          description="Total registered users in the system."
          count={renderMetricCount(users)}
          icon={Users}
          href="/application/admin/users"
          linkText="Manage Users"
        />
        <DashboardLinkCard
          title="System Settings" // Title can be "Active Classrooms" if preferred
          description="Active classrooms. Configure system parameters here." // Or "Total active classrooms in the system."
          count={renderMetricCount(classrooms)}
          icon={Settings} // Or BookOpen for classrooms
          href="/application/admin/settings"
          linkText="Configure Settings"
        />
      </div>
    </div>
  );
}

