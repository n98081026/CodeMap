
"use client";

import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodesDelete,
  type OnEdgesDelete,
  type SelectionChanges,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import type { RFConceptMapNodeData, RFConceptMapEdgeData } from './flow-canvas-core'; // Import from new core

interface InteractiveCanvasProps {
  nodes: Node<RFConceptMapNodeData>[]; 
  edges: Edge<RFConceptMapEdgeData>[]; 
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onSelectionChange?: (params: SelectionChanges) => void;
  onConnect?: (params: Connection) => void; 
  isViewOnlyMode?: boolean;
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeColor = (node: Node<RFConceptMapNodeData>) => {
  // Example: customize node colors based on type
  switch (node.data?.type) { // Check node.data.type
    case 'ai-extracted-concept':
      return 'hsl(var(--accent))';
    case 'manual-node':
      return 'hsl(var(--primary))';
    default: // Includes 'ai-concept', 'directory', 'file', etc.
      return 'hsl(var(--secondary))'; 
  }
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
  isViewOnlyMode 
}) => {
  
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
      >
        <Controls showInteractive={!isViewOnlyMode} />
        <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable />
        <Background gap={16} color="hsl(var(--border))" />
      </ReactFlow>
    </Card>
  );
};

export const InteractiveCanvas = React.memo(InteractiveCanvasComponent);
InteractiveCanvas.displayName = 'InteractiveCanvas';

    