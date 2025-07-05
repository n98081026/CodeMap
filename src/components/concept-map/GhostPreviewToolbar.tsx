// src/components/concept-map/GhostPreviewToolbar.tsx
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckIcon, XIcon, InfoIcon } from 'lucide-react';
import useConceptMapStore from '@/stores/concept-map-store';

const GhostPreviewToolbar: React.FC = () => {
  const { ghostPreviewData, acceptGhostPreview, cancelGhostPreview } = useConceptMapStore(
    (s) => ({
      ghostPreviewData: s.ghostPreviewData,
      acceptGhostPreview: s.acceptGhostPreview,
      cancelGhostPreview: s.cancelGhostPreview,
    })
  );

  if (!ghostPreviewData || !ghostPreviewData.nodes || ghostPreviewData.nodes.length === 0) {
    return null;
  }

  const nodeCount = ghostPreviewData.nodes.length;

  // Basic positioning, can be refined later if needed (e.g., based on ghost elements' bounding box)
  return (
    <div
      data-tutorial-id="ghost-preview-toolbar"
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 z-50 p-0 m-0 w-auto max-w-md",
        // "animate-in slide-in-from-bottom-10 duration-300 ease-out"
      )}
    >
      <Card className="shadow-2xl border-accent/30 bg-background/90 backdrop-blur-sm">
        <CardContent className="p-3 flex items-center justify-between space-x-3">
          <div className="flex items-center space-x-2">
            <InfoIcon className="h-5 w-5 text-accent flex-shrink-0" />
            <p className="text-sm text-foreground">
              Previewing layout for <span className="font-semibold text-accent">{nodeCount}</span> node(s).
            </p>
          </div>
          <div className="flex space-x-2 flex-shrink-0">
            <Button
              data-tutorial-id="ghost-toolbar-accept"
              size="sm"
              onClick={acceptGhostPreview}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckIcon className="h-4 w-4 mr-2" />
              Accept Layout
            </Button>
            <Button
              data-tutorial-id="ghost-toolbar-cancel"
              size="sm"
              variant="outline"
              onClick={cancelGhostPreview}
            >
              <XIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GhostPreviewToolbar;
