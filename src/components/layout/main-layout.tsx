"use client";
import type { ReactNode } from 'react';
import { Navbar } from './navbar';
import { SidebarNav } from './sidebar-nav';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/auth-context';
import { Skeleton } from '@/components/ui/skeleton';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-primary/20" />
          <Skeleton className="h-4 w-48 bg-primary/20" />
        </div>
      </div>
    );
  }
  
  // If not authenticated and not loading, AuthContext's useEffect should redirect.
  // This is a fallback or for scenarios where redirect hasn't happened yet.
  if (!isAuthenticated) {
     return null; 
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex md:w-64 flex-col border-r bg-background">
          <ScrollArea className="flex-1">
            <SidebarNav />
          </ScrollArea>
        </aside>
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
