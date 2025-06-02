
// src/app/application/admin/users/page.tsx
"use client";

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Edit, Trash2, Users, Loader2, AlertTriangle, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from '@/hooks/use-toast';
import Link from "next/link";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const USERS_PER_PAGE = 7;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editFormData, setEditFormData] = useState({ name: "", email: "", role: UserRole.STUDENT });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const totalPages = Math.ceil(totalUsers / USERS_PER_PAGE);


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

  const handleDeleteUser = async (userId: string, userName: string) => {
     if (userId === "student-test-id" || userId === "teacher-test-id") {
      toast({ title: "Operation Denied", description: "Pre-defined test users cannot be deleted.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }
      toast({ title: "User Deleted", description: `User "${userName}" has been deleted.` });
      // Refresh users, potentially adjusting currentPage if last item on page deleted
      if (users.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      } else {
        fetchUsers(currentPage);
      }
    } catch (err) {
      toast({ title: "Error Deleting User", description: (err as Error).message, variant: "destructive" });
    }
  };
  
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditFormData({ name: user.name, email: user.email, role: user.role });
    setIsEditModalOpen(true);
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement> | string, fieldName?: string) => {
    if (typeof e === "string" && fieldName) { // For Select component
      setEditFormData(prev => ({ ...prev, [fieldName]: e as UserRole }));
    } else if (typeof e !== "string") { // For Input components
      const { name, value } = e.target;
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
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
      fetchUsers(currentPage); // Refresh current page
    } catch (err) {
      toast({ title: "Error Updating User", description: (err as Error).message, variant: "destructive" });
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="User Management"
        description="View, edit, and manage all users in the system."
        icon={Users}
      >
        <Button asChild variant="outline">
          <Link href="/application/admin/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
          </Link>
        </Button>
        <Button disabled>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </DashboardHeader>

      {isLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading users...</p>
        </div>
      )}

      {error && !isLoading && (
        <Card className="shadow-md border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" /> Error Loading Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => fetchUsers(currentPage)} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Users ({totalUsers})</CardTitle>
            <CardDescription>A list of all registered users. Test users cannot be edited or deleted.</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 && totalUsers === 0 ? (
              <p>No users found.</p>
            ) : (
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
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === UserRole.ADMIN ? "destructive" : user.role === UserRole.TEACHER ? "secondary" : "default"}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="mr-2" title="Edit user" onClick={() => openEditModal(user)} disabled={user.id === "student-test-id" || user.id === "teacher-test-id"}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" title="Delete user" disabled={user.id === "student-test-id" || user.id === "teacher-test-id"}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the user "{user.name}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteUser(user.id, user.name)}>
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
            )}
          </CardContent>
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between border-t pt-4">
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
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
      )}
      
      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
            <DialogDescription>Modify the user's details below.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Name</Label>
              <Input id="name" name="name" value={editFormData.name} onChange={handleEditFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" name="email" type="email" value={editFormData.email} onChange={handleEditFormChange} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Role</Label>
              <Select name="role" value={editFormData.role} onValueChange={(value) => handleEditFormChange(value, "role")}>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
```