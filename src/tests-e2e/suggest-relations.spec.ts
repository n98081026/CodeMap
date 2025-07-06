import { test, expect } from '@playwright/test';

test.describe('Suggest Relations AI Tool Flow', () => {
  const NODE_TEXT_1 = 'Frontend Frameworks';
  const NODE_TEXT_2 = 'React';
  // Regex per etichette comuni che l'AI potrebbe suggerire per React come framework frontend
  const EXPECTED_RELATION_LABEL_PARTIAL_REGEX = /is a|includes|example of|type of|uses/i;

  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    const testUserEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
    const testUserPassword = process.env.TEST_USER_PASSWORD || 'password123';

    await page.locator('input[type="email"]').fill(testUserEmail);
    await page.locator('input[type="password"]').fill(testUserPassword);
    await page.getByRole('button', { name: /Login|Sign In/i }).click();
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
    console.log(`Login successful for Suggest Relations test. Current page: ${page.url()}`);

    // Naviga per creare una nuova mappa
    await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
    await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
    await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();

    const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    await expect(editorToolbarAddNodeButton).toBeVisible({ timeout: 25000 });
    console.log("Editor loaded for new map for Suggest Relations test.");

    // Aggiungi i due nodi necessari per il test
    const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");

    // Nodo 1
    await editorToolbarAddNodeButton.click();
    const firstNode = page.locator('.react-flow__node').nth(0);
    await firstNode.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) { // Breve timeout per vedere se è già visibile
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(NODE_TEXT_1);
    await expect(nodeTextInput).toHaveValue(NODE_TEXT_1);
    await editorToolbarAddNodeButton.focus();
    console.log(`Node 1 "${NODE_TEXT_1}" added.`);

    // Nodo 2
    await editorToolbarAddNodeButton.click();
    const secondNode = page.locator('.react-flow__node').nth(1);
    await secondNode.click();
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(NODE_TEXT_2);
    await expect(nodeTextInput).toHaveValue(NODE_TEXT_2);
    await editorToolbarAddNodeButton.focus();
    console.log(`Node 2 "${NODE_TEXT_2}" added.`);

    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });
    console.log("Two nodes added for the test.");
  });

  test('should suggest relations and allow adding them to the map', async ({ page }) => {
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const suggestRelationsMenuItem = page.locator("button[data-tutorial-id='ai-tool-suggest-relations']");
    const suggestRelationsModal = page.locator("[data-tutorial-id='suggest-relations-modal']");
    const modalSubmitButton = suggestRelationsModal.locator("button[data-tutorial-id='suggest-relations-submit']");
    const aiPanelToggleButton = page.locator("button[data-tutorial-id='editor-toggle-ai-panel']");
    const aiPanel = page.locator("div[data-tutorial-id='ai-suggestion-panel']");
    const suggestedRelationsSection = aiPanel.locator("div[data-tutorial-id='suggested-relations-section']");

    // 1. Attivare "Suggest Relations"
    // In questo scenario, non selezioniamo nodi specifici prima di aprire lo strumento,
    // lasciando che l'AI consideri il contesto dell'intera mappa (i due nodi creati).
    await aiToolsMenuButton.click();
    console.log("AI Tools menu clicked.");
    await suggestRelationsMenuItem.click();
    console.log("'Suggest Relations' tool selected.");

    // 2. Interagire con il Modale "Suggest Relations"
    await expect(suggestRelationsModal).toBeVisible({ timeout: 10000 });
    console.log("Suggest Relations modal visible.");
    // Per questo test, non inseriamo un prompt custom, usiamo i default.
    await modalSubmitButton.click();
    console.log("Modal submit button clicked for Suggest Relations.");
    await expect(suggestRelationsModal).not.toBeVisible({ timeout: 20000 }); // Aumentato timeout per elaborazione AI
    console.log("Suggest Relations modal closed.");

    // 3. Verificare che le relazioni suggerite appaiano nell'AI Suggestion Panel
    if (!await aiPanel.isVisible({timeout: 2000})) { // Breve timeout per vedere se è già visibile
        await aiPanelToggleButton.click();
        await expect(aiPanel).toBeVisible({ timeout: 5000 });
    }
    console.log("AI Suggestion Panel is visible.");

    await expect(suggestedRelationsSection).toBeVisible({ timeout: 25000 }); // Dare più tempo all'AI
    console.log("Suggested relations section visible.");

    // Verificare la presenza di una relazione attesa tra i nodi creati
    // Cerca un item che contenga entrambi i testi dei nodi. L'ordine potrebbe variare.
    const relationItemLocator = suggestedRelationsSection.locator(
      `div[data-tutorial-id^='suggested-relation-item-']:has-text("${NODE_TEXT_1}"):has-text("${NODE_TEXT_2}")`
    ).first();

    await expect(relationItemLocator).toBeVisible({ timeout: 20000 }); // Aumentato timeout
    console.log(`Expected relation item containing "${NODE_TEXT_1}" and "${NODE_TEXT_2}" is visible.`);

    // Verificare l'etichetta della relazione (parziale e case-insensitive)
    await expect(relationItemLocator).toHaveText(EXPECTED_RELATION_LABEL_PARTIAL_REGEX);
    console.log("Expected relation label partial match found.");

    // 4. Selezionare la relazione suggerita e aggiungerla alla mappa
    const relationCheckbox = relationItemLocator.locator('button[role="checkbox"]');
    await expect(relationCheckbox).toBeVisible({timeout: 5000});
    await relationCheckbox.click();
    console.log("Suggested relation checkbox clicked.");

    const addSelectedRelationsButton = aiPanel.locator("button[data-tutorial-id='add-selected-relations-button']");
    await expect(addSelectedRelationsButton).toBeEnabled({timeout: 5000});
    await addSelectedRelationsButton.click();
    console.log("'Add Selected Relations' button clicked.");

    // 5. Verificare che un nuovo arco sia stato aggiunto alla canvas
    const edgesOnCanvas = page.locator('.react-flow__edge');
    await expect(edgesOnCanvas).toHaveCount(1, { timeout: 15000 });
    console.log("Edge count verified (1) after adding relation.");

    // (Opzionale) Verifica più dettagliata dell'arco (sorgente, destinazione, etichetta)
    // Questo è più complesso e potrebbe richiedere di accedere ai dati interni di React Flow
    // o di avere etichette degli archi visibili e selezionabili in modo affidabile.
    // const addedEdge = edgesOnCanvas.first();
    // const edgeLabelText = await relationItemLocator.locator('span').filter({hasText: EXPECTED_RELATION_LABEL_PARTIAL_REGEX}).textContent();
    // if (edgeLabelText) {
    //   await expect(addedEdge.locator(`text=${edgeLabelText}`)).toBeVisible();
    //   console.log(`Edge with label containing "${edgeLabelText}" verified on canvas.`);
    // }
    console.log("Suggest Relations test completed.");
  });
});
