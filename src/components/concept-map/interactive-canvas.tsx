
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
  onPaneDoubleClickProp?: OnPaneDoubleClick; 
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
  onPaneDoubleClickProp, // Prop still received
  activeSnapLines = [],
  gridSize = 20,
  panActivationKeyCode,
}) => {
  const { viewport } = useReactFlow();
  const [calculatedTranslateExtent, setCalculatedTranslateExtent] = useState<[[number, number], [number, number]] | undefined>([[-Infinity, -Infinity], [Infinity, Infinity]]);

  useEffect(() => {
    if (
      !viewport ||
      typeof viewport.width !== 'number' || viewport.width <= 0 || isNaN(viewport.width) ||
      typeof viewport.height !== 'number' || viewport.height <= 0 || isNaN(viewport.height) ||
      typeof viewport.zoom !== 'number' || viewport.zoom <= 0 || isNaN(viewport.zoom)
    ) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    const currentVpWidth = viewport.width;
    const currentVpHeight = viewport.height;
    const currentVpZoom = viewport.zoom;
    
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

    const MIN_PADDING = 150;
    const VIEWPORT_PADDING_FACTOR = 0.15; 
    const PADDING_X = Math.max(MIN_PADDING, currentVpWidth * VIEWPORT_PADDING_FACTOR);
    const PADDING_Y = Math.max(MIN_PADDING, currentVpHeight * VIEWPORT_PADDING_FACTOR);

    const minViewportX = -(maxX + PADDING_X - (currentVpWidth / currentVpZoom));
    const maxViewportX = -(minX - PADDING_X);
    
    const minViewportY = -(maxY + PADDING_Y - (currentVpHeight / currentVpZoom));
    const maxViewportY = -(minY - PADDING_Y);

    if (
      isNaN(minViewportX) || isNaN(maxViewportX) ||
      isNaN(minViewportY) || isNaN(maxViewportY) ||
      !isFinite(minViewportX) || !isFinite(maxViewportX) ||
      !isFinite(minViewportY) || !isFinite(maxViewportY)
    ) {
      setCalculatedTranslateExtent([[-Infinity, -Infinity], [Infinity, Infinity]]);
      return;
    }
    
    setCalculatedTranslateExtent([
      [minViewportX, minViewportY],
      [maxViewportX, maxViewportY]
    ]);

  }, [nodes, viewport]); 

  // TEMPORARY: For debugging the onPaneDoubleClick warning
  const handleNoOpDoubleClickForTest = useCallback((event: React.MouseEvent) => {
    // console.log("Pane double-clicked (TEST HANDLER in InteractiveCanvas)", event);
    // If not in view only mode, and the actual prop handler exists, call it
    if (!isViewOnlyMode && typeof onPaneDoubleClickProp === 'function') {
      onPaneDoubleClickProp(event);
    }
  }, [isViewOnlyMode, onPaneDoubleClickProp]);

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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
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
        // Pass the new test handler. It internally calls the original prop if conditions met.
        onPaneDoubleClick={handleNoOpDoubleClickForTest}
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
    

    