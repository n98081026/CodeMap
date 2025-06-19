// src/lib/layout-utils.test.ts
import { getNodePlacement } from './layout-utils';
import type { ConceptMapNode } from '@/types';

// Mock ConceptMapNode type for testing
const mockNode = (id: string, x: number, y: number, width = 160, height = 70, parentId?: string): ConceptMapNode => ({
  id,
  text: `Node ${id}`,
  x,
  y,
  width,
  height,
  type: 'default',
  details: '',
  // backgroundColor: '', // Optional, can be omitted if not directly used by getNodePlacement or for simplicity
  // shape: 'rectangle', // Optional
  // level: 0, // Optional
  childIds: [], // Optional
  parentNode: parentId, // Optional
});

describe('getNodePlacement', () => {
  const existingNodes: ConceptMapNode[] = [
    mockNode('node1', 100, 100),
    mockNode('node2', 300, 100, 160, 70, 'node1'), // child of node1
  ];
  const parent = existingNodes[0]; // node1
  const selected = existingNodes[0]; // node1
  const gridSize = 20;

  // Test cases for child placement with direction
  describe('child placement with direction', () => {
    it('should place child to the right of parent', () => {
      const expectedX = parent.x! + parent.width! + 180; // CHILD_X_OFFSET_DIRECT
      const expectedY = parent.y! + (parent.height! / 2) - (70 / 2); // CHILD_Y_OFFSET_DIRECT (0 assuming defaultNodeHeight is 70)
      const { x, y } = getNodePlacement(existingNodes, 'child', parent, null, gridSize, undefined, 'right');
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });

    it('should place child to the left of parent', () => {
      const defaultNodeWidth = 160;
      const expectedX = parent.x! - 180 - defaultNodeWidth; // CHILD_X_OFFSET_DIRECT - defaultNodeWidth
      const expectedY = parent.y! + (parent.height! / 2) - (70 / 2);
      const { x, y } = getNodePlacement(existingNodes, 'child', parent, null, gridSize, undefined, 'left');
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });

    it('should place child above parent', () => {
      const defaultNodeWidth = 160;
      const defaultNodeHeight = 70;
      const expectedX = parent.x! + (parent.width! / 2) - (defaultNodeWidth / 2); // CHILD_X_OFFSET_VERTICAL (0)
      const expectedY = parent.y! - 100 - defaultNodeHeight; // CHILD_Y_OFFSET_VERTICAL - defaultNodeHeight
      const { x, y } = getNodePlacement(existingNodes, 'child', parent, null, gridSize, undefined, 'top');
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });

    it('should place child below parent', () => {
      const defaultNodeWidth = 160;
      const expectedX = parent.x! + (parent.width! / 2) - (defaultNodeWidth / 2);
      const expectedY = parent.y! + parent.height! + 100; // CHILD_Y_OFFSET_VERTICAL
      const { x, y } = getNodePlacement(existingNodes, 'child', parent, null, gridSize, undefined, 'bottom');
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });
  });

  // Test case for child placement without direction (fallback)
  describe('child placement without direction (fallback)', () => {
    it('should place the first child to the right and slightly down (angle calculation)', () => {
      const freshParent = mockNode('freshParent', 500, 500);
      const nodesForThisTest = [freshParent]; // Only parent exists
      // For childIndex = 0, totalChildren = 0 (or 1 if we consider the new one, logic depends on how getNodePlacement counts)
      // Assuming childIndex 0, totalChildren 0 (or 1 if not pre-incremented in caller):
      // angle = 0; cos(0) = 1, sin(0) = 0
      // x = parent.x + parent.width + SPIRAL_X_BASE_OFFSET (60) + SPIRAL_X_RADIUS (120) * 1 = 500 + 160 + 60 + 120 = 840
      // y = parent.y + SPIRAL_Y_RADIUS (60) * 0 = 500
      const expectedX = freshParent.x! + freshParent.width! + 60 + 120;
      const expectedY = freshParent.y!;
      const { x, y } = getNodePlacement(nodesForThisTest, 'child', freshParent, null, gridSize, 0, 1); // childIndex 0, totalChildren 1 (the one being placed)
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });
  });

  describe('sibling placement', () => {
    it('should place sibling below the selected node', () => {
      const expectedX = selected.x!;
      const expectedY = selected.y! + selected.height! + 120; // SIBLING_Y_OFFSET
      const { x, y } = getNodePlacement(existingNodes, 'sibling', null, selected, gridSize);
      expect(x).toBe(Math.round(expectedX / gridSize) * gridSize);
      expect(y).toBe(Math.round(expectedY / gridSize) * gridSize);
    });
  });

  describe('generic placement', () => {
    it('should place node generically near the selected node if selected', () => {
      const { x, y } = getNodePlacement(existingNodes, 'generic', null, selected, gridSize);
      // Based on logic: selected.x + GENERIC_X_OFFSET (90) + (Math.random() * 50 - 25)
      // selected.y + GENERIC_Y_OFFSET (30) + (Math.random() * 50 - 25)
      const baseExpectedX = selected.x! + 90;
      const baseExpectedY = selected.y! + 30;
      expect(x).toBeGreaterThanOrEqual(Math.round((baseExpectedX - 25) / gridSize) * gridSize - gridSize);
      expect(x).toBeLessThanOrEqual(Math.round((baseExpectedX + 25) / gridSize) * gridSize + gridSize);
      expect(y).toBeGreaterThanOrEqual(Math.round((baseExpectedY - 25) / gridSize) * gridSize - gridSize);
      expect(y).toBeLessThanOrEqual(Math.round((baseExpectedY + 25) / gridSize) * gridSize + gridSize);
    });

    it('should place node generically near origin if no selection and no parent', () => {
        const { x, y } = getNodePlacement([], 'generic', null, null, gridSize);
        // Based on logic: DEFAULT_X (50) + (Math.random() * 20 - 10)
        // DEFAULT_Y (50) + (Math.random() * 20 - 10)
        const baseExpectedX = 50;
        const baseExpectedY = 50;
        expect(x).toBeGreaterThanOrEqual(Math.round((baseExpectedX - 10) / gridSize) * gridSize - gridSize);
        expect(x).toBeLessThanOrEqual(Math.round((baseExpectedX + 10) / gridSize) * gridSize + gridSize);
        expect(y).toBeGreaterThanOrEqual(Math.round((baseExpectedY - 10) / gridSize) * gridSize - gridSize);
        expect(y).toBeLessThanOrEqual(Math.round((baseExpectedY + 10) / gridSize) * gridSize + gridSize);
      });
  });

  describe('grid snapping', () => {
    it('should snap coordinates to the nearest grid size if gridSize is provided', () => {
        // Use values that are intentionally not on the grid
        const offGridParent = mockNode('offGridParent', 103, 107);
        const noGrid = getNodePlacement([offGridParent], 'child', offGridParent, null, undefined, undefined, 'right');
        const withGrid = getNodePlacement([offGridParent], 'child', offGridParent, null, 20, undefined, 'right');

        expect(withGrid.x % 20).toBe(0);
        expect(withGrid.y % 20).toBe(0);
        // Check that snapping actually changed the value towards a grid line
        expect(withGrid.x).not.toBe(noGrid.x);
        expect(withGrid.y).not.toBe(noGrid.y);
    });

    it('should not snap if gridSize is 0 or undefined', () => {
        const posNoGrid = getNodePlacement(existingNodes, 'child', parent, null, undefined, undefined, 'right');
        const posGridZero = getNodePlacement(existingNodes, 'child', parent, null, 0, undefined, 'right');
        expect(posGridZero.x).toBe(posNoGrid.x);
        expect(posGridZero.y).toBe(posNoGrid.y);
    });
  });
});
