
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user) {
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
            // Fallback, though should ideally be covered by role-specific dashboards
            router.replace('/login'); // Auth pages are at root
        }
      } else {
        router.replace('/login'); // Auth pages are at root
      }
    }
  }, [user, isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Skeleton className="h-16 w-16 rounded-full bg-primary/20 animate-pulse" />
        <Skeleton className="h-6 w-56 bg-primary/20 animate-pulse" />
        <p className="text-muted-foreground">Loading CodeMap...</p>
      </div>
    </div>
  );
}
