
"use client";

import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { ReactFlowProvider, useNodesState, useEdgesState, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, useReactFlow, type OnPaneDoubleClick, type Viewport, Node } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import type { CustomNodeData } from './custom-node';
import CustomNodeComponent from './custom-node'; // Import the standard node component
import OrthogonalEdge, { type OrthogonalEdgeData } from './orthogonal-edge';
import SuggestionEdge from './SuggestionEdge';
import GroupSuggestionOverlayNode, { type GroupSuggestionOverlayData } from './GroupSuggestionOverlayNode'; // Import new overlay node
import { getMarkerDefinition } from './orthogonal-edge';
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';
import { cn } from '@/lib/utils'; // Added for conditional class names
import { useToast } from '@/components/ui/use-toast'; // Added for toast notifications

export interface RFConceptMapEdgeDataFromCore extends OrthogonalEdgeData {}

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8; // Pixels for snapping sensitivity
const NODE_DRAG_SNAP_THRESHOLD = SNAP_THRESHOLD; // Specific for node dragging, can be different
const NODE_PREVIEW_WIDTH = 150;
const NODE_PREVIEW_HEIGHT = 70;

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
  onNewEdgeSuggestLabels?: (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => Promise<void>;
  onGhostNodeAcceptRequest?: (ghostNodeId: string) => void;
  onConceptSuggestionDrop?: (conceptText: string, position: { x: number; y: number }) => void; // New prop
  panActivationKeyCode?: string | null;
}

// Helper function for snapping logic
const calculateSnapLines = (
  draggedItem: { x: number; y: number; width: number; height: number; id: string; },
  allNodes: RFNode<CustomNodeData>[],
  snapThreshold: number,
  gridSize: number
): { snappedX: number; snappedY: number; newSnapLines: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }> } => {
  let snappedX = draggedItem.x;
  let snappedY = draggedItem.y;
  const newSnapLines: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }> = [];
  let xSnappedByNode = false;
  let ySnappedByNode = false;

  const draggedNodeWidth = draggedItem.width;
  const draggedNodeHeight = draggedItem.height;

  const draggedTargetsX = [
    { type: 'left', value: draggedItem.x },
    { type: 'center', value: draggedItem.x + draggedNodeWidth / 2 },
    { type: 'right', value: draggedItem.x + draggedNodeWidth },
  ];
  const draggedTargetsY = [
    { type: 'top', value: draggedItem.y },
    { type: 'center', value: draggedItem.y + draggedNodeHeight / 2 },
    { type: 'bottom', value: draggedItem.y + draggedNodeHeight },
  ];

  let minDeltaX = Infinity; let bestSnapXInfo: { position: number, line: typeof newSnapLines[0] } | null = null;
  let minDeltaY = Infinity; let bestSnapYInfo: { position: number, line: typeof newSnapLines[0] } | null = null;

  allNodes.forEach(otherNode => {
    if (otherNode.id === draggedItem.id || !otherNode.width || !otherNode.height || !otherNode.positionAbsolute) return;

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
        if (delta < snapThreshold && delta < minDeltaX) {
          minDeltaX = delta;
          bestSnapXInfo = {
            position: otX.value - (dtX.value - draggedItem.x),
            line: {
              type: 'vertical',
              x1: otX.value, y1: Math.min(draggedItem.y, otherNodePosition.y) - 20,
              x2: otX.value, y2: Math.max(draggedItem.y + draggedNodeHeight, otherNodePosition.y + otherHeight) + 20,
            }
          };
        }
      }
    }

    for (const dtY of draggedTargetsY) {
      for (const otY of otherTargetsY) {
        const delta = Math.abs(dtY.value - otY.value);
        if (delta < snapThreshold && delta < minDeltaY) {
          minDeltaY = delta;
          bestSnapYInfo = {
            position: otY.value - (dtY.value - draggedItem.y),
            line: {
              type: 'horizontal',
              x1: Math.min(draggedItem.x, otherNodePosition.x) - 20, y1: otY.value,
              x2: Math.max(draggedItem.x + draggedNodeWidth, otherNodePosition.x + otherWidth) + 20, y2: otY.value,
            }
          };
        }
      }
    }
  });

  if (bestSnapXInfo !== null) {
    snappedX = bestSnapXInfo.position;
    xSnappedByNode = true;
    newSnapLines.push(bestSnapXInfo.line);
  }
  if (bestSnapYInfo !== null) {
    snappedY = bestSnapYInfo.position;
    ySnappedByNode = true;
    newSnapLines.push(bestSnapYInfo.line);
  }

  if (!xSnappedByNode) {
    const gridSnappedX = Math.round(draggedItem.x / gridSize) * gridSize;
    if (Math.abs(draggedItem.x - gridSnappedX) < snapThreshold) {
      snappedX = gridSnappedX;
    }
  }
  if (!ySnappedByNode) {
    const gridSnappedY = Math.round(draggedItem.y / gridSize) * gridSize;
    if (Math.abs(draggedItem.y - gridSnappedY) < snapThreshold) {
      snappedY = gridSnappedY;
    }
  }
  return { snappedX, snappedY, newSnapLines };
};


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
  onNewEdgeSuggestLabels,
  onGhostNodeAcceptRequest,
  onConceptSuggestionDrop, // Destructure new prop
  panActivationKeyCode,
}) => {
  useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal Render] mapDataFromStore.nodes count: ${mapDataFromStore.nodes?.length ?? 'N/A'}`);
  useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore V11] Received mapDataFromStore. Nodes: ${mapDataFromStore.nodes?.length ?? 'N/A'}, Edges: ${mapDataFromStore.edges?.length ?? 'N/A'}`);
  const {
    addNode: addNodeToStore,
    setSelectedElement,
    setEditingNodeId,
    connectingNodeId,
    finishConnectionAttempt,
    cancelConnection,
    addEdge: addEdgeToStore,
    pendingRelationForEdgeCreation,
    setPendingRelationForEdgeCreation,
    clearPendingRelationForEdgeCreation,
  } = useConceptMapStore();
  const { toast } = useToast();

  const {
    stagedMapData,
    isStagingActive,
    conceptExpansionPreview,
    structuralSuggestions, // For edges
    structuralGroupSuggestions // For groups
  } = useConceptMapStore(
    useCallback(s => ({
      stagedMapData: s.stagedMapData,
      isStagingActive: s.isStagingActive,
      conceptExpansionPreview: s.conceptExpansionPreview,
      structuralSuggestions: s.structuralSuggestions,
      structuralGroupSuggestions: s.structuralGroupSuggestions, // Destructure group suggestions
    }), [])
  );
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null); // Added ref for the wrapper

  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);
  const [dragPreviewData, setDragPreviewData] = useState<{ x: number; y: number; text: string; width: number; height: number } | null>(null);

  // Initialize useNodesState and useEdgesState for main and staged elements.
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<OrthogonalEdgeData>([]);
  const [rfStagedNodes, setRfStagedNodes, onStagedNodesChange] = useNodesState<CustomNodeData>([]);
  const [rfStagedEdges, setRfStagedEdges, onStagedEdgesChange] = useEdgesState<OrthogonalEdgeData>([]);
  const [rfPreviewNodes, setRfPreviewNodes, onPreviewNodesChange] = useNodesState<CustomNodeData>([]);
  const [rfPreviewEdges, setRfPreviewEdges, onPreviewEdgesChange] = useEdgesState<OrthogonalEdgeData>([]);


  const edgeTypes = useMemo(() => ({
    orthogonal: OrthogonalEdge,
    suggestionEdge: SuggestionEdge,
  }), []);

  const nodeTypes = useMemo(() => ({
    customConceptNode: CustomNodeComponent, // Standard node
    groupSuggestionOverlay: GroupSuggestionOverlayNode, // New overlay node type
  }), []);

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
      dragHandle: '.node-move-handle',
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

  // Effect to synchronize CONCEPT EXPANSION PREVIEW nodes and edges
  useEffect(() => {
    if (conceptExpansionPreview && conceptExpansionPreview.previewNodes.length > 0) {
      const parentNode = mapDataFromStore.nodes.find(n => n.id === conceptExpansionPreview.parentNodeId);
      if (!parentNode) {
        useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Parent node for expansion preview not found: ${conceptExpansionPreview.parentNodeId}`);
        setRfPreviewNodes([]);
        setRfPreviewEdges([]);
        return;
      }

      useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Updating PREVIEW nodes. Count: ${conceptExpansionPreview.previewNodes.length}`);
      const newRfPreviewNodes = conceptExpansionPreview.previewNodes.map((previewNode, index) => {
        // Position preview nodes relative to the parent, e.g., in a fan shape or row
        const position = getNodePlacement(
          [...mapDataFromStore.nodes, ...newRfPreviewNodes.slice(0,index)], // consider already placed preview nodes for subsequent placements
           'child', // layout type
           parentNode, // parent node
           null, // selected node (not relevant here)
           GRID_SIZE, // grid size
           index, // child index for layout algorithm
           conceptExpansionPreview.previewNodes.length // total children for layout algorithm
        );

        return {
          id: previewNode.id, // Use temporary ID from preview data
          type: 'customConceptNode',
          data: {
            label: previewNode.text,
            details: previewNode.details,
            type: 'ai-expanded-ghost', // Specific type for ghost styling
            isViewOnly: true,
            isGhost: true, // Flag for styling
            width: 150, // Standard size for ghosts
            height: 70,
          } as CustomNodeData,
          position: position,
          draggable: false,
          selectable: true, // Allow selection for accept/reject actions
          connectable: false,
        };
      });
      setRfPreviewNodes(newRfPreviewNodes);

      const newRfPreviewEdges = newRfPreviewNodes.map(rfPreviewNode => ({
        id: `preview-edge-${conceptExpansionPreview.parentNodeId}-${rfPreviewNode.id}`,
        source: conceptExpansionPreview.parentNodeId,
        target: rfPreviewNode.id,
        label: conceptExpansionPreview.previewNodes.find(pn => pn.id === rfPreviewNode.id)?.relationLabel || 'suggests',
        type: 'orthogonal', // Or a specific ghost edge type
        style: { strokeDasharray: '4,4', opacity: 0.6, strokeWidth: 1.5, stroke: '#8A2BE2' /* Purple-ish for ghost */ },
        updatable: false,
        selectable: true,
      }));
      setRfPreviewEdges(newRfPreviewEdges);
      useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Updating PREVIEW edges. Count: ${newRfPreviewEdges.length}`);

    } else {
      setRfPreviewNodes([]);
      setRfPreviewEdges([]);
    }
  }, [conceptExpansionPreview, mapDataFromStore.nodes, setRfPreviewNodes, setRfPreviewEdges, reactFlowInstance]);
  
  // Effect to fitView (remains unchanged)
  useEffect(() => {
    if (rfNodes.length > 0 && reactFlowInstance && typeof reactFlowInstance.fitView === 'function') {
      const timerId = setTimeout(() => {
        reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      }, 100); // A small delay can help ensure nodes are rendered
      return () => clearTimeout(timerId);
    }
  }, [rfNodes, reactFlowInstance]); // Keep reactFlowInstance dependency if fitView is stable

  const onNodeDragInternal = useCallback((_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>, allNodes: RFNode<CustomNodeData>[]) => {
    if (isViewOnlyMode || !draggedNode.dragging || !draggedNode.width || !draggedNode.height || !draggedNode.positionAbsolute) {
      setActiveSnapLinesLocal([]);
      return;
    }
    const { snappedX, snappedY, newSnapLines } = calculateSnapLines(
      { ...draggedNode.positionAbsolute, width: draggedNode.width, height: draggedNode.height, id: draggedNode.id },
      allNodes, // These are RFNodes, which include positionAbsolute
      NODE_DRAG_SNAP_THRESHOLD,
      GRID_SIZE
    );

    if (draggedNode.positionAbsolute.x !== snappedX || draggedNode.positionAbsolute.y !== snappedY) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: { x: snappedX, y: snappedY }, dragging: true }]);
    }
    setActiveSnapLinesLocal(newSnapLines);
  }, [isViewOnlyMode, onNodesChangeReactFlow, NODE_DRAG_SNAP_THRESHOLD, GRID_SIZE]);


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
    const newEdgeOptions = {
      source: params.source!,
      target: params.target!,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      label: "connects", // Default label
    };

    // onConnectInStore is expected to be the store's addEdge or a wrapper that calls it.
    // The store's addEdge now returns the new edge ID.
    // Assuming onConnectInStore (e.g., addStoreEdge from the hook) is updated to return the ID.
    const newEdgeId = onConnectInStore(newEdgeOptions);

    if (typeof newEdgeId === 'string' && params.source && params.target) {
      onNewEdgeSuggestLabels?.(newEdgeId, params.source, params.target, ""); // Pass empty string for existingLabel initially
    } else if (newEdgeId) { // If it returned something but not a string, log for debugging.
        console.warn("onConnectInStore did not return a string ID for the new edge.", newEdgeId);
    }
  }, [isViewOnlyMode, onConnectInStore, onNewEdgeSuggestLabels]);


  const handleNodeRelationDrop = useCallback((event: React.DragEvent, targetNode: RFNode) => {
    if (isViewOnlyMode) return;
    // event.preventDefault(); // React Flow's onNodeDrop likely handles this.

    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;

    try {
      const droppedData = JSON.parse(dataString);
      if (droppedData.type === 'relation-suggestion' && typeof droppedData.label === 'string') {
        setPendingRelationForEdgeCreation({
          label: droppedData.label,
          sourceNodeId: targetNode.id, // The node it was dropped on is the source
          sourceNodeHandle: null,
        });
        toast({
          title: "Relation Placed on Source Node",
          description: `Click the target node to complete the edge with label: "${droppedData.label}". Press ESC to cancel.`,
          duration: 5000,
        });
        if (reactFlowWrapperRef.current) {
            reactFlowWrapperRef.current.classList.add('relation-linking-active');
        }
        // Ensure other interaction modes are reset
        useConceptMapStore.getState().cancelConnection(); // Cancel node-to-node connection mode
      }
    } catch (e) {
      console.error("Failed to parse dropped relation data", e);
      toast({ title: "Error", description: "Could not process dragged relation.", variant: "destructive" });
      if (reactFlowWrapperRef.current) { // Ensure cursor is reset on error too
          reactFlowWrapperRef.current.classList.remove('relation-linking-active');
      }
    }
  }, [isViewOnlyMode, setPendingRelationForEdgeCreation, toast, addEdgeToStore, reactFlowWrapperRef]);


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

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    if (!reactFlowInstance) return;

    if (event.dataTransfer.types.includes('application/json')) {
      const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      const previewRect = {
          x: position.x,
          y: position.y,
          width: NODE_PREVIEW_WIDTH,
          height: NODE_PREVIEW_HEIGHT,
          id: 'drag-preview-node'
      };
      // Pass only main rfNodes for snapping calculations, excluding staged/preview nodes
      const snapResult = calculateSnapLines(previewRect, rfNodes, SNAP_THRESHOLD, GRID_SIZE);

      let previewText = dragPreviewData?.text || "New Node"; // Preserve existing text if any
      try {
        const data = JSON.parse(event.dataTransfer.getData('application/json'));
        if (data && data.text && typeof data.text === 'string') {
          previewText = data.text;
        }
      } catch (e) { /* ignore */ }

      setDragPreviewData({
          x: snapResult.snappedX,
          y: snapResult.snappedY,
          text: previewText,
          width: NODE_PREVIEW_WIDTH,
          height: NODE_PREVIEW_HEIGHT,
      });
      setActiveSnapLinesLocal(snapResult.newSnapLines);
    } else {
      setDragPreviewData(null); // Clear preview if item is not what we expect
      setActiveSnapLinesLocal([]);
    }
  }, [reactFlowInstance, GRID_SIZE, rfNodes, dragPreviewData?.text]);

  const handleCanvasDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragPreviewData(null);
    setActiveSnapLinesLocal([]);
    if (isViewOnlyMode || !reactFlowInstance) return;

    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) {
      useConceptMapStore.getState().addDebugLog("[FlowCanvasCore] Drop event without application/json data.");
      return;
    }

    try {
      const droppedData = JSON.parse(dataString);
      const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

      if (droppedData.type === 'concept-suggestion' && typeof droppedData.text === 'string') {
        const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;
        onConceptSuggestionDrop?.(droppedData.text, { x: snappedX, y: snappedY });
        useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Dropped concept suggestion: ${droppedData.text}`);
      } else {
        useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Dropped data of unknown type or format: ${dataString}`);
      }
    } catch (e) {
      console.error("Failed to parse dropped data in FlowCanvasCore:", e);
      useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Failed to parse dropped data: ${dataString}. Error: ${e}`);
    }
  }, [isViewOnlyMode, reactFlowInstance, onConceptSuggestionDrop, GRID_SIZE]);

  const handleCanvasDragLeave = useCallback((event: React.DragEvent) => {
    // Check if the mouse is leaving the canvas area entirely
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setDragPreviewData(null);
        setActiveSnapLinesLocal([]);
    }
  }, []);

  // Global dragend listener as a fallback to clear preview
  useEffect(() => {
    const handleDragEnd = () => {
      setDragPreviewData(null);
      setActiveSnapLinesLocal([]);
    };
    document.addEventListener('dragend', handleDragEnd);
    return () => {
      document.removeEventListener('dragend', handleDragEnd);
    };
  }, []);


  // Combine main, staged, and preview elements for rendering
  const combinedNodes = useMemo(() => {
    const baseNodes = [...rfNodes, ...rfStagedNodes, ...rfPreviewNodes];
    if (dragPreviewData) {
      baseNodes.push({
        id: 'drag-preview-node',
        type: 'customConceptNode',
        data: {
          label: dragPreviewData.text,
          isViewOnly: true,
          isGhost: true,
          shape: 'rectangle',
          width: dragPreviewData.width,
          height: dragPreviewData.height,
        } as CustomNodeData,
        position: { x: dragPreviewData.x, y: dragPreviewData.y },
        draggable: false,
        selectable: false,
        connectable: false,
        zIndex: 10000,
      });
    }
    return baseNodes;
  }, [rfNodes, rfStagedNodes, rfPreviewNodes, dragPreviewData, groupSuggestionOverlays]); // Added groupSuggestionOverlays dependency

  const groupSuggestionOverlays = useMemo(() => {
    if (!structuralGroupSuggestions || !reactFlowInstance || rfNodes.length === 0) {
      return [];
    }

    return structuralGroupSuggestions.map(group => {
      const nodesInGroup = group.nodeIds
        .map(nodeId => reactFlowInstance.getNode(nodeId))
        .filter(node => node !== undefined) as RFNode<CustomNodeData>[];

      if (nodesInGroup.length < 2) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodesInGroup.forEach(node => {
        minX = Math.min(minX, node.position.x);
        minY = Math.min(minY, node.position.y);
        maxX = Math.max(maxX, node.position.x + (node.width || NODE_PREVIEW_WIDTH)); // Use constant for default
        maxY = Math.max(maxY, node.position.y + (node.height || NODE_PREVIEW_HEIGHT)); // Use constant for default
      });

      const PADDING = 20; // Increased padding for better visual separation
      const boxX = minX - PADDING;
      const boxY = minY - PADDING;
      const boxWidth = maxX - minX + 2 * PADDING;
      const boxHeight = maxY - minY + 2 * PADDING;

      return {
        id: group.id,
        x: boxX,
        y: boxY,
        width: boxWidth,
        height: boxHeight,
        label: group.label,
        reason: group.reason,
      };
    }).filter(box => box !== null);
  }, [structuralGroupSuggestions, reactFlowInstance, rfNodes]);


  const combinedNodes = useMemo(() => {
    let baseNodes = [...rfNodes, ...rfStagedNodes, ...rfPreviewNodes];
    if (dragPreviewData) {
      baseNodes.push({
        id: 'drag-preview-node',
        type: 'customConceptNode',
        data: {
          label: dragPreviewData.text,
          isViewOnly: true,
          isGhost: true,
          shape: 'rectangle',
          width: dragPreviewData.width,
          height: dragPreviewData.height,
        } as CustomNodeData,
        position: { x: dragPreviewData.x, y: dragPreviewData.y },
        draggable: false, selectable: false, connectable: false, zIndex: 10000,
      });
    }

    if (groupSuggestionOverlays && groupSuggestionOverlays.length > 0) {
      const overlayNodes = groupSuggestionOverlays.map(overlay => {
        if (!overlay) return null; // Should be filtered by now, but defensive
        return {
            id: `group-overlay-${overlay.id}`,
            type: 'groupSuggestionOverlay',
            position: { x: overlay.x, y: overlay.y },
            data: {
                width: overlay.width,
                height: overlay.height,
                label: overlay.label,
                reason: overlay.reason,
                suggestionId: overlay.id
            },
            selectable: false,
            draggable: false,
            zIndex: 0, // Render behind actual nodes
        };
      }).filter(n => n !== null);
      baseNodes = [...baseNodes, ...overlayNodes as RFNode<CustomNodeData | GroupSuggestionOverlayData>[]];
    }
    return baseNodes;
  }, [rfNodes, rfStagedNodes, rfPreviewNodes, dragPreviewData, groupSuggestionOverlays]);

  const combinedEdges = useMemo(() => {
    const baseEdges = [...rfEdges, ...rfStagedEdges, ...rfPreviewEdges];
    if (structuralSuggestions && structuralSuggestions.length > 0) {
      const suggestionFlowEdges = structuralSuggestions.map((suggestion) => ({
        id: suggestion.id,
        source: suggestion.source,
        target: suggestion.target,
        label: suggestion.label || '',
        type: 'suggestionEdge', // Use the new custom edge type
        data: {
            label: suggestion.label || '',
            isSuggestion: true,
            reason: suggestion.reason,
            // Explicitly don't set color/lineType here if style dictates it
        } as OrthogonalEdgeData, // Cast is okay if OrthogonalEdgeData is simple
        style: { stroke: '#7c3aed', strokeDasharray: '8 6', opacity: 0.8, strokeWidth: 2 }, // Distinct style
        markerEnd: getMarkerDefinition('arrowclosed', '#7c3aed'),
        selectable: true,
        zIndex: 1,
      }));
      baseEdges.push(...suggestionFlowEdges);
    }
    return baseEdges;
  }, [rfEdges, rfStagedEdges, rfPreviewEdges, structuralSuggestions]);

  // Handle Escape key to cancel connection or pending relation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const currentPendingRelationForEsc = useConceptMapStore.getState().pendingRelationForEdgeCreation;
        const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId;

        if (currentPendingRelationForEsc) {
          clearPendingRelationForEdgeCreation();
          if (reactFlowWrapperRef.current) {
              reactFlowWrapperRef.current.classList.remove('relation-linking-active');
          }
          // toast({ title: "Relation Cancelled" }); // Optional: can be noisy
        } else if (currentConnectingNodeId) {
          cancelConnection();
           if (reactFlowWrapperRef.current) {
              reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
           }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [cancelConnection, clearPendingRelationForEdgeCreation, reactFlowWrapperRef]); // Dependencies: store actions and ref

  return (
    <div ref={reactFlowWrapperRef} className={cn('w-full h-full', { 'cursor-crosshair': !!connectingNodeId })}>
      <InteractiveCanvas
        nodes={combinedNodes}
        edges={combinedEdges}
      onNodesChange={handleRfNodesChange}
      onEdgesChange={handleRfEdgesChange}
      onNodesDelete={handleRfNodesDeleted}
      onEdgesDelete={handleRfEdgesDeleted}
      onSelectionChange={handleRfSelectionChange}
      onConnect={onConnectInStore} // Changed from onConnectInStore to onConnect, as InteractiveCanvas expects onConnect
      isViewOnlyMode={isViewOnlyMode}
      onNodeContextMenu={(event, node) => {
        if (isViewOnlyMode) return;
        event.preventDefault(); // Ensure default is prevented here too
        onNodeContextMenuRequest?.(event, node);
      }}
      onNodeDrag={onNodeDragInternal}
      onNodeDragStop={onNodeDragStopInternal}
      onNodeClick={(event, node) => {
        if (isViewOnlyMode) return;

        const currentPendingRelation = useConceptMapStore.getState().pendingRelationForEdgeCreation;
        if (currentPendingRelation) {
          event.stopPropagation();
          event.preventDefault();

          if (node.id === currentPendingRelation.sourceNodeId) {
            clearPendingRelationForEdgeCreation();
            toast({ title: "Relation Cancelled", description: "Clicked source node again." });
            if (reactFlowWrapperRef.current) {
                reactFlowWrapperRef.current.classList.remove('relation-linking-active');
            }
          } else {
            const newEdgeId = addEdgeToStore({
              source: currentPendingRelation.sourceNodeId,
              target: node.id,
              sourceHandle: currentPendingRelation.sourceNodeHandle, // Usually null for this type of creation
              label: currentPendingRelation.label,
              type: 'default',
            });
            toast({ title: "Edge Created", description: `Edge with label "${currentPendingRelation.label}" added.` });
            clearPendingRelationForEdgeCreation();
            if (reactFlowWrapperRef.current) {
                reactFlowWrapperRef.current.classList.remove('relation-linking-active');
            }
            setSelectedElement(newEdgeId, 'edge'); // Select the new edge
          }
          return;
        }

        if (connectingNodeId) { // This is for button-initiated connections
          event.stopPropagation();
          event.preventDefault();
          if (node.id === connectingNodeId) {
            cancelConnection();
            if (reactFlowWrapperRef.current) {
                reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
            }
            useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Connection cancelled by clicking source node ${node.id}.`);
          } else {
            const newEdge = {
              source: connectingNodeId,
              target: node.id,
              label: '',
              type: 'default',
            };
            const newEdgeId = addEdgeToStore(newEdge);
            useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] Edge created from ${connectingNodeId} to ${node.id}. New Edge ID: ${newEdgeId}`);
            finishConnectionAttempt(node.id);
            if (reactFlowWrapperRef.current) {
                reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
            }
            setSelectedElement(newEdgeId, 'edge');
          }
          return;
        }

        if (node.data?.isGhost) {
          onGhostNodeAcceptRequest?.(node.id);
        }
        // Default behavior for node selection is handled by React Flow unless propagation is stopped
      }}
      onPaneDoubleClick={handlePaneDoubleClickInternal}
      onPaneContextMenu={handlePaneContextMenuInternal}
      onNodeDrop={handleNodeRelationDrop} // Pass the new handler
      onDragOver={handleCanvasDragOver} // Handles general canvas drag over
      onDrop={handleCanvasDrop} // Handles general canvas drop
      onDragLeave={handleCanvasDragLeave} // Handles general canvas drag leave
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      activeSnapLines={activeSnapLinesLocal}
      gridSize={GRID_SIZE}
      panActivationKeyCode={panActivationKeyCode}
    />
    </div>
  );
};

const FlowCanvasCoreWrapper: React.FC<FlowCanvasCoreProps> = (props) => (
    // ReactFlowProvider is at page level, so no need to wrap here again
    <FlowCanvasCoreInternal {...props} />
);

export default React.memo(FlowCanvasCoreWrapper);
