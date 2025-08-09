// src/components/concept-map/GhostNodeComponent.tsx
'use client';
import React, { memo } from 'react';
import { type NodeProps } from 'reactflow';

import { cn } from '@/lib/utils';

// Data for the ghost node should include original dimensions if possible
export interface GhostNodeData {
  id: string;
  width?: number;
  height?: number;
  label?: string; // Optional: display original label faintly
}

const NODE_DEFAULT_WIDTH = 150;
const NODE_DEFAULT_HEIGHT = 70;

const GhostNodeComponent: React.FC<NodeProps<GhostNodeData>> = ({ data }) => {
  const width = data.width || NODE_DEFAULT_WIDTH;
  const height = data.height || NODE_DEFAULT_HEIGHT;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        // position is handled by React Flow
      }}
      className={cn(
        'bg-primary/10 border-2 border-dashed border-primary/50 rounded-md flex items-center justify-center pointer-events-none', // Ghosts are not interactive
        'opacity-70' // Make it semi-transparent
      )}
      data-ghost-node-id={data.id}
    >
      {data.label && (
        <span className='text-xs text-primary/60 truncate px-2'>
          {/* Optionally render the original label faintly */}
          {/* {data.label} */}
        </span>
      )}
    </div>
  );
};

export default memo(GhostNodeComponent);
