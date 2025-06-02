
// src/app/application/teacher/classrooms/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { Classroom } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Users, ArrowRight, BookOpen, Loader2, AlertTriangle, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter, 
  DialogHeader as FormDialogHeader, 
  DialogTitle as FormDialogTitle, 
  DialogTrigger as FormDialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";


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


  let teacherDashboardLink = "/application/teacher/dashboard";
  if (user && user.role === UserRole.ADMIN && !user.role.includes(UserRole.TEACHER as any) ) { // Admin only, not teacher
     teacherDashboardLink = "/application/admin/dashboard";
  }


  const fetchTeacherClassrooms = async () => {
    if (!user || !user.id) {
      setIsLoading(false);
      setError("User not authenticated.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/classrooms?teacherId=${user.id}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch classrooms");
      }
      const data: Classroom[] = await response.json();
      setTeacherClassrooms(data);
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
  };

  useEffect(() => {
    fetchTeacherClassrooms();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDeleteClassroom = async (classroomId: string, classroomName: string) => {
    try {
      const response = await fetch(`/api/classrooms/${classroomId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete classroom");
      }
      toast({ title: "Classroom Deleted", description: `Classroom "${classroomName}" has been deleted.` });
      fetchTeacherClassrooms(); 
    } catch (err) {
      toast({ title: "Error Deleting Classroom", description: (err as Error).message, variant: "destructive" });
    }
  };

  const openEditModal = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setEditFormData({ name: classroom.name, description: classroom.description || "" });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateClassroom = async () => {
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
      fetchTeacherClassrooms(); 
    } catch (err) {
      toast({ title: "Error Updating Classroom", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  };


  return (
    <div className="space-y-6">
      <DashboardHeader
        title="Manage Classrooms"
        description="View, edit, and manage your classrooms."
        icon={BookOpen}
        iconLinkHref={teacherDashboardLink}
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
        <Card className="shadow-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Classrooms
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={fetchTeacherClassrooms} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && teacherClassrooms.length === 0 && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>No Classrooms Yet</CardTitle>
            <CardDescription>You haven&apos;t created or been assigned to any classrooms.</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Click the button above to create your first classroom.</p>
             <Button asChild className="mt-4">
              <Link href="/application/teacher/classrooms/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create Classroom
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && teacherClassrooms.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teacherClassrooms.map((classroom) => (
            <Card key={classroom.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <CardTitle className="text-xl">{classroom.name}</CardTitle>
                <CardDescription>Invite Code: <span className="font-mono text-primary">{classroom.inviteCode}</span></CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{classroom.studentIds.length} Students</span>
                </div>
                {classroom.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">Desc: {classroom.description}</p>}
              </CardContent>
              <CardFooter className="grid grid-cols-3 gap-2">
                 <Button asChild variant="default" size="sm" className="col-span-1">
                  <Link href={`/application/teacher/classrooms/${classroom.id}`}>
                    <ArrowRight className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">View</span>
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="col-span-1" onClick={() => openEditModal(classroom)}>
                  <Edit className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Edit</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="col-span-1">
                      <Trash2 className="mr-1 h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the classroom "{classroom.name}" and all associated data. Student enrollments will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteClassroom(classroom.id, classroom.name)}>
                        Delete Classroom
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
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

