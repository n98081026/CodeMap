"use client";

import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useNodesState, useEdgesState, type Node as RFNode, type Edge as RFEdge, type OnNodesChange, type OnEdgesChange, type OnNodesDelete, type OnEdgesDelete, type SelectionChanges, type Connection, useReactFlow } from 'reactflow';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge, VisualEdgeSuggestion } from '@/types';
import { InteractiveCanvas } from './interactive-canvas';
import type { CustomNodeData } from './custom-node';
import CustomNodeComponent from './custom-node';
import OrthogonalEdge, { type OrthogonalEdgeData, getMarkerDefinition } from './orthogonal-edge';
import SuggestedEdge from './SuggestedEdge';
import SuggestedIntermediateNode from './SuggestedIntermediateNode';
import SuggestedGroupOverlayNode from './SuggestedGroupOverlayNode';
import GhostNodeComponent from './GhostNodeComponent'; // Import GhostNodeComponent
import useConceptMapStore from '@/stores/concept-map-store';
import { getNodePlacement } from '@/lib/layout-utils';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';
import type { ExtractedConceptItem } from '@/ai/flows/extract-concepts'; // Added for onConceptSuggestionDrop

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;
const NODE_DRAG_SNAP_THRESHOLD = SNAP_THRESHOLD;
const NODE_PREVIEW_WIDTH = 150;
const NODE_PREVIEW_HEIGHT = 70;

interface SnapResult {
  snappedPosition: { x: number; y: number };
  activeSnapLines: Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>;
}

function calculateSnappedPositionAndLines(
  targetNodePos: { x: number; y: number },
  targetNodeDims: { width: number; height: number },
  nodesToSnapAgainst: RFNode<CustomNodeData>[],
  gridSize: number,
  snapThreshold: number,
  excludeId?: string
): SnapResult {
  let currentDragSnapLines: SnapResult['activeSnapLines'] = [];
  let snappedXPosition = targetNodePos.x;
  let snappedYPosition = targetNodePos.y;
  let xSnappedByNode = false;
  let ySnappedByNode = false;

  const targetNodeWidth = targetNodeDims.width;
  const targetNodeHeight = targetNodeDims.height;

  const effectiveNodesToSnapAgainst = excludeId
    ? nodesToSnapAgainst.filter(n => n.id !== excludeId)
    : nodesToSnapAgainst;

  const draggedTargetsX = [
    { type: 'left', value: targetNodePos.x },
    { type: 'center', value: targetNodePos.x + targetNodeWidth / 2 },
    { type: 'right', value: targetNodePos.x + targetNodeWidth },
  ];
  const draggedTargetsY = [
    { type: 'top', value: targetNodePos.y },
    { type: 'center', value: targetNodePos.y + targetNodeHeight / 2 },
    { type: 'bottom', value: targetNodePos.y + targetNodeHeight },
  ];

  let minDeltaX = Infinity; let bestSnapXInfo: { position: number, line: SnapResult['activeSnapLines'][0] } | null = null;
  let minDeltaY = Infinity; let bestSnapYInfo: { position: number, line: SnapResult['activeSnapLines'][0] } | null = null;

  effectiveNodesToSnapAgainst.forEach(otherNode => {
    if (!otherNode.width || !otherNode.height || !otherNode.positionAbsolute) return;

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
            position: otX.value - (dtX.value - targetNodePos.x),
            line: {
              type: 'vertical',
              x1: otX.value, y1: Math.min(targetNodePos.y, otherNodePosition.y) - 20,
              x2: otX.value, y2: Math.max(targetNodePos.y + targetNodeHeight, otherNodePosition.y + otherHeight) + 20,
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
            position: otY.value - (dtY.value - targetNodePos.y),
            line: {
              type: 'horizontal',
              x1: Math.min(targetNodePos.x, otherNodePosition.x) - 20, y1: otY.value,
              x2: Math.max(targetNodePos.x + targetNodeWidth, otherNodePosition.x + otherWidth) + 20, y2: otY.value,
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
    const gridSnappedX = Math.round(targetNodePos.x / gridSize) * gridSize;
    if (Math.abs(targetNodePos.x - gridSnappedX) < snapThreshold) {
      snappedXPosition = gridSnappedX;
    }
  }
  if (!ySnappedByNode) {
    const gridSnappedY = Math.round(targetNodePos.y / gridSize) * gridSize;
    if (Math.abs(targetNodePos.y - gridSnappedY) < snapThreshold) {
      snappedYPosition = gridSnappedY;
    }
  }

  return { snappedPosition: { x: snappedXPosition, y: snappedYPosition }, activeSnapLines: currentDragSnapLines };
}


interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
  onNodesChangeInStore: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => string; // Ensure it returns string
  onNodeContextMenuRequest?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void;
  onNodeAIExpandTriggered?: (nodeId: string) => void;
  onPaneContextMenuRequest?: (event: React.MouseEvent, positionInFlow: {x: number, y: number}) => void;
  onStagedElementsSelectionChange?: (selectedIds: string[]) => void;
  onNewEdgeSuggestLabels?: (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => Promise<void>;
  onGhostNodeAcceptRequest?: (ghostNodeId: string) => void;
  onConceptSuggestionDrop?: (conceptItem: ExtractedConceptItem, position: { x: number; y: number }) => void;
  onNodeStartConnectionRequest?: (nodeId: string) => void;
  onRefinePreviewNodeRequested?: (nodeId: string, currentText: string, currentDetails?: string) => void;
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
  onGhostNodeAcceptRequest,
  onConceptSuggestionDrop,
  onNodeStartConnectionRequest,
  onRefinePreviewNodeRequested,
  panActivationKeyCode,
  activeVisualEdgeSuggestion,
  onAcceptVisualEdge,
  onRejectVisualEdge,
}) => {
  useConceptMapStore.getState().addDebugLog(`[FlowCanvasCoreInternal Render] mapDataFromStore.nodes count: ${mapDataFromStore.nodes?.length ?? 'N/A'}`);
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
    pendingRelationForEdgeCreation,
    setPendingRelationForEdgeCreation,
    clearPendingRelationForEdgeCreation,
    addEdge: addEdgeToStore,
    triggerFitView,
    setTriggerFitView,
    structuralSuggestions,
    structuralGroupSuggestions,
  } = useConceptMapStore(
    useCallback(s => ({
        addNode: s.addNode,
        setSelectedElement: s.setSelectedElement,
        setEditingNodeId: s.setEditingNodeId,
        connectingNodeId: s.connectingNodeId,
        completeConnectionMode: s.completeConnectionMode,
        cancelConnection: s.cancelConnection,
        dragPreviewItem: s.dragPreviewItem,
        dragPreviewPosition: s.dragPreviewPosition,
        updateDragPreviewPosition: s.updateDragPreviewPosition,
        draggedRelationLabel: s.draggedRelationLabel,
        pendingRelationForEdgeCreation: s.pendingRelationForEdgeCreation,
        setPendingRelationForEdgeCreation: s.setPendingRelationForEdgeCreation,
        clearPendingRelationForEdgeCreation: s.clearPendingRelationForEdgeCreation,
        addEdge: s.addEdge,
        triggerFitView: s.triggerFitView,
        setTriggerFitView: s.setTriggerFitView,
        structuralSuggestions: s.structuralSuggestions || [],
        structuralGroupSuggestions: s.structuralGroupSuggestions || [],
    }), [])
  );
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<Array<{ type: 'vertical' | 'horizontal'; x1: number; y1: number; x2: number; y2: number; }>>([]);
  const [dragPreviewData, setDragPreviewData] = useState<{ x: number; y: number; text: string; width: number; height: number } | null>(null);

  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState<CustomNodeData>([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState<OrthogonalEdgeData>([]);
  const { stagedMapData, isStagingActive, conceptExpansionPreview } = useConceptMapStore(
    useCallback(s => ({
      stagedMapData: s.stagedMapData,
      isStagingActive: s.isStagingActive,
      conceptExpansionPreview: s.conceptExpansionPreview,
      ghostPreviewData: s.ghostPreviewData, // Existing
      focusViewOnNodeIds: s.focusViewOnNodeIds,
      triggerFocusView: s.triggerFocusView,
      clearFocusViewTrigger: s.clearFocusViewTrigger,
    }), [])
  );
  // Destructure new state and actions
  const { focusViewOnNodeIds, triggerFocusView: triggerFocusViewFromStore, clearFocusViewTrigger, ghostPreviewData } = useConceptMapStore(
    useCallback(s => ({
      focusViewOnNodeIds: s.focusViewOnNodeIds,
      triggerFocusView: s.triggerFocusView,
      clearFocusViewTrigger: s.clearFocusViewTrigger,
      ghostPreviewData: s.ghostPreviewData, // Also ensure ghostPreviewData is correctly destructured if used below
    }), [])
  );

  const [rfStagedNodes, setRfStagedNodes, onStagedNodesChange] = useNodesState<CustomNodeData>([]);
  const [rfStagedEdges, setRfStagedEdges, onStagedEdgesChange] = useEdgesState<OrthogonalEdgeData>([]);
  const [rfPreviewNodes, setRfPreviewNodes, onPreviewNodesChange] = useNodesState<CustomNodeData>([]);
  const [rfPreviewEdges, setRfPreviewEdges, onPreviewEdgesChange] = useEdgesState<OrthogonalEdgeData>([]);

  const edgeTypes = useMemo(() => ({
    orthogonal: OrthogonalEdge,
    'suggested-edge': SuggestedEdge,
  }), []);

  const nodeTypes = useMemo(() => ({
    customConceptNode: CustomNodeComponent,
    'suggested-intermediate-node': SuggestedIntermediateNode,
    'suggested-group-overlay-node': SuggestedGroupOverlayNode,
    ghostNode: GhostNodeComponent, // Add ghostNode type
    dragPreviewNode: CustomNodeComponent,
    dragPreviewLabel: ({ data }: { data: { label: string } }) => <div style={{ padding: 5, background: '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>{data.label}</div>,
  }), []);

  useEffect(() => {
    const newRfNodes = (mapDataFromStore.nodes || []).map(appNode => ({
      id: appNode.id,
      type: 'customConceptNode',
      data: {
        label: appNode.text, details: appNode.details, type: appNode.type || 'default',
        isViewOnly: isViewOnlyMode, backgroundColor: appNode.backgroundColor, shape: appNode.shape,
        width: appNode.width, height: appNode.height,
        onTriggerAIExpand: onNodeAIExpandTriggered, onStartConnectionRequest: onNodeStartConnectionRequest,
      } as CustomNodeData,
      position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
      draggable: !isViewOnlyMode, selectable: true, connectable: !isViewOnlyMode,
      dragHandle: '.node-move-handle', parentNode: appNode.parentNode, expandParent: !!appNode.parentNode,
    }));
    setRfNodes(newRfNodes);
  }, [mapDataFromStore.nodes, isViewOnlyMode, onNodeAIExpandTriggered, onNodeStartConnectionRequest, setRfNodes]);

  useEffect(() => {
    const newRfEdges = (mapDataFromStore.edges || []).map(appEdge => ({
      id: appEdge.id, source: appEdge.source, target: appEdge.target,
      sourceHandle: appEdge.sourceHandle || null, targetHandle: appEdge.targetHandle || null,
      label: appEdge.label, type: 'orthogonal',
      data: { label: appEdge.label, color: appEdge.color, lineType: appEdge.lineType } as OrthogonalEdgeData,
      markerStart: getMarkerDefinition(appEdge.markerStart, appEdge.color),
      markerEnd: getMarkerDefinition(appEdge.markerEnd, appEdge.color),
      style: { strokeWidth: 2 }, updatable: !isViewOnlyMode, deletable: !isViewOnlyMode, selectable: true,
    }));
    setRfEdges(newRfEdges);
  }, [mapDataFromStore.edges, isViewOnlyMode, setRfEdges]);

  useEffect(() => {
    if (isStagingActive && stagedMapData) {
      const newRfStagedNodes = stagedMapData.nodes.map(appNode => ({
        id: appNode.id, type: 'customConceptNode',
        data: { label: appNode.text, details: appNode.details, type: appNode.type || 'default', isViewOnly: true, backgroundColor: appNode.backgroundColor, shape: appNode.shape, width: appNode.width, height: appNode.height, isStaged: true, } as CustomNodeData,
        position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
        draggable: false, selectable: true, connectable: false, dragHandle: '.cursor-move',
      }));
      setRfStagedNodes(newRfStagedNodes);
      const newRfStagedEdges = (stagedMapData.edges || []).map(appEdge => ({
        id: appEdge.id, source: appEdge.source, target: appEdge.target, label: appEdge.label, type: 'orthogonal',
        data: { label: appEdge.label, color: appEdge.color, lineType: appEdge.lineType, } as OrthogonalEdgeData,
        style: { strokeDasharray: '5,5', opacity: 0.7, strokeWidth: 2, stroke: appEdge.color || 'grey' },
        updatable: false, selectable: true,
      }));
      setRfStagedEdges(newRfStagedEdges);
    } else {
      setRfStagedNodes([]); setRfStagedEdges([]);
    }
  }, [isStagingActive, stagedMapData, setRfStagedNodes, setRfStagedEdges]);

  useEffect(() => {
    if (conceptExpansionPreview && conceptExpansionPreview.previewNodes.length > 0) {
      const parentNode = mapDataFromStore.nodes.find(n => n.id === conceptExpansionPreview.parentNodeId);
      if (!parentNode) { setRfPreviewNodes([]); setRfPreviewEdges([]); return; }
      const newRfPreviewNodes = conceptExpansionPreview.previewNodes.map((previewNode, index) => {
        const position = getNodePlacement(
          [...mapDataFromStore.nodes, ...newRfPreviewNodes.slice(0,index)], 'child',
          parentNode, null, GRID_SIZE, index, conceptExpansionPreview.previewNodes.length
        );
        return {
          id: previewNode.id, type: 'customConceptNode',
          data: { label: previewNode.text, details: previewNode.details, type: 'ai-expanded-ghost', isViewOnly: true, isGhost: true, width: 150, height: 70, onRefineGhostNode: onRefinePreviewNodeRequested, } as CustomNodeData,
          position: position, draggable: false, selectable: true, connectable: false,
        };
      });
      setRfPreviewNodes(newRfPreviewNodes);
      const newRfPreviewEdges = newRfPreviewNodes.map(rfPreviewNode => ({
        id: `preview-edge-${conceptExpansionPreview.parentNodeId}-${rfPreviewNode.id}`,
        source: conceptExpansionPreview.parentNodeId, target: rfPreviewNode.id,
        label: conceptExpansionPreview.previewNodes.find(pn => pn.id === rfPreviewNode.id)?.relationLabel || 'suggests',
        type: 'orthogonal', style: { strokeDasharray: '4,4', opacity: 0.6, strokeWidth: 1.5, stroke: '#8A2BE2' },
        updatable: false, selectable: true,
      }));
      setRfPreviewEdges(newRfPreviewEdges);
    } else {
      setRfPreviewNodes([]); setRfPreviewEdges([]);
    }
  }, [conceptExpansionPreview, mapDataFromStore.nodes, setRfPreviewNodes, setRfPreviewEdges, onRefinePreviewNodeRequested]);

  useEffect(() => {
    if (activeVisualEdgeSuggestion) {
      const tempEdgeId = `suggested-edge-${activeVisualEdgeSuggestion.id}`;
      const tempEdge: RFEdge = {
        id: tempEdgeId, source: activeVisualEdgeSuggestion.sourceNodeId, target: activeVisualEdgeSuggestion.targetNodeId,
        label: activeVisualEdgeSuggestion.label, type: 'orthogonal',
        style: { stroke: 'hsl(var(--primary)/0.7)', strokeDasharray: '8,6', strokeWidth: 2.5, opacity: 0.75, },
        animated: true, deletable: false, selectable: false, zIndex: 900,
      };
      setRfEdges(prevEdges => [...prevEdges.filter(edge => !edge.id.startsWith('suggested-edge-')), tempEdge]);
    } else {
      setRfEdges(prevEdges => prevEdges.filter(edge => !edge.id.startsWith('suggested-edge-')));
    }
  }, [activeVisualEdgeSuggestion, setRfEdges]);
  
  useEffect(() => {
    if (rfNodes.length > 0 && reactFlowInstance && typeof reactFlowInstance.fitView === 'function') {
      const timerId = setTimeout(() => { reactFlowInstance.fitView({ duration: 300, padding: 0.2 }); }, 100);
      return () => clearTimeout(timerId);
    }
  }, [rfNodes, reactFlowInstance]);

  useEffect(() => {
    if (triggerFitView && reactFlowInstance && typeof reactFlowInstance.fitView === 'function') {
      reactFlowInstance.fitView({ duration: 300, padding: 0.2 });
      setTriggerFitView(false);
    }
  }, [triggerFitView, reactFlowInstance, setTriggerFitView]);

  // Effect to handle focusing on specific nodes
  useEffect(() => {
    if (triggerFocusViewFromStore && reactFlowInstance) {
      if (focusViewOnNodeIds && focusViewOnNodeIds.length > 0) {
        reactFlowInstance.fitView({ nodes: focusViewOnNodeIds.map(id => ({ id })), duration: 600, padding: 0.2 });
        useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] fitView called for nodes: ${focusViewOnNodeIds.join(', ')}`);
      } else {
        // Fallback to general fitView if no specific nodes, though setFocusOnNodes should provide IDs
        reactFlowInstance.fitView({ duration: 600, padding: 0.2 });
        useConceptMapStore.getState().addDebugLog(`[FlowCanvasCore] fitView called (general).`);
      }
      clearFocusViewTrigger(); // Reset the trigger
    }
  }, [triggerFocusViewFromStore, focusViewOnNodeIds, reactFlowInstance, clearFocusViewTrigger]);

  useEffect(() => {
    const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId; // Read directly for effect dependency
    if (!currentConnectingNodeId && !pendingRelationForEdgeCreation) {
        if (reactFlowWrapperRef.current) {
            reactFlowWrapperRef.current.classList.remove('cursor-crosshair', 'relation-linking-active');
        }
        return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (pendingRelationForEdgeCreation) clearPendingRelationForEdgeCreation();
        if (currentConnectingNodeId) storeCancelConnection(); // Use store's cancel
        if (reactFlowWrapperRef.current) {
            reactFlowWrapperRef.current.classList.remove('cursor-crosshair', 'relation-linking-active');
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [connectingNodeId, pendingRelationForEdgeCreation, storeCancelConnection, clearPendingRelationForEdgeCreation, reactFlowWrapperRef]);

  useEffect(() => {
    if (!reactFlowInstance || !reactFlowWrapperRef.current) return;
    const paneElement = reactFlowWrapperRef.current.querySelector('.react-flow__pane') as HTMLElement | null;
    if (paneElement) {
      if (connectingNodeId) paneElement.style.cursor = 'crosshair';
      else if (pendingRelationForEdgeCreation) paneElement.style.cursor = 'alias'; // Or another cursor for relation linking
      else paneElement.style.cursor = 'default';
    }
    return () => { if (paneElement) paneElement.style.cursor = 'default'; };
  }, [connectingNodeId, pendingRelationForEdgeCreation, reactFlowInstance, reactFlowWrapperRef]);

  const onNodeDragInternal = useCallback((_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>, allNodes: RFNode<CustomNodeData>[]) => {
    if (isViewOnlyMode || !draggedNode.dragging || !draggedNode.width || !draggedNode.height || !draggedNode.positionAbsolute) {
      setActiveSnapLinesLocal([]); return;
    }
    const { snappedPosition, activeSnapLines } = calculateSnappedPositionAndLines(
      draggedNode.positionAbsolute, { width: draggedNode.width, height: draggedNode.height },
      allNodes, GRID_SIZE, NODE_DRAG_SNAP_THRESHOLD, draggedNode.id
    );
    if (draggedNode.positionAbsolute.x !== snappedPosition.x || draggedNode.positionAbsolute.y !== snappedPosition.y) {
      onNodesChangeReactFlow([{ id: draggedNode.id, type: 'position', position: snappedPosition, dragging: true }]);
    }
    setActiveSnapLinesLocal(activeSnapLines);
  }, [isViewOnlyMode, onNodesChangeReactFlow]);

  const onNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLinesLocal([]);
      let finalX = Math.round(draggedNode.positionAbsolute.x / GRID_SIZE) * GRID_SIZE;
      let finalY = Math.round(draggedNode.positionAbsolute.y / GRID_SIZE) * GRID_SIZE;
      onNodesChangeInStore(draggedNode.id, { x: finalX, y: finalY, width: draggedNode.width, height: draggedNode.height });
    }, [isViewOnlyMode, onNodesChangeInStore]
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
    const newEdgeId = onConnectInStore({
      source: params.source!, target: params.target!,
      sourceHandle: params.sourceHandle, targetHandle: params.targetHandle,
      label: "connects",
    });
    if (typeof newEdgeId === 'string' && params.source && params.target) {
      onNewEdgeSuggestLabels?.(newEdgeId, params.source, params.target, "");
    }
  }, [isViewOnlyMode, onConnectInStore, onNewEdgeSuggestLabels]);

  const handleNodeRelationDrop = useCallback((event: React.DragEvent, targetNode: RFNode) => {
    if (isViewOnlyMode || !reactFlowWrapperRef.current) return;
    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;
    try {
      const droppedData = JSON.parse(dataString);
      if (droppedData.type === 'relation-suggestion' && typeof droppedData.label === 'string') {
        setPendingRelationForEdgeCreation({
          label: droppedData.label, sourceNodeId: targetNode.id, sourceNodeHandle: null,
        });
        toast({ title: "Place Relation", description: `Drag from "${targetNode.data.label}" to target node to create '${droppedData.label}' relation. ESC to cancel.`, duration: 7000});
        reactFlowWrapperRef.current.classList.add('relation-linking-active');
        storeCancelConnection();
      }
    } catch (e) { console.error("Failed to parse dropped relation data", e); }
  }, [isViewOnlyMode, setPendingRelationForEdgeCreation, toast, storeCancelConnection, reactFlowWrapperRef]);

  const handleRfSelectionChange = useCallback((selection: SelectionChanges) => {
    const selectedRfNodes = selection.nodes;
    const selectedRfEdges = selection.edges;
    const currentStagedNodeIds = new Set(rfStagedNodes.map(n => n.id));
    const currentStagedEdgeIds = new Set(rfStagedEdges.map(e => e.id));
    const newlySelectedStagedNodeIds = selectedRfNodes.filter(n => currentStagedNodeIds.has(n.id)).map(n => n.id);
    const newlySelectedStagedEdgeIds = selectedRfEdges.filter(e => currentStagedEdgeIds.has(e.id)).map(e => e.id);
    onStagedElementsSelectionChange?.([...newlySelectedStagedNodeIds, ...newlySelectedStagedEdgeIds]);
    const mainSelectedNodes = selectedRfNodes.filter(n => !currentStagedNodeIds.has(n.id));
    const mainSelectedEdges = selectedRfEdges.filter(e => !currentStagedEdgeIds.has(e.id));
    if (mainSelectedNodes.length === 1 && mainSelectedEdges.length === 0) {
      onSelectionChange(mainSelectedNodes[0].id, 'node');
    } else if (mainSelectedEdges.length === 1 && mainSelectedNodes.length === 0) {
      onSelectionChange(mainSelectedEdges[0].id, 'edge');
    } else if (mainSelectedNodes.length === 0 && mainSelectedEdges.length === 0 && (newlySelectedStagedNodeIds.length > 0 || newlySelectedStagedEdgeIds.length > 0)) {
      onSelectionChange(null, null);
    } else if (mainSelectedNodes.length === 0 && mainSelectedEdges.length === 0) {
      onSelectionChange(null, null);
    }
    onMultiNodeSelectionChange?.(mainSelectedNodes.map(node => node.id));
  }, [onSelectionChange, onMultiNodeSelectionChange, onStagedElementsSelectionChange, rfStagedNodes, rfStagedEdges]);

  const handlePaneDoubleClickInternal = useCallback((event: React.MouseEvent) => {
    if (isViewOnlyMode || !reactFlowInstance) return;
    const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
    const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;
    const newNodeId = addNodeToStore({
      text: `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`, type: 'manual-node',
      position: {x: snappedX, y: snappedY}, details: '',
    });
    setSelectedElement(newNodeId, 'node'); setEditingNodeId(newNodeId);
  }, [isViewOnlyMode, addNodeToStore, reactFlowInstance, setSelectedElement, setEditingNodeId]);

  const handlePaneContextMenuInternal = useCallback((event: React.MouseEvent) => {
    if (isViewOnlyMode || !reactFlowInstance) return;
    event.preventDefault();
    const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
    onPaneContextMenuRequest?.(event, positionInFlow);
  }, [isViewOnlyMode, reactFlowInstance, onPaneContextMenuRequest]);

  const handleCanvasDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
    if (dragPreviewItem && reactFlowInstance) {
      const flowPosition = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const validRfNodesForSnapping = rfNodes.filter(n => n.width && n.height && n.positionAbsolute);
      const { snappedPosition, activeSnapLines } = calculateSnappedPositionAndLines(
        flowPosition, { width: NODE_PREVIEW_WIDTH, height: NODE_PREVIEW_HEIGHT },
        validRfNodesForSnapping, GRID_SIZE, SNAP_THRESHOLD
      );
      updateDragPreviewPosition(snappedPosition); setActiveSnapLinesLocal(activeSnapLines);
      setDragPreviewData({ ...snappedPosition, text: dragPreviewItem.text, width: NODE_PREVIEW_WIDTH, height: NODE_PREVIEW_HEIGHT });
    }
  }, [dragPreviewItem, reactFlowInstance, updateDragPreviewPosition, rfNodes]);

  const handleCanvasDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setDragPreviewData(null); setActiveSnapLinesLocal([]);
    if (isViewOnlyMode || !reactFlowInstance) return;
    const dataString = event.dataTransfer.getData('application/json');
    if (!dataString) return;
    try {
      const droppedData = JSON.parse(dataString);
      const positionInFlow = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });
      if (droppedData.type === 'concept-suggestion' && typeof droppedData.text === 'string') {
        const snappedX = Math.round(positionInFlow.x / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(positionInFlow.y / GRID_SIZE) * GRID_SIZE;
        onConceptSuggestionDrop?.(droppedData, { x: snappedX, y: snappedY }); // Pass full ExtractedConceptItem
      }
    } catch (e) { console.error("Failed to parse dropped data in FlowCanvasCore:", e); }
  }, [isViewOnlyMode, reactFlowInstance, onConceptSuggestionDrop]);

  const handleCanvasDragLeave = useCallback((event: React.DragEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setDragPreviewData(null); setActiveSnapLinesLocal([]);
    }
  }, []);

  useEffect(() => {
    const handleGlobalDragEnd = () => { setDragPreviewData(null); setActiveSnapLinesLocal([]); };
    document.addEventListener('dragend', handleGlobalDragEnd);
    return () => { document.removeEventListener('dragend', handleGlobalDragEnd); };
  }, []);

  const combinedNodes = useMemo(() => {
    const ghostNodeIds = new Set(ghostPreviewData?.nodes.map(n => n.id) || []);

    // Update rfNodes to include isDimmed if they have a ghost preview
    const updatedRfNodes = rfNodes.map(node => {
      if (ghostNodeIds.has(node.id)) {
        return {
          ...node,
          data: {
            ...node.data,
            isDimmed: true,
          },
        };
      }
      return node;
    });

    let baseNodes = [...updatedRfNodes, ...rfStagedNodes, ...rfPreviewNodes];
    const currentMapNodesForSuggestions = mapDataFromStore.nodes;

    // Add Ghost Nodes if ghostPreviewData exists
    if (ghostPreviewData) {
      const ghostNodesToAdd = ghostPreviewData.nodes.map(ghostNodeInfo => ({
        id: `ghost-${ghostNodeInfo.id}`, // Ensure unique ID for ghost version
        type: 'ghostNode',
        position: { x: ghostNodeInfo.x, y: ghostNodeInfo.y },
        data: {
          id: ghostNodeInfo.id, // Pass original ID for reference
          width: ghostNodeInfo.width,
          height: ghostNodeInfo.height,
          label: currentMapNodesForSuggestions.find(n => n.id === ghostNodeInfo.id)?.text || '', // Optional: pass label
        },
        draggable: false,
        selectable: false, // Ghosts are typically not selectable
        connectable: false,
        zIndex: 200, // Ensure ghosts are rendered above dimmed originals if needed
      }));
      baseNodes = [...baseNodes, ...ghostNodesToAdd];
    }

    const suggestionNodes = (structuralSuggestions || []).flatMap(suggestion => {
      if (suggestion.type === 'NEW_INTERMEDIATE_NODE') {
        const { sourceNodeId, targetNodeId } = suggestion.data;
        const sourceNode = currentMapNodesForSuggestions.find(n => n.id === sourceNodeId);
        const targetNode = currentMapNodesForSuggestions.find(n => n.id === targetNodeId);
        let position = { x: 100, y: 100 };
        if (sourceNode && targetNode && sourceNode.x != null && sourceNode.y != null && targetNode.x != null && targetNode.y != null) {
          position = { x: (sourceNode.x + targetNode.x) / 2 - 75, y: (sourceNode.y + targetNode.y) / 2 - 35, };
        } else if (sourceNode && sourceNode.x != null && sourceNode.y != null) {
          position = { x: sourceNode.x + (sourceNode.width || 150) + 50, y: sourceNode.y };
        }
        return [{ id: `suggestion-${suggestion.id}`, type: 'suggested-intermediate-node', position: position, data: { suggestionId: suggestion.id, suggestionData: suggestion.data, reason: suggestion.reason, }, selectable: true, draggable: false, zIndex: 100, }];
      }
      return [];
    });
    baseNodes = [...baseNodes, ...suggestionNodes];

    const groupOverlayNodes = (structuralGroupSuggestions || []).map(suggestion => {
        const { nodeIdsToGroup } = suggestion.data;
        const groupNodes = currentMapNodesForSuggestions.filter(n => nodeIdsToGroup.includes(n.id) && n.x != null && n.y != null && n.width != null && n.height != null);
        if (groupNodes.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        groupNodes.forEach(n => {
          minX = Math.min(minX, n.x!); minY = Math.min(minY, n.y!);
          maxX = Math.max(maxX, n.x! + n.width!); maxY = Math.max(maxY, n.y! + n.height!);
        });
        const PADDING = 30;
        const position = { x: minX - PADDING, y: minY - PADDING };
        const width = maxX - minX + 2 * PADDING;
        const height = maxY - minY + 2 * PADDING;
        return {
          id: `suggestion-${suggestion.id}`, type: 'suggested-group-overlay-node', position: position,
          data: { suggestionId: suggestion.id, suggestionData: suggestion.data, reason: suggestion.reason, width: width, height: height, },
          width: width, height: height, selectable: true, draggable: false, zIndex: 50,
        };
    }).filter(Boolean);

    baseNodes = [...baseNodes, ...groupOverlayNodes as RFNode<CustomNodeData>[]];


    if (dragPreviewData) {
      baseNodes.push({
        id: 'drag-preview-node', type: 'customConceptNode',
        data: { label: dragPreviewData.text, isViewOnly: true, isGhost: true, shape: 'rectangle', width: dragPreviewData.width, height: dragPreviewData.height, } as CustomNodeData,
        position: { x: dragPreviewData.x, y: dragPreviewData.y },
        draggable: false, selectable: false, connectable: false, zIndex: 10000,
      });
    } else if (draggedRelationLabel && dragPreviewPosition) {
      baseNodes.push({
        id: 'drag-preview-relation-label', type: 'dragPreviewLabel',
        position: dragPreviewPosition, data: { label: draggedRelationLabel },
        draggable: false, selectable: false,
      });
    }
    return baseNodes;
  }, [rfNodes, rfStagedNodes, rfPreviewNodes, dragPreviewData, draggedRelationLabel, dragPreviewPosition, structuralSuggestions, structuralGroupSuggestions, mapDataFromStore.nodes, ghostPreviewData]);

  const combinedEdges = useMemo(() => {
    let baseEdges = [...rfEdges, ...rfStagedEdges, ...rfPreviewEdges];
    const newSuggestionEdges = (structuralSuggestions || [])
      .filter(suggestion => suggestion.type === 'ADD_EDGE')
      .map(suggestion => {
        const edgeData = suggestion.data as any;
        return {
          id: `suggestion-${suggestion.id}`, source: edgeData.sourceNodeId, target: edgeData.targetNodeId,
          label: edgeData.label, type: 'suggested-edge',
          data: { suggestionId: suggestion.id, suggestionData: edgeData, reason: suggestion.reason, },
          style: { stroke: '#7c3aed', strokeDasharray: '8 6', opacity: 0.8, strokeWidth: 2.5 },
          markerEnd: getMarkerDefinition('arrowclosed', '#7c3aed'),
          selectable: true, zIndex: 100,
        };
      });
    baseEdges = [...baseEdges, ...newSuggestionEdges];
    return baseEdges;
  }, [rfEdges, rfStagedEdges, rfPreviewEdges, structuralSuggestions]);

  const handleNodeClickInternal = useCallback((event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
    if (isViewOnlyMode) return;
    const currentPendingRelation = useConceptMapStore.getState().pendingRelationForEdgeCreation;
    const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId;

    if (currentPendingRelation) {
      event.stopPropagation(); event.preventDefault();
      if (node.id === currentPendingRelation.sourceNodeId) {
        clearPendingRelationForEdgeCreation();
        if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('relation-linking-active');
      } else {
        const newEdgeId = addEdgeToStore({
          source: currentPendingRelation.sourceNodeId, target: node.id,
          sourceHandle: currentPendingRelation.sourceNodeHandle, label: currentPendingRelation.label, type: 'default',
        });
        clearPendingRelationForEdgeCreation();
        if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('relation-linking-active');
        setSelectedElement(newEdgeId, 'edge');
      }
      return;
    }

    if (currentConnectingNodeId) {
      event.stopPropagation(); event.preventDefault();
      if (node.id === currentConnectingNodeId) {
        storeCancelConnection();
        if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
      } else {
        const newEdgeId = addEdgeToStore({ source: currentConnectingNodeId, target: node.id, label: '', type: 'default' });
        onNewEdgeSuggestLabels?.(newEdgeId, currentConnectingNodeId, node.id);
        storeCompleteConnectionMode(); // Use store's complete
        if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
        setSelectedElement(newEdgeId, 'edge');
      }
      return;
    }
    if (node.data?.isGhost) onGhostNodeAcceptRequest?.(node.id);
  }, [ isViewOnlyMode, addEdgeToStore, setSelectedElement, storeCancelConnection, storeCompleteConnectionMode, onNewEdgeSuggestLabels, onGhostNodeAcceptRequest, clearPendingRelationForEdgeCreation, reactFlowWrapperRef ]);

  const handlePaneClickInternal = useCallback((event: React.MouseEvent) => {
    const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId;
    const currentPendingRelation = useConceptMapStore.getState().pendingRelationForEdgeCreation;
    if (currentConnectingNodeId) {
      storeCancelConnection();
      if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
    } else if (currentPendingRelation) {
      clearPendingRelationForEdgeCreation();
      if (reactFlowWrapperRef.current) reactFlowWrapperRef.current.classList.remove('relation-linking-active');
    } else {
      onSelectionChange(null, null);
    }
  }, [storeCancelConnection, clearPendingRelationForEdgeCreation, onSelectionChange, reactFlowWrapperRef]);

  return (
    <div ref={reactFlowWrapperRef} className={cn('w-full h-full',
        { 'cursor-crosshair': !!connectingNodeId,
          'relation-linking-active': !!pendingRelationForEdgeCreation && !connectingNodeId }
      )}>
      <InteractiveCanvas
        nodes={combinedNodes} edges={combinedEdges}
        onNodesChange={handleRfNodesChange} onEdgesChange={handleRfEdgesChange}
        onNodesDelete={handleRfNodesDeleted} onEdgesDelete={handleRfEdgesDeleted}
        onSelectionChange={handleRfSelectionChange} onConnect={handleRfConnect}
        isViewOnlyMode={isViewOnlyMode}
        onNodeContextMenu={(event, node) => { if (isViewOnlyMode) return; event.preventDefault(); onNodeContextMenuRequest?.(event, node); }}
        onNodeDrag={onNodeDragInternal} onNodeDragStop={onNodeDragStopInternal}
        onNodeClick={handleNodeClickInternal}
        onPaneClick={handlePaneClickInternal}
        onPaneDoubleClick={handlePaneDoubleClickInternal} onPaneContextMenu={handlePaneContextMenuInternal}
        onNodeDrop={handleNodeRelationDrop}
        onDragOver={handleCanvasDragOver} onDrop={handleCanvasDrop} onDragLeave={handleCanvasDragLeave}
        nodeTypes={nodeTypes} edgeTypes={edgeTypes}
        activeSnapLines={activeSnapLinesLocal}
        panActivationKeyCode={panActivationKeyCode}
        activeVisualEdgeSuggestion={activeVisualEdgeSuggestion}
        onAcceptVisualEdge={onAcceptVisualEdge} onRejectVisualEdge={onRejectVisualEdge}
      />
    </div>
  );
};

const FlowCanvasCoreWrapper: React.FC<FlowCanvasCoreProps> = (props) => (
    <FlowCanvasCoreInternal {...props} />
);

export default React.memo(FlowCanvasCoreWrapper);
