
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById } from '@/services/users/userService'; // Assuming this now fetches from Supabase 'profiles' table

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string /* Removed role, as it's fetched from profile */) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateCurrentUserData: (updatedFields: Partial<User>) => void; // Needs to be re-evaluated for Supabase
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
        // Optionally, cache the fetched profile in localStorage if needed for quick UI updates
        // localStorage.setItem('codemapUserProfile', JSON.stringify(profile));
      } else {
        // Profile not found in 'profiles' table (e.g., new user, trigger hasn't run)
        // Set a basic user object from Supabase auth data; role/name might be missing/default
        console.warn(`Profile not found for user ${supabaseUser.id}. Setting basic user object.`);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.email?.split('@')[0] || 'New User', // Placeholder name
          role: UserRole.STUDENT, // Default role, or handle as 'unknown'
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // If profile fetch fails, sign out the user to prevent inconsistent state
      await supabase.auth.signOut();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setIsLoading(true);
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetUserProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          // localStorage.removeItem('codemapUserProfile');
          if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
            router.push('/login');
          }
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // Handle initial session (e.g., user already logged in from previous visit)
          await fetchAndSetUserProfile(session.user);
        } else if (event === 'INITIAL_SESSION' && !session) {
           // No active session on initial load
           setUser(null);
        }
        setIsLoading(false);
      }
    );
    // setIsLoading(false); // Moved inside listener to cover INITIAL_SESSION

    return () => {
      authListener?.unsubscribe();
    };
  }, [fetchAndSetUserProfile, router, pathname]);


  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        await fetchAndSetUserProfile(data.user); // Profile fetched by onAuthStateChange or here
        // Redirect logic is now primarily handled by pages based on user role from context
      } else {
        throw new Error("Login successful but no user data returned from Supabase.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      // localStorage.removeItem('codemapUserProfile');
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAndSetUserProfile]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // Supabase signUp handles user creation in auth.users
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        // options: { data: { full_name: name, user_role: role } } // metadata for trigger
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");
      
      // IMPORTANT: Profile creation in 'profiles' table is NOT handled here.
      // It should be handled by a Supabase Function (trigger on auth.users insert)
      // or a subsequent API call from the client after successful signUp.
      // The onAuthStateChange listener will pick up the SIGNED_IN event and attempt to fetch the profile.
      // For now, the user might see a basic profile until the 'profiles' record is created and fetched.
      
      // The user will be in a "pending confirmation" state if email confirmation is enabled.
      // `onAuthStateChange` will handle setting the user state once confirmed or if auto-confirmed.
      
      alert("Registration successful! Please check your email to confirm your account."); // Or use a toast
      router.push('/login'); // Redirect to login after showing confirmation message

    } catch (error) {
      console.error("Registration failed:", error);
      throw error; // Re-throw to be caught by form
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout error:", error);
      // Don't necessarily clear user state if Supabase fails, let onAuthStateChange handle
    }
    // setUser(null) and router.push will be handled by onAuthStateChange 'SIGNED_OUT' event
    setIsLoading(false);
  }, []);
  
  const updateCurrentUserData = useCallback((updatedFields: Partial<User>) => {
    // This function now needs to update the 'profiles' table via userService
    // and then potentially re-fetch or rely on onAuthStateChange if user metadata changes trigger it.
    // For now, let's assume a simple local update, but this needs to be connected to Supabase.
    setUser(currentUser => {
      if (currentUser) {
        const newUser = { ...currentUser, ...updatedFields };
        // localStorage.setItem('codemapUserProfile', JSON.stringify(newUser)); // If using localStorage for profile cache
        return newUser;
      }
      return null;
    });
    // TODO: Add API call to userService to persist these changes to Supabase 'profiles' table.
    console.warn("updateCurrentUserData only updated local state. TODO: Persist to Supabase.");
  }, []);

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
