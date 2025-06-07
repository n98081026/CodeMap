
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  Handle,
  Position,
  useReactFlow,
  getSmoothStepPath, 
  BaseEdge, 
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
  markerStart, // Add markerStart here
  selected,
}) => {
  const { setEdges, getEdge } = useReactFlow();
  const updateEdgeInStore = useConceptMapStore((state) => state.updateEdge);
  const isViewOnlyMode = useConceptMapStore(state => state.isViewOnlyMode);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [currentLabelValue, setCurrentLabelValue] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLabelValue(data?.label || '');
  }, [data?.label]);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0, 
  });

  const handleLabelInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentLabelValue(event.target.value);
  };

  const commitLabelChange = () => {
    if (!isViewOnlyMode) {
        updateEdgeInStore(id, { label: currentLabelValue });
    }
    setIsEditingLabel(false);
  };

  const handleLabelDoubleClick = () => {
    if (!isViewOnlyMode) {
        setIsEditingLabel(true);
    }
  };

  useEffect(() => {
    if (isEditingLabel && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingLabel]);
  
  const edgeColor = data?.color || 'hsl(var(--foreground))'; 
  const lineTypeStyle = data?.lineType === 'dashed' ? { strokeDasharray: '5,5' } : {};

  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerStart={markerStart} 
        markerEnd={markerEnd} 
        style={{ ...style, stroke: edgeColor, ...lineTypeStyle, strokeWidth: selected ? 3: 2 }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={cn("nodrag nopan p-1 rounded-md group", isEditingLabel ? "bg-background shadow-lg border" : "hover:bg-muted/70", selected && !isEditingLabel && "bg-muted/90")}
          onDoubleClick={handleLabelDoubleClick}
        >
          {isEditingLabel && !isViewOnlyMode ? (
            <div className="flex items-center">
              <Input
                ref={inputRef}
                type="text"
                value={currentLabelValue}
                onChange={handleLabelInputChange}
                onBlur={commitLabelChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitLabelChange();
                  if (e.key === 'Escape') {
                    setCurrentLabelValue(data?.label || ''); 
                    setIsEditingLabel(false);
                  }
                }}
                className="text-xs h-7 w-auto min-w-[60px] max-w-[150px] px-1 py-0.5"
              />
            </div>
          ) : (
            currentLabelValue && (
              <div className="text-xs px-1 py-0.5 cursor-pointer min-h-[1rem]">
                {currentLabelValue}
              </div>
            )
          )}
          {!isEditingLabel && currentLabelValue && !isViewOnlyMode && (
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-5 w-5 p-0.5 bg-background/80 hover:bg-muted" onClick={() => setIsEditingLabel(true)}>
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default OrthogonalEdge;

