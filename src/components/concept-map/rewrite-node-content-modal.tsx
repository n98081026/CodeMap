/*
'use client';

import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import type { RewriteNodeContentLogicInput } from '@/ai/flows/rewrite-node-content-logic';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type RewriteStyle =
  | 'concise'
  | 'elaborate'
  | 'professional'
  | 'casual'
  | 'technical'
  | 'custom';

interface RewriteNodeContentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (
    style: RewriteStyle,
    customInstruction?: string
  ) => Promise<void>;
  isLoading: boolean;
  originalContent: string | null;
  rewrittenContent: string | null;
  nodeId: string | null;
}

export const RewriteNodeContentModal: React.FC<
  RewriteNodeContentModalProps
> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  isLoading,
  originalContent,
  rewrittenContent,
  nodeId,
}) => {
  const [style, setStyle] = useState<RewriteStyle>('concise');
  const [customInstruction, setCustomInstruction] = useState('');
  const [currentRewritten, setCurrentRewritten] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (rewrittenContent) {
      setCurrentRewritten(rewrittenContent);
    } else {
      setCurrentRewritten(''); // Clear on new modal open
    }
  }, [rewrittenContent, isOpen]);

  const handleSubmit = async () => {
    if (style === 'custom' && !customInstruction.trim()) {
      toast({
        title: 'Custom Instruction Required',
        description: 'Please provide instructions for the custom rewrite.',
        variant: 'default',
      });
      return;
    }
    await onConfirm(style, customInstruction);
  };

  const handleAcceptRewrite = () => {
    // This function will now be handled by the hook that opened the modal,
    // which has access to `onSelectedElementPropertyUpdate`.
    // This modal component's responsibility ends at displaying content and firing events.
    // For now, we can just log it or make it a no-op until the hook is fully integrated.
    console.log('Accepting rewrite for node:', nodeId);
    console.log('New content:', currentRewritten);
    // The actual logic would be something like:
    // onAccept(nodeId, { text: currentRewritten });
    onOpenChange(false); // Close modal after accepting
    toast({
      title: 'Content Updated',
      description: 'The node content has been updated with the AI version.',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Wand2 className='mr-2 h-5 w-5 text-primary' />
            Rewrite Node Content
          </DialogTitle>
          <DialogDescription>
            Use AI to refine the text of your selected node.
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 py-4'>
          <div>
            <Label>Original Content</Label>
            <Textarea
              value={originalContent || ''}
              readOnly
              rows={8}
              className='mt-1 bg-muted/50 cursor-not-allowed'
            />
          </div>
          <div>
            <Label>AI Rewritten Content</Label>
            <Textarea
              value={currentRewritten}
              onChange={(e) => setCurrentRewritten(e.target.value)}
              rows={8}
              className='mt-1'
              placeholder='AI suggestion will appear here...'
              disabled={isLoading}
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 items-end'>
          <div>
            <Label htmlFor='rewrite-style'>Rewrite Style</Label>
            <Select
              value={style}
              onValueChange={(value) => setStyle(value as RewriteStyle)}
              disabled={isLoading}
            >
              <SelectTrigger id='rewrite-style'>
                <SelectValue placeholder='Select a style' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='concise'>Concise</SelectItem>
                <SelectItem value='elaborate'>Elaborate</SelectItem>
                <SelectItem value='professional'>Professional</SelectItem>
                <SelectItem value='casual'>Casual</SelectItem>
                <SelectItem value='technical'>More Technical</SelectItem>
                <SelectItem value='custom'>Custom...</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {style === 'custom' && (
            <div className='md:col-span-2'>
              <Label htmlFor='custom-instruction'>Custom Instruction</Label>
              <Input
                id='custom-instruction'
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder='e.g., "Make it sound like a pirate"'
                disabled={isLoading}
              />
            </div>
          )}
        </div>

        <DialogFooter className='mt-6'>
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
            ) : (
              <Sparkles className='mr-2 h-4 w-4' />
            )}
            {rewrittenContent ? 'Regenerate' : 'Generate'}
          </Button>
          <Button
            onClick={handleAcceptRewrite}
            disabled={isLoading || !currentRewritten}
          >
            Accept and Update Node
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
*/
export {};
