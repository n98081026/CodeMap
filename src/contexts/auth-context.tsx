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
  login: (email: string, role: UserRole) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demonstration
const mockUsers: Record<string, User> = {
  "student@example.com": { id: "student1", email: "student@example.com", name: "Student User", role: UserRole.STUDENT },
  "teacher@example.com": { id: "teacher1", email: "teacher@example.com", name: "Teacher User", role: UserRole.TEACHER },
  "admin@example.com": { id: "admin1", email: "admin@example.com", name: "Admin User", role: UserRole.ADMIN },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const storedUser = localStorage.getItem('codemapUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, role: UserRole) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    // For demo, we'll use a predefined user or create one if not exists
    const existingUser = Object.values(mockUsers).find(u => u.email === email && u.role === role);
    const loggedInUser = existingUser || { id: `user-${Date.now()}`, email, name: email.split('@')[0], role };
    
    setUser(loggedInUser);
    localStorage.setItem('codemapUser', JSON.stringify(loggedInUser));
    setIsLoading(false);
    
    if (loggedInUser.role === UserRole.ADMIN) router.push('/admin/dashboard');
    else if (loggedInUser.role === UserRole.TEACHER) router.push('/teacher/dashboard');
    else router.push('/student/dashboard');
  };

  const register = async (name: string, email: string, role: UserRole) => {
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    const newUser: User = { id: `user-${Date.now()}`, email, name, role };
    setUser(newUser);
    localStorage.setItem('codemapUser', JSON.stringify(newUser));
    // Add to mock users for potential re-login during session
    mockUsers[email] = newUser; 
    setIsLoading(false);

    if (newUser.role === UserRole.ADMIN) router.push('/admin/dashboard');
    else if (newUser.role === UserRole.TEACHER) router.push('/teacher/dashboard');
    else router.push('/student/dashboard');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('codemapUser');
    router.push('/login');
  };
  
  const isAuthenticated = !!user;

  // Handle route protection
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
