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
import { Loader2, HelpCircle, MessageSquare } from 'lucide-react';
import type { AskQuestionAboutEdgeInput } from '@/ai/flows/ask-question-about-edge';

interface AskQuestionAboutEdgeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  edgeContext: AskQuestionAboutEdgeInput | null; // Full input type, userQuestion will be empty initially
  onSubmitQuestion: (question: string) => Promise<void>; // Changed to Promise to await AI call potentially
  isLoading: boolean; // Loading state for AI response
  answer: string | null; // AI's answer
  onCloseModal?: () => void; // To clear state on close
}

export const AskQuestionAboutEdgeModal: React.FC<
  AskQuestionAboutEdgeModalProps
> = ({
  isOpen,
  onOpenChange,
  edgeContext,
  onSubmitQuestion,
  isLoading,
  answer,
  onCloseModal,
}) => {
  const [userQuestion, setUserQuestion] = useState('');

  useEffect(() => {
    // Clear question when context changes (e.g. new edge selected) or modal opens
    if (isOpen) {
      setUserQuestion('');
    }
  }, [isOpen, edgeContext]);

  const handleSubmit = async () => {
    if (!userQuestion.trim() || !edgeContext) return;
    await onSubmitQuestion(userQuestion);
    // setUserQuestion(""); // Optionally clear question after submit, or keep for reference
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

  if (!edgeContext) return null; // Should not happen if modal is open with context

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <HelpCircle className='mr-2 h-5 w-5 text-primary' />
            Ask AI About Edge
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground pt-1'>
            Context: Edge{' '}
            {edgeContext.edgeLabel ? `"${edgeContext.edgeLabel}"` : ''}
            connecting{' '}
            <span className='font-semibold text-foreground'>
              "{edgeContext.sourceNodeText}"
            </span>
            and{' '}
            <span className='font-semibold text-foreground'>
              "{edgeContext.targetNodeText}"
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div className='grid gap-2'>
            <Label htmlFor='edge-question'>Your Question:</Label>
            <Textarea
              id='edge-question'
              placeholder='e.g., How are these two concepts related in more detail? Why is this connection important?'
              value={userQuestion}
              onChange={(e) => setUserQuestion(e.target.value)}
              rows={3}
              disabled={isLoading}
            />
          </div>

          {answer && !isLoading && (
            <div className='mt-4'>
              <Label className='flex items-center mb-1'>
                <MessageSquare className='mr-2 h-4 w-4 text-primary' /> AI's
                Answer:
              </Label>
              <ScrollArea className='h-auto max-h-40 w-full rounded-md border bg-muted/30 p-3'>
                <p className='text-sm text-foreground whitespace-pre-wrap'>
                  {answer}
                </p>
              </ScrollArea>
            </div>
          )}

          {isLoading && (
            <div className='mt-4 flex items-center justify-center text-muted-foreground'>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              <span>AI is thinking...</span>
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
            ) : null}
            Submit Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
