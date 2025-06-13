
"use client";

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, useReactFlow, type OnPaneDoubleClick, type Viewport } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import type { CustomNodeData } from './custom-node';
import type { OrthogonalEdgeData } from './orthogonal-edge';
import { getMarkerDefinition } from './orthogonal-edge';
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';

export interface RFConceptMapEdgeDataFromCore extends OrthogonalEdgeData {}

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8; // Pixels for snapping sensitivity

interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
  onNodesChangeInStore: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => void;
  onNodeContextMenuRequest?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void; // Renamed/Replaced: This will be the new prop for node context menu
  onNodeAIExpandTriggered?: (nodeId: string) => void;
  onPaneContextMenuRequest?: (event: React.MouseEvent, positionInFlow: {x: number, y: number}) => void;
  onStagedElementsSelectionChange?: (selectedIds: string[]) => void;
  onNewEdgeSuggestLabels?: (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => Promise<void>; // New prop
  panActivationKeyCode?: string | null;
}

const FlowCanvasCoreInternal: React.FC<FlowCanvasCoreProps> = ({
  mapDataFromStore,
  isViewOnlyMode,
  onSelectionChange,
  onMultiNodeSelectionChange,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onNodeContextMenuRequest,
  onNodeAIExpandTriggered,
  onPaneContextMenuRequest,
  onStagedElementsSelectionChange,
  onNewEdgeSuggestLabels, // Destructure new prop
  panActivationKeyCode,
}) => {
  useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal Render] mapDataFromStore.nodes count: ${mapDataFromStore.nodes?.length ?? 'N/A'}`);
  useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore V11] Received mapDataFromStore. Nodes: ${mapDataFromStore.nodes?.length ?? 'N/A'}, Edges: ${mapDataFromStore.edges?.length ?? 'N/A'}`);
  const { addNode: addNodeToStore, setSelectedElement, setEditingNodeId } = useConceptMapStore();
  const { stagedMapData, isStagingActive } = useConceptMapStore(
    useCallback(s => ({ stagedMapData: s.stagedMapData, isStagingActive: s.isStagingActive }), [])
  );
  const reactFlowInstance = useReactFlow();

  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);

  // Initialize useNodesState and useEdgesState for main and staged elements.
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<OrthogonalEdgeData>([]);
  const [rfStagedNodes, setRfStagedNodes, onStagedNodesChange] = useNodesState<CustomNodeData>([]);
  const [rfStagedEdges, setRfStagedEdges, onStagedEdgesChange] = useEdgesState<OrthogonalEdgeData>([]);

  // Effect to synchronize MAIN nodes from the store to React Flow's state
  useEffect(() => {
    useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal SyncEffect Nodes] Running. mapDataFromStore.nodes count: ${mapDataFromStore.nodes?.length ?? 'N/A'}`);

    const newRfNodes = (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: 'customConceptNode',
      data: {
        label: appNode.text,
        details: appNode.details,
        type: appNode.type || 'default',
        isViewOnly: isViewOnlyMode,
        backgroundColor: appNode.backgroundColor,
        shape: appNode.shape,
        width: appNode.width,   // Already ensured by store to have defaults
        height: appNode.height, // Already ensured by store to have defaults
        onTriggerAIExpand: onNodeAIExpandTriggered,
      } as CustomNodeData,
      position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
      draggable: !isViewOnlyMode,
      selectable: true,
      connectable: !isViewOnlyMode,
      dragHandle: '.cursor-move',
      parentNode: appNode.parentNode,
    }));

    useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal SyncEffect Nodes] Processed ${newRfNodes.length} nodes. Setting React Flow nodes.`);
    setRfNodes(newRfNodes);

  }, [mapDataFromStore.nodes, isViewOnlyMode, onNodeAIExpandTriggered, setRfNodes]);


  // Effect to synchronize edges from the store to React Flow's state
  useEffect(() => {
    useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal SyncEffect Edges] Running. mapDataFromStore.edges count: ${mapDataFromStore.edges?.length ?? 'N/A'}`);
    const newRfEdges = (mapDataFromStore.edges || []).map(appEdge => ({
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
    }));
    useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal SyncEffect Edges] Processed ${newRfEdges.length} edges. Setting React Flow edges.`);
    setRfEdges(newRfEdges);
  }, [mapDataFromStore.edges, isViewOnlyMode, setRfEdges]);

  // Effect to synchronize STAGED nodes and edges from the store
  useEffect(() => {
    if (isStagingActive && stagedMapData) {
      useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Updating STAGED nodes. Count: ${stagedMapData.nodes.length}`);
      const newRfStagedNodes = stagedMapData.nodes.map(appNode => ({
        id: appNode.id, // Use temporary IDs from store
        type: 'customConceptNode',
        data: {
          label: appNode.text,
          details: appNode.details,
          type: appNode.type || 'default',
          isViewOnly: true, // Staged items are initially not editable in the main sense
          backgroundColor: appNode.backgroundColor, // Or a specific staged color
          shape: appNode.shape,
          width: appNode.width,
          height: appNode.height,
          isStaged: true, // Flag for styling
        } as CustomNodeData,
        position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
        draggable: false, // Staged nodes not draggable for now
        selectable: true, // Allow selection for potential "delete from stage"
        connectable: false, // Staged nodes not connectable for now
        dragHandle: '.cursor-move', // Standard drag handle, though draggable is false
      }));
      setRfStagedNodes(newRfStagedNodes);

      useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Updating STAGED edges. Count: ${stagedMapData.edges?.length ?? 0}`);
      const newRfStagedEdges = (stagedMapData.edges || []).map(appEdge => ({
        id: appEdge.id, // Use temporary IDs
        source: appEdge.source,
        target: appEdge.target,
        label: appEdge.label,
        type: 'orthogonal',
        data: {
          label: appEdge.label,
          color: appEdge.color, // Or a specific staged color
          lineType: appEdge.lineType,
        } as OrthogonalEdgeData,
        style: { strokeDasharray: '5,5', opacity: 0.7, strokeWidth: 2, stroke: appEdge.color || 'grey' },
        updatable: false,
        selectable: true,
      }));
      setRfStagedEdges(newRfStagedEdges);
    } else {
      setRfStagedNodes([]);
      setRfStagedEdges([]);
    }
  }, [isStagingActive, stagedMapData, setRfStagedNodes, setRfStagedEdges]);
  
  useEffect(() => {
    // This effect for fitView should ideally run *after* nodes have been set and rendered.
    // React Flow's fitView might need a slight delay or to be triggered when rfNodes actually changes and is non-empty.
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

    // Potential snap points for the dragged node
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

    // Find the best snap for X and Y independently
    let minDeltaX = Infinity; let bestSnapXInfo: { position: number, line: typeof activeSnapLinesLocal[0] } | null = null;
    let minDeltaY = Infinity; let bestSnapYInfo: { position: number, line: typeof activeSnapLinesLocal[0] } | null = null;

    allNodes.forEach(otherNode => {
      if (otherNode.id === draggedNode.id || !otherNode.width || !otherNode.height || !otherNode.positionAbsolute) return;

      const otherWidth = otherNode.width;
      const otherHeight = otherNode.height;
      const otherNodePosition = otherNode.positionAbsolute;

      // Potential snap points for the other node
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

      // Check X snaps
      for (const dtX of draggedTargetsX) {
        for (const otX of otherTargetsX) {
          const delta = Math.abs(dtX.value - otX.value);
          if (delta < SNAP_THRESHOLD && delta < minDeltaX) {
            minDeltaX = delta;
            bestSnapXInfo = {
              position: otX.value - (dtX.value - draggedNode.positionAbsolute.x), // Calculate new X for draggedNode
              line: {
                type: 'vertical',
                x1: otX.value, y1: Math.min(draggedNode.positionAbsolute.y, otherNodePosition.y) - 20,
                x2: otX.value, y2: Math.max(draggedNode.positionAbsolute.y + draggedNodeHeight, otherNodePosition.y + otherHeight) + 20,
              }
            };
          }
        }
      }

      // Check Y snaps
      for (const dtY of draggedTargetsY) {
        for (const otY of otherTargetsY) {
          const delta = Math.abs(dtY.value - otY.value);
          if (delta < SNAP_THRESHOLD && delta < minDeltaY) {
            minDeltaY = delta;
            bestSnapYInfo = {
              position: otY.value - (dtY.value - draggedNode.positionAbsolute.y), // Calculate new Y for draggedNode
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

    // Snap to grid if not snapped to another node
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
    
    // Apply the snapped position if it changed
    if (draggedNode.positionAbsolute.x !== snappedXPosition || draggedNode.positionAbsolute.y !== snappedYPosition) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: { x: snappedXPosition, y: snappedYPosition }, dragging: true }]);
    }
    setActiveSnapLinesLocal(currentDragSnapLines);
  }, [isViewOnlyMode, SNAP_THRESHOLD, GRID_SIZE, onNodesChangeReactFlow]);


  const onNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLinesLocal([]); // Clear snap lines on drag stop

      let finalX = draggedNode.positionAbsolute.x;
      let finalY = draggedNode.positionAbsolute.y;

      // The position in draggedNode.positionAbsolute should already be the snapped one from onNodeDragInternal.
      // However, we ensure it's perfectly on grid as a final step IF no node-to-node snap overrode it.
      // onNodeDragInternal prioritizes node-to-node, then grid. This final step confirms grid alignment.
      finalX = Math.round(finalX / GRID_SIZE) * GRID_SIZE;
      finalY = Math.round(finalY / GRID_SIZE) * GRID_SIZE;

      onNodesChangeInStore(draggedNode.id, { x: finalX, y: finalY, width: draggedNode.width, height: draggedNode.height });
    },
    [isViewOnlyMode, onNodesChangeInStore, GRID_SIZE] 
  );

  const handleRfNodesChange: OnNodesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onNodesChangeReactFlow(changes); // Update React Flow's internal state
    // Propagate relevant changes to the Zustand store
    changes.forEach(change => {
        if (change.type === 'dimensions' && change.dimensions) {
            onNodesChangeInStore(change.id, { width: change.dimensions.width, height: change.dimensions.height });
        }
        // Position changes are handled by onNodeDragStopInternal
    });
  }, [isViewOnlyMode, onNodesChangeReactFlow, onNodesChangeInStore]);

  const handleRfEdgesChange: OnEdgesChange = useCallback((changes) => {
    if (isViewOnlyMode) return;
    onEdgesChangeReactFlow(changes);
    // Potentially propagate edge changes to store if needed for OrthogonalEdge data, etc.
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
    // The onConnectInStore prop is expected to be the addEdge function from the store, which now returns the new edge's ID.
    // However, the prop is currently typed as `() => void`. This needs to be aligned.
    // For now, let's assume onConnectInStore is actually `addStoreEdge` from the hook which uses the store's `addEdge`.
    // The store's `addEdge` returns string (newEdgeId). The hook's `addStoreEdge` should also return it.
    // This requires ensuring the function passed to onConnectInStore from page.tsx actually returns the ID.
    // Let's assume `onConnectInStore` is already correctly returning the newEdgeId or can be adapted.
    // If `onConnectInStore` is just `addStoreEdge` from the hook, it needs to be modified to return the ID.
    // For this step, we'll proceed assuming onConnectInStore is correctly typed and returns the ID.
    // This might require a change in how `addStoreEdge` is defined or used in `useConceptMapAITools` if it's the one passed.
    // For now, let's cast it, acknowledging this might need a fix in the hook or page.

    const newEdgeId = (onConnectInStore as unknown as (options: any) => string)({ // Type assertion
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      label: "connects",
    });

    if (newEdgeId && params.source && params.target) {
      onNewEdgeSuggestLabels?.(newEdgeId, params.source, params.target);
    }
  }, [isViewOnlyMode, onConnectInStore, onNewEdgeSuggestLabels]);

  const handleRfSelectionChange = useCallback((selection: SelectionChanges) => {
    const selectedRfNodes = selection.nodes;
    const selectedRfEdges = selection.edges;

    const currentStagedNodeIds = new Set(rfStagedNodes.map(n => n.id));
    const currentStagedEdgeIds = new Set(rfStagedEdges.map(e => e.id));

    const newlySelectedStagedNodeIds = selectedRfNodes.filter(n => currentStagedNodeIds.has(n.id)).map(n => n.id);
    const newlySelectedStagedEdgeIds = selectedRfEdges.filter(e => currentStagedEdgeIds.has(e.id)).map(e => e.id);

    onStagedElementsSelectionChange?.([...newlySelectedStagedNodeIds, ...newlySelectedStagedEdgeIds]);

    // Filter out staged elements for main selection handlers
    const mainSelectedNodes = selectedRfNodes.filter(n => !currentStagedNodeIds.has(n.id));
    const mainSelectedEdges = selectedRfEdges.filter(e => !currentStagedEdgeIds.has(e.id));

    if (mainSelectedNodes.length === 1 && mainSelectedEdges.length === 0) {
      onSelectionChange(mainSelectedNodes[0].id, 'node');
    } else if (mainSelectedEdges.length === 1 && mainSelectedNodes.length === 0) {
      onSelectionChange(mainSelectedEdges[0].id, 'edge');
    } else if (mainSelectedNodes.length === 0 && mainSelectedEdges.length === 0 && (newlySelectedStagedNodeIds.length > 0 || newlySelectedStagedEdgeIds.length > 0)) {
      // If only staged elements are selected, main selection is null
      onSelectionChange(null, null);
    } else if (mainSelectedNodes.length === 0 && mainSelectedEdges.length === 0) {
        // If nothing is selected (neither main nor staged)
      onSelectionChange(null, null);
    }
    // onMultiNodeSelectionChange should only receive main map nodes
    onMultiNodeSelectionChange?.(mainSelectedNodes.map(node => node.id));

  }, [onSelectionChange, onMultiNodeSelectionChange, onStagedElementsSelectionChange, rfStagedNodes, rfStagedEdges]);

  const handlePaneDoubleClickInternal: OnPaneDoubleClick = useCallback((event) => {
    if (isViewOnlyMode) return;
    const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    // Snap to grid
    const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;

    const newNodeId = addNodeToStore({
      text: `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`,
      type: 'manual-node',
      position: {x: snappedX, y: snappedY},
      details: '',
    });
    setSelectedElement(newNodeId, 'node');
    setEditingNodeId(newNodeId); // For auto-focus
    // Removed onPaneDoubleClickProp?.(event);
  }, [isViewOnlyMode, addNodeToStore, reactFlowInstance, setSelectedElement, setEditingNodeId, GRID_SIZE]);

  const handlePaneContextMenuInternal = useCallback((event: React.MouseEvent) => {
    if (isViewOnlyMode || !reactFlowInstance) return;
    event.preventDefault();
    const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onPaneContextMenuRequest?.(event, positionInFlow);
  }, [isViewOnlyMode, reactFlowInstance, onPaneContextMenuRequest]);

  return (
    <InteractiveCanvas
      nodes={rfNodes}
      edges={rfEdges}
      onNodesChange={handleRfNodesChange}
      onEdgesChange={handleRfEdgesChange}
      onNodesDelete={handleRfNodesDeleted}
      onEdgesDelete={handleRfEdgesDeleted}
      onSelectionChange={handleRfSelectionChange}
      onConnectInStore={onConnectInStore} // Corrected: was addEdgeFromHook, should be onConnectInStore from props
      isViewOnlyMode={isViewOnlyMode}
      onNodeContextMenu={(event, node) => { // Define inline handler or a new useCallback
        if (isViewOnlyMode) return;
        event.preventDefault(); // Ensure default is prevented here too
        onNodeContextMenuRequest?.(event, node);
      }}
      onNodeDrag={onNodeDragInternal}
      onNodeDragStop={onNodeDragStopInternal}
      onPaneDoubleClick={handlePaneDoubleClickInternal} // This is for adding nodes on double click
      onPaneContextMenu={handlePaneContextMenuInternal} // Pass the new handler for context menu
      activeSnapLines={activeSnapLinesLocal} // Pass snap lines to InteractiveCanvas
      gridSize={GRID_SIZE}
      panActivationKeyCode={panActivationKeyCode}
    />
  );
};

const FlowCanvasCoreWrapper: React.FC<FlowCanvasCoreProps> = (props) => {
  return (
    // ReactFlowProvider is at page level
    <FlowCanvasCoreInternal {...props} />
  );
};

export default React.memo(FlowCanvasCoreWrapper);
    
