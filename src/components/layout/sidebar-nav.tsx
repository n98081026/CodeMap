'use client';

import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileText,
  FolderKanban,
  Settings,
  Compass,
  Share2,
  UserCircle,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react'; // Added this line

import type { LucideIcon } from 'lucide-react';

import { useAuth } from '@/contexts/auth-context';
import { Routes } from '@/lib/routes';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  subItems?: NavItem[];
  exact?: boolean;
  separatorAfter?: boolean;
}

const navItems: NavItem[] = [
  // Common personal items, now using role-based logic to show the correct dashboard link.
  // This logic is simplified here; the component will determine the correct dashboard.
  {
    href: Routes.Student.DASHBOARD, // Default for display, logic below handles role
    label: 'My Dashboard',
    icon: LayoutDashboard,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    exact: true,
    separatorAfter: true,
  },
  {
    href: Routes.Student.CONCEPT_MAPS,
    label: 'My Concept Maps',
    icon: Share2,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
  },
  {
    href: Routes.Student.PROJECTS_SUBMIT,
    label: 'Analyze Project',
    icon: FileText,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
  },
  {
    href: Routes.Student.PROJECTS_SUBMISSIONS,
    label: 'My Analyses',
    icon: FolderKanban,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    separatorAfter: true,
  },

  // Student specific
  {
    href: Routes.Student.CLASSROOMS,
    label: 'My Classrooms',
    icon: BookOpen,
    roles: [UserRole.STUDENT],
    separatorAfter: true,
  },

  // Teacher specific
  {
    href: Routes.Teacher.DASHBOARD,
    label: 'Teacher Dashboard',
    icon: LayoutDashboard,
    roles: [UserRole.TEACHER, UserRole.ADMIN],
  },
  {
    href: Routes.Teacher.CLASSROOMS,
    label: 'Manage Classrooms',
    icon: BookOpen,
    roles: [UserRole.TEACHER, UserRole.ADMIN],
    separatorAfter: true,
  },

  // Admin specific
  {
    href: Routes.Admin.DASHBOARD,
    label: 'Admin Panel',
    icon: Settings,
    roles: [UserRole.ADMIN],
  },
  {
    href: Routes.Admin.USERS,
    label: 'User Management',
    icon: Users,
    roles: [UserRole.ADMIN],
  },
  {
    href: Routes.Admin.SETTINGS,
    label: 'System Settings',
    icon: Settings,
    roles: [UserRole.ADMIN],
    separatorAfter: true,
  },

  // Profile - common to all
  {
    href: Routes.Profile,
    label: 'My Profile',
    icon: UserCircle,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    exact: true,
    separatorAfter: true,
  },

  // Examples Page - common to all
  {
    href: Routes.Examples,
    label: 'Examples',
    icon: Compass,
    roles: [UserRole.STUDENT, UserRole.TEACHER, UserRole.ADMIN],
    exact: true,
  },
];

export const SidebarNav = React.memo(function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const getRoleDashboard = () => {
    switch (user.role) {
      case UserRole.ADMIN:
        return Routes.Admin.DASHBOARD;
      case UserRole.TEACHER:
        return Routes.Teacher.DASHBOARD;
      case UserRole.STUDENT:
      default:
        return Routes.Student.DASHBOARD;
    }
  };

  const filteredNavItems = navItems.filter((item) => item.roles.includes(user.role));

  return (
    <nav className='flex flex-col space-y-1 px-2 py-4'>
      {filteredNavItems.map((item, index) => {
        // Dynamically set the correct dashboard href
        const href = item.label === 'My Dashboard' ? getRoleDashboard() : item.href;

        const isActive = item.exact
          ? pathname === href
          : pathname.startsWith(href);

        return (
          <React.Fragment key={item.href}>
            <Link
              href={href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground/80'
              )}
            >
              <item.icon
                className={cn(
                  'mr-3 h-5 w-5',
                  isActive ? 'text-accent-foreground' : 'text-primary'
                )}
              />
              {item.label}
            </Link>
            {item.separatorAfter && index < filteredNavItems.length - 1 && (
              <hr className='my-2 border-border' />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
});
SidebarNav.displayName = 'SidebarNav';
