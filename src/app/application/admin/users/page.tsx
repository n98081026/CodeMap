
// src/app/application/admin/users/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useDeferredValue, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Edit, Trash2, Users, Loader2, AlertTriangle, Search } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/auth-context';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/layout/empty-state";
import { EditUserDialog } from '@/components/admin/users/edit-user-dialog';
import { useVirtualizer } from '@tanstack/react-virtual';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: adminUser } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  const [totalUsers, setTotalUsers] = useState(0); 

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const adminDashboardLink = "/application/admin/dashboard";
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: users.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 53, 
    overscan: 10,
  });

  const fetchUsers = useCallback(async (search: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const searchParams = new URLSearchParams();
      if (search.trim()) {
        searchParams.append('search', search.trim());
      }
      
      const response = await fetch(`/api/users?${searchParams.toString()}`);
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
      setUsers([]); 
      setTotalUsers(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(deferredSearchTerm);
  }, [deferredSearchTerm, fetchUsers]);
  
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
      fetchUsers(deferredSearchTerm); 
    } catch (err) {
      toast({ title: "Error Deleting User", description: (err as Error).message, variant: "destructive" });
    }
  }, [toast, fetchUsers, adminUser?.id, deferredSearchTerm]);

  const openEditModal = useCallback((userToEdit: User) => {
    if (userToEdit.id === "student-test-id" || userToEdit.id === "teacher-test-id" || userToEdit.id === "admin-mock-id" || userToEdit.id === adminUser?.id) {
       toast({ title: "Operation Denied", description: "Pre-defined test users, the main mock admin, or your own account cannot be edited.", variant: "destructive" });
       return;
    }
    setEditingUser(userToEdit);
    setIsEditModalOpen(true);
  }, [toast, adminUser?.id]);

  const handleUserUpdateSuccess = useCallback(() => {
    fetchUsers(deferredSearchTerm);
  }, [deferredSearchTerm, fetchUsers]);

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

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Filter by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 w-full max-w-sm"
          />
        </div>
      </div>

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
            actionButton={<Button onClick={() => fetchUsers(deferredSearchTerm)} variant="outline" size="sm">Try Again</Button>}
        />
      )}

      {!isLoading && !error && (
        users.length === 0 && totalUsers === 0 ? (
           <EmptyState
             icon={Users}
             title="No Users Found"
             description={deferredSearchTerm ? "No users match your search criteria." : "There are no users in the system yet. New users can register through the public registration page."}
           />
        ) : (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Users ({totalUsers})</CardTitle>
            <CardDescription>A list of all registered users. Test users, the main admin, and your own account cannot be edited or deleted directly here.</CardDescription>
          </CardHeader>
          <CardContent ref={parentRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}> 
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              {users.length > 0 ? (
                <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const userRow = users[virtualRow.index];
                    if (!userRow) return null;
                    return (
                      <TableRow
                        key={userRow.id}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        ref={rowVirtualizer.measureElement}
                      >
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
                    );
                  })}
                </tbody>
              ) : (
                 <tbody>
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            {deferredSearchTerm ? "No users match your search." : "No users available."}
                        </TableCell>
                    </TableRow>
                 </tbody>
              )}
            </Table>
          </CardContent>
          <CardFooter className="flex items-center justify-between border-t pt-4">
              <span className="text-sm text-muted-foreground">
                Total users matching search: {totalUsers}
              </span>
            </CardFooter>
        </Card>
        )
      )}

      {editingUser && (
        <EditUserDialog
          isOpen={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          userToEdit={editingUser}
          onUserUpdateSuccess={handleUserUpdateSuccess}
        />
      )}
    </div>
  );
}
