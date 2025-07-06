import { defineConfig, devices } from '@playwright/test';

// Leggi le variabili d'ambiente dal file .env se presente
// require('dotenv').config(); // Deselezionare se si usa dotenv

export default defineConfig({
  testDir: './src/tests-e2e', // Directory dove si trovano i file di test E2E
  fullyParallel: true, // Esegui i file di test in parallelo
  forbidOnly: !!process.env.CI, // Fallisci il build in CI se ci sono test .only
  retries: process.env.CI ? 2 : 0, // Riprova i test falliti solo in CI
  workers: process.env.CI ? 1 : undefined, // Usa 1 worker in CI, altrimenti default (basato su core CPU)
  reporter: 'html', // Reporter per i risultati dei test (genera un report HTML)

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9002', // URL base per i test
    trace: 'on-first-retry', // Registra la traccia al primo tentativo fallito
    // headless: !!process.env.CI, // Esegui in headless mode in CI, altrimenti con browser visibile (default è headless)
  },

  /* Configura progetti per i browser principali */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Esempio per Firefox e WebKit, possono essere decommentati se necessario
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* (Opzionale) Server Web da avviare prima dei test */
  webServer: {
    command: 'npm run dev', // Comando per avviare il server di sviluppo Next.js
    url: 'http://localhost:9002', // URL da attendere prima di iniziare i test
    reuseExistingServer: !process.env.CI, // Non riutilizzare il server esistente in CI
    timeout: 120 * 1000, // Timeout per l'avvio del server (120 secondi)
    stdout: 'pipe', // o 'inherit' per vedere l'output del server
    stderr: 'pipe',
  },
});
