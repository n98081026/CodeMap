// src/app/application/admin/users/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { User } from "@/types";
import { UserRole } from "@/types";
import { PlusCircle, Edit, Trash2, Users, Loader2, AlertTriangle } from "lucide-react";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { useToast } from '@/hooks/use-toast';

// This page will eventually call an API to get all users.
// For now, it can fetch from a new API route or use a service directly (if on server, but this is client)

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      setError(null);
      try {
        // In a real app, this API would be protected and require admin rights.
        // For now, we'll assume it's a simple GET that returns all users from the mock service.
        // We need to create this API route if it doesn't exist.
        // Let's assume an API route /api/users that calls userService.getAllUsers()
        const response = await fetch('/api/users'); // Placeholder for actual API
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch users");
        }
        const data: User[] = await response.json();
        setUsers(data);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        toast({
          title: "Error Fetching Users",
          description: errorMessage,
          variant: "destructive",
        });
        // Fallback to local mock if API fails during dev? Or just show error.
        // For now, just show error.
      } finally {
        setIsLoading(false);
      }
    }
    // fetchUsers(); // We need to create /api/users first
    // For now, let's keep the mock data to avoid breaking the page,
    // and create /api/users in a subsequent step.
    const mockUsers: User[] = [
      { id: "1", name: "Alice Wonderland", email: "alice@example.com", role: UserRole.STUDENT },
      { id: "2", name: "Bob The Builder", email: "bob@example.com", role: UserRole.TEACHER },
      { id: "3", name: "Charlie Brown", email: "charlie@example.com", role: UserRole.STUDENT },
      { id: "4", name: "Diana Prince", email: "diana@example.com", role: UserRole.ADMIN },
      { id: "student-test-id", name: "Test Student", email: "student-test@example.com", role: UserRole.STUDENT },
      { id: "teacher-test-id", name: "Test Teacher", email: "teacher-test@example.com", role: UserRole.TEACHER },
    ];
    setUsers(mockUsers);
    setIsLoading(false);


  }, [toast]);


  return (
    <div className="space-y-6">
      <DashboardHeader
        title="User Management"
        description="View, edit, and manage all users in the system."
        icon={Users}
      >
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
            <Button onClick={() => window.location.reload()} className="mt-4">Try Again</Button>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && !error && (
         <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>A list of all registered users. (Actions are currently disabled)</CardDescription>
          </CardHeader>
          <CardContent>
            {users.length === 0 ? (
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
                      <Button variant="ghost" size="icon" className="mr-2" disabled title="Edit user (disabled)">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled title="Delete user (disabled)">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// We will also need to create /api/users route that uses userService.getAllUsers()
// For now, this page will continue to use mock data until that API is explicitly requested/created.
