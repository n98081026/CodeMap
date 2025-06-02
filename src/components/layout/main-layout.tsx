
"use client";
import type { ReactNode } from 'react';
import { Navbar } from './navbar';
import { SidebarNav } from './sidebar-nav';
import { ScrollArea } from '@/components/ui/scroll-area';
// Removed useAuth and Skeleton as AppLayout now gates rendering

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  // isLoading and isAuthenticated checks are now handled by the parent AppLayout.
  // MainLayout is only rendered when the user is authenticated and app is not loading.

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
