'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { LogIn, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types';

const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  role: z.nativeEnum(UserRole),
});

export function LoginForm() {
  const { login, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      role: UserRole.STUDENT,
    },
  });

  const watchedRole = form.watch('role');

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmittingForm(true);
    try {
      // The role from the form is used by AuthContext to verify against the fetched profile role.
      await login(values.email, values.password, values.role);
      toast({
        title: 'Login Successful',
        description: 'Welcome back! Redirecting to your dashboard...',
      });
      // Redirect is handled by AuthContext/page useEffect after successful Supabase sign-in & profile fetch.
    } catch (error) {
      toast({
        title: 'Login Failed',
        description:
          (error as Error).message ||
          'An unexpected error occurred. Please check your credentials and role.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingForm(false);
    }
  }

  const currentLoadingState = authIsLoading || isSubmittingForm;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='you@example.com'
                  {...field}
                  disabled={currentLoadingState}
                  autoComplete='email'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder='••••••••'
                  {...field}
                  disabled={currentLoadingState}
                  autoComplete='current-password'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='role'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={currentLoadingState}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Select your role' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.TEACHER}>Teacher</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Note for Supabase login:
            The email "admin@example.com" with password "adminpass" is for the MOCK admin if that's still in place.
            For Supabase, users must be registered in your Supabase project.
        */}
        {watchedRole === UserRole.ADMIN && (
          <div className='mt-2 text-xs text-muted-foreground p-3 border border-dashed rounded-md bg-background'>
            <p className='font-semibold'>Admin Login Note:</p>
            <p className='mt-1'>
              Ensure your admin account is registered in the Supabase project
              with the &apos;admin&apos; role.
            </p>
          </div>
        )}

        <Button type='submit' className='w-full' disabled={currentLoadingState}>
          {currentLoadingState ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <LogIn className='mr-2 h-4 w-4' />
          )}
          {currentLoadingState ? 'Logging in...' : 'Login'}
        </Button>
        <p className='text-center text-sm text-muted-foreground'>
          Don&apos;t have an account?{' '}
          <Button variant='link' asChild className='p-0'>
            <Link href='/register'>Register</Link>
          </Button>
        </p>
      </form>
    </Form>
  );
}
