
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
  setTestUserRole: (newRole: UserRole) => void; 
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
        console.log(`Profile not found for new user ${supabaseAuthUser.id} after registration, attempting to create it.`);
        try {
            profile = await createUserProfile(supabaseAuthUser.id, registrationDetails.name, supabaseAuthUser.email, registrationDetails.role);
            console.log(`Profile created for user ${supabaseAuthUser.id} during registration flow.`);
        } catch (profileCreationError) {
            console.error("Failed to create profile for new user during registration flow:", profileCreationError);
            // This is a critical error: user exists in Supabase Auth but not in our `profiles` table.
            // Sign them out to avoid an inconsistent state.
            await supabase.auth.signOut();
            setUser(null); // Clear local user state
            throw new Error(`User registered in Supabase Auth, but profile creation failed: ${(profileCreationError as Error).message}. Please contact support or try registering again.`);
        }
      }
      
      if (profile) {
        setUser(profile);
      } else if (!isRegistering) { 
        // If NOT registering and profile is still not found, this is a problem.
        console.error(`CRITICAL: Profile for user ${supabaseAuthUser.id} not found in 'profiles' table, and not during a registration flow. Logging out to prevent inconsistent state. This might indicate a missing profile or DB trigger failure.`);
        await supabase.auth.signOut();
        setUser(null);
      } else {
        // If isRegistering but profile is somehow still null (should have been created), also an issue.
        console.error(`CRITICAL: Profile for user ${supabaseAuthUser.id} is null even after attempting creation during registration. Logging out.`);
        await supabase.auth.signOut();
        setUser(null);
      }

    } catch (error) {
      console.error("Error in fetchAndSetSupabaseUser (fetching or creating user profile):", error);
      // Fallback: clear user state and sign out from Supabase to be safe
      await supabase.auth.signOut().catch(e => console.warn("Supabase signout failed during error handling:", e));
      setUser(null);
    }
  }, []);


  useEffect(() => {
    setIsLoading(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const supabaseAuthUser = session?.user ?? null;
      console.log('Auth state changed:', event, supabaseAuthUser ? supabaseAuthUser.id : 'no user');

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (supabaseAuthUser) {
            await fetchAndSetSupabaseUser(supabaseAuthUser);
        } else {
            setUser(null); // No user in session means not authenticated
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
      setIsLoading(false);
    });

    // Check initial session more robustly.
    // Using a timeout to ensure it doesn't get stuck if onAuthStateChange doesn't fire 'INITIAL_SESSION' quickly.
    const sessionCheckTimeout = setTimeout(() => {
        if (isLoading) { // if still loading after timeout, assume no session or error
            console.warn("Auth context timeout: still loading, assuming no active session initially.");
            setIsLoading(false);
            setUser(null);
        }
    }, 3000); // 3 seconds timeout


    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(sessionCheckTimeout); // Clear timeout if getSession resolves
      if (isLoading) { // Only proceed if timeout hasn't already set isLoading to false
        if (session?.user) {
          console.log('Initial session found:', session.user.id);
          await fetchAndSetSupabaseUser(session.user);
        } else {
          console.log('No initial session found.');
          setUser(null);
        }
        setIsLoading(false);
      }
    }).catch((error) => {
      clearTimeout(sessionCheckTimeout);
      if (isLoading) {
        console.error('Error getting initial session:', error);
        setUser(null);
        setIsLoading(false);
      }
    });


    return () => {
      subscription?.unsubscribe();
      clearTimeout(sessionCheckTimeout);
    };
  }, [fetchAndSetSupabaseUser, isLoading]); // Added isLoading to dependency array


  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");

      // onAuthStateChange will trigger fetchAndSetSupabaseUser, which includes role check.
      // We fetch profile here to validate role immediately.
      const fetchedProfile = await fetchSupabaseUserProfile(sessionData.user.id);
      if (fetchedProfile) {
        if (fetchedProfile.role !== role) {
            await supabase.auth.signOut(); // Sign out if role mismatch
            throw new Error(`Role mismatch. You selected '${role}', but your account role is '${fetchedProfile.role}'. Please log in with the correct role.`);
        }
        // setUser(fetchedProfile); // Optimistically set, but onAuthStateChange will confirm
         switch (fetchedProfile.role) {
            case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
            case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
            case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
            default: router.replace('/login'); 
        }
      } else {
          // This case should ideally be handled by a DB trigger that creates a profile on auth.users insert.
          // If no profile, it's an issue.
          await supabase.auth.signOut();
          throw new Error("User profile not found after Supabase login. Please ensure your profile exists or contact support.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null); // Ensure local state is cleared on failure
      setIsLoading(false); // Ensure loading is false on error
      throw error; // Re-throw for the form to handle
    }
    // setIsLoading(false); will be handled by onAuthStateChange
  }, [router, fetchSupabaseUserProfile]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name, // Store name in Supabase Auth metadata
            user_role: role,   // Store role in Supabase Auth metadata (useful for triggers)
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned from Supabase Auth.");
      
      // Explicitly create profile here. If a DB trigger exists, this might be redundant but safe.
      // The fetchAndSetSupabaseUser called by onAuthStateChange will pick up the created profile.
      await fetchAndSetSupabaseUser(signUpData.user, true, { name, role });

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. If email confirmation is required by your Supabase project, please check your email to confirm. Then you can log in.",
        duration: 10000, // Longer duration for this important message
      });
      
      router.push('/login'); // Redirect to login after registration

    } catch (error) {
      console.error("Registration process failed:", error);
      throw error; // Re-throw for the form to handle
    } finally {
      setIsLoading(false);
    }
  }, [router, fetchAndSetSupabaseUser, toast]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    setUser(null); 
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Supabase signout error:", error);
        // Even if Supabase signout fails, force redirect and clear local state
    }
    // Redirect to login page
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
      // Note: Updating email in the 'profiles' table doesn't automatically update Supabase Auth email.
      // That's a separate process usually involving user re-authentication and `supabase.auth.updateUser()`.
      // This function primarily updates the custom profile data.
      if (updatedFields.email && updatedFields.email !== currentContextUser.email) {
        console.warn("Attempting to update email in 'profiles' table. This does NOT change the Supabase Auth email automatically.");
      }

      const updatedProfile = await updateUserProfileService(currentContextUser.id, updatedFields);

      if (updatedProfile) {
        setUser(updatedProfile); // Update context user state
      } else {
        // If service returns null or throws, it's an error.
        // If it returns null indicating not found (shouldn't happen for current user), re-fetch.
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt. Re-fetching.`);
        const {data: {user: supabaseAuthUserNow}} = await supabase.auth.getUser();
        if (supabaseAuthUserNow) await fetchAndSetSupabaseUser(supabaseAuthUserNow);
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        throw error; // Re-throw for the calling component to handle
    }
  }, [fetchAndSetSupabaseUser]);

  // Kept for local testing convenience. Does NOT persist role changes to backend.
  const setTestUserRole = useCallback((newRole: UserRole) => {
    setUser(prevUser => {
      if (prevUser) {
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
