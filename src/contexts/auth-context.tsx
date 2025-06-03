
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById as fetchSupabaseUserProfile } from '@/services/users/userService'; // Renamed for clarity

// Define a mock admin user for development
const mockAdminUser: User = {
  id: 'admin-mock-id',
  name: 'Mock Admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateCurrentUserData: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Ref to hold the latest user state for use in callbacks without adding user to useEffect deps
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchAndSetUserProfile = useCallback(async (supabaseAuthUser: SupabaseUser) => {
    try {
      const profile = await fetchSupabaseUserProfile(supabaseAuthUser.id);
      if (profile) {
        setUser(profile);
      } else {
        console.warn(`Profile not found for Supabase user ${supabaseAuthUser.id}. Setting basic user object.`);
        setUser({
          id: supabaseAuthUser.id,
          email: supabaseAuthUser.email || '',
          name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.email?.split('@')[0] || 'New User',
          role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser({
        id: supabaseAuthUser.id,
        email: supabaseAuthUser.email || '',
        name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.email?.split('@')[0] || 'Error User',
        role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);

    const handleAuthChange = async (event: AuthChangeEvent, session: Session | null) => {
      const currentContextUser = userRef.current;

      if (currentContextUser?.id === mockAdminUser.id) {
        if (event === 'SIGNED_OUT') {
          setUser(null); // General sign out clears mock admin
        } else if (session?.user && session.user.id !== mockAdminUser.id) {
          await fetchAndSetUserProfile(session.user); // New real user session overrides mock admin
        } else {
          // Maintain mock admin state for other events or if session is null but not SIGNED_OUT
          setIsLoading(false);
          return;
        }
      } else {
        // Standard handling for non-mock users
        if (session?.user) {
          await fetchAndSetUserProfile(session.user);
        } else {
          setUser(null);
          if (event === 'SIGNED_OUT' && !pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
            router.push('/login');
          }
        }
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentContextUser = userRef.current;
      if (currentContextUser?.id === mockAdminUser.id) {
        setIsLoading(false);
        return;
      }
      if (session?.user) {
        await fetchAndSetUserProfile(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }).catch(() => {
      const currentContextUser = userRef.current;
      if (currentContextUser?.id !== mockAdminUser.id) {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAndSetUserProfile, router, pathname]); // No `user` or `userRef` in deps here.

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      if (role === UserRole.ADMIN) {
        console.log("Attempting mock admin login for:", email);
        setUser(mockAdminUser); // This directly sets the user state
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will handle fetching profile for real users.
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (role !== UserRole.ADMIN) { // Only clear user if it was a Supabase attempt that failed
          setUser(null);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [/* setUser, setIsLoading are stable */]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, user_role: role }
        }
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");
      alert("Registration successful! Please check your email to confirm your account if required. You will then be able to log in.");
      router.push('/login');
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const currentContextUser = userRef.current; // Use ref to get current user
    const isMockAdmin = currentContextUser?.id === mockAdminUser.id && currentContextUser?.role === UserRole.ADMIN;

    if (isMockAdmin) {
      console.log("Logging out mock admin");
      setUser(null);
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) console.error("Supabase signout error:", error);
      // setUser(null) and redirect will be handled by onAuthStateChange 'SIGNED_OUT' event
    }
    
    setIsLoading(false);
    // Manually redirect if onAuthStateChange doesn't (e.g., if it was mock admin)
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
        router.push('/login');
    }
  }, [router, pathname]); // Removed userRef from deps, it's a ref.

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    const currentContextUser = userRef.current;
    if (!currentContextUser) return;

    if (currentContextUser.id === mockAdminUser.id) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock admin user data updated locally:", updatedFields);
      return;
    }
    
    try {
      const updatesToApply: any = { updated_at: new Date().toISOString() };
      if (updatedFields.name) updatesToApply.name = updatedFields.name;
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
         // Note: Supabase auth email update is separate. This only updates profiles.
        updatesToApply.email = updatedFields.email;
      }
      // Role updates are generally not done this way.
      if (Object.keys(updatesToApply).length <= 1 && !updatesToApply.updated_at) return; // No actual field changes

      const { data, error } = await supabase
            .from('profiles')
            .update(updatesToApply)
            .eq('id', currentContextUser.id)
            .select()
            .single();
      if (error) throw error;
      if (data) setUser(data as User);
    } catch (error) {
        console.error("Failed to update user profile in Supabase:", error);
    }
  }, []); // userRef is not needed in deps

  const isAuthenticated = !!user;

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateCurrentUserData
  }), [user, isAuthenticated, isLoading, login, logout, register, updateCurrentUserData]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
