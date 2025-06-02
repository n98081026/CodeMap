
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader
        title="System Settings"
        description="Configure global application settings and parameters."
        icon={Settings}
      >
        <Button asChild variant="outline">
          <Link href="/application/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
          </Link>
        </Button>
      </DashboardHeader>

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
              {/* Placeholder for feature flag toggles */}
            </div>
            <div>
              <h3 className="font-medium">Notification Settings</h3>
              <p className="text-sm text-muted-foreground">Configure system-wide email notifications.</p>
              {/* Placeholder for notification settings */}
            </div>
            <div>
              <h3 className="font-medium">API Rate Limits</h3>
              <p className="text-sm text-muted-foreground">Adjust API rate limits for different user roles.</p>
              {/* Placeholder for rate limit settings */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
