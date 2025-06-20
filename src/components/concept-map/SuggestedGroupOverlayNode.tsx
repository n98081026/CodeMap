import React, { useState } from 'react'; // Added useState
import { NodeProps } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { GroupIcon, CheckCircle, XCircle, InfoIcon } from 'lucide-react'; // Added icons
import useConceptMapStore from '@/stores/concept-map-store';
// uuidv4 might not be needed here if group creation doesn't generate ID on client
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SuggestedGroupOverlayNodeData {
  suggestionId: string; // Original suggestion ID
  suggestionData: {
    nodeIdsToGroup: string[];
    suggestedParentName: string;
  };
  reason?: string;
  width?: number;  // Passed from FlowCanvasCore
  height?: number; // Passed from FlowCanvasCore
}

const SuggestedGroupOverlayNode: React.FC<NodeProps<SuggestedGroupOverlayNodeData>> = ({
  id, // React Flow element ID: `suggestion-${suggestionId}`
  data,
  // width and height are passed in node object by FlowCanvasCore
}) => {
  const { suggestionId, suggestionData, reason, width, height } = data;
  const { removeStructuralSuggestion, applyFormGroupSuggestion } = useConceptMapStore.getState();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onAccept = () => {
    // applyFormGroupSuggestion is expected to handle node creation, parenting, and positioning
    applyFormGroupSuggestion(
      suggestionData.nodeIdsToGroup,
      suggestionData.suggestedParentName,
      { x: xPos, y: yPos, width: width, height: height } // Pass current overlay geometry
    );
    removeStructuralSuggestion(suggestionId);
    toast({ title: "Suggestion applied", description: "Group created/updated." });
    setPopoverOpen(false);
  };

  const onDismiss = () => {
    removeStructuralSuggestion(suggestionId);
    toast({ title: "Suggestion dismissed" });
    setPopoverOpen(false);
  };

  // xPos and yPos are implicitly part of NodeProps from React Flow
  const xPos = (data as any).xPos || 0;
  const yPos = (data as any).yPos || 0;

  const overlayStyle: React.CSSProperties = {
    border: '2px dashed #10B981', // Emerald-500
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderRadius: '12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-start', // Align content to top
    textAlign: 'center',
    padding: '8px',
    width: '100%', // Take full width of the React Flow node
    height: '100%', // Take full height of the React Flow node
    boxSizing: 'border-box',
    opacity: 0.8,
    pointerEvents: 'all',
  };

  return (
    <div style={overlayStyle} title={reason || `Suggested Group: ${suggestionData.suggestedParentName}`}>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <div className="w-full flex flex-col items-center"> {/* Wrapper for positioning trigger */}
            <Button
              variant="ghost"
              size="sm"
              className="text-emerald-700 hover:bg-emerald-100/50 hover:text-emerald-800 mt-1"
              // onClick is handled by PopoverTrigger
            >
              <InfoIcon className="h-3.5 w-3.5 mr-1.5" />
              Group: {suggestionData.suggestedParentName}
            </Button>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm" side="top">
          <div className="space-y-2">
            <p className="font-semibold">Suggested Group:</p>
            <p>"{suggestionData.suggestedParentName}" for {suggestionData.nodeIdsToGroup.length} nodes.</p>
            {reason && (
              <>
                <p className="font-semibold mt-2">Reason:</p>
                <p className="text-xs text-muted-foreground">{reason}</p>
              </>
            )}
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="outline" size="xs" onClick={onDismiss} title="Dismiss suggestion">
                <XCircle className="h-4 w-4 mr-1" /> Dismiss
              </Button>
              <Button variant="default" size="xs" onClick={onAccept} title="Accept suggestion" className="bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-4 w-4 mr-1" /> Accept
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {/* No handles for an overlay node */}
    </div>
  );
};

export default SuggestedGroupOverlayNode;
