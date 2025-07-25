import type { ConceptMapNode } from '@/types';
import type { RFLayoutNode, SnapResult } from '@/types/graph-adapter';

const CHILD_X_OFFSET_DIRECT = 180;
const CHILD_Y_OFFSET_DIRECT = 0; // For direct right/left, try to align vertically
const CHILD_Y_OFFSET_VERTICAL = 100; // For direct top/bottom
const CHILD_X_OFFSET_VERTICAL = 0;

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
  directionOrIndex?: 'top' | 'right' | 'bottom' | 'left' | number, // Can be direction or index for spiral
  totalSiblingsForSpiral?: number // For spiral distribution
): NodePosition {
  let finalX: number;
  let finalY: number;
  const defaultNodeWidth = 160;
  const defaultNodeHeight = 70;

  if (
    type === 'child' &&
    parentNode &&
    typeof parentNode.x === 'number' &&
    typeof parentNode.y === 'number'
  ) {
    const parentW = parentNode.width || defaultNodeWidth;
    const parentH = parentNode.height || defaultNodeHeight;

    if (typeof directionOrIndex === 'string') {
      switch (directionOrIndex) {
        case 'top':
          finalX =
            parentNode.x +
            parentW / 2 -
            defaultNodeWidth / 2 +
            CHILD_X_OFFSET_VERTICAL;
          finalY = parentNode.y - CHILD_Y_OFFSET_VERTICAL - defaultNodeHeight;
          break;
        case 'bottom':
          finalX =
            parentNode.x +
            parentW / 2 -
            defaultNodeWidth / 2 +
            CHILD_X_OFFSET_VERTICAL;
          finalY = parentNode.y + parentH + CHILD_Y_OFFSET_VERTICAL;
          break;
        case 'left':
          finalX = parentNode.x - CHILD_X_OFFSET_DIRECT - defaultNodeWidth;
          finalY =
            parentNode.y +
            parentH / 2 -
            defaultNodeHeight / 2 +
            CHILD_Y_OFFSET_DIRECT;
          break;
        case 'right':
        default:
          finalX = parentNode.x + parentW + CHILD_X_OFFSET_DIRECT;
          finalY =
            parentNode.y +
            parentH / 2 -
            defaultNodeHeight / 2 +
            CHILD_Y_OFFSET_DIRECT;
          break;
      }
    } else {
      // Spiral/offset logic (original fallback)
      const childIndex =
        typeof directionOrIndex === 'number'
          ? directionOrIndex
          : existingNodes.filter((n) => n.parentNode === parentNode.id).length;
      const totalSiblings =
        typeof totalSiblingsForSpiral === 'number' && totalSiblingsForSpiral > 0
          ? totalSiblingsForSpiral
          : Math.max(1, childIndex + 1);
      const angleStep =
        (2 * Math.PI) / Math.max(1, totalSiblings > 3 ? 6 : totalSiblings); // Distribute more widely for more items
      const radius = 180 * (0.6 + childIndex * 0.05); // Slightly increasing radius

      if (childIndex === 0 && totalSiblings === 1) {
        finalX = parentNode.x + parentW + 60;
        finalY = parentNode.y;
      } else {
        const angle = childIndex * angleStep + Math.PI / 6; // Start angle offset
        finalX =
          parentNode.x +
          parentW / 2 -
          defaultNodeWidth / 2 +
          radius * Math.cos(angle);
        finalY =
          parentNode.y +
          parentH / 2 -
          defaultNodeHeight / 2 +
          radius * Math.sin(angle);
      }
    }
  } else if (
    type === 'sibling' &&
    selectedNode &&
    typeof selectedNode.x === 'number' &&
    typeof selectedNode.y === 'number'
  ) {
    finalX = selectedNode.x;
    finalY =
      selectedNode.y +
      (selectedNode.height || defaultNodeHeight) +
      SIBLING_Y_OFFSET;
  } else if (
    type === 'generic' &&
    selectedNode &&
    typeof selectedNode.x === 'number' &&
    typeof selectedNode.y === 'number'
  ) {
    // Position near the selected node, but slightly offset to avoid direct overlap
    finalX =
      selectedNode.x +
      (selectedNode.width || defaultNodeWidth) * 0.5 +
      30 +
      (Math.random() * 40 - 20);
    finalY =
      selectedNode.y +
      (selectedNode.height || defaultNodeHeight) * 0.5 +
      30 +
      (Math.random() * 40 - 20);
  } else {
    // Generic placement if no context
    let maxX = 0;
    let maxY = 0;
    if (existingNodes.length > 0) {
      existingNodes.forEach((node) => {
        if (typeof node.x === 'number' && typeof node.y === 'number') {
          maxX = Math.max(maxX, node.x + (node.width || defaultNodeWidth));
          maxY = Math.max(maxY, node.y + (node.height || defaultNodeHeight));
        }
      });
      finalX = existingNodes.length % 3 === 0 ? 50 : maxX + 30; // Simple spread
      finalY = existingNodes.length % 3 === 0 ? maxY + 50 : 50;
    } else {
      finalX = 50;
      finalY = 50;
    }
  }

  if (gridSize && gridSize > 0) {
    finalX = Math.round(finalX / gridSize) * gridSize;
    finalY = Math.round(finalY / gridSize) * gridSize;
  }

  return { x: finalX, y: finalY };
}

/**
 * Calculates the snapped position for a node being dragged and identifies active snap lines.
 * @param targetNodePos The current absolute position of the target node.
 * @param targetNodeDims The dimensions (width, height) of the target node.
 * @param nodesToSnapAgainst An array of other nodes on the canvas to check for snapping.
 * @param gridSize The size of the grid for grid snapping.
 * @param snapThreshold The distance threshold within which snapping occurs.
 * @param excludeId Optional ID of a node to exclude from `nodesToSnapAgainst` (typically the target node itself).
 * @returns An object containing the `snappedPosition` and an array of `activeSnapLines`.
 */
export function calculateSnappedPositionAndLines(
  targetNodePos: { x: number; y: number },
  targetNodeDims: { width: number; height: number },
  nodesToSnapAgainst: RFLayoutNode[], // Changed to use RFLayoutNode
  gridSize: number,
  snapThreshold: number,
  excludeId?: string
): SnapResult {
  let currentDragSnapLines: SnapResult['activeSnapLines'] = [];
  let snappedXPosition = targetNodePos.x;
  let snappedYPosition = targetNodePos.y;
  let xSnappedByNode = false;
  let ySnappedByNode = false;

  const targetNodeWidth = targetNodeDims.width;
  const targetNodeHeight = targetNodeDims.height;

  const effectiveNodesToSnapAgainst = excludeId
    ? nodesToSnapAgainst.filter((n) => n.id !== excludeId)
    : nodesToSnapAgainst;

  const draggedTargetsX = [
    { type: 'left', value: targetNodePos.x },
    { type: 'center', value: targetNodePos.x + targetNodeWidth / 2 },
    { type: 'right', value: targetNodePos.x + targetNodeWidth },
  ];
  const draggedTargetsY = [
    { type: 'top', value: targetNodePos.y },
    { type: 'center', value: targetNodePos.y + targetNodeHeight / 2 },
    { type: 'bottom', value: targetNodePos.y + targetNodeHeight },
  ];

  let minDeltaX = Infinity;
  let bestSnapXInfo: any | null = null;
  let minDeltaY = Infinity;
  let bestSnapYInfo: any | null = null;

  effectiveNodesToSnapAgainst.forEach((otherNode) => {
    // Use otherNode.width and otherNode.height directly if RFLayoutNode ensures they are numbers or null
    // The type RFLayoutNode already has width/height as number | null | undefined.
    // The check `!otherNode.width || !otherNode.height` should handle null/undefined.
    if (
      otherNode.width == null ||
      otherNode.height == null ||
      !otherNode.positionAbsolute
    )
      return;

    const otherWidth = otherNode.width;
    const otherHeight = otherNode.height;
    const otherNodePosition = otherNode.positionAbsolute;

    const otherTargetsX = [
      { type: 'left', value: otherNodePosition.x },
      { type: 'center', value: otherNodePosition.x + otherWidth / 2 },
      { type: 'right', value: otherNodePosition.x + otherWidth },
    ];
    const otherTargetsY = [
      { type: 'top', value: otherNodePosition.y },
      { type: 'center', value: otherNodePosition.y + otherHeight / 2 },
      { type: 'bottom', value: otherNodePosition.y + otherHeight },
    ];

    for (const dtX of draggedTargetsX) {
      for (const otX of otherTargetsX) {
        const delta = Math.abs(dtX.value - otX.value);
        if (delta < snapThreshold && delta < minDeltaX) {
          minDeltaX = delta;
          bestSnapXInfo = {
            position: otX.value - (dtX.value - targetNodePos.x),
            line: {
              type: 'vertical',
              x1: otX.value,
              y1: Math.min(targetNodePos.y, otherNodePosition.y) - 20,
              x2: otX.value,
              y2:
                Math.max(
                  targetNodePos.y + targetNodeHeight,
                  otherNodePosition.y + otherHeight
                ) + 20,
            },
          };
        }
      }
    }

    for (const dtY of draggedTargetsY) {
      for (const otY of otherTargetsY) {
        const delta = Math.abs(dtY.value - otY.value);
        if (delta < snapThreshold && delta < minDeltaY) {
          minDeltaY = delta;
          bestSnapYInfo = {
            position: otY.value - (dtY.value - targetNodePos.y),
            line: {
              type: 'horizontal',
              x1: Math.min(targetNodePos.x, otherNodePosition.x) - 20,
              y1: otY.value,
              x2:
                Math.max(
                  targetNodePos.x + targetNodeWidth,
                  otherNodePosition.x + otherWidth
                ) + 20,
              y2: otY.value,
            },
          };
        }
      }
    }
  });

  if (bestSnapXInfo !== null) {
    snappedXPosition = bestSnapXInfo.position;
    xSnappedByNode = true;
    currentDragSnapLines.push(bestSnapXInfo.line);
  }
  if (bestSnapYInfo !== null) {
    snappedYPosition = bestSnapYInfo.position;
    ySnappedByNode = true;
    currentDragSnapLines.push(bestSnapYInfo.line);
  }

  if (!xSnappedByNode) {
    const gridSnappedX = Math.round(targetNodePos.x / gridSize) * gridSize;
    if (Math.abs(targetNodePos.x - gridSnappedX) < snapThreshold) {
      snappedXPosition = gridSnappedX;
    }
  }
  if (!ySnappedByNode) {
    const gridSnappedY = Math.round(targetNodePos.y / gridSize) * gridSize;
    if (Math.abs(targetNodePos.y - gridSnappedY) < snapThreshold) {
      snappedYPosition = gridSnappedY;
    }
  }

  return {
    snappedPosition: { x: snappedXPosition, y: snappedYPosition },
    activeSnapLines: currentDragSnapLines,
  };
}
