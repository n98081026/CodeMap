'use client';
import { CodeXml, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { RegisterForm } from '@/components/auth/register-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { UserRole } from '@/types';
import { Routes } from '@/lib/routes';

export default function RegisterPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      if (user.role === UserRole.ADMIN)
        router.replace(Routes.Legacy.ADMIN_DASHBOARD);
      else if (user.role === UserRole.TEACHER)
        router.replace(Routes.Legacy.TEACHER_DASHBOARD);
      else router.replace(Routes.Legacy.STUDENT_DASHBOARD);
    }
  }, [isAuthenticated, user, router, isLoading]);

  // Show loader if auth state is loading OR if user is authenticated (to prevent form flash before redirect)
  if (isLoading || isAuthenticated) {
    return (
      <div className='flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-accent/10'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/10 p-4'>
      <Card className='w-full max-w-md shadow-2xl'>
        <CardHeader className='text-center'>
          <div className='mb-4 flex justify-center'>
            <CodeXml className='h-12 w-12 text-primary' />
          </div>
          <CardTitle className='font-headline text-3xl'>
            Create your CodeMap Account
          </CardTitle>
          <CardDescription>
            Join CodeMap to visualize and understand codebases.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegisterForm />
        </CardContent>
      </Card>
    </div>
  );
}
