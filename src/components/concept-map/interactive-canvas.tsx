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
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
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
  activeSnapLines = [],
  gridSize = 20,
  panActivationKeyCode,
}) => {
  const { viewport, getViewport } = useReactFlow(); // getViewport can be used if viewport state updates too slowly
  const [calculatedTranslateExtent, setCalculatedTranslateExtent] = useState<[[number, number], [number, number]] | undefined>([[-Infinity, -Infinity], [Infinity, Infinity]]);

  useEffect(() => {
    const currentViewport = getViewport(); // Use getViewport for immediate values

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
      // Use node.position which is already in flow coordinates
      const posX = node.position.x; 
      const posY = node.position.y;
      
      minX = Math.min(minX, posX);
      minY = Math.min(minY, posY);
      maxX = Math.max(maxX, posX + nodeWidth);
      maxY = Math.max(maxY, posY + nodeHeight);
    });

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      // No valid nodes with dimensions, allow infinite panning
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }

    // Padding around the content in flow coordinates
    const PADDING_FLOW = 150; 
    
    // Calculate the required viewport width/height in flow coordinates to show content + padding
    const contentWidthWithPadding = (maxX - minX) + 2 * PADDING_FLOW;
    const contentHeightWithPadding = (maxY - minY) + 2 * PADDING_FLOW;

    // Max viewport X (how far right the viewport can be dragged, relative to origin 0,0)
    // If content is smaller than viewport, we center it.
    const maxVpX = contentWidthWithPadding < (currentVpWidth / currentVpZoom) 
        ? (minX - PADDING_FLOW) - ( (currentVpWidth / currentVpZoom) - contentWidthWithPadding ) / 2
        : (minX - PADDING_FLOW);

    // Min viewport X (how far left the viewport can be dragged)
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
        [-minVpX, -minVpY], // Translate extent is negative of viewport position
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

  }, [nodes, viewport, getViewport]); // Listen to viewport changes as well for zoom/resize
  
  return (
    <Card className={cn(
      "h-full w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden",
    )}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onSelectionChange={onSelectionChange}
        onConnect={onConnect}
        fitView={true}
        fitViewOptions={fitViewOptions}
        nodesDraggable={!isViewOnlyMode}
        nodesConnectable={!isViewOnlyMode}
        elementsSelectable={true}
        deleteKeyCode={isViewOnlyMode ? null : ['Backspace', 'Delete']}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
        nodeTypes={nodeTypesConfig} 
        edgeTypes={edgeTypesConfig} 
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        panOnDrag={!isViewOnlyMode} // Enables touch panning if !isViewOnlyMode
        selectionOnDrag={true} // Enables selection box by dragging on pane
        onPaneDoubleClick={!isViewOnlyMode && typeof onPaneDoubleClick === 'function' ? onPaneDoubleClick : undefined}
        zoomOnDoubleClick={!isViewOnlyMode && typeof onPaneDoubleClick === 'function' ? false : !isViewOnlyMode}
        panActivationKeyCode={isViewOnlyMode ? undefined : panActivationKeyCode ?? undefined}
        zoomOnScroll={true}
        zoomOnPinch={true}
        minZoom={0.1}
        maxZoom={4}
        translateExtent={calculatedTranslateExtent}
        onlyRenderVisibleElements={true}
      >
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
    
