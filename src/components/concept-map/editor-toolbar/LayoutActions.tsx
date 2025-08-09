'use client';

import {
  Shuffle,
  LayoutGrid,
  AlignHorizontalDistributeCenter,
  Grid,
  type LucideIcon,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface ArrangeAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  action: () => void;
  isSeparator?: boolean;
}

interface LayoutActionsProps {
  onAutoLayout?: () => void;
  arrangeActions?: ArrangeAction[];
  isViewOnlyMode?: boolean;
}

export const LayoutActions: React.FC<LayoutActionsProps> = ({
  onAutoLayout,
  arrangeActions = [],
  isViewOnlyMode = false,
}) => {
  if (isViewOnlyMode) {
    return null;
  }

  const hasCustomArrangeActions = arrangeActions.length > 0;

  return (
    <TooltipProvider>
      {onAutoLayout && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              onClick={onAutoLayout}
              className='h-8 w-8 p-0'
            >
              <Shuffle className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Auto Layout</TooltipContent>
        </Tooltip>
      )}

      {hasCustomArrangeActions && (
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' size='sm' className='h-8 w-8 p-0'>
                  <LayoutGrid className='h-4 w-4' />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>Arrange</TooltipContent>
          </Tooltip>

          <DropdownMenuContent align='start' className='w-48'>
            {arrangeActions.map((action, index) => {
              if (action.isSeparator) {
                return <DropdownMenuSeparator key={`separator-${index}`} />;
              }

              const Icon = action.icon || Grid;

              return (
                <DropdownMenuItem key={action.id} onClick={action.action}>
                  <Icon className='mr-2 h-4 w-4' />
                  {action.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </TooltipProvider>
  );
};
