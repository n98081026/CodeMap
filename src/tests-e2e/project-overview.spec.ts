import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap, addNodeToMap } from './utils/map-setup.utils';
import { EditorPage } from './pom/EditorPage';

test.describe('Project Overview Mode Flow', () => {
  const NODE_TEXTS = ['Main Application', 'User Authentication', 'Database Module', 'API Endpoints', 'Frontend UI'];
  let editorPage: EditorPage;

  test.beforeEach(async ({ page }) => {
    editorPage = new EditorPage(page);
    await ensureDashboard(page);
    await navigateToCreateNewMap(page);
    console.log("POM: Editor loaded for new map for Project Overview test.");

    for (let i = 0; i < NODE_TEXTS.length; i++) {
      await addNodeToMap(page, NODE_TEXTS[i], i); // addNodeToMap uses page.locator directly
    }

    const nodes = await editorPage.getNodesOnCanvas();
    await expect(nodes).toHaveCount(NODE_TEXTS.length, { timeout: 15000 });
    console.log(`POM: ${NODE_TEXTS.length} initial nodes added.`);

    await editorPage.clickSaveMap();
    const successToast = page.locator('li[data-sonner-toast][data-type="success"] div[data-description]');
    await expect(successToast).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(/.*\/concept-maps\/editor\/[a-zA-Z0-9-_]+(?<!\/new)$/, { timeout: 15000 });
    console.log("POM: Initial map saved with nodes.");
  });

  test('should activate, display, interact with, and deactivate project overview mode', async ({ page }) => {
    const overviewContainer = page.locator("div[data-tutorial-id='project-overview-display-container']"); // Keep this specific locator

    // 1. Activate Project Overview Mode using POM
    await expect(editorPage.toggleOverviewButton).toBeVisible();
    await expect(editorPage.toggleOverviewButton.locator('svg.lucide-eye')).toBeVisible();
    await editorPage.toggleOverviewMode();

    // 2. Wait and verify the overview appears
    await expect(editorPage.toggleOverviewButton.locator('svg.lucide-eye-off')).toBeVisible({timeout: 10000});
    await expect(overviewContainer).toBeVisible({ timeout: 25000 });
    console.log("POM: Project Overview Display container is visible.");

    await expect(overviewContainer.locator('h2:has-text("Key Modules / Components")')).toBeVisible();
    const firstModuleCard = overviewContainer.locator(".grid > div:first-child");
    await expect(firstModuleCard).toBeVisible({timeout: 10000});
    const moduleCardCount = await overviewContainer.locator(".grid > div").count();
    expect(moduleCardCount).toBeGreaterThan(0);
    console.log(`POM: ${moduleCardCount} module cards are visible in the overview.`);

    // 3. Interact with a module card
    console.log("POM: Attempting to click the first module card.");
    await firstModuleCard.click();

    await expect(overviewContainer).not.toBeVisible({ timeout: 10000 });
    console.log("POM: Project Overview Display container is hidden after module click.");
    await expect(editorPage.reactFlowPane).toBeVisible();
    console.log("POM: React Flow pane is visible after exiting overview via module click.");
    await expect(editorPage.toggleOverviewButton.locator('svg.lucide-eye')).toBeVisible();
    console.log("POM: Toggle overview button icon reverted to 'Eye'.");

    // 4. Reactivate overview to test deactivation via button
    await editorPage.toggleOverviewMode();
    await expect(editorPage.toggleOverviewButton.locator('svg.lucide-eye-off')).toBeVisible({timeout: 10000});
    await expect(overviewContainer).toBeVisible({ timeout: 20000 });
    console.log("POM: Project Overview re-activated.");

    // 5. Deactivate Project Overview Mode using POM
    await editorPage.toggleOverviewMode();

    await expect(overviewContainer).not.toBeVisible({ timeout: 10000 });
    console.log("POM: Project Overview Display container is hidden after deactivation.");
    await expect(editorPage.reactFlowPane).toBeVisible();
    console.log("POM: React Flow pane is visible after deactivation.");
    await expect(editorPage.toggleOverviewButton.locator('svg.lucide-eye')).toBeVisible();
    console.log("POM: Toggle overview button icon reverted to 'Eye' after deactivation.");

    console.log("POM: Project Overview Mode test completed.");
  });
});
