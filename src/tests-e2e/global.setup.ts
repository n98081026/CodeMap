import { chromium, FullConfig } from '@playwright/test';
import * as path from 'path';

// Percorso del file dove verrà salvato lo stato di autenticazione
// Usiamo una directory .auth dentro la directory dei test e2e per tenerla organizzata
export const AUTH_FILE = path.join(__dirname, '.auth', 'user.json');

async function globalSetup(config: FullConfig) {
  console.log('Global setup: Authenticating user...');
  const { baseURL, userAgent } = config.projects[0].use; // Prende baseURL dal primo progetto (o configuralo diversamente)
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, userAgent });

  try {
    await page.goto('/login'); // Assicurati che questo sia il percorso corretto per la tua pagina di login

    // Usa le variabili d'ambiente per le credenziali, con fallback se non definite
    const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
    const password = process.env.TEST_USER_PASSWORD || 'password123';

    console.log(`Attempting login with email: ${email}`);

    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);

    // Selettore robusto per il pulsante di login
    await page.getByRole('button', { name: /Login|Sign In/i }).click();

    // Attendi il reindirizzamento o un indicatore di login riuscito
    // Ad esempio, attendi che l'URL contenga /dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 20000 });
    console.log(`Login successful. Current URL: ${page.url()}`);

    // Salva lo stato di autenticazione nel file specificato da AUTH_FILE
    // Questo include cookies, localStorage, sessionStorage, ecc.
    await page.context().storageState({ path: AUTH_FILE });
    console.log(`Authentication state saved to ${AUTH_FILE}`);

  } catch (error) {
    console.error('Error during global setup authentication:', error);
    // Se il login fallisce, potresti voler far fallire l'intero setup
    // o gestire l'errore in modo che i test che non dipendono dall'autenticazione possano comunque girare.
    // Per ora, logghiamo l'errore e il processo continuerà, ma i test che richiedono auth falliranno.
    // In CI, questo dovrebbe idealmente far fallire il run.
    // Lanciare l'errore qui farà fallire il setup e quindi i test.
    throw new Error(`Global setup authentication failed: ${error}`);
  } finally {
    await browser.close();
    console.log('Browser closed after global setup.');
  }
}

export default globalSetup;
