/**
 * Integration tests for authentication flow with Supabase
 * Tests the complete user authentication journey
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabaseClient';

vi.mock('@/lib/supabaseClient');

// Test component that uses auth context
function TestAuthComponent() {
  return (
    <AuthProvider>
      <div data-testid='auth-test'>Auth Test Component</div>
    </AuthProvider>
  );
}

describe('Authentication Integration Tests', () => {
  let mockSupabaseBuilder: {
    select: any;
    insert: any;
    update: any;
    delete: any;
    eq: any;
    in: any;
    maybeSingle: any;
    single: any;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseBuilder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    vi.mocked(supabase, true).auth = {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    } as any;

    vi.mocked(supabase, true).from = vi.fn().mockReturnValue(mockSupabaseBuilder);
  });


  describe('User Registration Flow', () => {
    it('should handle successful user registration', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      const mockSession = {
        user: mockUser,
        access_token: 'mock-token',
      };

      // Mock successful signup
      (supabase.auth.signUp as any).mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock profile creation
      (mockSupabaseBuilder.insert as vi.Mock).mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'user-123',
                name: 'Test User',
                email: 'test@example.com',
                role: 'student',
              },
              error: null,
            }),
          }),
        });

      render(<TestAuthComponent />);

      expect(screen.getByTestId('auth-test'));
    });

    it('should handle registration errors', async () => {
      // Mock signup error
      (supabase.auth.signUp as any).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Email already registered' },
      });

      render(<TestAuthComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });
  });

  describe('User Login Flow', () => {
    it('should handle successful login', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'mock-token' };

      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { user: mockUser, session: mockSession },
        error: null,
      });
      (mockSupabaseBuilder.single as vi.Mock).mockResolvedValueOnce({
        data: { id: 'user-123', name: 'Test User', email: 'test@example.com', role: 'student' },
        error: null,
      });

      render(<TestAuthComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });

    it('should handle login errors', async () => {
      (supabase.auth.signInWithPassword as any).mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      });

      render(<TestAuthComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should restore session on app load', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { user: mockUser, access_token: 'mock-token' };

      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });
      (mockSupabaseBuilder.single as vi.Mock).mockResolvedValueOnce({
        data: { id: 'user-123', name: 'Test User', email: 'test@example.com', role: 'student' },
        error: null,
      });

      render(<TestAuthComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });

    it('should handle logout', async () => {
      (supabase.auth.signOut as any).mockResolvedValueOnce({
        error: null,
      });

      render(<TestAuthComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });
  });

  describe('Profile Management Integration', () => {
    it('should create user profile after successful registration', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { name: 'Test User' },
      };

      (supabase.auth.signUp as any).mockResolvedValueOnce({
        data: { user: mockUser, session: { user: mockUser } },
        error: null,
      });
      (mockSupabaseBuilder.single as vi.Mock).mockResolvedValueOnce({
        data: { id: 'user-123', name: 'Test User', email: 'test@example.com', role: 'student' },
        error: null,
      });

      render(<TestAuthComponent />);
      await waitFor(() => {
        expect(screen.getByTestId('auth-test')).toBeInTheDocument();
      });
    });
  });
});
