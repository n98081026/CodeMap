import { test, expect } from '@playwright/test';

import { EditorPage } from './pom/EditorPage';
import {
  ensureDashboard,
  navigateToCreateNewMap,
  addNodeToMap,
} from './utils/map-setup.utils';

test.describe('Expand Concept with Staging Area Flow', () => {
  const INITIAL_NODE_TEXT = 'Artificial Intelligence';
  const EXPAND_PROMPT_FOCUS_COMMIT = 'Applications in education';
  const EXPAND_PROMPT_FOCUS_DISCARD = 'Ethical considerations';
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);

    // Add an initial node using the utility function
    await addNodeToMap(page, INITIAL_NODE_TEXT, 0); // addNodeToMap uses page.locator, needs POM update later if desired
    const nodes = await editorPage.getNodesOnCanvas();
    await expect(nodes).toHaveCount(1, { timeout: 10000 });
    console.log(`POM: Initial node "${INITIAL_NODE_TEXT}" added.`);
  });

  test('should expand a node, show suggestions in staging, allow commit, and verify changes', async ({
    page,
  }) => {
    // 1. Select the initial node (already done by addNodeToMap, but re-click for safety)
    const firstNode = await editorPage.getFirstNode();
    await firstNode.click();
    console.log(`POM: Node "${INITIAL_NODE_TEXT}" selected.`);

    // 2. Activate "Expand Concept" using POM
    await editorPage.selectAITool('Expand Concept');

    // 3. Interact with the "Expand Concept" Modal using POM
    await editorPage.submitExpandConceptModal(
      INITIAL_NODE_TEXT,
      EXPAND_PROMPT_FOCUS_COMMIT
    );

    // 4. Verify the appearance of the Staging Toolbar and staged nodes/edges using POM
    await expect(editorPage.stagingToolbar).toBeVisible({ timeout: 20000 });
    console.log('POM: AI Staging Toolbar is visible.');

    const stagedNodes = page.locator(
      ".react-flow__node[data-type='ai-expanded']"
    ); // Keep specific locator for 'ai-expanded' type
    await expect(stagedNodes.first()).toBeVisible({ timeout: 20000 });

    const initialNodeCountOnCanvas = 1;
    const stagedNodesCount = await stagedNodes.count();
    expect(stagedNodesCount).toBeGreaterThan(0);
    console.log(
      `POM: ${stagedNodesCount} staged 'ai-expanded' nodes appeared on canvas.`
    );

    const allNodes = await editorPage.getNodesOnCanvas();
    await expect(allNodes).toHaveCount(
      initialNodeCountOnCanvas + stagedNodesCount,
      { timeout: 5000 }
    );

    // 5. Click "Commit to Map" / "Accept All" using POM
    await editorPage.commitStagedItems();

    // 6. Post-Commit Verifications using POM
    await expect(editorPage.stagingToolbar).not.toBeVisible({ timeout: 10000 });
    console.log('POM: AI Staging Toolbar is hidden after commit.');

    const nodesAfterCommit = await editorPage.getNodesOnCanvas();
    await expect(nodesAfterCommit).toHaveCount(
      initialNodeCountOnCanvas + stagedNodesCount,
      { timeout: 5000 }
    );
    console.log(
      `POM: Total node count is still ${initialNodeCountOnCanvas + stagedNodesCount} after commit.`
    );

    await expect(
      page.locator(".react-flow__node[data-type='ai-expanded']").count()
    ).toBe(stagedNodesCount);
    console.log(
      'POM: Expand Concept with Staging Area (Commit flow) test completed.'
    );
  });

  test('should expand a node, show suggestions in staging, and allow discard', async ({
    page,
  }) => {
    // 1. Select the initial node
    const firstNode = await editorPage.getFirstNode();
    await firstNode.click();

    // Activate "Expand Concept"
    await editorPage.selectAITool('Expand Concept');

    // Interact with modal
    await editorPage.submitExpandConceptModal(
      INITIAL_NODE_TEXT,
      EXPAND_PROMPT_FOCUS_DISCARD
    );

    // Verify staging toolbar
    await expect(editorPage.stagingToolbar).toBeVisible({ timeout: 20000 });
    console.log('POM: Staging toolbar visible for discard flow.');

    // Verify staged nodes are present
    const stagedNodesLocator = page.locator(
      ".react-flow__node[data-type='ai-expanded']"
    );
    const stagedNodesCountBeforeDiscard = await stagedNodesLocator.count();
    expect(stagedNodesCountBeforeDiscard).toBeGreaterThan(0);
    console.log(
      `POM: ${stagedNodesCountBeforeDiscard} staged nodes present before discard.`
    );

    // 2. Click "Discard All" using POM
    await editorPage.discardStagedItems();

    // 3. Post-Discard Verifications
    await expect(editorPage.stagingToolbar).not.toBeVisible({ timeout: 10000 });
    console.log('POM: AI Staging Toolbar is hidden after discard.');

    await expect(stagedNodesLocator).toHaveCount(0, { timeout: 5000 });

    const initialNodeCountOnCanvas = 1;
    const nodesAfterDiscard = await editorPage.getNodesOnCanvas();
    await expect(nodesAfterDiscard).toHaveCount(initialNodeCountOnCanvas, {
      timeout: 5000,
    });
    console.log(
      `POM: Total node count is ${initialNodeCountOnCanvas} after discard, as expected.`
    );

    const originalNode = await editorPage.getNodesOnCanvas(); // Should be just the one
    // Check if the original node (identifiable by its text) is still visible
    const originalNodeWithText = page.locator(
      `.react-flow__node:has-text("${INITIAL_NODE_TEXT}")`
    );
    await expect(originalNodeWithText).toBeVisible();
    console.log('POM: Original node still present after discard.');
    console.log(
      'POM: Expand Concept with Staging Area (Discard flow) test completed.'
    );
  });
});
