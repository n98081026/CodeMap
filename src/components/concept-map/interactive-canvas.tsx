
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
  type OnNodesDelete,
  type OnEdgesDelete,
  type SelectionChanges,
  type Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import type { RFConceptMapNodeData, RFConceptMapEdgeData } from '@/app/application/concept-maps/editor/[mapId]/page'; // Import shared types

interface InteractiveCanvasProps {
  nodes: Node<RFConceptMapNodeData>[]; 
  edges: Edge<RFConceptMapEdgeData>[]; 
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onNodesDelete?: OnNodesDelete;
  onEdgesDelete?: OnEdgesDelete;
  onSelectionChange?: (params: SelectionChanges) => void;
  onConnect?: (params: Connection) => void; // Added onConnect prop
  isViewOnlyMode?: boolean;
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeColor = (node: Node) => {
  switch (node.type) {
    case 'input':
      return '#6ede87'; 
    case 'output':
      return '#6865A5'; 
    default:
      return 'hsl(var(--primary))';
  }
};

export function InteractiveCanvas({ 
  nodes, 
  edges, 
  onNodesChange, 
  onEdgesChange, 
  onNodesDelete,
  onEdgesDelete,
  onSelectionChange,
  onConnect, // Destructure onConnect
  isViewOnlyMode 
}: InteractiveCanvasProps) {
  
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
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onSelectionChange={onSelectionChange}
          onConnect={onConnect} // Pass onConnect to ReactFlow
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
      </ReactFlowProvider>
    </Card>
  );
}

