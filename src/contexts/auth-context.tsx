
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById as fetchSupabaseUserProfile, updateUser as updateUserProfileService } from '@/services/users/userService'; // Added updateUserProfileService

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
  updateCurrentUserData: (updatedFields: Partial<User>) => Promise<void>;
  setTestUserRole: (newRole: UserRole) => void; // Added for testing
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

      if (session?.user) { 
        if (isMockAdminSession && session.user.email !== mockAdminUser.email) {
          await fetchAndSetSupabaseUser(session.user);
        } else if (!isMockAdminSession) {
          await fetchAndSetSupabaseUser(session.user);
        }
      } else { 
        if (!isMockAdminSession) { 
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);
    
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
         await fetchAndSetSupabaseUser(session.user);
      } else {
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
        setUser(mockAdminUser); 
        setIsLoading(false); 
        
        if (pathname === '/login' || pathname === '/') {
            router.replace('/application/admin/dashboard');
        }
        return; 
      }
      
      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");
      // onAuthStateChange will handle fetching profile & setting user. setIsLoading(false) handled there.
      // Redirect based on role will be handled by page effects AFTER user is set by onAuthStateChange.
      const fetchedProfile = await fetchSupabaseUserProfile(sessionData.user.id);
      if (fetchedProfile) {
        // Check if Supabase profile role matches the role selected in the form
        if (fetchedProfile.role !== role) {
            await supabase.auth.signOut(); // Sign out if role mismatch
            throw new Error(`Role mismatch. Expected ${role}, but account role is ${fetchedProfile.role}.`);
        }
        setUser(fetchedProfile); // Set user to trigger redirect effects
         switch (fetchedProfile.role) {
            case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
            case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
            case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
            default: router.replace('/login');
        }
      } else {
          await supabase.auth.signOut();
          throw new Error("User profile not found after Supabase login.");
      }

    } catch (error) {
      console.error("Login failed:", error);
      if (!(email === mockAdminUser.email && role === UserRole.ADMIN)) {
          setUser(null);
      }
      setIsLoading(false);
      throw error;
    } 
  }, [router, pathname, fetchSupabaseUserProfile]);

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
      
      alert("Registration successful! If email confirmation is enabled, please check your email to confirm your account. You can then log in.");
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
    const currentContextUser = userRef.current;
    const isMockAdminSession = currentContextUser?.id === mockAdminUser.id;

    if (isMockAdminSession) {
      console.log("Logging out mock admin");
      setUser(null); 
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("Supabase signout error:", error);
          setUser(null);
      }
    }
    
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
        router.push('/login');
    }
    setIsLoading(false);
  }, [router, pathname]);

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    const currentContextUser = userRef.current;
    if (!currentContextUser) {
      throw new Error("Cannot update user data: No current user in context.");
    }

    if (currentContextUser.id === mockAdminUser.id) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock admin user data updated locally:", updatedFields);
      return;
    }
    
    try {
      // If email is being changed, this should be handled by Supabase auth update flows
      // This service function only updates the 'profiles' table.
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        console.warn("Attempting to update email in profiles table. Note: This does NOT change the Supabase Auth email automatically. A separate flow for changing auth email is needed.");
      }

      const updatedProfile = await updateUserProfileService(currentContextUser.id, updatedFields);
      
      if (updatedProfile) {
        setUser(updatedProfile);
      } else {
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt.`);
        // Attempt to refetch to ensure consistency
        const supabaseAuthUser = (await supabase.auth.getUser()).data.user;
        if (supabaseAuthUser) await fetchAndSetSupabaseUser(supabaseAuthUser);
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        throw error; 
    }
  }, [fetchAndSetSupabaseUser]);

  const setTestUserRole = useCallback((newRole: UserRole) => {
    setUser(prevUser => {
      if (prevUser) {
        // If it's the mock admin, we preserve its ID and email
        if (prevUser.id === mockAdminUser.id) {
          return { ...mockAdminUser, role: newRole };
        }
        // For other users, just update the role
        return { ...prevUser, role: newRole };
      }
      return null;
    });
  }, []);

  const isAuthenticated = !!user;

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    updateCurrentUserData,
    setTestUserRole // Added
  }), [user, isAuthenticated, isLoading, login, logout, register, updateCurrentUserData, setTestUserRole]);

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
