/*
'use client';

import { Loader2, GitMerge, Lightbulb } from 'lucide-react';
import React from 'react';

import type {
  SuggestIntermediateNodeInput,
  SuggestedIntermediateNode,
} from '@/ai/flows/suggest-intermediate-node';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestIntermediateNodeModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  edgeInfo: SuggestIntermediateNodeInput | null;
  suggestions: SuggestedIntermediateNode[] | null;
  isLoading: boolean;
  onConfirm: (suggestion: SuggestedIntermediateNode) => void;
}

export const SuggestIntermediateNodeModal: React.FC<
  SuggestIntermediateNodeModalProps
> = ({
  isOpen,
  onOpenChange,
  edgeInfo,
  suggestions,
  isLoading,
  onConfirm,
}) => {
  if (!edgeInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <GitMerge className='mr-2 h-5 w-5 text-primary' />
            Suggest Intermediate Node
          </DialogTitle>
          <DialogDescription>
            AI will suggest a new node to place between the two connected
            concepts.
          </DialogDescription>
        </DialogHeader>

        <div className='my-4 text-sm text-muted-foreground'>
          <p>
            <strong>Source:</strong> "{edgeInfo.sourceNodeText}"
          </p>
          <p>
            <strong>Target:</strong> "{edgeInfo.targetNodeText}"
          </p>
          <p>
            <strong>Original Relation:</strong> "{edgeInfo.currentEdgeLabel}"
          </p>
        </div>

        <div className='py-4'>
          {isLoading && (
            <div className='flex items-center justify-center p-4 text-muted-foreground'>
              <Loader2 className='mr-2 h-5 w-5 animate-spin' />
              <span>AI is thinking...</span>
            </div>
          )}
          {!isLoading && (!suggestions || suggestions.length === 0) && (
            <div className='text-center text-muted-foreground p-4'>
              No suggestions available. The AI might not have found a suitable
              intermediate concept.
            </div>
          )}
          {!isLoading && suggestions && suggestions.length > 0 && (
            <ScrollArea className='h-auto max-h-60 w-full'>
              <div className='space-y-4'>
                {suggestions.map((suggestion, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className='flex items-center text-lg'>
                        <Lightbulb className='mr-2 h-5 w-5 text-yellow-400' />
                        {suggestion.intermediateNodeText}
                      </CardTitle>
                      {suggestion.intermediateNodeDetails && (
                        <CardDescription>
                          {suggestion.intermediateNodeDetails}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className='text-sm space-y-2'>
                      <p>
                        <strong>New Relation (Source to New):</strong>{' '}
                        {suggestion.labelSourceToIntermediate}
                      </p>
                      <p>
                        <strong>New Relation (New to Target):</strong>{' '}
                        {suggestion.labelIntermediateToTarget}
                      </p>
                      {suggestion.reasoning && (
                        <p className='text-xs text-muted-foreground pt-2 border-t'>
                          <strong>AI Rationale:</strong> {suggestion.reasoning}
                        </p>
                      )}
                    </CardContent>
                    <DialogFooter className='p-4'>
                      <Button onClick={() => onConfirm(suggestion)}>
                        Add This Node
                      </Button>
                    </DialogFooter>
                  </Card>
                ))}
              </div>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
*/
export {};
