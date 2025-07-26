import { test, expect } from '@playwright/test';

import { EditorPage } from './pom/EditorPage';
import {
  ensureDashboard,
  navigateToCreateNewMap,
  addNodeToMap,
} from './utils/map-setup.utils';

test.describe('Ghost Preview Layout Flow (Dagre Tidy)', () => {
  const INITIAL_NODE_TEXT_1 = 'NodeA_ForLayout';
  const INITIAL_NODE_TEXT_2 = 'NodeB_ForLayout';
  const INITIAL_NODE_TEXT_3 = 'NodeC_ForLayout';
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    await addNodeToMap(page, INITIAL_NODE_TEXT_1, 0);
    await addNodeToMap(page, INITIAL_NODE_TEXT_2, 1);
    await addNodeToMap(page, INITIAL_NODE_TEXT_3, 2);

    const nodes = await editorPage.getNodesOnCanvas();
    await expect(nodes).toHaveCount(3, { timeout: 10000 });
    console.log(
      'POM: Three initial nodes added for Ghost Preview Layout test.'
    );
  });

  async function selectAllNodes(page: import('@playwright/test').Page) {
    const nodes = await editorPage.getNodesOnCanvas();
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? ('Meta' as const) : ('Control' as const);

    await nodes.nth(0).click();
    await nodes.nth(1).click({ modifiers: [modifier] });
    await nodes.nth(2).click({ modifiers: [modifier] });

    await expect(page.locator('.react-flow__node.selected')).toHaveCount(3, {
      timeout: 5000,
    });
    console.log('POM: All three nodes selected.');
  }

  async function getNodesInitialPositions() {
    const nodes = await editorPage.getNodesOnCanvas();
    const initialPositions: Array<{ id: string | null; x: number; y: number }> =
      [];
    for (let i = 0; i < (await nodes.count()); i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const box = await node.boundingBox();
      if (box) {
        initialPositions.push({ id: nodeId, x: box.x, y: box.y });
      }
    }
    expect(initialPositions.length).toBe(await nodes.count());
    return initialPositions;
  }

  test('should apply Dagre layout via ghost preview and accept changes', async ({
    page,
  }) => {
    await selectAllNodes(page);
    const initialPositions = await getNodesInitialPositions();
    console.log('POM: Initial positions captured:', initialPositions);

    await editorPage.selectLayoutTool('Dagre Tidy');

    await expect(editorPage.ghostPreviewToolbar).toBeVisible({
      timeout: 15000,
    });
    console.log('POM: Ghost Preview Toolbar is visible.');
    const ghostNodes = page.locator(".react-flow__node[data-ghost='true']");
    await expect(ghostNodes.first()).toBeVisible({ timeout: 10000 });
    await expect(ghostNodes).toHaveCount(3);
    console.log(`POM: ${await ghostNodes.count()} ghost nodes appeared.`);

    await editorPage.acceptGhostLayout();

    await expect(editorPage.ghostPreviewToolbar).not.toBeVisible({
      timeout: 10000,
    });
    console.log('POM: Ghost Preview Toolbar is hidden after accept.');

    let changedPositionCount = 0;
    const currentNodes = await editorPage.getNodesOnCanvas();
    for (let i = 0; i < (await currentNodes.count()); i++) {
      const node = currentNodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const initialPos = initialPositions.find((p) => p.id === nodeId);
      const currentBox = await node.boundingBox();
      if (initialPos && currentBox) {
        if (
          Math.abs(currentBox.x - initialPos.x) > 1 ||
          Math.abs(currentBox.y - initialPos.y) > 1
        ) {
          changedPositionCount++;
        }
        console.log(
          `POM: Node ${nodeId}: Initial (${initialPos.x.toFixed(2)},${initialPos.y.toFixed(2)}), New (${currentBox.x.toFixed(2)},${currentBox.y.toFixed(2)})`
        );
      }
    }
    expect(changedPositionCount).toBeGreaterThanOrEqual(2); // At least 2 nodes should have moved significantly
    console.log(
      `POM: ${changedPositionCount} nodes changed position after accepting layout.`
    );

    await expect(ghostNodes).toHaveCount(0);
    console.log('POM: No ghost nodes present after accept.');
  });

  test('should apply Dagre layout via ghost preview and cancel changes', async ({
    page,
  }) => {
    await selectAllNodes(page);
    const initialPositions = await getNodesInitialPositions(); // also captures size implicitly via boundingBox
    console.log(
      'POM: Initial states (pos & size) captured for cancel flow:',
      initialPositions
    );

    await editorPage.selectLayoutTool('Dagre Tidy');

    await expect(editorPage.ghostPreviewToolbar).toBeVisible({
      timeout: 15000,
    });
    const ghostNodes = page.locator(".react-flow__node[data-ghost='true']");
    await expect(ghostNodes.first()).toBeVisible({ timeout: 10000 });
    console.log('POM: Ghost previews shown for cancel flow.');

    await editorPage.cancelGhostLayout();

    await expect(editorPage.ghostPreviewToolbar).not.toBeVisible({
      timeout: 10000,
    });
    console.log('POM: Ghost Preview Toolbar is hidden after cancel.');

    const currentNodes = await editorPage.getNodesOnCanvas();
    for (let i = 0; i < (await currentNodes.count()); i++) {
      const node = currentNodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const originalState = initialPositions.find((p) => p.id === nodeId); // Using initialPositions for x,y
      const currentBox = await node.boundingBox();

      expect(originalState).toBeDefined();
      expect(currentBox).toBeDefined();

      if (originalState && currentBox) {
        expect(currentBox.x).toBeCloseTo(originalState.x, 1);
        expect(currentBox.y).toBeCloseTo(originalState.y, 1);
        // Note: Bounding box width/height might slightly change due to rendering, so not strictly checked here
        // unless the layout tool explicitly changes node sizes. Dagre Tidy primarily changes positions.
        console.log(
          `POM: Node ${nodeId}: Original (${originalState.x.toFixed(2)},${originalState.y.toFixed(2)}), Current (${currentBox.x.toFixed(2)},${currentBox.y.toFixed(2)}) - Verified position after cancel.`
        );
      }
    }
    console.log('POM: Node positions verified to be original after cancel.');
    await expect(ghostNodes).toHaveCount(0);
    console.log('POM: No ghost nodes present after cancel.');
  });
});
