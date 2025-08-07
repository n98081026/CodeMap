import { useState, useCallback, useMemo, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Node as RFNode,
  type Edge as RFEdge,
} from 'reactflow';

import type { CustomNodeData } from '@/components/concept-map/custom-node';
import type {
  ConceptMapData,
  ConceptMapNode,
  VisualEdgeSuggestion,
} from '@/types';

import { calculateSnappedPositionAndLines } from '@/lib/layout-utils';
import { useConceptMapStore } from '@/stores/concept-map-store';

const GRID_SIZE = 20;
const SNAP_THRESHOLD = 8;

interface UseFlowCanvasLogicProps {
  mapDataFromStore: ConceptMapData;
  isViewOnlyMode?: boolean;
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
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
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

export const useFlowCanvasLogic = ({
  mapDataFromStore,
  isViewOnlyMode,
  onNodesChangeInStore,
  onNodesDeleteInStore,
  onEdgesDeleteInStore,
  onConnectInStore,
  onSelectionChange,
  onNewEdgeSuggestLabels,
  activeVisualEdgeSuggestion,
  onAcceptVisualEdge,
  onRejectVisualEdge,
}: UseFlowCanvasLogicProps) => {
  // Store selectors
  const {
    connectingNodeId,
    setSelectedElement,
    addEdgeToStore,
    storeCancelConnection,
    storeCompleteConnectionMode,
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,
  } = useConceptMapStore((s) => ({
    connectingNodeId: s.connectingNodeId,
    setSelectedElement: s.setSelectedElement,
    addEdgeToStore: s.addEdge,
    storeCancelConnection: s.cancelConnection,
    storeCompleteConnectionMode: s.completeConnectionMode,
    stagedMapData: s.stagedMapData,
    ghostPreviewData: s.ghostPreviewData,
    structuralSuggestions: s.structuralSuggestions,
  }));

  // React Flow state
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState([]);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState([]);

  // Local state
  const [activeSnapLinesLocal, setActiveSnapLinesLocal] = useState<any[]>([]);
  const reactFlowWrapperRef = useRef<HTMLDivElement>(null);

  // Convert store data to React Flow format
  const convertedNodes = useMemo(() => {
    return mapDataFromStore.nodes.map((node: ConceptMapNode) => ({
      id: node.id,
      type: 'custom',
      position: { x: node.x, y: node.y },
      data: {
        label: node.text,
        details: node.details,
        type: node.type,
        isViewOnly: isViewOnlyMode,
        backgroundColor: node.backgroundColor,
        shape: node.shape,
        width: node.width,
        height: node.height,
      } as CustomNodeData,
      width: node.width,
      height: node.height,
    }));
  }, [mapDataFromStore.nodes, isViewOnlyMode]);

  const convertedEdges = useMemo(() => {
    return mapDataFromStore.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'orthogonal',
      label: edge.label,
      data: {
        label: edge.label,
        color: edge.color,
        lineType: edge.lineType,
        markerStart: edge.markerStart,
        markerEnd: edge.markerEnd,
      },
    }));
  }, [mapDataFromStore.edges]);

  // Node types and edge types
  const nodeTypes = useMemo(() => {
    const CustomNode = require('@/components/concept-map/custom-node').default;
    const GhostNodeComponent =
      require('@/components/concept-map/GhostNodeComponent').default;
    const SuggestedGroupOverlayNode =
      require('@/components/concept-map/SuggestedGroupOverlayNode').default;
    const SuggestedIntermediateNode =
      require('@/components/concept-map/SuggestedIntermediateNode').default;

    return {
      custom: CustomNode,
      ghost: GhostNodeComponent,
      suggestedGroup: SuggestedGroupOverlayNode,
      suggestedIntermediate: SuggestedIntermediateNode,
    };
  }, []);

  const edgeTypes = useMemo(() => {
    const OrthogonalEdge =
      require('@/components/concept-map/orthogonal-edge').default;
    const SuggestedEdge =
      require('@/components/concept-map/SuggestedEdge').default;

    return {
      orthogonal: OrthogonalEdge,
      suggested: SuggestedEdge,
    };
  }, []);

  return {
    // State
    rfNodes,
    rfEdges,
    activeSnapLinesLocal,
    reactFlowWrapperRef,
    connectingNodeId,

    // Converted data
    convertedNodes,
    convertedEdges,

    // Types
    nodeTypes,
    edgeTypes,

    // React Flow handlers
    setRfNodes,
    setRfEdges,
    onNodesChangeReactFlow,
    onEdgesChangeReactFlow,

    // Store actions
    setSelectedElement,
    addEdgeToStore,
    storeCancelConnection,
    storeCompleteConnectionMode,

    // Local state setters
    setActiveSnapLinesLocal,

    // Store data
    stagedMapData,
    ghostPreviewData,
    structuralSuggestions,

    // Visual edge suggestion
    activeVisualEdgeSuggestion,
    onAcceptVisualEdge,
    onRejectVisualEdge,
  };
};
