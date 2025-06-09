
"use client";

import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState, MarkerType, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, type NodeTypes, type EdgeTypes, useReactFlow, ReactFlowProvider, type OnPaneDoubleClick } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import CustomNodeComponent, { type CustomNodeData } from './custom-node';
import OrthogonalEdge, { type OrthogonalEdgeData, getMarkerDefinition } from './orthogonal-edge';
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';

export interface RFConceptMapEdgeData extends OrthogonalEdgeData {}

const nodeTypesConfig: NodeTypes = {
  customConceptNode: CustomNodeComponent,
};

const edgeTypesConfig: EdgeTypes = { 
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
  onConnectInStore: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => void;
  onNodeContextMenu?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void;
  onNodeAIExpandTriggered?: (nodeId: string) => void;
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
  onNodeAIExpandTriggered,
}) => {
  const { addNode: addNodeToStore, setSelectedElement, setEditingNodeId } = useConceptMapStore();
  const reactFlowInstance = useReactFlow();

  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<OrthogonalEdgeData>([]);
  const [activeSnapLines, setActiveSnapLines] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);

  useEffect(() => {
    // console.log(`[FlowCanvasCore] Node Effect Triggered. isViewOnlyMode: ${isViewOnlyMode}`);
    // console.log("[FlowCanvasCore] mapDataFromStore.nodes:", mapDataFromStore.nodes);
    const newReactFlowNodes = (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: 'customConceptNode',
      data: {
        label: appNode.text,
        details: appNode.details,
        type: appNode.type || 'default',
        isViewOnly: isViewOnlyMode,
        backgroundColor: appNode.backgroundColor,
        shape: appNode.shape,
        width: appNode.width,
        height: appNode.height,
        onTriggerAIExpand: onNodeAIExpandTriggered,
      } as CustomNodeData,
      position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
      draggable: !isViewOnlyMode,
      selectable: true,
      connectable: !isViewOnlyMode,
      dragHandle: '.cursor-move',
      parentNode: appNode.parentNode,
    } as RFNode<CustomNodeData>));
    // console.log("[FlowCanvasCore] Generated newReactFlowNodes:", newReactFlowNodes);
    setRfNodes(newReactFlowNodes);
  }, [mapDataFromStore.nodes, isViewOnlyMode, setRfNodes, onNodeAIExpandTriggered]);

  useEffect(() => {
    // console.log(`[FlowCanvasCore] Edge Effect Triggered. isViewOnlyMode: ${isViewOnlyMode}`);
    // console.log("[FlowCanvasCore] mapDataFromStore.edges:", mapDataFromStore.edges);
    const newReactFlowEdges = (mapDataFromStore.edges || []).map(appEdge => ({
      id: appEdge.id,
      source: appEdge.source,
      target: appEdge.target,
      sourceHandle: appEdge.sourceHandle || null,
      targetHandle: appEdge.targetHandle || null,
      label: appEdge.label,
      type: 'orthogonal',
      data: {
        label: appEdge.label,
        color: appEdge.color,
        lineType: appEdge.lineType
      } as OrthogonalEdgeData,
      markerStart: getMarkerDefinition(appEdge.markerStart, appEdge.color),
      markerEnd: getMarkerDefinition(appEdge.markerEnd, appEdge.color),
      style: { strokeWidth: 2 },
      updatable: !isViewOnlyMode,
      deletable: !isViewOnlyMode,
      selectable: true,
    } as RFEdge<OrthogonalEdgeData>));
    // console.log("[FlowCanvasCore] Generated newReactFlowEdges:", newReactFlowEdges);
    setRfEdges(newReactFlowEdges);
  }, [mapDataFromStore.edges, isViewOnlyMode, setRfEdges]);


  useEffect(() => {
    if (rfNodes.length > 0 && reactFlowInstance && typeof reactFlowInstance.fitView === 'function') {
      const timerId = setTimeout(() => {
        reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [rfNodes, reactFlowInstance]);


  const onNodeDrag = useCallback((_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>, allNodes: RFNode<CustomNodeData>[]) => {
    if (isViewOnlyMode || !draggedNode.dragging || !draggedNode.width || !draggedNode.height || !draggedNode.positionAbsolute) {
      setActiveSnapLines([]);
      return;
    }

    let currentDragSnapLines: typeof activeSnapLines = [];
    let snappedXPosition = draggedNode.positionAbsolute.x;
    let snappedYPosition = draggedNode.positionAbsolute.y;
    let xSnappedByNode = false;
    let ySnappedByNode = false;

    const draggedNodeWidth = draggedNode.width;
    const draggedNodeHeight = draggedNode.height;

    const draggedTargetsX = [
      { type: 'left', value: draggedNode.positionAbsolute.x },
      { type: 'center', value: draggedNode.positionAbsolute.x + draggedNodeWidth / 2 },
      { type: 'right', value: draggedNode.positionAbsolute.x + draggedNodeWidth },
    ];
    const draggedTargetsY = [
      { type: 'top', value: draggedNode.positionAbsolute.y },
      { type: 'center', value: draggedNode.positionAbsolute.y + draggedNodeHeight / 2 },
      { type: 'bottom', value: draggedNode.positionAbsolute.y + draggedNodeHeight },
    ];

    let minDeltaX = Infinity; let bestSnapXInfo: { position: number, line: typeof activeSnapLines[0] } | null = null;
    let minDeltaY = Infinity; let bestSnapYInfo: { position: number, line: typeof activeSnapLines[0] } | null = null;

    allNodes.forEach(otherNode => {
      if (otherNode.id === draggedNode.id || !otherNode.width || !otherNode.height || !otherNode.positionAbsolute) return;

      const otherWidth = otherNode.width;
      const otherHeight = otherNode.height;
      const otherNodePosition = otherNode.positionAbsolute;

      const otherTargetsX = [
        { type: 'left', value: otherNodePosition.x },
        { type: 'center', value: otherNodePosition.x + otherWidth / 2 },
        { type: 'right', value: otherNodePosition.x + otherWidth },
      ];
      const otherTargetsY = [
        { type: 'top', value: otherNodePosition.y },
        { type: 'center', value: otherNodePosition.y + otherHeight / 2 },
        { type: 'bottom', value: otherNodePosition.y + otherHeight },
      ];

      for (const dtX of draggedTargetsX) {
        for (const otX of otherTargetsX) {
          const delta = Math.abs(dtX.value - otX.value);
          if (delta < SNAP_THRESHOLD && delta < minDeltaX) {
            minDeltaX = delta;
            bestSnapXInfo = {
              position: otX.value - (dtX.value - draggedNode.positionAbsolute.x),
              line: {
                type: 'vertical',
                x1: otX.value, y1: Math.min(draggedNode.positionAbsolute.y, otherNodePosition.y) - 20,
                x2: otX.value, y2: Math.max(draggedNode.positionAbsolute.y + draggedNodeHeight, otherNodePosition.y + otherHeight) + 20,
              }
            };
          }
        }
      }
      for (const dtY of draggedTargetsY) {
        for (const otY of otherTargetsY) {
          const delta = Math.abs(dtY.value - otY.value);
          if (delta < SNAP_THRESHOLD && delta < minDeltaY) {
            minDeltaY = delta;
            bestSnapYInfo = {
              position: otY.value - (dtY.value - draggedNode.positionAbsolute.y),
              line: {
                type: 'horizontal',
                x1: Math.min(draggedNode.positionAbsolute.x, otherNodePosition.x) - 20, y1: otY.value,
                x2: Math.max(draggedNode.positionAbsolute.x + draggedNodeWidth, otherNodePosition.x + otherWidth) + 20, y2: otY.value,
              }
            };
          }
        }
      }
    });

    if (bestSnapXInfo !== null) {
      snappedXPosition = bestSnapXInfo.position;
      xSnappedByNode = true;
      currentDragSnapLines.push(bestSnapXInfo.line);
    }
    if (bestSnapYInfo !== null) {
      snappedYPosition = bestSnapYInfo.position;
      ySnappedByNode = true;
      currentDragSnapLines.push(bestSnapYInfo.line);
    }

    if (!xSnappedByNode) {
      const gridSnappedX = Math.round(draggedNode.positionAbsolute.x / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(draggedNode.positionAbsolute.x - gridSnappedX) < SNAP_THRESHOLD) {
        snappedXPosition = gridSnappedX;
      }
    }
    if (!ySnappedByNode) {
      const gridSnappedY = Math.round(draggedNode.positionAbsolute.y / GRID_SIZE) * GRID_SIZE;
      if (Math.abs(draggedNode.positionAbsolute.y - gridSnappedY) < SNAP_THRESHOLD) {
        snappedYPosition = gridSnappedY;
      }
    }

    if (draggedNode.positionAbsolute.x !== snappedXPosition || draggedNode.positionAbsolute.y !== snappedYPosition) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: { x: snappedXPosition, y: snappedYPosition }, dragging: true }]);
    }
    setActiveSnapLines(currentDragSnapLines);
  }, [isViewOnlyMode, SNAP_THRESHOLD, GRID_SIZE, onNodesChangeReactFlow]);


  const handleNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLines([]);

      let finalX = draggedNode.positionAbsolute.x;
      let finalY = draggedNode.positionAbsolute.y;

      finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
      finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

      onNodesChangeInStore(draggedNode.id, { x: finalX, y: finalY, width: draggedNode.width, height: draggedNode.height });
    },
    [isViewOnlyMode, onNodesChangeInStore, GRID_SIZE]
  );

  const handleRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes);
    changes.forEach(change => {
        if (change.type === 'dimensions' && change.dimensions) {
            onNodesChangeInStore(change.id, { width: change.dimensions.width, height: change.dimensions.height });
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

  const handleRfConnect: OnConnect = useCallback((params: Connection) => {
    if (isViewOnlyMode) return;
    onConnectInStore({
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      label: "connects",
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

  const handlePaneDoubleClickInternal: OnPaneDoubleClick = useCallback((event) => {
    if (isViewOnlyMode) return;
    const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const newNodeId = addNodeToStore({
      text: `Node ${currentNodes.length + 1}`,
      type: 'manual-node',
      position: {x: snappedX, y: snappedY},
      details: '',
    });
    setSelectedElement(newNodeId, 'node');
    setEditingNodeId(newNodeId);
  }, [isViewOnlyMode, addNodeToStore, reactFlowInstance, setSelectedElement, setEditingNodeId, GRID_SIZE]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isViewOnlyMode || (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA'))) return;

      const { selectedElementId, mapData } = useConceptMapStore.getState();
      const selectedStoreNode = selectedElementId ? mapData.nodes.find(n => n.id === selectedElementId) : null;

      if (selectedStoreNode && (event.key === 'Tab' || event.key === 'Enter')) {
        event.preventDefault();
        const currentNodes = mapData.nodes;
        let newNodeId: string;

        if (event.key === 'Tab') {
          const childPosition = getNodePlacement(currentNodes, 'child', selectedStoreNode, null, GRID_SIZE, 'right');
          newNodeId = addNodeToStore({ text: "New Idea", type: 'manual-node', position: childPosition, parentNode: selectedStoreNode.id });
          onConnectInStore({ source: selectedStoreNode.id, target: newNodeId, label: "connects" });
        } else {
          const siblingPosition = getNodePlacement(currentNodes, 'sibling', selectedStoreNode.parentNode ? currentNodes.find(n => n.id === selectedStoreNode.parentNode) : null, selectedStoreNode, GRID_SIZE);
          newNodeId = addNodeToStore({ text: "New Sibling", type: 'manual-node', position: siblingPosition, parentNode: selectedStoreNode.parentNode });
        }
        setSelectedElement(newNodeId, 'node');
        setEditingNodeId(newNodeId);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewOnlyMode, addNodeToStore, onConnectInStore, setSelectedElement, setEditingNodeId, GRID_SIZE, reactFlowInstance]);
  

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
      onPaneDoubleClickProp={handlePaneDoubleClickInternal}
      activeSnapLines={activeSnapLines}
      gridSize={GRID_SIZE}
      panActivationKeyCode="Space"
    />
  );
};


const FlowCanvasCoreWrapper: React.FC<Omit<FlowCanvasCoreProps, 'onNodeDrag' | 'onNodeDragStop' | 'activeSnapLines' | 'gridSize'>> = (props) => (
  <ReactFlowProvider>
    <FlowCanvasCore {...props} />
  </ReactFlowProvider>
);

export default React.memo(FlowCanvasCoreWrapper);
    