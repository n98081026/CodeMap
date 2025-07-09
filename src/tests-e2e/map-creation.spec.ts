import { test, expect } from '@playwright/test';

import { EditorPage } from './pom/EditorPage';
import {
  ensureDashboard,
  navigateToCreateNewMap,
} from './utils/map-setup.utils';

test.describe('Map Creation and Editing Flow', () => {
  // Login is handled globally via global.setup.ts and storageState.
  // Tests in this describe will start with the user already authenticated.

  test('should allow a user to create a new map, add and edit a node, and save', async ({
    page,
  }) => {
    const editorPage = new EditorPage(page);

    // Ensure on dashboard and navigate to create a new map
    await ensureDashboard(page);
    await navigateToCreateNewMap(page); // This function also waits for the editor to load

    console.log('POM: Starting map creation test from editor page.');

    // Click "Add Node" using POM
    await editorPage.clickAddNode();

    // Verify that one node is present on the canvas using POM
    const nodesOnCanvas = await editorPage.getNodesOnCanvas();
    await expect(nodesOnCanvas).toHaveCount(1, { timeout: 10000 });
    console.log('POM: Node count verified (1).');

    // Select the first (and only) node to edit it using POM
    const firstNode = await editorPage.getFirstNode();
    await firstNode.click();
    console.log('POM: First node clicked (selected).');

    // Ensure properties panel is visible and set node text using POM
    const newNodeText = 'Test Node E2E - Automated POM';
    await editorPage.setNodeText(newNodeText); // This POM method handles visibility and filling

    // Click "Save Map" using POM
    await editorPage.clickSaveMap();

    // Verify the success toast.
    // Note: Toast is a global element, might not strictly belong to EditorPage POM,
    // but for now, we'll keep its locator here. Could be moved to a more global POM or utility.
    const successToast = page.locator(
      'li[data-sonner-toast][data-type="success"] div[data-description]'
    );
    await expect(successToast).toBeVisible({ timeout: 15000 });
    await expect(successToast).toContainText(
      /Map saved successfully|Map content saved|Map updated/i
    );
    console.log('POM: Success toast verified.');

    // Verify that the URL changes from /new (or previous) to /editor/[mapId]
    await expect(page).toHaveURL(
      /.*\/concept-maps\/editor\/[a-zA-Z0-9-_]+(?<!\/new)$/,
      { timeout: 15000 }
    );
    console.log(`POM: Map saved, URL changed to: ${page.url()}`);

    // Future Considerations:
    // - Add tests for error cases (e.g., save failure).
    // - Test actual data persistence by reloading the map or verifying via API if possible.
  });
});
