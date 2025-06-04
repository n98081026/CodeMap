
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const { user, isAuthenticated, isLoading, login } = useAuth(); 
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      // Force mock admin login for testing
      login('admin@example.com', 'adminpass', UserRole.ADMIN).then(() => {
        // After attempting login, the existing logic based on user role will redirect.
        // If login is successful and user is set, the other part of the logic will run.
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
                router.replace('/login'); 
            }
        } else {
            // If login somehow failed (e.g. mock admin details changed in context)
            // or if user is still not set after login attempt.
            // Fallback to login page if not redirected by successful admin login.
            // This else block might not be hit if mock admin login is always successful and context redirects.
             console.log("Attempted mock admin login on home page. Waiting for redirect or fallback.");
        }
      }).catch(err => {
        console.error("Forced mock admin login on home page failed:", err);
        router.replace('/login'); // Fallback if forced login has an issue
      });
    }
  }, [isLoading, router, login, isAuthenticated, user]); // Add isAuthenticated and user to dependencies for the inner check

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing CodeMap & Attempting Admin Bypass...</p>
      </div>
    </div>
  );
}
