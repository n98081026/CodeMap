'use client';

import { Loader2, Wand2, Sparkles, ArrowRightLeft } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import type { NodeContentToRewrite } from '@/hooks/useConceptMapAITools';

import {
  rewriteNodeContent as aiRewriteNodeContent,
  type RewriteNodeContentOutput,
} from '@/ai/flows/rewrite-node-content-logic';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

// Import directly from the flow file, using alias and ensuring .ts extension
import useConceptMapStore from '@/stores/concept-map-store';

interface RewriteNodeContentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  nodeContent: NodeContentToRewrite | null;
  onRewriteConfirm: (
    nodeId: string,
    newText: string,
    newDetails?: string,
    tone?: string
  ) => Promise<void>;
}

type ToneOption =
  | 'formal'
  | 'casual'
  | 'concise'
  | 'elaborate'
  | 'humorous'
  | 'professional'
  | 'simple';

const toneOptions: { value: ToneOption; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'concise', label: 'Concise' },
  { value: 'elaborate', label: 'Elaborate' },
  { value: 'humorous', label: 'Humorous' },
  { value: 'professional', label: 'Professional' },
  { value: 'simple', label: 'Simple' },
];

export function RewriteNodeContentModal({
  isOpen,
  onOpenChange,
  nodeContent,
  onRewriteConfirm,
}: RewriteNodeContentModalProps) {
  const { toast } = useToast();
  const { setAiProcessingNodeId } = useConceptMapStore();
  const [selectedTone, setSelectedTone] = useState<ToneOption>('concise');
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nodeContent) {
      setPreviewText(null);
      setPreviewDetails(null);
      setSelectedTone('concise');
    }
  }, [isOpen, nodeContent]);

  const handleGeneratePreview = useCallback(async () => {
    if (!nodeContent) return;
    setIsLoading(true);
    setAiProcessingNodeId(nodeContent.id);
    setPreviewText(null);
    setPreviewDetails(null);
    const loadingToast = toast({
      title: 'AI 潤色中...',
      description: '請稍候，AI 正在依照您選擇的風格改寫內容。',
      duration: 999999,
    });
    try {
      const result: RewriteNodeContentOutput = await aiRewriteNodeContent({
        currentText: nodeContent.text,
        currentDetails: nodeContent.details,
        targetTone: selectedTone,
      });
      loadingToast.dismiss();
      setPreviewText(result.rewrittenText);
      setPreviewDetails(result.rewrittenDetails || null);
      toast({
        title: 'AI 預覽準備就緒',
        description: 'AI 已產生修改後的內容預覽。',
      });
    } catch (error) {
      loadingToast.dismiss();
      toast({
        title: '產生預覽失敗',
        description: `AI 改寫內容時發生錯誤。${(error as Error).message ? `錯誤訊息：${(error as Error).message}` : '請稍後再試。'}`,
        variant: 'destructive',
      });
      // setAiProcessingNodeId(null); // Keep this in the finally block
    } finally {
      setIsLoading(false);
      // Do not clear setAiProcessingNodeId here if the main operation (Apply Rewrite) might still use it or if another preview is generated.
      // It's cleared when modal closes or on successful apply.
    }
  }, [nodeContent, selectedTone, toast, setAiProcessingNodeId]);

  const handleApplyRewrite = async () => {
    if (nodeContent && (previewText !== null || previewDetails !== null)) {
      setIsLoading(true);
      if (useConceptMapStore.getState().aiProcessingNodeId !== nodeContent.id) {
        setAiProcessingNodeId(nodeContent.id);
      }
      try {
        await onRewriteConfirm(
          nodeContent.id,
          previewText ?? nodeContent.text,
          previewDetails ?? nodeContent.details,
          selectedTone
        );
        onOpenChange(false);
      } catch (error) {
        toast({
          title: 'Error Applying Rewrite',
          description: (error as Error).message,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setAiProcessingNodeId(null);
      }
    } else {
      toast({
        title: 'No Preview Available',
        description: 'Please generate a preview before applying.',
        variant: 'default',
      });
    }
  };

  const handleCloseDialog = (openState: boolean) => {
    if (!openState) {
      if (
        nodeContent &&
        useConceptMapStore.getState().aiProcessingNodeId === nodeContent.id &&
        !isLoading
      ) {
        setAiProcessingNodeId(null);
      }
    }
    onOpenChange(openState);
  };

  if (!nodeContent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Sparkles className='mr-2 h-5 w-5 text-primary' />
            AI 幫你潤色文字
          </DialogTitle>
          <DialogDescription>
            讓 AI 幫你改進節點「{nodeContent.text}
            」的文字和詳細說明。選擇想要的風格，看看 AI
            修改後的樣子，滿意的話再套用。
          </DialogDescription>
        </DialogHeader>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto'>
          <div className='space-y-3'>
            <h3 className='font-semibold text-md'>原本的內容</h3>
            <div>
              <Label htmlFor='original-text'>Text:</Label>
              <Textarea
                id='original-text'
                value={nodeContent.text}
                readOnly
                rows={3}
                className='bg-muted/50'
              />
            </div>
            {nodeContent.details && (
              <div>
                <Label htmlFor='original-details'>Details:</Label>
                <Textarea
                  id='original-details'
                  value={nodeContent.details}
                  readOnly
                  rows={5}
                  className='bg-muted/50'
                />
              </div>
            )}
          </div>

          <div className='space-y-3'>
            <div className='flex justify-between items-center'>
              <h3 className='font-semibold text-md'>AI 修改後預覽</h3>
              <Select
                value={selectedTone}
                onValueChange={(value) => setSelectedTone(value as ToneOption)}
                disabled={isLoading}
              >
                <SelectTrigger className='w-[180px] h-9'>
                  <SelectValue placeholder='選擇一種風格' />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor='preview-text'>修改後的文字：</Label>
              <Textarea
                id='preview-text'
                value={previewText ?? ''}
                readOnly={!previewText}
                placeholder='點擊「產生預覽」看看 AI 修改的結果...'
                rows={3}
                className={
                  previewText === null ? 'italic bg-muted/30' : 'bg-background'
                }
              />
            </div>
            <div>
              <Label htmlFor='preview-details'>修改後的詳細說明：</Label>
              <Textarea
                id='preview-details'
                value={previewDetails ?? ''}
                readOnly={!previewDetails}
                placeholder='點擊「產生預覽」看看 AI 修改的結果...'
                rows={5}
                className={
                  previewDetails === null
                    ? 'italic bg-muted/30'
                    : 'bg-background'
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className='mt-4 pt-4 border-t'>
          <Button
            variant='outline'
            onClick={() => handleCloseDialog(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGeneratePreview}
            disabled={isLoading}
            variant='secondary'
          >
            {isLoading && previewText === null ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Wand2 className='mr-2 h-4 w-4' />
            )}
            {isLoading && previewText === null ? 'AI 處理中...' : '產生預覽'}
          </Button>
          <Button
            onClick={handleApplyRewrite}
            disabled={isLoading || previewText === null}
          >
            <ArrowRightLeft className='mr-2 h-4 w-4' />
            套用修改
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
