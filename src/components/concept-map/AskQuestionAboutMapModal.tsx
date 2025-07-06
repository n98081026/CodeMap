'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, HelpCircle, MessageSquare, Search } from 'lucide-react';

interface AskQuestionAboutMapModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  mapName?: string;
  onSubmitQuestion: (question: string) => Promise<void>;
  isLoading: boolean;
  answer: string | null;
  onCloseModal?: () => void;
}

export const AskQuestionAboutMapModal: React.FC<
  AskQuestionAboutMapModalProps
> = ({
  isOpen,
  onOpenChange,
  mapName,
  onSubmitQuestion,
  isLoading,
  answer,
  onCloseModal,
}) => {
  const [userQuestion, setUserQuestion] = useState('');

  useEffect(() => {
    // Clear question when modal opens
    if (isOpen) {
      setUserQuestion('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!userQuestion.trim()) return;
    await onSubmitQuestion(userQuestion);
    // Optionally clear question after submit, or keep for reference by user
    // setUserQuestion("");
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      if (onCloseModal) {
        onCloseModal();
      }
      setUserQuestion(''); // Clear question when modal is closed
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Search className='mr-2 h-5 w-5 text-primary' />
            Ask AI About {mapName ? `"${mapName}"` : 'This Map'}
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground pt-1'>
            Ask a general question about the overall structure, themes, or
            relationships within this concept map.
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='map-question'>Your Question:</Label>
            <Textarea
              id='map-question'
              placeholder='e.g., What are the main clusters of concepts? How does X relate to Y and Z in this map? What is the overall purpose illustrated here?'
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              rows={4}
              disabled={isLoading}
            />
          </div>

          {answer && !isLoading && (
            <div className='mt-4'>
              <Label className='flex items-center mb-1'>
                <MessageSquare className='mr-2 h-4 w-4 text-primary' /> AI's
                Answer:
              </Label>
              <ScrollArea className='h-auto max-h-48 w-full rounded-md border bg-muted/30 p-3'>
                <p className='text-sm text-foreground whitespace-pre-wrap'>
                  {answer}
                </p>
              </ScrollArea>
            </div>
          )}

          {isLoading && (
            <div className='mt-4 flex items-center justify-center text-muted-foreground'>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              <span>AI is analyzing the map to answer...</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleDialogClose(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !userQuestion.trim()}
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <HelpCircle className='mr-2 h-4 w-4' />
            )}
            Ask Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
