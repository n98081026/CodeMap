"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types";
import { BookOpen, Users, LayoutDashboard, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useTeacherDashboardMetrics } from "@/hooks/useTeacherDashboardMetrics";
import { DashboardLinkCard, type MetricState } from "@/components/dashboard/dashboard-link-card";


export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { managedClassrooms, totalStudents } = useTeacherDashboardMetrics();

  if (!user) return null; // Or a loading state

  const renderMetricCount = (metric: MetricState) => {
    if (metric.isLoading) return <Loader2 className="h-7 w-7 animate-spin text-primary" />;
    if (metric.error) return <AlertTriangle className="h-7 w-7 text-destructive" title={metric.error} />;
    return metric.count !== null ? metric.count : '-';
  };

  return (
    <div className="space-y-6">
       <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Manage your classrooms and student activities."
        icon={LayoutDashboard}
      >
        {user.role === UserRole.ADMIN && (
          <Button asChild variant="outline">
            <Link href="/application/admin/dashboard">Admin Panel</Link>
          </Button>
        )}
      </DashboardHeader>

      <div className="grid gap-6 md:grid-cols-2">
        <DashboardLinkCard
          title="Managed Classrooms"
          description="Classrooms you are currently teaching."
          count={renderMetricCount(managedClassrooms)}
          icon={BookOpen}
          href="/application/teacher/classrooms"
          linkText="Manage Classrooms"
        />
        <DashboardLinkCard
          title="Total Students"
          description="Students across all your classrooms."
          count={renderMetricCount(totalStudents)}
          icon={Users}
          href="/application/teacher/classrooms"
          linkText="View Student Lists"
        />
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for managing your teaching activities.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href="/application/teacher/classrooms/new">
              <Users className="mr-2 h-5 w-5" /> Create New Classroom
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
