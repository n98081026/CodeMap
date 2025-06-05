
"use client";
// This file is a duplicate of /src/app/(app)/layout.tsx due to a previous misunderstanding of route groups.
// It serves the same purpose: ensuring users are authenticated before accessing routes under /application.
// For consistency and to avoid confusion, the logic should be identical to /src/app/(app)/layout.tsx.

import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Loader2 } from 'lucide-react';

export default function ApplicationAreaLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login'); // Redirect to the public login page
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Initializing CodeMap...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <MainLayout>
        {children}
      </MainLayout>
    </NextThemesProvider>
  );
}
