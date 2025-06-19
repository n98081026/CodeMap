"use client";
import React, { memo, useEffect, useRef, useState, useCallback } from 'react'; // Imported useCallback
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
  SearchCode, Database, ExternalLink, Users, Share2, KeyRound, Type, Palette, CircleDot, Ruler, Eraser, Box,
  Move as MoveIcon, Edit2Icon, CheckIcon, XIcon, Wand2 // Added Wand2
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

const TYPE_ICONS: { [key: string]: any } = {
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
  'ai-group-parent': Box,
};

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, id, selected, xPos, yPos }) => {
  const {
    isViewOnlyMode: globalIsViewOnlyMode,
    editingNodeId,
    setEditingNodeId,
    aiProcessingNodeId, // Get AI processing state
    deleteNode, // Added deleteNode from store
    updateNode, // Added updateNode from store
    startConnectionMode, // Added startConnectionMode from store
  } = useConceptMapStore();
  const { onRefineGhostNode } = data; // Destructure new prop

  const nodeIsViewOnly = data.isViewOnly || globalIsViewOnlyMode;
  const isBeingProcessedByAI = aiProcessingNodeId === id; // Check if this node is being processed

  // Instantiate the AI tools hook
  const aiTools = useConceptMapAITools(nodeIsViewOnly);

  const [isHovered, setIsHovered] = useState(false); // For child node hover buttons
  const [isGhostHovered, setIsGhostHovered] = useState(false); // New state for ghost node hover
  const [toolbarPosition, setToolbarPosition] = useState<'above' | 'below'>('above');
  const [toolbarHorizontalOffset, setToolbarHorizontalOffset] = useState<number>(0); // For viewport horizontal awareness
  // Removed isHoveredForToolbar state
  const cardRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null); // Ref for the main node div to get its rect
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the inline editing textarea

  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const [editText, setEditText] = useState(data.label);

  useEffect(() => {
    if (!isInlineEditing) {
      setEditText(data.label);
    }
  }, [data.label, isInlineEditing]);

  useEffect(() => {
    if (isInlineEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isInlineEditing]);

  const nodeWidth = data.width || 'auto';
  const nodeHeight = data.height || 'auto';

  const nodeStyle: React.CSSProperties = {
    width: typeof nodeWidth === 'number' ? `${nodeWidth}px` : nodeWidth,
    height: typeof nodeHeight === 'number' ? `${nodeHeight}px` : nodeHeight,
    opacity: selected ? 0.95 : 1,
    borderRadius: data.shape === 'ellipse' ? '50%' : '0.5rem', // Use theme radius
    backgroundColor: data.type === 'ai-group-parent'
      ? 'rgba(100, 116, 139, 0.05)' // Equivalent to slate-500/5 (light mode theme)
      : data.backgroundColor || 'hsl(var(--card))',
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

  const handleStartInlineEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (nodeIsViewOnly) return;
    setEditText(data.label);
    setIsInlineEditing(true);
  };

  const handleSaveInlineEdit = () => {
    if (nodeIsViewOnly) return;
    useConceptMapStore.getState().updateConceptExpansionPreviewNodeText(id, editText);
    setIsInlineEditing(false);
  };

  const handleCancelInlineEdit = () => {
    setIsInlineEditing(false);
    setEditText(data.label); // Reset text
  };

  const handleEditTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSaveInlineEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      handleCancelInlineEdit();
    }
  };

  useEffect(() => {
    if (selected && nodeRef.current) {
      const nodeRect = nodeRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const APPROX_TOOLBAR_HEIGHT = 40; // pixels, matches -top-10 (2.5rem = 40px for vertical)
      const APPROX_TOOLBAR_WIDTH = 220; // pixels, estimated width of the toolbar. Adjust if necessary.
      const VIEWPORT_MARGIN = 10; // pixels, margin from viewport edges

      // Vertical positioning
      if (nodeRect.top - APPROX_TOOLBAR_HEIGHT - VIEWPORT_MARGIN > 0) {
        setToolbarPosition('above');
      } else {
        setToolbarPosition('below');
      }

      // Horizontal positioning
      const nodeCenter = nodeRect.left + nodeRect.width / 2;
      const toolbarCalculatedLeft = nodeCenter - APPROX_TOOLBAR_WIDTH / 2;
      const toolbarCalculatedRight = nodeCenter + APPROX_TOOLBAR_WIDTH / 2;

      let newHorizontalOffset = 0;
      if (toolbarCalculatedLeft < VIEWPORT_MARGIN) {
        newHorizontalOffset = VIEWPORT_MARGIN - toolbarCalculatedLeft;
      } else if (toolbarCalculatedRight > viewportWidth - VIEWPORT_MARGIN) {
        newHorizontalOffset = viewportWidth - VIEWPORT_MARGIN - toolbarCalculatedRight;
      }
      setToolbarHorizontalOffset(newHorizontalOffset);
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
        data.isGhost && "border-dotted border-purple-500 opacity-60 bg-purple-500/10", // Ghost style
        data.type === 'ai-group-parent' && "border-2 border-dashed border-slate-500/30 dark:border-slate-600/50"
      )}
      onMouseEnter={() => {
        if (data.isGhost) {
          setIsGhostHovered(true);
        } else {
          setIsHovered(true);
        }
      }}
      onMouseLeave={() => {
        if (data.isGhost) {
          setIsGhostHovered(false);
        } else {
          setIsHovered(false);
        }
      }}
      onDoubleClick={handleNodeDoubleClick}
      data-node-id={id}
    >
      {data.isGhost && onRefineGhostNode && !globalIsViewOnlyMode && (
        <button
          className="absolute top-0 left-0 m-1 h-5 w-5 p-0.5 z-10 bg-background/70 hover:bg-accent text-foreground"
          title="Refine this suggestion"
          onClick={() => onRefineGhostNode?.(id, data.label || data.text, data.details)}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Edit2Icon className="h-3 w-3" />
        </button>
      )}
      {selected && !nodeIsViewOnly && !data.isGhost && !isBeingProcessedByAI && (
        <div
          className={cn(
            "absolute left-1/2 z-20", // Removed -translate-x-1/2, will be handled by style
            toolbarPosition === 'above' ? "-top-10" : "top-full mt-2"
          )}
          style={{ transform: `translateX(calc(-50% + ${toolbarHorizontalOffset}px))` }}
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
        {data.isGhost && isInlineEditing && !nodeIsViewOnly ? (
          <div className="p-2 space-y-1 h-full flex flex-col">
            <Textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleEditTextareaKeyDown}
              className="w-full text-xs p-1 resize-none flex-grow bg-background/80"
              placeholder="Enter node text..."
              onClick={(e) => e.stopPropagation()} // Prevent node click/selection
            />
            <div className="flex justify-end space-x-1">
              <button
                className="bg-primary text-primary-foreground rounded-full p-0.5 hover:bg-primary/80"
                onClick={handleSaveInlineEdit}
                title="Save (Enter)"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                className="bg-background text-foreground rounded-full p-0.5 hover:bg-accent"
                onClick={handleCancelInlineEdit}
                title="Cancel (Esc)"
              >
                <XIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <CardHeader className={cn(
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
                <ScrollArea className="h-full w-full">
                  <div className="whitespace-pre-wrap break-words">
                    {data.details}
                  </div>
                </ScrollArea>
              </CardContent>
            )}
          </>
        )}
      </Card>

      {data.isGhost && isHovered && !isInlineEditing && !nodeIsViewOnly && (
        <button
          onClick={handleStartInlineEdit}
          className="absolute top-1 right-1 z-10 p-0.5 bg-background/80 hover:bg-secondary rounded"
          title="Refine text"
        >
          <Edit2Icon className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      {/* Handles */}
      <Handle type="source" position={Position.Top} id={`${id}-top-source`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Top} id={`${id}-top-target`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Right} id={`${id}-right-source`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Right} id={`${id}-right-target`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-source`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-target`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Left} id={`${id}-left-source`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Left} id={`${id}-left-target`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />

      {/* Hover buttons for adding child nodes (not for ghost nodes) */}
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
