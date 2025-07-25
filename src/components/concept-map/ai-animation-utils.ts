/**
 * @fileOverview Whimsical 風格的動畫工具
 * 為 AI 生成的內容提供流暢的動畫效果
 */

import type { ConceptMapNode } from '@/types';

export interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

export interface NodeAnimationOptions extends AnimationConfig {
  type: 'fadeIn' | 'scaleUp' | 'slideFromParent' | 'bounce';
  parentNode?: ConceptMapNode;
}

export interface EdgeAnimationOptions extends AnimationConfig {
  type: 'drawPath' | 'growLine' | 'pulse';
  strokeDasharray?: string;
}

export interface LayoutAnimationOptions extends AnimationConfig {
  type: 'smoothMorph' | 'guidedMovement' | 'elastic';
  stagger?: number; // 交錯動畫延遲
}

/**
 * 為新創建的節點添加進入動畫
 */
export function animateNodeAppearance(
  nodeElement: HTMLElement,
  options: NodeAnimationOptions
): Promise<void> {
  return new Promise((resolve) => {
    const { type, duration, easing, delay = 0, parentNode } = options;

    // 設置初始狀態
    switch (type) {
      case 'fadeIn':
        nodeElement.style.opacity = '0';
        nodeElement.style.transform = 'scale(0.8)';
        break;
      case 'scaleUp':
        nodeElement.style.transform = 'scale(0)';
        break;
      case 'slideFromParent':
        if (parentNode) {
          const parentRect = document
            .querySelector(`[data-id="${parentNode.id}"]`)
            ?.getBoundingClientRect();
          if (parentRect) {
            const nodeRect = nodeElement.getBoundingClientRect();
            const deltaX = parentRect.left - nodeRect.left;
            const deltaY = parentRect.top - nodeRect.top;
            nodeElement.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
          }
        }
        break;
      case 'bounce':
        nodeElement.style.transform = 'scale(0) rotate(-180deg)';
        break;
    }

    // 執行動畫
    setTimeout(() => {
      nodeElement.style.transition = `all ${duration}ms ${easing}`;

      switch (type) {
        case 'fadeIn':
          nodeElement.style.opacity = '1';
          nodeElement.style.transform = 'scale(1)';
          break;
        case 'scaleUp':
          nodeElement.style.transform = 'scale(1)';
          break;
        case 'slideFromParent':
          nodeElement.style.transform = 'translate(0, 0) scale(1)';
          break;
        case 'bounce':
          nodeElement.style.transform = 'scale(1) rotate(0deg)';
          break;
      }

      setTimeout(resolve, duration);
    }, delay);
  });
}

/**
 * 為邊添加繪製動畫
 */
export function animateEdgeDrawing(
  edgeElement: SVGPathElement,
  options: EdgeAnimationOptions
): Promise<void> {
  return new Promise((resolve) => {
    const { type, duration, easing, delay = 0 } = options;
    const pathLength = edgeElement.getTotalLength();

    switch (type) {
      case 'drawPath':
        edgeElement.style.strokeDasharray = `${pathLength}`;
        edgeElement.style.strokeDashoffset = `${pathLength}`;
        break;
      case 'growLine':
        edgeElement.style.strokeDasharray = '0, 1000';
        break;
      case 'pulse':
        edgeElement.style.opacity = '0';
        break;
    }

    setTimeout(() => {
      edgeElement.style.transition = `all ${duration}ms ${easing}`;

      switch (type) {
        case 'drawPath':
          edgeElement.style.strokeDashoffset = '0';
          break;
        case 'growLine':
          edgeElement.style.strokeDasharray = `${pathLength}, 1000`;
          break;
        case 'pulse':
          edgeElement.style.opacity = '1';
          edgeElement.style.animation = `pulse ${duration}ms ${easing}`;
          break;
      }

      setTimeout(resolve, duration);
    }, delay);
  });
}

/**
 * 為佈局變化添加平滑過渡
 */
export function animateLayoutTransition(
  newPositions: { id: string; x: number; y: number }[],
  options: LayoutAnimationOptions
): Promise<void> {
  return new Promise((resolve) => {
    const { type, duration, easing, stagger = 0 } = options;
    let completedAnimations = 0;

    newPositions.forEach((position, index) => {
      const nodeElement = document.querySelector(
        `[data-id="${position.id}"]`
      ) as HTMLElement;
      if (!nodeElement) return;

      const delay = stagger * index;

      setTimeout(() => {
        nodeElement.style.transition = `transform ${duration}ms ${easing}`;

        switch (type) {
          case 'smoothMorph':
            nodeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
            break;
          case 'guidedMovement': {
            // 添加中間關鍵幀以創建引導路徑
            const midX = position.x * 0.5;
            const midY = position.y * 0.5 - 50; // 向上彎曲

            nodeElement.style.transform = `translate(${midX}px, ${midY}px)`;
            setTimeout(() => {
              nodeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
            }, duration * 0.5);
            break;
          }
          case 'elastic':
            nodeElement.style.transition = `transform ${duration}ms cubic-bezier(0.68, -0.55, 0.265, 1.55)`;
            nodeElement.style.transform = `translate(${position.x}px, ${position.y}px)`;
            break;
        }

        setTimeout(() => {
          completedAnimations++;
          if (completedAnimations === newPositions.length) {
            resolve();
          }
        }, duration);
      }, delay);
    });
  });
}

/**
 * 創建 AI 建議的視覺提示動畫
 */
export function createSuggestionPulse(element: HTMLElement): void {
  element.classList.add('ai-suggestion-pulse');

  // 添加 CSS 動畫類
  const style = document.createElement('style');
  style.textContent = `
    .ai-suggestion-pulse {
      animation: aiSuggestionPulse 2s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
    }
    
    @keyframes aiSuggestionPulse {
      0% {
        box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7);
      }
      70% {
        box-shadow: 0 0 0 10px rgba(102, 126, 234, 0);
      }
      100% {
        box-shadow: 0 0 0 0 rgba(102, 126, 234, 0);
      }
    }
  `;

  if (!document.head.querySelector('#ai-animation-styles')) {
    style.id = 'ai-animation-styles';
    document.head.appendChild(style);
  }
}

/**
 * 移除建議動畫
 */
export function removeSuggestionPulse(element: HTMLElement): void {
  element.classList.remove('ai-suggestion-pulse');
}

/**
 * 為暫存區內容添加特殊樣式
 */
export function applyStagedContentStyle(element: HTMLElement): void {
  element.classList.add('ai-staged-content');

  const style = document.createElement('style');
  style.textContent = `
    .ai-staged-content {
      border: 2px dashed #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      position: relative;
    }
    
    .ai-staged-content::before {
      content: "AI 建議";
      position: absolute;
      top: -8px;
      left: 8px;
      background: #667eea;
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: bold;
    }
  `;

  if (!document.head.querySelector('#ai-staged-styles')) {
    style.id = 'ai-staged-styles';
    document.head.appendChild(style);
  }
}

/**
 * 預設動畫配置
 */
export const DEFAULT_ANIMATIONS = {
  nodeAppearance: {
    duration: 600,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    type: 'fadeIn' as const,
  },
  edgeDrawing: {
    duration: 800,
    easing: 'ease-out',
    type: 'drawPath' as const,
  },
  layoutTransition: {
    duration: 1000,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    type: 'smoothMorph' as const,
    stagger: 100,
  },
} as const;
