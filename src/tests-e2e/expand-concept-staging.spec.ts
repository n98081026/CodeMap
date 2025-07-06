import { test, expect } from '@playwright/test';

test.describe('Expand Concept with Staging Area Flow', () => {
  const INITIAL_NODE_TEXT = 'Artificial Intelligence';
  const EXPAND_PROMPT_FOCUS = 'Applications in education';

  test.beforeEach(async ({ page }) => {
    // Assicurarsi di essere sulla dashboard (post-login globale)
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
    console.log(`Starting "Expand Concept (Staging)" test from page: ${page.url()}`);

    // Naviga per creare una nuova mappa
    await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
    await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
    await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();

    const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    await expect(editorToolbarAddNodeButton).toBeVisible({ timeout: 25000 });
    console.log("Editor loaded for new map.");

    // Aggiungi un nodo iniziale
    const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");

    await editorToolbarAddNodeButton.click();
    const firstNode = page.locator('.react-flow__node').nth(0);
    await firstNode.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(INITIAL_NODE_TEXT);
    await expect(nodeTextInput).toHaveValue(INITIAL_NODE_TEXT);
    await editorToolbarAddNodeButton.focus();
    console.log(`Initial node "${INITIAL_NODE_TEXT}" added.`);
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 });
  });

  test('should expand a node, show suggestions in staging, allow commit, and verify changes', async ({ page }) => {
    // --- Selettori ---
    const firstNode = page.locator('.react-flow__node').first(); // Il nodo creato nel beforeEach
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const expandConceptMenuItem = page.locator("button[data-tutorial-id='ai-tool-expand-concept']");
    const expandConceptModal = page.locator("div[id='tutorial-target-expand-concept-modal']");
    const conceptToExpandInput = expandConceptModal.locator('input[name="conceptToExpand"]'); // Basato su formField name
    const refinementInput = expandConceptModal.locator("textarea[id='tutorial-target-expand-concept-input']");
    const confirmExpandButton = expandConceptModal.locator("button[id='tutorial-target-expand-concept-confirm-button']");
    const stagingToolbar = page.locator("div[data-tutorial-id='ai-staging-toolbar']");
    const commitAllButton = stagingToolbar.locator("button[data-tutorial-id='staging-toolbar-accept-all']");
    // const discardAllButton = stagingToolbar.locator("button[data-tutorial-id='staging-toolbar-clear-all']"); // Per un test di discard

    // 1. Selezionare il nodo iniziale
    await firstNode.click();
    console.log(`Node "${INITIAL_NODE_TEXT}" selected.`);
    // (Opzionale) Verifica selezione: await expect(firstNode).toHaveClass(/selected/);

    // 2. Attivare "Expand Concept"
    await aiToolsMenuButton.click();
    console.log("AI Tools menu clicked.");
    await expandConceptMenuItem.click();
    console.log("'Expand Selected Concept' tool selected.");

    // 3. Interagire con il Modale "Expand Concept"
    await expect(expandConceptModal).toBeVisible({ timeout: 10000 });
    console.log("Expand Concept modal visible.");

    // Verifica precompilazione (dovrebbe essere il testo del nodo selezionato)
    await expect(conceptToExpandInput).toHaveValue(INITIAL_NODE_TEXT, {timeout: 5000});
    console.log("Modal concept input pre-filled with selected node's text.");

    await refinementInput.fill(EXPAND_PROMPT_FOCUS);
    await expect(refinementInput).toHaveValue(EXPAND_PROMPT_FOCUS);
    console.log(`Refinement prompt filled with: "${EXPAND_PROMPT_FOCUS}"`);

    await confirmExpandButton.click();
    console.log("Expand Concept modal submitted.");
    // Attendere la chiusura del modale e l'elaborazione AI che popola lo staging
    await expect(expandConceptModal).not.toBeVisible({ timeout: 30000 }); // Timeout più lungo per AI
    console.log("Expand Concept modal closed.");

    // 4. Verificare la comparsa della Staging Toolbar e dei nodi/archi staged
    await expect(stagingToolbar).toBeVisible({ timeout: 20000 }); // Dare tempo per l'apparizione post-AI
    console.log("AI Staging Toolbar is visible.");

    // Verificare che ci siano nuovi nodi "staged" (tipo 'ai-expanded')
    const stagedNodes = page.locator(".react-flow__node[data-type='ai-expanded']");
    await expect(stagedNodes.first()).toBeVisible({ timeout: 20000 });

    const initialNodeCountOnCanvas = 1; // Il nodo originale
    const stagedNodesCount = await stagedNodes.count();
    expect(stagedNodesCount).toBeGreaterThan(0); // Almeno un suggerimento
    console.log(`${stagedNodesCount} staged 'ai-expanded' nodes appeared on canvas.`);

    // Il numero totale di nodi visibili (originale + staged)
    await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCountOnCanvas + stagedNodesCount, {timeout: 5000});

    // 5. Cliccare "Commit to Map" / "Accept All"
    await expect(commitAllButton).toBeEnabled();
    await commitAllButton.click();
    console.log("Commit All button on staging toolbar clicked.");

    // 6. Verifiche Post-Commit
    await expect(stagingToolbar).not.toBeVisible({ timeout: 10000 });
    console.log("AI Staging Toolbar is hidden after commit.");

    // Il conteggio totale dei nodi dovrebbe rimanere lo stesso di prima del commit,
    // ma ora sono nodi "reali" e non più solo staged (il loro data-type potrebbe cambiare o no,
    // ma non dovrebbero avere uno stato speciale 'staged' se esisteva).
    // Per questo test, il tipo 'ai-expanded' rimane dopo il commit.
    await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCountOnCanvas + stagedNodesCount, {timeout: 5000});
    console.log(`Total node count is still ${initialNodeCountOnCanvas + stagedNodesCount} after commit.`);

    // Verifichiamo che i nodi di tipo 'ai-expanded' siano ancora lì (ora committati)
    await expect(page.locator(".react-flow__node[data-type='ai-expanded']").count()).toBe(stagedNodesCount);

    console.log("Expand Concept with Staging Area (Commit flow) test completed.");
  });

  test('should expand a node, show suggestions in staging, and allow discard', async ({ page }) => {
    // Selettori (alcuni duplicati per chiarezza del test individuale)
    const firstNode = page.locator('.react-flow__node').first();
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const expandConceptMenuItem = page.locator("button[data-tutorial-id='ai-tool-expand-concept']");
    const expandConceptModal = page.locator("div[id='tutorial-target-expand-concept-modal']");
    const refinementInput = expandConceptModal.locator("textarea[id='tutorial-target-expand-concept-input']");
    const confirmExpandButton = expandConceptModal.locator("button[id='tutorial-target-expand-concept-confirm-button']");
    const stagingToolbar = page.locator("div[data-tutorial-id='ai-staging-toolbar']");
    const discardAllButton = stagingToolbar.locator("button[data-tutorial-id='staging-toolbar-clear-all']");

    // 1. Selezionare il nodo e attivare "Expand Concept"
    await firstNode.click();
    await aiToolsMenuButton.click();
    await expandConceptMenuItem.click();
    await expect(expandConceptModal).toBeVisible({ timeout: 10000 });
    await refinementInput.fill("Alternative ideas");
    await confirmExpandButton.click();
    await expect(expandConceptModal).not.toBeVisible({ timeout: 25000 });
    await expect(stagingToolbar).toBeVisible({ timeout: 20000 });
    console.log("Staging toolbar visible for discard flow.");

    // Verificare che ci siano nodi staged
    const stagedNodes = page.locator(".react-flow__node[data-type='ai-expanded']");
    const stagedNodesCountBeforeDiscard = await stagedNodes.count();
    expect(stagedNodesCountBeforeDiscard).toBeGreaterThan(0);
    const totalNodesBeforeDiscard = await page.locator('.react-flow__node').count();
    console.log(`${stagedNodesCountBeforeDiscard} staged nodes present before discard.`);

    // 2. Cliccare "Discard All"
    await expect(discardAllButton).toBeEnabled();
    await discardAllButton.click();
    console.log("Discard All button on staging toolbar clicked.");

    // 3. Verifiche Post-Discard
    await expect(stagingToolbar).not.toBeVisible({ timeout: 10000 });
    console.log("AI Staging Toolbar is hidden after discard.");

    // Il numero di nodi 'ai-expanded' (staged) dovrebbe tornare a 0
    await expect(page.locator(".react-flow__node[data-type='ai-expanded']")).toHaveCount(0, {timeout: 5000});

    // Il numero totale di nodi dovrebbe tornare a quello iniziale (solo il nodo originale)
    const initialNodeCountOnCanvas = 1;
    await expect(page.locator('.react-flow__node')).toHaveCount(initialNodeCountOnCanvas, {timeout: 5000});
    console.log(`Total node count is ${initialNodeCountOnCanvas} after discard, as expected.`);

    // Assicurarsi che il nodo originale sia ancora lì
    await expect(page.locator(`.react-flow__node:has-text("${INITIAL_NODE_TEXT}")`)).toBeVisible();
    console.log("Original node still present after discard.");
    console.log("Expand Concept with Staging Area (Discard flow) test completed.");
  });
});
