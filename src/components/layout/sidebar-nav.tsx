
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
  // Common personal items (visible to all roles, including those without a specific Student/Teacher/Admin role)
  { href: '/application/student/dashboard', label: 'My Dashboard', icon: LayoutDashboard, roles: ['student', 'teacher', 'admin', 'unknown'], exact: true, separatorAfter: true }, // Default dashboard
  { href: '/application/student/concept-maps', label: 'My Concept Maps', icon: Share2, roles: ['student', 'teacher', 'admin', 'unknown'] },
  { href: '/application/student/projects/submit', label: 'Analyze Project', icon: FileText, roles: ['student', 'teacher', 'admin', 'unknown'] },
  { href: '/application/student/projects/submissions', label: 'My Analyses', icon: FolderKanban, roles: ['student', 'teacher', 'admin', 'unknown'], separatorAfter: true },

  // Student specific (only if role is student and they might have classroom specific views)
  { href: '/application/student/classrooms', label: 'My Classrooms', icon: BookOpen, roles: ['student'], condition: (user) => user.role === 'student', separatorAfter: true },
  
  // Teacher specific
  { href: '/application/teacher/dashboard', label: 'Teacher Dashboard', icon: LayoutDashboard, roles: ['teacher', 'admin'], condition: (user) => user.role === 'teacher' || user.role === 'admin' },
  { href: '/application/teacher/classrooms', label: 'Manage Classrooms', icon: BookOpen, roles: ['teacher', 'admin'], condition: (user) => user.role === 'teacher' || user.role === 'admin', separatorAfter: true },
    
  // Admin specific
  { href: '/application/admin/dashboard', label: 'Admin Panel', icon: Settings, roles: ['admin'], condition: (user) => user.role === 'admin' },
  { href: '/application/admin/users', label: 'User Management', icon: Users, roles: ['admin'], condition: (user) => user.role === 'admin' },
  { href: '/application/admin/settings', label: 'System Settings', icon: Settings, roles: ['admin'], condition: (user) => user.role === 'admin', separatorAfter: true },

  // Profile - common to all
  { href: '/application/profile', label: 'My Profile', icon: UserCircle, roles: ['student', 'teacher', 'admin', 'unknown'], exact: true, separatorAfter: true },

  // Examples Page - common to all
  { href: '/application/examples', label: 'Examples', icon: BookCopy, roles: ['student', 'teacher', 'admin', 'unknown'], exact: true },
];

export const SidebarNav = React.memo(function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  // Determine effective role, defaulting to 'unknown' if not standard or null
  const effectiveRole = user.role && ['student', 'teacher', 'admin'].includes(user.role) ? user.role : 'unknown';

  const filteredNavItems = navItems.filter(item => {
    const roleMatch = item.roles.includes(effectiveRole);
    const conditionMatch = item.condition ? item.condition(user) : true;
    return roleMatch && conditionMatch;
  });

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
});
SidebarNav.displayName = "SidebarNav";
