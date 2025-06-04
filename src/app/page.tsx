
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, login } = useAuth(); // Added login
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
            router.replace('/login'); 
        }
      } else {
        // If not authenticated and loading is complete, attempt mock admin login for testing
        // This will trigger the login flow and subsequent redirection based on role
        login('admin@example.com', 'adminpass', UserRole.ADMIN).catch(err => {
          // If mock admin login fails (e.g., credentials changed or logic error), fall back to login page
          console.error("Automatic mock admin login failed:", err);
          router.replace('/login');
        });
      }
    }
  }, [user, isAuthenticated, isLoading, router, login]); // Added login to dependencies

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading CodeMap...</p>
      </div>
    </div>
  );
}

