import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Navbar } from '../navbar';
import { useAuth } from '@/contexts/auth-context';

// Mock the auth context
vi.mock('@/contexts/auth-context');

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: vi.fn(),
  }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Menu: () => <div data-testid="menu-icon" />,
  Sun: () => <div data-testid="sun-icon" />,
  Moon: () => <div data-testid="moon-icon" />,
  User: () => <div data-testid="user-icon" />,
  LogOut: () => <div data-testid="logout-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
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
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument(); // Theme toggle
  });

  it('should render user dropdown when authenticated', () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'student'
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('CodeMap')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
  });

  it('should show login and register links when not authenticated', () => {
    (useAuth as any).mockReturnValue({
      user: null,
      isAuthenticated: false,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Register')).toBeInTheDocument();
  });

  it('should call logout when logout button is clicked', () => {
    const mockUser = {
      id: 'user-123',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'student'
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(<Navbar />);

    // Click on user dropdown to open it
    const userButton = screen.getByText('John Doe');
    fireEvent.click(userButton);

    // Find and click logout button
    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('should display correct role badge', () => {
    const mockUser = {
      id: 'user-123',
      name: 'Jane Teacher',
      email: 'jane@example.com',
      role: 'teacher'
    };

    (useAuth as any).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      logout: mockLogout,
    });

    render(<Navbar />);

    expect(screen.getByText('Teacher')).toBeInTheDocument();
  });
});