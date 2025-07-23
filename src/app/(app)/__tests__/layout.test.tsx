import { render, waitFor } from '@testing-library/react';
// Import useRouter, usePathname, useSearchParams from the global mock path
// to ensure we are using the one that can be controlled by __setMock... helpers
import {
  useRouter, // Will come from global mock in setup.ts
  usePathname, // Will come from global mock in setup.ts
  useSearchParams, // Will come from global mock in setup.ts
  __setMockPathname,
  __setMockRouter,
  __setMockSearchParams,
} from '@/tests/__mocks__/next/navigation'; // Adjusted path
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AppLayout from '../layout';

import { useAuth } from '@/contexts/auth-context';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// The global mock for 'next/navigation' is set in `src/tests/setup.ts`.
// The global mock for '@components/layout/main-layout' is also set in `src/tests/setup.ts`.
// No need for local vi.mock calls for these if the global ones are working correctly.

describe.skip('AppLayout (/app/(app)/layout.tsx)', () => {
  let mockRouterInstance: any;

  beforeEach(() => {
    (useAuth as ReturnType<typeof vi.fn>).mockClear();

    mockRouterInstance = {
      push: vi.fn(),
      replace: vi.fn(),
      forward: vi.fn(),
      back: vi.fn(),
      prefetch: vi.fn(),
      refresh: vi.fn(),
      pathname: '/default-pathname',
      query: {},
      asPath: '/default-pathname',
      events: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    };
    __setMockRouter(mockRouterInstance);
    __setMockPathname('/default-pathname');
    __setMockSearchParams(new URLSearchParams());
  });

  it('should redirect to /login if not authenticated and not a guest session', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: false,
      isLoading: false,
    });
    __setMockPathname('/student/dashboard');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockRouterInstance.replace).toHaveBeenCalledWith(
        '/login?redirectTo=%2Fstudent%2Fdashboard'
      );
    });
  });

  it('should NOT redirect if authenticated', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { id: 'test-user' },
      profile: { role: 'student' },
      isAuthenticated: true,
      isGuestSession: false,
      isLoading: false,
    });
    __setMockPathname('/student/dashboard');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      return new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockRouterInstance.push).not.toHaveBeenCalled();
    expect(mockRouterInstance.replace).not.toHaveBeenCalled();
  });

  it('should redirect guest session to /examples if accessing a protected app route', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    __setMockPathname('/student/dashboard');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockRouterInstance.replace).toHaveBeenCalledWith('/examples');
    });
  });

  it('should allow guest session to access /examples', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    __setMockPathname('/examples');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      return new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockRouterInstance.push).not.toHaveBeenCalled();
    expect(mockRouterInstance.replace).not.toHaveBeenCalled();
  });

  it('should allow guest session to access /concept-maps/editor/example-XYZ (view-only example map)', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    __setMockPathname('/concept-maps/editor/example-guest-map-123');
    __setMockSearchParams(new URLSearchParams('viewOnly=true'));

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      return new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(mockRouterInstance.push).not.toHaveBeenCalled();
    expect(mockRouterInstance.replace).not.toHaveBeenCalled();
  });

  it('should redirect guest session from /concept-maps/editor/new to /examples', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    __setMockPathname('/concept-maps/editor/new');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockRouterInstance.replace).toHaveBeenCalledWith('/examples');
    });
  });

  it('should redirect guest session from /concept-maps/editor/user-map-id (non-example) to /examples', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    __setMockPathname('/concept-maps/editor/some-user-map-id');

    render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );

    await waitFor(() => {
      expect(mockRouterInstance.replace).toHaveBeenCalledWith('/examples');
    });
  });

  it('should show loading state if auth isLoading is true', () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: false,
      isLoading: true,
    });
    __setMockPathname('/student/dashboard');

    const { getByTestId } = render(
      <AppLayout>
        <p>Test Child</p>
      </AppLayout>
    );
    expect(getByTestId('loading-indicator'));
    expect(mockRouterInstance.push).not.toHaveBeenCalled();
    expect(mockRouterInstance.replace).not.toHaveBeenCalled();
  });
});
