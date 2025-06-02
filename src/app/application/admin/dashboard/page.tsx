
"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { Users, Settings, ArrowRight, LayoutDashboard, BookOpen, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";

interface AdminDashboardData {
  totalUsersCount: number;
  activeClassroomsCount: number;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.replace('/application/login'); 
    }
  }, [user, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user || user.role !== UserRole.ADMIN) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        // Fetch all users for count
        const usersResponse = await fetch('/api/users');
        if (!usersResponse.ok) {
          const errData = await usersResponse.json();
          throw new Error(`Failed to fetch users: ${errData.message || usersResponse.statusText}`);
        }
        const usersData = await usersResponse.json();
        const totalUsersCount = usersData.totalCount; // Use totalCount from paginated response

        // Fetch all classrooms for count (admin scope)
        const classroomsResponse = await fetch('/api/classrooms'); // No query params implies fetch all for admin
        if (!classroomsResponse.ok) {
          const errData = await classroomsResponse.json();
          throw new Error(`Failed to fetch classrooms: ${errData.message || classroomsResponse.statusText}`);
        }
        const classroomsData = await classroomsResponse.json();
        const activeClassroomsCount = classroomsData.length;
        
        setDashboardData({
          totalUsersCount: totalUsersCount,
          activeClassroomsCount: activeClassroomsCount,
        });

      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching admin dashboard data:", errorMessage);
        setError(errorMessage);
        toast({ title: "Error Fetching Dashboard Data", description: errorMessage, variant: "destructive" });
        setDashboardData({ totalUsersCount: 0, activeClassroomsCount: 0 }); // Set to default on error
      } finally {
        setIsLoading(false);
      }
    };

    if (user && user.role === UserRole.ADMIN) {
      fetchDashboardData();
    }
  }, [user, toast]);


  if (!user || user.role !== UserRole.ADMIN) {
    return ( 
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title="Admin Dashboard"
        description="System overview and management tools."
        icon={LayoutDashboard}
        iconLinkHref="/"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">User Management</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" /> <span>Loading users...</span>
              </div>
            ) : error && dashboardData?.totalUsersCount === 0 ? ( 
              <div className="text-destructive"><AlertTriangle className="inline mr-1 h-4 w-4" />Error</div>
            ) : (
              <div className="text-3xl font-bold">{dashboardData?.totalUsersCount ?? 0}</div>
            )}
            <p className="text-xs text-muted-foreground mb-4">
              Total registered users in the system.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/admin/users">Manage Users <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">System Settings</CardTitle>
            <Settings className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
             {isLoading ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-6 w-6 animate-spin" /> <span>Loading classrooms...</span>
              </div>
            ) : error && dashboardData?.activeClassroomsCount === 0 ? (
              <div className="text-destructive"><AlertTriangle className="inline mr-1 h-4 w-4" />Error</div>
            ) : (
              <div className="text-3xl font-bold">{dashboardData?.activeClassroomsCount ?? 0}</div>
            )}
             <p className="text-xs text-muted-foreground mb-4">
              Active classrooms. Configure system parameters here.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/application/admin/settings">Configure Settings <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
