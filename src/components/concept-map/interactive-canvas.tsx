
"use client";

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
  type SelectionChanges,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
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
  const type = node.data?.type || 'default';
  const nodeTypeColors: { [key: string]: string } = {
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
  onPaneDoubleClick,
  activeSnapLines = [],
  gridSize = 20,
  panActivationKeyCode,
}) => {
  const { screenToFlowPosition } = useReactFlow();
  const [isSpacePanning, setIsSpacePanning] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsSpacePanning(true);
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        setIsSpacePanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);


  const handlePaneDoubleClick = (event: React.MouseEvent) => {
    if (isViewOnlyMode || !onPaneDoubleClick) return;
    onPaneDoubleClick(event);
  };

  return (
    <Card className={cn(
      "h-full w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden",
      isSpacePanning && !isViewOnlyMode && "cursor-grab"
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
        onPaneDoubleClick={handlePaneDoubleClick}
        panOnDrag={!isViewOnlyMode}
        panActivationKeyCode={isViewOnlyMode ? undefined : panActivationKeyCode}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={!isViewOnlyMode}
        selectionOnDrag={!isViewOnlyMode}
        minZoom={0.1}
        maxZoom={4}
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
              stroke="hsl(var(--destructive)/0.7)"
              strokeWidth="1"
              strokeDasharray={line.type === 'vertical' || line.type === 'horizontal' ? "3,3" : undefined}
            />
          </svg>
        ))}
      </ReactFlow>
    </Card>
  );
};

export const InteractiveCanvas = React.memo(InteractiveCanvasComponent);
InteractiveCanvas.displayName = 'InteractiveCanvas';
    
