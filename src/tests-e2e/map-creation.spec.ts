import { test, expect } from '@playwright/test';

test.describe('Map Creation and Editing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    const testUserEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com'; // Usa var d'ambiente o default
    const testUserPassword = process.env.TEST_USER_PASSWORD || 'password123'; // Usa var d'ambiente o default

    await page.locator('input[type="email"]').fill(testUserEmail);
    await page.locator('input[type="password"]').fill(testUserPassword);
    // Selettore robusto per il pulsante di login
    await page.getByRole('button', { name: /Login|Sign In/i }).click();

    // Attendi il reindirizzamento alla dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 }); // Timeout aumentato
    console.log(`Login successful for map creation test. Current page: ${page.url()}`);
  });

  test('should allow a user to create a new map, add and edit a node, and save', async ({ page }) => {
    // Dalla dashboard, naviga alla pagina delle mappe concettuali dello studente
    // Questo presuppone che l'utente sia uno studente. Adattare se il ruolo è diverso.
    // Esempio: cliccare un link "Le mie mappe" o "Concept Maps"
    // Usiamo getByRole per un selettore più semantico e robusto.
    await page.getByRole('link', { name: /concept maps|my maps|le mie mappe/i }).first().click();
    await expect(page).toHaveURL(/.*\/student\/concept-maps/, { timeout: 10000 });
    console.log(`Navigated to student concept maps page. Current URL: ${page.url()}`);

    // Cliccare il pulsante "Crea Nuova Mappa" (o simile)
    // Adattare il selettore al testo/ruolo effettivo del pulsante
    await page.getByRole('button', { name: /create new map|new map|crea nuova mappa|nuova mappa/i }).click();
    console.log(`"Create New Map" button clicked. Current URL: ${page.url()}`);

    // Attendi il caricamento dell'editor. Un buon indicatore è la visibilità della toolbar.
    const addNodeButton = page.locator("button[data-tutorial-id='editor-add-node']");
    await expect(addNodeButton).toBeVisible({ timeout: 25000 }); // Timeout aumentato per caricamento editor + potenziale creazione mappa backend
    console.log("Editor toolbar visible.");

    // Cliccare "Aggiungi Nodo"
    await addNodeButton.click();
    console.log("Add Node button clicked.");

    // Verificare che un nodo sia presente sulla canvas.
    const nodesOnCanvas = page.locator('.react-flow__node');
    await expect(nodesOnCanvas).toHaveCount(1, { timeout: 10000 });
    console.log("Node count verified (1).");

    // Selezionare il primo (e unico) nodo per modificarlo
    const firstNode = nodesOnCanvas.first();
    await firstNode.click();
    console.log("First node clicked (selected).");

    // Attendere che il pannello delle proprietà sia visibile e l'input del testo del nodo sia pronto
    const nodeTextInput = page.locator("input[data-tutorial-id='properties-inspector-node-text-input']");
    // Potrebbe essere necessario prima aprire il pannello proprietà se non è auto-aperto
    // await page.locator('#tutorial-target-toggle-properties-button').click(); // Se necessario
    await expect(nodeTextInput).toBeVisible({ timeout: 10000 });
    console.log("Properties inspector text input visible.");

    // Modificare il testo del nodo
    const newNodeText = 'Test Node E2E - Automated';
    await nodeTextInput.fill(newNodeText);
    await expect(nodeTextInput).toHaveValue(newNodeText);
    console.log("Node text input filled.");

    // Deseleziona il campo di input per assicurarsi che il valore sia "committato" prima del salvataggio
    await page.locator("button[data-tutorial-id='editor-save-map']").focus();


    // Cliccare "Salva Mappa"
    await page.locator("button[data-tutorial-id='editor-save-map']").click();
    console.log("Save Map button clicked.");

    // Verificare il toast di successo.
    const successToast = page.locator('li[data-sonner-toast][data-type="success"] div[data-description]'); // Selettore più specifico per Sonner toasts
    await expect(successToast).toBeVisible({ timeout: 15000 });
    await expect(successToast).toContainText(/Map saved successfully|Map content saved|Map updated/i); // Testo del toast più flessibile
    console.log("Success toast verified.");

    // Verificare che l'URL cambi da /new (o il precedente) a /editor/[mapId]
    await expect(page).toHaveURL(/.*\/concept-maps\/editor\/[a-zA-Z0-9-_]+(?<!\/new)$/, { timeout: 15000 });
    console.log(`Map saved, URL changed to: ${page.url()}`);

    // (Opzionale avanzato) Verificare che il testo del nodo sia stato salvato correttamente
    // Questo potrebbe richiedere di ricaricare la pagina o di trovare il nodo e verificarne il testo di nuovo.
    // Per ora, ci fidiamo del toast e del cambio URL.
  });
});
