'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(6, { message: 'New password must be at least 6 characters.' }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords don't match.",
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

interface ChangePasswordDialogProps {
  userId: string;
  isMockUserAccount: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordDialog({
  userId,
  isMockUserAccount,
  isOpen,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleDialogStateChange = useCallback(
    (open: boolean) => {
      if (!open) {
        form.reset();
      }
      onOpenChange(open);
    },
    [form, onOpenChange]
  );

  const onSubmit = useCallback(
    async (data: ChangePasswordFormValues) => {
      if (isMockUserAccount) {
        toast({
          title: 'Operation Denied',
          description:
            'Password for pre-defined mock accounts cannot be changed.',
          variant: 'destructive',
        });
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
          throw new Error(result.message || 'Failed to change password.');
        }

        toast({
          title: 'Password Changed',
          description: 'Your password has been successfully updated.',
        });
        handleDialogStateChange(false);
      } catch (error) {
        toast({
          title: 'Change Password Failed',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsSaving(false);
      }
    },
    [userId, toast, handleDialogStateChange, isMockUserAccount]
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Update your account password.</DialogDescription>
        </DialogHeader>
        {isMockUserAccount ? (
          <p className='text-sm text-destructive py-4'>
            Password for pre-defined mock accounts cannot be changed.
          </p>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='newPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        {...field}
                        disabled={isSaving}
                        autoComplete='new-password'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input
                        type='password'
                        {...field}
                        disabled={isSaving}
                        autoComplete='new-password'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type='button' variant='outline' disabled={isSaving}>
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type='submit'
                  disabled={isSaving || !form.formState.isValid}
                >
                  {isSaving && (
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  )}
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
