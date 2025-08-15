import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../auth-context';
import { UserRole } from '@/types';
import { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

// Mock the Supabase client at the module level
vi.mock('@/lib/supabaseClient', () => {
    const mockSupabaseAuth = {
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getSession: vi.fn(),
      getUser: vi.fn(),
    };

    const mockSupabaseClient = {
      auth: mockSupabaseAuth,
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(),
    };
    return { supabase: mockSupabaseClient };
});

import { supabase } from '@/lib/supabaseClient';

describe('AuthContext', () => {
  const mockSupabaseAuth = supabase.auth;

  beforeEach(() => {
    vi.clearAllMocks();
    // Make the mock synchronous to avoid flakiness with isLoading state
    mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
      callback('INITIAL_SESSION', null);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabaseAuth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('should initialize with user as null and isLoading as false', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it('should handle successful login and fetch user profile', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    const mockAuthUser = { id: 'user-123', email: 'test@example.com' } as SupabaseUser;
    const mockSession = { access_token: 'token', user: mockAuthUser };
    const mockProfile = { id: 'user-123', full_name: 'Test User', role: UserRole.STUDENT, email: 'test@example.com' };

    vi.mocked(mockSupabaseAuth.signInWithPassword).mockResolvedValueOnce({
      data: { user: mockAuthUser, session: mockSession as any },
      error: null,
    });
    vi.mocked(supabase.from('profiles').select().eq().maybeSingle).mockResolvedValueOnce({ data: mockProfile, error: null });

    await act(async () => {
      // Pass the correct role to the login function
      await result.current.login('test@example.com', 'password', UserRole.STUDENT);
    });

    act(() => {
        const onAuthStateChangeCallback = mockSupabaseAuth.onAuthStateChange.mock.calls[0][0];
        onAuthStateChangeCallback('SIGNED_IN', mockSession);
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.full_name).toBe(mockProfile.full_name);
    });
  });

  it('should handle login failure', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    const error = new Error('Invalid credentials');
    vi.mocked(mockSupabaseAuth.signInWithPassword).mockResolvedValueOnce({ data: {}, error: error as any });

    await expect(result.current.login('test@example.com', 'wrong-password', UserRole.STUDENT)).rejects.toThrow(error.message);
  });
});
