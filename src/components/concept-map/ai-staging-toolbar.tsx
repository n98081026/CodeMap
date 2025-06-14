"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, InfoIcon } from 'lucide-react';

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
            <Button
              size="sm"
              onClick={onCommit}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Commit to Map
            </Button>
            <Button size="sm" variant="outline" onClick={onClear}>
              <XCircle className="h-4 w-4 mr-2" />
              Discard All
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIStagingToolbar;
