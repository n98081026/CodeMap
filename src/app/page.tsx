'use client';

import { Compass, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { CardLink } from '@/components/common/CardLink';
import { useAuth } from '@/contexts/auth-context';
import { Routes } from '@/lib/routes';
import { UserRole } from '@/types';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) {
      return;
    }

    // User is authenticated, redirect to their respective dashboard
    switch (user.role) {
      case UserRole.ADMIN:
        router.replace(Routes.Legacy.ADMIN_DASHBOARD);
        break;
      case UserRole.TEACHER:
        router.replace(Routes.Legacy.TEACHER_DASHBOARD);
        break;
      case UserRole.STUDENT:
        router.replace(Routes.Legacy.STUDENT_DASHBOARD);
        break;
      default:
        // Fallback if role is somehow unknown, go to login
        console.warn(
          'Authenticated user with unknown role, redirecting to login.'
        );
        router.replace(Routes.LOGIN); // Assuming /login is the public auth page
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className='flex h-screen w-screen items-center justify-center bg-background'>
        <div className='flex flex-col items-center space-y-4'>
          <Loader2 className='h-16 w-16 animate-spin text-primary' />
          <p className='text-muted-foreground'>Initializing CodeMap...</p>
        </div>
      </div>
    );
  }

  // If authenticated, user will be redirected by the useEffect.
  // If not authenticated and not loading, render guest content.
  if (!isAuthenticated) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-6'>
        <header className='mb-12 text-center'>
          <h1 className='text-5xl font-bold tracking-tight text-primary sm:text-6xl lg:text-7xl'>
            Welcome to CodeMap
          </h1>
          <p className='mt-6 text-lg leading-8 text-muted-foreground max-w-2xl'>
            Visualize and understand complex codebases with AI-powered concept
            maps. Explore examples or sign up to start analyzing your own
            projects.
          </p>
        </header>

        <div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl w-full'>
          <CardLink
            href={Routes.Examples}
            title='Explore Examples'
            description='View pre-generated concept maps from various sample projects to see CodeMap in action.'
            icon={<Compass className='h-8 w-8 mb-2 text-accent' />}
          />
          <CardLink
            href={Routes.REGISTER}
            title='Sign Up'
            description='Create an account to upload your own projects, generate maps, and save your work.'
            icon={<UserPlus className='h-8 w-8 mb-2 text-accent' />}
          />
          <CardLink
            href={Routes.LOGIN}
            title='Log In'
            description='Already have an account? Log in to access your dashboard and continue your work.'
            icon={<LogIn className='h-8 w-8 mb-2 text-accent' />}
          />
        </div>

        <footer className='mt-16 text-center text-muted-foreground text-sm'>
          <p>
            &copy; {new Date().getFullYear()} CodeMap. Understand Code Better.
          </p>
        </footer>
      </div>
    );
  }

  // Should not be reached if redirect logic is working for authenticated users,
  // but as a fallback, show loading or minimal content.
  return (
    <div className='flex h-screen w-screen items-center justify-center bg-background'>
      <Loader2 className='h-16 w-16 animate-spin text-primary' />
    </div>
  );
}
