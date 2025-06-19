"use client";

import React from 'react';
import { cn } from '@/lib/utils'; // Assuming you have a utility for class names

interface DragPreviewNodeProps {
  data: {
    text: string;
    type: string; // type might be used for different styling in future, or just for consistency
  };
  // React Flow injects other props like id, xPos, yPos, selected, etc., but we might not need them all.
}

const DragPreviewNode: React.FC<DragPreviewNodeProps> = ({ data }) => {
  return (
    <div
      className={cn(
        "w-[150px] h-[70px] p-2 border border-dashed border-primary bg-primary/10 rounded shadow-md opacity-75",
        "flex items-center justify-center text-center text-sm text-primary-foreground" // Adjusted text color for better visibility on primary/10
      )}
      style={{
        // Ensure foreground text is visible. Primary/10 might be light.
        // Consider a slightly darker text color if primary-foreground is also light.
        // Example: color: 'hsl(var(--primary))' if primary/10 is very light.
      }}
    >
      <span className="truncate">{data.text || "Dragged Item"}</span>
    </div>
  );
};

export default React.memo(DragPreviewNode); // Memoize for performance, as its data might update frequently during drag
