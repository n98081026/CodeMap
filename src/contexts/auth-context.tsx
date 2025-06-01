
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Test student for auto-login convenience
const testStudent: User = { id: "student-test-id", email: "student-test@example.com", name: "Test Student", role: UserRole.STUDENT };

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('codemapUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // Automatically log in as test student if no user is stored for dev convenience
      setUser(testStudent);
      localStorage.setItem('codemapUser', JSON.stringify(testStudent));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string, role: UserRole) => {
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
        
        if (data.user.role === UserRole.ADMIN) router.push('/admin/dashboard');
        else if (data.user.role === UserRole.TEACHER) router.push('/teacher/dashboard');
        else router.push('/student/dashboard');
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login failed:", error);
      setUser(null);
      localStorage.removeItem('codemapUser');
      // Error will be caught by the form and displayed via toast
      throw error; 
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, role: UserRole) => {
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

        if (data.user.role === UserRole.ADMIN) router.push('/admin/dashboard');
        else if (data.user.role === UserRole.TEACHER) router.push('/teacher/dashboard');
        else router.push('/student/dashboard');
      } else {
        throw new Error(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration failed:", error);
      // Error will be caught by the form and displayed via toast
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('codemapUser');
    router.push('/login');
  };
  
  const isAuthenticated = !!user;

   useEffect(() => {
    if (!isLoading && !isAuthenticated && !['/login', '/register'].includes(pathname)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, pathname, router]);


  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, register }}>
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
