import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AuthProvider, useAuth } from './auth-context';
import { act, renderHook } from '@testing-library/react';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => {
  const mockSupabase = {
    auth: {
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  } as unknown as SupabaseClient;
  return { supabase: mockSupabase };
});

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(), // Added replace mock
  }),
  usePathname: () => '/',
  useSearchParams: () => ({
    get: vi.fn((key: string) => {
      if (key === 'redirectTo') return '/concept-maps/editor/example-123';
      if (key === 'action') return 'copyExample';
      if (key === 'exampleMapId') return 'example-123';
      return null;
    }),
  }),
}));


// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});


describe('AuthContext - Guest Mode', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    // Ensure user is null and no session initially for most tests
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('INITIAL_SESSION', null); // Simulate initial state with no session
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockSupabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });

  });

  it('should initialize with isGuestSession as false if no guest status in localStorage', () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isGuestSession).toBe(false);
  });

  it('should initialize with isGuestSession as true if guest status is in localStorage', () => {
    localStorageMock.setItem('isGuestSession', 'true');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isGuestSession).toBe(true);
  });

  it('startGuestSession should set isGuestSession to true and update localStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await act(async () => {
      result.current.startGuestSession();
    });
    expect(result.current.isGuestSession).toBe(true);
    expect(localStorageMock.getItem('isGuestSession')).toBe('true');
    expect(result.current.user).toBeNull(); // Ensure user is cleared
    expect(result.current.profile).toBeNull(); // Ensure profile is cleared
  });

  it('clearGuestSession should set isGuestSession to false and remove from localStorage', async () => {
    // Start as guest
    localStorageMock.setItem('isGuestSession', 'true');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isGuestSession).toBe(true); // Pre-condition

    await act(async () => {
      result.current.clearGuestSession();
    });

    expect(result.current.isGuestSession).toBe(false);
    expect(localStorageMock.getItem('isGuestSession')).toBeNull();
  });

  it('logging in should clear guest session status', async () => {
    // Start as guest
    localStorageMock.setItem('isGuestSession', 'true');
    const { result: authHookResult } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(authHookResult.current.isGuestSession).toBe(true); // Pre-condition

    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockSession = { access_token: 'token', user: mockUser };
    const mockProfile = { id: 'user-123', full_name: 'Test User', email: 'test@example.com', role: 'student' };

    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
    (mockSupabase.from('profiles').select().eq().single as vi.Mock).mockResolvedValueOnce({ data: mockProfile, error: null });

    // Simulate onAuthStateChange emitting a SIGNED_IN event AFTER signInWithPassword completes
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      // Initial call
      callback('INITIAL_SESSION', null);
      // Simulate sign-in event
      setTimeout(() => callback('SIGNED_IN', mockSession as any), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      await authHookResult.current.login('test@example.com', 'password');
    });

    // Need to wait for effects from onAuthStateChange
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10)); // Wait for state updates
    });

    expect(authHookResult.current.isGuestSession).toBe(false);
    expect(localStorageMock.getItem('isGuestSession')).toBeNull();
    expect(authHookResult.current.user?.id).toBe(mockUser.id);
    expect(authHookResult.current.profile?.full_name).toBe(mockProfile.full_name);
  });

  it('signing up should clear guest session status', async () => {
    localStorageMock.setItem('isGuestSession', 'true');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isGuestSession).toBe(true);

    const mockUser = { id: 'new-user-456', email: 'new@example.com', role: 'student' };
    const mockSession = { access_token: 'new_token', user: mockUser };
     const mockNewProfile = { id: 'new-user-456', full_name: 'New User', email: 'new@example.com', role: 'student' };


    mockSupabase.auth.signUp.mockResolvedValueOnce({ data: { user: mockUser, session: mockSession }, error: null });
    // Mock profile creation userService.createUserProfile
    (mockSupabase.from('profiles').insert.mockReturnThis().single as vi.Mock).mockResolvedValueOnce({ data: mockNewProfile, error: null });
     // Mock profile fetching after creation (or initial fetch)
    (mockSupabase.from('profiles').select().eq().single as vi.Mock)
        .mockResolvedValueOnce({ data: null, error: { message: "Not found initially for new user", code: "PGRST116"} }) // Simulate not found initially
        .mockResolvedValueOnce({ data: mockNewProfile, error: null }); // Found after creation by onAuthStateChange logic


    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('INITIAL_SESSION', null);
      setTimeout(() => callback('SIGNED_IN', mockSession as any), 0);
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      await result.current.signUp('New User', 'new@example.com', 'password', 'student');
    });
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isGuestSession).toBe(false);
    expect(localStorageMock.getItem('isGuestSession')).toBeNull();
    expect(result.current.user?.email).toBe('new@example.com');
    expect(result.current.profile?.full_name).toBe('New User');
  });

  it('logout should clear guest session if it was active (though typically user would be logged in)', async () => {
    // Start as guest
    localStorageMock.setItem('isGuestSession', 'true');
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isGuestSession).toBe(true);

    // Even if logout is called in a guest session, it should clear it.
    // Supabase signOut will be called, onAuthStateChange will trigger SIGNED_OUT.
    mockSupabase.auth.signOut.mockResolvedValueOnce({ error: null });
    mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
      callback('INITIAL_SESSION', null); // initial state
      setTimeout(() => callback('SIGNED_OUT', null), 0); // Simulate sign out
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    await act(async () => {
      await result.current.logout();
    });
    await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.isGuestSession).toBe(false);
    expect(localStorageMock.getItem('isGuestSession')).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
  });

  // More tests could be added for the redirectTo logic after login when coming from a guest action.
  // This often involves mocking router and searchParams more extensively.
  // For now, this covers the core guest session state management.
});
