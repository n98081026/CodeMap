'use client';

import { Undo, Redo, PlusSquare, Spline } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EditActionsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onAddNodeToData?: () => void;
  onAddEdgeToData?: () => void;
  canAddEdge?: boolean;
  isViewOnlyMode?: boolean;
}

export const EditActions: React.FC<EditActionsProps> = ({
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onAddNodeToData,
  onAddEdgeToData,
  canAddEdge = false,
  isViewOnlyMode = false,
}) => {
  return (
    <TooltipProvider>
      {!isViewOnlyMode && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={onUndo}
                disabled={!canUndo}
                className='h-8 w-8 p-0'
              >
                <Undo className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={onRedo}
                disabled={!canRedo}
                className='h-8 w-8 p-0'
              >
                <Redo className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>

          {onAddNodeToData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onAddNodeToData}
                  className='h-8 w-8 p-0'
                >
                  <PlusSquare className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add Node</TooltipContent>
            </Tooltip>
          )}

          {onAddEdgeToData && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={onAddEdgeToData}
                  disabled={!canAddEdge}
                  className='h-8 w-8 p-0'
                >
                  <Spline className='h-4 w-4' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canAddEdge ? 'Add Edge' : 'Select nodes to add edge'}
              </TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    </TooltipProvider>
  );
};