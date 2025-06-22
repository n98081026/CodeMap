// src/components/concept-map/GroupSuggestionOverlayNode.tsx
import React from 'react';
import type { NodeProps } from 'reactflow';
// Handles are not needed for this overlay node type
// import { Handle, Position } from 'reactflow';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle } from 'lucide-react'; // Removed Lightbulb as reason is on title
import useConceptMapStore from '@/stores/concept-map-store';

export interface GroupSuggestionOverlayData {
  width: number;
  height: number;
  label?: string;
  reason?: string;
  suggestionId: string; // Original suggestion ID
}

const GroupSuggestionOverlayNode: React.FC<NodeProps<GroupSuggestionOverlayData>> = ({
  data,
}) => {
  const { width, height, label, reason, suggestionId } = data;
  const { acceptStructuralGroupSuggestion, dismissStructuralGroupSuggestion } = useConceptMapStore.getState();

  const handleAccept = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent node selection or other underlying interactions
    acceptStructuralGroupSuggestion(suggestionId, { createParentNode: true });
  };

  const handleDismiss = (event: React.MouseEvent) => {
    event.stopPropagation();
    dismissStructuralGroupSuggestion(suggestionId);
  };

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
      className={cn(
        "border-2 border-dashed border-purple-500 bg-purple-500/5 rounded-lg relative", // Added relative for positioning buttons
        "flex items-center justify-center", // For label if centered inside
        "group" // For group-hover effects if needed later
      )}
      title={reason || label || 'Suggested Group'}
    >
      {/* Optional: Display label inside the box if desired */}
      {label && (
         <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-t-md whitespace-nowrap shadow">
           {label}
         </div>
      )}

      {/* Action Buttons Toolbar */}
      <div className={cn(
        "absolute top-1 right-1 flex gap-0.5 p-0.5 bg-background border border-purple-200 dark:border-purple-700 rounded shadow-md",
        "opacity-0 group-hover:opacity-100 transition-opacity duration-150" // Show on hover of parent
        )}
        // Ensure this div allows pointer events if parent has them off
        // style={{ pointerEvents: 'auto' }}
        >
        <Button
          size="iconSm"
          variant="ghost"
          className="h-5 w-5 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-800 dark:text-green-500 dark:hover:text-green-400"
          onClick={handleAccept}
          title="Accept Group (Creates Parent)"
        >
          <CheckCircle2 className="h-4 w-4" />
        </Button>
        <Button
          size="iconSm"
          variant="ghost"
          className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-800 dark:text-red-500 dark:hover:text-red-400"
          onClick={handleDismiss}
          title="Dismiss Suggestion"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default React.memo(GroupSuggestionOverlayNode);
