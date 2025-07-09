import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Utilizziamo selettori robusti. Idealmente, questi sarebbero data-testid.
    this.emailInput = page.locator('input[type="email"]');
    this.passwordInput = page.locator('input[type="password"]');
    // Selettore per il pulsante di login che cerca per ruolo e testo comune (case-insensitive)
    this.loginButton = page.getByRole('button', { name: /Login|Sign In/i });
  }

  /**
   * Naviga alla pagina di login.
   */
  async navigate() {
    await this.page.goto('/login');
    // Attendi che un elemento chiave della pagina di login sia visibile
    await expect(this.emailInput).toBeVisible({ timeout: 10000 });
  }

  /**
   * Esegue il login con le credenziali fornite.
   * @param email L'email dell'utente.
   * @param password La password dell'utente.
   */
  async login(email: string, password?: string) {
    const finalPassword =
      password || process.env.TEST_USER_PASSWORD || 'password123';
    await this.emailInput.fill(email);
    await this.passwordInput.fill(finalPassword);
    await this.loginButton.click();
  }

  /**
   * Esegue il login utilizzando le credenziali di default (da env o hardcoded)
   * e verifica il reindirizzamento alla dashboard.
   * Utile per i setup `beforeEach` dei test che non testano il login stesso.
   */
  async loginAsDefaultUser() {
    const defaultEmail = process.env.TEST_USER_EMAIL || 'testuser@example.com';
    const defaultPassword = process.env.TEST_USER_PASSWORD || 'password123';

    await this.navigate(); // Assicura di essere sulla pagina di login
    await this.login(defaultEmail, defaultPassword);

    // Verifica il reindirizzamento alla dashboard
    await expect(this.page).toHaveURL(/.*\/dashboard/, { timeout: 20000 });
    console.log(
      `LoginAsDefaultUser successful. Current page: ${this.page.url()}`
    );
  }
}
