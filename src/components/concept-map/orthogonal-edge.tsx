
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  Position,
  useReactFlow,
  getSmoothStepPath, // Changed from getStraightPath
  BaseEdge, // Import BaseEdge for direct path rendering
} from 'reactflow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import useConceptMapStore from '@/stores/concept-map-store';
import { cn } from '@/lib/utils';

export interface OrthogonalEdgeData {
  label?: string;
  color?: string;
  lineType?: 'solid' | 'dashed';
}

export const OrthogonalEdge: React.FC<EdgeProps<OrthogonalEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
  selected,
}) => {
  const { setEdges, getEdge } = useReactFlow();
  const updateEdgeLabelInStore = useConceptMapStore((state) => state.updateEdge);
  const isViewOnlyMode = useConceptMapStore(state => state.isViewOnlyMode);

  const [isEditing, setIsEditing] = useState(false);
  const [currentLabel, setCurrentLabel] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLabel(data?.label || '');
  }, [data?.label]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, // For sharp corners
  });

  const handleLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentLabel(event.target.value);
  };

  const handleLabelSave = () => {
    if (!isViewOnlyMode) {
        updateEdgeLabelInStore(id, { label: currentLabel });
    }
    setIsEditing(false);
  };

  const handleDoubleClick = () => {
    if (!isViewOnlyMode) {
        setIsEditing(true);
    }
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);
  
  const edgeColor = data?.color || 'hsl(var(--primary))'; // Fallback to primary color
  const lineTypeStyle = data?.lineType === 'dashed' ? { strokeDasharray: '5,5' } : {};

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={{ ...style, stroke: edgeColor, ...lineTypeStyle, strokeWidth: selected ? 3: 2 }} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn("nodrag nopan p-1 rounded-md", isEditing ? "bg-background shadow-lg border" : "hover:bg-muted/70", selected && !isEditing && "bg-muted/90")}
          onDoubleClick={handleDoubleClick}
        >
          {isEditing && !isViewOnlyMode ? (
            <div className="flex items-center">
              <Input
                ref={inputRef}
                type="text"
                value={currentLabel}
                onChange={handleLabelChange}
                onBlur={handleLabelSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleLabelSave();
                  if (e.key === 'Escape') {
                    setCurrentLabel(data?.label || ''); // Revert
                    setIsEditing(false);
                  }
                }}
                className="text-xs h-7 w-auto min-w-[60px] max-w-[150px] px-1 py-0.5"
              />
            </div>
          ) : (
            currentLabel && (
              <div className="text-xs px-1 py-0.5 cursor-pointer min-h-[1rem]">
                {currentLabel}
              </div>
            )
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default OrthogonalEdge;
