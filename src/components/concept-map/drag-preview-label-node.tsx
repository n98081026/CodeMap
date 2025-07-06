'use client';

import React, { memo } from 'react';

interface DragPreviewLabelNodeData {
  label: string;
}

interface DragPreviewLabelNodeProps {
  data: DragPreviewLabelNodeData;
  // React Flow may pass other props like xPos, yPos, selected, etc.
}

const DragPreviewLabelNode: React.FC<DragPreviewLabelNodeProps> = ({
  data,
}) => {
  return (
    <div
      style={{
        fontSize: '10px',
        padding: '2px 5px',
        backgroundColor: 'rgba(240, 240, 240, 0.9)', // Slightly adjusted background for visibility
        borderRadius: '4px', // Slightly larger radius
        border: '1px solid #bbb', // Slightly adjusted border
        opacity: 0.9, // Slightly more opaque
        pointerEvents: 'none', // Crucial: Prevent mouse event capture
        color: '#222', // Darker text
        display: 'flex', // Added
        alignItems: 'center', // Added
      }}
      className='shadow-md' // Added a bit more shadow
    >
      <svg
        width='30'
        height='10'
        style={{ marginRight: '4px', overflow: 'visible' }}
        aria-hidden='true' // Decorative
      >
        <line
          x1='0'
          y1='5'
          x2='30'
          y2='5'
          stroke='#888' // Greyer line
          strokeDasharray='2,2'
          strokeWidth='1.5'
        />
      </svg>
      {data.label}
    </div>
  );
};

export default memo(DragPreviewLabelNode);
