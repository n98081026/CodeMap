import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';

// Definisce il percorso del file di stato di autenticazione.
// Deve essere lo stesso percorso usato in global.setup.ts.
const AUTH_FILE = path.join(__dirname, 'src/tests-e2e/.auth/user.json');

export default defineConfig({
  testDir: './src/tests-e2e', // Directory dove si trovano i file di test E2E

  // File di setup globale, eseguito una volta prima di tutti i test.
  // Playwright eseguirà prima tutti i file che matchano `globalSetup`
  // se un progetto dipende da un progetto che esegue il setup.
  // Alternativamente, si può definire un progetto 'setup' dedicato.
  globalSetup: require.resolve('./src/tests-e2e/global.setup.ts'),

  fullyParallel: true, // Esegui i file di test in parallelo
  forbidOnly: !!process.env.CI, // Fallisci il build in CI se ci sono test .only
  retries: process.env.CI ? 1 : 0, // Riprova i test falliti 1 volta in CI, 0 localmente
  workers: process.env.CI ? 1 : undefined, // Usa 1 worker in CI per stabilità, altrimenti default

  reporter: 'html', // Reporter per i risultati dei test (genera un report HTML)

  use: {
    // baseURL comune a tutti i test.
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:9002',

    // Registra la traccia al primo tentativo fallito, molto utile per il debug.
    trace: 'on-first-retry',

    // Non è necessario `headless` qui perché i progetti possono specificarlo,
    // e il default di Playwright è headless.
  },

  projects: [
    // Progetto 'setup': esegue solo il file di setup globale per l'autenticazione.
    // Non è strettamente necessario se globalSetup è definito a livello root,
    // ma esplicitarlo può chiarire le dipendenze se ci fossero più setup.
    // Per ora, globalSetup a livello root è sufficiente.
    // {
    //   name: 'setup',
    //   testMatch: /global\.setup\.ts/,
    // },

    // Progetto principale per Chromium.
    // Questo progetto usa lo stato di autenticazione salvato dal globalSetup.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usa lo stato di autenticazione salvato.
        // Tutti i test in questo progetto inizieranno come utente loggato.
        storageState: AUTH_FILE,
      },
      // Opzionale: se si vuole che questo progetto dipenda esplicitamente da un progetto 'setup'.
      // dependencies: ['setup'],
      // In questo caso, dato che globalSetup è a livello root, la dipendenza è implicita
      // se Playwright esegue globalSetup prima di tutti i progetti.
      // Per maggiore chiarezza con `globalSetup` a livello root, `dependencies` non è strettamente necessario qui.
      testMatch: /.*\.spec\.ts/, // Esegue tutti i file .spec.ts
      testIgnore: /global\.setup\.ts/, // Assicura che il file di setup non venga eseguito come test regolare
    },

    // Progetto per testare il login stesso, NON deve usare lo storageState.
    // Potrebbe essere necessario se auth.spec.ts fallisce a causa dello stato pre-autenticato.
    // {
    //   name: 'chromium-auth-tests',
    //   use: {
    //     ...devices['Desktop Chrome'],
    //     // NESSUNO storageState qui, perché vogliamo testare il login da zero.
    //   },
    //   testMatch: /auth\.spec\.ts/, // Esegui solo i test di autenticazione
    // },

    // Esempi per altri browser, possono essere decommentati.
    // Anch'essi dovrebbero usare lo storageState e dipendere da 'setup' se si usa quel pattern.
    // {
    //   name: 'firefox',
    //   use: {
    //     ...devices['Desktop Firefox'],
    //     storageState: AUTH_FILE,
    //   },
    //   dependencies: ['setup'],
    //   testMatch: /.*\.spec\.ts/,
    //   testIgnore: /global\.setup\.ts/,
    // },

    // {
    //   name: 'webkit',
    //   use: {
    //     ...devices['Desktop Safari'],
    //     storageState: AUTH_FILE,
    //   },
    //   dependencies: ['setup'],
    //   testMatch: /.*\.spec\.ts/,
    //   testIgnore: /global\.setup\.ts/,
    // },
  ],

  // Configurazione del server web per avviare l'applicazione Next.js prima dei test.
  webServer: {
    command: 'npm run dev', // Comando per avviare il server (usa la porta 9002 come da package.json)
    url: 'http://localhost:9002', // URL da attendere prima di iniziare i test
    reuseExistingServer: !process.env.CI, // Non riutilizzare un server esistente in CI
    timeout: 120 * 1000, // Timeout per l'avvio del server (120 secondi)
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      // Passa variabili d'ambiente necessarie al server di sviluppo
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key',
    },
  },
});
