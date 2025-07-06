// src/components/concept-map/SuggestionEdge.tsx
import { CheckCircle2, XCircle, Lightbulb } from 'lucide-react';
import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath, // Or getSimpleBezierPath, getSmoothStepPath
  // useReactFlow, // Not strictly needed as we use store actions
} from 'reactflow';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils'; // For conditional styling if needed
import useConceptMapStore from '@/stores/concept-map-store';

// Data passed to this edge should include:
// id (the suggestionId), label (suggested label), reason
export interface SuggestionEdgeData {
  label?: string;
  reason?: string;
  isSuggestion?: boolean; // Should be true
  // any other original OrthogonalEdgeData fields if needed for consistency
  // For now, specific styling is applied directly in this component.
}

const SuggestionEdge: React.FC<EdgeProps<SuggestionEdgeData>> = ({
  id, // This is the suggestionId from the store (e.g., "struct-sugg-xxxx")
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {}, // Default React Flow styles for the edge path
  markerEnd,
  data,
}) => {
  // const { setEdges } = useReactFlow(); // Not using this as actions directly modify store, which updates edges
  const acceptStructuralEdgeSuggestion = useConceptMapStore(
    (s) => s.acceptStructuralEdgeSuggestion
  );
  const dismissStructuralEdgeSuggestion = useConceptMapStore(
    (s) => s.dismissStructuralEdgeSuggestion
  );

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const handleAccept = (event: React.MouseEvent) => {
    event.stopPropagation();
    acceptStructuralEdgeSuggestion(id);
  };

  const handleDismiss = (event: React.MouseEvent) => {
    event.stopPropagation();
    dismissStructuralEdgeSuggestion(id);
  };

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style, // Keep original React Flow calculated styles (like selected)
          strokeDasharray: '8 6',
          stroke: '#7c3aed', // Purple color for suggestion
          opacity: 0.8,
          strokeWidth: 2,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className='nodrag nopan group' // Add group for potential group-hover effects
        >
          <div className='flex flex-col items-center'>
            {/* Main Label for the suggestion */}
            {data?.label && (
              <div
                className={cn(
                  'bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-xs shadow-md',
                  'dark:bg-purple-800 dark:text-purple-100'
                )}
              >
                {data.label}
              </div>
            )}
            {/* Reason and Action Buttons Container - initially slightly transparent, opaque on hover */}
            <div
              className={cn(
                'flex items-center gap-1 mt-1 p-1 bg-background border border-purple-300 rounded shadow-lg',
                'opacity-70 group-hover:opacity-100 transition-opacity duration-150 ease-in-out',
                'dark:border-purple-600'
              )}
            >
              {data?.reason && (
                <Lightbulb
                  className='h-3.5 w-3.5 text-purple-500 dark:text-purple-400'
                  title={data.reason}
                />
              )}
              <Button
                size='iconSm' // Using iconSm, assuming it's defined or similar to h-6 w-6 p-0.5
                variant='ghost'
                className='h-6 w-6 p-0.5 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-700 dark:text-green-400 dark:hover:text-green-300'
                onClick={handleAccept}
                title='Accept suggestion'
              >
                <CheckCircle2 className='h-4 w-4' />
              </Button>
              <Button
                size='iconSm'
                variant='ghost'
                className='h-6 w-6 p-0.5 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-700 dark:text-red-400 dark:hover:text-red-300'
                onClick={handleDismiss}
                title='Dismiss suggestion'
              >
                <XCircle className='h-4 w-4' />
              </Button>
            </div>
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default React.memo(SuggestionEdge);
