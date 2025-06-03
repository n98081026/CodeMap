
// src/app/application/admin/users/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Edit, Trash2, Users, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter,
  DialogHeader as FormDialogHeader,
  DialogTitle as FormDialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/layout/empty-state";

const USERS_PER_PAGE = 7;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", role: UserRole.STUDENT });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);

  let adminDashboardLink = "/application/admin/dashboard";
   if (adminUser && adminUser.role !== UserRole.ADMIN) {
     adminDashboardLink = adminUser.role === UserRole.TEACHER ? "/application/teacher/dashboard" : "/application/student/dashboard";
  }

  const fetchUsers = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/users?page=${page}&limit=${USERS_PER_PAGE}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch users");
      }
      const data = await response.json() as { users: User[], totalCount: number };
      setUsers(data.users);
      setTotalUsers(data.totalCount);
    } catch (err) {
      const errorMessage = (err as Error).message;
      setError(errorMessage);
      toast({ title: "Error Fetching Users", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, fetchUsers]);

  const handleDeleteUser = useCallback(async (userId: string, userName: string) => {
     if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin-mock-id" || userId === adminUser?.id) {
      toast({ title: "Operation Denied", description: "Pre-defined test users, the main mock admin, or your own account cannot be deleted.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      toast({ title: "User Deleted", description: `User "${userName}" has been deleted.` });
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchUsers(currentPage);
      }
    } catch (err) {
      toast({ title: "Error Deleting User", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast, users.length, currentPage, fetchUsers, adminUser?.id]);

  const openEditModal = useCallback((userToEdit: User) => {
    if (userId === "student-test-id" || userId === "teacher-test-id" || userId === "admin-mock-id" || userToEdit.id === adminUser?.id) {
       toast({ title: "Operation Denied", description: "Pre-defined test users, the main mock admin, or your own account cannot be edited.", variant: "destructive" });
       return;
    }
    setEditingUser(userToEdit);
    setEditFormData({ name: userToEdit.name, email: userToEdit.email, role: userToEdit.role });
    setIsEditModalOpen(true);
  }, [toast, adminUser?.id]);

  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | string, fieldName?: string) => {
    if (typeof e === "string" && fieldName) {
      setEditFormData(prev => ({ ...prev, [fieldName]: e as UserRole }));
    } else if (typeof e !== "string") {
      const { name, value } = e.target as HTMLInputElement;
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleUpdateUser = useCallback(async () => {
    if (!editingUser) return;
    if (!editFormData.name.trim()) {
      toast({ title: "Name Required", description: "User name cannot be empty.", variant: "destructive" });
      return;
    }
    if (!editFormData.email.trim() || !editFormData.email.includes('@')) {
      toast({ title: "Valid Email Required", description: "Please provide a valid email address.", variant: "destructive" });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      toast({ title: "User Updated", description: `User "${editFormData.name}" has been updated.` });
      setIsEditModalOpen(false);
      setEditingUser(null);
      fetchUsers(currentPage);
    } catch (err) {
      toast({ title: "Error Updating User", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  }, [editingUser, editFormData, toast, fetchUsers, currentPage]);

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
        title="User Management"
        description="View, edit, and manage all users in the system."
        icon={Users}
        iconLinkHref={adminDashboardLink}
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0}>
                <Button disabled>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add New User
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>New users should register via the public registration page.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading users...</p>
        </div>
      )}

      {error && !isLoading && (
        <EmptyState
            icon={AlertTriangle}
            title="Error Loading Users"
            description={error}
            actionButton={<Button onClick={() => fetchUsers(currentPage)} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && (
        users.length === 0 && totalUsers === 0 ? (
           <EmptyState
             icon={Users}
             title="No Users Found"
             description="There are no users in the system yet. New users can register through the public registration page."
           />
        ) : (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Users ({totalUsers})</CardTitle>
            <CardDescription>A list of all registered users. Test users, the main admin, and your own account cannot be edited or deleted directly here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userRow) => (
                  <TableRow key={userRow.id}>
                    <TableCell className="font-medium">{userRow.name}</TableCell>
                    <TableCell>{userRow.email}</TableCell>
                    <TableCell>
                      <Badge variant={userRow.role === UserRole.ADMIN ? "destructive" : userRow.role === UserRole.TEACHER ? "secondary" : "default"}>
                        {userRow.role.charAt(0).toUpperCase() + userRow.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        title="Edit user"
                        onClick={() => openEditModal(userRow)}
                        disabled={userRow.id === "student-test-id" || userRow.id === "teacher-test-id" || userRow.id === "admin-mock-id" || userRow.id === adminUser?.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Delete user"
                            disabled={userRow.id === "student-test-id" || userRow.id === "teacher-test-id" || userRow.id === "admin-mock-id" || userRow.id === adminUser?.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user "{userRow.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(userRow.id, userRow.name)}>
                              Delete User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} ({totalUsers} users)
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
        </Card>
        )
      )}

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <FormDialogHeader>
            <FormDialogTitle>Edit User: {editingUser?.name}</FormDialogTitle>
            <FormDialogDescription>Modify the user's details below.</FormDialogDescription>
          </FormDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={editFormData.name} onChange={handleEditFormChange} className="col-span-3" disabled={isSavingEdit} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" value={editFormData.email} onChange={handleEditFormChange} className="col-span-3" disabled={isSavingEdit} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select name="role" value={editFormData.role} onValueChange={(value) => handleEditFormChange(value, "role")} disabled={isSavingEdit}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.TEACHER}>Teacher</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <FormDialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSavingEdit}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleUpdateUser} disabled={isSavingEdit}>
                {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSavingEdit ? "Saving..." : "Save Changes"}
            </Button>
          </FormDialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
