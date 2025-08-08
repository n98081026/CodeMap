'use client';

import {
  Settings2,
  BotMessageSquare,
  ScrollText,
  GraduationCap,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ViewActionsProps {
  onToggleProperties: () => void;
  onToggleAiPanel: () => void;
  onToggleDebugLogViewer: () => void;
  isPropertiesPanelOpen?: boolean;
  isAiPanelOpen?: boolean;
  isDebugLogViewerOpen?: boolean;
  onStartTutorial?: () => void;
  isViewOnlyMode?: boolean;
}

export const ViewActions: React.FC<ViewActionsProps> = ({
  onToggleProperties,
  onToggleAiPanel,
  onToggleDebugLogViewer,
  isPropertiesPanelOpen = false,
  isAiPanelOpen = false,
  isDebugLogViewerOpen = false,
  onStartTutorial,
  isViewOnlyMode = false,
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            onClick={onToggleProperties}
            className={cn('h-8 w-8 p-0', isPropertiesPanelOpen && 'bg-accent')}
          >
            <Settings2 className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isPropertiesPanelOpen ? 'Hide' : 'Show'} Properties Panel
        </TooltipContent>
      </Tooltip>

      {!isViewOnlyMode && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              onClick={onToggleAiPanel}
              className={cn('h-8 w-8 p-0', isAiPanelOpen && 'bg-accent')}
            >
              <BotMessageSquare className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAiPanelOpen ? 'Hide' : 'Show'} AI Panel
          </TooltipContent>
        </Tooltip>
      )}

      {process.env.NODE_ENV === 'development' && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              onClick={onToggleDebugLogViewer}
              className={cn('h-8 w-8 p-0', isDebugLogViewerOpen && 'bg-accent')}
            >
              <ScrollText className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDebugLogViewerOpen ? 'Hide' : 'Show'} Debug Log
          </TooltipContent>
        </Tooltip>
      )}

      {onStartTutorial && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='sm'
              onClick={onStartTutorial}
              className='h-8 w-8 p-0'
            >
              <GraduationCap className='h-4 w-4' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start Tutorial</TooltipContent>
        </Tooltip>
      )}
    </TooltipProvider>
  );
};
