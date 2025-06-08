
// src/lib/layout-utils.ts

import type { ConceptMapNode } from '@/types';

const CHILD_X_OFFSET_DIRECT = 180; 
const CHILD_Y_OFFSET_DIRECT = 0;  // For direct right/left, try to align vertically
const CHILD_Y_OFFSET_VERTICAL = 100; // For direct top/bottom
const CHILD_X_OFFSET_VERTICAL = 0; 

const CHILD_X_OFFSET_SPIRAL = 180;
const CHILD_Y_OFFSET_SPIRAL = 90;
const SIBLING_Y_OFFSET = 120;

interface NodePosition {
  x: number;
  y: number;
}

export function getNodePlacement(
  existingNodes: ConceptMapNode[],
  type: 'child' | 'sibling' | 'generic',
  parentNode?: ConceptMapNode | null,
  selectedNode?: ConceptMapNode | null,
  gridSize?: number,
  direction?: 'top' | 'right' | 'bottom' | 'left' // Added direction for specific child placement
): NodePosition {
  let finalX: number;
  let finalY: number;
  const defaultNodeWidth = 160;
  const defaultNodeHeight = 70; // A rough estimate for new node height

  if (type === 'child' && parentNode && typeof parentNode.x === 'number' && typeof parentNode.y === 'number') {
    const parentW = parentNode.width || defaultNodeWidth;
    const parentH = parentNode.height || defaultNodeHeight;
    
    if (direction) {
        switch (direction) {
            case 'top':
                finalX = parentNode.x + (parentW / 2) - (defaultNodeWidth / 2) + CHILD_X_OFFSET_VERTICAL;
                finalY = parentNode.y - CHILD_Y_OFFSET_VERTICAL - defaultNodeHeight;
                break;
            case 'bottom':
                finalX = parentNode.x + (parentW / 2) - (defaultNodeWidth / 2) + CHILD_X_OFFSET_VERTICAL;
                finalY = parentNode.y + parentH + CHILD_Y_OFFSET_VERTICAL;
                break;
            case 'left':
                finalX = parentNode.x - CHILD_X_OFFSET_DIRECT - defaultNodeWidth;
                finalY = parentNode.y + (parentH / 2) - (defaultNodeHeight / 2) + CHILD_Y_OFFSET_DIRECT;
                break;
            case 'right':
            default: // Default to right if direction is invalid or not 'top'/'bottom'/'left'
                finalX = parentNode.x + parentW + CHILD_X_OFFSET_DIRECT;
                finalY = parentNode.y + (parentH / 2) - (defaultNodeHeight / 2) + CHILD_Y_OFFSET_DIRECT;
                break;
        }
    } else {
        // Fallback to existing spiral/offset logic if no direction
        const childrenOfParent = existingNodes.filter(n => n.parentNode === parentNode.id);
        const childIndex = childrenOfParent.length;
        const angleStep = Math.PI / 3; 
        const radius = CHILD_X_OFFSET_SPIRAL * 0.8;

        if (childIndex === 0) { 
            finalX = parentNode.x + parentW + 60; 
            finalY = parentNode.y;
        } else {
            const angle = childIndex * angleStep;
            finalX = parentNode.x + (parentW / 2) + radius * Math.cos(angle);
            finalY = parentNode.y + (parentH / 2) + radius * Math.sin(angle);
            if (Math.abs(finalX - (parentNode.x + parentW/2)) < parentW/2 &&
                Math.abs(finalY - (parentNode.y + parentH/2)) < parentH/2) {
                finalY += CHILD_Y_OFFSET_SPIRAL; 
            }
        }
    }
  } else if (type === 'sibling' && selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
    finalX = selectedNode.x;
    finalY = selectedNode.y + (selectedNode.height || defaultNodeHeight) + SIBLING_Y_OFFSET;
  } else if (type === 'generic' && selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
    finalX = selectedNode.x + CHILD_X_OFFSET_SPIRAL * 0.5 + (Math.random() * 50 - 25);
    finalY = selectedNode.y + CHILD_Y_OFFSET_SPIRAL * 0.5 + (Math.random() * 50 - 25);
  } else {
    const lastNode = existingNodes.length > 0 ? existingNodes[existingNodes.length - 1] : null;
    const baseRandomOffset = () => Math.random() * 20 - 10;
    if (lastNode && typeof lastNode.x === 'number' && typeof lastNode.y === 'number') {
      finalX = lastNode.x + 30 + baseRandomOffset();
      finalY = lastNode.y + 30 + baseRandomOffset();
    } else {
      finalX = 50 + baseRandomOffset();
      finalY = 50 + baseRandomOffset();
    }
  }

  if (gridSize && gridSize > 0) {
    finalX = Math.round(finalX / gridSize) * gridSize;
    finalY = Math.round(finalY / gridSize) * gridSize;
  }

  return { x: finalX, y: finalY };
}
