import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// 1. Extend Vitest's `expect` with jest-dom matchers
expect.extend(matchers);

// 2. Set up environment variables for Supabase
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// 3. Mock next/navigation for App Router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({ mapId: 'test-map-id' }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// 4. Mock window APIs that don't exist in JSDOM
// Mock for next-themes and use-mobile hook
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock for components that use ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// 5. Mock global fetch to prevent real network calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// 6. Mock lucide-react icons
vi.mock('lucide-react', () => {
    const createIcon = (displayName) => {
      const IconComponent = (props) =>
        require('react').createElement('svg', {
          'data-testid': `icon-${displayName.toLowerCase()}`,
          ...props,
        });
      IconComponent.displayName = displayName;
      return IconComponent;
    };

    return new Proxy({}, {
      get: (target, prop) => createIcon(prop),
    });
  });

console.log('Vitest setup: All mocks configured (jest-dom, env, navigation, window APIs, fetch, lucide-react).');
