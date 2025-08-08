'use client';

import {
  CodeXml,
  UserCircle,
  LogIn,
  LogOut,
  Sun,
  Moon,
  LayoutDashboard,
  HelpCircle,
} from 'lucide-react'; // Added HelpCircle
import Link from 'next/link';
import { useTheme } from 'next-themes';
import React, { useEffect, useState, useCallback, useMemo } from 'react'; // Added useMemo
import { useTranslation } from 'react-i18next'; // Added i18next

// Import the function to get translated tutorials and the metadata type
import { getAvailableTutorials } from '@/components/tutorial/app-tutorial';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel, // Added for grouping
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Routes } from '@/lib/routes';
import useTutorialStore from '@/stores/tutorial-store';
import { UserRole } from '@/types';

export const Navbar = React.memo(function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { startOrResumeTutorial, resetTutorialProgress } = useTutorialStore(
    useCallback(
      (s) => ({
        startOrResumeTutorial: s.startOrResumeTutorial,
        resetTutorialProgress: s.resetTutorialProgress,
      }),
      []
    )
  );
  const { toast } = useToast();
  const { t } = useTranslation(); // For translating tutorial titles/descriptions

  // Memoize availableTutorials to prevent re-fetching on every render unless t changes
  const availableTutorials = useMemo(() => getAvailableTutorials(t), [t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return Routes.LOGIN;
    switch (user.role) {
      case UserRole.ADMIN:
        return Routes.Admin.DASHBOARD;
      case UserRole.TEACHER:
        return Routes.Teacher.DASHBOARD;
      case UserRole.STUDENT:
        return Routes.Student.DASHBOARD;
      default:
        return Routes.LOGIN;
    }
  }, [user]);

  const getLogoLink = useCallback(() => {
    if (isAuthenticated && user) {
      return getRoleBasedDashboardLink();
    }
    return Routes.LOGIN;
  }, [isAuthenticated, user, getRoleBasedDashboardLink]);

  if (!mounted) {
    return (
      <nav className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6'>
          <div className='flex items-center space-x-2'>
            <div className='h-7 w-7 md:hidden'></div>{' '}
            {/* Placeholder for SidebarTrigger on mobile */}
            <Link href={getLogoLink()} className='flex items-center space-x-2'>
              <CodeXml className='h-7 w-7 text-primary' />
              <span className='font-headline text-xl font-semibold'>
                CodeMap
              </span>
            </Link>
          </div>
          <div className='flex items-center space-x-3'>
            <div className='h-9 w-9'></div> {/* Placeholder for theme toggle */}
            <div className='h-9 w-9'></div>{' '}
            {/* Placeholder for user dropdown/login button */}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className='sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6'>
        <div className='flex items-center space-x-2'>
          {isAuthenticated /* Show trigger only when authenticated and sidebar is relevant */ && (
            <SidebarTrigger className='md:hidden mr-2' /> /* Mobile trigger */
          )}
          <Link href={getLogoLink()} className='flex items-center space-x-2'>
            <CodeXml className='h-7 w-7 text-primary' />
            <span className='font-headline text-xl font-semibold'>CodeMap</span>
          </Link>
          {isAuthenticated /* Desktop trigger, typically placed here or near logo */ && (
            <SidebarTrigger className='hidden md:flex ml-4' />
          )}
        </div>

        <div className='flex items-center space-x-3'>
          <Button
            variant='ghost'
            size='icon'
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label='Toggle theme'
          >
            {theme === 'light' ? (
              <Moon className='h-5 w-5' />
            ) : (
              <Sun className='h-5 w-5' />
            )}
          </Button>

          {isAuthenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label='Help and tutorials'
                >
                  <HelpCircle className='h-5 w-5' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-64' align='end'>
                <DropdownMenuLabel>可用的教程</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTutorials.map((tutorial) => (
                  <DropdownMenuItem
                    key={tutorial.key}
                    onSelect={() =>
                      startOrResumeTutorial(tutorial.key, 0, true)
                    }
                    // Add a small visual cue if tutorial has been completed? Future enhancement.
                  >
                    {/* tutorial.icon && <tutorial.icon className="mr-2 h-4 w-4" /> */}
                    {tutorial.title}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    resetTutorialProgress(); // Use the function from the store
                    toast({
                      title: '教程進度已重置',
                      description: '您可以重新開始所有教程了。',
                    });
                  }}
                >
                  重置所有教程進度
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  className='relative h-9 w-9 rounded-full'
                >
                  <UserCircle className='h-7 w-7' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className='w-56' align='end' forceMount>
                <DropdownMenuItem className='font-normal'>
                  <div className='flex flex-col space-y-1'>
                    <p className='text-sm font-medium leading-none'>
                      {user.name}
                    </p>
                    <p className='text-xs leading-none text-muted-foreground'>
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getRoleBasedDashboardLink()}>
                    <LayoutDashboard className='mr-2 h-4 w-4' />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={Routes.Profile}>
                    <UserCircle className='mr-2 h-4 w-4' />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className='mr-2 h-4 w-4' />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href={Routes.LOGIN}>
                <LogIn className='mr-2 h-4 w-4' /> Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
});
Navbar.displayName = 'Navbar';
