import { test, expect } from '@playwright/test';

test.describe('Extract Concepts AI Tool Flow', () => {
  const NODE_TEXT_TO_EXTRACT = 'Playwright is a powerful end-to-end testing framework developed by Microsoft. It enables reliable testing across Chromium, Firefox, and WebKit.';
  const EXPECTED_CONCEPT_PARTIAL = 'Playwright'; // Parte del testo di un concetto che ci aspettiamo venga estratto
  // const EXPECTED_CONCEPT_FULL = 'Playwright'; // Concetto esatto se si vuole essere più precisi

  test.beforeEach(async ({ page }) => {
    // Il login è gestito da global.setup.ts e storageState.
    // Assicuriamoci di essere sulla dashboard e poi creiamo una nuova mappa.
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 10000 });
    console.log(`Starting Extract Concepts test from page: ${page.url()}`);

    // Naviga per creare una nuova mappa per un ambiente di test pulito
    await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
    await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
    await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();

    const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    await expect(editorToolbarAddNodeButton).toBeVisible({ timeout: 25000 });
    console.log("Editor loaded for new map for Extract Concepts test.");
  });

  test('should extract concepts from a node and display them in the AI panel', async ({ page }) => {
    const addNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    const nodesOnCanvas = page.locator('.react-flow__node');
    const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const extractConceptsMenuItem = page.locator("button[data-tutorial-id='ai-tool-extract-concepts']");
    const extractConceptsModal = page.locator("[data-tutorial-id='extract-concepts-modal-content']");
    const modalTextarea = extractConceptsModal.locator('textarea[name="textToExtract"]'); // Assumendo name="textToExtract" dal form
    const modalSubmitButton = extractConceptsModal.locator("button[data-tutorial-id='extract-concepts-submit-button']");
    const aiPanelToggleButton = page.locator("button[data-tutorial-id='editor-toggle-ai-panel']");
    const aiPanel = page.locator("div[data-tutorial-id='ai-suggestion-panel']");
    const extractedConceptsSection = aiPanel.locator("div[data-tutorial-id='extracted-concepts-section']");

    // 1. Aggiungere un nodo e impostare il testo
    await addNodeButton.click();
    console.log("Add Node button clicked.");
    await expect(nodesOnCanvas).toHaveCount(1, { timeout: 10000 });
    const firstNode = nodesOnCanvas.first();
    await firstNode.click();
    console.log("First node added and selected.");

    if (!await nodeTextInput.isVisible()) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    await nodeTextInput.fill(NODE_TEXT_TO_EXTRACT);
    await expect(nodeTextInput).toHaveValue(NODE_TEXT_TO_EXTRACT);
    console.log("Node text input filled.");
    await addNodeButton.focus(); // Deseleziona input

    // 2. Attivare "Extract Concepts"
    await aiToolsMenuButton.click();
    console.log("AI Tools menu clicked.");
    await extractConceptsMenuItem.click();
    console.log("'Extract Concepts' tool selected.");

    // 3. Interagire con il Modale "Extract Concepts"
    await expect(extractConceptsModal).toBeVisible({ timeout: 10000 });
    console.log("Extract Concepts modal visible.");

    // Il testo dovrebbe essere precompilato dal nodo selezionato.
    // La logica di precompilazione è gestita da useEffect nel modale, potrebbe richiedere un breve istante.
    await expect(modalTextarea).toHaveValue(NODE_TEXT_TO_EXTRACT, { timeout: 5000 });
    console.log("Modal textarea pre-filled with node text.");

    await modalSubmitButton.click();
    console.log("Modal submit button clicked.");
    await expect(extractConceptsModal).not.toBeVisible({ timeout: 15000 }); // Attendi che il modale si chiuda e l'AI elabori
    console.log("Extract Concepts modal closed.");

    // 4. Verificare che i concetti appaiano nell'AI Suggestion Panel
    if (!await aiPanel.isVisible()) {
        await aiPanelToggleButton.click();
        await expect(aiPanel).toBeVisible({ timeout: 5000 });
    }
    console.log("AI Suggestion Panel is visible.");

    await expect(extractedConceptsSection).toBeVisible({ timeout: 20000 }); // Dare più tempo all'AI per popolare
    console.log("Extracted concepts section visible.");

    const expectedConceptLocator = extractedConceptsSection.locator(`text=/${EXPECTED_CONCEPT_PARTIAL}/i`).first();
    await expect(expectedConceptLocator).toBeVisible({ timeout: 15000 });
    console.log(`Expected concept containing "${EXPECTED_CONCEPT_PARTIAL}" is visible in AI panel.`);

    // 5. (Opzionale) Aggiungere un concetto alla mappa e verificare
    const firstConceptItem = extractedConceptsSection.locator("div[data-tutorial-id^='extracted-concept-item-']").first();
    // Il checkbox è figlio del div dell'item e potrebbe non essere direttamente targettabile con l'ID dell'item.
    // Seleziona il checkbox all'interno del primo item.
    const firstConceptCheckbox = firstConceptItem.locator('button[role="checkbox"]'); // ShadCN checkbox è un button con role checkbox

    // Verifica che il checkbox sia visibile prima di cliccarlo
    await expect(firstConceptCheckbox).toBeVisible({timeout: 5000});
    await firstConceptCheckbox.click(); // Usa click() per i checkbox ShadCN che sono button
    console.log("First extracted concept checkbox checked/clicked.");

    const addSelectedConceptsButton = aiPanel.locator("button[data-tutorial-id='add-selected-concepts-button']");
    await expect(addSelectedConceptsButton).toBeEnabled({timeout: 5000}); // Assicurati che sia abilitato dopo la selezione
    await addSelectedConceptsButton.click();
    console.log("'Add Selected Concepts' button clicked.");

    // Ora dovrebbero esserci due nodi sulla mappa (quello originale + quello aggiunto)
    await expect(nodesOnCanvas).toHaveCount(2, { timeout: 15000 });
    console.log("Node count verified (2) after adding concept.");

    // Verifica che il nodo aggiunto con il testo del concetto esista
    // Estrai il testo del concetto dal localizzatore usato per trovarlo nel pannello
    const addedNodeTextContent = await expectedConceptLocator.textContent();
    expect(addedNodeTextContent).toBeTruthy(); // Assicurati che ci sia testo
    // Rimuovi eventuali testi extra o normalizza lo spazio se necessario
    const cleanedAddedNodeText = addedNodeTextContent!.trim();

    // Cerca un nodo che contenga questo testo. Potrebbe essere necessario un selettore più specifico
    // se il testo del nodo sulla canvas è formattato diversamente.
    await expect(page.locator(`.react-flow__node:has-text("${cleanedAddedNodeText}")`)).toBeVisible({timeout: 10000});
    console.log(`Node with text "${cleanedAddedNodeText}" verified on canvas.`);
  });
});
