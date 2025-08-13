// src/tests/setup.ts
import React from 'react'; // Import React
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';

expect.extend(matchers);

// You can add other global test setup here if needed, e.g.,
// - Mocking global objects (fetch, localStorage, etc.)
// - Cleaning up after tests (though Vitest does this by default for mocks)

// Example:
// import { server } from './mocks/server'; // if using MSW
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterAll(() => server.close())
// afterEach(() => server.resetHandlers())

// Mock environment variables for Supabase
// Vitest doesn't automatically load .env files in the same way Next.js dev server does.
// For tests that indirectly cause supabaseClient.ts to be imported, these are needed.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Import the mock implementations statically
import * as navigationMock from '@/tests/__mocks__/next/navigation';
import * as mainLayoutMock from '@/tests/__mocks__/components/layout/main-layout.tsx';

// Global mock for next/navigation
// This ensures that all tests that import from 'next/navigation' will use our mock.
vi.mock('next/navigation', () => navigationMock);

// Global mock for MainLayout
vi.mock('@/components/layout/main-layout', () => mainLayoutMock);

// Mock lucide-react icons globally using a Proxy for maintainability.
// This avoids having to manually add every single icon used in the project.
// The mock factory MUST be synchronous. Using an async factory can cause the test runner to hang.
vi.mock('lucide-react', () => {
  // A function to create a mock icon component
  const createIcon = (displayName: string) => {
    const IconComponent = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', {
        'data-testid': `icon-${displayName.toLowerCase()}`,
        ...props,
      });
    IconComponent.displayName = displayName;
    return IconComponent;
  };

  // Use a Proxy to dynamically create mocks for any requested icon.
  // We return a proxy to a new plain object. Any property access on this object
  // will be intercepted by the `get` handler, which then returns a mock icon.
  // This is a fully synchronous and safe way to mock a module with many exports.
  return new Proxy({}, {
    get: (target, prop: string) => {
      // For any property access, just return a mock icon.
      return createIcon(prop);
    },
  });
});

// Mock window.matchMedia for JSDOM environment (used by next-themes and potentially other UI libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false, // Default to false (e.g., light mode, desktop)
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated but still used in some libraries
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock window.location for tests that rely on it for URL construction
const location = new URL('http://localhost:3000');
Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    ...window.location,
    ancestorOrigins: [],
    assign: vi.fn(),
    reload: vi.fn(),
    replace: vi.fn(),
    hash: location.hash,
    host: location.host,
    hostname: location.hostname,
    href: location.href,
    origin: location.origin,
    pathname: location.pathname,
    port: location.port,
    protocol: location.protocol,
    search: location.search,
  },
});

import { z } from 'zod';

// Rewritten to be synchronous to prevent test runner hangs.
vi.mock('genkit', () => ({
  default: {
    defineTool: vi.fn((tool) => tool),
    defineFlow: vi.fn((flow) => flow),
    definePrompt: vi.fn((prompt) => prompt),
    configureGenkit: vi.fn(),
    z,
  },
  defineTool: vi.fn((tool) => tool),
  defineFlow: vi.fn((flow) => flow),
  definePrompt: vi.fn((prompt) => prompt),
  configureGenkit: vi.fn(),
  z,
}));

vi.mock('@genkit-ai/core', () => ({
  defineTool: vi.fn((tool) => tool),
  defineFlow: vi.fn((flow) => flow),
  definePrompt: vi.fn((prompt) => prompt),
  configureGenkit: vi.fn(),
}));

vi.mock('@genkit-ai/googleai', () => ({
  googleAI: () => ({
    name: 'googleai',
    __plugin: true,
  }),
  gemini10Pro: {},
}));

// No longer mocking zundo or zustand, as the previous mocks were incorrect
// and causing the core functionality to fail in tests.
// We will rely on the actual implementations.
