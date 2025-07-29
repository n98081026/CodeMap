'use client';
import { Loader2 } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useCallback } from 'react';

import { MainLayout } from '@/components/layout/main-layout';
import AppTutorial from '@/components/tutorial/app-tutorial';
import { useAuth } from '@/contexts/auth-context';
import useTutorialStore from '@/stores/tutorial-store'; // Import tutorial store

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // const [runDashboardTutorial, setRunDashboardTutorial] = useState(false); // Remove local state for this
  const { startOrResumeTutorial, activeTutorialKey } = useTutorialStore(
    useCallback(
      (s) => ({
        startOrResumeTutorial: s.startOrResumeTutorial,
        activeTutorialKey: s.activeTutorialKey,
      }),
      []
    )
  );

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let isPublicRoute = false;
    if (pathname) {
      if (pathname.startsWith('/examples')) {
        isPublicRoute = true;
      } else if (pathname.startsWith('/concept-maps/editor/')) {
        const mapId = pathname.split('/').pop();
        const isViewOnly = searchParams.get('viewOnly') === 'true';
        if (mapId && mapId.startsWith('example-') && isViewOnly) {
          isPublicRoute = true;
        }
      }
    }

    if (!isAuthenticated && !isPublicRoute) {
      const redirectUrl = `/login?redirectTo=${encodeURIComponent(pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''))}`;
      router.replace(redirectUrl);
    } else if (isAuthenticated && !isLoading) {
      const isDashboardPage =
        pathname.endsWith('/dashboard') ||
        pathname === '/application/student/dashboard' ||
        pathname === '/application/teacher/dashboard' ||
        pathname === '/application/admin/dashboard' ||
        pathname === '/';
      if (isDashboardPage) {
        const dashboardTutorialCompleted =
          localStorage.getItem('dashboardTutorial_completed') === 'true';
        if (!dashboardTutorialCompleted) {
          startOrResumeTutorial('dashboardTutorial');
        }
      }
      // Note: Other page-specific tutorials (like editorTutorial, projectUploadTutorial)
      // will be triggered from within their respective page components, not from AppLayout.
    }
  }, [
    isAuthenticated,
    isLoading,
    router,
    pathname,
    searchParams,
    user,
    startOrResumeTutorial,
  ]);

  if (isLoading) {
    // Show a global loading spinner while AuthContext is determining auth state.
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-background'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
          <p className='text-sm text-muted-foreground'>
            Initializing CodeMap...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // If not authenticated (and not loading), the useEffect above will trigger a redirect.
    // Return a minimal loader to prevent MainLayout from flashing content briefly before redirection.
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-background'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  // If authenticated and not loading, render the main application layout.
  return (
    <NextThemesProvider attribute='class' defaultTheme='system' enableSystem>
      <MainLayout>
        {children}
        {/* AppTutorial is now rendered based on store state */}
        {activeTutorialKey && <AppTutorial />}
      </MainLayout>
    </NextThemesProvider>
  );
}
