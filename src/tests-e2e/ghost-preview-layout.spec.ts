import { test, expect } from '@playwright/test';

test.describe('Ghost Preview Layout Flow (Dagre Tidy)', () => {
  const INITIAL_NODE_TEXT_1 = 'NodeA_ForLayout';
  const INITIAL_NODE_TEXT_2 = 'NodeB_ForLayout';
  const INITIAL_NODE_TEXT_3 = 'NodeC_ForLayout';

  // beforeEach per setup: login (globale) e creazione mappa + 3 nodi iniziali
  test.beforeEach(async ({ page }) => {
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log(`Starting "Ghost Preview Layout" test from page: ${page.url()}`);

    await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
    await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
    await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();

    const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    await expect(editorToolbarAddNodeButton).toBeVisible({ timeout: 25000 });
    console.log("Editor loaded for new map.");

    const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");

    // Aggiungi Nodo 1
    await editorToolbarAddNodeButton.click();
    const node1 = page.locator('.react-flow__node').nth(0);
    await node1.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(INITIAL_NODE_TEXT_1);
    await expect(nodeTextInput).toHaveValue(INITIAL_NODE_TEXT_1);
    console.log(`Node 1 "${INITIAL_NODE_TEXT_1}" added.`);

    // Aggiungi Nodo 2
    await editorToolbarAddNodeButton.click(); // Aggiunge un nuovo nodo, ora ce ne sono 2
    const node2 = page.locator('.react-flow__node').nth(1);
    await node2.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(INITIAL_NODE_TEXT_2);
    await expect(nodeTextInput).toHaveValue(INITIAL_NODE_TEXT_2);
    console.log(`Node 2 "${INITIAL_NODE_TEXT_2}" added.`);

    // Aggiungi Nodo 3
    await editorToolbarAddNodeButton.click(); // Aggiunge un nuovo nodo, ora ce ne sono 3
    const node3 = page.locator('.react-flow__node').nth(2);
    await node3.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(INITIAL_NODE_TEXT_3);
    await expect(nodeTextInput).toHaveValue(INITIAL_NODE_TEXT_3);
    console.log(`Node 3 "${INITIAL_NODE_TEXT_3}" added.`);

    await editorToolbarAddNodeButton.focus(); // Deselect input
    await expect(page.locator('.react-flow__node')).toHaveCount(3, { timeout: 10000 });
    console.log("Three initial nodes added for layout test.");
  });

  test('should apply Dagre layout via ghost preview and accept changes', async ({ page }) => {
    const layoutToolsButton = page.locator("button[aria-label='Layout Tools']");
    const dagreTidyMenuItem = page.locator("button[data-tutorial-id='layout-tool-dagre-tidy']");
    const ghostPreviewToolbar = page.locator("div[data-tutorial-id='ghost-preview-toolbar']");
    const acceptButton = ghostPreviewToolbar.locator("button[data-tutorial-id='ghost-toolbar-accept']");
    const nodes = page.locator('.react-flow__node');

    // 1. Selezionare tutti i nodi (3 nodi)
    // Playwright non ha un modo semplice per "selezionare tutti" in React Flow.
    // Li selezioneremo cliccandoli con il modificatore Shift (o Ctrl/Meta a seconda del SO).
    // Nota: Playwright usa 'Meta' per Command su macOS e 'Control' per Ctrl su Win/Linux.
    // Per semplicità e cross-platform, se Shift-click è supportato per la multiselezione:
    const isMac = process.platform === 'darwin';
    const modifier = isMac ? 'Meta' as const : 'Control' as const;

    await nodes.nth(0).click(); // Seleziona il primo
    await nodes.nth(1).click({ modifiers: [modifier] }); // Aggiungi il secondo alla selezione
    await nodes.nth(2).click({ modifiers: [modifier] }); // Aggiungi il terzo

    // Verifica che 3 nodi siano selezionati (React Flow aggiunge la classe 'selected')
    await expect(page.locator('.react-flow__node.selected')).toHaveCount(3, {timeout: 5000});
    console.log("All three nodes selected.");

    // Cattura le posizioni iniziali (approssimative, dal bounding box)
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
    // Verificare che ci siano nodi ghost (almeno quelli selezionati)
    await expect(page.locator(".react-flow__node[data-ghost='true']").first()).toBeVisible({ timeout: 10000 });
    const ghostNodeCount = await page.locator(".react-flow__node[data-ghost='true']").count();
    expect(ghostNodeCount).toBe(3); // Ci aspettiamo che i 3 nodi selezionati abbiano un'anteprima ghost
    console.log(`${ghostNodeCount} ghost nodes appeared.`);

    // 4. Cliccare "Accetta"
    await expect(acceptButton).toBeEnabled();
    await acceptButton.click();
    console.log("Accept button on Ghost Preview Toolbar clicked.");

    // 5. Verifiche Post-Accettazione
    await expect(ghostPreviewToolbar).not.toBeVisible({ timeout: 10000 });
    console.log("Ghost Preview Toolbar is hidden after accept.");

    // Verificare che i nodi abbiano nuove posizioni
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
        console.log(`Node ${nodeId}: Initial (${initialPos.x},${initialPos.y}), New (${currentBox.x},${currentBox.y})`);
      }
    }
    // Ci aspettiamo che almeno alcuni nodi abbiano cambiato posizione significativamente.
    // Essendo un layout automatico, è probabile che tutti e 3 cambino.
    expect(changedPositionCount).toBeGreaterThanOrEqual(2); // Almeno 2 devono cambiare per essere un "tidy"
    console.log(`${changedPositionCount} nodes changed position after accepting layout.`);

    // I nodi non dovrebbero più avere l'attributo data-ghost
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

    const initialPositions: Array<{ id: string | null; x: number; y: number; width: number; height: number }> = [];
    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const box = await node.boundingBox();
      if (box) {
        initialPositions.push({ id: nodeId, x: box.x, y: box.y, width: box.width, height: box.height });
      }
    }
    console.log("Initial positions captured for cancel flow:", initialPositions);

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

    // Verificare che i nodi siano tornati alle posizioni originali (o molto vicine)
    for (let i = 0; i < 3; i++) {
      const node = nodes.nth(i);
      const nodeId = await node.getAttribute('data-id');
      const originalPos = initialPositions.find(p => p.id === nodeId);
      const currentBox = await node.boundingBox();

      expect(originalPos).toBeDefined();
      expect(currentBox).toBeDefined();

      if (originalPos && currentBox) {
        // Allow for minor floating point discrepancies or sub-pixel rendering differences
        expect(currentBox.x).toBeCloseTo(originalPos.x, 0);
        expect(currentBox.y).toBeCloseTo(originalPos.y, 0);
        // Check dimensions too, in case layout affected them (though Dagre usually doesn't)
        expect(currentBox.width).toBeCloseTo(originalPos.width,0);
        expect(currentBox.height).toBeCloseTo(originalPos.height,0);
        console.log(`Node ${nodeId}: Original (${originalPos.x},${originalPos.y}), Current (${currentBox.x},${currentBox.y}) - Verified position after cancel.`);
      }
    }
    console.log("Node positions verified to be original after cancel.");
    await expect(page.locator(".react-flow__node[data-ghost='true']")).toHaveCount(0);
    console.log("No ghost nodes present after cancel.");
  });
});
