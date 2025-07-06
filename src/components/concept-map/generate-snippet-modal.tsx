// src/components/concept-map/generate-snippet-modal.tsx
'use client';

import { Loader2, Wand2 } from 'lucide-react'; // Removed TextSearch as Wand2 is used
import { useState } from 'react';
import { useCallback } from 'react'; // Added useCallback

import {
  generateMapSnippetFromText,
  type GenerateMapSnippetOutput,
} from '@/ai/flows/generate-map-snippet-from-text';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store'; // Added store import

interface GenerateSnippetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  // onSnippetGenerated: (output: GenerateMapSnippetOutput) => void; // Removed, will use store directly
}

export function GenerateSnippetModal({
  isOpen,
  onOpenChange,
}: GenerateSnippetModalProps) {
  // Removed onSnippetGenerated from props
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setStagedMapData } = useConceptMapStore(
    // Get action from store
    useCallback((s) => ({ setStagedMapData: s.setStagedMapData }), [])
  );
  const { toast } = useToast();

  const handleGenerateSnippet = async () => {
    if (inputText.trim().length < 50) {
      toast({
        title: 'Input Too Short',
        description:
          'Please provide more text (at least 50 characters) to generate a meaningful snippet.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const loadingToast = toast({
      title: 'AI 努力轉換中...',
      description: '請稍候，AI 正在將您的文字轉換成概念圖片段。',
      duration: 999999,
    });
    try {
      const result = await generateMapSnippetFromText({ text: inputText });
      loadingToast.dismiss();
      if (!result || !result.nodes || result.nodes.length === 0) {
        toast({
          title: 'AI：未能轉換文字',
          description:
            'AI 未能為這段文字產生概念圖片段，請嘗試調整內容或換一段文字試試。',
          variant: 'default',
        });
      } else {
        setStagedMapData({ nodes: result.nodes, edges: result.edges || [] });
        toast({
          title: 'AI：片段已放入預覽區！',
          description: `已產生 ${result.nodes.length} 個想法節點和 ${result.edges?.length || 0} 個關聯。請在預覽區確認後新增至地圖。`,
        });
      }
      onOpenChange(false);
      setInputText('');
    } catch (error) {
      loadingToast.dismiss();
      console.error('Error generating map snippet:', error);
      toast({
        title: 'AI 轉換失敗',
        description: `將文字轉換成地圖時發生錯誤。${(error as Error).message ? `錯誤訊息：${(error as Error).message}` : '請稍後再試或檢查主控台。'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      setInputText('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Wand2 className='mr-2 h-5 w-5 text-primary' />{' '}
            {/* Changed Icon for "Magic" */}
            AI 把文字變地圖
          </DialogTitle>
          <DialogDescription>
            貼一段文字進來（例如會議記錄、筆記、文章段落），AI
            會分析它並自動生成一個小小的概念圖片段，直接加到你的地圖上。如果不滿意，可以隨時「復原」(Undo)。
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Label htmlFor='generate-snippet-text'>
            你想轉換成地圖的文字內容：
          </Label>
          <Textarea
            id='generate-snippet-text'
            placeholder='在這裡貼上你的文字（建議至少 50 個字，AI 分析起來效果更好哦）...'
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className='resize-none'
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button
            variant='outline'
            onClick={() => handleDialogStateChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerateSnippet}
            disabled={isLoading || inputText.trim().length < 50}
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Wand2 className='mr-2 h-4 w-4' />
            )}
            {isLoading ? 'AI 努力轉換中...' : '開始轉換！'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
