
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser, Subscription } from '@supabase/supabase-js';
import { getUserById } from '@/services/users/userService';

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
  login: (email: string, password: string, role: UserRole) => Promise<void>; // Added role
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
        console.warn(`Profile not found for Supabase user ${supabaseUser.id} in 'profiles' table. Setting basic user object. Ensure a profile is created for new users (e.g., via Supabase Function trigger).`);
        // Fallback to basic info from Supabase user if profile fetch fails or not found
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'New User',
          role: (supabaseUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT, // Attempt to get role from metadata
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setUser({ // Fallback user object on error
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'Error User',
        role: (supabaseUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setIsLoading(true);
        if (session?.user) {
          // Special handling for mock admin if previously "logged in" this way
          // This check might be too simplistic if real admin logs out and mock admin was "active"
          if (user && user.id === mockAdminUser.id && user.role === UserRole.ADMIN && event === 'SIGNED_OUT') {
            setUser(null); // Clear mock admin on explicit logout
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || (event === 'INITIAL_SESSION' && session.user)) {
            await fetchAndSetUserProfile(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
             router.push('/login');
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
           setUser(null);
        }
        setIsLoading(false);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchAndSetUserProfile(session.user);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchAndSetUserProfile, router, pathname, user]); // Added user to dependency array for mock admin check


  const login = useCallback(async (email: string, password: string, role: UserRole) => { // Added role
    setIsLoading(true);
    try {
      if (role === UserRole.ADMIN) {
        // For Admin role, use mock login
        console.log("Attempting mock admin login");
        setUser(mockAdminUser);
        // No actual Supabase session is created here.
      } else {
        // For Student and Teacher, use Supabase auth
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will handle setting user and profile for Supabase users
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null); // Clear user on any login error
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
            full_name: name,
            user_role: role
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");
      
      alert("Registration successful! Please check your email to confirm your account if required by your setup. You will then be able to log in.");
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
    // If current user is the mock admin, just clear local state
    if (user && user.id === mockAdminUser.id && user.role === UserRole.ADMIN) {
      setUser(null);
      // No Supabase signOut needed as there's no Supabase session for mock admin
      if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
         router.push('/login');
      }
    } else {
      // For real Supabase users, sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout error:", error);
      }
      // setUser(null) and router.push will be handled by onAuthStateChange 'SIGNED_OUT' event
    }
    setIsLoading(false);
  }, [user, router, pathname]);
  
  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    if (!user) return;

    // If it's the mock admin, update locally (won't persist)
    if (user.id === mockAdminUser.id) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock admin user data updated locally:", updatedFields);
      return;
    }
    
    // For real users, update in Supabase 'profiles' table
    // TODO: Implement actual Supabase update logic here for 'profiles' table
    // This requires ensuring the `profiles` table exists and RLS policies allow updates.
    try {
      const updatesToApply: any = { updated_at: new Date().toISOString() };
      if (updatedFields.name) updatesToApply.name = updatedFields.name;
      if (updatedFields.email) {
        // Updating email in Supabase Auth is a separate step, usually initiated by user
        // For now, we'll just update the profiles table email if changed.
        // This could lead to inconsistency if auth email isn't also changed.
        updatesToApply.email = updatedFields.email;
         console.warn("Email updated in profile, but Supabase Auth email might need separate update by user.");
      }
      // Role updates are typically restricted and not done via general profile update
      // if (updatedFields.role) updatesToApply.role = updatedFields.role;


      const { data, error } = await supabase
            .from('profiles')
            .update(updatesToApply)
            .eq('id', user.id)
            .select()
            .single();
      
      if (error) throw error;

      if (data) {
        setUser(data as User); // Update local state with the new profile data
      }
       console.log("User profile updated in Supabase:", data);
    } catch (error) {
        console.error("Failed to update user profile in Supabase:", error);
    }
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
