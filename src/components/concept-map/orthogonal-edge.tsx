"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  Position,
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

const STRAIGHT_EXIT_LENGTH = 20; // Length of the straight segment from the handle

interface Point { x: number; y: number; }

// Utility function to calculate Manhattan path with straight exits
// Returns [pathString, labelX, labelY]
const getManhattanPath = (
  sourceX: number, sourceY: number, targetX: number, targetY: number,
  sourcePosition: Position, targetPosition: Position,
  offset: number = STRAIGHT_EXIT_LENGTH
): [string, number, number] => {
  const points: Point[] = [{ x: sourceX, y: sourceY }];
  let labelX = (sourceX + targetX) / 2;
  let labelY = (sourceY + targetY) / 2;

  // Calculate P1 (point after straight source exit)
  let p1: Point;
  if (sourcePosition === Position.Left) p1 = { x: sourceX - offset, y: sourceY };
  else if (sourcePosition === Position.Right) p1 = { x: sourceX + offset, y: sourceY };
  else if (sourcePosition === Position.Top) p1 = { x: sourceX, y: sourceY - offset };
  else /* Position.Bottom */ p1 = { x: sourceX, y: sourceY + offset };
  points.push(p1);

  // Calculate P_entry (point before straight target entry)
  let pEntry: Point;
  if (targetPosition === Position.Left) pEntry = { x: targetX - offset, y: targetY };
  else if (targetPosition === Position.Right) pEntry = { x: targetX + offset, y: targetY };
  else if (targetPosition === Position.Top) pEntry = { x: targetX, y: targetY - offset };
  else /* Position.Bottom */ pEntry = { x: targetX, y: targetY + offset };

  // Intermediate points logic (simple two-bend routing)
  // Prefers to make the first turn along the source exit direction
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) { // Horizontal exit from source
    // P2: (p1.x, pEntry.y)
    points.push({ x: p1.x, y: pEntry.y });
    labelX = p1.x;
    labelY = (p1.y + pEntry.y) / 2;
  } else { // Vertical exit from source
    // P2: (pEntry.x, p1.y)
    points.push({ x: pEntry.x, y: p1.y });
    labelX = (p1.x + pEntry.x) / 2;
    labelY = p1.y;
  }

  points.push(pEntry);
  points.push({ x: targetX, y: targetY });
  
  // Filter out consecutive duplicate points (e.g. if source and target align perfectly after offset)
  const uniquePoints = points.reduce((acc: Point[], point) => {
    if (!acc.length || acc[acc.length - 1].x !== point.x || acc[acc.length - 1].y !== point.y) {
      acc.push(point);
    }
    return acc;
  }, []);


  const pathString = uniquePoints.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  // Refine label position for paths with multiple segments
  if (uniquePoints.length > 2) {
    // Try to place label on the middle segment
    const midSegmentIndex = Math.floor((uniquePoints.length -1) / 2) -1;
    if (midSegmentIndex >= 0 && uniquePoints.length > midSegmentIndex +1) {
        const pA = uniquePoints[midSegmentIndex];
        const pB = uniquePoints[midSegmentIndex+1];
        labelX = (pA.x + pB.x) / 2;
        labelY = (pA.y + pB.y) / 2;

        // If mid segment is very short, revert to overall center
        if (Math.sqrt(Math.pow(pB.x - pA.x, 2) + Math.pow(pB.y - pA.y, 2)) < offset * 1.5) {
             labelX = (uniquePoints[0].x + uniquePoints[uniquePoints.length -1].x) / 2;
             labelY = (uniquePoints[0].y + uniquePoints[uniquePoints.length -1].y) / 2;
        }
    }
  }


  return [pathString, labelX, labelY];
};


export const OrthogonalEdge: React.FC<EdgeProps<OrthogonalEdgeData>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom, // Provide default if not passed by React Flow
  targetPosition = Position.Top,   // Provide default
  style = {},
  data,
  markerEnd,
  markerStart,
  selected,
}) => {
  const updateEdgeInStore = useConceptMapStore((state) => state.updateEdge);
  const isViewOnlyMode = useConceptMapStore(state => state.isViewOnlyMode);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [currentLabelValue, setCurrentLabelValue] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLabelValue(data?.label || '');
  }, [data?.label]);

  // Use the new Manhattan path calculation
  const [edgePath, labelX, labelY] = getManhattanPath(
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    STRAIGHT_EXIT_LENGTH
  );

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
