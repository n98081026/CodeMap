
"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
  type SelectionChanges,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  type OnPaneDoubleClick,
  type Viewport,
  type ReactFlowProps, // Import ReactFlowProps
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import useConceptMapStore from '@/stores/concept-map-store'; // Added import
import CustomNodeComponent, { type CustomNodeData } from './custom-node';
import OrthogonalEdge, { type OrthogonalEdgeData } from './orthogonal-edge';
import { cn } from '@/lib/utils';

// Define nodeTypesConfig and edgeTypesConfig as top-level constants here
const nodeTypesConfig: NodeTypes = {
  customConceptNode: CustomNodeComponent,
};

const edgeTypesConfig: EdgeTypes = {
  orthogonal: OrthogonalEdge,
};

interface InteractiveCanvasProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<OrthogonalEdgeData>[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onSelectionChange?: (params: SelectionChanges) => void;
  onConnect?: (params: Connection) => void;
  isViewOnlyMode?: boolean;
  onNodeContextMenu?: (event: React.MouseEvent, node: Node<CustomNodeData>) => void;
  onNodeDrag?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void;
  onPaneDoubleClick?: OnPaneDoubleClick;
  onPaneContextMenu?: (event: React.MouseEvent) => void;
  onNodeClick?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void;
  onDragOver?: (event: React.DragEvent) => void; // Prop from parent (FlowCanvasCore)
  onCanvasDrop?: (data: {type: string, text: string}, position: {x:number, y:number}) => void; // New prop for parsed drop data
  activeSnapLines?: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>;
  gridSize?: number;
  panActivationKeyCode?: string | null;
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
    key_feature: 'hsl(var(--chart-1))',
    service_component: 'hsl(var(--chart-2))',
    ui_view: 'hsl(var(--chart-3))',
    data_model: 'hsl(var(--chart-4))',
    default: 'hsl(var(--muted))',
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
  onCanvasDrop, // Destructure new prop
  activeSnapLines = [],
  gridSize = 20,
  panActivationKeyCode,
}) => {
  console.log(`[InteractiveCanvasComponent Render] Received nodes prop count: ${nodes?.length ?? 'N/A'}. Last node: ${nodes && nodes.length > 0 ? JSON.stringify(nodes[nodes.length-1]) : 'N/A'}`);
  // Also send to store's debug log for easier collection if console is not always available during testing
  useConceptMapStore.getState().addDebugLog(`[InteractiveCanvasComponent Render] Received nodes prop count: ${nodes?.length ?? 'N/A'}. Last node ID: ${nodes && nodes.length > 0 ? nodes[nodes.length-1]?.id : 'N/A'}`);
  const reactFlowInstance = useReactFlow(); // Get instance for screenToFlowPosition
  const { viewport, getViewport } = reactFlowInstance;
  const [calculatedTranslateExtent, setCalculatedTranslateExtent] = useState<[[number, number], [number, number]] | undefined>([[-Infinity, -Infinity], [Infinity, Infinity]]);

  const handleDragOverOnCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (props.onDragOver) { // Call parent's onDragOver if provided
        props.onDragOver(event);
    }
  }, [props.onDragOver]);

  const handleDropOnCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const jsonData = event.dataTransfer.getData('application/json');
    if (jsonData && reactFlowInstance) {
        try {
            const droppedData = JSON.parse(jsonData);
            if (droppedData.type === 'concept-suggestion' && typeof droppedData.text === 'string') {
                const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
                onCanvasDrop?.(droppedData, positionInFlow); // Call the new prop from FlowCanvasCore
            }
        } catch (e) {
            console.error("Failed to parse dropped data:", e);
            useConceptMapStore.getState().addDebugLog("[InteractiveCanvasComponent] Failed to parse dropped data on drop.");
        }
    }
    event.dataTransfer.clearData();
  }, [reactFlowInstance, onCanvasDrop]);

  useEffect(() => {
    const currentViewport = getViewport(); 

    if (
      !currentViewport ||
      typeof currentViewport.width !== 'number' || currentViewport.width <= 0 || isNaN(currentViewport.width) ||
      typeof currentViewport.height !== 'number' || currentViewport.height <= 0 || isNaN(currentViewport.height) ||
      typeof currentViewport.zoom !== 'number' || currentViewport.zoom <= 0 || isNaN(currentViewport.zoom)
    ) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    const currentVpWidth = currentViewport.width;
    const currentVpHeight = currentViewport.height;
    const currentVpZoom = currentViewport.zoom;
    
    if (nodes.length === 0) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      const nodeWidth = node.width || 150; 
      const nodeHeight = node.height || 70;
      const posX = node.position.x; 
      const posY = node.position.y;
      
      minX = Math.min(minX, posX);
      minY = Math.min(minY, posY);
      maxX = Math.max(maxX, posX + nodeWidth);
      maxY = Math.max(maxY, posY + nodeHeight);
    });

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }

    const PADDING_FLOW = 150; 
    
    const contentWidthWithPadding = (maxX - minX) + 2 * PADDING_FLOW;
    const contentHeightWithPadding = (maxY - minY) + 2 * PADDING_FLOW;

    const maxVpX = contentWidthWithPadding < (currentVpWidth / currentVpZoom) 
        ? (minX - PADDING_FLOW) - ( (currentVpWidth / currentVpZoom) - contentWidthWithPadding ) / 2
        : (minX - PADDING_FLOW);

    const minVpX = contentWidthWithPadding < (currentVpWidth / currentVpZoom)
        ? (minX - PADDING_FLOW) + ( (currentVpWidth / currentVpZoom) - contentWidthWithPadding ) / 2 - (currentVpWidth / currentVpZoom)
        : (maxX + PADDING_FLOW) - (currentVpWidth / currentVpZoom);

    const maxVpY = contentHeightWithPadding < (currentVpHeight / currentVpZoom)
        ? (minY - PADDING_FLOW) - ( (currentVpHeight / currentVpZoom) - contentHeightWithPadding ) / 2
        : (minY - PADDING_FLOW);
    
    const minVpY = contentHeightWithPadding < (currentVpHeight / currentVpZoom)
        ? (minY - PADDING_FLOW) + ( (currentVpHeight / currentVpZoom) - contentHeightWithPadding ) / 2 - (currentVpHeight / currentVpZoom)
        : (maxY + PADDING_FLOW) - (currentVpHeight / currentVpZoom);


    const newExtent: [[number, number], [number, number]] = [
        [-minVpX, -minVpY], 
        [-maxVpX, -maxVpY]
    ];
    
    if (
      isNaN(newExtent[0][0]) || isNaN(newExtent[0][1]) || isNaN(newExtent[1][0]) || isNaN(newExtent[1][1]) ||
      !isFinite(newExtent[0][0]) || !isFinite(newExtent[0][1]) || !isFinite(newExtent[1][0]) || !isFinite(newExtent[1][1])
    ) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    setCalculatedTranslateExtent(newExtent);

  }, [nodes, viewport, getViewport]);
  
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
    className: "bg-background",
    proOptions: { hideAttribution: true },
    nodeTypes: nodeTypesConfig,
    edgeTypes: edgeTypesConfig,
    onNodeContextMenu,
    onPaneContextMenu,
    onNodeClick,
    onDragOver: handleDragOverOnCanvas, // Pass local handler
    onDrop: handleDropOnCanvas,       // Pass local handler
    onNodeDrag,
    onNodeDragStop,
    panActivationKeyCode: isViewOnlyMode ? undefined : panActivationKeyCode ?? undefined,
    zoomOnScroll: true,
    zoomOnPinch: true,
    minZoom: 0.1,
    maxZoom: 4,
    translateExtent: calculatedTranslateExtent,
    onlyRenderVisibleElements: true,
  };

  if (!isViewOnlyMode && onPaneDoubleClick) {
    reactFlowProps.onPaneDoubleClick = onPaneDoubleClick;
  }
   if (!isViewOnlyMode && typeof onPaneDoubleClick === 'function') { // Re-added type check for safety with conditional
    reactFlowProps.zoomOnDoubleClick = false; // Disable zoom if custom double click is active
  } else {
    reactFlowProps.zoomOnDoubleClick = !isViewOnlyMode; // Allow zoom if no custom handler or in viewOnly
  }


  return (
    <Card className={cn(
      "h-full w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden",
      "relative" // Added relative positioning for the absolute positioned hint
    )}>
      {nodes.length === 0 && !isViewOnlyMode && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <p className="text-sm text-muted-foreground/50 italic">
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
          color="hsl(var(--border)/0.7)"
        />
        {activeSnapLines.map((line, index) => (
          <svg key={`snapline-${index}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
            <line
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="hsl(var(--primary)/0.7)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
          </svg>
        ))}
      </ReactFlow>
    </Card>
  );
};

export const InteractiveCanvas = React.memo(InteractiveCanvasComponent);
InteractiveCanvas.displayName = 'InteractiveCanvas';
    

    