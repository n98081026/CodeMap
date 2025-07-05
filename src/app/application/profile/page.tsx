'use client';

import { useAuth } from '@/contexts/auth-context';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  UserCircle,
  Shield,
  Edit3,
  KeyRound,
  Loader2,
  TestTubeDiagonal,
} from 'lucide-react';
import Link from 'next/link';
import { UserRole, type User } from '@/types';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { EditProfileDialog } from '@/components/profile/edit-profile-dialog';
import { ChangePasswordDialog } from '@/components/profile/change-password-dialog';

export default function ProfilePage() {
  const {
    user,
    updateCurrentUserData,
    setTestUserRole,
    isLoading: authIsLoading,
  } = useAuth();
  const router = useRouter();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [selectedRoleForTest, setSelectedRoleForTest] =
    useState<UserRole | null>(null);

  useEffect(() => {
    if (user) {
      setSelectedRoleForTest(user.role);
    }
  }, [user]);

  if (authIsLoading || !user) {
    return (
      <div className='flex h-screen w-screen items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  const getDashboardLink = useCallback(() => {
    if (!user) return '/login';
    switch (user.role) {
      case UserRole.ADMIN:
        return '/application/admin/dashboard';
      case UserRole.TEACHER:
        return '/application/teacher/dashboard';
      case UserRole.STUDENT:
        return '/application/student/dashboard';
      default:
        return '/login';
    }
  }, [user?.role]);

  const handleProfileUpdated = useCallback(
    async (updatedFields: Partial<User>) => {
      await updateCurrentUserData(updatedFields);
    },
    [updateCurrentUserData]
  );

  const handleTestRoleChange = (newRoleValue: string) => {
    const newRole = newRoleValue as UserRole;
    setSelectedRoleForTest(newRole);
    if (user && newRole !== user.role) {
      setTestUserRole(newRole);
      switch (newRole) {
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
    }
  };

  const isCurrentAccountMock =
    user.id === 'admin-mock-id' ||
    user.id === 'student-test-id' ||
    user.id === 'teacher-test-id';

  return (
    <div className='space-y-6'>
      <DashboardHeader
        title='My Profile'
        description='View and manage your account details.'
        icon={UserCircle}
        iconLinkHref={getDashboardLink()}
      />

      <Card className='shadow-lg'>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your personal and role information.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <Label htmlFor='profileName'>Full Name</Label>
            <Input id='profileName' value={user.name} readOnly />
          </div>
          <div>
            <Label htmlFor='profileEmail'>Email Address</Label>
            <Input id='profileEmail' type='email' value={user.email} readOnly />
          </div>
          <div>
            <Label htmlFor='profileRoleSelect'>
              Current Role:{' '}
              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
            </Label>
            <div className='flex items-center space-x-2 mt-1'>
              <TestTubeDiagonal className='h-5 w-5 text-orange-500 flex-shrink-0' />
              <Select
                value={selectedRoleForTest || user.role}
                onValueChange={handleTestRoleChange}
              >
                <SelectTrigger
                  id='profileRoleSelect'
                  className='w-full md:w-[200px]'
                >
                  <SelectValue placeholder='Switch Role (Testing)' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UserRole.STUDENT}>Student</SelectItem>
                  <SelectItem value={UserRole.TEACHER}>Teacher</SelectItem>
                  <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className='text-xs text-muted-foreground mt-1'>
              This role switcher is for local testing convenience. It does not
              change your actual account role on the server.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className='shadow-lg'>
        <CardHeader>
          <CardTitle>Profile Management</CardTitle>
          <CardDescription>
            Update your profile details or change your password.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div>
              <h3 className='font-medium'>Edit Profile</h3>
              <p className='text-sm text-muted-foreground'>
                Update your name or email address.
              </p>
            </div>
            <Button
              variant='outline'
              onClick={() => setIsEditProfileOpen(true)}
              disabled={isCurrentAccountMock}
            >
              <Edit3 className='mr-2 h-4 w-4' /> Edit Profile
            </Button>
          </div>
          <div className='flex items-center justify-between rounded-lg border p-4'>
            <div>
              <h3 className='font-medium'>Change Password</h3>
              <p className='text-sm text-muted-foreground'>
                Update your account password.
              </p>
            </div>
            <Button
              variant='outline'
              onClick={() => setIsChangePasswordOpen(true)}
              disabled={isCurrentAccountMock}
            >
              <KeyRound className='mr-2 h-4 w-4' /> Change Password
            </Button>
          </div>
          {isCurrentAccountMock && (
            <p className='text-xs text-destructive p-2'>
              Editing name/email or changing password is disabled for
              pre-defined mock user accounts.
            </p>
          )}
        </CardContent>
      </Card>

      {user.role === UserRole.ADMIN && (
        <Card className='shadow-lg'>
          <CardHeader>
            <CardTitle className='flex items-center'>
              <Shield className='mr-2 h-5 w-5 text-destructive' /> Admin
              Privileges
            </CardTitle>
            <CardDescription>
              You have administrative access to the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm text-muted-foreground'>
              As an administrator, you can manage users, classrooms, and system
              settings.
            </p>
            <Button asChild className='mt-4'>
              <Link href='/application/admin/dashboard'>
                Go to Admin Dashboard
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {isEditProfileOpen && user && (
        <EditProfileDialog
          currentUser={user}
          onProfileUpdate={handleProfileUpdated}
          isOpen={isEditProfileOpen}
          onOpenChange={setIsEditProfileOpen}
        />
      )}
      {isChangePasswordOpen && user && (
        <ChangePasswordDialog
          userId={user.id}
          isMockUserAccount={isCurrentAccountMock}
          isOpen={isChangePasswordOpen}
          onOpenChange={setIsChangePasswordOpen}
        />
      )}
    </div>
  );
}
