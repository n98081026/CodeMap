import React, { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  type ReactFlowProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

import ConceptMapErrorBoundary from '../ErrorBoundary';

import { useFlowCanvasLogic } from '@/hooks/useFlowCanvasLogic';
import { useFlowCanvasEventHandlers } from '@/hooks/useFlowCanvasEventHandlers';
import { useFlowCanvasDataCombiner } from '@/hooks/useFlowCanvasDataCombiner';
import SnapLines from './SnapLines';
import VisualEdgeSuggestionOverlay from './VisualEdgeSuggestionOverlay';
import type { ConceptMapData, ConceptMapNode, VisualEdgeSuggestion } from '@/types';
import type { CustomNodeData } from '@/components/concept-map/custom-node';

export interface FlowCanvasCoreProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onMultiNodeSelectionChange?: (nodeIds: string[]) => void;
  onNodesChangeInStore: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onNodesDeleteInStore: (nodeId: string) => void;
  onEdgesDeleteInStore: (edgeIds: string | string[]) => void;
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
  onNodeContextMenuRequest?: (event: React.MouseEvent, node: any) => void;
  onPaneContextMenuRequest?: (event: React.MouseEvent, positionInFlow: { x: number; y: number }) => void;
  onStagedElementsSelectionChange?: (elementIds: string[]) => void;
  onConceptSuggestionDrop?: (conceptItem: any, position: { x: number; y: number }) => void;
  onNodeStartConnectionRequest?: (nodeId: string) => void;
  onNewEdgeSuggestLabels?: (
    edgeId: string,
    sourceNodeId: string,
    targetNodeId: string,
    existingLabel?: string
  ) => Promise<void>;
  activeVisualEdgeSuggestion?: VisualEdgeSuggestion | null;
  onAcceptVisualEdge?: (suggestionId: string) => void;
  onRejectVisualEdge?: (suggestionId: string) => void;
}

const FlowCanvasRefactored: React.FC<FlowCanvasCoreProps> = React.memo(({
  mapDataFromStore,
  isViewOnlyMode,
  onSelectionChange,
  onMultiNodeSelectionChange,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onNodeContextMenuRequest,
  onPaneContextMenuRequest,
  onStagedElementsSelectionChange,
  onConceptSuggestionDrop,
  onNodeStartConnectionRequest,
  onNewEdgeSuggestLabels,
  activeVisualEdgeSuggestion,
  onAcceptVisualEdge,
  onRejectVisualEdge,
}) => {
  // Core logic hook
  const {
    rfNodes,
    rfEdges,
    activeSnapLinesLocal,
    reactFlowWrapperRef,
    connectingNodeId,
    convertedNodes,
    convertedEdges,
    nodeTypes,
    edgeTypes,
    setRfNodes,
    setRfEdges,
    onNodesChangeReactFlow,
    onEdgesChangeReactFlow,
    setActiveSnapLinesLocal,
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,
  } = useFlowCanvasLogic({
    mapDataFromStore,
    isViewOnlyMode,
    onNodesChangeInStore,
    onNodesDeleteInStore,
    onEdgesDeleteInStore: (edgeId: string) => {
      if (typeof onEdgesDeleteInStore === 'function') {
        onEdgesDeleteInStore(edgeId);
      }
    },
    onConnectInStore,
    onSelectionChange,
    onNewEdgeSuggestLabels,
    activeVisualEdgeSuggestion,
    onAcceptVisualEdge,
    onRejectVisualEdge,
  });

  // Event handlers hook
  const {
    onNodeDragInternal,
    onNodeDragStopInternal,
    handleNodeClickInternal,
    handleRfNodesChange,
    handleRfEdgesChange,
    handleRfNodesDeleted,
    handleRfEdgesDeleted,
    handleRfConnect,
    handleRfSelectionChange,
    handlePaneClickInternal,
    handlePaneDoubleClickInternal,
    handlePaneContextMenuInternal,
    handleCanvasDragOver,
    handleCanvasDrop,
    handleCanvasDragLeave,
  } = useFlowCanvasEventHandlers({
    isViewOnlyMode,
    onNodesChangeReactFlow,
    onEdgesChangeReactFlow,
    onNodesChangeInStore,
    onNodesDeleteInStore,
    onEdgesDeleteInStore: (edgeId: string) => {
      if (typeof onEdgesDeleteInStore === 'function') {
        onEdgesDeleteInStore(edgeId);
      }
    },
    onConnectInStore,
    onSelectionChange,
    onMultiNodeSelectionChange,
    onNewEdgeSuggestLabels,
    setActiveSnapLinesLocal,
    reactFlowWrapperRef,
    setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => {
      onSelectionChange(id, type);
    },
    addEdgeToStore: (options: any) => {
      const result = onConnectInStore(options);
      return result || '';
    },
    storeCancelConnection: () => {
      // Handle cancel connection
    },
    storeCompleteConnectionMode: () => {
      // Handle complete connection
    },
    onNodeContextMenuRequest,
    onPaneContextMenuRequest,
    onConceptSuggestionDrop,
  });

  // Data combiner hook
  const { combinedNodes, combinedEdges } = useFlowCanvasDataCombiner({
    convertedNodes,
    convertedEdges,
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,
    isViewOnlyMode,
  });

  // Update React Flow state when combined data changes
  useEffect(() => {
    setRfNodes(combinedNodes);
  }, [combinedNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(combinedEdges);
  }, [combinedEdges, setRfEdges]);

  // React Flow props
  const reactFlowProps: ReactFlowProps = {
    nodes: rfNodes,
    edges: rfEdges,
    nodeTypes,
    edgeTypes,
    onNodesChange: handleRfNodesChange,
    onEdgesChange: handleRfEdgesChange,
    onNodesDelete: handleRfNodesDeleted,
    onEdgesDelete: handleRfEdgesDeleted,
    onConnect: handleRfConnect,
    onSelectionChange: handleRfSelectionChange,
    onNodeClick: handleNodeClickInternal,
    onNodeDrag: onNodeDragInternal,
    onNodeDragStop: onNodeDragStopInternal,
    onPaneClick: handlePaneClickInternal,
    onPaneDoubleClick: handlePaneDoubleClickInternal,
    onPaneContextMenu: handlePaneContextMenuInternal,
    onDragOver: handleCanvasDragOver,
    onDrop: handleCanvasDrop,
    onDragLeave: handleCanvasDragLeave,
    fitView: true,
    fitViewOptions: {
      padding: 0.1,
      includeHiddenNodes: false,
    },
    defaultViewport: { x: 0, y: 0, zoom: 1 },
    minZoom: 0.1,
    maxZoom: 2,
    snapToGrid: true,
    snapGrid: [20, 20],
    deleteKeyCode: isViewOnlyMode ? null : ['Backspace', 'Delete'],
    multiSelectionKeyCode: ['Meta', 'Ctrl'],
    selectionKeyCode: ['Shift'],
    panOnDrag: true,
    panOnScroll: false,
    zoomOnScroll: true,
    zoomOnPinch: true,
    zoomOnDoubleClick: false,
    selectNodesOnDrag: false,
    elevateNodesOnSelect: true,
    nodesDraggable: !isViewOnlyMode,
    nodesConnectable: !isViewOnlyMode,
    elementsSelectable: !isViewOnlyMode,
  };

  return (
    <ConceptMapErrorBoundary>
      <div
        ref={reactFlowWrapperRef}
        className={`h-full w-full ${connectingNodeId ? 'cursor-crosshair' : ''}`}
        data-tutorial-id="flow-canvas"
      >
        <ReactFlow {...reactFlowProps}>
        <Background color="#aaa" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.type === 'input') return '#0041d0';
            if (n.type === 'output') return '#ff0072';
            if (n.type === 'default') return '#1a192b';
            return '#eee';
          }}
          nodeColor={(n) => {
            if (n.type === 'input') return '#0041d0';
            if (n.type === 'output') return '#ff0072';
            if (n.type === 'default') return '#1a192b';
            return '#fff';
          }}
          nodeBorderRadius={2}
          position="bottom-right"
          className="!bg-white/80 !border-gray-200"
        />
        
        {/* Snap lines overlay */}
        <SnapLines snapLines={activeSnapLinesLocal} />
        
        {/* Visual edge suggestion overlay */}
        {activeVisualEdgeSuggestion && (
          <VisualEdgeSuggestionOverlay
            suggestion={activeVisualEdgeSuggestion}
            onAccept={onAcceptVisualEdge}
            onReject={onRejectVisualEdge}
          />
        )}
        
        {/* Connection mode indicator */}
        {connectingNodeId && (
          <Panel position="top-center" className="bg-blue-100 border border-blue-300 rounded px-3 py-1">
            <span className="text-sm text-blue-800">
              Click on another node to create a connection, or click anywhere to cancel
            </span>
          </Panel>
        )}
        </ReactFlow>
      </div>
    </ConceptMapErrorBoundary>
  );
});

FlowCanvasRefactored.displayName = 'FlowCanvasRefactored';

export default FlowCanvasRefactored;