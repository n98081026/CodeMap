import { useCallback } from 'react';
import type { 
  OnNodesChange, 
  OnEdgesChange, 
  OnNodesDelete, 
  OnEdgesDelete, 
  Connection,
  NodeSelectionChange,
  Node as RFNode 
} from 'reactflow';
import { useConceptMapStore } from '@/stores/concept-map-store';
import { calculateSnappedPositionAndLines } from '@/lib/layout-utils';
import type { CustomNodeData } from '@/components/concept-map/custom-node';

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;

interface UseFlowCanvasEventHandlersProps {
  isViewOnlyMode?: boolean;
  onNodesChangeReactFlow: (changes: any[]) => void;
  onEdgesChangeReactFlow: (changes: any[]) => void;
  onNodesChangeInStore: (nodeId: string, updates: any) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeId: string) => void;
  onConnectInStore: (options: any) => string | undefined;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
  onNewEdgeSuggestLabels?: (edgeId: string, sourceNodeId: string, targetNodeId: string, existingLabel?: string) => Promise<void>;
  setActiveSnapLinesLocal: (lines: any[]) => void;
  reactFlowWrapperRef: React.RefObject<HTMLDivElement>;
  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  addEdgeToStore: (options: any) => string;
  storeCancelConnection: () => void;
  storeCompleteConnectionMode: () => void;
  onNodeContextMenuRequest?: (event: React.MouseEvent, node: RFNode<CustomNodeData>) => void;
  onPaneContextMenuRequest?: (event: React.MouseEvent, positionInFlow: { x: number; y: number }) => void;
  onConceptSuggestionDrop?: (conceptItem: any, position: { x: number; y: number }) => void;
}

export const useFlowCanvasEventHandlers = ({
  isViewOnlyMode,
  onNodesChangeReactFlow,
  onEdgesChangeReactFlow,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onSelectionChange,
  onMultiNodeSelectionChange,
  onNewEdgeSuggestLabels,
  setActiveSnapLinesLocal,
  reactFlowWrapperRef,
  setSelectedElement,
  addEdgeToStore,
  storeCancelConnection,
  storeCompleteConnectionMode,
  onNodeContextMenuRequest,
  onPaneContextMenuRequest,
  onConceptSuggestionDrop,
}: UseFlowCanvasEventHandlersProps) => {

  // Node drag handlers
  const onNodeDragInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;

      const { snappedPosition, activeSnapLines } = calculateSnappedPositionAndLines(
        draggedNode.positionAbsolute,
        [],
        SNAP_THRESHOLD
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
    [isViewOnlyMode, onNodesChangeReactFlow, setActiveSnapLinesLocal]
  );

  const onNodeDragStopInternal = useCallback(
    (_event: React.MouseEvent, draggedNode: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode || !draggedNode.positionAbsolute) return;
      setActiveSnapLinesLocal([]);
      const finalX = Math.round(draggedNode.positionAbsolute.x / GRID_SIZE) * GRID_SIZE;
      const finalY = Math.round(draggedNode.positionAbsolute.y / GRID_SIZE) * GRID_SIZE;
      onNodesChangeInStore(draggedNode.id, {
        x: finalX,
        y: finalY,
        width: draggedNode.width || undefined,
        height: draggedNode.height || undefined,
      });
    },
    [isViewOnlyMode, onNodesChangeInStore, setActiveSnapLinesLocal]
  );

  // React Flow change handlers
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

  // Selection handler
  const handleRfSelectionChange = useCallback(
    (selection: NodeSelectionChange) => {
      const selectedRfNodes = selection.nodes || [];
      if (selectedRfNodes.length === 1) {
        onSelectionChange(selectedRfNodes[0].id, 'node');
      } else if (selectedRfNodes.length > 1) {
        onMultiNodeSelectionChange?.(selectedRfNodes.map(n => n.id));
        onSelectionChange(null, null);
      } else {
        onSelectionChange(null, null);
      }
    },
    [onSelectionChange, onMultiNodeSelectionChange]
  );

  // Click handlers
  const handleNodeClickInternal = useCallback(
    (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      if (isViewOnlyMode) return;
      const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId;

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

  const handlePaneClickInternal = useCallback(() => {
    const currentConnectingNodeId = useConceptMapStore.getState().connectingNodeId;
    if (currentConnectingNodeId) {
      storeCancelConnection();
      if (reactFlowWrapperRef.current)
        reactFlowWrapperRef.current.classList.remove('cursor-crosshair');
    } else {
      onSelectionChange(null, null);
    }
  }, [storeCancelConnection, onSelectionChange, reactFlowWrapperRef]);

  // Context menu handlers
  const handlePaneDoubleClickInternal = useCallback(
    (event: React.MouseEvent) => {
      if (isViewOnlyMode) return;
      // Handle pane double click logic
    },
    [isViewOnlyMode]
  );

  const handlePaneContextMenuInternal = useCallback(
    (event: React.MouseEvent) => {
      if (isViewOnlyMode) return;
      event.preventDefault();
      const bounds = (event.target as Element).getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };
      onPaneContextMenuRequest?.(event, position);
    },
    [isViewOnlyMode, onPaneContextMenuRequest]
  );

  // Drag and drop handlers
  const handleCanvasDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'copy';
    },
    []
  );

  const handleCanvasDrop = useCallback(
    (event: React.DragEvent) => {
      if (isViewOnlyMode) return;
      event.preventDefault();
      
      const bounds = (event.target as Element).getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      };

      try {
        const conceptData = JSON.parse(event.dataTransfer.getData('text/plain'));
        onConceptSuggestionDrop?.(conceptData, position);
      } catch {
        // Handle plain text drop if needed
      }
    },
    [isViewOnlyMode, onConceptSuggestionDrop]
  );

  const handleCanvasDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  return {
    // Node handlers
    onNodeDragInternal,
    onNodeDragStopInternal,
    handleNodeClickInternal,
    
    // React Flow handlers
    handleRfNodesChange,
    handleRfEdgesChange,
    handleRfNodesDeleted,
    handleRfEdgesDeleted,
    handleRfConnect,
    handleRfSelectionChange,
    
    // Pane handlers
    handlePaneClickInternal,
    handlePaneDoubleClickInternal,
    handlePaneContextMenuInternal,
    
    // Drag and drop handlers
    handleCanvasDragOver,
    handleCanvasDrop,
    handleCanvasDragLeave,
  };
};