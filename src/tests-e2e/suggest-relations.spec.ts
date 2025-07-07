import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap, addNodeToMap } from './utils/map-setup.utils';
import { EditorPage } from './pom/EditorPage';

test.describe('Suggest Relations AI Tool Flow', () => {
  const NODE_TEXT_1 = 'Frontend Frameworks';
  const NODE_TEXT_2 = 'React';
  const EXPECTED_RELATION_LABEL_PARTIAL_REGEX = /is a|includes|example of|type of|uses/i;
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Add the two nodes needed for the test using the helper function
    await addNodeToMap(page, NODE_TEXT_1, 0); // Uses page.locator directly, consider POM update later
    await addNodeToMap(page, NODE_TEXT_2, 1); // Uses page.locator directly

    const nodesOnCanvas = await editorPage.getNodesOnCanvas();
    await expect(nodesOnCanvas).toHaveCount(2, { timeout: 10000 });
    console.log("POM: Two nodes added for the Suggest Relations test.");
  });

  test('should suggest relations and allow adding them to the map', async ({ page }) => {
    // 1. Activate "Suggest Relations" using POM
    await editorPage.selectAITool('Suggest Relations');

    // 2. Interact with the "Suggest Relations" Modal using POM
    // (using default prompt, so no custom prompt text passed to submitSuggestRelationsModal)
    await editorPage.submitSuggestRelationsModal();

    // 3. Verify suggested relations appear in the AI Suggestion Panel using POM
    await editorPage.ensureAiPanelVisible();

    const relationItem = await editorPage.getSuggestedRelationItemByParts(NODE_TEXT_1, NODE_TEXT_2);
    await expect(relationItem).toBeVisible({ timeout: 20000 });
    console.log(`POM: Expected relation item containing "${NODE_TEXT_1}" and "${NODE_TEXT_2}" is visible.`);

    await expect(relationItem).toHaveText(EXPECTED_RELATION_LABEL_PARTIAL_REGEX);
    console.log("POM: Expected relation label partial match found.");

    // 4. Select the suggested relation and add it to the map using POM
    const relationCheckbox = relationItem.locator('button[role="checkbox"]');
    await expect(relationCheckbox).toBeVisible({timeout: 5000});
    await relationCheckbox.click();
    console.log("POM: Suggested relation checkbox clicked.");

    await editorPage.clickAddSelectedRelations();

    // 5. Verify that a new edge has been added to the canvas
    const edgesOnCanvas = page.locator('.react-flow__edge'); // EditorPage could have a getEdgesOnCanvas()
    await expect(edgesOnCanvas).toHaveCount(1, { timeout: 15000 });
    console.log("POM: Edge count verified (1) after adding relation.");

    console.log("POM: Suggest Relations test completed.");
  });
});
