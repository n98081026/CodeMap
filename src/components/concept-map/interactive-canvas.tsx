
"use client";

import React from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  type Node,
  type Edge,
  type FitViewOptions,
  type OnNodesChange,
  type OnEdgesChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
// No longer need AppNode/AppEdge here as props are already transformed
// import type { ConceptMapNode as AppNode, ConceptMapEdge as AppEdge } from '@/types';
import { Card } from '@/components/ui/card';

interface InteractiveCanvasProps {
  nodes: Node[]; // Expect React Flow Node type
  edges: Edge[]; // Expect React Flow Edge type
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  isViewOnlyMode?: boolean;
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeColor = (node: Node) => {
  // Example: color based on type, can be expanded
  switch (node.type) {
    case 'input':
      return '#6ede87'; // A green color
    case 'output':
      return '#6865A5'; // A purple color
    default:
      // A fallback color for other node types
      return 'hsl(var(--primary))'; // Use theme primary
  }
};

export function InteractiveCanvas({ nodes, edges, onNodesChange, onEdgesChange, isViewOnlyMode }: InteractiveCanvasProps) {
  
  // Key for ReactFlow component to help with re-renders if nodes/edges radically change
  const flowKey = `rf-${nodes.length}-${edges.length}`;

  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          key={flowKey}
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          fitView
          fitViewOptions={fitViewOptions}
          nodesDraggable={!isViewOnlyMode}
          nodesConnectable={!isViewOnlyMode} // For later: creating edges via UI
          elementsSelectable={!isViewOnlyMode}
          // onConnect={onConnect} // For later: creating edges via UI
          className="bg-background"
          proOptions={{ hideAttribution: true }} // Hides "React Flow" attribution
        >
          <Controls showInteractive={!isViewOnlyMode} />
          <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable />
          <Background gap={16} color="hsl(var(--border))" />
        </ReactFlow>
      </ReactFlowProvider>
    </Card>
  );
}
