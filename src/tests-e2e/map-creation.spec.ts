import { test, expect } from '@playwright/test';
import { ensureDashboard, navigateToCreateNewMap } from './utils/map-setup.utils';

test.describe('Map Creation and Editing Flow', () => {
  // Il login è gestito globalmente tramite global.setup.ts e storageState.
  // I test in questo describe inizieranno con l'utente già autenticato.

  test('should allow a user to create a new map, add and edit a node, and save', async ({ page }) => {
    // Assicurarsi di essere sulla dashboard e navigare per creare una nuova mappa
    await ensureDashboard(page);
    await navigateToCreateNewMap(page); // Questa funzione attende anche il caricamento dell'editor

    console.log("Starting map creation test from editor page.");

    // Selettori per elementi dell'editor
    const addNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    const nodesOnCanvas = page.locator('.react-flow__node');
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");
    const saveMapButton = page.locator("button[data-tutorial-id='editor-save-map']");
    const propertiesToggleButton = page.locator('#tutorial-target-toggle-properties-button');


    // Cliccare "Aggiungi Nodo"
    await addNodeButton.click();
    console.log("Add Node button clicked.");

    // Verificare che un nodo sia presente sulla canvas.
    await expect(nodesOnCanvas).toHaveCount(1, { timeout: 10000 });
    console.log("Node count verified (1).");

    // Selezionare il primo (e unico) nodo per modificarlo
    const firstNode = nodesOnCanvas.first();
    await firstNode.click();
    console.log("First node clicked (selected).");

    // Attendere che il pannello delle proprietà sia visibile e l'input del testo del nodo sia pronto
    // Aprire il pannello proprietà se non è già visibile
    if (!await nodeTextInput.isVisible({ timeout: 2000 })) {
        await propertiesToggleButton.click();
        await expect(nodeTextInput).toBeVisible({ timeout: 5000 });
    }
    console.log("Properties inspector text input visible.");

    // Modificare il testo del nodo
    const newNodeText = 'Test Node E2E - Automated';
    await nodeTextInput.fill(newNodeText);
    await expect(nodeTextInput).toHaveValue(newNodeText);
    console.log("Node text input filled.");

    // Deseleziona il campo di input per assicurarsi che il valore sia "committato" prima del salvataggio
    await saveMapButton.focus();


    // Cliccare "Salva Mappa"
    await saveMapButton.click();
    console.log("Save Map button clicked.");

    // Verificare il toast di successo.
    const successToast = page.locator('li[data-sonner-toast][data-type="success"] div[data-description]');
    await expect(successToast).toBeVisible({ timeout: 15000 });
    await expect(successToast).toContainText(/Map saved successfully|Map content saved|Map updated/i);
    console.log("Success toast verified.");

    // Verificare che l'URL cambi da /new (o il precedente) a /editor/[mapId]
    await expect(page).toHaveURL(/.*\/concept-maps\/editor\/[a-zA-Z0-9-_]+(?<!\/new)$/, { timeout: 15000 });
    console.log(`Map saved, URL changed to: ${page.url()}`);

    // Considerazioni Future:
    // - Usare `data-testid` per selettori più robusti.
    // - Aggiungere test per casi di errore (es. fallimento del salvataggio).
    // - Testare la persistenza effettiva dei dati ricaricando la mappa o verificando tramite API se possibile.
  });
});
