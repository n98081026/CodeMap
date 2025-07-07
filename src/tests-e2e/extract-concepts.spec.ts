import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap, addNodeToMap } from './utils/map-setup.utils';

test.describe('Extract Concepts AI Tool Flow', () => {
  const NODE_TEXT_TO_EXTRACT = 'Playwright is a powerful end-to-end testing framework developed by Microsoft. It enables reliable testing across Chromium, Firefox, and WebKit.';
  const EXPECTED_CONCEPT_PARTIAL = 'Playwright';

  test.beforeEach(async ({ page }) => {
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Aggiungere il nodo specifico per questo test nel beforeEach
    await addNodeToMap(page, NODE_TEXT_TO_EXTRACT, 0);
    await expect(page.locator('.react-flow__node')).toHaveCount(1, { timeout: 10000 });
    console.log(`Node with text "${NODE_TEXT_TO_EXTRACT}" added for Extract Concepts test.`);
  });

  test('should extract concepts from a node and display them in the AI panel', async ({ page }) => {
    // Selettori specifici per questo test
    const firstNode = page.locator('.react-flow__node').first(); // Il nodo creato nel beforeEach
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const extractConceptsMenuItem = page.locator("button[data-tutorial-id='ai-tool-extract-concepts']");
    const extractConceptsModal = page.locator("[data-tutorial-id='extract-concepts-modal-content']");
    const modalTextarea = extractConceptsModal.locator('textarea[name="textToExtract"]');
    const modalSubmitButton = extractConceptsModal.locator("button[data-tutorial-id='extract-concepts-submit-button']");
    const aiPanelToggleButton = page.locator("button[data-tutorial-id='editor-toggle-ai-panel']");
    const aiPanel = page.locator("div[data-tutorial-id='ai-suggestion-panel']");
    const extractedConceptsSection = aiPanel.locator("div[data-tutorial-id='extracted-concepts-section']");
    const nodesOnCanvas = page.locator('.react-flow__node'); // Per verificare l'aggiunta del nuovo nodo

    // 1. Il nodo è già stato creato e selezionato implicitamente da addNodeToMap (o riselezionarlo se necessario)
    // Assicuriamoci che sia selezionato per l'estrazione. addNodeToMap lo lascia selezionato.
    // Se non fosse così, o se l'utente cliccasse altrove:
    await firstNode.click(); // Clicca per assicurare la selezione per l'AI tool
    console.log("Initial node re-selected for extraction.");

    // 2. Attivare "Extract Concepts"
    await aiToolsMenuButton.click();
    console.log("AI Tools menu clicked.");
    await extractConceptsMenuItem.click();
    console.log("'Extract Concepts' tool selected.");

    // 3. Interagire con il Modale "Extract Concepts"
    await expect(extractConceptsModal).toBeVisible({ timeout: 10000 });
    console.log("Extract Concepts modal visible.");

    await expect(modalTextarea).toHaveValue(NODE_TEXT_TO_EXTRACT, { timeout: 5000 });
    console.log("Modal textarea pre-filled with node text.");

    await modalSubmitButton.click();
    console.log("Modal submit button clicked.");
    await expect(extractConceptsModal).not.toBeVisible({ timeout: 15000 });
    console.log("Extract Concepts modal closed.");

    // 4. Verificare che i concetti appaiano nell'AI Suggestion Panel
    if (!await aiPanel.isVisible({timeout: 2000})) {
        await aiPanelToggleButton.click();
        await expect(aiPanel).toBeVisible({ timeout: 5000 });
    }
    console.log("AI Suggestion Panel is visible.");

    await expect(extractedConceptsSection).toBeVisible({ timeout: 20000 });
    console.log("Extracted concepts section visible.");

    const expectedConceptLocator = extractedConceptsSection.locator(`text=/${EXPECTED_CONCEPT_PARTIAL}/i`).first();
    await expect(expectedConceptLocator).toBeVisible({ timeout: 15000 });
    console.log(`Expected concept containing "${EXPECTED_CONCEPT_PARTIAL}" is visible in AI panel.`);

    // 5. (Opzionale ma testato) Aggiungere un concetto alla mappa e verificare
    const firstConceptItem = extractedConceptsSection.locator("div[data-tutorial-id^='extracted-concept-item-']").filter({ hasText: EXPECTED_CONCEPT_PARTIAL }).first();
    const firstConceptCheckbox = firstConceptItem.locator('button[role="checkbox"]');

    await expect(firstConceptCheckbox).toBeVisible({timeout: 5000});
    await firstConceptCheckbox.click();
    console.log("First extracted concept checkbox (matching partial text) clicked.");

    const addSelectedConceptsButton = aiPanel.locator("button[data-tutorial-id='add-selected-concepts-button']");
    await expect(addSelectedConceptsButton).toBeEnabled({timeout: 5000});
    await addSelectedConceptsButton.click();
    console.log("'Add Selected Concepts' button clicked.");

    // Ora dovrebbero esserci due nodi sulla mappa (quello originale + quello aggiunto)
    await expect(nodesOnCanvas).toHaveCount(2, { timeout: 15000 });
    console.log("Node count verified (2) after adding concept.");

    const addedNodeTextContent = await expectedConceptLocator.textContent(); // Questo è il testo dall'AI Panel
    expect(addedNodeTextContent).toBeTruthy();
    const cleanedAddedNodeText = addedNodeTextContent!.trim();

    await expect(page.locator(`.react-flow__node:has-text("${cleanedAddedNodeText}")`)).toBeVisible({timeout: 10000});
    console.log(`Node with text "${cleanedAddedNodeText}" verified on canvas.`);
  });
});
