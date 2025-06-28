
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  EdgeLabelRenderer,
  EdgeProps,
  Position,
  BaseEdge,
  MarkerType, 
  type EdgeMarkerType,
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

const STRAIGHT_EXIT_LENGTH = 20; // Length of the straight segment exiting/entering a node
const CORNER_RADIUS = 10; // Radius for rounded corners

interface Point { x: number; y: number; }

// Helper to calculate distance between two points
const getDistance = (p1: Point, p2: Point) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));


// Returns [pathString, labelX, labelY]
const getManhattanPath = (
  sourceX: number, sourceY: number, targetX: number, targetY: number,
  sourcePosition: Position, targetPosition: Position
): [string, number, number] => {
  const pathPoints: Point[] = [];
  pathPoints.push({ x: sourceX, y: sourceY });

  let currentX = sourceX;
  let currentY = sourceY;

  // Determine initial anchor point based on sourcePosition
  let sourceAnchor: Point;
  if (sourcePosition === Position.Left) sourceAnchor = { x: currentX - STRAIGHT_EXIT_LENGTH, y: currentY };
  else if (sourcePosition === Position.Right) sourceAnchor = { x: currentX + STRAIGHT_EXIT_LENGTH, y: currentY };
  else if (sourcePosition === Position.Top) sourceAnchor = { x: currentX, y: currentY - STRAIGHT_EXIT_LENGTH };
  else sourceAnchor = { x: currentX, y: currentY + STRAIGHT_EXIT_LENGTH }; // Bottom
  pathPoints.push(sourceAnchor);
  currentX = sourceAnchor.x;
  currentY = sourceAnchor.y;

  // Determine final anchor point based on targetPosition
  let targetAnchor: Point;
  if (targetPosition === Position.Left) targetAnchor = { x: targetX - STRAIGHT_EXIT_LENGTH, y: targetY };
  else if (targetPosition === Position.Right) targetAnchor = { x: targetX + STRAIGHT_EXIT_LENGTH, y: targetY };
  else if (targetPosition === Position.Top) targetAnchor = { x: targetX, y: targetY - STRAIGHT_EXIT_LENGTH };
  else targetAnchor = { x: targetX, y: targetY + STRAIGHT_EXIT_LENGTH }; // Bottom

  // Add intermediate points to create orthogonal segments
  if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
    if (currentY !== targetAnchor.y && currentX !== targetAnchor.x) {
        pathPoints.push({ x: currentX, y: targetAnchor.y });
    }
  } else { 
    if (currentX !== targetAnchor.x && currentY !== targetAnchor.y) {
        pathPoints.push({ x: targetAnchor.x, y: currentY });
    }
  }
  
  pathPoints.push(targetAnchor);
  pathPoints.push({ x: targetX, y: targetY });


  // Construct the SVG path string with rounded or sharp corners
  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  let labelCandidatePoints: Point[] = []; 

  for (let i = 1; i < pathPoints.length; i++) {
    const p1 = pathPoints[i-1];
    const p2 = pathPoints[i];
    
    if (i < pathPoints.length -1) { 
        const p3 = pathPoints[i+1];
        
        const seg1Length = getDistance(p1, p2);
        const seg2Length = getDistance(p2, p3);

        if (seg1Length >= CORNER_RADIUS && seg2Length >= CORNER_RADIUS && CORNER_RADIUS > 0) {
            const dx1 = p2.x - p1.x;
            const dy1 = p2.y - p1.y;
            const dx2 = p3.x - p2.x;
            const dy2 = p3.y - p2.y;

            const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
            const ndx1 = dx1/len1;
            const ndy1 = dy1/len1;

            const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
            const ndx2 = dx2/len2;
            const ndy2 = dy2/len2;
            
            const arcStartX = p2.x - ndx1 * CORNER_RADIUS;
            const arcStartY = p2.y - ndy1 * CORNER_RADIUS;
            d += ` L ${arcStartX} ${arcStartY}`;
            labelCandidatePoints.push({x: arcStartX, y: arcStartY});


            const arcEndX = p2.x + ndx2 * CORNER_RADIUS;
            const arcEndY = p2.y + ndy2 * CORNER_RADIUS;
            
            const crossProduct = dx1 * dy2 - dy1 * dx2;
            const sweepFlag = crossProduct > 0 ? 1 : 0; 

            d += ` A ${CORNER_RADIUS} ${CORNER_RADIUS} 0 0 ${sweepFlag} ${arcEndX} ${arcEndY}`;
            labelCandidatePoints.push({x: arcEndX, y: arcEndY});

        } else { 
            d += ` L ${p2.x} ${p2.y}`;
            labelCandidatePoints.push({x:p2.x, y:p2.y});
        }
    } else { 
        d += ` L ${p2.x} ${p2.y}`;
        labelCandidatePoints.push({x:p2.x, y:p2.y});
    }
  }
  
  let finalLabelX = (sourceX + targetX) / 2;
  let finalLabelY = (sourceY + targetY) / 2;

  // Use pathPoints (original turn points) for label positioning logic
  // as labelCandidatePoints might be on curves.
  // Find the longest segment among intermediate segments (excluding first and last straight exits)
  const intermediateSegments = pathPoints.slice(1, pathPoints.length - 1);
  if (intermediateSegments.length >= 2) {
    let longestSegmentLength = -1;
    let segmentStartIndex = -1;

    for (let i = 0; i < intermediateSegments.length - 1; i++) {
        const pA = intermediateSegments[i];
        const pB = intermediateSegments[i+1];
        const len = getDistance(pA, pB);
        if (len > longestSegmentLength) {
            longestSegmentLength = len;
            segmentStartIndex = i;
        }
    }
    if (segmentStartIndex !== -1) {
        const pA = intermediateSegments[segmentStartIndex];
        const pB = intermediateSegments[segmentStartIndex + 1];
        finalLabelX = (pA.x + pB.x) / 2;
        finalLabelY = (pA.y + pB.y) / 2;
    }
  } else if (pathPoints.length > 2) { // Fallback to the middle segment if only one (e.g. L-shape)
    const pA = pathPoints[1]; // After sourceAnchor
    const pB = pathPoints[2]; // targetAnchor
    finalLabelX = (pA.x + pB.x) / 2;
    finalLabelY = (pA.y + pB.y) / 2;
  }


  return [d, finalLabelX, finalLabelY];
};

export const getMarkerDefinition = (markerTypeString?: string, edgeColor?: string): EdgeMarkerType | undefined => {
  if (!markerTypeString || markerTypeString === 'none') return undefined;
  const color = edgeColor || 'hsl(var(--foreground-values))';
  switch (markerTypeString.toLowerCase()) {
      case 'arrow': return { type: MarkerType.Arrow, color, strokeWidth: 1 };
      case 'arrowclosed': return { type: MarkerType.ArrowClosed, color, strokeWidth: 1 };
      default: return undefined;
  }
};


export const OrthogonalEdge: React.FC<EdgeProps<OrthogonalEdgeData>> = React.memo(function OrthogonalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
  style = {},
  data,
  markerStart, 
  markerEnd,   
  selected,
}) {
  const updateEdgeInStore = useConceptMapStore((state) => state.updateEdge);
  const isViewOnlyMode = useConceptMapStore(state => state.isViewOnlyMode);

  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [currentLabelValue, setCurrentLabelValue] = useState(data?.label || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentLabelValue(data?.label || '');
  }, [data?.label]);

  const [edgePath, labelX, labelY] = getManhattanPath(
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition
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
  
  const edgeColor = data?.color || 'hsl(var(--foreground-values))';
  const lineTypeStyle = data?.lineType === 'dashed' ? { strokeDasharray: '5,5' } : {};

  const actualMarkerStart = typeof markerStart === 'string' ? getMarkerDefinition(markerStart, edgeColor) : markerStart;
  const actualMarkerEnd = typeof markerEnd === 'string' ? getMarkerDefinition(markerEnd, edgeColor) : markerEnd;


  return (
    <>
      <BaseEdge 
        id={id} 
        path={edgePath} 
        markerStart={actualMarkerStart} 
        markerEnd={actualMarkerEnd} 
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
});
OrthogonalEdge.displayName = "OrthogonalEdge";

export default OrthogonalEdge;

