
"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { BookOpen, Loader2, AlertTriangle, Library } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/layout/empty-state";
import { ClassroomListItem } from "@/components/classrooms/classroom-list-item";

export default function StudentClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [enrolledClassrooms, setEnrolledClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const studentDashboardLink = "/application/student/dashboard";

  const fetchEnrolledClassrooms = useCallback(async () => {
    if (!user) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classrooms?studentId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch enrolled classrooms");
      }
      const data: Classroom[] = await response.json();
      setEnrolledClassrooms(data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Classrooms", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchEnrolledClassrooms();
  }, [user, fetchEnrolledClassrooms]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Classrooms"
        description="Here are the classrooms you are currently enrolled in."
        icon={BookOpen}
        iconLinkHref={studentDashboardLink}
      />

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your classrooms...</p>
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
            icon={AlertTriangle}
            title="Error Loading Classrooms"
            description={error}
            actionButton={<Button onClick={fetchEnrolledClassrooms} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && enrolledClassrooms.length === 0 && (
        <EmptyState
          icon={Library}
          title="No Classrooms Yet"
          description="You are not currently enrolled in any classrooms. If you have an invite code, your teacher can provide instructions on how to join."
        />
      )}

      {!isLoading && !error && enrolledClassrooms.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {enrolledClassrooms.map((classroom) => (
            <ClassroomListItem
              key={classroom.id}
              classroom={classroom}
              userRole={UserRole.STUDENT}
              detailLinkHref={`/application/student/classrooms/${classroom.id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

