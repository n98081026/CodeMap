
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import Link from "next/link";
import { UserRole } from "@/types";
import { useAuth } from "@/contexts/auth-context";


export default function AdminSettingsPage() {
  const { user } = useAuth();
  let adminDashboardLink = "/application/admin/dashboard";
   if (user && user.role !== UserRole.ADMIN) {
     adminDashboardLink = user.role === UserRole.TEACHER ? "/application/teacher/dashboard" : "/application/student/dashboard";
  }

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="System Settings"
        description="Configure global application settings and parameters."
        icon={Settings}
        iconLinkHref={adminDashboardLink}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Configuration Options</CardTitle>
          <CardDescription>
            This is a placeholder for system configuration options.
            Actual settings would be implemented here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Feature Flags</h3>
              <p className="text-sm text-muted-foreground">Enable or disable experimental features.</p>
            </div>
            <div>
              <h3 className="font-medium">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">Configure system-wide email notifications.</p>
            </div>
            <div>
              <h3 className="font-medium">API Rate Limits</h3>
              <p className="text-sm text-muted-foreground">Adjust API rate limits for different user roles.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
