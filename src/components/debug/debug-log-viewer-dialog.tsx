'use client';

import { ListTree, Trash2 } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMapMetaStore } from '@/stores/map-meta-store';

interface DebugLogViewerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function DebugLogViewerDialog({
  isOpen,
  onOpenChange,
}: DebugLogViewerDialogProps) {
  const { debugLogs, clearDebugLogs } = useMapMetaStore();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl h-[70vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle className='flex items-center'>
            <ListTree className='mr-2 h-5 w-5 text-primary' />
            DataManager Debug Logs
          </DialogTitle>
          <DialogDescription>
            Real-time logs from the concept map data manager. Most recent logs
            at the bottom.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className='flex-grow border rounded-md p-2 bg-muted/30 text-xs font-mono'>
          {debugLogs.length === 0 ? (
            <p className='text-center text-muted-foreground py-4'>
              No logs yet. Interact with the map or change routes.
            </p>
          ) : (
            debugLogs.map((log: string, index: number) => (
              <div
                key={index}
                className='whitespace-pre-wrap break-all py-0.5 border-b border-border/50 last:border-b-0'
              >
                {log}
              </div>
            ))
          )}
        </ScrollArea>
        <DialogFooter className='mt-auto pt-4 border-t'>
          <Button variant='outline' onClick={clearDebugLogs} size='sm'>
            <Trash2 className='mr-2 h-4 w-4' /> Clear Logs
          </Button>
          <DialogClose asChild>
            <Button type='button' variant='default' size='sm'>
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
