'use client';

import React, {
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodesDelete,
  type OnEdgesDelete,
  type NodeSelectionChange,
  type Connection,
  useReactFlow,
} from 'reactflow';

import CustomNodeComponent from './custom-node';
import GhostNodeComponent from './GhostNodeComponent';
import { InteractiveCanvas } from './interactive-canvas';
import OrthogonalEdge, {
  type OrthogonalEdgeData,
  getMarkerDefinition,
} from './orthogonal-edge';
import SuggestedEdge from './SuggestedEdge';
import SuggestedGroupOverlayNode from './SuggestedGroupOverlayNode';
import SuggestedIntermediateNode from './SuggestedIntermediateNode';

import type { CustomNodeData } from './custom-node';

// getNodePlacement is still needed for other AI tools that might use staging area
// import { getNodePlacement } from '@/lib/layout-utils'; // Already used if needed
import type {
  ConceptMapData,
  ConceptMapNode,
  ConceptMapEdge,
  VisualEdgeSuggestion,
} from '@/types';
import type { SnapResult, RFLayoutNode } from '@/types/graph-adapter'; // Import moved types

import { useToast } from '@/hooks/use-toast';
import { calculateSnappedPositionAndLines } from '@/lib/layout-utils'; // Import moved function
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';

interface ExtractedConceptItem {
    concept: string;
    context?: string;
    source?: string;
}

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;
const NODE_DRAG_SNAP_THRESHOLD = SNAP_THRESHOLD;
const NODE_PREVIEW_WIDTH = 150;
const NODE_PREVIEW_HEIGHT = 70;

// calculateSnappedPositionAndLines and SnapResult moved to lib/layout-utils.ts
// and types to types/graph-adapter.ts

interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
  onNodesChangeInStore: (
    nodeId: string,
    updates: Partial<ConceptMapNode>
  ) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    color?: string;
    lineType?: 'solid' | 'dashed';
    markerStart?: string;
    markerEnd?: string;
  }) => string | undefined;
  onNodeContextMenuRequest?: (
    event: React.MouseEvent,
    node: RFNode<CustomNodeData>
  ) => void;
  onNodeAIExpandTriggered?: (nodeId: string) => void;
  onPaneContextMenuRequest?: (
    event: React.MouseEvent,
    positionInFlow: { x: number; y: number }
  ) => void;
  onStagedElementsSelectionChange?: (selectedIds: string[]) => void;
  onNewEdgeSuggestLabels?: (
    edgeId: string,
    sourceNodeId: string,
    targetNodeId: string,
    existingLabel?: string
  ) => Promise<void>;
  onConceptSuggestionDrop?: (
    conceptItem: ExtractedConceptItem,
    position: { x: number; y: number }
  ) => void;
  onNodeStartConnectionRequest?: (nodeId: string) => void;
  panActivationKeyCode?: string | null;
  activeVisualEdgeSuggestion?: VisualEdgeSuggestion | null;
  onAcceptVisualEdge?: (suggestionId: string) => void;
  onRejectVisualEdge?: (suggestionId: string) => void;
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
  onNewEdgeSuggestLabels,
  onConceptSuggestionDrop,
  onNodeStartConnectionRequest,
  panActivationKeyCode,
  activeVisualEdgeSuggestion,
  onAcceptVisualEdge,
  onRejectVisualEdge,
}) => {
  useConceptMapStore
    .getState()
    .addDebugLog(
      `[FlowCanvasCoreInternal Render] mapDataFromStore.nodes count: ${mapDataFromStore.nodes?.length ?? 'N/A'}`
    );
  const {
    addNode: addNodeToStore,
    setSelectedElement,
    setEditingNodeId,
    connectingNodeId,
    completeConnectionMode: storeCompleteConnectionMode,
    cancelConnection: storeCancelConnection,
    dragPreviewItem,
    dragPreviewPosition,
    updateDragPreviewPosition,
    draggedRelationLabel,
    addEdge: addEdgeToStore,
    triggerFitView,
    setTriggerFitView,
    structuralSuggestions,
    // structuralGroupSuggestions, // This was removed from the store selector in a previous step, ensure it's not used or re-add if necessary
  } = useConceptMapStore();

  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<
    SnapResult['activeSnapLines']
  >([]);
  const [dragPreviewData, setDragPreviewData] = useState<{
    x: number;
    y: number;
    text: string;
    width: number;
    height: number;
  } | null>(null);

  const [rfNodes, setRfNodes, onNodesChangeReactFlow] =
    useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] =
    useEdgesState<OrthogonalEdgeData>([]);

  const {
    stagedMapData,
    isStagingActive,
    focusViewOnNodeIds,
    triggerFocusView: triggerFocusViewFromStore,
    clearFocusViewTrigger,
    ghostPreviewData,
  } = useConceptMapStore(
    useCallback(
      (s) => ({
        stagedMapData: s.stagedMapData,
        isStagingActive: s.isStagingActive,
        ghostPreviewData: s.ghostPreviewData,
        focusViewOnNodeIds: s.focusViewOnNodeIds,
        triggerFocusView: s.triggerFocusView,
        clearFocusViewTrigger: s.clearFocusViewTrigger,
      }),
      []
    )
  );

  const [rfStagedNodes, setRfStagedNodes, onStagedNodesChangeReactFlow] =
    useNodesState<CustomNodeData>([]);
  const [rfStagedEdges, setRfStagedEdges, onStagedEdgesChangeReactFlow] =
    useEdgesState<OrthogonalEdgeData>([]);

  const edgeTypes = useMemo(
    () => ({
      orthogonal: OrthogonalEdge,
      'suggested-edge': SuggestedEdge,
    }),
    []
  );

  const nodeTypes = useMemo(
    () => ({
      customConceptNode: CustomNodeComponent,
      'suggested-intermediate-node': SuggestedIntermediateNode,
      'suggested-group-overlay-node': SuggestedGroupOverlayNode,
      ghostNode: GhostNodeComponent,
      dragPreviewNode: CustomNodeComponent,
      dragPreviewLabel: ({ data }: { data: { label: string } }) => (
        <div
          style={{
            padding: 5,
            background: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
          }}
        >
          {data.label}
        </div>
      ),
    }),
    []
  );

  useEffect(() => {
    const newRfNodes = (mapDataFromStore.nodes || []).map((appNode) => ({
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
        onStartConnectionRequest: onNodeStartConnectionRequest,
      } as CustomNodeData,
      position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
      draggable: !isViewOnlyMode,
      selectable: true,
      connectable: !isViewOnlyMode,
      dragHandle: '.node-move-handle',
      parentNode: appNode.parentNode,
      expandParent: !!appNode.parentNode,
    }));
    setRfNodes(newRfNodes);
  }, [
    mapDataFromStore.nodes,
    isViewOnlyMode,
    onNodeAIExpandTriggered,
    onNodeStartConnectionRequest,
    setRfNodes,
  ]);

  useEffect(() => {
    const newRfEdges = (mapDataFromStore.edges || []).map((appEdge) => ({
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
        lineType: appEdge.lineType,
      } as OrthogonalEdgeData,
      markerStart: getMarkerDefinition(appEdge.markerStart, appEdge.color),
      markerEnd: getMarkerDefinition(appEdge.markerEnd, appEdge.color),
      style: { strokeWidth: 2 },
      updatable: !isViewOnlyMode,
      deletable: !isViewOnlyMode,
    }));
    setRfEdges(newRfEdges);
  }, [mapDataFromStore.edges, isViewOnlyMode, setRfEdges]);

  useEffect(() => {
    if (isStagingActive && stagedMapData) {
      const newRfStagedNodes = stagedMapData.nodes.map((appNode) => ({
        id: appNode.id,
        type: 'customConceptNode',
        data: {
          label: appNode.text,
          details: appNode.details,
          type: appNode.type || 'default',
          isViewOnly: true,
          backgroundColor: appNode.backgroundColor,
          shape: appNode.shape,
          width: appNode.width,
          height: appNode.height,
          isStaged: true,
        } as CustomNodeData,
        position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
        draggable: false,
        selectable: true,
        connectable: false,
        dragHandle: '.cursor-move',
      }));
      setRfStagedNodes(newRfStagedNodes);
      const newRfStagedEdges = (stagedMapData.edges || []).map((appEdge) => ({
        id: appEdge.id,
        source: appEdge.source,
        target: appEdge.target,
        label: appEdge.label,
        type: 'orthogonal',
        data: {
          label: appEdge.label,
          color: appEdge.color,
          lineType: appEdge.lineType,
        } as OrthogonalEdgeData,
        style: {
          strokeDasharray: '5,5',
          opacity: 0.7,
          strokeWidth: 2,
          stroke: appEdge.color || 'grey',
        },
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
    if (activeVisualEdgeSuggestion) {
      const tempEdgeId = `suggested-edge-${activeVisualEdgeSuggestion.id}`;
      const tempEdge: RFEdge = {
        id: tempEdgeId,
        source: activeVisualEdgeSuggestion.sourceNodeId,
        target: activeVisualEdgeSuggestion.targetNodeId,
        label: activeVisualEdgeSuggestion.label,
        type: 'orthogonal',
        style: {
          stroke: 'hsl(var(--primary)/0.7)',
          strokeDasharray: '8,6',
          strokeWidth: 2.5,
          opacity: 0.75,
        },
        animated: true,
        deletable: false,
        zIndex: 900,
      };
      setRfEdges((prevEdges) => [
        ...prevEdges.filter((edge) => !edge.id.startsWith('suggested-edge-')),
        tempEdge,
      ]);
    } else {
      setRfEdges((prevEdges) =>
        prevEdges.filter((edge) => !edge.id.startsWith('suggested-edge-'))
      );
    }
  }, [activeVisualEdgeSuggestion, setRfEdges]);

  useEffect(() => {
    if (
      rfNodes.length > 0 &&
      reactFlowInstance &&
      typeof reactFlowInstance.fitView === 'function'
    ) {
      const timerId = setTimeout(() => {
        reactFlowInstance.fitView({
          duration: 300,
          padding: 0.2,
          includeHiddenNodes: true,
        });
      }, 100);
      return () => clearTimeout(timerId);
    }
  }, [rfNodes, reactFlowInstance]);

  useEffect(() => {
    if (
      triggerFitView &&
      reactFlowInstance &&
      typeof reactFlowInstance.fitView === 'function'
    ) {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      setTriggerFitView(false);
    }
  }, [triggerFitView, reactFlowInstance, setTriggerFitView]);

  useEffect(() => {
    if (triggerFocusViewFromStore && reactFlowInstance) {
      if (focusViewOnNodeIds && focusViewOnNodeIds.length > 0) {
        reactFlowInstance.fitView({
          nodes: focusViewOnNodeIds.map((id) => ({ id })),
          duration: 600,
          padding: 0.2,
        });
      } else {
        reactFlowInstance.fitView({ duration: 600, padding: 0.2 });
      }
      clearFocusViewTrigger();
    }
  }, [
    triggerFocusViewFromStore,
    focusViewOnNodeIds,
    reactFlowInstance,
    clearFocusViewTrigger,
  ]);

  useEffect(() => {
    const currentConnectingNodeId =
      useConceptMapStore.getState().connectingNodeId;
    if (!currentConnectingNodeId) {
      if (reactFlowWrapperRef.current) {
        reactFlowWrapperRef.current.classList.remove(
          'cursor-crosshair',
          'relation-linking-active'
        );
      }
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (currentConnectingNodeId) storeCancelConnection();
        if (reactFlowWrapperRef.current) {
          reactFlowWrapperRef.current.classList.remove(
            'cursor-crosshair',
            'relation-linking-active'
          );
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    connectingNodeId,
    storeCancelConnection,
    reactFlowWrapperRef,
  ]);

  useEffect(() => {
    if (!reactFlowInstance || !reactFlowWrapperRef.current) return;
    const paneElement = reactFlowWrapperRef.current.querySelector(
      '.react-flow__pane'
    ) as HTMLElement | null;
    if (paneElement) {
      if (connectingNodeId) paneElement.style.cursor = 'crosshair';
      else paneElement.style.cursor = 'default';
    }
    return () => {
      if (paneElement) paneElement.style.cursor = 'default';
    };
  }, [
    connectingNodeId,
    reactFlowInstance,
    reactFlowWrapperRef,
  ]);

  const onNodeDragInternal = useCallback(
    (
      _event: React.MouseEvent,
      draggedNode: RFNode<CustomNodeData>,
      allNodes: RFNode<CustomNodeData>[]
    ) => {
      if (
        isViewOnlyMode ||
        !draggedNode.dragging ||
        !draggedNode.width ||
        !draggedNode.height ||
        !draggedNode.positionAbsolute
      ) {
        setActiveSnapLinesLocal([]);
        return;
      }
      // Ensure allNodes are cast or mapped to RFLayoutNode if necessary
      const layoutNodesToSnapAgainst: RFLayoutNode[] = allNodes.map((n: any) => ({
        id: n.id,
        ...n.position,
        width: n.width || 0,
        height: n.height || 0,
      })); // Assuming RFNode<CustomNodeData> is compatible enough for now

      const { snappedPosition, activeSnapLines } =
        calculateSnappedPositionAndLines(
          draggedNode.positionAbsolute as { x: number; y: number },
          { width: draggedNode.width, height: draggedNode.height },
          layoutNodesToSnapAgainst, // Use casted/mapped nodes
          GRID_SIZE,
          NODE_DRAG_SNAP_THRESHOLD,
          draggedNode.id
        );
      if (
        draggedNode.positionAbsolute.x !== snappedPosition.x ||
        draggedNode.positionAbsolute.y !== snappedPosition.y
      ) {
        onNodesChangeReactFlow([
          {
            id: draggedNode.id,
            type: 'position',
            position: snappedPosition,
            dragging: true,
          },
        ]);
      }
      setActiveSnapLinesLocal(activeSnapLines);
    },
    [isViewOnlyMode, onNodesChangeReactFlow]
  );

  const onNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLinesLocal([]);
      let finalX =
        Math.round(draggedNode.positionAbsolute.x / GRID_SIZE) * GRID_SIZE;
      let finalY =
        Math.round(draggedNode.positionAbsolute.y / GRID_SIZE) * GRID_SIZE;
      onNodesChangeInStore(draggedNode.id, {
        x: finalX,
        y: finalY,
        width: draggedNode.width || undefined,
        height: draggedNode.height || undefined,
      });
    },
    [isViewOnlyMode, onNodesChangeInStore]
  );

  const handleRfNodesChange: OnNodesChange = useCallback(
    (changes) => {
      if (isViewOnlyMode) return;
      onNodesChangeReactFlow(changes);
      changes.forEach((change) => {
        if (change.type === 'dimensions' && change.dimensions) {
          onNodesChangeInStore(change.id, {
            width: change.dimensions.width,
            height: change.dimensions.height,
          });
        }
      });
    },
    [isViewOnlyMode, onNodesChangeReactFlow, onNodesChangeInStore]
  );

  const handleRfEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      if (isViewOnlyMode) return;
      onEdgesChangeReactFlow(changes);
    },
    [isViewOnlyMode, onEdgesChangeReactFlow]
  );

  const handleRfNodesDeleted: OnNodesDelete = useCallback(
    (deletedRfNodes) => {
      if (isViewOnlyMode) return;
      deletedRfNodes.forEach((node) => onNodesDeleteInStore(node.id));
    },
    [isViewOnlyMode, onNodesDeleteInStore]
  );

  const handleRfEdgesDeleted: OnEdgesDelete = useCallback(
    (deletedRfEdges) => {
      if (isViewOnlyMode) return;
      deletedRfEdges.forEach((edge) => onEdgesDeleteInStore(edge.id));
    },
    [isViewOnlyMode, onEdgesDeleteInStore]
  );

  const handleRfConnect = useCallback(
    (params: Connection) => {
      if (isViewOnlyMode) return;
      const newEdgeId = onConnectInStore({
        source: params.source!,
        target: params.target!,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        label: 'connects',
      });
      if (typeof newEdgeId === 'string' && params.source && params.target) {
        onNewEdgeSuggestLabels?.(newEdgeId, params.source, params.target, '');
      }
    },
    [isViewOnlyMode, onConnectInStore, onNewEdgeSuggestLabels]
  );

  const handleNodeRelationDrop = useCallback(
    (event: React.DragEvent, targetNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !reactFlowWrapperRef.current) return;
      const dataString = event.dataTransfer.getData('application/json');
      if (!dataString) return;
    },
    [isViewOnlyMode, reactFlowWrapperRef]
  );

  const handleRfSelectionChange = useCallback(
    (selection: any) => {
      const selectedRfNodes = selection.nodes;
      const selectedRfEdges = selection.edges;
      const currentStagedNodeIds = new Set(rfStagedNodes.map((n) => n.id));
      const currentStagedEdgeIds = new Set(rfStagedEdges.map((e) => e.id));
      const newlySelectedStagedNodeIds = selectedRfNodes
        .filter((n: any) => currentStagedNodeIds.has(n.id))
        .map((n: any) => n.id);
      const newlySelectedStagedEdgeIds = selectedRfEdges
        .filter((e: any) => currentStagedEdgeIds.has(e.id))
        .map((e: any) => e.id);
      onStagedElementsSelectionChange?.([
        ...newlySelectedStagedNodeIds,
        ...newlySelectedStagedEdgeIds,
      ]);
      const mainSelectedNodes = selectedRfNodes.filter(
        (n: any) => !currentStagedNodeIds.has(n.id)
      );
      const mainSelectedEdges = selectedRfEdges.filter(
        (e: any) => !currentStagedEdgeIds.has(e.id)
      );
      if (mainSelectedNodes.length === 1 && mainSelectedEdges.length === 0) {
        onSelectionChange(mainSelectedNodes[0].id, 'node');
      } else if (
        mainSelectedEdges.length === 1 &&
        mainSelectedNodes.length === 0
      ) {
        onSelectionChange(mainSelectedEdges[0].id, 'edge');
      } else if (
        mainSelectedNodes.length === 0 &&
        mainSelectedEdges.length === 0 &&
        (newlySelectedStagedNodeIds.length > 0 ||
          newlySelectedStagedEdgeIds.length > 0)
      ) {
        onSelectionChange(null, null);
      } else if (
        mainSelectedNodes.length === 0 &&
        mainSelectedEdges.length === 0
      ) {
        onSelectionChange(null, null);
      }
      onMultiNodeSelectionChange?.(mainSelectedNodes.map((node: any) => node.id));
    },
    [
      onSelectionChange,
      onMultiNodeSelectionChange,
      onStagedElementsSelectionChange,
      rfStagedNodes,
      rfStagedEdges,
    ]
  );

  const handlePaneDoubleClickInternal = useCallback(
    (event: React.MouseEvent) => {
      if (isViewOnlyMode || !reactFlowInstance) return;
      const positionInFlow = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;
      const newNodeId = addNodeToStore({
        text: `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`,
        type: 'manual-node',
        position: { x: snappedX, y: snappedY },
        details: '',
      });
      setSelectedElement(newNodeId, 'node');
      setEditingNodeId(newNodeId);
    },
    [
      isViewOnlyMode,
      addNodeToStore,
      reactFlowInstance,
      setSelectedElement,
      setEditingNodeId,
    ]
  );

  const handlePaneContextMenuInternal = useCallback(
    (event: React.MouseEvent) => {
      if (isViewOnlyMode || !reactFlowInstance) return;
      event.preventDefault();
      const positionInFlow = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      onPaneContextMenuRequest?.(event, positionInFlow);
    },
    [isViewOnlyMode, reactFlowInstance, onPaneContextMenuRequest]
  );

  const handleCanvasDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
      if (dragPreviewItem && reactFlowInstance) {
        const flowPosition = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        // Cast rfNodes to RFLayoutNode[] for calculateSnappedPositionAndLines
        const layoutNodesForSnapping: RFLayoutNode[] = rfNodes
          .filter((n) => n.width && n.height && n.positionAbsolute)
          .map((n: any) => ({
            id: n.id,
            ...n.position,
            width: n.width || 0,
            height: n.height || 0,
          }));
        const { snappedPosition, activeSnapLines } =
          calculateSnappedPositionAndLines(
            flowPosition,
            { width: NODE_PREVIEW_WIDTH, height: NODE_PREVIEW_HEIGHT },
            layoutNodesForSnapping, // Use casted nodes
            GRID_SIZE,
            SNAP_THRESHOLD
          );
        updateDragPreviewPosition(snappedPosition);
        setActiveSnapLinesLocal(activeSnapLines);
        setDragPreviewData({
          ...snappedPosition,
          text: dragPreviewItem.text,
          width: NODE_PREVIEW_WIDTH,
          height: NODE_PREVIEW_HEIGHT,
        });
      }
    },
    [dragPreviewItem, reactFlowInstance, updateDragPreviewPosition, rfNodes]
  );

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragPreviewData(null);
      setActiveSnapLinesLocal([]);
      if (isViewOnlyMode || !reactFlowInstance) return;
      const dataString = event.dataTransfer.getData('application/json');
      if (!dataString) return;
      try {
        const droppedData = JSON.parse(dataString);
        const positionInFlow = reactFlowInstance.screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        if (
          droppedData.type === 'concept-suggestion' &&
          typeof droppedData.text === 'string'
        ) {
          const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
          const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;
          onConceptSuggestionDrop?.(droppedData, { x: snappedX, y: snappedY });
        }
      } catch (e) {
        console.error('Failed to parse dropped data in FlowCanvasCore:', e);
      }
    },
    [isViewOnlyMode, reactFlowInstance, onConceptSuggestionDrop]
  );

  const handleCanvasDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setDragPreviewData(null);
      setActiveSnapLinesLocal([]);
    }
  }, []);

  useEffect(() => {
    const handleGlobalDragEnd = () => {
      setDragPreviewData(null);
      setActiveSnapLinesLocal([]);
    };
    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => {
      document.removeEventListener('dragend', handleGlobalDragEnd);
    };
  }, []);

  const combinedNodes = useMemo(() => {
    const ghostNodeIds = new Set(
      ghostPreviewData?.nodes.map((n) => n.id) || []
    );
    const updatedRfNodes = rfNodes.map((node) => {
      if (ghostNodeIds.has(node.id)) {
        return { ...node, data: { ...node.data, isDimmed: true } };
      }
      return node;
    });

    let baseNodes: RFNode<CustomNodeData>[] = [...updatedRfNodes, ...rfStagedNodes];
    const currentMapNodesForSuggestions = mapDataFromStore.nodes;

    if (ghostPreviewData) {
      const ghostNodesToAdd = ghostPreviewData.nodes.map((ghostNodeInfo: any) => ({
        id: `ghost-${ghostNodeInfo.id}`,
        type: 'ghostNode',
        position: { x: ghostNodeInfo.x, y: ghostNodeInfo.y },
        data: {
          id: ghostNodeInfo.id,
          width: ghostNodeInfo.width,
          height: ghostNodeInfo.height,
          label:
            currentMapNodesForSuggestions.find((n) => n.id === ghostNodeInfo.id)
              ?.text || '',
        },
        draggable: false,
        selectable: false,
        connectable: false,
        zIndex: 200,
      }));
      baseNodes = [...baseNodes, ...ghostNodesToAdd];
    }

    const suggestionNodes = (structuralSuggestions || []).flatMap(
      (suggestion: any) => {
        if (suggestion.type === 'NEW_INTERMEDIATE_NODE') {
          const { sourceNodeId, targetNodeId } = suggestion.data as any;
          const sourceNode = currentMapNodesForSuggestions.find(
            (n) => n.id === sourceNodeId
          );
          const targetNode = currentMapNodesForSuggestions.find(
            (n) => n.id === targetNodeId
          );
          let position = { x: 100, y: 100 };
          if (
            sourceNode &&
            targetNode &&
            sourceNode.x != null &&
            sourceNode.y != null &&
            targetNode.x != null &&
            targetNode.y != null
          ) {
            position = {
              x: (sourceNode.x + targetNode.x) / 2 - 75,
              y: (sourceNode.y + targetNode.y) / 2 - 35,
            };
          } else if (
            sourceNode &&
            sourceNode.x != null &&
            sourceNode.y != null
          ) {
            position = {
              x: sourceNode.x + (sourceNode.width || 150) + 50,
              y: sourceNode.y,
            };
          }
          return [
            {
              id: `suggestion-${suggestion.id}`,
              type: 'suggested-intermediate-node',
              position: position,
              data: {
                suggestionId: suggestion.id,
                suggestionData: suggestion.data,
                reason: suggestion.reason,
              },
              draggable: false,
              zIndex: 100,
            },
          ];
        }
        return [];
      }
    );
    baseNodes = [...baseNodes, ...suggestionNodes];

    const groupOverlayNodes = (structuralSuggestions || [])
      .filter((s: any) => s.type === 'FORM_GROUP')
      .map((suggestion: any) => {
        const { nodeIds, groupLabel } = suggestion.data as any;
        const groupNodes = currentMapNodesForSuggestions.filter(
          (n) =>
            nodeIds.includes(n.id) &&
            n.x != null &&
            n.y != null &&
            n.width != null &&
            n.height != null
        );
        if (groupNodes.length === 0) return null;
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;
        groupNodes.forEach((n) => {
          minX = Math.min(minX, n.x!);
          minY = Math.min(minY, n.y!);
          maxX = Math.max(maxX, n.x! + n.width!);
          maxY = Math.max(maxY, n.y! + n.height!);
        });
        const PADDING = 30;
        const position = { x: minX - PADDING, y: minY - PADDING };
        const width = maxX - minX + 2 * PADDING;
        const height = maxY - minY + 2 * PADDING;
        return {
          id: `suggestion-${suggestion.id}`,
          type: 'suggested-group-overlay-node',
          position: position,
          data: {
            suggestionId: suggestion.id,
            suggestionData: {
              nodeIdsToGroup: nodeIds,
              suggestedParentName: groupLabel,
            },
            reason: suggestion.reason,
            width: width,
            height: height,
          },
          width: width,
          height: height,
          draggable: false,
          zIndex: 50,
        };
      })
      .filter(Boolean);

    baseNodes = [
      ...baseNodes,
      ...(groupOverlayNodes as RFNode<CustomNodeData>[]),
    ];

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
    } else if (draggedRelationLabel && dragPreviewPosition) {
      baseNodes.push({
        id: 'drag-preview-relation-label',
        type: 'dragPreviewLabel',
        position: dragPreviewPosition,
        data: { label: draggedRelationLabel },
        draggable: false,
        selectable: false,
      });
    }
    return baseNodes;
  }, [
    rfNodes,
    rfStagedNodes,
    dragPreviewData,
    draggedRelationLabel,
    dragPreviewPosition,
    structuralSuggestions,
    mapDataFromStore.nodes,
    ghostPreviewData,
  ]);

  const combinedEdges = useMemo(() => {
    let baseEdges: RFEdge<OrthogonalEdgeData>[] = [...rfEdges, ...rfStagedEdges];
    const newSuggestionEdges = (structuralSuggestions || [])
      .filter((suggestion: any) => suggestion.type === 'ADD_EDGE')
      .map((suggestion: any) => {
        const edgeData = suggestion.data as Record<string, unknown>;
        return {
          id: `suggestion-${suggestion.id}`,
          source: edgeData.sourceNodeId as string,
          target: edgeData.targetNodeId as string,
          label: edgeData.label as string,
          type: 'default',
          data: {
            suggestionId: suggestion.id,
            suggestionData: edgeData,
            reason: suggestion.reason,
          },
          style: {
            stroke: '#7c3aed',
            strokeDasharray: '8 6',
            opacity: 0.8,
            strokeWidth: 2.5,
          },
          markerEnd: getMarkerDefinition('arrowclosed', '#7c3aed'),
          zIndex: 100,
        };
      });
    baseEdges = [...baseEdges, ...newSuggestionEdges];
    return baseEdges;
  }, [rfEdges, rfStagedEdges, structuralSuggestions]);

  const handleNodeClickInternal = useCallback(
    (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode) return;
      const currentConnectingNodeId =
        useConceptMapStore.getState().connectingNodeId;

      if (currentConnectingNodeId) {
        event.stopPropagation();
        event.preventDefault();
        if (node.id === currentConnectingNodeId) {
          storeCancelConnection();
          if (reactFlowWrapperRef.current)
            reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
        } else {
          const newEdgeId = addEdgeToStore({
            source: currentConnectingNodeId,
            target: node.id,
            label: '',
          });
          onNewEdgeSuggestLabels?.(newEdgeId, currentConnectingNodeId, node.id);
          storeCompleteConnectionMode();
          if (reactFlowWrapperRef.current)
            reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
          setSelectedElement(newEdgeId, 'edge');
        }
        return;
      }
    },
    [
      isViewOnlyMode,
      addEdgeToStore,
      setSelectedElement,
      storeCancelConnection,
      storeCompleteConnectionMode,
      onNewEdgeSuggestLabels,
      reactFlowWrapperRef,
    ]
  );

  const handlePaneClickInternal = useCallback(
    (event: React.MouseEvent) => {
      const currentConnectingNodeId =
        useConceptMapStore.getState().connectingNodeId;
      if (currentConnectingNodeId) {
        storeCancelConnection();
        if (reactFlowWrapperRef.current)
          reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
      } else {
        onSelectionChange(null, null);
      }
    },
    [storeCancelConnection, onSelectionChange, reactFlowWrapperRef]
  );

  return (
    <div
      ref={reactFlowWrapperRef}
      className={cn('w-full h-full', {
        'cursor-crosshair': !!connectingNodeId,
      })}
    >
      <InteractiveCanvas
        nodes={combinedNodes}
        edges={combinedEdges}
        onNodesChange={handleRfNodesChange}
        onEdgesChange={handleRfEdgesChange}
        onNodesDelete={handleRfNodesDeleted}
        onEdgesDelete={handleRfEdgesDeleted}
        onSelectionChange={handleRfSelectionChange}
        onConnect={handleRfConnect}
        isViewOnlyMode={isViewOnlyMode}
        onNodeContextMenu={(event, node) => {
          if (isViewOnlyMode) return;
          event.preventDefault();
          onNodeContextMenuRequest?.(event, node);
        }}
        onNodeDrag={onNodeDragInternal}
        onNodeDragStop={onNodeDragStopInternal}
        onNodeClick={handleNodeClickInternal}
        onPaneDoubleClick={handlePaneDoubleClickInternal}
        onPaneContextMenu={handlePaneContextMenuInternal}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onDragLeave={handleCanvasDragLeave}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        activeSnapLines={activeSnapLinesLocal}
        panActivationKeyCode={panActivationKeyCode}
        activeVisualEdgeSuggestion={activeVisualEdgeSuggestion}
        onAcceptVisualEdge={onAcceptVisualEdge}
        onRejectVisualEdge={onRejectVisualEdge}
      />
    </div>
  );
};

const FlowCanvasCoreWrapper: React.FC<FlowCanvasCoreProps> = (props) => (
  <FlowCanvasCoreInternal {...props} />
);

export default React.memo(FlowCanvasCoreWrapper);
