
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById as fetchSupabaseUserProfile, updateUser as updateUserProfileService } from '@/services/users/userService';

// Define mock users for development
const mockAdminUser: User = {
  id: 'admin-mock-id',
  name: 'Mock Admin',
  email: 'admin@example.com',
  role: UserRole.ADMIN,
};

const mockStudentUser: User = {
  id: 'student-test-id',
  name: 'Mock Student',
  email: 'student@example.com',
  role: UserRole.STUDENT,
};

const mockTeacherUser: User = {
  id: 'teacher-test-id',
  name: 'Mock Teacher',
  email: 'teacher@example.com',
  role: UserRole.TEACHER,
};


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateCurrentUserData: (updatedFields: Partial<User>) => Promise<void>;
  setTestUserRole: (newRole: UserRole) => void;
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

  const fetchAndSetSupabaseUser = useCallback(async (supabaseAuthUser: SupabaseUser | null) => {
    if (!supabaseAuthUser) {
      setUser(null);
      return;
    }
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
          role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT, // Default to student if role not in metadata
        });
      }
    } catch (error) {
      console.error("Error fetching user profile from 'profiles' table:", error);
      setUser({ // Fallback on error
        id: supabaseAuthUser.id,
        email: supabaseAuthUser.email || '',
        name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || 'Error User',
        role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
      });
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: AuthChangeEvent, session: Session | null) => {
      const currentContextUser = userRef.current;
      const isMockSession = currentContextUser?.id === mockAdminUser.id || currentContextUser?.id === mockStudentUser.id || currentContextUser?.id === mockTeacherUser.id;

      if (session?.user) {
        if (isMockSession && session.user.email !== currentContextUser?.email) {
          // If it was a mock session but Supabase now has a real different user, fetch real profile
          await fetchAndSetSupabaseUser(session.user);
        } else if (!isMockSession) {
          // If it wasn't a mock session, always fetch the real profile
          await fetchAndSetSupabaseUser(session.user);
        }
        // If it is still the same mock user's "session", do nothing, keep mock user
      } else {
        // No Supabase session
        if (!isMockSession) { // If not a mock session, clear the user
          setUser(null);
        }
        // If it was a mock session and Supabase session ended, keep the mock user until explicit logout
      }
      setIsLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
         await fetchAndSetSupabaseUser(session.user);
      }
      // If no session, and no mock user is currently set by explicit login, user remains null
      setIsLoading(false);
    }).catch(() => {
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
        setUser(mockAdminUser);
        setIsLoading(false);
        router.replace('/application/admin/dashboard');
        return;
      } else if (email === mockStudentUser.email && role === UserRole.STUDENT && password === "studentpass") {
        setUser(mockStudentUser);
        setIsLoading(false);
        router.replace('/application/student/dashboard');
        return;
      } else if (email === mockTeacherUser.email && role === UserRole.TEACHER && password === "teacherpass") {
        setUser(mockTeacherUser);
        setIsLoading(false);
        router.replace('/application/teacher/dashboard');
        return;
      }

      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");

      const fetchedProfile = await fetchSupabaseUserProfile(sessionData.user.id);
      if (fetchedProfile) {
        if (fetchedProfile.role !== role) {
            await supabase.auth.signOut(); // Sign out if role doesn't match selection
            throw new Error(`Role mismatch. Expected ${role}, but account role is ${fetchedProfile.role}.`);
        }
        setUser(fetchedProfile); // Set the full profile
         switch (fetchedProfile.role) {
            case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
            case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
            case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
            default: router.replace('/login');
        }
      } else {
          await supabase.auth.signOut(); // Sign out if profile couldn't be fetched
          throw new Error("User profile not found after Supabase login. Please ensure your profile is created in the 'profiles' table.");
      }

    } catch (error) {
      console.error("Login failed:", error);
      if (!(email === mockAdminUser.email && role === UserRole.ADMIN) && 
          !(email === mockStudentUser.email && role === UserRole.STUDENT) &&
          !(email === mockTeacherUser.email && role === UserRole.TEACHER) ) {
          setUser(null); // Clear user only if it wasn't a mock login attempt that failed for other reasons
      }
      setIsLoading(false);
      throw error; // Rethrow to be caught by form
    }
  }, [router, fetchSupabaseUserProfile]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { // This data is for Supabase Auth metadata, not directly for the 'profiles' table.
            full_name: name, // `full_name` is a common convention, ensure your profile creation logic (e.g. trigger) uses it.
            user_role: role   // `user_role` to store the intended role.
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned from Supabase Auth.");
      
      // At this point, Supabase Auth user is created.
      // A Supabase Database Function (trigger on auth.users insert) should create the corresponding 'profiles' table entry.
      // If you don't have such a trigger, you would call `createUserProfile` service here.
      // For this app, we assume a trigger handles profile creation.

      alert("Registration successful! If email confirmation is enabled in your Supabase project, please check your email to confirm your account. You can then log in.");
      router.push('/login');
    } catch (error) {
      console.error("Registration failed:", error);
      throw error; // Rethrow to be caught by form
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    const currentContextUser = userRef.current;
    const isMockSession = currentContextUser?.id === mockAdminUser.id || currentContextUser?.id === mockStudentUser.id || currentContextUser?.id === mockTeacherUser.id;

    setUser(null); // Always clear local user state first for immediate UI update

    if (!isMockSession) {
      const { error } = await supabase.auth.signOut();
      if (error) {
          console.error("Supabase signout error:", error);
          // User state is already null, so UI reflects logged-out state
      }
    } else {
      console.log("Logging out mock user");
    }
    
    // Redirect to login page regardless of mock or real logout
    if (!pathname.startsWith('/login') && !pathname.startsWith('/register') && pathname !== '/') {
        router.replace('/login');
    }
    setIsLoading(false);
  }, [router, pathname]);

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    const currentContextUser = userRef.current;
    if (!currentContextUser) {
      throw new Error("Cannot update user data: No current user in context.");
    }

    // Handle mock user updates locally
    if (currentContextUser.id === mockAdminUser.id || currentContextUser.id === mockStudentUser.id || currentContextUser.id === mockTeacherUser.id) {
      setUser(prevUser => prevUser ? { ...prevUser, ...updatedFields } : null);
      console.log("Mock user data updated locally:", updatedFields);
      return;
    }

    // Handle real user updates via Supabase
    try {
      // If email is being updated, Supabase Auth email must be updated separately (more complex flow involving confirmation).
      // This service only updates the 'profiles' table.
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        // Consider if this should throw an error or just update the profile's email field.
        // For simplicity, we'll allow updating the profile's email, but it won't change the auth email.
        console.warn("Updating email in 'profiles' table. This does NOT change the Supabase Auth email automatically. A separate flow for changing auth email is needed if desired.");
      }

      // Call the service to update the 'profiles' table
      const updatedProfile = await updateUserProfileService(currentContextUser.id, updatedFields);

      if (updatedProfile) {
        setUser(updatedProfile); // Update context with the latest profile from DB
      } else {
        // If update failed or returned null, try to re-fetch to ensure consistency
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt. Re-fetching.`);
        const supabaseAuthUser = (await supabase.auth.getUser()).data.user;
        if (supabaseAuthUser) await fetchAndSetSupabaseUser(supabaseAuthUser);
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        throw error; // Rethrow for the component to handle
    }
  }, [fetchAndSetSupabaseUser]);

  const setTestUserRole = useCallback((newRole: UserRole) => {
    setUser(prevUser => {
      if (prevUser) {
        if (prevUser.id === mockAdminUser.id) return { ...mockAdminUser, role: newRole };
        if (prevUser.id === mockStudentUser.id) return { ...mockStudentUser, role: newRole };
        if (prevUser.id === mockTeacherUser.id) return { ...mockTeacherUser, role: newRole };
        // For real users, this is a local override for testing.
        // A proper role change would involve updating the database.
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
    setTestUserRole
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
