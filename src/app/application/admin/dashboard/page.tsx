
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

  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);
  const [activeClassroomsCount, setActiveClassroomsCount] = useState<number | null>(null);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);

  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== UserRole.ADMIN) {
      router.replace('/application/login'); 
    }
  }, [user, router]);

  useEffect(() => {
    const fetchUsersCount = async () => {
      if (!user || user.role !== UserRole.ADMIN) return;
      setIsLoadingUsers(true);
      setErrorUsers(null);
      try {
        const usersResponse = await fetch('/api/users'); // Fetches first page by default, but totalCount is what we need
        if (!usersResponse.ok) {
          const errData = await usersResponse.json();
          throw new Error(`Failed to fetch users: ${errData.message || usersResponse.statusText}`);
        }
        const usersData = await usersResponse.json();
        setTotalUsersCount(usersData.totalCount);
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching users count:", errorMessage);
        setErrorUsers(errorMessage);
        toast({ title: "Error Fetching Users Count", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    const fetchClassroomsCount = async () => {
      if (!user || user.role !== UserRole.ADMIN) return;
      setIsLoadingClassrooms(true);
      setErrorClassrooms(null);
      try {
        const classroomsResponse = await fetch('/api/classrooms'); // No query params implies fetch all for admin
        if (!classroomsResponse.ok) {
          const errData = await classroomsResponse.json();
          throw new Error(`Failed to fetch classrooms: ${errData.message || classroomsResponse.statusText}`);
        }
        const classroomsData = await classroomsResponse.json();
        setActiveClassroomsCount(classroomsData.length);
      } catch (err) {
        const errorMessage = (err as Error).message;
        console.error("Error fetching classrooms count:", errorMessage);
        setErrorClassrooms(errorMessage);
        toast({ title: "Error Fetching Classrooms Count", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoadingClassrooms(false);
      }
    };

    if (user && user.role === UserRole.ADMIN) {
      fetchUsersCount();
      fetchClassroomsCount();
    }
  }, [user, toast]);


  if (!user || user.role !== UserRole.ADMIN) {
    return ( 
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  const displayCountOrError = (count: number | null, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error) {
        return <div className="text-destructive flex items-center"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
    }
    return <div className="text-3xl font-bold">{count ?? 0}</div>;
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
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">User Management</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            {displayCountOrError(totalUsersCount, isLoadingUsers, errorUsers, "users")}
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
            {displayCountOrError(activeClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
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
