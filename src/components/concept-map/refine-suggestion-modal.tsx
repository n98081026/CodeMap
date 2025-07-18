// src/components/concept-map/refine-suggestion-modal.tsx
'use client';

import { Loader2, PencilRuler } from 'lucide-react'; // Added PencilRuler
import React, { useState, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';

interface RefineSuggestionModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  initialData: {
    nodeId: string; // Keep nodeId to pass back in onConfirm
    text: string;
    details?: string;
  } | null;
  onConfirm: (nodeId: string, refinementInstruction: string) => Promise<void>;
  title?: string;
  description?: string;
}

export const RefineSuggestionModal: React.FC<RefineSuggestionModalProps> = ({
  isOpen,
  onOpenChange,
  initialData,
  onConfirm,
  title = '請 AI 修改建議',
  description = '告訴 AI 你希望它如何調整目前的建議內容。',
}) => {
  const [refinementInstruction, setRefinementInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Reset instruction when initialData changes (e.g., modal opened for different node)
    // or when modal is opened
    if (isOpen) {
      setRefinementInstruction('');
    }
  }, [isOpen, initialData]); // initialData is included to reset if the target item changes while modal might be technically open

  const handleConfirm = async () => {
    if (!initialData || !refinementInstruction.trim()) return;
    setIsProcessing(true);
    try {
      await onConfirm(initialData.nodeId, refinementInstruction.trim());
      // Parent component is expected to close the modal upon successful onConfirm
      // by setting its 'isOpen' prop to false.
      // onOpenChange(false);
    } catch (error) {
      // Error handling (e.g., toast) would typically be done by the caller of onConfirm
      console.error('Error during refinement:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (!isProcessing) {
      onOpenChange(false);
    }
  };

  if (!initialData && isOpen) {
    // If modal is open but no data, it's an invalid state, potentially close or show error.
    // For now, let's just not render the content part if data is missing when open.
    // Or, parent should ensure initialData is provided if isOpen is true.
    // To prevent rendering an empty shell if parent logic is flawed:
    return null;
  }
  if (!isOpen) {
    // Also explicitly don't render if not open
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <PencilRuler className='mr-2 h-5 w-5 text-primary' />
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className='grid gap-4 py-4'>
          <div>
            <Label
              htmlFor='current-text'
              className='text-sm font-medium text-muted-foreground'
            >
              AI 目前建議的文字：
            </Label>
            <ScrollArea className='h-20 w-full rounded-md border p-2 mt-1 text-sm bg-muted'>
              {initialData?.text || 'No text provided.'}
            </ScrollArea>
          </div>

          {(initialData?.details ||
            typeof initialData?.details === 'string') && (
            <div>
              <Label
                htmlFor='current-details'
                className='text-sm font-medium text-muted-foreground'
              >
                AI 目前建議的詳細說明：
              </Label>
              <ScrollArea className='h-24 w-full rounded-md border p-2 mt-1 text-sm bg-muted'>
                {initialData.details || (
                  <span className='italic'>No details provided.</span>
                )}
              </ScrollArea>
            </div>
          )}

          <div>
            <Label htmlFor='refinement-instruction'>
              你想怎麼修改它？請告訴 AI：
            </Label>
            <Textarea
              id='refinement-instruction'
              placeholder='例如：讓它更簡短一些、多解釋一下和『專案A』的關係、強調它的優點...'
              value={refinementInstruction}
              onChange={(e) => setRefinementInstruction(e.target.value)}
              className='mt-1 min-h-[80px]'
              disabled={isProcessing}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant='outline'
              onClick={handleClose}
              disabled={isProcessing}
            >
              取消
            </Button>
          </DialogClose>
          <Button
            onClick={handleConfirm}
            disabled={!refinementInstruction.trim() || isProcessing}
          >
            {isProcessing ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <PencilRuler className='mr-2 h-4 w-4' />
            )}
            請 AI 修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
