import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExamplesPage from './page'; // Default export
import { useAuth } from '@/contexts/auth-context';
import { exampleProjectsData } from '@/lib/example-data';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// Mock child components to simplify testing the page's logic
vi.mock('@/components/dashboard/dashboard-header', () => ({
  DashboardHeader: ({ title, subtitle }: { title: string, subtitle?: string }) => (
    <div data-testid="dashboard-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
  ),
}));

vi.mock('@/components/concept-map/concept-map-list-item', () => ({ // Assuming ExampleProjectCard is similar or uses this
    ExampleProjectCard: ({ project, actionType }: { project: any, actionType: 'viewAsGuest' | 'loadExample' }) => ( // Simplified props
    <div data-testid={`example-card-${project.id}`} data-actiontype={actionType}>
      {project.title}
    </div>
  ),
}));

vi.mock('@/components/layout/GuestModeCtaBanner', () => ({
  GuestModeCtaBanner: ({ DONT_REDIRECT_ON_LOGIN }: { DONT_REDIRECT_ON_LOGIN?: boolean }) => ( // Match expected props
    <div data-testid="guest-cta-banner" data-dont-redirect={DONT_REDIRECT_ON_LOGIN}>CTA Banner</div>
  )
}));

// Mock example data
vi.mock('@/lib/example-data', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/example-data')>();
  return {
    ...original,
    exampleProjectsData: [
      { id: 'ex1', title: 'Example 1', description: 'Desc 1', imageUrl: '', tags: [], lastUpdated: '', estimatedComplexity: '', coreConcepts: [] },
      { id: 'ex2', title: 'Example 2', description: 'Desc 2', imageUrl: '', tags: [], lastUpdated: '', estimatedComplexity: '', coreConcepts: [] },
    ],
  };
});


describe('ExamplesPage (/app/(app)/examples/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render DashboardHeader and example project cards', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false, // Authenticated user
      user: { id: 'test-user' },
    });

    render(<ExamplesPage />);

    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    expect(screen.getByText('Explore Example Projects')).toBeInTheDocument(); // Part of DashboardHeader title

    expect(screen.getByTestId('example-card-ex1')).toBeInTheDocument();
    expect(screen.getByText('Example 1')).toBeInTheDocument();
    expect(screen.getByTestId('example-card-ex2')).toBeInTheDocument();
    expect(screen.getByText('Example 2')).toBeInTheDocument();
  });

  it('should render GuestModeCtaBanner when in a guest session', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: true,
      user: null,
    });

    render(<ExamplesPage />);

    expect(screen.getByTestId('guest-cta-banner')).toBeInTheDocument();
    // Check DONT_REDIRECT_ON_LOGIN prop for the banner on this page
    expect(screen.getByTestId('guest-cta-banner')).toHaveAttribute('data-dont-redirect', 'true');
  });

  it('should NOT render GuestModeCtaBanner when not in a guest session (authenticated user)', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false,
      user: { id: 'test-user' },
    });

    render(<ExamplesPage />);

    expect(screen.queryByTestId('guest-cta-banner')).toBeNull();
  });

  it('should pass "viewAsGuest" actionType to ExampleProjectCard when in guest session', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: true,
      user: null,
    });

    render(<ExamplesPage />);

    const card1 = screen.getByTestId('example-card-ex1');
    expect(card1).toHaveAttribute('data-actiontype', 'viewAsGuest');
  });

  it('should pass "loadExample" actionType to ExampleProjectCard when authenticated', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false,
      user: { id: 'test-user'},
    });

    render(<ExamplesPage />);

    const card1 = screen.getByTestId('example-card-ex1');
    expect(card1).toHaveAttribute('data-actiontype', 'loadExample');
  });

});
