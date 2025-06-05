
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import type { User } from "@/types";
import { UserRole } from "@/types";
import { useToast } from '@/hooks/use-toast';

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onUserUpdateSuccess: () => void; // Callback to refresh user list
}

export function EditUserDialog({ isOpen, onOpenChange, userToEdit, onUserUpdateSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [editFormData, setEditFormData] = useState({ name: "", email: "", role: UserRole.STUDENT });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (userToEdit && isOpen) {
      setEditFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
      });
    } else if (!isOpen) {
      // Reset form when dialog closes
      setEditFormData({ name: "", email: "", role: UserRole.STUDENT });
    }
  }, [userToEdit, isOpen]);

  const handleEditFormChange = useCallback((e: React.ChangeEvent<HTMLInputElement> | string, fieldName?: string) => {
    if (typeof e === "string" && fieldName) {
      setEditFormData(prev => ({ ...prev, [fieldName]: e as UserRole }));
    } else if (typeof e !== "string") {
      const { name, value } = e.target as HTMLInputElement;
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  }, []);

  const handleUpdateUser = useCallback(async () => {
    if (!userToEdit) return;

    if (!editFormData.name.trim()) {
      toast({ title: "Name Required", description: "User name cannot be empty.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editFormData.email.trim() || !emailRegex.test(editFormData.email)) {
      toast({ title: "Valid Email Required", description: "Please provide a valid email address.", variant: "destructive" });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData), // Send only changed fields if preferred
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      toast({ title: "User Updated", description: `User "${editFormData.name}" has been updated.` });
      onOpenChange(false);
      onUserUpdateSuccess(); // Call callback to refresh
    } catch (err) {
      toast({ title: "Error Updating User", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  }, [userToEdit, editFormData, toast, onOpenChange, onUserUpdateSuccess]);
  
  const isPredefinedMockUser = userToEdit?.id === "admin-mock-id" || userToEdit?.id === "student-test-id" || userToEdit?.id === "teacher-test-id";


  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <FormDialogHeader>
          <FormDialogTitle>Edit User: {userToEdit.name}</FormDialogTitle>
          <FormDialogDescription>Modify the user's details below. Pre-defined mock users have some restrictions.</FormDialogDescription>
        </FormDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input
              id="name"
              name="name"
              value={editFormData.name}
              onChange={handleEditFormChange}
              className="col-span-3"
              disabled={isSavingEdit || isPredefinedMockUser}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={editFormData.email}
              onChange={handleEditFormChange}
              className="col-span-3"
              disabled={isSavingEdit || isPredefinedMockUser}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Role</Label>
            <Select
              name="role"
              value={editFormData.role}
              onValueChange={(value) => handleEditFormChange(value, "role")}
              disabled={isSavingEdit || isPredefinedMockUser}
            >
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
           {isPredefinedMockUser && (
            <p className="col-span-4 text-xs text-muted-foreground p-2 border border-dashed rounded-md bg-muted/50">
              Note: Name, email, and role for pre-defined mock accounts are primarily managed for testing purposes and may have edit restrictions here.
            </p>
          )}
        </div>
        <FormDialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSavingEdit}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdateUser} disabled={isSavingEdit || isPredefinedMockUser}>
            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSavingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </FormDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
