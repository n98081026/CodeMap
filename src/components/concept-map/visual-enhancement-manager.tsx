"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  EnhancedNode, 
  EnhancedEdge, 
  ParticleEffect, 
  PulseWave, 
  AnimatedConnection, 
  MagicAura,
  ENHANCED_ANIMATIONS 
} from './enhanced-visual-effects';
import { EnhancedLayoutEngine, type LayoutOptions, type LayoutResult } from './enhanced-layout-engine';
import type { ConceptMapNode, ConceptMapEdge } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  Layout, 
  Zap, 
  RotateCcw, 
  Grid3X3, 
  Circle, 
  TreePine,
  Shuffle,
  Play,
  Pause
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VisualEnhancementManagerProps {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  onNodesUpdate: (nodes: ConceptMapNode[]) => void;
  onNodeSelect: (nodeId: string | null) => void;
  selectedNodeId: string | null;
  isViewOnlyMode?: boolean;
}

interface VisualEffect {
  id: string;
  type: 'particle' | 'pulse' | 'connection' | 'aura';
  position: { x: number; y: number };
  isActive: boolean;
  duration?: number;
}

export function VisualEnhancementManager({
  nodes,
  edges,
  onNodesUpdate,
  onNodeSelect,
  selectedNodeId,
  isViewOnlyMode = false
}: VisualEnhancementManagerProps) {
  const { toast } = useToast();
  const [visualEffects, setVisualEffects] = useState<VisualEffect[]>([]);
  const [isLayoutAnimating, setIsLayoutAnimating] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [currentLayoutType, setCurrentLayoutType] = useState<LayoutOptions['type']>('hierarchical');
  const layoutEngineRef = useRef<EnhancedLayoutEngine>();
  const effectTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 初始化佈局引擎
  useEffect(() => {
    layoutEngineRef.current = new EnhancedLayoutEngine({
      type: currentLayoutType,
      spacing: {
        nodeDistance: 180,
        levelDistance: 120,
        padding: 60,
      },
      animation: {
        duration: 1200,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        stagger: 150,
      }
    });
  }, [currentLayoutType]);

  // 添加視覺效果
  const addVisualEffect = useCallback((effect: Omit<VisualEffect, 'id'>) => {
    const id = `effect-${Date.now()}-${Math.random()}`;
    const newEffect: VisualEffect = { ...effect, id };
    
    setVisualEffects(prev => [...prev, newEffect]);

    // 自動移除效果
    if (effect.duration) {
      const timeout = setTimeout(() => {
        setVisualEffects(prev => prev.filter(e => e.id !== id));
      }, effect.duration);
      
      effectTimeoutRef.current.set(id, timeout);
    }
  }, []);

  // 移除視覺效果
  const removeVisualEffect = useCallback((effectId: string) => {
    setVisualEffects(prev => prev.filter(e => e.id !== effectId));
    
    const timeout = effectTimeoutRef.current.get(effectId);
    if (timeout) {
      clearTimeout(timeout);
      effectTimeoutRef.current.delete(effectId);
    }
  }, []);

  // 節點點擊處理
  const handleNodeClick = useCallback((nodeId: string) => {
    if (isViewOnlyMode) return;
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    onNodeSelect(nodeId === selectedNodeId ? null : nodeId);
    
    // 添加點擊效果
    addVisualEffect({
      type: 'pulse',
      position: { x: node.x + (node.width || 150) / 2, y: node.y + (node.height || 70) / 2 },
      isActive: true,
      duration: 1000
    });
  }, [nodes, selectedNodeId, onNodeSelect, isViewOnlyMode, addVisualEffect]);

  // 節點懸停處理
  const handleNodeHover = useCallback((nodeId: string, isHovered: boolean) => {
    setHoveredNodeId(isHovered ? nodeId : null);
    
    if (isHovered) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        addVisualEffect({
          type: 'aura',
          position: { x: node.x + (node.width || 150) / 2, y: node.y + (node.height || 70) / 2 },
          isActive: true,
          duration: 2000
        });
      }
    }
  }, [nodes, addVisualEffect]);

  // 執行佈局動畫
  const executeLayoutAnimation = useCallback(async (layoutType: LayoutOptions['type']) => {
    if (isViewOnlyMode || nodes.length === 0) {
      toast({
        title: "無法執行佈局",
        description: isViewOnlyMode ? "檢視模式已停用" : "沒有節點可以排列",
        variant: "default"
      });
      return;
    }

    setIsLayoutAnimating(true);
    setCurrentLayoutType(layoutType);

    try {
      // 添加魔法效果
      const centerX = 400;
      const centerY = 300;
      
      addVisualEffect({
        type: 'aura',
        position: { x: centerX, y: centerY },
        isActive: true,
        duration: 2000
      });

      // 計算新佈局
      if (layoutEngineRef.current) {
        layoutEngineRef.current.setData(nodes, edges);
        const layoutResult: LayoutResult = await layoutEngineRef.current.calculateLayout();

        // 創建連接動畫
        nodes.forEach((node, index) => {
          const newPos = layoutResult.nodes.find(n => n.id === node.id);
          if (newPos) {
            setTimeout(() => {
              addVisualEffect({
                type: 'connection',
                position: { 
                  x: node.x + (node.width || 150) / 2, 
                  y: node.y + (node.height || 70) / 2 
                },
                isActive: true,
                duration: 800
              });
            }, index * 100);
          }
        });

        // 應用新位置
        setTimeout(() => {
          const updatedNodes = nodes.map(node => {
            const newPos = layoutResult.nodes.find(n => n.id === node.id);
            return newPos ? { ...node, x: newPos.x, y: newPos.y } : node;
          });
          
          onNodesUpdate(updatedNodes);
          
          toast({
            title: "🎨 佈局動畫完成",
            description: `已應用 ${getLayoutDisplayName(layoutType)} 佈局`,
          });
        }, 500);
      }

    } catch (error) {
      console.error('佈局動畫錯誤:', error);
      toast({
        title: "佈局失敗",
        description: "請稍後再試",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsLayoutAnimating(false), 2000);
    }
  }, [isViewOnlyMode, nodes, edges, onNodesUpdate, toast, addVisualEffect]);

  // 獲取佈局顯示名稱
  const getLayoutDisplayName = (type: LayoutOptions['type']): string => {
    const names = {
      hierarchical: '層次化',
      circular: '圓形',
      force: '力導向',
      grid: '網格',
      organic: '有機'
    };
    return names[type] || type;
  };

  // 獲取佈局圖標
  const getLayoutIcon = (type: LayoutOptions['type']) => {
    const icons = {
      hierarchical: <TreePine className="w-4 h-4" />,
      circular: <Circle className="w-4 h-4" />,
      force: <Zap className="w-4 h-4" />,
      grid: <Grid3X3 className="w-4 h-4" />,
      organic: <Shuffle className="w-4 h-4" />
    };
    return icons[type] || <Layout className="w-4 h-4" />;
  };

  // 佈局選項
  const layoutOptions: LayoutOptions['type'][] = ['hierarchical', 'circular', 'force', 'grid', 'organic'];

  return (
    <div className="visual-enhancement-manager">
      {/* 佈局控制面板 */}
      <Card className="layout-control-panel mb-4 border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-700">
            <Sparkles className="w-5 h-5" />
            視覺增強佈局
            {isLayoutAnimating && (
              <Badge variant="secondary" className="ml-auto">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <RotateCcw className="w-3 h-3" />
                </motion.div>
                動畫中
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {layoutOptions.map((layoutType) => (
              <Button
                key={layoutType}
                variant={currentLayoutType === layoutType ? "default" : "outline"}
                size="sm"
                onClick={() => executeLayoutAnimation(layoutType)}
                disabled={isViewOnlyMode || isLayoutAnimating}
                className={`
                  h-auto p-3 flex flex-col items-center gap-1 text-xs
                  ${currentLayoutType === layoutType 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'border-purple-200 hover:border-purple-400 hover:bg-purple-50'
                  }
                `}
                title={`應用${getLayoutDisplayName(layoutType)}佈局`}
              >
                {getLayoutIcon(layoutType)}
                <span className="text-center leading-tight">
                  {getLayoutDisplayName(layoutType)}
                </span>
              </Button>
            ))}
          </div>
          
          {nodes.length > 0 && (
            <div className="mt-3 text-xs text-gray-600 flex items-center gap-2">
              <Layout className="w-3 h-3" />
              {nodes.length} 個節點，{edges.length} 個連接
              {isLayoutAnimating && (
                <span className="text-purple-600 flex items-center gap-1">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    ✨
                  </motion.div>
                  正在重新排列...
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 增強的節點渲染 */}
      <div className="enhanced-nodes-container relative">
        {nodes.map((node) => (
          <EnhancedNode
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            isHovered={hoveredNodeId === node.id}
            isAIGenerated={node.type?.includes('ai')}
            onClick={() => handleNodeClick(node.id)}
            onHover={(isHovered) => handleNodeHover(node.id, isHovered)}
          >
            <div className={`
              node-content p-3 rounded-lg border-2 transition-all duration-300
              ${selectedNodeId === node.id 
                ? 'border-purple-500 bg-purple-100 shadow-lg' 
                : 'border-gray-300 bg-white hover:border-purple-300 hover:shadow-md'
              }
              ${node.type?.includes('ai') 
                ? 'bg-gradient-to-br from-purple-100 to-blue-100 border-purple-400' 
                : ''
              }
            `}>
              <div className="font-medium text-sm text-gray-800">
                {node.text}
              </div>
              {node.details && (
                <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                  {node.details}
                </div>
              )}
              {node.type?.includes('ai') && (
                <Badge variant="secondary" className="mt-2 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />
                  AI 生成
                </Badge>
              )}
            </div>
          </EnhancedNode>
        ))}
      </div>

      {/* 增強的邊渲染 */}
      <svg className="enhanced-edges-container absolute inset-0 pointer-events-none">
        {edges.map((edge) => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          
          if (!sourceNode || !targetNode) return null;
          
          return (
            <EnhancedEdge
              key={edge.id}
              edge={edge}
              sourceNode={sourceNode}
              targetNode={targetNode}
              isSelected={selectedNodeId === edge.source || selectedNodeId === edge.target}
              isAIGenerated={edge.label?.includes('AI') || false}
            />
          );
        })}
      </svg>

      {/* 視覺效果渲染 */}
      <div className="visual-effects-container absolute inset-0 pointer-events-none">
        {visualEffects.map((effect) => {
          switch (effect.type) {
            case 'particle':
              return (
                <ParticleEffect
                  key={effect.id}
                  isActive={effect.isActive}
                  position={effect.position}
                  type="magic"
                />
              );
            case 'pulse':
              return (
                <PulseWave
                  key={effect.id}
                  isActive={effect.isActive}
                  position={effect.position}
                  color="#667eea"
                />
              );
            case 'aura':
              return (
                <MagicAura
                  key={effect.id}
                  isActive={effect.isActive}
                  position={effect.position}
                  size={120}
                />
              );
            default:
              return null;
          }
        })}
      </div>

      {isViewOnlyMode && (
        <div className="absolute top-4 right-4 bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
          檢視模式 - 動畫已停用
        </div>
      )}
    </div>
  );
}