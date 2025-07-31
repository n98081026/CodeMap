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

  it('should render null when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
    });
    mockUsePathname.mockReturnValue('/examples');

    const { container } = render(<SidebarNav />);
    expect(container.firstChild).toBeNull();
  });

  it('should render student links for an authenticated student', () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'student' },
    });
    mockUsePathname.mockReturnValue('/application/student/dashboard');

    render(<SidebarNav />);

    expect(screen.getByRole('link', { name: 'My Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Classrooms' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Concept Maps' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Examples' })).toBeInTheDocument();
    // Things they should NOT see
    expect(screen.queryByRole('link', { name: 'Manage Classrooms' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin Panel' })).toBeNull();
  });

  it('should render teacher links for an authenticated teacher', () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'teacher' },
    });
    mockUsePathname.mockReturnValue('/application/teacher/dashboard');

    render(<SidebarNav />);

    expect(screen.getByRole('link', { name: 'Teacher Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Manage Classrooms' })).toBeInTheDocument();
    // Should also see student links
    expect(screen.getByRole('link', { name: 'My Concept Maps' })).toBeInTheDocument();
    // Things they should NOT see
    expect(screen.queryByRole('link', { name: 'My Classrooms' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Admin Panel' })).toBeNull();
  });

  it('should render admin links for an authenticated admin', () => {
    (useAuth as any).mockReturnValue({
      user: { role: 'admin' },
    });
    mockUsePathname.mockReturnValue('/application/admin/dashboard');

    render(<SidebarNav />);

    // Admin sees everything
    expect(screen.getByRole('link', { name: 'Admin Panel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'User Management' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Teacher Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'My Dashboard' })).toBeInTheDocument();
    // Should not see student-only classroom link
    expect(screen.queryByRole('link', { name: 'My Classrooms' })).toBeNull();
  });
});
