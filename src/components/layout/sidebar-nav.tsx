"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types';
import type { LucideIcon } from 'lucide-react';
import { LayoutDashboard, BookOpen, Users, FileText, FolderKanban, Settings, BarChart3, Compass, Share2, GitFork } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[];
  subItems?: NavItem[];
}

const navItems: NavItem[] = [
  // Student specific
  { href: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['student'] },
  { href: '/student/classrooms', label: 'My Classrooms', icon: BookOpen, roles: ['student'] },
  { href: '/student/concept-maps', label: 'My Concept Maps', icon: Share2, roles: ['student'] },
  { href: '/student/projects/submit', label: 'Submit Project', icon: FileText, roles: ['student'] },
  { href: '/student/projects/submissions', label: 'My Submissions', icon: FolderKanban, roles: ['student'] },
  
  // Teacher specific
  { href: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['teacher', 'admin'] },
  { href: '/teacher/classrooms', label: 'Manage Classrooms', icon: BookOpen, roles: ['teacher', 'admin'] },
  { href: '/teacher/classrooms/new', label: 'Create Classroom', icon: Users, roles: ['teacher', 'admin'] },
  
  // Admin specific
  { href: '/admin/dashboard', label: 'Admin Dashboard', icon: LayoutDashboard, roles: ['admin'] },
  { href: '/admin/users', label: 'User Management', icon: Users, roles: ['admin'] },
  // { href: '/admin/settings', label: 'System Settings', icon: Settings, roles: ['admin'] },

  // Common or accessible to multiple roles
  { href: '/concept-maps/new', label: 'New Concept Map', icon: Compass, roles: ['student', 'teacher', 'admin'] },
  // { href: '/concept-maps/editor', label: 'Map Editor', icon: GitFork, roles: ['student', 'teacher', 'admin'] }, // Example, might be dynamic
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) return null;

  const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

  return (
    <nav className="flex flex-col space-y-1 px-2 py-4">
      {filteredNavItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            'group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
            pathname === item.href ? 'bg-accent text-accent-foreground' : 'text-foreground/80'
          )}
        >
          <item.icon className="mr-3 h-5 w-5 text-primary" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
