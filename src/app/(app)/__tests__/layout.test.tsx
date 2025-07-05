import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import AppLayout from './layout'; // Assuming this is the correct export name
import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// Mock next/navigation
const mockUseRouter = vi.fn();
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockUsePathname(),
}));

// Mock MainLayout component as it's a child and not the focus of this test
vi.mock('@/components/layout/main-layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="main-layout">{children}</div>,
}));


describe('AppLayout (/app/(app)/layout.tsx)', () => {
  let mockRouterPush: vi.Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush = vi.fn();
    mockUseRouter.mockReturnValue({ push: mockRouterPush });
  });

  it('should redirect to /login if not authenticated and not a guest session', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: false,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/student/dashboard'); // A protected route

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/login?redirectTo=%2Fstudent%2Fdashboard');
    });
  });

  it('should NOT redirect if authenticated', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'test-user' },
      profile: { role: 'student' },
      isAuthenticated: true,
      isGuestSession: false,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/student/dashboard');

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      // Wait a bit to ensure no redirect is called
      return new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should redirect guest session to /examples if accessing a protected app route', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false, // Guests are not "authenticated" in the traditional sense
      isGuestSession: true,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/student/dashboard'); // Protected route

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/examples');
    });
  });

  it('should allow guest session to access /examples', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/examples');

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      return new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should allow guest session to access /concept-maps/editor/example-XYZ (view-only example map)', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/concept-maps/editor/example-guest-map-123');

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      return new Promise(resolve => setTimeout(resolve, 50));
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it('should redirect guest session from /concept-maps/editor/new to /examples', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/concept-maps/editor/new'); // Attempting to create new map

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/examples');
    });
  });

  it('should redirect guest session from /concept-maps/editor/user-map-id (non-example) to /examples', async () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: true,
      isLoading: false,
    });
    mockUsePathname.mockReturnValue('/concept-maps/editor/some-user-map-id');

    render(<AppLayout><p>Test Child</p></AppLayout>);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/examples');
    });
  });

  it('should show loading state if auth isLoading is true', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
      isGuestSession: false,
      isLoading: true, // Auth is loading
    });
    mockUsePathname.mockReturnValue('/student/dashboard');

    const { getByTestId } = render(<AppLayout><p>Test Child</p></AppLayout>);

    // Check for some kind of loading indicator.
    // Assuming AppLayout renders a specific loader or nothing until isLoading is false.
    // For this test, we'll just check that MainLayout is NOT rendered yet,
    // implying a loading state might be active (or null is rendered).
    // A more robust test would look for a specific data-testid="loading-indicator".
    // The actual AppLayout returns a full-page loader if auth.isLoading.
    expect(getByTestId('loading-indicator')).toBeInTheDocument();
    expect(mockRouterPush).not.toHaveBeenCalled(); // No redirect while loading
  });
});
