'use client';

import { useRouter, usePathname } from 'next/navigation';
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import type { User } from '@/types';
import type { ConceptMapData } from '@/types'; // Assuming ConceptMapData is defined
import type {
  AuthChangeEvent,
  Session,
  User as SupabaseUser,
} from '@supabase/supabase-js';
import type { ReactNode } from 'react';

import { useToast } from '@/hooks/use-toast';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_ADMIN_USER_V3,
  MOCK_STUDENT_USER,
  MOCK_TEACHER_USER,
} from '@/lib/config';
import { exampleProjects } from '@/lib/example-data';
import { Routes } from '@/lib/routes';
import { supabase } from '@/lib/supabaseClient';
import {
  createUserProfile,
  getUserById as fetchSupabaseUserProfile,
  updateUser as updateUserProfileService,
} from '@/services/users/userService';
import { UserRole } from '@/types';
// Ensure V3 is the default for bypass

// DEFAULT_BYPASS_USER is now MOCK_STUDENT_USER_V3 for student testing
const DEFAULT_BYPASS_USER = MOCK_STUDENT_USER;

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>;
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

  const fetchAndSetSupabaseUser = useCallback(
    async (
      supabaseAuthUser: SupabaseUser | null,
      isRegistering: boolean = false,
      registrationDetails?: { name: string; role: UserRole }
    ) => {
      if (BYPASS_AUTH_FOR_TESTING) return;

      if (!supabaseAuthUser) {
        setUser(null);
        return;
      }
      try {
        let profile = await fetchSupabaseUserProfile(supabaseAuthUser.id);

        if (
          !profile &&
          isRegistering &&
          registrationDetails &&
          supabaseAuthUser.email
        ) {
          console.log(
            `Profile not found for new user ${supabaseAuthUser.id} after registration, attempting to create it.`
          );
          profile = await createUserProfile(
            supabaseAuthUser.id,
            registrationDetails.name,
            supabaseAuthUser.email,
            registrationDetails.role
          );
          console.log(
            `Profile created for user ${supabaseAuthUser.id} during registration flow.`
          );
        }

        if (profile) {
          setUser(profile);
          // Check for pending actions like copying an example map
          const searchParams = new URLSearchParams(window.location.search);
          const action = searchParams.get('action');
          const exampleKey = searchParams.get('exampleKey');

          if (action === 'copyExample' && exampleKey && profile.id) {
            // Clear action params from URL to prevent re-processing
            const currentPath = window.location.pathname;
            router.replace(currentPath, undefined); // next/navigation way to clear query params

            // Delegate to a new function to handle the copy logic
            // This function will be defined outside or imported
            await handleCopyExampleAction(
              exampleKey,
              profile.id,
              router,
              toast
            );
          }
        } else if (!isRegistering) {
          console.warn(
            `Profile for user ${supabaseAuthUser.id} not found, and not during registration. Logging out.`
          );
          await supabase.auth.signOut();
          setUser(null);
        } else {
          console.warn(
            `Profile for user ${supabaseAuthUser.id} is null even after attempting creation during registration. Logging out.`
          );
          await supabase.auth.signOut();
          setUser(null);
        }
      } catch (error) {
        console.error('Error in fetchAndSetSupabaseUser:', error);
        toast({
          title: 'Error',
          description: `Failed to set user: ${(error as Error).message}`,
          variant: 'destructive',
        });
        await supabase.auth
          .signOut()
          .catch((e) =>
            console.warn('Supabase signout failed during error handling:', e)
          );
        setUser(null);
      }
    },
    [router, toast]
  ); // Added router and toast as dependencies

  const initialAuthCheckCompleted = useRef(false);

  useEffect(() => {
    if (BYPASS_AUTH_FOR_TESTING) {
      setIsLoading(false);
      return;
    }

    if (initialAuthCheckCompleted.current && !fetchAndSetSupabaseUser) {
      console.warn(
        'AuthContext useEffect re-run after initial check, but fetchAndSetSupabaseUser might be undefined. Skipping listener setup.'
      );
      return;
    }

    console.log(
      'AuthContext useEffect: Setting up listeners and initial check. initialAuthCheckCompleted.current:',
      initialAuthCheckCompleted.current
    );
    setIsLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        `AuthContext event: ${event}`,
        session?.user?.id || 'no user'
      );
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
          console.log('AuthContext: INITIAL_SESSION processed.');
        }
      } else if (event === 'SIGNED_IN') {
        if (supabaseAuthUser) {
          await fetchAndSetSupabaseUser(supabaseAuthUser);
        }
        if (!initialAuthCheckCompleted.current) {
          initialAuthCheckCompleted.current = true;
          needsLoadingStateUpdate = true;
          console.log(
            'AuthContext: SIGNED_IN processed (initial auth likely).'
          );
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        if (!initialAuthCheckCompleted.current) {
          initialAuthCheckCompleted.current = true;
          needsLoadingStateUpdate = true;
          console.log(
            'AuthContext: SIGNED_OUT processed (initial auth likely no user).'
          );
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
          console.log(
            'AuthContext: TOKEN_REFRESHED/USER_UPDATED processed (initial auth likely).'
          );
        }
      }

      if (needsLoadingStateUpdate) {
        setIsLoading(false);
        console.log(
          'AuthContext: isLoading set to false via onAuthStateChange event.'
        );
      }
    });

    supabase.auth
      .getSession()
      .then(async ({ data: { session } }) => {
        if (!initialAuthCheckCompleted.current) {
          console.log(
            'AuthContext getSession(): User:',
            session?.user?.id || 'no user'
          );
          if (session?.user) {
            await fetchAndSetSupabaseUser(session.user);
          } else {
            setUser(null);
          }
          initialAuthCheckCompleted.current = true;
          setIsLoading(false);
          console.log(
            'AuthContext: getSession() processed, isLoading set to false.'
          );
        } else {
          console.log(
            'AuthContext getSession(): Initial auth check already completed by onAuthStateChange. Current user:',
            userRef.current?.id || 'none'
          );
        }
      })
      .catch((error) => {
        if (!initialAuthCheckCompleted.current) {
          console.error('AuthContext getSession() error:', error);
          setUser(null);
          initialAuthCheckCompleted.current = true;
          setIsLoading(false);
          console.log(
            'AuthContext: getSession() error, isLoading set to false.'
          );
        }
      });

    return () => {
      subscription.unsubscribe();
      console.log('AuthContext: Unsubscribed from auth state changes.');
    };
  }, [fetchAndSetSupabaseUser]);

  const login = useCallback(
    async (email: string, password: string, role: UserRole) => {
      if (BYPASS_AUTH_FOR_TESTING) {
        console.warn(
          `Login attempt while BYPASS_AUTH_FOR_TESTING is true. Setting user to mock role: ${role}`
        );
        // Use the provided role to set the correct mock user
        setTestUserRole(role);
        setIsLoading(false);
        // Redirect based on the selected role
        switch (role) {
          case UserRole.ADMIN:
            router.replace(Routes.Admin.DASHBOARD);
            break;
          case UserRole.TEACHER:
            router.replace(Routes.Teacher.DASHBOARD);
            break;
          case UserRole.STUDENT:
            router.replace(Routes.Student.DASHBOARD);
            break;
          default:
            router.replace(Routes.LOGIN);
        }
        return;
      }
      setIsLoading(true);
      try {
        const { error, data: sessionData } =
          await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (!sessionData.user)
          throw new Error(
            'Login successful but no user data returned from Supabase.'
          );

        const fetchedProfile = await fetchSupabaseUserProfile(
          sessionData.user.id
        );
        if (fetchedProfile) {
          if (fetchedProfile.role !== role) {
            await supabase.auth.signOut();
            throw new Error(
              `Role mismatch. You selected '${role}', but your account role is '${fetchedProfile.role}'. Please log in with the correct role.`
            );
          }
          // fetchAndSetSupabaseUser will be called by onAuthStateChange, which handles setting user and post-login actions
          // No explicit setUser or router.replace here for that reason to avoid race conditions or duplicate logic.
          // Simply wait for onAuthStateChange to handle the SIGNED_IN event.
        } else {
          await supabase.auth.signOut();
          throw new Error(
            'User profile not found after Supabase login. Please ensure your profile exists or contact support.'
          );
        }
      } catch (error) {
        console.error('Login failed:', error);
        setUser(null);
        setIsLoading(false);
        throw error;
      }
    },
    [fetchSupabaseUserProfile]
  ); // Removed router from dependencies here, as onAuthStateChange handles redirection.

  const register = useCallback(
    async (name: string, email: string, password: string, role: UserRole) => {
      if (BYPASS_AUTH_FOR_TESTING) {
        console.warn(
          `Register attempt for role '${role}' while BYPASS_AUTH_FOR_TESTING is true. No-op.`
        );
        toast({
          title: 'Registration Skipped',
          description: `Auth bypass is active. Cannot register new '${role}' users.`,
          variant: 'default',
        });
        return;
      }
      setIsLoading(true);
      try {
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                full_name: name,
                user_role: role,
              },
            },
          });

        if (signUpError) throw signUpError;
        if (!signUpData.user)
          throw new Error(
            'Registration successful but no user data returned from Supabase Auth.'
          );

        await fetchAndSetSupabaseUser(signUpData.user, true, { name, role });

        toast({
          title: 'Registration Successful!',
          description:
            'Your account has been created. If email confirmation is required by your Supabase project, please check your email to confirm. Then you can log in.',
          duration: 10000,
        });
        // After successful Supabase Auth signUp, onAuthStateChange will trigger SIGNED_IN.
        // fetchAndSetSupabaseUser will then be called, which includes profile creation and post-login action handling.
        // It will also handle the toast for registration success.
        router.push(Routes.LOGIN); // Redirect to login, user might need to confirm email depending on Supabase settings.
      } catch (error) {
        console.error('Registration process failed:', error);
        setIsLoading(false);
        throw error;
      }
    },
    [router, fetchAndSetSupabaseUser]
  ); // Removed toast from here

  const logout = useCallback(async () => {
    if (BYPASS_AUTH_FOR_TESTING) {
      console.warn(
        'Logout attempt while BYPASS_AUTH_FOR_TESTING is true. Simulating logout.'
      );
      setUser(null);
      setIsLoading(false);
      router.replace(Routes.LOGIN);
      return;
    }
    const currentPath = pathname;
    console.log('AuthContext: logout called from path', currentPath);
    setIsLoading(true);
    setUser(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase signout error:', error);
    }

    if (
      !currentPath.startsWith(Routes.LOGIN) &&
      !currentPath.startsWith(Routes.REGISTER) &&
      currentPath !== Routes.HOME
    ) {
      router.replace(Routes.LOGIN);
    }
    setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 500);
  }, [router, pathname, isLoading]);

  const updateCurrentUserData = useCallback(
    async (updatedFields: Partial<User>) => {
      if (BYPASS_AUTH_FOR_TESTING) {
        setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
        toast({
          title: 'Profile Update (Mocked)',
          description: 'Bypass active, data updated locally.',
        });
        return;
      }
      const currentContextUser = userRef.current;
      if (!currentContextUser) {
        throw new Error('Cannot update user data: No current user in context.');
      }

      try {
        const updatedProfile = await updateUserProfileService(
          currentContextUser.id,
          updatedFields
        );

        if (updatedProfile) {
          setUser(updatedProfile);
        } else {
          console.error(
            `Failed to get updated profile for user ${currentContextUser.id} after update attempt. Re-fetching Supabase Auth user.`
          );
          const {
            data: { user: supabaseAuthUserNow },
          } = await supabase.auth.getUser();
          if (supabaseAuthUserNow)
            await fetchAndSetSupabaseUser(supabaseAuthUserNow);
        }
      } catch (error) {
        console.error(
          "Failed to update user profile in Supabase 'profiles' table:",
          error
        );
        throw error;
      }
    },
    [fetchAndSetSupabaseUser, toast]
  );

  const setTestUserRole = useCallback((newRole: UserRole) => {
    setUser(() => {
      let targetMockUser = MOCK_STUDENT_USER;
      if (newRole === UserRole.ADMIN) targetMockUser = MOCK_ADMIN_USER_V3;
      else if (newRole === UserRole.TEACHER) targetMockUser = MOCK_TEACHER_USER;

      console.warn(
        `Locally overriding user to MOCK ${newRole.toUpperCase()} USER for testing. (Bypass_Auth: ${BYPASS_AUTH_FOR_TESTING})`
      );
      return { ...targetMockUser };
    });
  }, []);

  const isAuthenticated = !!user;

  const contextValue = useMemo(
    () => ({
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      register,
      updateCurrentUserData,
      setTestUserRole,
    }),
    [
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      register,
      updateCurrentUserData,
      setTestUserRole,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function (can be moved to a service or utility file if it grows)
import { useConceptMapStore } from '@/stores/concept-map-store';

async function handleCopyExampleAction(
  exampleKey: string,
  userId: string,
  router: ReturnType<typeof useRouter>, // Use NextRouterInstance for type
  toast: (props: {
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive';
  }) => void
) {
  console.log(
    `Handling copyExample action for key: ${exampleKey}, user: ${userId}`
  );
  const exampleProject = exampleProjects.find((p) => p.key === exampleKey);
  if (!exampleProject) {
    toast({
      title: 'Error',
      description: 'Example project not found.',
      variant: 'destructive',
    });
    router.replace(Routes.Examples); // Or some other sensible default
    return;
  }

  try {
    const response = await fetch(exampleProject.mapJsonPath);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch example map data: ${response.statusText}`
      );
    }
    const exampleMapData = (await response.json()) as ConceptMapData;

    // Use a new store action or existing saveMap logic adapted for this
    // For now, let's assume a conceptual 'createMapFromExample' or adapt saveMap
    // This part requires careful integration with concept-map-store.ts

    const {
      initializeNewMap,
      setLoadedMap,
      mapName: currentMapName,
      mapData: currentMapData,
      isPublic: currentIsPublic,
      sharedWithClassroomId: currentSharedClassroomId,
    } = useConceptMapStore.getState();

    // 1. Initialize a new map context in the store, primarily to set the ownerId correctly.
    //    This sets `isNewMapMode = true` and `mapId = 'new'`.
    initializeNewMap(userId);

    // 2. Update the store's state with the example data.
    const newMapName = `Copy of ${exampleProject.name}`;
    useConceptMapStore.setState({
      mapName: newMapName,
      mapData: exampleMapData,
      isPublic: false, // Default new maps to private
      sharedWithClassroomId: null, // Not shared by default
      // currentMapOwnerId is set by initializeNewMap
      // isNewMapMode is true from initializeNewMap
    });

    // 3. Call the saveMap equivalent which will perform a POST request
    //    This needs to be extracted or made callable. For now, simulate the API call structure.
    const payload = {
      name: newMapName,
      ownerId: userId,
      mapData: exampleMapData,
      isPublic: false,
      sharedWithClassroomId: null,
    };

    const saveResponse = await fetch('/api/concept-maps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!saveResponse.ok) {
      const errorData = await saveResponse.json();
      throw new Error(errorData.message || 'Failed to save copied map');
    }
    const savedMap = await saveResponse.json();

    toast({
      title: 'Example Copied',
      description: `"${savedMap.name}" has been copied to your workspace.`,
    });
    router.replace(Routes.ConceptMaps.EDIT(savedMap.id));
  } catch (error) {
    toast({
      title: 'Copy Failed',
      description: (error as Error).message,
      variant: 'destructive',
    });
    router.replace(Routes.Examples); // Fallback
  }
}
