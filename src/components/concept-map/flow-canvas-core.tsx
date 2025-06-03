
"use client";

import React, { useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState, MarkerType, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';

// Define these types or import if they are shared
export interface RFConceptMapNodeData {
  label: string;
  details?: string;
  type?: string; 
}

export interface RFConceptMapEdgeData {
  label?: string;
}

interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onNodesChangeInStore: (nodeId: string, updates: Partial<ConceptMapNode>) => void; // For position mainly
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: { source: string; target: string; label?: string }) => void;
}

const FlowCanvasCore: React.FC<FlowCanvasCoreProps> = ({
  mapDataFromStore,
  isViewOnlyMode,
  onSelectionChange,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
}) => {
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<RFConceptMapNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>([]);

  useEffect(() => {
    const transformedNodes = (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: appNode.type || 'default', 
      data: { label: appNode.text, details: appNode.details, type: appNode.type || 'default' },
      position: { x: appNode.x ?? Math.random() * 400, y: appNode.y ?? Math.random() * 300 },
      style: {
        border: '1px solid hsl(var(--border))',
        padding: '10px 15px',
        borderRadius: '8px',
        background: 'hsl(var(--card))',
        color: 'hsl(var(--foreground))',
        boxShadow: '0 2px 4px hsla(var(--foreground), 0.1)',
        minWidth: 150,
        textAlign: 'center',
      }
    }));
    setRfNodes(transformedNodes as RFNode<RFConceptMapNodeData>[]);

    const transformedEdges = (mapDataFromStore.edges || []).map(appEdge => ({
      id: appEdge.id,
      source: appEdge.source,
      target: appEdge.target,
      label: appEdge.label,
      type: 'smoothstep',
      animated: false,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
    }));
    setRfEdges(transformedEdges as RFEdge<RFConceptMapEdgeData>[]);
  }, [mapDataFromStore, setRfNodes, setRfEdges]);

  const handleRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes);
    changes.forEach(change => {
      if (change.type === 'position' && change.position && change.dragging === false) {
        onNodesChangeInStore(change.id, { x: change.position.x, y: change.position.y });
      }
      // Note: Other changes like 'dimensions' or 'select' are handled by React Flow.
      // If direct store updates for other node properties are needed from canvas interactions, add here.
    });
  }, [isViewOnlyMode, onNodesChangeReactFlow, onNodesChangeInStore]);

  const handleRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onEdgesChangeReactFlow(changes);
    // Handle edge updates if necessary, e.g., changing edge type via interaction (not common for this app)
  }, [isViewOnlyMode, onEdgesChangeReactFlow]);

  const handleRfNodesDeleted: OnNodesDelete = useCallback((deletedRfNodes) => {
    if (isViewOnlyMode) return;
    deletedRfNodes.forEach(node => onNodesDeleteInStore(node.id));
    // Parent (ConceptMapEditorPage) will show toast
  }, [isViewOnlyMode, onNodesDeleteInStore]);

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback((deletedRfEdges) => {
    if (isViewOnlyMode) return;
    deletedRfEdges.forEach(edge => onEdgesDeleteInStore(edge.id));
    // Parent (ConceptMapEditorPage) will show toast
  }, [isViewOnlyMode, onEdgesDeleteInStore]);

  const handleRfConnect = useCallback((params: Connection) => {
    if (isViewOnlyMode) return;
    onConnectInStore({ source: params.source!, target: params.target!, label: "connects" });
    // Parent (ConceptMapEditorPage) will show toast
  }, [isViewOnlyMode, onConnectInStore]);

  const handleRfSelectionChange = useCallback((selection: SelectionChanges) => {
    const { nodes, edges } = selection;
    if (nodes.length === 1 && edges.length === 0) {
      onSelectionChange(nodes[0].id, 'node');
    } else if (edges.length === 1 && nodes.length === 0) {
      onSelectionChange(edges[0].id, 'edge');
    } else {
      onSelectionChange(null, null);
    }
  }, [onSelectionChange]);

  return (
    <InteractiveCanvas
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={handleRfNodesChange}
      onEdgesChange={handleRfEdgesChange}
      onNodesDelete={handleRfNodesDeleted}
      onEdgesDelete={handleRfEdgesDeleted}
      onSelectionChange={handleRfSelectionChange}
      onConnect={handleRfConnect}
      isViewOnlyMode={isViewOnlyMode}
    />
  );
};

export default React.memo(FlowCanvasCore);

    