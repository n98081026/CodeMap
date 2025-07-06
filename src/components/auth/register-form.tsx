'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { UserPlus, Loader2 } from 'lucide-react';
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
  name: z
    .string()
    .min(2, { message: 'Name must be at least 2 characters.' })
    .max(100),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
  role: z.nativeEnum(UserRole).refine((role) => role !== UserRole.ADMIN, {
    message: 'Admin registration is not allowed through this form.', // Prevent client-side selection of Admin
  }),
});

export function RegisterForm() {
  const { register, isLoading: authIsLoading } = useAuth();
  const { toast } = useToast();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: UserRole.STUDENT, // Default to student, Admin role cannot be selected via UI
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (values.role === UserRole.ADMIN) {
      toast({
        title: 'Registration Not Allowed',
        description: 'Admin accounts cannot be created through this form.',
        variant: 'destructive',
      });
      return;
    }
    setIsSubmittingForm(true);
    try {
      await register(values.name, values.email, values.password, values.role);
      // Toast for success/confirmation is handled in AuthContext or the page itself after redirect.
      // AuthContext redirects to login page upon successful registration.
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description:
          (error as Error).message || 'An unexpected error occurred.',
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
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder='John Doe'
                  {...field}
                  disabled={currentLoadingState}
                  autoComplete='name'
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  placeholder='•••••••• (min. 6 characters)'
                  {...field}
                  disabled={currentLoadingState}
                  autoComplete='new-password'
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
                onValueChange={(value) => field.onChange(value as UserRole)}
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
                  {/* Admin role is intentionally omitted from public registration */}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' className='w-full' disabled={currentLoadingState}>
          {currentLoadingState ? (
            <Loader2 className='mr-2 h-4 w-4 animate-spin' />
          ) : (
            <UserPlus className='mr-2 h-4 w-4' />
          )}
          {currentLoadingState ? 'Registering...' : 'Register'}
        </Button>
        <p className='text-center text-sm text-muted-foreground'>
          Already have an account?{' '}
          <Button variant='link' asChild className='p-0'>
            <Link href='/login'>Login</Link>
          </Button>
        </p>
      </form>
    </Form>
  );
}
