/// <reference types="vitest" />
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(), // To handle aliases like @/components/*
  ],
  test: {
    globals: true,
    environment: 'jsdom', // For testing components that interact with DOM APIs
    setupFiles: ['./src/tests/setup.ts'],
    // Add --no-threads or equivalent to Vitest config to potentially reduce memory pressure
    // Vitest uses Tinypool which runs tests in worker threads. Disabling this might help with OOM.
    // The CLI option is --no-threads. In config, it's `threads: false` or specific pool options.
    // Also, setting minThreads and maxThreads to 1 can achieve a similar effect.
    include: [
      'src/**/*.test.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      'src/tests/**/*.test.{ts,tsx}',
    ], // Pattern for test files
    // Add manual mocks directory
    // Note: Vitest automatically looks for __mocks__ adjacent to node_modules or the project root.
    // Explicitly pointing to src/tests/__mocks__ might be needed if auto-detection isn't working as expected
    // or if preferred for clarity. However, standard behavior should pick it up.
    // For now, relying on standard behavior. If issues persist, can add:
    // test.mocksDir: './src/tests/__mocks__', (this is actually vite-node specific, not Vitest global)
    // Vitest uses `vi.mock` for manual mocks, which are hoisted.
    // The created mock in src/tests/__mocks__/next/navigation.ts should be automatically picked up
    // for imports of 'next/navigation' due to Vitest's conventions if vi.mock('next/navigation') is called.
    // If not automatically picked up due to placement outside a root-level __mocks__,
    // we might need to explicitly use vi.mock in affected test files or adjust setup.
    // For now, let's assume the global mock in setupFiles or direct vi.mock in tests is the primary way.
    // The created mock file `src/tests/__mocks__/next/navigation.ts` is intended to be used with `vi.mock('next/navigation', () => import('@/tests/__mocks__/next/navigation'))`
    // in the test files or in the setup file.
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      enabled: false, // Temporarily disable coverage
    },
    resolve: {
      alias: {
        'graphology-traversal/bfs': 'graphology-traversal/dist/bfs.js',
      },
    },
    deps: {
      noExternal: true,
    },
  },
});
