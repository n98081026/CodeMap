
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
  type Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import type { CustomNodeData } from './custom-node';
import type { RFConceptMapEdgeData } from './flow-canvas-core';
import { cn } from '@/lib/utils';

interface InteractiveCanvasProps {
  nodes: Node<CustomNodeData>[];
  edges: Edge<RFConceptMapEdgeData>[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onSelectionChange?: (params: SelectionChanges) => void;
  onConnect?: (params: Connection) => void;
  isViewOnlyMode?: boolean;
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  onNodeContextMenu?: (event: React.MouseEvent, node: Node<CustomNodeData>) => void;
  onNodeDrag?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void;
  onPaneDoubleClick?: (event: React.MouseEvent) => void;
  activeSnapLines?: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>;
  gridSize?: number;
  panActivationKeyCode?: string;
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
  nodeTypes,
  edgeTypes,
  onNodeContextMenu,
  onNodeDrag,
  onNodeDragStop,
  onPaneDoubleClick: onPaneDoubleClickProp,
  activeSnapLines = [],
  gridSize = 20,
  panActivationKeyCode,
}) => {
  const { viewport } = useReactFlow();
  const [calculatedTranslateExtent, setCalculatedTranslateExtent] = useState<[[number, number], [number, number]] | undefined>([[-Infinity, -Infinity], [Infinity, Infinity]]);

  useEffect(() => {
    // Use viewport directly from useReactFlow() for current dimensions and zoom
    const currentVp = viewport;

    if (
      currentVp.zoom === 0 || currentVp.width === 0 || currentVp.height === 0 ||
      isNaN(currentVp.width) || isNaN(currentVp.height) || isNaN(currentVp.zoom)
    ) {
      // Viewport not ready or invalid, reset to default to avoid NaN propagation
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    if (nodes.length === 0) {
      // No nodes, allow infinite panning
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    nodes.forEach(node => {
      const nodeWidth = node.width || 150; // Use a default if node.width is not yet available
      const nodeHeight = node.height || 70; // Use a default
      const posX = node.position.x; // Use relative position from store
      const posY = node.position.y;
      
      minX = Math.min(minX, posX);
      minY = Math.min(minY, posY);
      maxX = Math.max(maxX, posX + nodeWidth);
      maxY = Math.max(maxY, posY + nodeHeight);
    });

    if (minX === Infinity || minY === Infinity || maxX === -Infinity || maxY === -Infinity) {
      // This can happen if nodes array is manipulated mid-calculation or positions are invalid
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }

    const MIN_PADDING = 150;
    const VIEWPORT_PADDING_FACTOR = 0.15; 
    const PADDING_X = Math.max(MIN_PADDING, currentVp.width * VIEWPORT_PADDING_FACTOR);
    const PADDING_Y = Math.max(MIN_PADDING, currentVp.height * VIEWPORT_PADDING_FACTOR);

    // Calculate the allowed range for viewport's top-left (viewport.x, viewport.y)
    // minViewportX ensures the right edge of content (maxX + PADDING_X) doesn't go past the right edge of viewport
    const minViewportX = -(maxX + PADDING_X - (currentVp.width / currentVp.zoom));
    // maxViewportX ensures the left edge of content (minX - PADDING_X) doesn't go past the left edge of viewport
    const maxViewportX = -(minX - PADDING_X);
    
    const minViewportY = -(maxY + PADDING_Y - (currentVp.height / currentVp.zoom));
    const maxViewportY = -(minY - PADDING_Y);

    if (
      isNaN(minViewportX) || isNaN(maxViewportX) ||
      isNaN(minViewportY) || isNaN(maxViewportY) ||
      !isFinite(minViewportX) || !isFinite(maxViewportX) ||
      !isFinite(minViewportY) || !isFinite(maxViewportY)
    ) {
      // console.warn("Calculated translateExtent contained NaN/Infinity, resetting to default.");
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    setCalculatedTranslateExtent([
      [minViewportX, minViewportY],
      [maxViewportX, maxViewportY]
    ]);

  }, [nodes, viewport.width, viewport.height, viewport.zoom]);


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
        fitView
        fitViewOptions={fitViewOptions}
        nodesDraggable={!isViewOnlyMode}
        nodesConnectable={!isViewOnlyMode}
        elementsSelectable={true}
        deleteKeyCode={isViewOnlyMode ? null : ['Backspace', 'Delete']}
        className="bg-background"
        proOptions={{ hideAttribution: true }}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneDoubleClick={isViewOnlyMode ? undefined : onPaneDoubleClickProp}
        panOnDrag={!isViewOnlyMode}
        panActivationKeyCode={isViewOnlyMode ? undefined : panActivationKeyCode}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={!isViewOnlyMode}
        selectionOnDrag={!isViewOnlyMode}
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
    
