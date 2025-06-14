"use client";

import React from 'react';
import { memo } from 'react';

interface DragPreviewLabelNodeData {
  label: string;
}

interface DragPreviewLabelNodeProps {
  data: DragPreviewLabelNodeData;
  // React Flow may pass other props like xPos, yPos, selected, etc.
}

const DragPreviewLabelNode: React.FC<DragPreviewLabelNodeProps> = ({ data }) => {
  return (
    <div
      style={{
        fontSize: '10px',
        padding: '2px 5px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: '3px',
        border: '1px solid #ccc',
        opacity: 0.85,
        pointerEvents: 'none', // Important: Prevent this node from capturing mouse events
        color: '#333', // Ensure text is readable
        // width and height will be auto based on content, or could be set if needed
      }}
      className="shadow-sm" // Optional: for a slight shadow
    >
      {data.label}
    </div>
  );
};

export default memo(DragPreviewLabelNode);
