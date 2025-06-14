"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { BookOpen, Users, ArrowRight, LayoutDashboard } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Mock data - replace with actual data fetching
const mockTeacherData = {
  managedClassroomsCount: 3,
  totalStudentsCount: 45, // Across all classrooms
};

export default function TeacherDashboardPage() {
  const { user } = useAuth();

  if (!user) return null; // Or a loading state

  return (
    <div className="space-y-6">
       <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Manage your classrooms and student activities."
        icon={LayoutDashboard}
      >
        {user.role === UserRole.ADMIN && (
          <Button asChild variant="outline">
            <Link href="/admin/dashboard">Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Managed Classrooms</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockTeacherData.managedClassroomsCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Classrooms you are currently teaching.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/teacher/classrooms">Manage Classrooms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Total Students</CardTitle>
            <Users className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockTeacherData.totalStudentsCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Students across all your classrooms.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/teacher/classrooms">View Student Lists <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for managing your teaching activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/teacher/classrooms/new">
              <Users className="mr-2 h-5 w-5" /> Create New Classroom
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
