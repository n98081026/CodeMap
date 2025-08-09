'use client';

import { FilePlus, Save, Upload, Download, Loader2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FileActionsProps {
  onNewMap: () => void;
  onSaveMap: () => void;
  isSaving: boolean;
  onExportMap: () => void;
  onTriggerImport: () => void;
  isViewOnlyMode?: boolean;
}

export const FileActions: React.FC<FileActionsProps> = ({
  onNewMap,
  onSaveMap,
  isSaving,
  onExportMap,
  onTriggerImport,
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
                onClick={onNewMap}
                className='h-8 w-8 p-0'
              >
                <FilePlus className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New Map</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={onSaveMap}
                disabled={isSaving}
                className='h-8 w-8 p-0'
              >
                {isSaving ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Save className='h-4 w-4' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isSaving ? 'Saving...' : 'Save Map'}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                onClick={onTriggerImport}
                className='h-8 w-8 p-0'
              >
                <Upload className='h-4 w-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import Map</TooltipContent>
          </Tooltip>
        </>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='ghost'
            size='sm'
            onClick={onExportMap}
            className='h-8 w-8 p-0'
          >
            <Download className='h-4 w-4' />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export Map</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
