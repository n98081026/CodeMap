"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useSpring, useMotionValue } from 'framer-motion';
import type { ConceptMapNode, ConceptMapEdge } from '@/types';

// 增強的動畫配置
export const ENHANCED_ANIMATIONS = {
  // 節點動畫
  nodeEntry: {
    initial: { scale: 0, opacity: 0, rotate: -180 },
    animate: { 
      scale: 1, 
      opacity: 1, 
      rotate: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20,
        duration: 0.6
      }
    },
    exit: { 
      scale: 0, 
      opacity: 0, 
      rotate: 180,
      transition: { duration: 0.3 }
    }
  },
  
  // 邊動畫
  edgeEntry: {
    initial: { pathLength: 0, opacity: 0 },
    animate: { 
      pathLength: 1, 
      opacity: 1,
      transition: {
        pathLength: { duration: 0.8, ease: "easeInOut" },
        opacity: { duration: 0.3 }
      }
    }
  },
  
  // 懸停效果
  nodeHover: {
    scale: 1.05,
    boxShadow: "0 10px 30px rgba(102, 126, 234, 0.3)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 10
    }
  },
  
  // 選中效果
  nodeSelected: {
    scale: 1.1,
    boxShadow: "0 0 0 3px rgba(102, 126, 234, 0.5)",
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20
    }
  },
  
  // AI 生成效果
  aiGenerated: {
    initial: { scale: 0, y: -50, opacity: 0 },
    animate: { 
      scale: [0, 1.2, 1], 
      y: 0, 
      opacity: 1,
      transition: {
        duration: 0.8,
        times: [0, 0.6, 1],
        ease: "easeOut"
      }
    }
  }
};

// 增強的節點組件
interface EnhancedNodeProps {
  node: ConceptMapNode;
  isSelected?: boolean;
  isHovered?: boolean;
  isAIGenerated?: boolean;
  onClick?: () => void;
  onHover?: (isHovered: boolean) => void;
  children?: React.ReactNode;
}

export function EnhancedNode({ 
  node, 
  isSelected, 
  isHovered, 
  isAIGenerated,
  onClick, 
  onHover,
  children 
}: EnhancedNodeProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const nodeVariants = isAIGenerated 
    ? ENHANCED_ANIMATIONS.aiGenerated 
    : ENHANCED_ANIMATIONS.nodeEntry;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={nodeVariants.initial}
          animate={nodeVariants.animate}
          exit={ENHANCED_ANIMATIONS.nodeEntry.exit}
          whileHover={ENHANCED_ANIMATIONS.nodeHover}
          whileTap={{ scale: 0.95 }}
          className={`
            enhanced-node
            ${isAIGenerated ? 'ai-generated' : ''}
            ${isSelected ? 'selected' : ''}
            ${isHovered ? 'hovered' : ''}
          `}
          style={{
            position: 'absolute',
            left: node.x,
            top: node.y,
            width: node.width || 150,
            height: node.height || 70,
            cursor: 'pointer',
          }}
          onClick={onClick}
          onHoverStart={() => onHover?.(true)}
          onHoverEnd={() => onHover?.(false)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// 增強的邊組件
interface EnhancedEdgeProps {
  edge: ConceptMapEdge;
  sourceNode: ConceptMapNode;
  targetNode: ConceptMapNode;
  isSelected?: boolean;
  isAIGenerated?: boolean;
}

export function EnhancedEdge({ 
  edge, 
  sourceNode, 
  targetNode, 
  isSelected, 
  isAIGenerated 
}: EnhancedEdgeProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 計算路徑
  const path = `M ${sourceNode.x + (sourceNode.width || 150) / 2} ${sourceNode.y + (sourceNode.height || 70) / 2} 
                L ${targetNode.x + (targetNode.width || 150) / 2} ${targetNode.y + (targetNode.height || 70) / 2}`;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.path
          ref={pathRef}
          d={path}
          fill="none"
          stroke={isAIGenerated ? "#667eea" : "#94a3b8"}
          strokeWidth={isSelected ? 3 : 2}
          strokeDasharray={isAIGenerated ? "5,5" : "none"}
          initial={ENHANCED_ANIMATIONS.edgeEntry.initial}
          animate={ENHANCED_ANIMATIONS.edgeEntry.animate}
          className={`
            enhanced-edge
            ${isAIGenerated ? 'ai-generated' : ''}
            ${isSelected ? 'selected' : ''}
          `}
        />
      )}
    </AnimatePresence>
  );
}

// 粒子效果組件
interface ParticleEffectProps {
  isActive: boolean;
  position: { x: number; y: number };
  type: 'creation' | 'connection' | 'magic';
}

export function ParticleEffect({ isActive, position, type }: ParticleEffectProps) {
  const particles = Array.from({ length: 12 }, (_, i) => i);

  const getParticleAnimation = (index: number) => {
    const angle = (index / 12) * Math.PI * 2;
    const distance = type === 'magic' ? 60 : 40;
    
    return {
      initial: { 
        x: 0, 
        y: 0, 
        scale: 0, 
        opacity: 1 
      },
      animate: {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        scale: [0, 1, 0],
        opacity: [1, 0.8, 0],
        transition: {
          duration: 1.2,
          delay: index * 0.1,
          ease: "easeOut"
        }
      }
    };
  };

  return (
    <AnimatePresence>
      {isActive && (
        <div 
          className="particle-container"
          style={{
            position: 'absolute',
            left: position.x,
            top: position.y,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          {particles.map((index) => (
            <motion.div
              key={index}
              className={`particle particle-${type}`}
              {...getParticleAnimation(index)}
              style={{
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: type === 'magic' ? '#667eea' : '#f59e0b',
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// 脈衝波效果
interface PulseWaveProps {
  isActive: boolean;
  position: { x: number; y: number };
  color?: string;
}

export function PulseWave({ isActive, position, color = "#667eea" }: PulseWaveProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="pulse-wave"
          style={{
            position: 'absolute',
            left: position.x - 25,
            top: position.y - 25,
            width: 50,
            height: 50,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            pointerEvents: 'none',
            zIndex: 999
          }}
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ 
            scale: [0, 2, 4], 
            opacity: [0.8, 0.4, 0],
            transition: {
              duration: 1.5,
              ease: "easeOut",
              repeat: 2
            }
          }}
          exit={{ opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
}

// 連接線動畫
interface AnimatedConnectionProps {
  start: { x: number; y: number };
  end: { x: number; y: number };
  isActive: boolean;
  color?: string;
}

export function AnimatedConnection({ 
  start, 
  end, 
  isActive, 
  color = "#667eea" 
}: AnimatedConnectionProps) {
  const pathLength = useMotionValue(0);
  
  const path = `M ${start.x} ${start.y} Q ${(start.x + end.x) / 2} ${start.y - 50} ${end.x} ${end.y}`;

  return (
    <AnimatePresence>
      {isActive && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 998
          }}
        >
          <motion.path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={3}
            strokeDasharray="5,5"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: 1, 
              opacity: [0, 1, 0],
              transition: {
                pathLength: { duration: 1, ease: "easeInOut" },
                opacity: { duration: 1, times: [0, 0.5, 1] }
              }
            }}
            exit={{ opacity: 0 }}
          />
        </svg>
      )}
    </AnimatePresence>
  );
}

// 魔法光環效果
interface MagicAuraProps {
  isActive: boolean;
  position: { x: number; y: number };
  size?: number;
}

export function MagicAura({ isActive, position, size = 100 }: MagicAuraProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="magic-aura"
          style={{
            position: 'absolute',
            left: position.x - size / 2,
            top: position.y - size / 2,
            width: size,
            height: size,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(102, 126, 234, 0.3) 0%, rgba(102, 126, 234, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 997
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ 
            scale: [0, 1.2, 1], 
            opacity: [0, 0.6, 0.3],
            rotate: [0, 360],
            transition: {
              duration: 2,
              ease: "easeOut",
              rotate: { duration: 4, repeat: Infinity, ease: "linear" }
            }
          }}
          exit={{ scale: 0, opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
}