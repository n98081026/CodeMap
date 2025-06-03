
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById as fetchSupabaseUserProfile } from '@/services/users/userService';

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
  updateCurrentUserData: (updatedFields: Partial<User>) => Promise<void>; // Made async
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchAndSetSupabaseUser = useCallback(async (supabaseAuthUser: SupabaseUser) => {
    try {
      const profile = await fetchSupabaseUserProfile(supabaseAuthUser.id);
      if (profile) {
        setUser(profile);
      } else {
        console.warn(`Profile not found for Supabase user ${supabaseAuthUser.id} in 'profiles' table. This might be due to a delay or misconfiguration in profile creation (e.g., Supabase trigger). Falling back to basic user object from auth data.`);
        setUser({
          id: supabaseAuthUser.id,
          email: supabaseAuthUser.email || '',
          name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || supabaseAuthUser.email?.split('@')[0] || 'New User',
          role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
        });
      }
    } catch (error) {
      console.error("Error fetching user profile from 'profiles' table:", error);
      setUser({
        id: supabaseAuthUser.id,
        email: supabaseAuthUser.email || '',
        name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || 'Error User',
        role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const handleAuthChange = async (_event: AuthChangeEvent, session: Session | null) => {
      const currentContextUser = userRef.current;
      const isMockAdminSession = currentContextUser?.id === mockAdminUser.id;

      if (session?.user) { // A Supabase session exists
        if (isMockAdminSession && session.user.email !== mockAdminUser.email) {
          // If was mock admin, but now a real Supabase session for a different user started
          await fetchAndSetSupabaseUser(session.user);
        } else if (!isMockAdminSession) {
          // Regular Supabase user session
          await fetchAndSetSupabaseUser(session.user);
        }
        // If isMockAdminSession and session.user.email IS mockAdminUser.email, this case is unlikely/problematic
        // as mock admin login doesn't create a Supabase session for admin@example.com.
        // We prioritize real Supabase sessions.
      } else { // No Supabase session
        if (!isMockAdminSession) { // If not mock admin, and no Supabase session, then no user.
          setUser(null);
        }
        // If it was a mock admin session and Supabase session is null, keep mock admin unless explicitly logged out.
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    // Initial check for Supabase session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
         await fetchAndSetSupabaseUser(session.user);
      } else {
        // If no Supabase session, and not already mock admin, then no user.
        // If userRef.current is mockAdmin, it remains.
        if (userRef.current?.id !== mockAdminUser.id) {
            setUser(null);
        }
      }
      setIsLoading(false);
    }).catch(() => {
      if (userRef.current?.id !== mockAdminUser.id) {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchAndSetSupabaseUser]);


  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      if (email === mockAdminUser.email && role === UserRole.ADMIN && password === "adminpass") {
        console.log("Mock admin login successful for:", email);
        setUser(mockAdminUser); // Directly set mock admin user
        setIsLoading(false); // Mock admin login is synchronous for state
        // No redirect here, page effect handles it.
        return; 
      }
      
      // For real users, attempt Supabase login
      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");
      // onAuthStateChange will handle fetching profile & setting user for Supabase users
      // setIsLoading(false) will be called by onAuthStateChange handler.

    } catch (error) {
      console.error("Login failed:", error);
      // If it wasn't a mock admin attempt, ensure user state is cleared
      if (!(email === mockAdminUser.email && role === UserRole.ADMIN)) {
          setUser(null);
      }
      setIsLoading(false);
      throw error;
    } 
    // setIsLoading(false) for Supabase path is handled by onAuthStateChange
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name, // Standard Supabase metadata key
            user_role: role  // Custom metadata key
          }
        }
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");
      
      // After Supabase auth.signUp, the onAuthStateChange listener should detect the new user.
      // A Supabase Database Function (trigger on auth.users insert) is the recommended way
      // to create the corresponding 'profiles' table entry.
      // Example: CREATE FUNCTION public.handle_new_user() ...
      // If email confirmation is on, user won't be "SIGNED_IN" immediately.
      alert("Registration successful! If email confirmation is enabled, please check your email to confirm your account. You can then log in.");
      router.push('/login');
    } catch (error) {
      console.error("Registration failed:", error);
      throw error; // Re-throw to be caught by form
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const currentContextUser = userRef.current;
    const isMockAdminSession = currentContextUser?.id === mockAdminUser.id;

    if (isMockAdminSession) {
      console.log("Logging out mock admin");
      setUser(null); 
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("Supabase signout error:", error);
          // Even on error, try to clear local state for Supabase user
          setUser(null);
      }
      // setUser(null) for Supabase users is primarily handled by onAuthStateChange 'SIGNED_OUT' event.
    }
    
    // Common redirect logic after attempting logout
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
        router.push('/login');
    }
    setIsLoading(false);
  }, [router, pathname]);

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    const currentContextUser = userRef.current;
    if (!currentContextUser) {
      console.error("Cannot update user data: No current user in context.");
      return;
    }

    if (currentContextUser.id === mockAdminUser.id) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock admin user data updated locally:", updatedFields);
      return;
    }
    
    try {
      // If email is being changed, it needs special handling with Supabase Auth
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        // IMPORTANT: Updating email in auth.users requires a separate Supabase Auth call
        // and typically involves email confirmation. This should ideally be a distinct user action.
        // For this example, we'll update the `profiles` table email,
        // but the actual auth email remains unchanged unless `supabase.auth.updateUser({ email })` is called.
        console.warn("Attempting to update email in profiles table. Note: This does NOT change the Supabase Auth email automatically.");
      }

      const updatedProfile = await fetchSupabaseUserProfile(currentContextUser.id, updatedFields);
      
      if (updatedProfile) {
        setUser(updatedProfile);
      } else {
        // This case should ideally not happen if the user exists.
        // It might indicate an issue with the updateUser service function or data consistency.
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt.`);
        // Optionally, refetch the current user to ensure client state is consistent with DB.
        await fetchAndSetSupabaseUser(currentContextUser as SupabaseUser); // Re-cast if necessary, or fetch by ID
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        // Re-throw or show toast to user is an option here.
        throw error; 
    }
  }, [fetchAndSetSupabaseUser]);

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
