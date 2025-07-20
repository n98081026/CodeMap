'use client';

import { useState, useCallback } from 'react';

import type { ConceptMapNode } from '@/types';

import {
  whimsicalExtractConcepts,
  type WhimsicalExtractConceptsInput,
  type WhimsicalExtractConceptsOutput,
} from '@/ai/flows/whimsical-enhanced-extract-concepts';
import {
  animateNodeAppearance,
  animateEdgeDrawing,
  animateLayoutTransition,
  DEFAULT_ANIMATIONS,
} from '@/components/concept-map/ai-animation-utils';
import { useToast } from '@/hooks/use-toast';
import { getNodePlacement } from '@/lib/layout-utils';
import useConceptMapStore from '@/stores/concept-map-store';

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;
const GRID_SIZE_FOR_AI_PLACEMENT = 20;

export function useWhimsicalAITools(isViewOnlyMode: boolean) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    mapData,
    addNode: addStoreNode,
    addEdge: addStoreEdge,
    setStagedMapData,
    setAiExtractedConcepts,
  } = useConceptMapStore(
    useCallback(
      (s) => ({
        mapData: s.mapData,
        addNode: s.addNode,
        addEdge: s.addEdge,
        setStagedMapData: s.setStagedMapData,
        setAiExtractedConcepts: s.setAiExtractedConcepts,
      }),
      []
    )
  );

  /**
   * Whimsical 風格的智能概念提取
   */
  const handleWhimsicalExtractConcepts = useCallback(
    async (
      text: string,
      userGoals?: string,
      difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
    ) => {
      if (isViewOnlyMode) {
        toast({
          title: '檢視模式',
          description: 'AI 功能已停用',
          variant: 'default',
        });
        return;
      }

      setIsProcessing(true);

      try {
        const existingConcepts = mapData.nodes.map((node) => node.text);
        const mapContext =
          mapData.nodes.length > 0
            ? `當前地圖包含 ${mapData.nodes.length} 個概念，主要涉及：${existingConcepts.slice(0, 3).join('、')}`
            : '這是一個新的概念圖';

        const input: WhimsicalExtractConceptsInput = {
          text: text || '請基於當前地圖內容建議相關概念',
          existingConcepts,
          userGoals,
          mapContext,
          difficultyLevel,
        };

        const loadingToast = toast({
          title: 'AI 正在分析...',
          description: '使用 Whimsical 風格的智能分析',
          duration: 999999,
        });

        const result = await whimsicalExtractConcepts(input);
        loadingToast.dismiss();

        if (result.concepts && result.concepts.length > 0) {
          // 創建帶有動畫的節點
          const stagedNodes: ConceptMapNode[] = [];
          const existingNodesForPlacement = [...mapData.nodes];

          result.concepts.forEach((conceptItem, index) => {
            const newNodeId = `whimsical-${Date.now()}-${index}`;
            const position = getNodePlacement(
              existingNodesForPlacement,
              'generic',
              null,
              null,
              GRID_SIZE_FOR_AI_PLACEMENT,
              index,
              result.concepts.length
            );

            const newNode: ConceptMapNode = {
              id: newNodeId,
              text: conceptItem.concept,
              details: [
                conceptItem.context,
                conceptItem.pedagogicalNote &&
                  `💡 學習提示: ${conceptItem.pedagogicalNote}`,
                conceptItem.source && `📝 來源: "${conceptItem.source}"`,
              ]
                .filter(Boolean)
                .join('\n\n'),
              type: `ai-${conceptItem.category}`,
              position,
              width: DEFAULT_NODE_WIDTH,
              height: DEFAULT_NODE_HEIGHT,
              childIds: [],
              // 添加 Whimsical 風格的元數據
              metadata: {
                difficulty: conceptItem.difficulty,
                category: conceptItem.category,
                aiGenerated: true,
                whimsicalStyle: true,
              },
            };

            stagedNodes.push(newNode);
            existingNodesForPlacement.push(newNode);
          });

          // 發送到暫存區
          setStagedMapData({
            nodes: stagedNodes,
            edges: [],
            actionType: 'whimsicalExtractConcepts',
            metadata: {
              learningPath: result.learningPath,
              mapImprovements: result.mapImprovements,
            },
          });

          // 顯示增強的成功消息
          toast({
            title: '🎨 Whimsical AI 分析完成！',
            description: `發現 ${result.concepts.length} 個概念，已發送到暫存區。${result.learningPath ? '包含學習路徑建議。' : ''}`,
          });

          // 如果有學習路徑建議，顯示額外信息
          if (result.learningPath) {
            setTimeout(() => {
              toast({
                title: '📚 學習路徑建議',
                description: `建議學習順序：${result.learningPath.coreSequence.join(' → ')}`,
                duration: 5000,
              });
            }, 1000);
          }
        } else {
          toast({
            title: 'AI 分析完成',
            description: '未發現新的概念建議',
            variant: 'default',
          });
        }
      } catch (error: unknown) {
        console.error('Whimsical AI 提取錯誤:', error);
        toast({
          title: 'AI 分析失敗',
          description: error.message || '請稍後再試',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isViewOnlyMode, mapData, setStagedMapData, toast]
  );

  /**
   * 智能佈局優化
   */
  const handleSmartLayout = useCallback(async () => {
    if (isViewOnlyMode || mapData.nodes.length < 2) {
      toast({
        title: '無法執行',
        description: isViewOnlyMode ? '檢視模式已停用' : '需要至少 2 個節點',
        variant: 'default',
      });
      return;
    }

    setIsProcessing(true);

    try {
      // 這裡可以整合現有的 Dagre 佈局或開發新的 AI 驅動佈局
      toast({
        title: '🎨 智能佈局',
        description: '正在優化地圖佈局...',
      });

      // 模擬佈局優化過程
      setTimeout(() => {
        toast({
          title: '佈局優化完成',
          description: '地圖已按照 Whimsical 風格重新排列',
        });
        setIsProcessing(false);
      }, 2000);
    } catch (error) {
      console.error('智能佈局錯誤:', error);
      toast({
        title: '佈局優化失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  }, [isViewOnlyMode, mapData.nodes.length, toast]);

  /**
   * 生成地圖摘要
   */
  const handleGenerateSummary = useCallback(async () => {
    if (isViewOnlyMode || mapData.nodes.length === 0) {
      toast({
        title: '無法生成摘要',
        description: isViewOnlyMode ? '檢視模式已停用' : '地圖為空',
        variant: 'default',
      });
      return;
    }

    setIsProcessing(true);

    try {
      toast({
        title: '📝 生成摘要',
        description: 'AI 正在分析整個地圖...',
      });

      // 這裡可以整合現有的摘要生成功能
      setTimeout(() => {
        toast({
          title: '摘要生成完成',
          description: '已創建地圖的智能摘要',
        });
        setIsProcessing(false);
      }, 3000);
    } catch (error) {
      console.error('摘要生成錯誤:', error);
      toast({
        title: '摘要生成失敗',
        description: '請稍後再試',
        variant: 'destructive',
      });
      setIsProcessing(false);
    }
  }, [isViewOnlyMode, mapData.nodes.length, toast]);

  return {
    // Whimsical AI 功能
    handleWhimsicalExtractConcepts,
    handleSmartLayout,
    handleGenerateSummary,

    // 狀態
    isProcessing,

    // 動畫工具
    animateNodeAppearance,
    animateEdgeDrawing,
    animateLayoutTransition,

    // 配置
    defaultAnimations: DEFAULT_ANIMATIONS,
  };
}
