
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser, Subscription } from '@supabase/supabase-js';
import { getUserById } from '@/services/users/userService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
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

  const fetchAndSetUserProfile = useCallback(async (supabaseUser: SupabaseUser) => {
    try {
      const profile = await getUserById(supabaseUser.id);
      if (profile) {
        setUser(profile);
      } else {
        console.warn(`Profile not found for user ${supabaseUser.id} in 'profiles' table. Setting basic user object. Ensure a profile is created for new users (e.g., via Supabase Function trigger).`);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'New User',
          role: (supabaseUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Consider signing out if profile fetch fails critically, to prevent inconsistent state
      // await supabase.auth.signOut(); // Uncomment if strict profile requirement
      // setUser(null);
      // For now, allow basic user object from auth as fallback
       setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'New User (Profile Error)',
          role: (supabaseUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
        });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setIsLoading(true); // Set loading true at the start of handling an auth event
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // No need to clear localStorage manually for Supabase session items
          if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
            router.push('/login');
          }
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          await fetchAndSetUserProfile(session.user);
        } else if (event === 'INITIAL_SESSION' && !session) {
           setUser(null);
        } else if (event === 'USER_UPDATED' && session?.user) {
          // If user metadata or email/phone changes, re-fetch profile
          await fetchAndSetUserProfile(session.user);
        }
        // Set loading false after the specific event has been processed
        setIsLoading(false);
      }
    );
    
    // Check initial session state once listener is set up
    // This handles the case where the user is already logged in when the app loads
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchAndSetUserProfile(session.user);
      }
      setIsLoading(false); // Ensure loading is set to false after initial check
    }).catch(() => {
      setIsLoading(false); // Also set loading false on error during getSession
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchAndSetUserProfile, router, pathname]);


  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange will handle setting user and profile
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name, // Pass name and role in options.data
            user_role: role  // These can be used by a Supabase Function trigger
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");
      
      // For users with email confirmation enabled, Supabase sends a confirmation email.
      // The user state will update via onAuthStateChange once confirmed (or immediately if auto-confirmed).
      // If your Supabase project auto-confirms users, they will be logged in.
      // If email confirmation is required, they will need to confirm before logging in.
      alert("Registration successful! Please check your email to confirm your account if required by your setup.");
      // Redirect to login, or to a "check your email" page.
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
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
    }
    // setUser(null) and router.push will be handled by onAuthStateChange 'SIGNED_OUT' event
    setIsLoading(false);
  }, []);
  
  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    if (!user) return;
    // This function should update the 'profiles' table in Supabase
    // and then update the local user state.
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ 
                name: updatedFields.name, 
                email: updatedFields.email, 
                // role: updatedFields.role, // Role updates might be restricted
                updated_at: new Date().toISOString() 
            })
            .eq('id', user.id)
            .select()
            .single();

        if (error) throw error;
        if (data) {
            setUser(data as User); // Update local state with the new profile data
        }
    } catch (error) {
        console.error("Failed to update user profile in Supabase:", error);
        // Optionally, revert local state or show error to user
    }
    console.warn("updateCurrentUserData updated. Ensure RLS policies allow profile updates.");
  }, [user]);

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
