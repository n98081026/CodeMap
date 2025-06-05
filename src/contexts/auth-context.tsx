"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getUserById as fetchSupabaseUserProfile, updateUser as updateUserProfileService, createUserProfile } from '@/services/users/userService';
import { useToast } from '@/hooks/use-toast';


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateCurrentUserData: (updatedFields: Partial<User>) => Promise<void>;
  setTestUserRole: (newRole: UserRole) => void; // Keep for testing convenience if desired
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const fetchAndSetSupabaseUser = useCallback(async (supabaseAuthUser: SupabaseUser | null, isRegistering: boolean = false, registrationDetails?: {name: string, role: UserRole}) => {
    if (!supabaseAuthUser) {
      setUser(null);
      return;
    }
    try {
      let profile = await fetchSupabaseUserProfile(supabaseAuthUser.id);
      
      if (!profile && isRegistering && registrationDetails && supabaseAuthUser.email) {
        console.log(`Profile not found for new user ${supabaseAuthUser.id}, attempting to create it.`);
        try {
            profile = await createUserProfile(supabaseAuthUser.id, registrationDetails.name, supabaseAuthUser.email, registrationDetails.role);
        } catch (profileCreationError) {
            console.error("Failed to create profile for new user:", profileCreationError);
            // Critical error: user exists in auth but not in profiles. Sign them out to avoid inconsistent state.
            await supabase.auth.signOut();
            setUser(null);
            throw new Error(`User registered in Auth, but profile creation failed: ${(profileCreationError as Error).message}. Please contact support or try registering again.`);
        }
      }
      
      if (profile) {
        setUser(profile);
      } else if (!isRegistering) { // Only warn if not in the process of registering (where profile might not exist yet)
        console.warn(`Profile not found for Supabase user ${supabaseAuthUser.id} in 'profiles' table. This might be due to a delay or misconfiguration in profile creation (e.g., Supabase trigger). Falling back to basic user object from auth data if available.`);
        // Fallback to basic user object from auth metadata if profile fetch truly fails post-registration
        setUser({
          id: supabaseAuthUser.id,
          email: supabaseAuthUser.email || '',
          name: supabaseAuthUser.user_metadata?.full_name || supabaseAuthUser.user_metadata?.name || supabaseAuthUser.email?.split('@')[0] || 'New User',
          role: (supabaseAuthUser.user_metadata?.user_role as UserRole) || UserRole.STUDENT,
        });
      } else if (!profile && !isRegistering) {
         // If still no profile after checks and not registering, this is an issue.
         console.error(`CRITICAL: Profile for user ${supabaseAuthUser.id} not found and not during registration. Logging out to prevent inconsistent state.`);
         await supabase.auth.signOut();
         setUser(null);
      }

    } catch (error) {
      console.error("Error fetching or creating user profile from 'profiles' table:", error);
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const supabaseAuthUser = session?.user ?? null;
      if (event === 'SIGNED_IN') {
        // If this is a fresh sign-in, registrationDetails might not be available here.
        // fetchAndSetSupabaseUser will handle profile fetching.
        // If it was a registration, the `register` function should have passed details.
        await fetchAndSetSupabaseUser(supabaseAuthUser);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'USER_UPDATED' && supabaseAuthUser) {
        // If user metadata in Supabase Auth changes (e.g., email confirmed), re-fetch profile
        await fetchAndSetSupabaseUser(supabaseAuthUser);
      }
      // Other events like PASSWORD_RECOVERY, TOKEN_REFRESHED might not need immediate profile re-fetch
      // unless specific profile data depends on them.
      setIsLoading(false);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
         await fetchAndSetSupabaseUser(session.user);
      }
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
      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");

      // onAuthStateChange will trigger fetchAndSetSupabaseUser, which includes role check
      // However, for immediate feedback during login, we can pre-fetch and check role here.
      const fetchedProfile = await fetchSupabaseUserProfile(sessionData.user.id);
      if (fetchedProfile) {
        if (fetchedProfile.role !== role) {
            await supabase.auth.signOut();
            throw new Error(`Role mismatch. Expected ${role}, but your account role is ${fetchedProfile.role}.`);
        }
        setUser(fetchedProfile); // Optimistically set user for faster UI update
         switch (fetchedProfile.role) {
            case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
            case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
            case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
            default: router.replace('/login'); // Should not happen
        }
      } else {
          await supabase.auth.signOut();
          throw new Error("User profile not found after Supabase login. Please ensure your profile exists in the 'profiles' table or contact support.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      setIsLoading(false);
      throw error;
    }
    // setIsLoading(false) will be handled by onAuthStateChange
  }, [router, fetchSupabaseUserProfile]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { // This data is for Supabase Auth metadata.
            full_name: name,
            user_role: role
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned from Supabase Auth.");
      
      // After Supabase Auth user is created, try to create the profile in our 'profiles' table.
      // This is crucial if no DB trigger is set up.
      try {
        await createUserProfile(signUpData.user.id, name, email, role);
        toast({
          title: "Registration Almost Complete!",
          description: "Your account has been created. If email confirmation is required by your Supabase project, please check your email to confirm. Then you can log in.",
          duration: 7000,
        });
      } catch (profileError) {
        // This is a tricky state: auth user exists, but profile creation failed.
        // Best to inform the user and possibly guide them to contact support.
        // For now, rethrow the error. Ideally, we might want to clean up the auth user if profile creation fails robustly.
        console.error("Profile creation failed after Supabase signup:", profileError);
        throw new Error(`Auth registration successful, but profile creation failed: ${(profileError as Error).message}. Please try logging in, or contact support if issues persist.`);
      }
      
      // Don't automatically sign in the user here. Let them confirm email if needed and then log in.
      // The onAuthStateChange listener will not find a session until email is confirmed (if enabled).
      router.push('/login');

    } catch (error) {
      console.error("Registration process failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null); // Optimistically clear user for immediate UI update
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Supabase signout error:", error);
    }
    // Redirect to login page, regardless of mock or real logout
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

    try {
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        console.warn("Attempting to update email in 'profiles' table. This does NOT change the Supabase Auth email automatically. A separate flow (e.g., user re-authentication and Supabase Auth update) is needed for full email change.");
      }

      const updatedProfile = await updateUserProfileService(currentContextUser.id, updatedFields);

      if (updatedProfile) {
        setUser(updatedProfile);
      } else {
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt. Re-fetching.`);
        const {data: {user: supabaseAuthUserNow}} = await supabase.auth.getUser();
        if (supabaseAuthUserNow) await fetchAndSetSupabaseUser(supabaseAuthUserNow);
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        throw error;
    }
  }, [fetchAndSetSupabaseUser]);

  const setTestUserRole = useCallback((newRole: UserRole) => {
    // This function is primarily for local testing and does NOT persist role changes to the backend.
    // It's kept for development convenience if switching roles of mock users or temporarily overriding a real user's role LOCALLY is needed.
    setUser(prevUser => {
      if (prevUser) {
        // For actual users, this is a local override for testing.
        // Proper role change requires backend logic and possibly admin approval.
        console.warn(`Locally overriding user role to ${newRole} for testing. This is NOT saved to the database.`);
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