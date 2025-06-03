
"use client";

import React, { useEffect, useCallback } from 'react';
import { useNodesState, useEdgesState, MarkerType, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, type NodeTypes } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import CustomNodeComponent, { type CustomNodeData } from './custom-node';

export interface RFConceptMapEdgeData {
  label?: string;
}

const nodeTypesConfig: NodeTypes = {
  customConceptNode: CustomNodeComponent,
};

interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onNodesChangeInStore: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string }) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void;
}

const FlowCanvasCore: React.FC<FlowCanvasCoreProps> = ({
  mapDataFromStore,
  isViewOnlyMode,
  onSelectionChange,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onNodeContextMenu,
}) => {
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>([]);

  useEffect(() => {
    const transformedNodes = (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: 'customConceptNode',
      data: { label: appNode.text, details: appNode.details, type: appNode.type || 'default' },
      position: { x: appNode.x ?? Math.random() * 400, y: appNode.y ?? Math.random() * 300 },
      draggable: !isViewOnlyMode,
      selectable: true,
      connectable: !isViewOnlyMode,
      dragHandle: '.cursor-move',
    }));
    setRfNodes(transformedNodes as RFNode<CustomNodeData>[]);

    const transformedEdges = (mapDataFromStore.edges || []).map(appEdge => ({
      id: appEdge.id,
      source: appEdge.source,
      target: appEdge.target,
      sourceHandle: appEdge.sourceHandle || null,
      targetHandle: appEdge.targetHandle || null,
      label: appEdge.label,
      type: 'smoothstep',
      animated: false,
      style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
      updatable: !isViewOnlyMode,
      deletable: !isViewOnlyMode,
      selectable: true,
    }));
    setRfEdges(transformedEdges as RFEdge<RFConceptMapEdgeData>[]);
  }, [mapDataFromStore, setRfNodes, setRfEdges, isViewOnlyMode]);

  const handleRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes);
    changes.forEach(change => {
      if (change.type === 'position' && change.position) { // Temporarily removed '&& change.dragging === false'
        onNodesChangeInStore(change.id, { x: change.position.x, y: change.position.y });
      }
    });
  }, [isViewOnlyMode, onNodesChangeReactFlow, onNodesChangeInStore]);

  const handleRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onEdgesChangeReactFlow(changes);
  }, [isViewOnlyMode, onEdgesChangeReactFlow]);

  const handleRfNodesDeleted: OnNodesDelete = useCallback((deletedRfNodes) => {
    if (isViewOnlyMode) return;
    deletedRfNodes.forEach(node => onNodesDeleteInStore(node.id));
  }, [isViewOnlyMode, onNodesDeleteInStore]);

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback((deletedRfEdges) => {
    if (isViewOnlyMode) return;
    deletedRfEdges.forEach(edge => onEdgesDeleteInStore(edge.id));
  }, [isViewOnlyMode, onEdgesDeleteInStore]);

  const handleRfConnect = useCallback((params: Connection) => {
    if (isViewOnlyMode) return;
    onConnectInStore({
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      label: "connects"
    });
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
      nodeTypes={nodeTypesConfig}
      onNodeContextMenu={onNodeContextMenu}
    />
  );
};

export default React.memo(FlowCanvasCore);
