
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import type { User } from "@/types";
import { useToast } from '@/hooks/use-toast';

const profileFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  email: z.string().email({ message: "Invalid email address." }),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface EditProfileDialogProps {
  currentUser: User;
  onProfileUpdate: (updatedFields: Partial<User>) => Promise<void>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProfileDialog({
  currentUser,
  onProfileUpdate,
  isOpen,
  onOpenChange,
}: EditProfileDialogProps) {
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
      const changedFields: Partial<User> = {};
      if (data.name !== currentUser.name) changedFields.name = data.name;
      if (data.email !== currentUser.email) changedFields.email = data.email;

      if (Object.keys(changedFields).length > 0) {
        await onProfileUpdate(changedFields);
        toast({ title: "Profile Updated", description: "Your profile has been successfully updated." });
      } else {
        toast({ title: "No Changes", description: "No changes were made to your profile." });
      }
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
  }, [currentUser.name, currentUser.email, onProfileUpdate, toast, onOpenChange]);

  useEffect(() => {
    if (currentUser && isOpen) {
      form.reset({
        name: currentUser.name,
        email: currentUser.email,
      });
    }
  }, [currentUser, form, isOpen]);
  
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
                  {!isPredefinedMockUser && <p className="text-xs text-muted-foreground">Updating email here changes your profile record. To change your login email, additional steps might be required depending on Supabase email change confirmation settings.</p>}
                  <FormMessage />
                </FormItem>
              )}
            />
            {isPredefinedMockUser && (
              <p className="text-xs text-destructive p-2 border border-dashed border-destructive rounded-md">
                Editing name or email for pre-defined mock accounts is disabled.
              </p>
            )}
            <DialogFooter>
              <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving || isPredefinedMockUser || !form.formState.isDirty}>
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
