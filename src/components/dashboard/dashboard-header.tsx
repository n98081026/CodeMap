
"use client";
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import React from 'react';

export interface DashboardHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string; 
  iconLinkHref?: string; 
  children?: React.ReactNode; 
}

// Helper function to make aria-label more descriptive (optional, but good for accessibility)
function userRoleFromPath(path: string | undefined): string {
  if (!path) return 'Current Page';
  if (path.includes('/student/')) return 'Student Dashboard';
  if (path.includes('/teacher/')) return 'Teacher Dashboard';
  if (path.includes('/admin/')) return 'Admin Dashboard';
  if (path.includes('/profile')) return 'My Profile';
  if (path.includes('/concept-maps/editor')) return 'Concept Map Editor';
  return 'Main Page';
}

export const DashboardHeader = React.memo(function DashboardHeader({ title, description, icon: Icon, iconClassName, iconLinkHref, children }: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          {Icon && iconLinkHref ? (
            <Link href={iconLinkHref} aria-label={`Go to ${userRoleFromPath(iconLinkHref)}`}>
              <Icon className={cn("h-8 w-8 text-primary hover:opacity-75 transition-opacity", iconClassName)} />
            </Link>
          ) : Icon ? (
            <Icon className={cn("h-8 w-8 text-primary", iconClassName)} />
          ) : null}
          <h1 className="font-headline text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex gap-2 ml-auto flex-shrink-0">{children}</div>}
    </div>
  );
});
DashboardHeader.displayName = "DashboardHeader";

