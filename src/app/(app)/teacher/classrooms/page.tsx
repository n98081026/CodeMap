
"use client";

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookOpen, Loader2, AlertTriangle, ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ClassroomListItem } from "@/components/classrooms/classroom-list-item";
import { EditClassroomDialog } from "@/components/teacher/classrooms/edit-classroom-dialog";
import { EmptyState } from "@/components/ui/empty-state";

const CLASSROOMS_PER_PAGE = 9;

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalClassrooms, setTotalClassrooms] = useState(0);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);

  const fetchTeacherClassrooms = useCallback(async (pageToFetch: number) => {
    setIsLoading(true);
    setError(null);

    if (!user?.id) {
      setError("User not authenticated.");
      setIsLoading(false);
      toast({ title: "Authentication Error", description: "User not authenticated.", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch(`/api/classrooms?teacherId=${user.id}&page=${pageToFetch}&limit=${CLASSROOMS_PER_PAGE}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classrooms");
      }
      const data = await response.json();
      setClassrooms(data.classrooms);
      setTotalClassrooms(data.totalCount);
      setTotalPages(data.totalPages);
      setCurrentPage(data.page);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
      toast({ title: "Error Fetching Classrooms", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    if (user?.id) {
      fetchTeacherClassrooms(currentPage);
    }
  }, [user?.id, currentPage, fetchTeacherClassrooms]);

  const openEditModal = useCallback((classroom: Classroom) => {
    setEditingClassroom(classroom);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClassroom = useCallback(async (classroomId: string, classroomName: string) => {
    try {
      const response = await fetch(`/api/classrooms/${classroomId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete classroom");
      }
      toast({ title: "Classroom Deleted", description: `"${classroomName}" has been successfully deleted.` });
      // Refetch or adjust page
      if (classrooms.length === 1 && currentPage > 1) {
        setCurrentPage(prevPage => prevPage - 1); // Go to previous page if last item on current page deleted
      } else {
        fetchTeacherClassrooms(currentPage);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
      toast({ title: "Error Deleting Classroom", description: errorMessage, variant: "destructive" });
    }
  }, [toast, fetchTeacherClassrooms, currentPage, classrooms.length]);

  const handlePreviousPage = () => {
    setCurrentPage(p => Math.max(1, p - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(p => Math.min(totalPages, p + 1));
  };

  const renderContent = () => {
    if (isLoading && classrooms.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      );
    }

    if (error) {
      return (
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12 text-destructive" />}
          title="Error Loading Classrooms"
          description={error}
          action={<Button onClick={() => fetchTeacherClassrooms(currentPage)}>Retry</Button>}
        />
      );
    }

    if (classrooms.length === 0) {
      return (
        <EmptyState
          icon={<BookOpen className="h-12 w-12 text-muted-foreground" />}
          title="No Classrooms Yet"
          description="You haven't created or been assigned to any classrooms."
          action={
            <Button asChild>
              <Link href="/teacher/classrooms/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
              </Link>
            </Button>
          }
        />
      );
    }

    return (
      <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classrooms.map((classroom) => (
            <ClassroomListItem
              key={classroom.id}
              classroom={classroom}
              userRole={UserRole.TEACHER}
              onEdit={() => openEditModal(classroom)}
              onDelete={() => handleDeleteClassroom(classroom.id, classroom.name)}
            />
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center space-x-4">
            <Button onClick={handlePreviousPage} disabled={currentPage === 1 || isLoading} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button onClick={handleNextPage} disabled={currentPage === totalPages || isLoading} variant="outline">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Classrooms"
        description="View, edit, and manage your classrooms."
        icon={BookOpen}
      >
        <Button asChild>
          <Link href="/teacher/classrooms/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
          </Link>
        </Button>
      </DashboardHeader>
      
      {renderContent()}

      {isEditModalOpen && editingClassroom && (
        <EditClassroomDialog
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          classroomToEdit={editingClassroom}
          onActionCompleted={() => {
            setIsEditModalOpen(false); // Close modal first
            fetchTeacherClassrooms(currentPage); // Then refetch
          }}
        />
      )}
    </div>
  );
}

