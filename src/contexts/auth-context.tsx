
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
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER } from '@/lib/config'; // Import shared constant and mock user

// --- REMOVED AUTH BYPASS CONSTANTS from here, now imported ---

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
    if (BYPASS_AUTH_FOR_TESTING) return; // Skip if bypassing

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
            await supabase.auth.signOut();
            setUser(null); 
            throw new Error(`User registered in Supabase Auth, but profile creation failed: ${(profileCreationError as Error).message}. Please contact support or try registering again.`);
        }
      }
      
      if (profile) {
        setUser(profile);
      } else if (!isRegistering) { 
        console.error(`CRITICAL: Profile for user ${supabaseAuthUser.id} not found in 'profiles' table, and not during a registration flow. Logging out to prevent inconsistent state.`);
        await supabase.auth.signOut();
        setUser(null);
      } else {
        console.error(`CRITICAL: Profile for user ${supabaseAuthUser.id} is null even after attempting creation during registration. Logging out.`);
        await supabase.auth.signOut();
        setUser(null);
      }

    } catch (error) {
      console.error("Error in fetchAndSetSupabaseUser (fetching or creating user profile):", error);
      await supabase.auth.signOut().catch(e => console.warn("Supabase signout failed during error handling:", e));
      setUser(null);
    }
  }, []);


  const initialAuthCheckCompleted = useRef(false);

  useEffect(() => {
    if (BYPASS_AUTH_FOR_TESTING) {
      console.warn("AuthContext: BYPASS_AUTH_FOR_TESTING is TRUE. Using mock user.");
      setUser(MOCK_STUDENT_USER); // Use imported mock user
      setIsLoading(false);
      initialAuthCheckCompleted.current = true;
      return; // Skip Supabase listeners and calls
    }

    if (initialAuthCheckCompleted.current && !fetchAndSetSupabaseUser) { 
        console.warn("AuthContext useEffect re-run after initial check, but fetchAndSetSupabaseUser might be undefined. Skipping listener setup.");
        return;
    }

    console.log("AuthContext useEffect: Setting up listeners and initial check. initialAuthCheckCompleted.current:", initialAuthCheckCompleted.current);
    setIsLoading(true); 

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthContext event: ${event}`, session?.user?.id || "no user");
      const supabaseAuthUser = session?.user ?? null;

      let needsLoadingStateUpdate = false;

      if (event === 'INITIAL_SESSION') {
        if (supabaseAuthUser) {
          await fetchAndSetSupabaseUser(supabaseAuthUser);
        } else {
          setUser(null);
        }
        if (!initialAuthCheckCompleted.current) {
            initialAuthCheckCompleted.current = true;
            needsLoadingStateUpdate = true;
            console.log("AuthContext: INITIAL_SESSION processed.");
        }
      } else if (event === 'SIGNED_IN') {
        if (supabaseAuthUser) {
          await fetchAndSetSupabaseUser(supabaseAuthUser);
        }
        if (!initialAuthCheckCompleted.current) {
            initialAuthCheckCompleted.current = true;
            needsLoadingStateUpdate = true;
            console.log("AuthContext: SIGNED_IN processed (initial auth likely).");
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        if (!initialAuthCheckCompleted.current) {
            initialAuthCheckCompleted.current = true;
            needsLoadingStateUpdate = true;
            console.log("AuthContext: SIGNED_OUT processed (initial auth likely no user).");
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (supabaseAuthUser) {
          await fetchAndSetSupabaseUser(supabaseAuthUser);
        } else {
          setUser(null);
        }
         if (!initialAuthCheckCompleted.current) {
            initialAuthCheckCompleted.current = true;
            needsLoadingStateUpdate = true;
             console.log("AuthContext: TOKEN_REFRESHED/USER_UPDATED processed (initial auth likely).");
        }
      }

      if (needsLoadingStateUpdate) {
        setIsLoading(false);
        console.log("AuthContext: isLoading set to false via onAuthStateChange event.");
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!initialAuthCheckCompleted.current) { 
        console.log("AuthContext getSession(): User:", session?.user?.id || "no user");
        if (session?.user) {
          await fetchAndSetSupabaseUser(session.user);
        } else {
          setUser(null);
        }
        initialAuthCheckCompleted.current = true;
        setIsLoading(false);
        console.log("AuthContext: getSession() processed, isLoading set to false.");
      } else {
         console.log("AuthContext getSession(): Initial auth check already completed by onAuthStateChange. Current user:", userRef.current?.id || "none");
      }
    }).catch(error => {
      if (!initialAuthCheckCompleted.current) {
        console.error("AuthContext getSession() error:", error);
        setUser(null);
        initialAuthCheckCompleted.current = true;
        setIsLoading(false);
        console.log("AuthContext: getSession() error, isLoading set to false.");
      }
    });

    return () => {
      subscription.unsubscribe();
      console.log("AuthContext: Unsubscribed from auth state changes.");
    };
  }, [fetchAndSetSupabaseUser]);


  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    if (BYPASS_AUTH_FOR_TESTING) {
      console.warn("Login attempt while BYPASS_AUTH_FOR_TESTING is true. No-op.");
      setUser(MOCK_STUDENT_USER); // Ensure mock user is set
      setIsLoading(false);
      // Simulate redirect based on mock user's role
      switch (MOCK_STUDENT_USER.role) {
          case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
          case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
          case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
          default: router.replace('/login');
      }
      return;
    }
    setIsLoading(true);
    try {
      const { error, data: sessionData } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!sessionData.user) throw new Error("Login successful but no user data returned from Supabase.");

      const fetchedProfile = await fetchSupabaseUserProfile(sessionData.user.id);
      if (fetchedProfile) {
        if (fetchedProfile.role !== role) {
            await supabase.auth.signOut(); 
            throw new Error(`Role mismatch. You selected '${role}', but your account role is '${fetchedProfile.role}'. Please log in with the correct role.`);
        }
         setUser(fetchedProfile);
         switch (fetchedProfile.role) {
            case UserRole.ADMIN: router.replace('/application/admin/dashboard'); break;
            case UserRole.TEACHER: router.replace('/application/teacher/dashboard'); break;
            case UserRole.STUDENT: router.replace('/application/student/dashboard'); break;
            default: router.replace('/login'); 
        }
      } else {
          await supabase.auth.signOut();
          throw new Error("User profile not found after Supabase login. Please ensure your profile exists or contact support.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null); 
      setIsLoading(false); 
      throw error; 
    }
  }, [router, fetchSupabaseUserProfile]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    if (BYPASS_AUTH_FOR_TESTING) {
      console.warn("Register attempt while BYPASS_AUTH_FOR_TESTING is true. No-op.");
      toast({ title: "Registration Skipped", description: "Auth bypass is active.", variant: "default" });
      return;
    }
    setIsLoading(true);
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { 
            full_name: name, 
            user_role: role,   
          }
        }
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Registration successful but no user data returned from Supabase Auth.");
      
      await fetchAndSetSupabaseUser(signUpData.user, true, { name, role });

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. If email confirmation is required by your Supabase project, please check your email to confirm. Then you can log in.",
        duration: 10000, 
      });
      
      router.push('/login'); 

    } catch (error) {
      console.error("Registration process failed:", error);
      setIsLoading(false);
      throw error; 
    }
  }, [router, fetchAndSetSupabaseUser, toast]);

  const logout = useCallback(async () => {
    if (BYPASS_AUTH_FOR_TESTING) {
      console.warn("Logout attempt while BYPASS_AUTH_FOR_TESTING is true. Simulating logout.");
      setUser(null);
      setIsLoading(false); // Important to set loading false
      router.replace('/login');
      return;
    }
    const currentPath = pathname; 
    console.log("AuthContext: logout called from path", currentPath);
    setIsLoading(true); 
    setUser(null); 
    const { error } = await supabase.auth.signOut();
    if (error) {
        console.error("Supabase signout error:", error);
    }
    
    if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register') && currentPath !== '/') {
        router.replace('/login');
    }
    setTimeout(() => {
        if(isLoading) setIsLoading(false);
    }, 500);

  }, [router, pathname, isLoading]); 

  const updateCurrentUserData = useCallback(async (updatedFields: Partial<User>) => {
    if (BYPASS_AUTH_FOR_TESTING) {
      setUser(prev => prev ? ({ ...prev, ...updatedFields }) : null);
      toast({ title: "Profile Update (Mocked)", description: "Bypass active, data updated locally." });
      return;
    }
    const currentContextUser = userRef.current; 
    if (!currentContextUser) {
      throw new Error("Cannot update user data: No current user in context.");
    }

    try {
      const updatedProfile = await updateUserProfileService(currentContextUser.id, updatedFields);

      if (updatedProfile) {
        setUser(updatedProfile); 
      } else {
        console.error(`Failed to get updated profile for user ${currentContextUser.id} after update attempt. Re-fetching Supabase Auth user.`);
        const {data: {user: supabaseAuthUserNow}} = await supabase.auth.getUser();
        if (supabaseAuthUserNow) await fetchAndSetSupabaseUser(supabaseAuthUserNow);
      }
    } catch (error) {
        console.error("Failed to update user profile in Supabase 'profiles' table:", error);
        throw error; 
    }
  }, [fetchAndSetSupabaseUser, toast]);

  const setTestUserRole = useCallback((newRole: UserRole) => {
    setUser(prevUser => {
      if (prevUser) {
        console.warn(`Locally overriding user role to ${newRole} for testing. This is NOT saved to the database. (Bypass_Auth: ${BYPASS_AUTH_FOR_TESTING})`);
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

