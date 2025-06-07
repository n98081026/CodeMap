"use client";

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useNodesState, useEdgesState, MarkerType, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, type NodeTypes, useReactFlow, ReactFlowProvider } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import CustomNodeComponent, { type CustomNodeData } from './custom-node';
import OrthogonalEdge, { type OrthogonalEdgeData } from './orthogonal-edge';
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';

export interface RFConceptMapEdgeData extends OrthogonalEdgeData {}

const nodeTypesConfig: NodeTypes = {
  customConceptNode: CustomNodeComponent,
};

const edgeTypesConfig = {
  orthogonal: OrthogonalEdge,
};

const GRID_SIZE = 20; 
const SNAP_THRESHOLD = 8; 

interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
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
  onMultiNodeSelectionChange,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onNodeContextMenu,
}) => {
  const { addNode: addNodeToStore, setSelectedElement, setEditingNodeId } = useConceptMapStore();
  const reactFlowInstance = useReactFlow();

  const initialRfNodes = useMemo(() => 
    (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: 'customConceptNode',
      data: { 
        label: appNode.text, 
        details: appNode.details, 
        type: appNode.type || 'default', 
        isViewOnly: isViewOnlyMode,
        backgroundColor: appNode.backgroundColor,
        shape: appNode.shape,
      },
      position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
      draggable: !isViewOnlyMode,
      selectable: true,
      connectable: !isViewOnlyMode,
      dragHandle: '.cursor-move',
      parentNode: appNode.parentNode,
      width: appNode.width, 
      height: appNode.height,
    } as RFNode<CustomNodeData>)),
    [mapDataFromStore.nodes, isViewOnlyMode]
  );

  const getMarkerDefinition = useCallback((markerTypeString?: string, edgeColor?: string): RFEdge['markerEnd'] => {
    if (!markerTypeString || markerTypeString === 'none') return undefined;
    const color = edgeColor || 'hsl(var(--primary))';
    switch (markerTypeString) {
        case 'arrow': return { type: MarkerType.Arrow, color, strokeWidth: 1 };
        case 'arrowclosed': return { type: MarkerType.ArrowClosed, color, strokeWidth: 1 };
        default: return undefined;
    }
  }, []);
  
  const initialRfEdges = useMemo(() =>
    (mapDataFromStore.edges || []).map(appEdge => ({
      id: appEdge.id,
      source: appEdge.source,
      target: appEdge.target,
      sourceHandle: appEdge.sourceHandle || null,
      targetHandle: appEdge.targetHandle || null,
      label: appEdge.label,
      type: 'orthogonal',
      data: { label: appEdge.label, color: appEdge.color, lineType: appEdge.lineType },
      markerStart: getMarkerDefinition(appEdge.markerStart, appEdge.color),
      markerEnd: getMarkerDefinition(appEdge.markerEnd, appEdge.color),
      style: { strokeWidth: 2 },
      updatable: !isViewOnlyMode,
      deletable: !isViewOnlyMode,
      selectable: true,
    } as RFEdge<RFConceptMapEdgeData>)),
    [mapDataFromStore.edges, isViewOnlyMode, getMarkerDefinition]
  );


  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>(initialRfNodes);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<RFConceptMapEdgeData>(initialRfEdges);

  useEffect(() => setRfNodes(initialRfNodes), [initialRfNodes, setRfNodes]);
  useEffect(() => setRfEdges(initialRfEdges), [initialRfEdges, setRfEdges]);
  
  const [activeSnapLines, setActiveSnapLines] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>, nodes: RFNode<CustomNodeData>[]) => {
    if (isViewOnlyMode || !draggedNode.dragging || !draggedNode.width || !draggedNode.height) {
      setActiveSnapLines([]);
      return;
    }

    let currentDragSnapLines: typeof activeSnapLines = [];
    let snappedXPosition = draggedNode.position.x;
    let snappedYPosition = draggedNode.position.y;
    let xSnappedByNode = false;
    let ySnappedByNode = false;

    const draggedNodeWidth = draggedNode.width;
    const draggedNodeHeight = draggedNode.height;
    
    const draggedTargetsX = [
        draggedNode.position.x, // left
        draggedNode.position.x + draggedNodeWidth / 2, // center
        draggedNode.position.x + draggedNodeWidth, // right
    ];
    const draggedTargetsY = [
        draggedNode.position.y, // top
        draggedNode.position.y + draggedNodeHeight / 2, // center
        draggedNode.position.y + draggedNodeHeight, // bottom
    ];

    let minDeltaX = Infinity; let bestSnapX: number | null = null; let bestSnapLineX: typeof activeSnapLines[0] | null = null;
    let minDeltaY = Infinity; let bestSnapY: number | null = null; let bestSnapLineY: typeof activeSnapLines[0] | null = null;

    nodes.forEach(otherNode => {
      if (otherNode.id === draggedNode.id || !otherNode.width || !otherNode.height || !otherNode.position) return;

      const otherWidth = otherNode.width;
      const otherHeight = otherNode.height;
      const otherTargetsX = [
        otherNode.position.x, // left
        otherNode.position.x + otherWidth / 2, // center
        otherNode.position.x + otherWidth,   // right
      ];
      const otherTargetsY = [
        otherNode.position.y, // top
        otherNode.position.y + otherHeight / 2, // center
        otherNode.position.y + otherHeight, // bottom
      ];

      for (const dtX of draggedTargetsX) {
        for (const otX of otherTargetsX) {
          const delta = Math.abs(dtX - otX);
          if (delta < SNAP_THRESHOLD && delta < minDeltaX) {
            minDeltaX = delta;
            bestSnapX = otX - (dtX - draggedNode.position.x);
            const lineY1 = Math.min(draggedNode.position.y, otherNode.position.y) - 20;
            const lineY2 = Math.max(draggedNode.position.y + draggedNodeHeight, otherNode.position.y + otherHeight) + 20;
            bestSnapLineX = { type: 'vertical', x1: otX, y1: lineY1, x2: otX, y2: lineY2 };
          }
        }
      }
      for (const dtY of draggedTargetsY) {
        for (const otY of otherTargetsY) {
          const delta = Math.abs(dtY - otY);
          if (delta < SNAP_THRESHOLD && delta < minDeltaY) {
            minDeltaY = delta;
            bestSnapY = otY - (dtY - draggedNode.position.y);
            const lineX1 = Math.min(draggedNode.position.x, otherNode.position.x) - 20;
            const lineX2 = Math.max(draggedNode.position.x + draggedNodeWidth, otherNode.position.x + otherWidth) + 20;
            bestSnapLineY = { type: 'horizontal', x1: lineX1, y1: otY, x2: lineX2, y2: otY };
          }
        }
      }
    });

    if (bestSnapX !== null) {
      snappedXPosition = bestSnapX;
      xSnappedByNode = true;
      if(bestSnapLineX) currentDragSnapLines.push(bestSnapLineX);
    }
    if (bestSnapY !== null) {
      snappedYPosition = bestSnapY;
      ySnappedByNode = true;
      if(bestSnapLineY) currentDragSnapLines.push(bestSnapLineY);
    }
    
    if (!xSnappedByNode) {
      const gridSnappedX = Math.round(draggedNode.position.x / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(draggedNode.position.x - gridSnappedX) < SNAP_THRESHOLD) {
        snappedXPosition = gridSnappedX;
      }
    }
    if (!ySnappedByNode) {
      const gridSnappedY = Math.round(draggedNode.position.y / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(draggedNode.position.y - gridSnappedY) < SNAP_THRESHOLD) {
        snappedYPosition = gridSnappedY;
      }
    }

    if (draggedNode.position.x !== snappedXPosition || draggedNode.position.y !== snappedYPosition) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: { x: snappedXPosition, y: snappedYPosition }, dragging: true }]);
    }
    setActiveSnapLines(currentDragSnapLines);
  }, [isViewOnlyMode, SNAP_THRESHOLD, GRID_SIZE, onNodesChangeReactFlow]);


  const handleNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.position) return;
      setActiveSnapLines([]);
      
      let finalX = draggedNode.position.x;
      let finalY = draggedNode.position.y;

      finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
      finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

      onNodesChangeInStore(draggedNode.id, { x: finalX, y: finalY });
    },
    [isViewOnlyMode, onNodesChangeInStore, GRID_SIZE]
  );

  const handleRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes);
  }, [isViewOnlyMode, onNodesChangeReactFlow]);

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

  const handleRfConnect: OnConnect = useCallback((params: Connection) => {
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
    if (onMultiNodeSelectionChange) {
      onMultiNodeSelectionChange(nodes.map(node => node.id));
    }
  }, [onSelectionChange, onMultiNodeSelectionChange]);

  const handlePaneDoubleClickInternal = useCallback((event: React.MouseEvent) => {
    if (isViewOnlyMode) return;
    const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const snappedPosition = getNodePlacement(currentNodes, 'generic', null, null, GRID_SIZE);

    const newNodeId = addNodeToStore({
      text: `Node ${currentNodes.length + 1}`,
      type: 'manual-node',
      position: snappedPosition,
      details: '',
    });
    setSelectedElement(newNodeId, 'node');
    setEditingNodeId(newNodeId);
  }, [isViewOnlyMode, addNodeToStore, reactFlowInstance, setSelectedElement, setEditingNodeId, GRID_SIZE]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isViewOnlyMode || (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))) return;
      const { selectedElementId, mapData } = useConceptMapStore.getState();
      const selectedNode = selectedElementId ? mapData.nodes.find(n => n.id === selectedElementId) : null;

      if (selectedNode && (event.key === 'Tab' || event.key === 'Enter')) {
        event.preventDefault();
        const currentNodes = mapData.nodes;
        let newNodeId: string;
        
        if (event.key === 'Tab') { 
          const childPosition = getNodePlacement(currentNodes, 'child', selectedNode, null, GRID_SIZE);
          newNodeId = addNodeToStore({ text: "New Child", type: 'manual-node', position: childPosition, parentNode: selectedNode.id });
          onConnectInStore({ source: selectedNode.id, target: newNodeId, label: "connects" });
        } else { 
          const siblingPosition = getNodePlacement(currentNodes, 'sibling', selectedNode.parentNode ? currentNodes.find(n => n.id === selectedNode.parentNode) : null, selectedNode, GRID_SIZE);
          newNodeId = addNodeToStore({ text: "New Sibling", type: 'manual-node', position: siblingPosition, parentNode: selectedNode.parentNode });
        }
        setSelectedElement(newNodeId, 'node');
        setEditingNodeId(newNodeId);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewOnlyMode, addNodeToStore, onConnectInStore, setSelectedElement, setEditingNodeId, GRID_SIZE]);

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
      edgeTypes={edgeTypesConfig}
      onNodeContextMenu={onNodeContextMenu}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={handleNodeDragStopInternal}
      onPaneDoubleClick={handlePaneDoubleClickInternal}
      activeSnapLines={activeSnapLines}
      gridSize={GRID_SIZE}
      panActivationKeyCode="Space" // Pass the panActivationKeyCode
    />
  );
};


const FlowCanvasCoreWrapper: React.FC<FlowCanvasCoreProps> = (props) => (
  <ReactFlowProvider>
    <FlowCanvasCore {...props} />
  </ReactFlowProvider>
);

export default React.memo(FlowCanvasCoreWrapper);
    