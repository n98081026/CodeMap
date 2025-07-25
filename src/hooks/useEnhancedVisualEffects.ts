'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

import type { ConceptMapNode } from '@/types';

import {
  EnhancedLayoutEngine,
  type LayoutOptions,
} from '@/components/concept-map/enhanced-layout-engine';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';

interface VisualEffect {
  id: string;
  type: 'particle' | 'pulse' | 'connection' | 'aura' | 'sparkle';
  position: { x: number; y: number };
  isActive: boolean;
  duration?: number;
  color?: string;
  size?: number;
}

interface AnimationState {
  isLayoutAnimating: boolean;
  isNodeAnimating: boolean;
  isEdgeAnimating: boolean;
  currentLayoutType: LayoutOptions['type'];
}

export function useEnhancedVisualEffects(isViewOnlyMode: boolean = false) {
  const { toast } = useToast();
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [animationState, setAnimationState] = useState<AnimationState>({
    isLayoutAnimating: false,
    isNodeAnimating: false,
    isEdgeAnimating: false,
    currentLayoutType: 'hierarchical',
  });

  const layoutEngineRef = useRef<EnhancedLayoutEngine>();
  const effectTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const animationFrameRef = useRef<number>();

  const { mapData, applyLayout } = useConceptMapStore(
    useCallback(
      (s) => ({
        mapData: s.mapData,
        applyLayout: s.applyLayout,
      }),
      []
    )
  );

  // 初始化佈局引擎
  useEffect(() => {
    layoutEngineRef.current = new EnhancedLayoutEngine({
      type: animationState.currentLayoutType,
      spacing: {
        nodeDistance: 180,
        levelDistance: 120,
        padding: 60,
      },
      animation: {
        duration: 1200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        stagger: 150,
      },
    });
  }, [animationState.currentLayoutType]);

  // 清理效果
  useEffect(() => {
    return () => {
      effectTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  /**
   * 添加視覺效果
   */
  const addVisualEffect = useCallback(
    (effect: Omit<VisualEffect, 'id'>) => {
      if (isViewOnlyMode) return;

      const id = `effect-${Date.now()}-${Math.random()}`;
      const newEffect: VisualEffect = { ...effect, id };

      setVisualEffects((prev) => [...prev, newEffect]);

      // 自動移除效果
      if (effect.duration) {
        const timeout = setTimeout(() => {
          setVisualEffects((prev) => prev.filter((e) => e.id !== id));
        }, effect.duration);

        effectTimeoutRef.current.set(id, timeout);
      }

      return id;
    },
    [isViewOnlyMode]
  );

  /**
   * 移除視覺效果
   */
  const removeVisualEffect = useCallback((effectId: string) => {
    setVisualEffects((prev) => prev.filter((e) => e.id !== effectId));

    const timeout = effectTimeoutRef.current.get(effectId);
    if (timeout) {
      clearTimeout(timeout);
      effectTimeoutRef.current.delete(effectId);
    }
  }, []);

  /**
   * 清除所有視覺效果
   */
  const clearAllVisualEffects = useCallback(() => {
    setVisualEffects([]);
    effectTimeoutRef.current.forEach((timeout) => clearTimeout(timeout));
    effectTimeoutRef.current.clear();
  }, []);

  /**
   * 節點出現動畫
   */
  const animateNodeAppearance = useCallback(
    (nodeId: string) => {
      if (isViewOnlyMode) return;

      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      setAnimationState((prev) => ({ ...prev, isNodeAnimating: true }));

      // 添加出現效果
      addVisualEffect({
        type: 'sparkle',
        position: {
          x: node.x + (node.width || 150) / 2,
          y: node.y + (node.height || 70) / 2,
        },
        isActive: true,
        duration: 1000,
        color: '#667eea',
      });

      // 重置動畫狀態
      setTimeout(() => {
        setAnimationState((prev) => ({ ...prev, isNodeAnimating: false }));
      }, 1000);
    },
    [isViewOnlyMode, mapData.nodes, addVisualEffect]
  );

  /**
   * 節點點擊效果
   */
  const triggerNodeClickEffect = useCallback(
    (nodeId: string) => {
      if (isViewOnlyMode) return;

      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // 脈衝效果
      addVisualEffect({
        type: 'pulse',
        position: {
          x: node.x + (node.width || 150) / 2,
          y: node.y + (node.height || 70) / 2,
        },
        isActive: true,
        duration: 800,
        color: '#667eea',
      });

      // 粒子爆發
      addVisualEffect({
        type: 'particle',
        position: {
          x: node.x + (node.width || 150) / 2,
          y: node.y + (node.height || 70) / 2,
        },
        isActive: true,
        duration: 1200,
      });
    },
    [isViewOnlyMode, mapData.nodes, addVisualEffect]
  );

  /**
   * 節點懸停效果
   */
  const triggerNodeHoverEffect = useCallback(
    (nodeId: string, isHovering: boolean) => {
      if (isViewOnlyMode) return;

      const node = mapData.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      if (isHovering) {
        addVisualEffect({
          type: 'aura',
          position: {
            x: node.x + (node.width || 150) / 2,
            y: node.y + (node.height || 70) / 2,
          },
          isActive: true,
          duration: 2000,
          color: '#667eea',
          size: 120,
        });
      }
    },
    [isViewOnlyMode, mapData.nodes, addVisualEffect]
  );

  /**
   * 邊創建動畫
   */
  const animateEdgeCreation = useCallback(
    (edgeId: string) => {
      if (isViewOnlyMode) return;

      const edge = mapData.edges.find((e) => e.id === edgeId);
      if (!edge) return;

      const sourceNode = mapData.nodes.find((n) => n.id === edge.source);
      const targetNode = mapData.nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      setAnimationState((prev) => ({ ...prev, isEdgeAnimating: true }));

      // 連接動畫
      addVisualEffect({
        type: 'connection',
        position: {
          x: sourceNode.x + (sourceNode.width || 150) / 2,
          y: sourceNode.y + (sourceNode.height || 70) / 2,
        },
        isActive: true,
        duration: 1000,
      });

      setTimeout(() => {
        setAnimationState((prev) => ({ ...prev, isEdgeAnimating: false }));
      }, 1000);
    },
    [isViewOnlyMode, mapData.nodes, mapData.edges, addVisualEffect]
  );

  /**
   * 執行增強佈局動畫
   */
  const executeEnhancedLayout = useCallback(
    async (layoutType: LayoutOptions['type']) => {
      if (isViewOnlyMode || mapData.nodes.length === 0) {
        toast({
          title: '無法執行佈局',
          description: isViewOnlyMode ? '檢視模式已停用' : '沒有節點可以排列',
          variant: 'default',
        });
        return;
      }

      setAnimationState((prev) => ({
        ...prev,
        isLayoutAnimating: true,
        currentLayoutType: layoutType,
      }));

      try {
        // 添加中心魔法效果
        const centerX = 400;
        const centerY = 300;

        addVisualEffect({
          type: 'aura',
          position: { x: centerX, y: centerY },
          isActive: true,
          duration: 2500,
          color: '#667eea',
          size: 200,
        });

        // 為每個節點添加準備效果
        mapData.nodes.forEach((node, index) => {
          setTimeout(() => {
            addVisualEffect({
              type: 'sparkle',
              position: {
                x: node.x + (node.width || 150) / 2,
                y: node.y + (node.height || 70) / 2,
              },
              isActive: true,
              duration: 600,
              color: '#f59e0b',
            });
          }, index * 100);
        });

        // 計算新佈局
        if (layoutEngineRef.current) {
          layoutEngineRef.current.setData(mapData.nodes, mapData.edges);
          const layoutResult = await layoutEngineRef.current.calculateLayout();

          // 應用佈局變化
          setTimeout(() => {
            const layoutUpdates = layoutResult.nodes.map((nodePos) => ({
              id: nodePos.id,
              x: nodePos.x,
              y: nodePos.y,
            }));

            applyLayout(layoutUpdates);

            // 添加完成效果
            layoutResult.nodes.forEach((nodePos, index) => {
              setTimeout(() => {
                addVisualEffect({
                  type: 'pulse',
                  position: { x: nodePos.x, y: nodePos.y },
                  isActive: true,
                  duration: 500,
                  color: '#10b981',
                });
              }, index * 50);
            });

            toast({
              title: '🎨 佈局動畫完成',
              description: `已應用 ${getLayoutDisplayName(layoutType)} 佈局`,
            });
          }, 1000);
        }
      } catch (error) {
        console.error('增強佈局動畫錯誤:', error);
        toast({
          title: '佈局失敗',
          description: '請稍後再試',
          variant: 'destructive',
        });
      } finally {
        setTimeout(() => {
          setAnimationState((prev) => ({ ...prev, isLayoutAnimating: false }));
        }, 3000);
      }
    },
    [isViewOnlyMode, mapData, applyLayout, toast, addVisualEffect]
  );

  /**
   * AI 生成內容動畫
   */
  const animateAIGeneration = useCallback(
    (position: { x: number; y: number }) => {
      if (isViewOnlyMode) return;

      // 魔法光環
      addVisualEffect({
        type: 'aura',
        position,
        isActive: true,
        duration: 2000,
        color: '#8b5cf6',
        size: 150,
      });

      // 粒子爆發
      setTimeout(() => {
        addVisualEffect({
          type: 'particle',
          position,
          isActive: true,
          duration: 1500,
        });
      }, 500);

      // 閃爍效果
      setTimeout(() => {
        addVisualEffect({
          type: 'sparkle',
          position,
          isActive: true,
          duration: 1000,
          color: '#667eea',
        });
      }, 1000);
    },
    [isViewOnlyMode, addVisualEffect]
  );

  /**
   * 獲取佈局顯示名稱
   */
  const getLayoutDisplayName = (type: LayoutOptions['type']): string => {
    const names = {
      hierarchical: '層次化',
      circular: '圓形',
      force: '力導向',
      grid: '網格',
      organic: '有機',
    };
    return names[type] || type;
  };

  /**
   * 批量動畫節點
   */
  const batchAnimateNodes = useCallback(
    (nodeIds: string[]) => {
      if (isViewOnlyMode) return;

      nodeIds.forEach((nodeId, index) => {
        setTimeout(() => {
          animateNodeAppearance(nodeId);
        }, index * 150);
      });
    },
    [isViewOnlyMode, animateNodeAppearance]
  );

  return {
    // 狀態
    visualEffects,
    animationState,

    // 效果管理
    addVisualEffect,
    removeVisualEffect,
    clearAllVisualEffects,

    // 節點動畫
    animateNodeAppearance,
    triggerNodeClickEffect,
    triggerNodeHoverEffect,
    batchAnimateNodes,

    // 邊動畫
    animateEdgeCreation,

    // 佈局動畫
    executeEnhancedLayout,

    // AI 動畫
    animateAIGeneration,

    // 工具函數
    getLayoutDisplayName,

    // 佈局選項
    availableLayouts: [
      'hierarchical',
      'circular',
      'force',
      'grid',
      'organic',
    ] as LayoutOptions['type'][],
  };
}
