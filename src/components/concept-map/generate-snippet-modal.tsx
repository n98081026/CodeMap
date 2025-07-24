/*
'use client';

import { Loader2, Sparkles } from 'lucide-react';
import React, { useState } from 'react';

import type { GenerateMapSnippetFromTextInput } from '@/ai/flows/generate-map-snippet-from-text';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface GenerateSnippetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (
    params: GenerateMapSnippetFromTextInput
  ) => Promise<{ success: boolean; message?: string }>;
  isLoading: boolean;
}

export const GenerateSnippetModal: React.FC<GenerateSnippetModalProps> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading,
}) => {
  const [text, setText] = useState('');
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!text.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please paste or type some text to generate a map from.',
        variant: 'default',
      });
      return;
    }
    const result = await onConfirm({ text });
    if (result.success) {
      toast({
        title: 'Snippet Generation Started',
        description:
          'AI is processing the text. New nodes and edges will appear in the staging area.',
      });
      onOpenChange(false); // Close modal on success
      setText(''); // Clear text for next time
    } else {
      toast({
        title: 'Snippet Generation Failed',
        description:
          result.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Sparkles className='mr-2 h-5 w-5 text-primary' />
            Generate Map Snippet from Text
          </DialogTitle>
          <DialogDescription>
            Paste any text (e.g., lecture notes, article paragraph) and the AI
            will create a concept map snippet from it.
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <div className='grid w-full gap-1.5'>
            <Label htmlFor='text-for-snippet'>Text to Analyze</Label>
            <Textarea
              placeholder='Paste your text here...'
              id='text-for-snippet'
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={12}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : null}
            Generate Snippet
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
*/
export {};
