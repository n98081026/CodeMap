import { vi } from 'vitest';

// Default mock implementations
let mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  forward: vi.fn(),
  back: vi.fn(),
  prefetch: vi.fn(),
  refresh: vi.fn(),
  // Add any other properties/methods your tests might access on the router object
  // For example, if tests access router.events, router.pathname, etc.
  pathname: '/mock-pathname', // Default pathname
  query: {}, // Default query
  asPath: '/mock-pathname', // Default asPath
  events: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  },
};

let mockPathname = '/mock-pathname';
let mockSearchParams = new URLSearchParams();

export const useRouter = vi.fn(() => mockRouter);
export const usePathname = vi.fn(() => mockPathname);
export const useSearchParams = vi.fn(() => mockSearchParams);

export const redirect = vi.fn((path: string) => {
  // In tests, you might want to check if redirect was called with the correct path
  // instead of actually throwing an error, unless that's part of the test.
  console.log(`MOCK_REDIRECT_CALLED: ${path}`);
  // Or, if you need to simulate the "Error: NEXT_REDIRECT" that Next.js throws:
  // const error = new Error('NEXT_REDIRECT');
  // error.digest = `NEXT_REDIRECT;${path}`;
  // throw error;
  return `MOCK_REDIRECT_TO:${path}`;
});

export const permanentRedirect = vi.fn((path: string) => {
  console.log(`MOCK_PERMANENT_REDIRECT_CALLED: ${path}`);
  return `MOCK_PERMANENT_REDIRECT_TO:${path}`;
});

// Function to allow tests to set specific router values
export const __setMockRouter = (
  newRouterValues: Partial<typeof mockRouter>
) => {
  mockRouter = { ...mockRouter, ...newRouterValues };
};

// Function to allow tests to set a specific pathname
export const __setMockPathname = (pathname: string) => {
  mockPathname = pathname;
  // Also update router.pathname and router.asPath for consistency if useRouter is called after this
  __setMockRouter({ pathname, asPath: pathname });
};

// Function to allow tests to set specific search params
export const __setMockSearchParams = (params: URLSearchParams | string) => {
  if (typeof params === 'string') {
    mockSearchParams = new URLSearchParams(params);
  } else {
    mockSearchParams = params;
  }
};

// Re-export any other members from the actual module that you don't want to mock
// For example, if there are constants or other utility functions
// This part is tricky with `await vi.importActual` at the top level in a mock file
// as it might not be available here.
// A common pattern is to mock only specific functions and use vi.requireActual for others if needed within tests.

// For now, assume only the above are used or need mocking.
// If other exports are needed, they might need to be added explicitly or the mocking strategy revised.

// The fallback logic has been removed as it was causing a hang due to top-level await
// and is generally an unsafe practice in mock files. Mocks should be explicit.
