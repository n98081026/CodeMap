import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Navbar } from '../navbar';

import { useAuth } from '@/contexts/auth-context';

// Mock child components to isolate Navbar
vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <div data-testid="mock-sidebar-trigger" />,
}));

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown-menu">{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown-trigger">{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-dropdown-content">{children}</div>,
  DropdownMenuItem: ({ children, ...props }: { children: React.ReactNode }) => <div {...props}>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/auth-context');
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('Navbar', () => {
  const mockLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render navbar with logo when user is not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('CodeMap')).toBeInTheDocument();
    expect(screen.getByTestId('icon-moon')).toBeInTheDocument();
  });

  it('should render user dropdown when authenticated', () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'student',
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('CodeMap')).toBeInTheDocument();
    // With the mock, the content is rendered immediately
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should show login button when not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByRole('link', { name: /Login/i })).toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'student',
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(<Navbar />);

    // With the mock, the content is rendered immediately
    const logoutButton = screen.getByText('Log out');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
