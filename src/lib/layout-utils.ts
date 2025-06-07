
// src/lib/layout-utils.ts

import type { ConceptMapNode } from '@/types';

const CHILD_X_OFFSET = 180;
const CHILD_Y_OFFSET = 90; // Increased Y offset for better child visibility
const SIBLING_Y_OFFSET = 120; // Y offset for new siblings

interface NodePosition {
  x: number;
  y: number;
}

interface NodeDimensions {
  width?: number;
  height?: number;
}

export function getNodePlacement(
  existingNodes: ConceptMapNode[],
  type: 'child' | 'sibling' | 'generic',
  parentNode?: ConceptMapNode | null,
  selectedNode?: ConceptMapNode | null,
  gridSize?: number
): NodePosition {
  let finalX: number;
  let finalY: number;

  if (type === 'child' && parentNode && typeof parentNode.x === 'number' && typeof parentNode.y === 'number') {
    // Attempt to place new child nodes in a somewhat circular or offset pattern
    const childrenOfParent = existingNodes.filter(n => n.parentNode === parentNode.id);
    const childIndex = childrenOfParent.length;
    const angleStep = Math.PI / 3; // Approx 60 degrees, adjust for more/less spread
    const radius = CHILD_X_OFFSET * 0.8; // Base radius

    if (childIndex === 0) { // First child directly to the right
        finalX = parentNode.x + (parentNode.width || 160) + 60; // Position relative to parent width
        finalY = parentNode.y;
    } else {
        // Simple spiral/offset placement for subsequent children
        const angle = childIndex * angleStep;
        finalX = parentNode.x + (parentNode.width || 160)/2 + radius * Math.cos(angle);
        finalY = parentNode.y + (parentNode.height || 80)/2 + radius * Math.sin(angle);

        // Try to avoid direct overlap with parent
        if (Math.abs(finalX - (parentNode.x + (parentNode.width || 160)/2)) < (parentNode.width || 160)/2 &&
            Math.abs(finalY - (parentNode.y + (parentNode.height || 80)/2)) < (parentNode.height || 80)/2) {
            finalY += CHILD_Y_OFFSET; // Shift down if too close
        }
    }


  } else if (type === 'sibling' && selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
    finalX = selectedNode.x;
    finalY = selectedNode.y + (selectedNode.height || 80) + 40; // Place below the current sibling
  } else if (type === 'generic' && selectedNode && typeof selectedNode.x === 'number' && typeof selectedNode.y === 'number') {
    // Generic placement near the selected node if available
    finalX = selectedNode.x + CHILD_X_OFFSET * 0.5 + (Math.random() * 50 - 25);
    finalY = selectedNode.y + CHILD_Y_OFFSET * 0.5 + (Math.random() * 50 - 25);
  } else {
    // Fallback: Cascade new nodes if no parent/selected context or for AI panel additions
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
