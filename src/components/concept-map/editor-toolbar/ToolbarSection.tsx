'use client';

import React from 'react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface ToolbarSectionProps {
  children: React.ReactNode;
  className?: string;
  withSeparator?: boolean;
}

export const ToolbarSection: React.FC<ToolbarSectionProps> = ({
  children,
  className,
  withSeparator = false,
}) => {
  return (
    <>
      <div className={cn('flex items-center gap-1', className)}>{children}</div>
      {withSeparator && <Separator orientation='vertical' className='h-6' />}
    </>
  );
};
