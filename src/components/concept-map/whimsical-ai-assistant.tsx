'use client';

import {
  Brain,
  Sparkles,
  Layout,
  GitBranch,
  FileText,
  Zap,
  MessageCircle,
  Wand2,
} from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  action: () => void;
  disabled?: boolean;
}

interface WhimsicalAIAssistantProps {
  onExtractConcepts?: (text: string) => void;
  onSuggestRelations?: () => void;
  onSmartLayout?: () => void;
  onGenerateSummary?: () => void;
  isViewOnlyMode?: boolean;
}

export function WhimsicalAIAssistant({
  onExtractConcepts,
  onSuggestRelations,
  onSmartLayout,
  onGenerateSummary,
  isViewOnlyMode = false,
}: WhimsicalAIAssistantProps) {
  const { toast } = useToast();
  const [naturalInput, setNaturalInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { mapData, selectedElementId, multiSelectedNodeIds } =
    useConceptMapStore(
      useCallback(
        (s) => ({
          mapData: s.mapData,
          selectedElementId: s.selectedElementId,
          multiSelectedNodeIds: s.multiSelectedNodeIds,
        }),
        []
      )
    );

  // 智能解析自然語言輸入
  const handleNaturalInput = useCallback(async () => {
    if (!naturalInput.trim() || isViewOnlyMode) return;

    setIsProcessing(true);

    try {
      const input = naturalInput.toLowerCase();

      // 簡單的意圖識別
      if (
        input.includes('添加') ||
        input.includes('概念') ||
        input.includes('提取')
      ) {
        onExtractConcepts?.(naturalInput);
        toast({
          title: 'AI 理解了你的需求',
          description: '正在提取相關概念...',
        });
      } else if (
        input.includes('關係') ||
        input.includes('連接') ||
        input.includes('關聯')
      ) {
        onSuggestRelations?.();
        toast({
          title: 'AI 理解了你的需求',
          description: '正在分析概念關係...',
        });
      } else if (
        input.includes('整理') ||
        input.includes('佈局') ||
        input.includes('排列')
      ) {
        onSmartLayout?.();
        toast({
          title: 'AI 理解了你的需求',
          description: '正在優化地圖佈局...',
        });
      } else if (
        input.includes('摘要') ||
        input.includes('總結') ||
        input.includes('概述')
      ) {
        onGenerateSummary?.();
        toast({
          title: 'AI 理解了你的需求',
          description: '正在生成地圖摘要...',
        });
      } else {
        // 默認行為：提取概念
        onExtractConcepts?.(naturalInput);
        toast({
          title: 'AI 正在處理',
          description: '嘗試從你的輸入中提取概念...',
        });
      }

      setNaturalInput('');
    } catch (error) {
      toast({
        title: '處理失敗',
        description: 'AI 無法理解你的請求，請嘗試更具體的描述。',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    naturalInput,
    isViewOnlyMode,
    onExtractConcepts,
    onSuggestRelations,
    onSmartLayout,
    onGenerateSummary,
    toast,
  ]);

  // 快速操作按鈕
  const quickActions: QuickAction[] = [
    {
      id: 'smart-organize',
      label: '智能整理',
      icon: <Layout className='w-4 h-4' />,
      description: '自動優化地圖佈局和分組',
      action: () => onSmartLayout?.(),
      disabled: mapData.nodes.length < 2,
    },
    {
      id: 'add-concepts',
      label: '補充概念',
      icon: <Brain className='w-4 h-4' />,
      description: '基於現有內容智能添加相關概念',
      action: () => onExtractConcepts?.(''),
      disabled: mapData.nodes.length === 0,
    },
    {
      id: 'suggest-relations',
      label: '優化關係',
      icon: <GitBranch className='w-4 h-4' />,
      description: '改進概念間的連接和關係',
      action: () => onSuggestRelations?.(),
      disabled: mapData.nodes.length < 2,
    },
    {
      id: 'generate-summary',
      label: '生成摘要',
      icon: <FileText className='w-4 h-4' />,
      description: '創建當前地圖的智能摘要',
      action: () => onGenerateSummary?.(),
      disabled: mapData.nodes.length === 0,
    },
  ];

  // 上下文信息
  const contextInfo = {
    nodeCount: mapData.nodes.length,
    edgeCount: mapData.edges.length,
    selectedCount: multiSelectedNodeIds.length,
    hasSelection: selectedElementId !== null || multiSelectedNodeIds.length > 0,
  };

  return (
    <Card className='whimsical-ai-assistant border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50'>
      <CardHeader className='pb-3'>
        <CardTitle className='flex items-center gap-2 text-purple-700'>
          <Wand2 className='w-5 h-5' />
          AI 智能助手
          <Badge variant='secondary' className='ml-auto'>
            <Sparkles className='w-3 h-3 mr-1' />
            Whimsical
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* 自然語言輸入 */}
        <div className='space-y-2'>
          <div className='flex items-center gap-2 text-sm text-gray-600'>
            <MessageCircle className='w-4 h-4' />
            告訴我你想做什麼
          </div>
          <div className='flex gap-2'>
            <Input
              placeholder='例如：添加一些與數據庫相關的概念'
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleNaturalInput()}
              disabled={isViewOnlyMode || isProcessing}
              className='flex-1 border-purple-200 focus:border-purple-400'
            />
            <Button
              onClick={handleNaturalInput}
              disabled={!naturalInput.trim() || isViewOnlyMode || isProcessing}
              size='sm'
              className='bg-purple-600 hover:bg-purple-700'
            >
              <Zap className='w-4 h-4' />
            </Button>
          </div>
        </div>

        {/* 上下文信息 */}
        <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
          <span>📊 {contextInfo.nodeCount} 個概念</span>
          <span>🔗 {contextInfo.edgeCount} 個關係</span>
          {contextInfo.selectedCount > 0 && (
            <span className='text-purple-600'>
              ✨ 已選擇 {contextInfo.selectedCount} 個
            </span>
          )}
        </div>

        {/* 快速操作 */}
        <div className='space-y-2'>
          <div className='text-sm font-medium text-gray-700'>快速操作</div>
          <div className='grid grid-cols-2 gap-2'>
            {quickActions.map((action) => (
              <Button
                key={action.id}
                variant='outline'
                size='sm'
                onClick={action.action}
                disabled={isViewOnlyMode || action.disabled || isProcessing}
                className={cn(
                  'h-auto p-3 flex flex-col items-center gap-1 text-xs',
                  'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
                  action.disabled && 'opacity-50'
                )}
                title={action.description}
              >
                {action.icon}
                <span className='text-center leading-tight'>
                  {action.label}
                </span>
              </Button>
            ))}
          </div>
        </div>

        {/* 智能建議（未來功能） */}
        {contextInfo.hasSelection && (
          <div className='p-3 bg-blue-50 rounded-lg border border-blue-200'>
            <div className='flex items-center gap-2 text-sm text-blue-700'>
              <Sparkles className='w-4 h-4' />
              AI 建議
            </div>
            <p className='text-xs text-blue-600 mt-1'>
              基於你的選擇，我建議添加一些相關的子概念或優化當前的佈局。
            </p>
          </div>
        )}

        {/* 狀態指示 */}
        {isProcessing && (
          <div className='flex items-center gap-2 text-sm text-purple-600'>
            <div className='animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full' />
            AI 正在思考中...
          </div>
        )}

        {isViewOnlyMode && (
          <div className='text-xs text-gray-500 text-center p-2 bg-gray-50 rounded'>
            檢視模式 - AI 功能已停用
          </div>
        )}
      </CardContent>
    </Card>
  );
}
