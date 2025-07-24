/*
'use client';

import { Loader2, BotMessageSquare } from 'lucide-react';
import React from 'react';

import type { GenerateMapSummaryInput } from '@/ai/flows/generate-map-summary';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MapSummaryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (params: GenerateMapSummaryInput) => Promise<void>;
  isLoading: boolean;
  summary: string | null;
}

export const MapSummaryModal: React.FC<MapSummaryModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading,
  summary,
}) => {
  const handleSubmit = () => {
    // The onConfirm now takes a simple object, even if empty, to trigger the flow
    onConfirm({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <BotMessageSquare className='mr-2 h-5 w-5 text-primary' />
            AI Map Summary
          </DialogTitle>
          <DialogDescription>
            Get a high-level overview of the main themes and structure of your
            concept map.
          </DialogDescription>
        </DialogHeader>

        <div className='py-4'>
          {!summary && !isLoading && (
            <div className='text-center text-muted-foreground p-4'>
              Click "Generate Summary" to get started.
            </div>
          )}
          {isLoading && (
            <div className='flex items-center justify-center p-4 text-muted-foreground'>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              <span>AI is analyzing your map...</span>
            </div>
          )}
          {summary && !isLoading && (
            <ScrollArea className='h-auto max-h-60 w-full rounded-md border bg-muted/30 p-3'>
              <p className='text-sm text-foreground whitespace-pre-wrap'>
                {summary}
              </p>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Close
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            {summary ? 'Regenerate Summary' : 'Generate Summary'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
*/
export {};
