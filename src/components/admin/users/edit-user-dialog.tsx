
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
import { MOCK_ADMIN_USER, MOCK_STUDENT_USER, MOCK_TEACHER_USER } from '@/lib/config';

interface EditUserDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userToEdit: User | null;
  onUserUpdateSuccess: () => void; // Callback to refresh user list
}

const PREDEFINED_MOCK_USER_IDS_FOR_DIALOG = [MOCK_STUDENT_USER.id, MOCK_TEACHER_USER.id, MOCK_ADMIN_USER.id];

export function EditUserDialog({ isOpen, onOpenChange, userToEdit, onUserUpdateSuccess }: EditUserDialogProps) {
  const { toast } = useToast();
  const [editFormData, setEditFormData] = useState({ name: "", email: "", role: UserRole.STUDENT });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const isPredefinedUser = userToEdit ? PREDEFINED_MOCK_USER_IDS_FOR_DIALOG.includes(userToEdit.id) : false;


  useEffect(() => {
    if (userToEdit && isOpen) {
      setEditFormData({
        name: userToEdit.name,
        email: userToEdit.email,
        role: userToEdit.role,
      });
    } else if (!isOpen) {
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
    if (isPredefinedUser) {
        toast({ title: "Operation Denied", description: "Details for pre-defined test accounts cannot be edited here.", variant: "destructive" });
        return;
    }


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
      const payload = {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
      };
      // Filter out fields that haven't changed from original userToEdit to avoid unnecessary updates
      const changes: Partial<User> = {};
      if (payload.name !== userToEdit.name) changes.name = payload.name;
      if (payload.email !== userToEdit.email) changes.email = payload.email;
      if (payload.role !== userToEdit.role) changes.role = payload.role;

      if (Object.keys(changes).length === 0) {
        toast({ title: "No Changes", description: "No changes were made to the user's profile." });
        onOpenChange(false);
        setIsSavingEdit(false);
        return;
      }


      const response = await fetch(`/api/users/${userToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user");
      }
      toast({ title: "User Updated", description: `User "${editFormData.name}" has been updated.` });
      onOpenChange(false);
      onUserUpdateSuccess(); 
    } catch (err) {
      toast({ title: "Error Updating User", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsSavingEdit(false);
    }
  }, [userToEdit, editFormData, toast, onOpenChange, onUserUpdateSuccess, isPredefinedUser]);
  

  if (!userToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <FormDialogHeader>
          <FormDialogTitle>Edit User: {userToEdit.name}</FormDialogTitle>
          <FormDialogDescription>Modify the user's details below. Pre-defined test users have restricted editing.</FormDialogDescription>
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
              disabled={isSavingEdit || isPredefinedUser}
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
              disabled={isSavingEdit || isPredefinedUser}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Role</Label>
            <Select
              name="role"
              value={editFormData.role}
              onValueChange={(value) => handleEditFormChange(value, "role")}
              disabled={isSavingEdit || isPredefinedUser}
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
           {isPredefinedUser && (
            <p className="col-span-4 text-xs text-muted-foreground p-2 border border-dashed rounded-md bg-muted/50">
              Note: Name, email, and role for pre-defined test accounts cannot be changed.
            </p>
          )}
        </div>
        <FormDialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSavingEdit}>Cancel</Button>
          </DialogClose>
          <Button onClick={handleUpdateUser} disabled={isSavingEdit || isPredefinedUser}>
            {isSavingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isSavingEdit ? "Saving..." : "Save Changes"}
          </Button>
        </FormDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
