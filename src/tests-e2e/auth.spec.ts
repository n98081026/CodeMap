import { test, expect } from '@playwright/test';

import { LoginPage } from './pom/LoginPage'; // Import the LoginPage Page Object

test.describe('Authentication Flows', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigate(); // Naviga alla pagina di login prima di ogni test in questo describe
  });

  test('should allow a user to log in successfully with default credentials', async ({
    page,
  }) => {
    // TODO: Idealmente, questo test dovrebbe usare credenziali specifiche per il test di login,
    // non necessariamente le stesse del global.setup se quelle sono "super utenti".
    // Per ora, riutilizza la logica di loginAsDefaultUser ma verifica esplicitamente la UI.

    const testUserEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
    const testUserPassword = process.env.TEST_USER_PASSWORD || 'password123';

    await loginPage.login(testUserEmail, testUserPassword);

    // Verifica il reindirizzamento alla dashboard
    await expect(page).toHaveURL(/.*\/dashboard/, { timeout: 20000 }); // Timeout aumentato
    console.log(
      `Test 'should allow a user to log in successfully' passed. User redirected to: ${page.url()}`
    );

    // (Opzionale) Verifica un elemento specifico della dashboard
    // Ad esempio, se la dashboard ha un titolo H1 specifico:
    // await expect(page.getByRole('heading', { name: /dashboard/i, level: 1 })).toBeVisible();
  });

  test('should show an error message for invalid credentials', async ({
    page,
  }) => {
    await loginPage.login('wrong@example.com', 'wrongpassword');

    // Identificare il selettore per il messaggio di errore.
    // Questo è un placeholder e deve essere adattato all'implementazione reale.
    // Esempi:
    // const errorMessage = loginPage.page.locator('[data-testid="login-error-message"]');
    // const errorMessage = loginPage.page.locator('text=/Invalid email or password|Credenziali non valide/i');
    const errorMessage = loginPage.page.locator('form p[role="alert"]'); // Se si usa un <p role="alert"> per gli errori nel form

    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
    // Adattare il testo dell'errore al messaggio effettivo mostrato dall'applicazione
    await expect(errorMessage.first()).toContainText(
      /Invalid login credentials|Invalid email or password|Credenziali non valide/i
    );
    console.log('Test for invalid credentials passed, error message shown.');
  });
});
