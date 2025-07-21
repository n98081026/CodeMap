// src/components/concept-map/quick-cluster-modal.tsx
'use client';

import { Loader2, Sparkles } from 'lucide-react';
import { useState, useCallback } from 'react';

import { generateQuickCluster } from '@/ai/flows/generate-quick-cluster';
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

interface QuickClusterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function QuickClusterModal({
  isOpen,
  onOpenChange,
}: QuickClusterModalProps) {
  const [promptText, setPromptText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const setStagedMapData = useConceptMapStore((s) => s.setStagedMapData);
  const { toast } = useToast();

  const handleGenerateCluster = async () => {
    if (!promptText.trim()) {
      toast({
        title: 'Prompt Required',
        description: 'Please enter a topic or idea for the cluster.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    const loadingToast = toast({
      title: 'AI 正在發想中...',
      description: '請稍候，AI 正在為您產生相關點子。',
      duration: 999999,
    });
    try {
      const result = await generateQuickCluster({ prompt: promptText });
      loadingToast.dismiss();
      if (!result || !result.nodes || result.nodes.length === 0) {
        toast({
          title: 'AI：沒有產生結果',
          description: 'AI 未能根據您的提示產生點子，請試著調整一下提示文字。',
          variant: 'default',
        });
      } else {
        // Instead of calling onClusterGenerated, set data to staging area
        setStagedMapData({ nodes: result.nodes, edges: result.edges || [] });
        toast({
          title: 'AI：點子已放入預覽區！',
          description: `已產生 ${result.nodes.length} 個相關想法和 ${result.edges?.length || 0} 個關聯。請在預覽區確認後新增至地圖。`,
        });
      }
      onOpenChange(false);
      setPromptText('');
    } catch (error) {
      loadingToast.dismiss();
      console.error('Error generating quick cluster:', error);
      toast({
        title: 'AI 發想失敗',
        description: `發生錯誤，未能產生點子。${(error as Error).message ? `錯誤訊息：${(error as Error).message}` : '請稍後再試或檢查主控台。'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
      setPromptText('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <Sparkles className='mr-2 h-5 w-5 text-primary' />
            AI 快速腦力激盪
          </DialogTitle>
          <DialogDescription>
            輸入一個主題、問題或任何想法，AI
            會快速生成一些相關的點子和它們之間的可能關聯，並直接加到你的概念圖上。如果不喜歡，隨時可以「復原」(Undo)！
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4 py-4'>
          <Label htmlFor='quick-cluster-prompt'>
            你想圍繞什麼主題/想法來發想？
          </Label>
          <Textarea
            id='quick-cluster-prompt'
            placeholder="e.g., 'Key benefits of using TypeScript', 'How to improve team collaboration?', 'Brainstorm ideas for a new mobile app'"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
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
            onClick={handleGenerateCluster}
            disabled={isLoading || !promptText.trim()}
          >
            {isLoading ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Sparkles className='mr-2 h-4 w-4' />
            )}
            {isLoading ? 'AI 思考中...' : '開始發想！'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
