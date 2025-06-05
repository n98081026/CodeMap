
// src/app/application/teacher/classrooms/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useDeferredValue } from "react";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, BookOpen, Loader2, AlertTriangle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card"; 
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/layout/empty-state";
import { ClassroomListItem } from "@/components/classrooms/classroom-list-item";
import { EditClassroomDialog } from "@/components/teacher/classrooms/edit-classroom-dialog"; 

const CLASSROOMS_PER_PAGE = 6;

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacherClassrooms, setTeacherClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalClassrooms, setTotalClassrooms] = useState(0);
  const totalPages = Math.ceil(totalClassrooms / CLASSROOMS_PER_PAGE);

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const headerIconLink = "/application/teacher/dashboard";

  const fetchTeacherClassrooms = useCallback(async (page: number, search: string) => {
    if (!user || !user.id) {
      setIsLoading(false);
      setError("User not authenticated.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams({
        teacherId: user.id,
        page: page.toString(),
        limit: CLASSROOMS_PER_PAGE.toString(),
      });
      if (search.trim()) {
        searchParams.append('search', search.trim());
      }

      const response = await fetch(`/api/classrooms?${searchParams.toString()}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classrooms");
      }
      const data = await response.json() as { classrooms: Classroom[], totalCount: number };
      setTeacherClassrooms(data.classrooms);
      setTotalClassrooms(data.totalCount);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTeacherClassrooms(currentPage, deferredSearchTerm);
  }, [currentPage, deferredSearchTerm, fetchTeacherClassrooms]);

  useEffect(() => {
    setCurrentPage(1); 
  }, [deferredSearchTerm]);

  const handleDeleteClassroom = useCallback(async (classroomId: string, classroomName: string) => {
    try {
      const response = await fetch(`/api/classrooms/${classroomId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete classroom");
      }
      toast({ title: "Classroom Deleted", description: `Classroom "${classroomName}" has been deleted.` });
      if (teacherClassrooms.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchTeacherClassrooms(currentPage, deferredSearchTerm);
      }
    } catch (err) {
      toast({ title: "Error Deleting Classroom", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast, teacherClassrooms.length, currentPage, fetchTeacherClassrooms, deferredSearchTerm]);

  const openEditModal = useCallback((classroom: Classroom) => {
    setEditingClassroom(classroom);
    setIsEditModalOpen(true);
  }, []);

  const handleClassroomUpdateSuccess = useCallback(() => {
    fetchTeacherClassrooms(currentPage, deferredSearchTerm);
  }, [currentPage, deferredSearchTerm, fetchTeacherClassrooms]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Classrooms"
        description="View, edit, and manage your classrooms."
        icon={BookOpen}
        iconLinkHref={headerIconLink}
      >
        <Button asChild>
          <Link href="/application/teacher/classrooms/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
          </Link>
        </Button>
      </DashboardHeader>

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter by classroom name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full max-w-sm"
          />
        </div>
      </div>

      {isLoading && !error && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading classrooms...</p>
        </div>
      )}

      {error && !isLoading && (
         <EmptyState
            icon={AlertTriangle}
            title="Error Loading Classrooms"
            description={error}
            actionButton={<Button onClick={() => fetchTeacherClassrooms(currentPage, deferredSearchTerm)} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && teacherClassrooms.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={deferredSearchTerm ? "No Classrooms Found" : "No Classrooms Yet"}
          description={deferredSearchTerm ? "No classrooms match your search term." : "You haven't created or been assigned to any classrooms."}
          actionButton={
            !deferredSearchTerm ? (
                <Button asChild className="mt-4">
                <Link href="/application/teacher/classrooms/new">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Classroom
                </Link>
                </Button>
            ) : undefined
          }
        />
      )}

      {!isLoading && !error && teacherClassrooms.length > 0 && (
        <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teacherClassrooms.map((classroom) => (
            <ClassroomListItem
              key={classroom.id}
              classroom={classroom}
              userRole={user!.role} 
              onEdit={openEditModal}
              onDelete={handleDeleteClassroom}
            />
          ))}
        </div>
        {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t pt-4 mt-6 bg-card">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalClassrooms} classrooms)
                </span>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1 || isLoading}
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages || isLoading}
                >
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </>
      )}

      {editingClassroom && (
        <EditClassroomDialog
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          classroomToEdit={editingClassroom}
          onClassroomUpdateSuccess={handleClassroomUpdateSuccess}
        />
      )}
    </div>
  );
}

