
"use client";

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { useNodesState, useEdgesState, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, useReactFlow, ReactFlowProvider, type OnPaneDoubleClick } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import type { CustomNodeData } from './custom-node';
import type { OrthogonalEdgeData } from './orthogonal-edge';
import { getMarkerDefinition } from './orthogonal-edge';
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';

export interface RFConceptMapEdgeDataFromCore extends OrthogonalEdgeData {}

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
  
  onNodeDrag?: (event: React.MouseEvent, node: RFNode<CustomNodeData>, nodes: RFNode<CustomNodeData>[]) => void;
  onNodeDragStop?: (event: React.MouseEvent, node: RFNode<CustomNodeData>, nodes: RFNode<CustomNodeData>[]) => void;
  onPaneDoubleClick?: OnPaneDoubleClick;
  activeSnapLines?: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>;
  gridSize?: number;
  panActivationKeyCode?: string;
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
  onNodeDrag,
  onNodeDragStop,
  onPaneDoubleClick,
  activeSnapLines,
  gridSize = GRID_SIZE, 
  panActivationKeyCode,
}) => {
  const { addNode: addNodeToStore, setSelectedElement, setEditingNodeId } = useConceptMapStore();
  const reactFlowInstance = useReactFlow();

  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);

  const initialRfNodes = useMemo(() => (mapDataFromStore.nodes || []).map(appNode => ({
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
  })), [mapDataFromStore.nodes, isViewOnlyMode, onNodeAIExpandTriggered]);

  const initialRfEdges = useMemo(() => (mapDataFromStore.edges || []).map(appEdge => ({
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
  })), [mapDataFromStore.edges, isViewOnlyMode]);

  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>(initialRfNodes);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<OrthogonalEdgeData>(initialRfEdges);

  useEffect(() => {
    console.log("FlowCanvasCore: mapDataFromStore.nodes received from store:", mapDataFromStore.nodes);
    console.log("FlowCanvasCore: initialRfNodes computed:", initialRfNodes);
    setRfNodes(initialRfNodes);
  }, [initialRfNodes, setRfNodes, mapDataFromStore.nodes]);

  useEffect(() => {
    console.log("FlowCanvasCore: mapDataFromStore.edges received from store:", mapDataFromStore.edges);
    console.log("FlowCanvasCore: initialRfEdges computed:", initialRfEdges);
    setRfEdges(initialRfEdges);
  }, [initialRfEdges, setRfEdges, mapDataFromStore.edges]);
  
  useEffect(() => {
    console.log("FlowCanvasCore: rfNodes passed to InteractiveCanvas:", rfNodes);
    console.log("FlowCanvasCore: rfEdges passed to InteractiveCanvas:", rfEdges);
  }, [rfNodes, rfEdges]);
  
  useEffect(() => {
    if (rfNodes.length > 0 && reactFlowInstance && typeof reactFlowInstance.fitView === 'function') {
      const timerId = setTimeout(() => {
        reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [rfNodes, reactFlowInstance]);


  const onNodeDragInternal = useCallback((_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>, allNodes: RFNode<CustomNodeData>[]) => {
    if (isViewOnlyMode || !draggedNode.dragging || !draggedNode.width || !draggedNode.height || !draggedNode.positionAbsolute) {
      setActiveSnapLinesLocal([]);
      return;
    }

    let currentDragSnapLines: typeof activeSnapLinesLocal = [];
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

    let minDeltaX = Infinity; let bestSnapXInfo: { position: number, line: typeof activeSnapLinesLocal[0] } | null = null;
    let minDeltaY = Infinity; let bestSnapYInfo: { position: number, line: typeof activeSnapLinesLocal[0] } | null = null;

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
      const gridSnappedX = Math.round(draggedNode.positionAbsolute.x / gridSize) * gridSize;
      if (Math.abs(draggedNode.positionAbsolute.x - gridSnappedX) < SNAP_THRESHOLD) {
        snappedXPosition = gridSnappedX;
      }
    }
    if (!ySnappedByNode) {
      const gridSnappedY = Math.round(draggedNode.positionAbsolute.y / gridSize) * gridSize;
      if (Math.abs(draggedNode.positionAbsolute.y - gridSnappedY) < SNAP_THRESHOLD) {
        snappedYPosition = gridSnappedY;
      }
    }

    if (draggedNode.positionAbsolute.x !== snappedXPosition || draggedNode.positionAbsolute.y !== snappedYPosition) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: { x: snappedXPosition, y: snappedYPosition }, dragging: true }]);
    }
    setActiveSnapLinesLocal(currentDragSnapLines);
    onNodeDrag?.(_event, draggedNode, allNodes);
  }, [isViewOnlyMode, SNAP_THRESHOLD, gridSize, onNodesChangeReactFlow, onNodeDrag]);


  const onNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLinesLocal([]);

      let finalX = draggedNode.positionAbsolute.x;
      let finalY = draggedNode.positionAbsolute.y;

      finalX = Math.round(finalX / gridSize) * gridSize;
      finalY = Math.round(finalY / gridSize) * gridSize;

      onNodesChangeInStore(draggedNode.id, { x: finalX, y: finalY, width: draggedNode.width, height: draggedNode.height });
      onNodeDragStop?.(_event, draggedNode, rfNodes);
    },
    [isViewOnlyMode, onNodesChangeInStore, gridSize, onNodeDragStop, rfNodes]
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
    const snappedX = Math.round(positionInFlow.x / gridSize) * gridSize;
    const snappedY = Math.round(positionInFlow.y / gridSize) * gridSize;

    const currentNodes = useConceptMapStore.getState().mapData.nodes;
    const newNodeId = addNodeToStore({
      text: `Node ${currentNodes.length + 1}`,
      type: 'manual-node',
      position: {x: snappedX, y: snappedY},
      details: '',
    });
    setSelectedElement(newNodeId, 'node');
    setEditingNodeId(newNodeId);
    onPaneDoubleClick?.(event);
  }, [isViewOnlyMode, addNodeToStore, reactFlowInstance, setSelectedElement, setEditingNodeId, gridSize, onPaneDoubleClick]);

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
          const childPosition = getNodePlacement(currentNodes, 'child', selectedStoreNode, null, gridSize, 'right');
          newNodeId = addNodeToStore({ text: "New Idea", type: 'manual-node', position: childPosition, parentNode: selectedStoreNode.id });
          onConnectInStore({ source: selectedStoreNode.id, target: newNodeId, label: "connects" });
        } else { 
          const siblingPosition = getNodePlacement(currentNodes, 'sibling', selectedStoreNode.parentNode ? currentNodes.find(n => n.id === selectedStoreNode.parentNode) : null, selectedStoreNode, gridSize);
          newNodeId = addNodeToStore({ text: "New Sibling", type: 'manual-node', position: siblingPosition, parentNode: selectedStoreNode.parentNode });
        }
        setSelectedElement(newNodeId, 'node');
        setEditingNodeId(newNodeId);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isViewOnlyMode, addNodeToStore, onConnectInStore, setSelectedElement, setEditingNodeId, gridSize, reactFlowInstance]);
  

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
      onNodeContextMenu={onNodeContextMenu}
      onNodeDrag={onNodeDragInternal} 
      onNodeDragStop={onNodeDragStopInternal}
      onPaneDoubleClick={handlePaneDoubleClickInternal}
      activeSnapLines={activeSnapLinesLocal} 
      gridSize={gridSize}
      panActivationKeyCode={panActivationKeyCode}
    />
  );
};


const FlowCanvasCoreWrapper: React.FC<Omit<FlowCanvasCoreProps, 'onNodeDrag' | 'onNodeDragStop' | 'activeSnapLines' | 'gridSize'>> = (props) => (
  <ReactFlowProvider>
    <FlowCanvasCore {...props} />
  </ReactFlowProvider>
);

export default React.memo(FlowCanvasCoreWrapper);
    
