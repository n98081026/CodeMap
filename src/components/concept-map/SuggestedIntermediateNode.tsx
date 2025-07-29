import { CheckCircle, XCircle, InfoIcon } from 'lucide-react'; // Added icons
import React, { useState } from 'react'; // Added useState
import { Handle, Position, NodeProps } from 'reactflow'; // Added useReactFlow

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useConceptMapStore } from '@/stores/concept-map-store';

interface SuggestedIntermediateNodeData {
  suggestionId: string; // Original suggestion ID from the store
  suggestionData: {
    sourceNodeId: string;
    targetNodeId: string;
    intermediateNodeText: string;
    labelToIntermediate?: string;
    labelFromIntermediate?: string;
    originalEdgeId?: string; // Optional: if the AI can provide the ID of the edge to be replaced
  };
  reason?: string;
  // x and y (position) are part of NodeProps directly
}

const SuggestedIntermediateNode: React.FC<
  NodeProps<SuggestedIntermediateNodeData>
> = ({
  data,
  selected,
  xPos, // position from React Flow
  yPos, // position from React Flow
}) => {
  const { suggestionId, suggestionData, reason } = data;
  const {
    addNode,
    addEdge,
    deleteEdge,
    removeStructuralSuggestion,
    findEdgeByNodes,
  } = useConceptMapStore.getState();
  const { toast } = useToast();
  const [popoverOpen, setPopoverOpen] = useState(false);

  const onAccept = () => {
    // Use the node's current position in the flow for the new node
    // xPos and yPos are provided by ReactFlow as props to the custom node
    addNode({
      // id: newNodeId, // Store's addNode should generate ID
      text: suggestionData.intermediateNodeText || 'New Concept',
      type: 'customConceptNode', // Or your default node type
      position: { x: xPos, y: yPos }, // Use the position of the suggestion node itself
      // width: 150, height: 70, // Default dimensions or from suggestionData if available
    });

    addEdge({
      // id: uuidv4(),
      source: suggestionData.sourceNodeId,
      target: 'new-node-id', // Placeholder, the store will generate the ID
      label: suggestionData.labelToIntermediate || 'connects',
    });
    addEdge({
      // id: uuidv4(),
      source: 'new-node-id', // Placeholder, the store will generate the ID
      target: suggestionData.targetNodeId,
      label: suggestionData.labelFromIntermediate || 'connects',
    });

    // Delete the original edge
    if (suggestionData.originalEdgeId) {
      deleteEdge(suggestionData.originalEdgeId);
    } else {
      // Fallback to finding edge by source/target if originalEdgeId is not provided
      const edgeToDelete = findEdgeByNodes(
        suggestionData.sourceNodeId,
        suggestionData.targetNodeId
      );
      if (edgeToDelete) {
        deleteEdge(edgeToDelete.id);
      } else {
        toast({
          title: 'Warning',
          description:
            'Original edge for intermediate node suggestion not found or already removed.',
          variant: 'default', // Use default variant for warnings or create a 'warning' variant
        });
      }
    }

    removeStructuralSuggestion(suggestionId);
    toast({
      title: 'Suggestion applied',
      description: 'Intermediate node added.',
    });
    setPopoverOpen(false);
  };

  const onDismiss = () => {
    removeStructuralSuggestion(suggestionId);
    toast({ title: 'Suggestion dismissed' });
    setPopoverOpen(false);
  };

  const cardStyle: React.CSSProperties = {
    opacity: 0.85,
    borderStyle: 'dashed',
    minWidth: '150px',
    maxWidth: '250px',
  };

  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Card
          className={cn(
            'border-2 shadow-lg rounded-lg node-card',
            'border-blue-400/70 bg-blue-50/30 backdrop-blur-sm hover:border-blue-500', // Distinct styling
            { 'ring-2 ring-offset-1 ring-blue-600': selected || popoverOpen }
          )}
          style={cardStyle}
          title={reason || `Suggested: ${suggestionData.intermediateNodeText}`}
        >
          <CardHeader className='p-2 cursor-pointer'>
            <CardTitle className='text-xs font-semibold text-blue-700/90 flex items-center'>
              <InfoIcon className='h-3 w-3 mr-1.5 text-blue-500' />
              Suggest: {suggestionData.intermediateNodeText}
            </CardTitle>
          </CardHeader>
          {/* Minimal handles for visual representation, not interactive for the suggestion itself */}
          <Handle
            type='target'
            position={Position.Top}
            className='w-1.5 h-1.5 !bg-blue-400/70'
          />
          <Handle
            type='source'
            position={Position.Bottom}
            className='w-1.5 h-1.5 !bg-blue-400/70'
          />
          <Handle
            type='target'
            position={Position.Left}
            className='w-1.5 h-1.5 !bg-blue-400/70'
          />
          <Handle
            type='source'
            position={Position.Right}
            className='w-1.5 h-1.5 !bg-blue-400/70'
          />
        </Card>
      </PopoverTrigger>
      <PopoverContent className='w-64 text-sm' side='bottom'>
        <div className='space-y-2'>
          <p className='font-semibold'>New Intermediate Node:</p>
          <p>&quot;{suggestionData.intermediateNodeText}&quot;</p>
          {suggestionData.labelToIntermediate && (
            <p className='text-xs text-muted-foreground'>
              Edge 1: Source Node → &quot;
              {suggestionData.labelToIntermediate}&quot; → New Node
            </p>
          )}
          {suggestionData.labelFromIntermediate && (
            <p className='text-xs text-muted-foreground'>
              Edge 2: New Node → &quot;{suggestionData.labelFromIntermediate}
              &quot; → Target Node
            </p>
          )}
          {reason && (
            <>
              <p className='font-semibold mt-2'>Reason:</p>
              <p className='text-xs text-muted-foreground'>{reason}</p>
            </>
          )}
          <div className='flex justify-end space-x-2 pt-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={onDismiss}
              title='Dismiss suggestion'
            >
              <XCircle className='h-4 w-4 mr-1' /> Dismiss
            </Button>
            <Button
              variant='default'
              size='sm'
              onClick={onAccept}
              title='Accept suggestion'
            >
              <CheckCircle className='h-4 w-4 mr-1' /> Accept
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SuggestedIntermediateNode;
