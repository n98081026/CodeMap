
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
    // This effect handles redirection for the /application route group.
    // If auth is still loading, we wait.
    // If done loading and not authenticated, redirect to login.
    if (!isLoading && !isAuthenticated) {
      router.replace('/login'); 
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    // Show a global loading spinner while AuthContext is determining auth state.
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
    // If not authenticated (and not loading), the useEffect above will trigger a redirect.
    // Return a minimal loader to prevent MainLayout from flashing content.
     return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  // If authenticated and not loading, render the main application layout.
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <MainLayout>
        {children}
      </MainLayout>
    </NextThemesProvider>
  );
}
