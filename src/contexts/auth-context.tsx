
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
  updateCurrentUserData: (updatedFields: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Predefined test users for login convenience during development
// const testStudent: User = { id: "student-test-id", email: "student-test@example.com", name: "Test Student", role: UserRole.STUDENT };
// const testTeacher: User = { id: "teacher-test-id", email: "teacher-test@example.com", name: "Test Teacher", role: UserRole.TEACHER };
// const testAdmin: User = { id: "admin1", email: "admin@example.com", name: "Admin User", role: UserRole.ADMIN };


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This effect runs once on mount to check for a stored user.
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

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
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('codemapUser');
    router.push('/login'); // Auth pages are at root
  };
  
  const isAuthenticated = !!user;

   useEffect(() => {
    // This effect handles redirection if not authenticated after initial loading and for protected routes.
    if (!isLoading && !isAuthenticated && !['/login', '/register', '/'].includes(pathname) && !pathname.startsWith("/_next/")) {
      if (pathname.startsWith('/application/')) {
        router.push('/login');
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  const updateCurrentUserData = (updatedFields: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...updatedFields };
      setUser(newUser);
      localStorage.setItem('codemapUser', JSON.stringify(newUser));
    }
  };


  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout, register, updateCurrentUserData }}>
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
