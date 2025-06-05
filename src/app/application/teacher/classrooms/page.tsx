
// src/app/application/teacher/classrooms/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Users, BookOpen, Loader2, AlertTriangle, Edit, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription as FormDialogDescription, DialogFooter as FormDialogFooter, DialogHeader as FormDialogHeader, DialogTitle as FormDialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/layout/empty-state";
import { ClassroomListItem } from "@/components/classrooms/classroom-list-item";

const CLASSROOMS_PER_PAGE = 6;

export default function TeacherClassroomsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teacherClassrooms, setTeacherClassrooms] = useState<Classroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", description: "" });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalClassrooms, setTotalClassrooms] = useState(0);
  const totalPages = Math.ceil(totalClassrooms / CLASSROOMS_PER_PAGE);

  const headerIconLink = "/application/teacher/dashboard";

  const fetchTeacherClassrooms = useCallback(async (page: number) => {
    if (!user || !user.id) {
      setIsLoading(false);
      setError("User not authenticated.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classrooms?teacherId=${user.id}&page=${page}&limit=${CLASSROOMS_PER_PAGE}`);
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
      toast({
        title: "Error Fetching Classrooms",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTeacherClassrooms(currentPage);
  }, [currentPage, fetchTeacherClassrooms]);

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
        fetchTeacherClassrooms(currentPage);
      }
    } catch (err) {
      toast({ title: "Error Deleting Classroom", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast, teacherClassrooms.length, currentPage, fetchTeacherClassrooms]);

  const openEditModal = useCallback((classroom: Classroom) => {
    setEditingClassroom(classroom);
    setEditFormData({ name: classroom.name, description: classroom.description || "" });
    setIsEditModalOpen(true);
  }, []);

  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleUpdateClassroom = useCallback(async () => {
    if (!editingClassroom) return;
    if (!editFormData.name.trim()) {
      toast({ title: "Validation Error", description: "Classroom name cannot be empty.", variant: "destructive" });
      return;
    }
    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/classrooms/${editingClassroom.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update classroom");
      }
      toast({ title: "Classroom Updated", description: `Classroom "${editFormData.name}" has been updated.` });
      setIsEditModalOpen(false);
      setEditingClassroom(null);
      fetchTeacherClassrooms(currentPage);
    } catch (err) {
      toast({ title: "Error Updating Classroom", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingClassroom, editFormData, toast, fetchTeacherClassrooms, currentPage]);

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
            actionButton={<Button onClick={() => fetchTeacherClassrooms(currentPage)} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && teacherClassrooms.length === 0 && totalClassrooms === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No Classrooms Yet"
          description="You haven't created or been assigned to any classrooms."
          actionButton={
            <Button asChild className="mt-4">
              <Link href="/application/teacher/classrooms/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Classroom
              </Link>
            </Button>
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
            <CardFooter className="flex items-center justify-between border-t pt-4 mt-6">
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

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <FormDialogHeader>
            <FormDialogTitle>Edit Classroom: {editingClassroom?.name}</FormDialogTitle>
            <FormDialogDescription>
              Update the details for this classroom.
            </FormDialogDescription>
          </FormDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-classroom-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-classroom-name"
                name="name"
                value={editFormData.name}
                onChange={handleEditFormChange}
                className="col-span-3"
                disabled={isSavingEdit}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-classroom-description" className="text-right">
                Description
              </Label>
              <Textarea
                id="edit-classroom-description"
                name="description"
                value={editFormData.description}
                onChange={handleEditFormChange}
                className="col-span-3 resize-none"
                placeholder="Optional: A brief description of the classroom."
                disabled={isSavingEdit}
              />
            </div>
          </div>
          <FormDialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSavingEdit}>Cancel</Button>
            </DialogClose>
            <Button type="submit" onClick={handleUpdateClassroom} disabled={isSavingEdit}>
                {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </FormDialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

