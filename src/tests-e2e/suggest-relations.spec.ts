import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap, addNodeToMap } from './utils/map-setup.utils';

test.describe('Suggest Relations AI Tool Flow', () => {
  const NODE_TEXT_1 = 'Frontend Frameworks';
  const NODE_TEXT_2 = 'React';
  const EXPECTED_RELATION_LABEL_PARTIAL_REGEX = /is a|includes|example of|type of|uses/i;

  test.beforeEach(async ({ page }) => {
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Aggiungi i due nodi necessari per il test utilizzando la funzione helper
    await addNodeToMap(page, NODE_TEXT_1, 0);
    await addNodeToMap(page, NODE_TEXT_2, 1);

    await expect(page.locator('.react-flow__node')).toHaveCount(2, { timeout: 10000 });
    console.log("Two nodes added for the Suggest Relations test.");
  });

  test('should suggest relations and allow adding them to the map', async ({ page }) => {
    // --- Selettori ---
    const aiToolsMenuButton = page.locator("button[aria-label='AI Tools']");
    const suggestRelationsMenuItem = page.locator("button[data-tutorial-id='ai-tool-suggest-relations']");
    const suggestRelationsModal = page.locator("[data-tutorial-id='suggest-relations-modal']");
    const modalSubmitButton = suggestRelationsModal.locator("button[data-tutorial-id='suggest-relations-submit']");
    const aiPanelToggleButton = page.locator("button[data-tutorial-id='editor-toggle-ai-panel']");
    const aiPanel = page.locator("div[data-tutorial-id='ai-suggestion-panel']");
    const suggestedRelationsSection = aiPanel.locator("div[data-tutorial-id='suggested-relations-section']");

    // 1. Attivare "Suggest Relations"
    await aiToolsMenuButton.click();
    console.log("AI Tools menu clicked.");
    await suggestRelationsMenuItem.click();
    console.log("'Suggest Relations' tool selected.");

    // 2. Interagire con il Modale "Suggest Relations"
    await expect(suggestRelationsModal).toBeVisible({ timeout: 10000 });
    console.log("Suggest Relations modal visible.");
    await modalSubmitButton.click(); // Usa i default, non inserisce prompt custom
    console.log("Modal submit button clicked for Suggest Relations.");
    await expect(suggestRelationsModal).not.toBeVisible({ timeout: 20000 });
    console.log("Suggest Relations modal closed.");

    // 3. Verificare che le relazioni suggerite appaiano nell'AI Suggestion Panel
    if (!await aiPanel.isVisible({timeout: 2000})) {
        await aiPanelToggleButton.click();
        await expect(aiPanel).toBeVisible({ timeout: 5000 });
    }
    console.log("AI Suggestion Panel is visible.");

    await expect(suggestedRelationsSection).toBeVisible({ timeout: 25000 });
    console.log("Suggested relations section visible.");

    // Verificare la presenza di una relazione attesa tra i nodi creati
    const relationItemLocator = suggestedRelationsSection.locator(
      `div[data-tutorial-id^='suggested-relation-item-']:has-text("${NODE_TEXT_1}"):has-text("${NODE_TEXT_2}")`
    ).first();

    await expect(relationItemLocator).toBeVisible({ timeout: 20000 });
    console.log(`Expected relation item containing "${NODE_TEXT_1}" and "${NODE_TEXT_2}" is visible.`);

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

    console.log("Suggest Relations test completed.");
  });
});
