
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
        // User is authenticated, redirect to their respective dashboard
        switch (user.role) {
          case UserRole.ADMIN:
            router.replace('/application/admin/dashboard');
            break;
          case UserRole.TEACHER:
            router.replace('/application/teacher/dashboard');
            break;
          case UserRole.STUDENT:
            router.replace('/application/student/dashboard');
            break;
          default:
            // Fallback if role is somehow unknown, go to login
            console.warn("Authenticated user with unknown role, redirecting to login.");
            router.replace('/login'); // Assuming /login is the public auth page
        }
      } else {
        // Not authenticated and not loading, redirect to login page
        router.replace('/login'); // Assuming /login is the public auth page
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Display a loading indicator while auth state is being determined
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing CodeMap...</p>
      </div>
    </div>
  );
}
