"use client";

import React from "react"; // Ensure React is imported for useMemo if not already via other imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, FileText, Share2, FolderKanban, LayoutDashboard, Compass, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useStudentDashboardMetrics } from "@/hooks/useStudentDashboardMetrics";
import { DashboardLinkCard, type MetricState } from "@/components/dashboard/dashboard-link-card";


export default function StudentDashboardPage() {
  const { user } = useAuth();
  const { classrooms, conceptMaps, submissions } = useStudentDashboardMetrics();

  if (!user) return null; // Or a loading spinner if auth is still resolving

  const renderMetricCount = (metric: MetricState) => {
    if (metric.isLoading) return <Loader2 className="h-7 w-7 animate-spin text-primary" />;
    if (metric.error) return <AlertTriangle className="h-7 w-7 text-destructive" title={metric.error} />;
    return metric.count !== null ? metric.count : '-';
  };

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DashboardLinkCard
          title="My Classrooms"
          description="Classrooms you are enrolled in."
          count={renderMetricCount(classrooms)}
          icon={BookOpen}
          href="/application/student/classrooms"
          linkText="View Classrooms"
        />
        <DashboardLinkCard
          title="My Concept Maps"
          description="Concept maps you have created or have access to."
          count={renderMetricCount(conceptMaps)}
          icon={Share2}
          href="/application/student/concept-maps"
          linkText="View Maps"
        />
        <DashboardLinkCard
          title="Project Submissions"
          description="Projects you have submitted for analysis."
          count={renderMetricCount(submissions)}
          icon={FolderKanban}
          href="/application/student/projects/submissions"
          linkText="View Submissions"
        />
      </div>

      <Card className="shadow-lg">
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
