
"use client";

import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant, // Import BackgroundVariant
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
  type EdgeTypes, // Added EdgeTypes
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import type { CustomNodeData } from './custom-node';
import type { RFConceptMapEdgeData } from './flow-canvas-core'; // Assuming this path is correct

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
  edgeTypes?: EdgeTypes; // Added edgeTypes prop
  onNodeContextMenu?: (event: React.MouseEvent, node: Node<CustomNodeData>) => void;
  onNodeDrag?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void; // Added onNodeDrag
  onNodeDragStop?: (event: React.MouseEvent, node: Node<CustomNodeData>, nodes: Node<CustomNodeData>[]) => void;
  onPaneDoubleClick?: (event: React.MouseEvent) => void;
  activeSnapLines?: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>;
  gridSize?: number; // Added gridSize prop
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
  duration: 300,
};

const nodeColor = (node: Node<CustomNodeData>) => {
  const type = node.data?.type || 'default';
  const nodeTypeColors: { [key: string]: string } = {
    key_feature: 'hsl(210 70% 50%)',
    service_component: 'hsl(145 63% 42%)',
    ui_view: 'hsl(262 80% 58%)',
    data_model: 'hsl(48 96% 53%)',
    'ai-extracted-concept': 'hsl(210 20% 85%)',
    default: 'hsl(210 20% 90%)',
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
  edgeTypes, // Destructure edgeTypes
  onNodeContextMenu,
  onNodeDrag, // Destructure onNodeDrag
  onNodeDragStop,
  onPaneDoubleClick,
  activeSnapLines = [],
  gridSize = 20, // Default grid size
}) => {
  const { screenToFlowPosition } = useReactFlow(); 

  const handlePaneDoubleClick = (event: React.MouseEvent) => {
    if (isViewOnlyMode || !onPaneDoubleClick) return;
    onPaneDoubleClick(event);
  };

  return (
    <Card className="h-full w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden">
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
        edgeTypes={edgeTypes} // Pass edgeTypes to ReactFlow
        onNodeContextMenu={onNodeContextMenu}
        onNodeDrag={onNodeDrag} // Pass onNodeDrag
        onNodeDragStop={onNodeDragStop}
        onPaneDoubleClick={handlePaneDoubleClick}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        zoomOnDoubleClick={!isViewOnlyMode}
        selectionOnDrag={!isViewOnlyMode}
      >
        <Controls showInteractive={!isViewOnlyMode} />
        <MiniMap nodeColor={nodeColor} nodeStrokeWidth={2} zoomable pannable />
        <Background 
          variant={BackgroundVariant.Dots} // Changed to Dots
          gap={gridSize} 
          size={1} // Smaller dots
          color="hsl(var(--border)/0.7)" 
        />
        {activeSnapLines.map((line, index) => (
          <svg key={`snapline-${index}`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>
            <line
              x1={line.x1} y1={line.y1}
              x2={line.x2} y2={line.y2}
              stroke="hsl(var(--destructive)/0.7)" // Red color for snap lines
              strokeWidth="1"
              strokeDasharray={line.type === 'vertical' || line.type === 'horizontal' ? "3,3" : undefined} // Dashed for clear visual
            />
          </svg>
        ))}
      </ReactFlow>
    </Card>
  );
};

export const InteractiveCanvas = React.memo(InteractiveCanvasComponent);
InteractiveCanvas.displayName = 'InteractiveCanvas';
