import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap, addNodeToMap } from './utils/map-setup.utils';

test.describe('Ghost Preview Layout Flow (Dagre Tidy)', () => {
  const INITIAL_NODE_TEXT_1 = 'NodeA_ForLayout';
  const INITIAL_NODE_TEXT_2 = 'NodeB_ForLayout';
  const INITIAL_NODE_TEXT_3 = 'NodeC_ForLayout';

  test.beforeEach(async ({ page }) => {
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Aggiungi i tre nodi necessari per il test utilizzando la funzione helper
    await addNodeToMap(page, INITIAL_NODE_TEXT_1, 0);
    await addNodeToMap(page, INITIAL_NODE_TEXT_2, 1);
    await addNodeToMap(page, INITIAL_NODE_TEXT_3, 2);

    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 10000 });
    console.log("Three initial nodes added for Ghost Preview Layout test.");
  });

  test('should apply Dagre layout via ghost preview and accept changes', async ({ page }) => {
    const layoutToolsButton = page.locator("button[aria-label='Layout Tools']");
    const dagreTidyMenuItem = page.locator("button[data-tutorial-id='layout-tool-dagre-tidy']");
    const ghostPreviewToolbar = page.locator("div[data-tutorial-id='ghost-preview-toolbar']");
    const acceptButton = ghostPreviewToolbar.locator("button[data-tutorial-id='ghost-toolbar-accept']");
    const nodes = page.locator('.react-flow__node');
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' as const : 'Control' as const;

    // 1. Selezionare tutti e tre i nodi
    await nodes.nth(0).click();
    await nodes.nth(1).click({ modifiers: [modifier] });
    await nodes.nth(2).click({ modifiers: [modifier] });

    await expect(page.locator('.react-flow__node.selected')).toHaveCount(3, {timeout: 5000});
    console.log("All three nodes selected.");

    // Cattura le posizioni iniziali dei nodi
    const initialPositions: Array<{ id: string | null; x: number; y: number }> = [];
    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const box = await node.boundingBox();
      if (box) {
        initialPositions.push({ id: nodeId, x: box.x, y: box.y });
      }
    }
    console.log("Initial positions captured:", initialPositions);
    expect(initialPositions.length).toBe(3);

    // 2. Attivare "Tidy Selection (Dagre)"
    await layoutToolsButton.click();
    console.log("Layout Tools menu clicked.");
    await dagreTidyMenuItem.click();
    console.log("'Tidy Selection (Dagre)' tool selected.");

    // 3. Verificare la comparsa dei Ghost Nodes e della GhostPreviewToolbar
    await expect(ghostPreviewToolbar).toBeVisible({ timeout: 15000 });
    console.log("Ghost Preview Toolbar is visible.");
    await expect(page.locator(".react-flow__node[data-ghost='true']").first()).toBeVisible({ timeout: 10000 });
    const ghostNodeCount = await page.locator(".react-flow__node[data-ghost='true']").count();
    expect(ghostNodeCount).toBe(3);
    console.log(`${ghostNodeCount} ghost nodes appeared.`);

    // 4. Cliccare "Accetta"
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();
    console.log("Accept button on Ghost Preview Toolbar clicked.");

    // 5. Verifiche Post-Accettazione
    await expect(ghostPreviewToolbar).not.toBeVisible({ timeout: 10000 });
    console.log("Ghost Preview Toolbar is hidden after accept.");

    let changedPositionCount = 0;
    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const initialPos = initialPositions.find(p => p.id === nodeId);
      const currentBox = await node.boundingBox();
      if (initialPos && currentBox) {
        if (Math.abs(currentBox.x - initialPos.x) > 1 || Math.abs(currentBox.y - initialPos.y) > 1) {
          changedPositionCount++;
        }
        console.log(`Node ${nodeId}: Initial (${initialPos.x.toFixed(2)},${initialPos.y.toFixed(2)}), New (${currentBox.x.toFixed(2)},${currentBox.y.toFixed(2)})`);
      }
    }
    expect(changedPositionCount).toBeGreaterThanOrEqual(2);
    console.log(`${changedPositionCount} nodes changed position after accepting layout.`);

    await expect(page.locator(".react-flow__node[data-ghost='true']")).toHaveCount(0);
    console.log("No ghost nodes present after accept.");
  });

  test('should apply Dagre layout via ghost preview and cancel changes', async ({ page }) => {
    const layoutToolsButton = page.locator("button[aria-label='Layout Tools']");
    const dagreTidyMenuItem = page.locator("button[data-tutorial-id='layout-tool-dagre-tidy']");
    const ghostPreviewToolbar = page.locator("div[data-tutorial-id='ghost-preview-toolbar']");
    const cancelButton = ghostPreviewToolbar.locator("button[data-tutorial-id='ghost-toolbar-cancel']");
    const nodes = page.locator('.react-flow__node');
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' as const : 'Control' as const;

    // 1. Selezionare tutti i nodi
    await nodes.nth(0).click();
    await nodes.nth(1).click({ modifiers: [modifier] });
    await nodes.nth(2).click({ modifiers: [modifier] });
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(3, {timeout: 5000});
    console.log("All three nodes selected for cancel flow.");

    // Cattura posizioni e dimensioni iniziali
    const initialStates: Array<{ id: string | null; x: number; y: number; width: number; height: number }> = [];
    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const box = await node.boundingBox();
      if (box) {
        initialStates.push({ id: nodeId, x: box.x, y: box.y, width: box.width, height: box.height });
      }
    }
    console.log("Initial states (pos & size) captured for cancel flow:", initialStates);
    expect(initialStates.length).toBe(3);

    // 2. Attivare "Tidy Selection (Dagre)"
    await layoutToolsButton.click();
    await dagreTidyMenuItem.click();
    await expect(ghostPreviewToolbar).toBeVisible({ timeout: 15000 });
    await expect(page.locator(".react-flow__node[data-ghost='true']").first()).toBeVisible({ timeout: 10000 });
    console.log("Ghost previews shown for cancel flow.");

    // 3. Cliccare "Cancella"
    await expect(cancelButton).toBeEnabled();
    await cancelButton.click();
    console.log("Cancel button on Ghost Preview Toolbar clicked.");

    // 4. Verifiche Post-Cancellazione
    await expect(ghostPreviewToolbar).not.toBeVisible({ timeout: 10000 });
    console.log("Ghost Preview Toolbar is hidden after cancel.");

    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const originalState = initialStates.find(p => p.id === nodeId);
      const currentBox = await node.boundingBox();

      expect(originalState).toBeDefined();
      expect(currentBox).toBeDefined();

      if (originalState && currentBox) {
        expect(currentBox.x).toBeCloseTo(originalState.x, 1);
        expect(currentBox.y).toBeCloseTo(originalState.y, 1);
        expect(currentBox.width).toBeCloseTo(originalState.width,1);
        expect(currentBox.height).toBeCloseTo(originalState.height,1);
        console.log(`Node ${nodeId}: Original (${originalState.x.toFixed(2)},${originalState.y.toFixed(2)}), Current (${currentBox.x.toFixed(2)},${currentBox.y.toFixed(2)}) - Verified position after cancel.`);
      }
    }
    console.log("Node positions and sizes verified to be original after cancel.");
    await expect(page.locator(".react-flow__node[data-ghost='true']")).toHaveCount(0);
    console.log("No ghost nodes present after cancel.");
  });
});
