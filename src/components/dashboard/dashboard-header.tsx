
"use client";
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface DashboardHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  iconLinkHref?: string; // New prop: If provided, makes the icon a link
  children?: React.ReactNode; 
}

export function DashboardHeader({ title, description, icon: Icon, iconClassName, iconLinkHref, children }: DashboardHeaderProps) {
  return (
    <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-3">
          {Icon && iconLinkHref ? (
            <Link href={iconLinkHref} aria-label={`Go to ${userRoleFromPath(iconLinkHref)} Dashboard`}>
              <Icon className={cn("h-8 w-8 text-primary hover:opacity-75 transition-opacity", iconClassName)} />
            </Link>
          ) : Icon ? (
            <Icon className={cn("h-8 w-8 text-primary", iconClassName)} />
          ) : null}
          <h1 className="font-headline text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}

// Helper function to make aria-label more descriptive (optional, but good for accessibility)
function userRoleFromPath(path: string): string {
  if (path.includes('/student/')) return 'Student';
  if (path.includes('/teacher/')) return 'Teacher';
  if (path.includes('/admin/')) return 'Admin';
  return 'Main';
}
