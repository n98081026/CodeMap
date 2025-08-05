'use client';
import { CodeXml, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { LoginForm } from '@/components/auth/login-form';
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

export default function LoginPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loader if auth state is loading OR if user is authenticated (to prevent form flash before redirect)
  if (isLoading || (isAuthenticated && user)) {
    return (
      <div className='flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-accent/10'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  // If not loading and not authenticated, show login form
  return (
    <div className='flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-accent/10 p-4'>
      <Card className='w-full max-w-md shadow-2xl'>
        <CardHeader className='text-center'>
          <div className='mb-4 flex justify-center'>
            <CodeXml className='h-12 w-12 text-primary' />
          </div>
          <CardTitle className='font-headline text-3xl'>
            Welcome to CodeMap
          </CardTitle>
          <CardDescription>
            Sign in to access your dashboards and tools.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
