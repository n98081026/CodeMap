
"use client"; // Added to fix client-side hook errors

// This file is redundant. The layout defined in /src/app/(app)/layout.tsx
// correctly handles all routes under /application/... due to Next.js App Router conventions.
// This file can be safely deleted.
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
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
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
