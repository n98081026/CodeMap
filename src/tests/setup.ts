// src/tests/setup.ts
import React from 'react'; // Import React
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

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

// Global mock for next/navigation
// This ensures that all tests that import from 'next/navigation' will use our mock.
vi.mock('next/navigation', () => {
  // Dynamically import the mock implementation
  const mockModule = import('@/tests/__mocks__/next/navigation');
  return mockModule; // Return all exports from the mock file
});

// Global mock for MainLayout
vi.mock('@/components/layout/main-layout', () => {
  const mockModule = import('@/tests/__mocks__/components/layout/main-layout');
  return mockModule;
});

// Mock lucide-react icons globally
vi.mock('lucide-react', () => {
  const actual = vi.importActual('lucide-react');
  const createIcon = (displayName: string) => {
    const IconComponent = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', {
        'data-testid': `icon-${displayName.toLowerCase()}`,
        ...props,
      });
    IconComponent.displayName = displayName;
    return IconComponent;
  };

  // Add all icons used in the project here
  // From navbar.tsx: CodeXml, UserCircle, LogIn, LogOut, Sun, Moon, Settings, LayoutDashboard, PanelLeft, HelpCircle
  // From other files (based on previous test failures or common usage):
  // Sparkles, Lightbulb, Link, Replace, Trash2, CheckCircle, XCircle, Zap, Loader2, ChevronDown, ChevronRight, GripVertical, BookCopy (example)
  // Plus any other icons that might cause issues if not mocked.
  return {
    ...actual, // Spread actual to keep any non-component exports
    CodeXml: createIcon('CodeXml'),
    UserCircle: createIcon('UserCircle'),
    LogIn: createIcon('LogIn'),
    LogOut: createIcon('LogOut'),
    Sun: createIcon('Sun'),
    Moon: createIcon('Moon'),
    Settings: createIcon('Settings'),
    LayoutDashboard: createIcon('LayoutDashboard'),
    PanelLeft: createIcon('PanelLeft'),
    HelpCircle: createIcon('HelpCircle'),
    Sparkles: createIcon('Sparkles'),
    Lightbulb: createIcon('Lightbulb'),
    Link: createIcon('Link'),
    Replace: createIcon('Replace'),
    Trash2: createIcon('Trash2'),
    CheckCircle: createIcon('CheckCircle'),
    XCircle: createIcon('XCircle'),
    Zap: createIcon('Zap'),
    Loader2: createIcon('Loader2'),
    ChevronDown: createIcon('ChevronDown'),
    ChevronRight: createIcon('ChevronRight'),
    GripVertical: createIcon('GripVertical'),
    BookCopy: createIcon('BookCopy'), // Example from a previous test
    Menu: createIcon('Menu'), // Common icon
    Users: createIcon('Users'), // From previous dashboard tests
    BookOpen: createIcon('BookOpen'),
    FileText: createIcon('FileText'),
    Share2: createIcon('Share2'),
    FolderKanban: createIcon('FolderKanban'),
    Compass: createIcon('Compass'),
    AlertTriangle: createIcon('AlertTriangle'),
    Info: createIcon('Info'),
    InfoIcon: createIcon('InfoIcon'),
    MessageSquareDashed: createIcon('MessageSquareDashed'),
    CheckSquare: createIcon('CheckSquare'),
    Edit3: createIcon('Edit3'),
    AlertCircle: createIcon('AlertCircle'),
    GitFork: createIcon('GitFork'),
    Brain: createIcon('Brain'),
    Search: createIcon('Search'),
    PlusCircle: createIcon('PlusCircle'),
    // Add any other icons that might be used across the application
  };
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

vi.mock('genkit', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
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
  };
});

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

// import { temporal } from 'zundo';
// vi.mock('zundo', () => ({
//   temporal: (fn: unknown) => fn,
//   createVanillaTemporal: () => ({
//     getState: () => ({
//       pastStates: [],
//       futureStates: [],
//       clear: vi.fn(),
//     }),
//     subscribe: vi.fn(),
//     setState: vi.fn(),
//   }),
// }));

import { vi } from 'vitest';

import { vi } from 'vitest';

import { vi } from 'vitest';

// vi.mock('zustand', async () => {
//   const actual = await vi.importActual('zustand');
//   const { temporalStateCreator } = await vi.importActual(
//     '@/stores/concept-map-store'
//   );
//
//   const mockCreate = (initializer: unknown) => {
//     // Check if it's the temporal store
//     if (initializer && initializer.toString().includes('temporalStateCreator')) {
//       const vanillaStore = initializer(temporalStateCreator);
//       const useBoundStore = () => vanillaStore;
//       Object.assign(useBoundStore, {
//         getState: () => vanillaStore,
//         setState: (updater: unknown) => {
//           const newState =
//             typeof updater === 'function' ? updater(vanillaStore) : updater;
//           Object.assign(vanillaStore, newState);
//         },
//         subscribe: vi.fn(),
//         temporal: {
//           pastStates: () => [],
//           futureStates: () => [],
//           undo: vi.fn(),
//           redo: vi.fn(),
//           clear: vi.fn(),
//         },
//       });
//       return useBoundStore;
//     }
//     // For other stores
//     return (actual as typeof import('zustand')).create(initializer);
//   };
//
//   return {
//     ...(actual as typeof import('zustand')),
//     create: mockCreate,
//     default: mockCreate,
//   };
// });
