
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import { UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>;
  updateCurrentUserData: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('codemapUser');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse stored user, removing incorrect data.", e);
        localStorage.removeItem('codemapUser');
      }
    }
    setIsLoading(false);
  }, []); // Runs once on mount

  const login = useCallback(async (email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        setUser(data.user);
        localStorage.setItem('codemapUser', JSON.stringify(data.user));
        
        if (data.user.role === UserRole.ADMIN) router.push('/application/admin/dashboard');
        else if (data.user.role === UserRole.TEACHER) router.push('/application/teacher/dashboard');
        else router.push('/application/student/dashboard');
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      localStorage.removeItem('codemapUser');
      throw error; 
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const register = useCallback(async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.status === 201 && data.user) {
        setUser(data.user);
        localStorage.setItem('codemapUser', JSON.stringify(data.user));

        if (data.user.role === UserRole.ADMIN) router.push('/application/admin/dashboard');
        else if (data.user.role === UserRole.TEACHER) router.push('/application/teacher/dashboard');
        else router.push('/application/student/dashboard');
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('codemapUser');
    router.push('/login');
  }, [router]);
  
  const updateCurrentUserData = useCallback((updatedFields: Partial<User>) => {
    setUser(currentUser => {
      if (currentUser) {
        const newUser = { ...currentUser, ...updatedFields };
        localStorage.setItem('codemapUser', JSON.stringify(newUser));
        return newUser;
      }
      return null;
    });
  }, []);

  const isAuthenticated = !!user;

   useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/register', '/'].includes(pathname) && !pathname.startsWith("/_next/")) {
      if (pathname.startsWith('/application/')) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

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
