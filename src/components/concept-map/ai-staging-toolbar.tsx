"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components

export interface AIStagingToolbarProps {
  isVisible: boolean;
  onCommit: () => void;
  onClear: () => void;
  stagedItemCount: { nodes: number; edges: number };
}

const AIStagingToolbar: React.FC<AIStagingToolbarProps> = ({
  isVisible,
  onCommit,
  onClear,
  stagedItemCount,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      data-tutorial-id="ai-staging-toolbar"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-0 m-0 w-auto max-w-lg",
        // "animate-in slide-in-from-bottom-10 duration-300 ease-out" // Example animation
      )}
    >
      <Card className="shadow-2xl border-primary/20 bg-background/90 backdrop-blur-sm">
        <CardContent className="p-3 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2">
            <InfoIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              AI Staging Area: Reviewing{' '}
              <span className="font-semibold text-primary">{stagedItemCount.nodes}</span> nodes and{' '}
              <span className="font-semibold text-primary">{stagedItemCount.edges}</span> edges.
            </p>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-tutorial-id="staging-toolbar-accept-all"
                    size="sm"
                    onClick={onCommit}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    aria-label="Commit staged AI suggestions to the map"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Commit to Map
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Add these AI suggestions to your map.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    data-tutorial-id="staging-toolbar-clear-all"
                    size="sm"
                    variant="outline"
                    onClick={onClear}
                    aria-label="Discard all staged AI suggestions"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Discard All
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Remove these AI suggestions from the staging area.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIStagingToolbar;
