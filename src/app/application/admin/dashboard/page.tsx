"use client";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { Users, Settings, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { DashboardLinkCard } from "@/components/dashboard/dashboard-link-card";

export default function AdminDashboardPage() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [totalUsersCount, setTotalUsersCount] = useState<number | null>(null);
  const [activeClassroomsCount, setActiveClassroomsCount] = useState<number | null>(null);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingClassrooms, setIsLoadingClassrooms] = useState(true);

  const [errorUsers, setErrorUsers] = useState<string | null>(null);
  const [errorClassrooms, setErrorClassrooms] = useState<string | null>(null);

  const fetchUsersCount = useCallback(async () => {
    if (!user || user.role !== UserRole.ADMIN) return;
    setIsLoadingUsers(true);
    setErrorUsers(null);
    try {
      const usersResponse = await fetch('/api/users?page=1&limit=1'); // Fetch only 1 to get totalCount
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
  }, [user, toast]);

  const fetchClassroomsCount = useCallback(async () => {
    if (!user || user.role !== UserRole.ADMIN) return;
    setIsLoadingClassrooms(true);
    setErrorClassrooms(null);
    try {
      // Assuming /api/classrooms without params returns all for admin count, or has a specific admin count endpoint
      const classroomsResponse = await fetch('/api/classrooms'); 
      if (!classroomsResponse.ok) {
        const errData = await classroomsResponse.json();
        throw new Error(`Failed to fetch classrooms: ${errData.message || classroomsResponse.statusText}`);
      }
      const classroomsData = await classroomsResponse.json();
      // If API returns { classrooms: [], totalCount: number }
      if (typeof classroomsData.totalCount === 'number') {
        setActiveClassroomsCount(classroomsData.totalCount);
      } else if (Array.isArray(classroomsData)) { // If it returns array directly
        setActiveClassroomsCount(classroomsData.length);
      } else {
        setActiveClassroomsCount(0); // Fallback if structure is unexpected
      }
    } catch (err) {
      const errorMessage = (err as Error).message;
      console.error("Error fetching classrooms count:", errorMessage);
      setErrorClassrooms(errorMessage); 
      toast({ title: "Error Fetching Classrooms Count", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingClassrooms(false);
    }
  }, [user, toast]);


  useEffect(() => {
    if (!authIsLoading) { // Ensure auth state is resolved
        if (user && user.role !== UserRole.ADMIN) {
        router.replace('/application/login'); 
        } else if (user && user.role === UserRole.ADMIN) {
        fetchUsersCount();
        fetchClassroomsCount();
        } else if (!user) { // No user, redirect to login
            router.replace('/login');
        }
    }
  }, [user, router, fetchUsersCount, fetchClassroomsCount, authIsLoading]);


  if (authIsLoading || (!user && !authIsLoading)) { // Show loader if auth is loading OR if redirection should happen
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }
  if (!user || user.role !== UserRole.ADMIN) return null; // Should be redirected by useEffect


  const renderCount = (count: number | null, isLoading: boolean, error: string | null, itemName: string) => {
    if (isLoading) {
      return <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /> <span>Loading {itemName}...</span></div>;
    }
    if (error && (count === 0 || count === null)) {
        return <div className="text-destructive flex items-center text-sm"><AlertTriangle className="mr-1 h-5 w-5" /> Error</div>;
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
        <DashboardLinkCard
          title="User Management"
          description="Total registered users in the system."
          count={renderCount(totalUsersCount, isLoadingUsers, errorUsers, "users")}
          icon={Users}
          href="/application/admin/users"
          linkText="Manage Users"
        />
        <DashboardLinkCard
          title="System Settings"
          description="Active classrooms. Configure system parameters here."
          count={renderCount(activeClassroomsCount, isLoadingClassrooms, errorClassrooms, "classrooms")}
          icon={Settings}
          href="/application/admin/settings"
          linkText="Configure Settings"
        />
      </div>
    </div>
  );
}