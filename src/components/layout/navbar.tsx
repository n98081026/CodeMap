
"use client";

import Link from 'next/link';
import { CodeXml, UserCircle, LogIn, LogOut, Sun, Moon, Settings, LayoutDashboard, PanelLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from 'next-themes'; 
import React, { useEffect, useState, useCallback } from 'react'; // Added React import
import { UserRole } from '@/types';
import { usePathname } from 'next/navigation'; 
import { SidebarTrigger } from '@/components/ui/sidebar'; // Import SidebarTrigger

export const Navbar = React.memo(function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname(); 

  useEffect(() => {
    setMounted(true);
  }, []);
  
  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return "/login"; 
    switch (user.role) {
      case UserRole.ADMIN:
        return "/application/admin/dashboard";
      case UserRole.TEACHER:
        return "/application/teacher/dashboard";
      case UserRole.STUDENT:
        return "/application/student/dashboard";
      default:
        return "/login"; 
    }
  }, [user]);

  const getLogoLink = useCallback(() => {
    if (isAuthenticated && user) { 
      return getRoleBasedDashboardLink();
    }
    return '/login';
  }, [isAuthenticated, user, getRoleBasedDashboardLink]);


  if (!mounted) {
    return (
      <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <div className="h-7 w-7 md:hidden"></div> {/* Placeholder for SidebarTrigger on mobile */}
            <Link href={getLogoLink()} className="flex items-center space-x-2">
              <CodeXml className="h-7 w-7 text-primary" />
              <span className="font-headline text-xl font-semibold">CodeMap</span>
            </Link>
          </div>
          <div className="flex items-center space-x-3">
              <div className="h-9 w-9"></div> {/* Placeholder for theme toggle */}
              <div className="h-9 w-9"></div> {/* Placeholder for user dropdown/login button */}
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center space-x-2">
          {isAuthenticated && ( /* Show trigger only when authenticated and sidebar is relevant */
            <SidebarTrigger className="md:hidden mr-2" /> /* Mobile trigger */
          )}
          <Link href={getLogoLink()} className="flex items-center space-x-2">
            <CodeXml className="h-7 w-7 text-primary" />
            <span className="font-headline text-xl font-semibold">CodeMap</span>
          </Link>
          {isAuthenticated && ( /* Desktop trigger, typically placed here or near logo */
            <SidebarTrigger className="hidden md:flex ml-4" />
          )}
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <UserCircle className="h-7 w-7" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={getRoleBasedDashboardLink()}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/application/profile">
                    <UserCircle className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
});
Navbar.displayName = "Navbar";
