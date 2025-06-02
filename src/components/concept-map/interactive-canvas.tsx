
"use client";

import React, { useMemo } from 'react';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  ReactFlowProvider,
  type Node,
  type Edge,
  type FitViewOptions,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { ConceptMapData, ConceptMapNode as AppNode, ConceptMapEdge as AppEdge } from '@/types';
import { Card } from '@/components/ui/card';

interface InteractiveCanvasProps {
  mapData: ConceptMapData;
}

const fitViewOptions: FitViewOptions = {
  padding: 0.2,
};

const nodeColor = (node: Node) => {
  // Example: color based on type, can be expanded
  switch (node.type) {
    case 'input':
      return '#6ede87';
    case 'output':
      return '#6865A5';
    default:
      return '#ff0072';
  }
};

export function InteractiveCanvas({ mapData }: InteractiveCanvasProps) {
  const { nodes: appNodes = [], edges: appEdges = [] } = mapData || { nodes: [], edges: []};

  const reactFlowNodes: Node[] = useMemo(() => 
    appNodes.map((node: AppNode, index: number) => ({
      id: node.id,
      type: node.type || 'default', 
      data: { label: node.text, details: node.details },
      position: {
        x: node.x ?? (index % 5) * 200, // Basic horizontal spread
        y: node.y ?? Math.floor(index / 5) * 120, // Basic vertical spread
      },
      style: {
        // Basic styling, can be customized further
        border: '1px solid #777',
        padding: 10,
        borderRadius: 5,
        background: 'hsl(var(--card))',
        color: 'hsl(var(--card-foreground))',
        minWidth: 150,
      }
    })), [appNodes]
  );

  const reactFlowEdges: Edge[] = useMemo(() => 
    appEdges.map((edge: AppEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: 'smoothstep', // Or 'default', 'straight', 'step'
      animated: false, // Set to true for animated edges
      style: { strokeWidth: 2 }
    })), [appEdges]
  );
  
  // Ensure there's a key on ReactFlow if nodes/edges can be empty to force re-mount
  // Or handle empty state explicitly if needed.
  const flowKey = `rf-${reactFlowNodes.length}-${reactFlowEdges.length}`;


  return (
    <Card className="h-[calc(100vh-200px)] w-full rounded-lg border-2 border-muted-foreground/30 bg-muted/10 shadow-inner overflow-hidden">
      <ReactFlowProvider>
        <ReactFlow
          key={flowKey} // Helps ReactFlow re-initialize if nodes/edges radically change
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          fitView
          fitViewOptions={fitViewOptions}
          nodesDraggable={true}
          // onNodesChange={onNodesChange} // For later: saving layout changes
          // onEdgesChange={onEdgesChange} // For later: saving layout changes
          // onConnect={onConnect} // For later: creating edges via UI
          className="bg-background"
        >
          <Controls />
          <MiniMap nodeColor={nodeColor} nodeStrokeWidth={3} zoomable pannable />
          <Background gap={16} color="hsl(var(--border))" />
        </ReactFlow>
      </ReactFlowProvider>
    </Card>
  );
}
