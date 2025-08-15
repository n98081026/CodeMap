import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import AppLayout from '../layout';
import { useAuth } from '@/contexts/auth-context';
import useTutorialStore from '@/stores/tutorial-store';

// Mock all dependencies used by the layout
vi.mock('next/navigation');
vi.mock('@/contexts/auth-context');
vi.mock('@/stores/tutorial-store');

// Mock the MainLayout to simplify testing AppLayout's logic
vi.mock('@/components/layout/main-layout', () => ({
  MainLayout: ({ children }) => <main data-testid="main-layout">{children}</main>
}));

describe('AppLayout', () => {
  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Provide default mocks for all hooks
    vi.mocked(useRouter).mockReturnValue(mockRouter as any);
    vi.mocked(usePathname).mockReturnValue('');
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams());
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      login: vi.fn(),
      logout: vi.fn(),
      register: vi.fn(),
      updateCurrentUserData: vi.fn(),
    });
    vi.mocked(useTutorialStore).mockReturnValue({
      startOrResumeTutorial: vi.fn(),
      activeTutorialKey: null,
    });
  });

  it('should render a loading spinner while auth state is loading', () => {
    // Auth is loading by default in beforeEach
    render(<AppLayout><p>Child</p></AppLayout>);
    expect(screen.getByText(/Initializing CodeMap/i)).toBeInTheDocument();
  });

  it('should redirect to /login if not authenticated on a protected route', async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoading: false, isAuthenticated: false } as any);
    vi.mocked(usePathname).mockReturnValue('/student/dashboard');

    render(<AppLayout><p>Child</p></AppLayout>);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/login?redirectTo=%2Fstudent%2Fdashboard');
    });
    // While redirecting, it should show a loader and not the main layout
    expect(screen.queryByTestId('main-layout')).not.toBeInTheDocument();
  });

  it('should render the main layout and children if authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      isAuthenticated: true,
      user: { id: 'test-user', role: 'STUDENT' }
    } as any);
    vi.mocked(usePathname).mockReturnValue('/student/dashboard');

    render(<AppLayout><p>Hello World</p></AppLayout>);

    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('should not redirect if on a public example route, even if unauthenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({ isLoading: false, isAuthenticated: false } as any);
    vi.mocked(usePathname).mockReturnValue('/concept-maps/editor/example-123');
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('viewOnly=true'));

    render(<AppLayout><p>Child</p></AppLayout>);

    // Wait a moment to ensure no redirect is called
    await new Promise(r => setTimeout(r, 50));

    expect(mockRouter.replace).not.toHaveBeenCalled();
    // It should render the main layout for public view-only pages
    expect(screen.getByTestId('main-layout')).toBeInTheDocument();
  });
});
