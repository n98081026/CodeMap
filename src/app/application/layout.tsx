
"use client";
import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/application/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full bg-primary/20" />
          <Skeleton className="h-4 w-48 bg-primary/20" />
          <p className="text-sm text-muted-foreground">Initializing CodeMap...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // User is not authenticated and we are not loading.
    // The useEffect above will handle redirection.
    // Return a minimal loader or null to prevent MainLayout flash.
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
