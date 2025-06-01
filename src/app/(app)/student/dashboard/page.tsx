"use client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { BookOpen, FileText, Share2, FolderKanban, ArrowRight, LayoutDashboard, Compass } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";

// Mock data - replace with actual data fetching
const mockStudentData = {
  enrolledClassroomsCount: 2,
  conceptMapsCount: 5,
  projectSubmissionsCount: 3,
};

export default function StudentDashboardPage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <DashboardHeader 
        title={`Welcome, ${user.name}!`}
        description="Here's an overview of your activities and tools."
        icon={LayoutDashboard}
      />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">My Classrooms</CardTitle>
            <BookOpen className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStudentData.enrolledClassroomsCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Classrooms you are enrolled in.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/student/classrooms">View Classrooms <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">My Concept Maps</CardTitle>
            <Share2 className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStudentData.conceptMapsCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Concept maps you have created or have access to.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/student/concept-maps">View Maps <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Project Submissions</CardTitle>
            <FolderKanban className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{mockStudentData.projectSubmissionsCount}</div>
            <p className="text-xs text-muted-foreground mb-4">
              Projects you have submitted for analysis.
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/student/projects/submissions">View Submissions <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with common tasks quickly.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Button asChild size="lg" className="w-full">
            <Link href="/concept-maps/new">
              <Compass className="mr-2 h-5 w-5" /> Create New Concept Map
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link href="/student/projects/submit">
              <FileText className="mr-2 h-5 w-5" /> Submit New Project
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
