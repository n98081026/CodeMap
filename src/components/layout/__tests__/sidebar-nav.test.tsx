import { render, screen } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SidebarNav } from '../sidebar-nav'; // Assuming named export

import { useAuth } from '@/contexts/auth-context';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// Mock next/navigation
const mockUsePathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ), // Mock Link
}));

describe('SidebarNav (/components/layout/sidebar-nav.tsx)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render null (nothing) when in a guest session', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isGuestSession: true,
      isLoading: false,
      isAuthenticated: false, // Guests are not "authenticated"
    });
    mockUsePathname.mockReturnValue('/examples'); // Pathname doesn't matter much if it returns null

    const { container } = render(<SidebarNav />);

    // Expect the component to render essentially nothing
    expect(container.firstChild).toBeNull();
  });

  it('should render null (nothing) if auth is loading', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null,
      profile: null,
      isGuestSession: false,
      isLoading: true, // Auth is loading
      isAuthenticated: false,
    });
    mockUsePathname.mockReturnValue('/student/dashboard');

    const { container } = render(<SidebarNav />);
    expect(container.firstChild).toBeNull();
  });

  it('should render null (nothing) if not authenticated, not guest, and no profile (edge case)', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: null, // Has user object from Supabase Auth, but profile fetch failed/pending
      profile: null,
      isGuestSession: false,
      isLoading: false,
      isAuthenticated: false, // No user & profile means not fully authenticated for app purposes
    });
    mockUsePathname.mockReturnValue('/some/path');

    const { container } = render(<SidebarNav />);
    expect(container.firstChild).toBeNull();
  });

  it('should render student links for an authenticated student', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'student-id' },
      profile: { role: 'student', id: 'student-id' /* other profile fields */ },
      isGuestSession: false,
      isLoading: false,
      isAuthenticated: true,
    });
    mockUsePathname.mockReturnValue('/student/dashboard');

    render(<SidebarNav />);

    expect(screen.getByText('Dashboard'));
    expect(screen.getByRole('link', { name: 'Dashboard' }));
    expect(screen.getByText('My Classrooms'));
    expect(screen.getByText('My Concept Maps'));
    expect(screen.getByText('Examples'));
  });

  it('should render teacher links for an authenticated teacher', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'teacher-id' },
      profile: { role: 'teacher', id: 'teacher-id' /* other profile fields */ },
      isGuestSession: false,
      isLoading: false,
      isAuthenticated: true,
    });
    mockUsePathname.mockReturnValue('/teacher/dashboard');

    render(<SidebarNav />);

    expect(screen.getByText('Dashboard'));
    expect(screen.getByRole('link', { name: 'Dashboard' }));
    expect(screen.getByText('Manage Classrooms'));
    expect(screen.getByText('Examples'));
  });

  it('should render admin links for an authenticated admin', () => {
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'admin-id' },
      profile: { role: 'admin', id: 'admin-id' /* other profile fields */ },
      isGuestSession: false,
      isLoading: false,
      isAuthenticated: true,
    });
    mockUsePathname.mockReturnValue('/admin/dashboard');

    render(<SidebarNav />);

    expect(screen.getByText('Dashboard'));
    expect(screen.getByRole('link', { name: 'Dashboard' }));
    expect(screen.getByText('User Management'));
    // Add other admin links if necessary
  });
});
