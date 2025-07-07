import { Page, expect } from '@playwright/test';

/**
 * Assicura che la pagina sia sulla dashboard dopo il login globale.
 * @param page L'istanza della Page di Playwright.
 */
export async function ensureDashboard(page: Page) {
  await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 15000 });
  console.log(`Verified on dashboard. Current page: ${page.url()}`);
}

/**
 * Naviga dalla dashboard (o pagina corrente post-login) per creare una nuova mappa
 * e attende il caricamento dell'editor.
 * @param page L'istanza della Page di Playwright.
 */
export async function navigateToCreateNewMap(page: Page) {
  // Assumiamo che l'utente sia su una pagina post-login (es. dashboard)
  await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
  await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
  console.log(`Navigated to student concept maps page. Current URL: ${page.url()}`);

  await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();
  console.log(`"Create New Map" button clicked. Navigating to editor...`);

  const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
  await expect(editorToolbarAddNodeButton).toBeVisible({ timeout: 25000 }); // Timeout per caricamento editor
  console.log("Editor loaded successfully.");
}

/**
 * Aggiunge un nodo alla mappa e ne imposta il testo.
 * Presuppone che l'editor della mappa sia già caricato.
 * @param page L'istanza della Page di Playwright.
 * @param nodeText Il testo da inserire nel nodo.
 * @param nodeIndex L'indice del nodo da selezionare e modificare (0-based, per `nth()`). Default 0.
 * @returns Il Locator del nodo creato e modificato.
 */
export async function addNodeToMap(page: Page, nodeText: string, nodeIndex: number = 0) {
  const editorToolbarAddNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
  const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');
  const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");

  await editorToolbarAddNodeButton.click();
  console.log(`Add Node button clicked to create node at index ${nodeIndex}.`);

  // Attendere che il numero di nodi rifletta l'aggiunta, se necessario,
  // specialmente se nodeIndex > 0 e si basa sul conteggio precedente.
  // Per nodeIndex = 0, il primo nodo è appena stato aggiunto.
  await expect(page.locator('.react-flow__node').nth(nodeIndex)).toBeVisible({timeout: 5000});

  const node = page.locator('.react-flow__node').nth(nodeIndex);
  await node.click(); // Seleziona il nodo
  console.log(`Node at index ${nodeIndex} clicked (selected).`);

  // Apri il pannello proprietà se non è visibile
  if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
      await propertiesToggleButton.click();
      await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
      console.log("Properties panel toggled for node text input.");
  }

  await nodeTextInput.fill(nodeText);
  await expect(nodeTextInput).toHaveValue(nodeText);
  console.log(`Node at index ${nodeIndex} text set to: "${nodeText}"`);

  // Deseleziona l'input per assicurare l'aggiornamento del valore (es. spostando il focus)
  await editorToolbarAddNodeButton.focus();
  console.log(`Focus shifted from node text input for node at index ${nodeIndex}.`);

  return node; // Restituisce il localizzatore del nodo per ulteriori interazioni se necessario
}
