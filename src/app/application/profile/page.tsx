"use client";

import { useAuth } from "@/contexts/auth-context";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { UserCircle, Shield, Edit3, KeyRound, Loader2, TestTubeDiagonal } from "lucide-react"; 
import Link from "next/link";
import { UserRole, type User } from "@/types";
import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation"; 
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; 
import { useToast } from "@/hooks/use-toast";

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

function EditProfileDialog({
  currentUser,
  onProfileUpdate,
  isOpen,
  onOpenChange,
}: {
  currentUser: User;
  onProfileUpdate: (updatedFields: Partial<User>) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: currentUser.name,
      email: currentUser.email,
    },
  });

  const onSubmit = useCallback(async (data: ProfileFormValues) => {
    setIsSaving(true);
    try {
      await onProfileUpdate({ name: data.name, email: data.email });
      toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [onProfileUpdate, toast, onOpenChange]);

  React.useEffect(() => {
    if (currentUser && isOpen) {
      form.reset({
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }, [currentUser, form, isOpen]);
  
  // Check if the current user is one of the predefined mock users.
  // This logic is now for UI disabling only; actual Supabase RLS/service logic handles backend protection.
  const isPredefinedMockUser = currentUser.id === "admin-mock-id" || currentUser.id === "student-test-id" || currentUser.id === "teacher-test-id";


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your name and email address.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving || isPredefinedMockUser} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} disabled={isSaving || isPredefinedMockUser} />
                  </FormControl>
                  {isPredefinedMockUser && <p className="text-xs text-muted-foreground">Email for pre-defined mock accounts cannot be changed.</p>}
                   {!isPredefinedMockUser && <p className="text-xs text-muted-foreground">Changing your email here updates your profile. To change your login email, Supabase typically requires email confirmation.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            {isPredefinedMockUser && (
              <p className="text-xs text-destructive p-2 border border-dashed border-destructive rounded-md">
                Editing name or email for pre-defined mock accounts is disabled in this dialog.
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || isPredefinedMockUser}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

function ChangePasswordDialog({
  userId,
  isMockUserAccount, // Renamed for clarity
  isOpen,
  onOpenChange,
}: {
  userId: string;
  isMockUserAccount: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleDialogStateChange = useCallback((open: boolean) => {
    if (!open) { 
      form.reset(); 
    }
    onOpenChange(open);
  }, [form, onOpenChange]);

  const onSubmit = useCallback(async (data: ChangePasswordFormValues) => {
    if (isMockUserAccount) {
      toast({ title: "Operation Denied", description: "Password for pre-defined mock accounts cannot be changed here.", variant: "destructive"});
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/users/${userId}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to change password.");
      }
      
      toast({ title: "Password Changed", description: "Your password has been successfully updated." });
      handleDialogStateChange(false); 
    } catch (error) {
      toast({
        title: "Change Password Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [userId, toast, handleDialogStateChange, isMockUserAccount]);

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Update your account password.</DialogDescription>
        </DialogHeader>
        {isMockUserAccount ? (
           <p className="text-sm text-destructive py-4">Password for pre-defined mock accounts cannot be changed through this interface.</p>
        ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </DialogFooter>
          </form>
        </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ProfilePage() {
  const { user, updateCurrentUserData, setTestUserRole, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedRoleForTest, setSelectedRoleForTest] = useState<UserRole | null>(user?.role || null);

  useEffect(() => {
    if (user) {
      setSelectedRoleForTest(user.role);
    }
  }, [user]);

  if (authIsLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const getDashboardLink = useCallback(() => {
    switch (user.role) {
      case UserRole.ADMIN: return "/application/admin/dashboard";
      case UserRole.TEACHER: return "/application/teacher/dashboard";
      case UserRole.STUDENT: return "/application/student/dashboard";
      default: return "/application/login"; 
    }
  }, [user.role]);

  const handleProfileUpdated = useCallback(async (updatedFields: Partial<User>) => {
    // This function is passed to EditProfileDialog.
    // AuthContext's updateCurrentUserData handles the actual API call and state update.
    await updateCurrentUserData(updatedFields); 
  }, [updateCurrentUserData]);

  const handleTestRoleChange = (newRoleValue: string) => {
    const newRole = newRoleValue as UserRole;
    setSelectedRoleForTest(newRole);
    if (user && newRole !== user.role) {
      setTestUserRole(newRole); // This updates role locally in AuthContext for testing
      // Redirect to the new role's dashboard
      switch (newRole) {
        case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
        case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
        case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
        default: router.replace('/application/login'); // Fallback
      }
    }
  };
  
  // Use a consistent check for whether the current user is one of the predefined mock accounts.
  const isCurrentAccountMock = user.id === "admin-mock-id" || user.id === "student-test-id" || user.id === "teacher-test-id";

  return (
    <div className="space-y-6">
      <DashboardHeader
        title="My Profile"
        description="View and manage your account details."
        icon={UserCircle}
        iconLinkHref={getDashboardLink()}
      />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal and role information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="profileName">Full Name</Label>
            <Input id="profileName" value={user.name} readOnly />
          </div>
          <div>
            <Label htmlFor="profileEmail">Email Address</Label>
            <Input id="profileEmail" type="email" value={user.email} readOnly />
          </div>
          <div>
            <Label htmlFor="profileRole">Role (Current: {user.role.charAt(0).toUpperCase() + user.role.slice(1)})</Label>
            <div className="flex items-center space-x-2 mt-1">
              <TestTubeDiagonal className="h-5 w-5 text-orange-500 flex-shrink-0" />
              <Select value={selectedRoleForTest || user.role} onValueChange={handleTestRoleChange}>
                <SelectTrigger id="profileRoleSelect" className="w-full md:w-[200px]">
                  <SelectValue placeholder="Switch Role (Testing)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.TEACHER}>Teacher</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This role switcher is for local testing convenience. It does not change your actual account role on the server.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>Update your profile details or change your password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-medium">Edit Profile</h3>
              <p className="text-sm text-muted-foreground">Update your name or email address.</p>
            </div>
            <Button variant="outline" onClick={() => setIsEditProfileOpen(true)} disabled={isCurrentAccountMock}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h3 className="font-medium">Change Password</h3>
              <p className="text-sm text-muted-foreground">Update your account password.</p>
            </div>
            <Button variant="outline" onClick={() => setIsChangePasswordOpen(true)} disabled={isCurrentAccountMock}>
              <KeyRound className="mr-2 h-4 w-4" /> Change Password
            </Button>
          </div>
           {isCurrentAccountMock && (
              <p className="text-xs text-destructive p-2">Editing name/email or changing password is disabled for pre-defined mock user accounts for stability during testing.</p>
            )}
        </CardContent>
      </Card>

      {user.role === UserRole.ADMIN && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><Shield className="mr-2 h-5 w-5 text-destructive" /> Admin Privileges</CardTitle>
            <CardDescription>You have administrative access to the system.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              As an administrator, you can manage users, classrooms, and system settings.
            </p>
            <Button asChild className="mt-4">
                <Link href="/application/admin/dashboard">
                    Go to Admin Dashboard
                </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {isEditProfileOpen && user && (
        <EditProfileDialog
            currentUser={user}
            onProfileUpdate={handleProfileUpdated}
            isOpen={isEditProfileOpen}
            onOpenChange={setIsEditProfileOpen}
        />
      )}
      {isChangePasswordOpen && user && (
        <ChangePasswordDialog
          userId={user.id}
          isMockUserAccount={isCurrentAccountMock}
          isOpen={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />
      )}
    </div>
  );
}