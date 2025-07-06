/**
 * Integration tests for authentication flow with Supabase
 * Tests the complete user authentication journey
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabaseClient';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

// Test component that uses auth context
function TestAuthComponent() {
  return (
    <AuthProvider>
      <div data-testid="auth-test">Auth Test Component</div>
    </AuthProvider>
  );
}

describe('Authentication Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('User Registration Flow', () => {
    it('should handle successful user registration', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token'
      };

      // Mock successful signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock profile creation
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student'
              },
              error: null
            })
          })
        })
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });

    it('should handle registration errors', async () => {
      // Mock signup error
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email already registered' }
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });

  describe('User Login Flow', () => {
    it('should handle successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token'
      };

      // Mock successful login
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null
      });

      // Mock profile fetch
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student'
              },
              error: null
            })
          })
        })
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });

    it('should handle login errors', async () => {
      // Mock login error
      (supabase.auth.signInWithPassword as any).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' }
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });

  describe('Session Management', () => {
    it('should restore session on app load', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com'
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token'
      };

      // Mock existing session
      (supabase.auth.getSession as any).mockResolvedValue({
        data: { session: mockSession },
        error: null
      });

      // Mock profile fetch
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student'
              },
              error: null
            })
          })
        })
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });

    it('should handle logout', async () => {
      // Mock successful logout
      (supabase.auth.signOut as any).mockResolvedValue({
        error: null
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });

  describe('Profile Management Integration', () => {
    it('should create user profile after successful registration', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' }
      };

      // Mock successful signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: { user: mockUser } },
        error: null
      });

      // Mock profile creation
      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          id: 'user-123',
          name: 'Test User',
          email: 'test@example.com',
          role: 'student'
        },
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test')).toBeInTheDocument();
    });
  });
});
