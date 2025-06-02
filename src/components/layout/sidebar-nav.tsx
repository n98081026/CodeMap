
"use client";

import React from 'react'; // Added this line
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BookOpen, Users, FileText, FolderKanban, Settings, Compass, Share2, UserCircle } from 'lucide-react';

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
  // Student specific
  { href: '/application/student/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student'], exact: true },
  { href: '/application/student/classrooms', label: 'My Classrooms', icon: BookOpen, roles: ['student'] },
  { href: '/application/student/concept-maps', label: 'My Concept Maps', icon: Share2, roles: ['student'] },
  { href: '/application/student/projects/submit', label: 'Submit Project', icon: FileText, roles: ['student'] },
  { href: '/application/student/projects/submissions', label: 'My Submissions', icon: FolderKanban, roles: ['student'], separatorAfter: true },
  
  // Teacher specific
  { href: '/application/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['teacher', 'admin'], exact: true },
  { href: '/application/teacher/classrooms', label: 'Manage Classrooms', icon: BookOpen, roles: ['teacher', 'admin'], separatorAfter: true },
    
  // Admin specific
  { href: '/application/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'], exact: true },
  { href: '/application/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
  { href: '/application/admin/settings', label: 'System Settings', icon: Settings, roles: ['admin'], separatorAfter: true },

  // Common for all authenticated users
  { href: '/application/profile', label: 'My Profile', icon: UserCircle, roles: ['student', 'teacher', 'admin'], exact: true },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <nav className="flex flex-col space-y-1 px-2 py-4">
      {filteredNavItems.map((item, index) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        
        return (
          <React.Fragment key={item.href}>
            <Link
              href={item.href}
              className={cn(
                'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                isActive ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
              )}
            >
              <item.icon className={cn("mr-3 h-5 w-5", isActive ? "text-accent-foreground" : "text-primary")} />
              {item.label}
            </Link>
            {item.separatorAfter && index < filteredNavItems.length -1 && <hr className="my-2 border-border" />}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

