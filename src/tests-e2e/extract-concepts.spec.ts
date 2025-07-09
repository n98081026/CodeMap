import { test, expect } from '@playwright/test';

import { EditorPage } from './pom/EditorPage';
import {
  ensureDashboard,
  navigateToCreateNewMap,
  addNodeToMap,
} from './utils/map-setup.utils';

test.describe('Extract Concepts AI Tool Flow', () => {
  const NODE_TEXT_TO_EXTRACT =
    'Playwright is a powerful end-to-end testing framework developed by Microsoft. It enables reliable testing across Chromium, Firefox, and WebKit.';
  const EXPECTED_CONCEPT_PARTIAL = 'Playwright';
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Add the specific node for this test in beforeEach
    await addNodeToMap(page, NODE_TEXT_TO_EXTRACT, 0); // addNodeToMap uses page.locator directly, consider POM update later
    const nodesOnCanvas = await editorPage.getNodesOnCanvas();
    await expect(nodesOnCanvas).toHaveCount(1, { timeout: 10000 });
    console.log(
      `POM: Node with text "${NODE_TEXT_TO_EXTRACT}" added for Extract Concepts test.`
    );
  });

  test('should extract concepts from a node and display them in the AI panel, then add to map', async ({
    page,
  }) => {
    // 1. The node is already created by beforeEach.
    // Ensure it's selected for extraction (addNodeToMap should leave it selected, but clicking again is safer).
    const firstNode = await editorPage.getFirstNode();
    await firstNode.click();
    console.log('POM: Initial node re-selected for extraction.');

    // 2. Activate "Extract Concepts" using POM
    await editorPage.selectAITool('Extract Concepts');

    // 3. Interact with the "Extract Concepts" Modal using POM
    await editorPage.submitExtractConceptsModal(NODE_TEXT_TO_EXTRACT);

    // 4. Verify concepts appear in the AI Suggestion Panel using POM
    await editorPage.ensureAiPanelVisible(); // Ensures panel is open

    const expectedConceptItem = await editorPage.getExtractedConceptItemByText(
      EXPECTED_CONCEPT_PARTIAL
    );
    await expect(expectedConceptItem).toBeVisible({ timeout: 15000 });
    console.log(
      `POM: Expected concept containing "${EXPECTED_CONCEPT_PARTIAL}" is visible in AI panel.`
    );

    // 5. Add the concept to the map and verify
    // The getExtractedConceptItemByText returns the item, now find checkbox within it
    const conceptCheckbox = expectedConceptItem.locator(
      'button[role="checkbox"]'
    );
    await expect(conceptCheckbox).toBeVisible({ timeout: 5000 });
    await conceptCheckbox.click();
    console.log(
      'POM: Extracted concept checkbox (matching partial text) clicked.'
    );

    await editorPage.clickAddSelectedConcepts();

    // Now there should be two nodes on the map
    const nodesOnCanvasAfterAdd = await editorPage.getNodesOnCanvas();
    await expect(nodesOnCanvasAfterAdd).toHaveCount(2, { timeout: 15000 });
    console.log('POM: Node count verified (2) after adding concept.');

    const addedNodeTextContent = await expectedConceptItem
      .locator('span')
      .first()
      .textContent(); // Get text from the concept item itself
    expect(addedNodeTextContent).toBeTruthy();
    const cleanedAddedNodeText = addedNodeTextContent!.trim();

    // Verify the newly added node by its text
    const addedNodeOnCanvas = page.locator(
      `.react-flow__node:has-text("${cleanedAddedNodeText}")`
    );
    await expect(addedNodeOnCanvas).toBeVisible({ timeout: 10000 });
    console.log(
      `POM: Node with text "${cleanedAddedNodeText}" verified on canvas.`
    );
  });
});
