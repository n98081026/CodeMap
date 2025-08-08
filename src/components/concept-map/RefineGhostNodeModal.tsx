// src/components/concept-map/RefineGhostNodeModal.tsx
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RefineGhostNodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialText: string;
  initialDetails?: string;
  onSubmit: (newText: string, newDetails: string) => void;
  // previewNodeId?: string; // Could be passed for context in title, but not strictly needed for submit
}

export const RefineGhostNodeModal: React.FC<RefineGhostNodeModalProps> = ({
  isOpen,
  onOpenChange,
  initialText,
  initialDetails = '',
  onSubmit,
}) => {
  const [text, setText] = useState(initialText);
  const [details, setDetails] = useState(initialDetails);

  // Reset form when initial values change (e.g., when a new ghost node is selected for refinement)
  useEffect(() => {
    setText(initialText);
    setDetails(initialDetails);
  }, [initialText, initialDetails, isOpen]); // Also reset if modal is re-opened for a new node

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(text, details);
    // onOpenChange(false); // onSubmit should handle closing via parent state typically
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-[480px]'>
        <DialogHeader>
          <DialogTitle>Refine Suggestion</DialogTitle>
          <DialogDescription>
            Edit the content for this AI-suggested node before adding it to the
            map.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className='grid gap-4 py-4'>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='ghostNodeText' className='text-right'>
                Text
              </Label>
              <Input
                id='ghostNodeText'
                value={text}
                onChange={(e) => setText(e.target.value)}
                className='col-span-3'
                required
              />
            </div>
            <div className='grid grid-cols-4 items-center gap-4'>
              <Label htmlFor='ghostNodeDetails' className='text-right'>
                Details
              </Label>
              <Textarea
                id='ghostNodeDetails'
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className='col-span-3 h-24 resize-none'
                placeholder='(Optional) Add more details...'
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type='submit'>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
