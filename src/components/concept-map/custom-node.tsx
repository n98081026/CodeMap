"use client";
import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import SelectedNodeToolbar from './selected-node-toolbar';
import {
  Brain, HelpCircle, Settings2, MessageSquareQuote, Workflow, FileText, Lightbulb, Star, Plus, Loader2,
  SearchCode, Database, ExternalLink, Users, Share2, KeyRound, Type, Palette, CircleDot, Ruler, Eraser, Box,
  Move as MoveIcon, Edit2Icon, CheckIcon, XIcon, Wand2 // Ensured Wand2 is here, will add LayoutGrid in SelectedNodeToolbar
} from 'lucide-react';

export interface CustomNodeData {
  label: string;
  details?: string;
  type?: string;
  isViewOnly?: boolean;
  backgroundColor?: string;
  shape?: 'rectangle' | 'ellipse';
  width?: number;
  height?: number;
  onAddChildNodeRequest?: (nodeId: string, direction: 'top' | 'right' | 'bottom' | 'left') => void;
  isStaged?: boolean;
  isGhost?: boolean;
  isDimmed?: boolean; // For original node when ghost is shown
  onStartConnectionRequest?: (nodeId: string) => void;
  onRefineGhostNode?: (nodeId: string, currentText: string, currentDetails?: string) => void; // Added from previous HEAD
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
  'ai-generated': Lightbulb,
  'ai-group-parent': Box,
};

const CustomNodeComponent: React.FC<NodeProps<CustomNodeData>> = ({ data, id, selected, xPos, yPos }) => {
  const {
    isViewOnlyMode: globalIsViewOnlyMode,
    editingNodeId,
    setEditingNodeId,
    aiProcessingNodeId,
    deleteNode,
    updateNode,
    // startConnectionMode, // This was from store, but onStartConnectionRequest prop is used
    multiSelectedNodeIds, // Get multiSelectedNodeIds from the store
  } = useConceptMapStore(
    useCallback(s => ({ // Use a selector to prevent unnecessary re-renders
      isViewOnlyMode: s.isViewOnlyMode,
      editingNodeId: s.editingNodeId,
      setEditingNodeId: s.setEditingNodeId,
      aiProcessingNodeId: s.aiProcessingNodeId,
      deleteNode: s.deleteNode,
      updateNode: s.updateNode,
      // startConnectionMode: s.startConnectionMode, // Not directly used here for the toolbar action
      multiSelectedNodeIds: s.multiSelectedNodeIds,
    }), [])
  );

  const { onRefineGhostNode } = data;

  const nodeIsViewOnly = data.isViewOnly || globalIsViewOnlyMode;
  const isBeingProcessedByAI = aiProcessingNodeId === id;

  const aiTools = useConceptMapAITools(nodeIsViewOnly);

  const [isHovered, setIsHovered] = useState(false);
  const [isGhostHovered, setIsGhostHovered] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState<'above' | 'below'>('above');
  const [toolbarHorizontalOffset, setToolbarHorizontalOffset] = useState<number>(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Callbacks for SelectedNodeToolbar, memoized with useCallback
  const handleEditLabelForToolbar = useCallback(() => setEditingNodeId(id), [setEditingNodeId, id]);
  const handleChangeColorForToolbar = useCallback((color: string) => updateNode(id, { backgroundColor: color }), [updateNode, id]);
  const handleAIExpandForToolbar = useCallback(() => aiTools.handleMiniToolbarQuickExpand(id), [aiTools, id]);
  const handleAIRewriteForToolbar = useCallback(() => aiTools.handleMiniToolbarRewriteConcise(id), [aiTools, id]);
  const handleAISuggestRelationsForToolbar = useCallback(() => {
    if ((aiTools as any).handleMenuSuggestRelations) {
        (aiTools as any).handleMenuSuggestRelations(id);
    } else {
        aiTools.openSuggestRelationsModal(id); // Fallback or correct method
    }
  }, [aiTools, id]);
  const handleStartConnectionForToolbar = useCallback(() => {
    if (data.onStartConnectionRequest) {
      data.onStartConnectionRequest(id);
    }
  }, [data.onStartConnectionRequest, id]);
  const handleDeleteNodeForToolbar = useCallback(() => deleteNode(id), [deleteNode, id]);


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
    borderRadius: data.shape === 'ellipse' ? '50%' : '0.5rem',
    backgroundColor: data.type === 'ai-group-parent'
      ? 'rgba(100, 116, 139, 0.05)'
      : data.backgroundColor || 'hsl(var(--card))',
  };

  const handleNodeDoubleClick = () => {
    if (!nodeIsViewOnly && data.label) {
      setEditingNodeId(id);
    }
  };

  const TypeIcon = TYPE_ICONS[data.type || 'default'] || Settings2;

  const hoverButtonPositions = [
    { pos: Position.Top, style: { top: '-10px', left: '50%', transform: 'translateX(-50%)' } },
    { pos: Position.Right, style: { right: '-10px', top: '50%', transform: 'translateY(-50%)' } },
    { pos: Position.Bottom, style: { bottom: '-10px', left: '50%', transform: 'translateX(-50%)' } },
    { pos: Position.Left, style: { left: '-10px', top: '50%', transform: 'translateY(-50%)' } },
  ] as const;

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
    // Assuming updateConceptExpansionPreviewNodeText is the correct action for ghost node text update
    // If this node is not a ghost, a different update mechanism might be needed.
    // For now, let's assume this is primarily for ghost node refinement.
    if (data.isGhost) {
         useConceptMapStore.getState().updateConceptExpansionPreviewNodeText(id, editText);
    } else {
        updateNode(id, { text: editText }); // Update regular node label
    }
    setIsInlineEditing(false);
  };

  const handleCancelInlineEdit = () => {
    setIsInlineEditing(false);
    setEditText(data.label);
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
      const APPROX_TOOLBAR_HEIGHT = 40;
      const APPROX_TOOLBAR_WIDTH = 250; // Increased slightly for new button
      const VIEWPORT_MARGIN = 10;

      if (nodeRect.top - APPROX_TOOLBAR_HEIGHT - VIEWPORT_MARGIN > 0) {
        setToolbarPosition('above');
      } else {
        setToolbarPosition('below');
      }

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
  }, [selected, xPos, yPos, data.width, data.height]);

  return (
    <div
      ref={nodeRef}
      style={nodeStyle}
      className={cn(
        "nodrag relative shadow-md border border-border flex flex-col group/node", // Added group/node for hover buttons
        selected && !isBeingProcessedByAI && !data.isStaged && !data.isGhost ? "ring-2 ring-primary" : "",
        nodeIsViewOnly && "cursor-default",
        data.shape === 'ellipse' && 'items-center justify-center text-center p-2',
        data.isStaged && "border-dashed border-blue-500 opacity-80",
        data.isGhost && "border-dotted border-purple-500 opacity-60 bg-purple-500/10",
        data.isDimmed && "opacity-50 transition-opacity duration-300", // Style for dimmed original node
        data.type === 'ai-group-parent' && "border-2 border-dashed border-slate-500/30 dark:border-slate-600/50"
      )}
      onMouseEnter={() => {
        if (data.isGhost) setIsGhostHovered(true); else setIsHovered(true);
      }}
      onMouseLeave={() => {
        if (data.isGhost) setIsGhostHovered(false); else setIsHovered(false);
      }}
      onDoubleClick={handleNodeDoubleClick}
      data-node-id={id}
    >
      {data.isGhost && onRefineGhostNode && !globalIsViewOnlyMode && (
        <button
          className="absolute top-0 left-0 m-1 h-5 w-5 p-0.5 z-10 bg-background/70 hover:bg-accent text-foreground"
          title="Refine this suggestion"
          onClick={() => onRefineGhostNode?.(id, data.label || '', data.details || '')}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <Edit2Icon className="h-3 w-3" />
        </button>
      )}
      {selected && !nodeIsViewOnly && !data.isGhost && !isBeingProcessedByAI && (
        <div
          className={cn(
            "absolute left-1/2 z-20",
            toolbarPosition === 'above' ? "-top-10" : "top-full mt-2"
          )}
          style={{ transform: `translateX(calc(-50% + ${toolbarHorizontalOffset}px))` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <SelectedNodeToolbar
            nodeId={id}
            numMultiSelectedNodes={multiSelectedNodeIds.length} // Pass count
            multiSelectedNodeIds={multiSelectedNodeIds} // Pass IDs
            onEditLabel={handleEditLabelForToolbar}
            onChangeColor={handleChangeColorForToolbar}
            onAIExpand={handleAIExpandForToolbar}
            onAIRewrite={handleAIRewriteForToolbar}
            onAISuggestRelations={handleAISuggestRelationsForToolbar}
            onStartConnection={handleStartConnectionForToolbar}
            onDeleteNode={handleDeleteNodeForToolbar}
          />
        </div>
      )}
      {!nodeIsViewOnly && !data.isGhost && (
         <MoveIcon
           className="node-move-handle absolute top-1 right-1 w-4 h-4 text-muted-foreground cursor-grab z-10"
           onMouseDown={(e) => e.stopPropagation()}
         />
      )}
      <Card
        ref={cardRef}
        className={cn(
          "flex flex-col h-full w-full overflow-hidden",
          data.shape === 'ellipse' ? 'rounded-full items-center justify-center' : 'rounded-lg',
          (typeof nodeWidth === 'number' || data.width) ? '' : `min-w-[${NODE_MIN_WIDTH}px] max-w-[${NODE_MAX_WIDTH}px]`,
          (typeof nodeHeight === 'number' || data.height) ? '' : `min-h-[${NODE_MIN_HEIGHT}px]`,
          'bg-transparent border-0 shadow-none'
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
              onClick={(e) => e.stopPropagation()}
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

      {data.isGhost && isGhostHovered && !isInlineEditing && !nodeIsViewOnly && ( // Changed from isHovered
        <button
          onClick={handleStartInlineEdit}
          className="absolute top-1 right-1 z-10 p-0.5 bg-background/80 hover:bg-secondary rounded"
          title="Refine text"
        >
          <Edit2Icon className="w-3 h-3 text-muted-foreground" />
        </button>
      )}

      <Handle type="source" position={Position.Top} id={`${id}-top-source`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Top} id={`${id}-top-target`} className="react-flow__handle-custom !-top-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Right} id={`${id}-right-source`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Right} id={`${id}-right-target`} className="react-flow__handle-custom !-right-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Bottom} id={`${id}-bottom-source`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Bottom} id={`${id}-bottom-target`} className="react-flow__handle-custom !-bottom-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="source" position={Position.Left} id={`${id}-left-source`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />
      <Handle type="target" position={Position.Left} id={`${id}-left-target`} className="react-flow__handle-custom !-left-1.5 w-3 h-3 bg-background border border-primary rounded-full" isConnectable={!nodeIsViewOnly && !data.isGhost} />

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

      {isBeingProcessedByAI && (
        <div className={cn(
          "absolute inset-0 flex items-center justify-center bg-card/70 backdrop-blur-sm",
           data.shape === 'ellipse' ? 'rounded-full' : 'rounded-lg'
        )}>
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default memo(CustomNodeComponent);
