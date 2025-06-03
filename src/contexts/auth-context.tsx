
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
  id: 'admin-mock-id', // A distinct ID that won't clash with real Supabase UUIDs
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
        console.warn(`Profile not found for Supabase user ${supabaseAuthUser.id}. Setting basic user object based on auth data. Ensure a profile is created via trigger or manually.`);
        // Create a basic user object if profile doesn't exist yet
        // This might happen if the profile creation trigger hasn't run or failed
        setUser({
          id: supabaseAuthUser.id,
          email: supabaseAuthUser.email || '',
          name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.email?.split('@')[0] || 'New User',
          role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT, // Role might be in metadata
        });
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
      // Fallback to basic user object on error
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

      if (currentContextUser?.id === mockAdminUser.id && currentContextUser?.email === mockAdminUser.email) {
        // If current user is the mock admin
        if (event === 'SIGNED_OUT') {
          setUser(null); // Clear mock admin on explicit sign out
        } else if (session?.user && session.user.email !== mockAdminUser.email) {
          // A real Supabase user session has started, override mock admin
          await fetchAndSetUserProfile(session.user);
        }
        // Otherwise (e.g., TOKEN_REFRESHED for mock admin, or session is null but not SIGNED_OUT),
        // maintain mock admin state.
      } else {
        // Standard handling for real Supabase users
        if (session?.user) {
          await fetchAndSetUserProfile(session.user);
        } else {
          setUser(null);
          // Only redirect if not on a public/auth page
          if (event === 'SIGNED_OUT' && !['/login', '/register', '/'].includes(pathname) && !pathname.startsWith('/application/(auth)')) {
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
       if (currentContextUser?.id === mockAdminUser.id && currentContextUser?.email === mockAdminUser.email) {
          // If mock admin is already set (e.g. by direct login), don't overwrite unless new session is different
          if (session?.user && session.user.email !== mockAdminUser.email) {
             await fetchAndSetUserProfile(session.user);
          } else {
            // Keep mock admin
          }
       } else if (session?.user) {
        await fetchAndSetUserProfile(session.user);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    }).catch(() => {
      // Catch potential errors during getSession, e.g. network issues
      const currentContextUser = userRef.current;
      if (!(currentContextUser?.id === mockAdminUser.id && currentContextUser?.email === mockAdminUser.email)) {
        setUser(null); // If not mock admin, clear user on error
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchAndSetUserProfile, router, pathname]);


  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      if (email === mockAdminUser.email && role === UserRole.ADMIN) {
        // Using a placeholder password check for mock admin, real apps should validate securely
        if (password === "adminpass") { // Simple password for mock admin
            console.log("Mock admin login successful for:", email);
            setUser(mockAdminUser);
        } else {
            throw new Error("Invalid credentials for mock admin.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // onAuthStateChange will handle fetching profile for real users.
      }
    } catch (error) {
      console.error("Login failed:", error);
      if (email !== mockAdminUser.email) {
          setUser(null);
      }
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
          data: { full_name: name, user_role: role } // Pass custom metadata
        }
      });
      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned.");

      // After Supabase auth.signUp, a 'profiles' table entry should be created.
      // This is often handled by a Supabase Database Function (trigger on auth.users insert).
      // If not, an explicit call to createUserProfile would be needed here, but that's less secure.
      // For now, we rely on onAuthStateChange to pick up the new user and fetch/create profile.
      
      alert("Registration successful! If email confirmation is enabled, please check your email. You can then log in.");
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
    localStorage.removeItem('user'); // Clear any old mock user session data

    const currentContextUser = userRef.current;
    const isMockAdmin = currentContextUser?.id === mockAdminUser.id && currentContextUser?.email === mockAdminUser.email;

    if (isMockAdmin) {
      console.log("Logging out mock admin");
      setUser(null); // This will trigger onAuthStateChange logic if it's listening to setUser
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("Supabase signout error:", error);
          // Even on error, try to clear local state
          setUser(null);
      }
      // setUser(null) and redirect will be handled by onAuthStateChange 'SIGNED_OUT' event for Supabase users
    }
    
    // Redirect after state update or error handling
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
        router.push('/login');
    }
    setIsLoading(false);
  }, [router, pathname]);

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    const currentContextUser = userRef.current;
    if (!currentContextUser) return;

    // Handle mock admin user update locally
    if (currentContextUser.id === mockAdminUser.id && currentContextUser.email === mockAdminUser.email) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock admin user data updated locally:", updatedFields);
      return;
    }
    
    // Handle real user profile update in Supabase 'profiles' table
    try {
      // Construct the update object for Supabase
      // Only include fields that are actually changing and are part of 'profiles' table
      const profileUpdates: Partial<User> & { updated_at?: string } = {};
      if (updatedFields.name && updatedFields.name !== currentContextUser.name) {
        profileUpdates.name = updatedFields.name;
      }
      // Email update requires Supabase auth.updateUser(), handled separately usually
      // For this example, if email is in updatedFields, we assume it's managed
      // This service should primarily update non-auth related profile data like 'name' or custom fields.
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        // This will only update the 'email' in the 'profiles' table.
        // Actual email change in Supabase Auth needs supabase.auth.updateUser({ email: newEmail }).
        profileUpdates.email = updatedFields.email;
      }
      // Role changes should be handled carefully and typically by an admin.
      // For simplicity, if 'role' is provided and different, update it.
      if (updatedFields.role && updatedFields.role !== currentContextUser.role) {
          profileUpdates.role = updatedFields.role;
      }


      if (Object.keys(profileUpdates).length === 0) {
        console.log("No actual changes to profile data provided for update.");
        return; // No changes to apply
      }
      profileUpdates.updated_at = new Date().toISOString();


      const { data, error } = await supabase
            .from('profiles') // Ensure this table name matches your Supabase setup
            .update(profileUpdates)
            .eq('id', currentContextUser.id)
            .select()
            .single();

      if (error) throw error;
      if (data) {
        setUser(data as User); // Update local context with the new profile data
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase:", error);
        // Optionally, re-throw or show a toast to the user
    }
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
