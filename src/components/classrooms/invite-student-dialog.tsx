'use client';

import { UserPlus, Loader2 } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface InviteStudentDialogProps {
  classroomId: string;
  onActionCompleted?: () => void;
}

export function InviteStudentDialog({
  classroomId,
  onActionCompleted,
}: InviteStudentDialogProps) {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handleInviteOrAdd = useCallback(async () => {
    if (!identifier.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter a student email or ID.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);

    const isEmail = identifier.includes('@');

    if (isEmail) {
      console.log(
        `Mock inviting student with email ${identifier} to classroom ${classroomId}`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: 'Invite Sent (Mock)',
        description: `An invitation has been 'sent' to ${identifier}. They will need to accept it.`,
      });
      onActionCompleted?.();
    } else {
      try {
        const response = await fetch(
          `/api/classrooms/${classroomId}/students`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentId: identifier }),
          }
        );
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(
            responseData.message || 'Failed to add student by ID'
          );
        }
        toast({
          title: 'Student Added',
          description: `Student with ID "${identifier}" has been added to the classroom.`,
        });
        onActionCompleted?.();
      } catch (error) {
        toast({
          title: 'Error Adding Student',
          description: (error as Error).message,
          variant: 'destructive',
        });
      }
    }

    setIsLoading(false);
    setIdentifier('');
    setIsOpen(false);
  }, [identifier, classroomId, toast, onActionCompleted]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className='mr-2 h-4 w-4' /> Invite/Add Student
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>Invite or Add Student</DialogTitle>
          <DialogDescription>
            Enter student's email to send an invite (mock), or their existing
            Student ID to add them directly to the classroom.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='identifier' className='text-right'>
              Email / ID
            </Label>
            <Input
              id='identifier'
              type='text'
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder='student@example.com or student-id-123'
              className='col-span-3'
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            onClick={handleInviteOrAdd}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isLoading ? 'Processing...' : 'Send Invite / Add'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
