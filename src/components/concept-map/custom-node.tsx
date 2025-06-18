"use client";
import React, { memo, useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools'; // Added import
// Removed AISuggestionMiniToolbar import
import SelectedNodeToolbar from './selected-node-toolbar'; // Added import
import {
  Brain, HelpCircle, Settings2, MessageSquareQuote, Workflow, FileText, Lightbulb, Star, Plus, Loader2,
  SearchCode, Database, ExternalLink, Users, Share2, KeyRound, Type, Palette, CircleDot, Ruler, Eraser,
  Move as MoveIcon // Added MoveIcon
} from 'lucide-react'; // Added Loader2

export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string;
  isViewOnly?: boolean;
  backgroundColor?: string;
  shape?: 'rectangle' | 'ellipse';
  width?: number;
  height?: number;
  onAddChildNodeRequest?: (nodeId: string, direction: 'top' | 'right' | 'bottom' | 'left') => void; // For hover buttons
  isStaged?: boolean;
  isGhost?: boolean; // Added for ghost node styling
  onStartConnectionRequest?: (nodeId: string) => void; // New prop for initiating connection mode
  // onTriggerAIExpand?: (nodeId: string) => void; // Retained for potential future direct AI button on node
}

const NODE_MIN_WIDTH = 150;
const NODE_MAX_WIDTH = 400;
const NODE_MIN_HEIGHT = 70;
const NODE_DETAILS_MAX_HEIGHT = 200;

const TYPE_ICONS: { [key: string]: LucideIcon } = {
  'default': Settings2,
  'manual-node': Type,
  'key_feature': Star,
  'service_component': Workflow,
  'ui_view': FileText,
  'data_model': Database,
  'code_module': SearchCode,
  'external_dependency': ExternalLink,
  'user_role': Users,
  'core_process': Share2,
  'security_concept': KeyRound,
  'ai-concept': Lightbulb,
  'ai-expanded': Brain,
  'ai-summary-node': MessageSquareQuote,
  'ai-rewritten-node': MessageSquareQuote,
  'text-derived-concept': Lightbulb,
  'ai-generated': Lightbulb, // Generic for quick cluster/snippet
};

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, id, selected, xPos, yPos }) => {
  const {
    isViewOnlyMode: globalIsViewOnlyMode,
    editingNodeId,
    setEditingNodeId,
    aiProcessingNodeId, // Get AI processing state
    deleteNode, // Added deleteNode from store
    updateNode, // Added updateNode from store
  } = useConceptMapStore();

  const nodeIsViewOnly = data.isViewOnly || globalIsViewOnlyMode;
  const isBeingProcessedByAI = aiProcessingNodeId === id; // Check if this node is being processed

  // Instantiate the AI tools hook
  const aiTools = useConceptMapAITools(nodeIsViewOnly);

  const [isHovered, setIsHovered] = useState(false); // For child node hover buttons
  const [toolbarPosition, setToolbarPosition] = useState<'above' | 'below'>('above');
  // Removed isHoveredForToolbar state
  const cardRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null); // Ref for the main node div to get its rect

  const nodeWidth = data.width || 'auto';
  const nodeHeight = data.height || 'auto';

  const nodeStyle: React.CSSProperties = {
    width: typeof nodeWidth === 'number' ? `${nodeWidth}px` : nodeWidth,
    height: typeof nodeHeight === 'number' ? `${nodeHeight}px` : nodeHeight,
    opacity: selected ? 0.95 : 1,
    borderRadius: data.shape === 'ellipse' ? '50%' : '0.5rem', // Use theme radius
    backgroundColor: data.backgroundColor || 'hsl(var(--card))',
  };

  const handleNodeDoubleClick = () => {
    if (!nodeIsViewOnly && data.label) {
      setEditingNodeId(id); // Trigger focus in PropertiesInspector
    }
  };

  const TypeIcon = TYPE_ICONS[data.type || 'default'] || Settings2;

  const hoverButtonPositions = [
    { pos: Position.Top, style: { top: '-10px', left: '50%', transform: 'translateX(-50%)' } },
    { pos: Position.Right, style: { right: '-10px', top: '50%', transform: 'translateY(-50%)' } },
    { pos: Position.Bottom, style: { bottom: '-10px', left: '50%', transform: 'translateX(-50%)' } },
    { pos: Position.Left, style: { left: '-10px', top: '50%', transform: 'translateY(-50%)' } },
  ] as const;

  // Placeholder handlers for AI mini toolbar actions
  // Removed handleQuickExpand and handleRewriteConcise as they are now passed directly to the toolbar

  const handleToolbarStartConnection = () => {
    if (data.onStartConnectionRequest) {
      data.onStartConnectionRequest(id);
    }
  };

  useEffect(() => {
    if (selected && nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const APPROX_TOOLBAR_HEIGHT = 40; // pixels, matches -top-10 (2.5rem = 40px)
      const OFFSET = 10; // pixels

      if (rect.top - APPROX_TOOLBAR_HEIGHT - OFFSET > 0) {
        setToolbarPosition('above');
      } else {
        setToolbarPosition('below');
      }
    }
  }, [selected, xPos, yPos, data.width, data.height]); // Re-calculate if node moves, resizes or selection changes

  return (
    <div
      ref={nodeRef} // Attach ref here
      style={nodeStyle}
      className={cn(
        "nodrag relative shadow-md border border-border flex flex-col",
        selected && !isBeingProcessedByAI && !data.isStaged && !data.isGhost ? "ring-2 ring-primary" : "", // Don't show ring if AI processing, staged, or ghost
        nodeIsViewOnly && "cursor-default",
        // Removed !nodeIsViewOnly && "cursor-grab",
        data.shape === 'ellipse' && 'items-center justify-center text-center p-2',
        data.isStaged && "border-dashed border-blue-500 opacity-80",
        data.isGhost && "border-dotted border-purple-500 opacity-60 bg-purple-500/10" // Ghost style
      )}
      onMouseEnter={() => {
        if (data.isGhost) return; // Do not trigger hover effects for ghost nodes
        setIsHovered(true);
        // Removed setIsHoveredForToolbar(true);
      }}
      onMouseLeave={() => { setIsHovered(false); /* Removed setIsHoveredForToolbar(false); */ }}
      onDoubleClick={handleNodeDoubleClick}
      data-node-id={id}
    >
      {selected && !nodeIsViewOnly && !data.isGhost && !isBeingProcessedByAI && (
        <div
          className={cn(
            "absolute left-1/2 -translate-x-1/2 z-20",
            toolbarPosition === 'above' ? "-top-10" : "top-full mt-2"
          )}
          // Prevent clicks on the toolbar area from propagating to the node (e.g., deselection)
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          // Add other event handlers like onDoubleClick, onPointerDown etc. if necessary
        >
          <SelectedNodeToolbar
            nodeId={id}
            onEditLabel={() => setEditingNodeId(id)}
            onChangeColor={(color: string) => updateNode(id, { backgroundColor: color })}
            onAIExpand={() => aiTools.handleMiniToolbarQuickExpand(id)}
            onAIRewrite={() => aiTools.handleMiniToolbarRewriteConcise(id)}
            onAISuggestRelations={() => aiTools.handleMenuSuggestRelations(id)}
            onStartConnection={(!nodeIsViewOnly && data.onStartConnectionRequest) ? handleToolbarStartConnection : undefined}
            onDeleteNode={() => deleteNode(id)}
          />
        </div>
      )}
      {!nodeIsViewOnly && !data.isGhost && (
         <MoveIcon
           className="node-move-handle absolute top-1 right-1 w-4 h-4 text-muted-foreground cursor-grab z-10"
           onMouseDown={(e) => e.stopPropagation()} // Prevent node selection click when grabbing handle
         />
      )}
      <Card
        ref={cardRef}
        className={cn(
          "flex flex-col h-full w-full overflow-hidden",
          data.shape === 'ellipse' ? 'rounded-full items-center justify-center' : 'rounded-lg',
          (typeof nodeWidth === 'number' || data.width) ? '' : `min-w-[${NODE_MIN_WIDTH}px] max-w-[${NODE_MAX_WIDTH}px]`,
          (typeof nodeHeight === 'number' || data.height) ? '' : `min-h-[${NODE_MIN_HEIGHT}px]`,
          'bg-transparent border-0 shadow-none' // Card itself is transparent
        )}
      >
        <CardHeader className={cn(
          // Removed cursor-move
          "p-2 flex flex-row items-center space-x-2",
          data.shape === 'ellipse' && 'justify-center items-center flex-col text-center'
        )}>
          <TypeIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <CardTitle className={cn(
            "text-sm font-medium leading-tight line-clamp-2 break-words",
            data.shape === 'ellipse' && 'text-center'
          )}>
            {data.label || "Untitled Node"}
          </CardTitle>
        </CardHeader>

        {data.details && data.shape !== 'ellipse' && (
          <CardContent className={cn(
            "p-2 pt-0 text-xs text-muted-foreground flex-grow",
            (typeof nodeHeight === 'number' || data.height) ? 'overflow-y-auto' : `max-h-[${NODE_DETAILS_MAX_HEIGHT}px] overflow-y-auto`
          )}>
            <ScrollArea className="h-full w-full"> {/* Ensures ScrollArea takes available space */}
              <div className="whitespace-pre-wrap break-words">
                {data.details}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>

      {/* Handles */}
      <Handle type="source" position={Position.Top} id={`${id}-top-source`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Top} id={`${id}-top-target`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Right} id={`${id}-right-source`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Right} id={`${id}-right-target`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-source`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-target`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="source" position={Position.Left} id={`${id}-left-source`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />
      <Handle type="target" position={Position.Left} id={`${id}-left-target`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly} />

      {/* Hover buttons for adding child nodes */}
      {!nodeIsViewOnly && isHovered && !data.isGhost && data.onAddChildNodeRequest && hoverButtonPositions.map(btn => (
        <button
          key={btn.pos}
          onClick={(e) => { e.stopPropagation(); data.onAddChildNodeRequest?.(id, btn.pos); }}
          className="absolute z-10 flex items-center justify-center w-5 h-5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/80 transition-all opacity-0 group-hover/node:opacity-100"
          style={btn.style}
          title={`Add child node ${btn.pos}`}
        >
          <Plus className="w-3 h-3" />
        </button>
      ))}

      {/* AI Processing Spinner Overlay */}
      {isBeingProcessedByAI && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm",
           data.shape === 'ellipse' ? 'rounded-full' : 'rounded-lg' // Match node shape
        )}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!nodeIsViewOnly && !data.isGhost && ( // Also hide mini toolbar for ghost nodes
        /* AISuggestionMiniToolbar removed */
      )}
    </div>
  );
};

export default memo(CustomNodeComponent);
