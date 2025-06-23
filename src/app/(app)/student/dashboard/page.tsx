"use client";

import React from "react"; // Ensure React is imported for useMemo if not already via other imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { UserRole } from "@/types"; // Import UserRole
import { BookOpen, FileText, Share2, FolderKanban, LayoutDashboard, Compass, Loader2, AlertTriangle, Users, Settings } from "lucide-react"; // Added Users, Settings
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useStudentDashboardMetrics } from "@/hooks/useStudentDashboardMetrics";
import { DashboardLinkCard, type MetricState } from "@/components/dashboard/dashboard-link-card";
import { QuickActionsCard } from "@/components/dashboard/quick-actions-card";


export default function StudentDashboardPage() {
  const { user } = useAuth();
  // For a "general" dashboard, student-specific metrics might be fetched conditionally or not at all if not a student.
  // For now, we assume they are fetched, and we'll conditionally display them.
  const { classrooms, conceptMaps, submissions } = useStudentDashboardMetrics();

  if (!user) return null;

  const renderMetricCount = (metric: MetricState) => {
    if (metric.isLoading) return <Loader2 className="h-7 w-7 animate-spin text-primary" />;
    if (metric.error) return <AlertTriangle className="h-7 w-7 text-destructive" title={metric.error} />;
    return metric.count !== null ? metric.count : '-';
  };

  const isStudentRole = user.role === UserRole.STUDENT;
  // We can add checks for other roles if this dashboard becomes truly role-agnostic
  // For now, we'll tailor it slightly if it's a student.

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description={isStudentRole ? "Here's an overview of your activities and tools." : "Manage your projects and concept maps."}
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Common cards - always visible */}
        <DashboardLinkCard
          title="My Concept Maps"
          description="Concept maps you have created or have access to."
          count={renderMetricCount(conceptMaps)} // This hook might need to be generalized or conditionally called
          icon={Share2}
          href="/application/student/concept-maps" // Link might need to be generalized if not a student
          linkText="View My Maps"
        />
        <DashboardLinkCard
          title="My Project Analyses"
          description="Projects you have submitted for analysis."
          count={renderMetricCount(submissions)} // This hook might need to be generalized
          icon={FolderKanban}
          href="/application/student/projects/submissions" // Link might need to be generalized
          linkText="View My Analyses"
        />

        {/* Student-specific card */}
        {isStudentRole && (
          <DashboardLinkCard
            title="My Classrooms"
            description="Classrooms you are enrolled in."
            count={renderMetricCount(classrooms)}
            icon={BookOpen}
            href="/application/student/classrooms"
            linkText="View Classrooms"
          />
        )}

        {/* Placeholder for other role-specific quick links if needed */}
        {user.role === UserRole.TEACHER && (
             <DashboardLinkCard
                title="Manage Classrooms"
                description="Access your teacher dashboard."
                icon={Users}
                href="/application/teacher/dashboard"
                linkText="Teacher Dashboard"
            />
        )}
        {user.role === UserRole.ADMIN && (
            <DashboardLinkCard
                title="Admin Panel"
                description="Access system administration tools."
                icon={Settings}
                href="/application/admin/dashboard"
                linkText="Admin Dashboard"
            />
        )}
      </div>

      <QuickActionsCard
        actions={[
          { href: "/application/concept-maps/editor/new", label: "Create New Concept Map", icon: Compass },
          { href: "/application/student/projects/submit", label: "Analyze New Project", icon: FileText }
        ]}
        title="Get Started"
        description="Quickly access common tasks."
      />

      {/* Original Quick Actions Card - can be removed or merged into QuickActionsCard logic */}
      {/* <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks quickly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/application/concept-maps/editor/new">
              <Compass className="mr-2 h-5 w-5" /> Create New Concept Map
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/application/student/projects/submit">
              <FileText className="mr-2 h-5 w-5" /> Submit New Project
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
