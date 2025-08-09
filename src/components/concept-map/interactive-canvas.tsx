'use client';

import React, { useEffect, useState } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodesDelete,
  type OnEdgesDelete,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  type ReactFlowProps, // Import ReactFlowProps
} from 'reactflow';

import CustomNodeComponent, { type CustomNodeData } from './custom-node';
import DragPreviewLabelNode from './drag-preview-label-node'; // Import DragPreviewLabelNode
import DragPreviewNode from './drag-preview-node';
import OrthogonalEdge, { type OrthogonalEdgeData } from './orthogonal-edge';

import type { VisualEdgeSuggestion } from '@/types';

import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { CheckIcon, XIcon } from 'lucide-react';

// Define nodeTypesConfig as top-level constant here
const nodeTypesConfig: NodeTypes = {
  customConceptNode: CustomNodeComponent,
  dragPreviewNode: DragPreviewNode,
  dragPreviewLabel: DragPreviewLabelNode, // New entry for label preview
};

// Default edgeTypesConfig, can be overridden by prop
const defaultEdgeTypesConfig: EdgeTypes = {
  orthogonal: OrthogonalEdge,
};

interface InteractiveCanvasProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<OrthogonalEdgeData>[]; // This type might need to be more generic if SuggestionEdgeData is very different
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onSelectionChange?: ReactFlowProps['onSelectionChange'];
  onConnect?: (params: Connection) => void;
  isViewOnlyMode?: boolean;
  onNodeContextMenu?: (
    event: React.MouseEvent,
    node: Node<CustomNodeData>
  ) => void;
  onNodeDrag?: (
    event: React.MouseEvent,
    node: Node<CustomNodeData>,
    nodes: Node<CustomNodeData>[]
  ) => void;
  onNodeDragStop?: (
    event: React.MouseEvent,
    node: Node<CustomNodeData>,
    nodes: Node<CustomNodeData>[]
  ) => void;
  onPaneDoubleClick?: (event: React.MouseEvent) => void;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onNodeClick?: (event: React.MouseEvent, node: Node<CustomNodeData>) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void; // Added onDragLeave
  activeSnapLines?: Array<{
    type: 'vertical' | 'horizontal';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
  gridSize?: number;
  panActivationKeyCode?: string | null;
  // Drag preview related props
  draggedItemPreview?: {
    type: string;
    text: string;
    x: number;
    y: number;
  } | null;
  onCanvasDragLeave?: (event: React.DragEvent) => void;
  dragPreviewSnapLines?: Array<{
    type: 'vertical' | 'horizontal';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }>;
  // Visual Edge Suggestion Overlay Props
  activeVisualEdgeSuggestion?: VisualEdgeSuggestion | null;
  onAcceptVisualEdge?: (suggestionId: string) => void;
  onRejectVisualEdge?: (suggestionId: string) => void;
  // Edge types and node drop
  edgeTypes?: EdgeTypes; // Prop to pass custom edge types
  onNodeDragStart?: (event: React.MouseEvent, node: Node) => void; // New prop for node drop
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  duration: 300,
};

const nodeColor = (node: Node<CustomNodeData>) => {
  if (node.data?.backgroundColor) {
    return node.data.backgroundColor;
  }
  const type = node.data?.type || 'default';
  const nodeTypeColors: { [key: string]: string } = {
    key_feature: 'hsl(var(--chart-1-values))',
    service_component: 'hsl(var(--chart-2-values))',
    ui_view: 'hsl(var(--chart-3-values))',
    data_model: 'hsl(var(--chart-4-values))',
    default: 'hsl(var(--muted-values))',
  };
  return nodeTypeColors[type] || nodeTypeColors.default;
};

const InteractiveCanvasComponent: React.FC<InteractiveCanvasProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onNodesDelete,
  onEdgesDelete,
  onSelectionChange,
  onConnect,
  isViewOnlyMode,
  onNodeContextMenu,
  onNodeDrag,
  onNodeDragStop,
  onPaneDoubleClick,
  onPaneContextMenu,
  onNodeClick,
  onDragOver,
  onDrop,
  onDragLeave,
  activeSnapLines = [],
  dragPreviewSnapLines = [], // Destructure with default
  gridSize = 20,
  panActivationKeyCode,
  draggedItemPreview, // Destructure new prop
  onCanvasDragLeave, // Destructure new prop
  // Destructure Visual Edge Suggestion Overlay Props
  activeVisualEdgeSuggestion,
  onAcceptVisualEdge,
  onRejectVisualEdge,
  edgeTypes: propEdgeTypes,
  onNodeDragStart, // Destructure onNodeDrop
}) => {
  const { project, getViewport } = useReactFlow();
  const [calculatedTranslateExtent, setCalculatedTranslateExtent] = useState<
    [[number, number], [number, number]] | undefined
  >([
    [-Infinity, -Infinity],
    [Infinity, Infinity],
  ]);

  const allSnapLinesToRender = React.useMemo(
    () => [...(activeSnapLines || []), ...(dragPreviewSnapLines || [])],
    [activeSnapLines, dragPreviewSnapLines]
  );

  // useEffect for translateExtent calculation (remains unchanged)

  useEffect(() => {
    const currentViewport = getViewport();

    if (
      !currentViewport ||
      typeof currentViewport.zoom !== 'number' ||
      currentViewport.zoom <= 0 ||
      isNaN(currentViewport.zoom)
    ) {
      setCalculatedTranslateExtent([
        [-Infinity, -Infinity],
        [Infinity, Infinity],
      ]);
      return;
    }

    if (nodes.length === 0) {
      setCalculatedTranslateExtent([
        [-Infinity, -Infinity],
        [Infinity, Infinity],
      ]);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach((node) => {
      const nodeWidth = node.width || 150;
      const nodeHeight = node.height || 70;
      const posX = node.position.x;
      const posY = node.position.y;

      minX = Math.min(minX, posX);
      minY = Math.min(minY, posY);
      maxX = Math.max(maxX, posX + nodeWidth);
      maxY = Math.max(maxY, posY + nodeHeight);
    });

    if (
      minX === Infinity ||
      minY === Infinity ||
      maxX === -Infinity ||
      maxY === -Infinity
    ) {
      setCalculatedTranslateExtent([
        [-Infinity, -Infinity],
        [Infinity, Infinity],
      ]);
      return;
    }

    const PADDING_FLOW = 150;

    const maxVpX = minX - PADDING_FLOW;

    const minVpX = maxX + PADDING_FLOW;

    const maxVpY = minY - PADDING_FLOW;

    const minVpY = maxY + PADDING_FLOW;

    const newExtent: [[number, number], [number, number]] = [
      [-minVpX, -minVpY],
      [-maxVpX, -maxVpY],
    ];

    if (
      isNaN(newExtent[0][0]) ||
      isNaN(newExtent[0][1]) ||
      isNaN(newExtent[1][0]) ||
      isNaN(newExtent[1][1]) ||
      !isFinite(newExtent[0][0]) ||
      !isFinite(newExtent[0][1]) ||
      !isFinite(newExtent[1][0]) ||
      !isFinite(newExtent[1][1])
    ) {
      setCalculatedTranslateExtent([
        [-Infinity, -Infinity],
        [Infinity, Infinity],
      ]);
      return;
    }

    setCalculatedTranslateExtent(newExtent);
  }, [nodes, getViewport]);

  // Construct props for ReactFlow conditionally
  const reactFlowProps: ReactFlowProps = {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodesDelete,
    onEdgesDelete,
    onSelectionChange,
    onConnect,
    fitView: true,
    fitViewOptions,
    nodesDraggable: !isViewOnlyMode,
    nodesConnectable: !isViewOnlyMode,
    elementsSelectable: true,
    deleteKeyCode: isViewOnlyMode ? null : ['Backspace', 'Delete'],
    className: 'bg-background',
    proOptions: { hideAttribution: true },
    nodeTypes: nodeTypesConfig,
    edgeTypes: propEdgeTypes || defaultEdgeTypesConfig, // Use passed edgeTypes or default
    onNodeContextMenu,
    onPaneContextMenu,
    onNodeClick,
    // Merge drag/drop handlers: prefer custom handlers if provided, else fallback
    onDragOver: onDragOver,
    onDrop: onDrop,
    onDragLeave: onCanvasDragLeave || onDragLeave,
    onNodeDragStart: onNodeDragStart, // Pass onNodeDrop to ReactFlow
    onNodeDrag,
    onNodeDragStop,
    panActivationKeyCode: isViewOnlyMode
      ? undefined
      : (panActivationKeyCode ?? undefined),
    zoomOnScroll: true,
    zoomOnPinch: true,
    minZoom: 0.1,
    maxZoom: 4,
    translateExtent: calculatedTranslateExtent,
    onlyRenderVisibleElements: true,
  };

  if (!isViewOnlyMode && onPaneDoubleClick) {
    reactFlowProps.onDoubleClick = onPaneDoubleClick;
  }
  if (!isViewOnlyMode && typeof onPaneDoubleClick === 'function') {
    // Re-added type check for safety with conditional
    reactFlowProps.zoomOnDoubleClick = false; // Disable zoom if custom double click is active
  } else {
    reactFlowProps.zoomOnDoubleClick = !isViewOnlyMode; // Allow zoom if no custom handler or in viewOnly
  }

  return (
    <Card
      className={cn(
        'h-full w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden',
        'relative' // Added relative positioning for the absolute positioned hint
      )}
    >
      {nodes.length === 0 && !isViewOnlyMode && (
        <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10'>
          <p className='text-sm text-muted-foreground/50 italic'>
            Double-click to add a new node, or use the toolbar.
          </p>
        </div>
      )}
      <ReactFlow {...reactFlowProps}>
        <Controls showInteractive={!isViewOnlyMode} />
        <MiniMap nodeColor={nodeColor} nodeStrokeWidth={2} zoomable pannable />
        <Background
          variant={BackgroundVariant.Dots}
          gap={gridSize}
          size={1}
          color='hsl(var(--border)/0.7)'
        />
        {allSnapLinesToRender.map((line, index) => (
          <svg
            key={`snapline-${index}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            <line
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke='hsl(var(--primary)/0.7)'
              strokeWidth='1'
              strokeDasharray='3,3'
            />
          </svg>
        ))}
      </ReactFlow>
      {/* Render Drag Preview Element */}
      {draggedItemPreview && !isViewOnlyMode && (
        <div
          style={{
            position: 'absolute',
            left: `${draggedItemPreview.x}px`, // These are flow coordinates
            top: `${draggedItemPreview.y}px`,
            transform: 'translate(-50%, -50%)', // Center on cursor
            padding: '8px 12px',
            background: 'hsl(var(--card-values))',
            border: '1px dashed hsl(var(--primary-values))',
            borderRadius: 'var(--radius, 0.5rem)',
            color: 'hsl(var(--card-foreground-values))',
            fontSize: '0.875rem',
            opacity: 0.75,
            pointerEvents: 'none', // Crucial: preview should not intercept mouse events
            zIndex: 1500,
          }}
        >
          {draggedItemPreview.text}
        </div>
      )}

      {/* Visual Edge Suggestion Overlay */}
      {activeVisualEdgeSuggestion &&
        !isViewOnlyMode &&
        (() => {
          const sourceNode = nodes.find(
            (n) => n.id === activeVisualEdgeSuggestion.sourceNodeId
          );
          const targetNode = nodes.find(
            (n) => n.id === activeVisualEdgeSuggestion.targetNodeId
          );

          if (!sourceNode || !targetNode) return null;

          const DEFAULT_NODE_WIDTH = 150;
          const DEFAULT_NODE_HEIGHT = 70;

          const sourceNodeWidth = sourceNode.width || DEFAULT_NODE_WIDTH;
          const sourceNodeHeight = sourceNode.height || DEFAULT_NODE_HEIGHT;
          const targetNodeWidth = targetNode.width || DEFAULT_NODE_WIDTH;
          const targetNodeHeight = targetNode.height || DEFAULT_NODE_HEIGHT;

          const sourcePosition =
            sourceNode.positionAbsolute ?? sourceNode.position;
          const targetPosition =
            targetNode.positionAbsolute ?? targetNode.position;

          const sourcePos = {
            x: sourcePosition.x + sourceNodeWidth / 2,
            y: sourcePosition.y + sourceNodeHeight / 2,
          };
          const targetPos = {
            x: targetPosition.x + targetNodeWidth / 2,
            y: targetPosition.y + targetNodeHeight / 2,
          };

          const midX = (sourcePos.x + targetPos.x) / 2;
          const midY = (sourcePos.y + targetPos.y) / 2;

          // Convert flow coordinates to screen coordinates for absolute HTML positioning
          // const labelScreenPos = project({ x: midX, y: midY - 30 }); // Label is now rendered by React Flow edge
          const acceptButtonScreenPos = project({ x: midX - 28, y: midY }); // Adjusted for spacing
          const rejectButtonScreenPos = project({ x: midX + 28, y: midY }); // Adjusted for spacing

          // Line rendering is omitted as per subtask notes, focusing on buttons and label.
          // The temporary edge itself (including its label) is rendered by FlowCanvasCore.tsx

          return (
            <>
              {/* The div for the label has been removed. React Flow will render the label on the temporary edge. */}
              <Button
                variant='outline'
                size='icon'
                style={{
                  position: 'absolute',
                  left: acceptButtonScreenPos.x,
                  top: acceptButtonScreenPos.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1001,
                  backgroundColor: 'hsl(var(--background-values))',
                  width: '24px',
                  height: '24px',
                }}
                onClick={() =>
                  onAcceptVisualEdge?.(activeVisualEdgeSuggestion.id)
                }
                title='Accept suggestion'
              >
                <CheckIcon className='h-4 w-4 text-green-600' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                style={{
                  position: 'absolute',
                  left: rejectButtonScreenPos.x,
                  top: rejectButtonScreenPos.y,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1001,
                  backgroundColor: 'hsl(var(--background-values))',
                  width: '24px',
                  height: '24px',
                }}
                onClick={() =>
                  onRejectVisualEdge?.(activeVisualEdgeSuggestion.id)
                }
                title='Reject suggestion'
              >
                <XIcon className='h-4 w-4 text-red-600' />
              </Button>
            </>
          );
        })()}
    </Card>
  );
};

export const InteractiveCanvas = React.memo(InteractiveCanvasComponent);
InteractiveCanvas.displayName = 'InteractiveCanvas';
