"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { Users, Settings, ArrowRight, LayoutDashboard } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Mock data - replace with actual data fetching
const mockAdminData = {
  totalUsersCount: 150,
  activeClassroomsCount: 15,
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.replace('/login'); // Or a more appropriate redirect
    }
  }, [user, router]);

  if (!user || user.role !== UserRole.ADMIN) {
    return null; // Or a loading/unauthorized state
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Admin Dashboard"
        description="System overview and management tools."
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">User Management</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockAdminData.totalUsersCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Total registered users in the system.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/admin/users">Manage Users <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">System Settings</CardTitle>
            <Settings className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockAdminData.activeClassroomsCount}</div>
             <p className="text-xs text-muted-foreground mb-4">
              Active classrooms. Configure system parameters here.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full" disabled>
              <Link href="#">Configure Settings <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
