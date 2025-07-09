import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import ExamplesPage from '../page'; // Default export

import { useAuth } from '@/contexts/auth-context';
import { exampleProjectsData } from '@/lib/example-data';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// Mock child components to simplify testing the page's logic
vi.mock('@/components/dashboard/dashboard-header', () => ({
  DashboardHeader: ({
    title,
    description, // Corrected from subtitle to description
  }: {
    title: string;
    description?: string; // Corrected from subtitle to description
  }) => (
    <div data-testid='dashboard-header'>
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  ),
}));

// The page uses <Card> and related components directly, not a specific ExampleProjectCard.
// So, we don't need to mock ExampleProjectCard.
// We will test for the content rendered by the actual Card components.

vi.mock('@/components/layout/GuestModeCtaBanner', () => {
  // The actual GuestModeCtaBanner takes no props in its definition in page.tsx
  // but the test was trying to pass DONT_REDIRECT_ON_LOGIN.
  // Let's make the mock simpler and just check for its existence.
  const MockGuestCtaBanner = () => (
    <div data-testid='guest-cta-banner'>CTA Banner</div>
  );
  return {
    // If GuestModeCtaBanner is a default export from its module:
    default: MockGuestCtaBanner,
    // If it's a named export:
    GuestModeCtaBanner: MockGuestCtaBanner,
  };
});

// Mock example data from '@/lib/example-data'
// The actual page imports `exampleProjects` not `exampleProjectsData`
const mockExampleProjectList = [
  {
    key: 'ex1', // Changed id to key to match ExampleProject type
    name: 'Example Project 1', // Changed title to name
    description: 'Desc 1',
    imageUrl: '/images/example1.png', // Added an actual path
    tags: ['React', 'TypeScript'],
    lastUpdated: '2024-07-28',
    estimatedComplexity: 'Medium',
    coreConcepts: ['State Management', 'API Integration'],
    mapJsonPath: '/example-maps/example1.json', // Added mapJsonPath
  },
  {
    key: 'ex2',
    name: 'Example Project 2',
    description: 'Desc 2',
    imageUrl: '/images/example2.png',
    tags: ['Python', 'Game'],
    lastUpdated: '2024-07-27',
    estimatedComplexity: 'High',
    coreConcepts: ['Game Loop', 'AI Mocks'],
    mapJsonPath: '/example-maps/example2.json',
  },
];

vi.mock('@/lib/example-data', () => ({
  exampleProjects: mockExampleProjectList,
}));

describe('ExamplesPage (/app/(app)/examples/page.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure necessary mocks from next/navigation are setup if tests interact with router/params
    // For this page, useRouter is used.
    const { __setMockRouter } = vi.hoisted(
      () => import('@/tests/__mocks__/next/navigation')
    );
    __setMockRouter({ push: vi.fn(), replace: vi.fn() });
  });

  it('should render DashboardHeader and example project cards', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false, // Authenticated user
      isAuthenticated: true,
      user: { id: 'test-user' },
      isLoading: false,
    });

    render(<ExamplesPage />);

    expect(screen.getByTestId('dashboard-header')).toBeInTheDocument();
    // The title is "Example Project Gallery"
    expect(screen.getByText('Example Project Gallery')).toBeInTheDocument();

    // Check for actual card content based on mockExampleProjectList
    expect(screen.getByText('Example Project 1')).toBeInTheDocument();
    expect(screen.getByText('Desc 1')).toBeInTheDocument();
    expect(screen.getByText('Example Project 2')).toBeInTheDocument();
    expect(screen.getByText('Desc 2')).toBeInTheDocument();
  });

  it('should render GuestModeCtaBanner when in a guest session', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: true,
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });

    render(<ExamplesPage />);
    expect(screen.getByTestId('guest-cta-banner')).toBeInTheDocument();
  });

  it('should NOT render GuestModeCtaBanner when not in a guest session (authenticated user)', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false,
      isAuthenticated: true,
      user: { id: 'test-user' },
      isLoading: false,
    });

    render(<ExamplesPage />);
    expect(screen.queryByTestId('guest-cta-banner')).toBeNull();
  });

  it('should show "View Example" button for all users, and "Copy & Edit" for guests', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: true, // Guest user
      isAuthenticated: false,
      user: null,
      isLoading: false,
    });

    render(<ExamplesPage />);

    // For Example 1
    const card1 =
      screen.getByText('Example Project 1').closest('[data-testid^="card-"]') ||
      screen.getByText('Example Project 1').closest('div.flex.flex-col');
    expect(
      within(card1!).getByRole('button', { name: /view example/i })
    ).toBeInTheDocument();
    expect(
      within(card1!).getByRole('button', { name: /copy & edit/i })
    ).toBeInTheDocument();
  });

  it('should show only "View Example" button for authenticated users', () => {
    (useAuth as vi.Mock).mockReturnValue({
      isGuestSession: false, // Authenticated user
      isAuthenticated: true,
      user: { id: 'test-user' },
      isLoading: false,
    });

    render(<ExamplesPage />);

    const card1 = screen
      .getByText('Example Project 1')
      .closest('div.flex.flex-col');
    expect(
      within(card1!).getByRole('button', { name: /view example/i })
    ).toBeInTheDocument();
    expect(
      within(card1!).queryByRole('button', { name: /copy & edit/i })
    ).toBeNull();
  });
});
