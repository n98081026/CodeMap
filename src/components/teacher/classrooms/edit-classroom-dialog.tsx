'use client';

import { Loader2 } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import type { Classroom } from '@/types';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription as FormDialogDescription,
  DialogFooter as FormDialogFooter,
  DialogHeader as FormDialogHeader,
  DialogTitle as FormDialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface EditClassroomDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  classroomToEdit: Classroom | null;
  onClassroomUpdateSuccess: () => void;
}

export function EditClassroomDialog({
  isOpen,
  onOpenChange,
  classroomToEdit,
  onClassroomUpdateSuccess,
}: EditClassroomDialogProps) {
  const { toast } = useToast();
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    if (classroomToEdit && isOpen) {
      setEditFormData({
        name: classroomToEdit.name,
        description: classroomToEdit.description || '',
      });
    } else if (!isOpen) {
      // Reset form when dialog closes
      setEditFormData({ name: '', description: '' });
    }
  }, [classroomToEdit, isOpen]);

  const handleEditFormChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setEditFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleUpdateClassroom = useCallback(async () => {
    if (!classroomToEdit) return;

    if (!editFormData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Classroom name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      const payload = {
        name: editFormData.name,
        description: editFormData.description,
      };
      const response = await fetch(`/api/classrooms/${classroomToEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update classroom');
      }
      toast({
        title: 'Classroom Updated',
        description: `Classroom "${editFormData.name}" has been updated.`,
      });
      onOpenChange(false);
      onClassroomUpdateSuccess();
    } catch (err) {
      toast({
        title: 'Error Updating Classroom',
        description: (err as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSavingEdit(false);
    }
  }, [
    classroomToEdit,
    editFormData,
    toast,
    onOpenChange,
    onClassroomUpdateSuccess,
  ]);

  if (!classroomToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[425px]'>
        <FormDialogHeader>
          <FormDialogTitle>
            Edit Classroom: {classroomToEdit.name}
          </FormDialogTitle>
          <FormDialogDescription>
            Update the details for this classroom.
          </FormDialogDescription>
        </FormDialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='edit-classroom-name' className='text-right'>
              Name
            </Label>
            <Input
              id='edit-classroom-name'
              name='name'
              value={editFormData.name}
              onChange={handleEditFormChange}
              className='col-span-3'
              disabled={isSavingEdit}
            />
          </div>
          <div className='grid grid-cols-4 items-center gap-4'>
            <Label htmlFor='edit-classroom-description' className='text-right'>
              Description
            </Label>
            <Textarea
              id='edit-classroom-description'
              name='description'
              value={editFormData.description}
              onChange={handleEditFormChange}
              className='col-span-3 resize-none'
              placeholder='Optional: A brief description of the classroom.'
              disabled={isSavingEdit}
              rows={4}
            />
          </div>
        </div>
        <FormDialogFooter>
          <DialogClose asChild>
            <Button type='button' variant='outline' disabled={isSavingEdit}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            type='submit'
            onClick={handleUpdateClassroom}
            disabled={isSavingEdit}
          >
            {isSavingEdit && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isSavingEdit ? 'Saving...' : 'Save Changes'}
          </Button>
        </FormDialogFooter>
      </DialogContent>
    </Dialog>
  );
}
