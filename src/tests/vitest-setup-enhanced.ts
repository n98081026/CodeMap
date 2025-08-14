// Enhanced test setup to fix zundo/zustand issues
import React from 'react';
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect, vi } from 'vitest';

expect.extend(matchers);

// Environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Critical: Mock zundo BEFORE any imports that might use it
vi.mock('zundo', () => ({
  temporal: vi.fn((storeCreator) => {
    // Return the store creator without temporal middleware
    return storeCreator;
  }),
  TemporalState: vi.fn(),
}));

// Mock zustand to prevent store initialization issues
vi.mock('zustand', () => ({
  create: vi.fn((storeCreator) => {
    const store = storeCreator(vi.fn(), vi.fn(), vi.fn());
    const useStore = vi.fn((selector) => {
      if (typeof selector === 'function') {
        return selector(store);
      }
      return store;
    }) as any;
    useStore.getState = () => store;
    useStore.setState = vi.fn();
    useStore.subscribe = vi.fn();
    return useStore;
  }),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useParams: () => ({
    mapId: 'test-map-id',
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock AI flows
vi.mock('@/ai/flows', () => ({
  runFlow: vi.fn(),
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock auth context
vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User', role: 'STUDENT' },
    loading: false,
  }),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => {
  const createIcon = (displayName: string) => {
    const IconComponent = (props: React.SVGProps<SVGSVGElement>) =>
      React.createElement('svg', {
        'data-testid': `icon-${displayName.toLowerCase()}`,
        ...props,
      });
    IconComponent.displayName = displayName;
    return IconComponent;
  };

  return new Proxy({}, {
    get: (target, prop: string) => createIcon(prop),
  });
});

// Mock window objects
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

// Mock fetch
global.fetch = vi.fn();

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));