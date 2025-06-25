
"use client";
import { MainLayout } from '@/components/layout/main-layout';
import { useAuth } from '@/contexts/auth-context';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Loader2 } from 'lucide-react';
import AppTutorial from '@/components/tutorial/app-tutorial'; // Import AppTutorial


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth(); // Added user for robust example check
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (isLoading) {
      return; // Wait until authentication status is resolved
    }

    // Define public routes within the (app) group
    // Guests can access /examples and view specific example maps.
    // An example map is identified by mapId starting with 'example-' AND viewOnly=true query param.
    const isExamplesPage = pathname === '/examples'; // Note: path is relative to (app) group, so it would be /examples
                                                 // However, usePathname() returns the full path from root.
                                                 // Let's assume /app/examples is the actual URL structure for the examples list page
                                                 // and /app/concept-maps/editor/example-XYZ for viewing.
                                                 // The ls output showed src/app/(app)/examples/page.tsx
                                                 // So, the route is /examples if inside the (app) group.
                                                 // And /concept-maps/editor/example-foo for specific examples.

    let isPublicRoute = false;
    if (pathname) { // Ensure pathname is available
        if (pathname.startsWith('/examples')) { // Entry point for listing examples
            isPublicRoute = true;
        } else if (pathname.startsWith('/concept-maps/editor/')) {
            const mapId = pathname.split('/').pop();
            const isViewOnly = searchParams.get('viewOnly') === 'true';
            if (mapId && mapId.startsWith('example-') && isViewOnly) {
                isPublicRoute = true;
            }
        }
    }

    // console.log(`AppLayout: Pathname: ${pathname}, isLoading: ${isLoading}, isAuthenticated: ${isAuthenticated}, isPublicRoute: ${isPublicRoute}`);

    if (!isAuthenticated && !isPublicRoute) {
      // console.log(`AppLayout: Redirecting to /login from ${pathname}`);
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router, pathname, searchParams]);

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
    // Return a minimal loader to prevent MainLayout from flashing content briefly before redirection.
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
        {/* Render the AppTutorial component here */}
        <AppTutorial />
      </MainLayout>
    </NextThemesProvider>
  );
}
