'use client';

import React, { memo, useMemo, useCallback, useRef } from 'react';
import {
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnNodesDelete,
  type OnEdgesDelete,
  type Connection,
  useReactFlow,
  NodeSelectionChange,
} from 'reactflow';

import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import type { ConceptMapData, ConceptMapNode } from '@/types';

// Memoized node component
const MemoizedCustomNode = memo(React.lazy(() => 
  import('../custom-node').then(module => ({ default: module.default }))
));

// Memoized edge component  
const MemoizedOrthogonalEdge = memo(React.lazy(() =>
  import('../orthogonal-edge').then(module => ({ default: module.default }))
));

interface OptimizedFlowCanvasProps {
  mapData: ConceptMapData;
  isViewOnlyMode?: boolean;
  onSelectionChange: (id: string | null, type: 'node' | 'edge' | null) => void;
  onNodesChange: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onNodesDelete: (nodeId: string) => void;
  onEdgesDelete: (edgeId: string) => void;
  onConnect: (options: {
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
  }) => string | undefined;
}

export const OptimizedFlowCanvas: React.FC<OptimizedFlowCanvasProps> = memo(({
  mapData,
  isViewOnlyMode = false,
  onSelectionChange,
  onNodesChange,
  onNodesDelete,
  onEdgesDelete,
  onConnect,
}) => {
  const { measurePerformance, debouncedCompute, throttle } = usePerformanceOptimization();
  const reactFlowInstance = useReactFlow();
  const lastUpdateRef = useRef<number>(0);

  // Memoized node types with lazy loading
  const nodeTypes = useMemo(() => ({
    customConceptNode: MemoizedCustomNode,
  }), []);

  // Memoized edge types with lazy loading
  const edgeTypes = useMemo(() => ({
    orthogonal: MemoizedOrthogonalEdge,
  }), []);

  // Optimized nodes conversion with memoization
  const optimizedNodes = useMemo(() => {
    return measurePerformance('nodes-conversion', () => {
      if (!mapData.nodes) return [];
      
      return mapData.nodes.map((appNode) => ({
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
        },
        position: { x: appNode.x ?? 0, y: appNode.y ?? 0 },
        draggable: !isViewOnlyMode,
        selectable: true,
        connectable: !isViewOnlyMode,
        dragHandle: '.node-move-handle',
        parentNode: appNode.parentNode,
        expandParent: !!appNode.parentNode,
      }));
    });
  }, [mapData.nodes, isViewOnlyMode]);

  // Optimized edges conversion with memoization
  const optimizedEdges = useMemo(() => {
    return measurePerformance('edges-conversion', () => {
      if (!mapData.edges) return [];
      
      return mapData.edges.map((appEdge) => ({
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
        },
        style: { strokeWidth: 2 },
        updatable: !isViewOnlyMode,
        deletable: !isViewOnlyMode,
      }));
    });
  }, [mapData.edges, isViewOnlyMode]);

  // State management with optimized initial values
  const [rfNodes, setRfNodes, onNodesChangeReactFlow] = useNodesState(optimizedNodes);
  const [rfEdges, setRfEdges, onEdgesChangeReactFlow] = useEdgesState(optimizedEdges);

  // Throttled handlers for better performance
  const throttledNodesChange = useMemo(
    () => throttle((changes: any[]) => {
      onNodesChangeReactFlow(changes);
      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging === false) {
          onNodesChange(change.id, {
            x: change.position.x,
            y: change.position.y,
          });
        }
        if (change.type === 'dimensions' && change.dimensions) {
          onNodesChange(change.id, {
            width: change.dimensions.width,
            height: change.dimensions.height,
          });
        }
      });
    }, 16), // ~60fps
    [onNodesChangeReactFlow, onNodesChange, throttle]
  );

  const throttledEdgesChange = useMemo(
    () => throttle((changes: any[]) => {
      onEdgesChangeReactFlow(changes);
    }, 16),
    [onEdgesChangeReactFlow, throttle]
  );

  // Optimized selection handler
  const handleSelectionChange = useCallback(
    (selection: NodeSelectionChange) => {
      const selectedNodes = selection.nodes || [];
      const selectedEdges = selection.edges || [];

      if (selectedNodes.length === 1 && selectedEdges.length === 0) {
        onSelectionChange(selectedNodes[0].id, 'node');
      } else if (selectedEdges.length === 1 && selectedNodes.length === 0) {
        onSelectionChange(selectedEdges[0].id, 'edge');
      } else {
        onSelectionChange(null, null);
      }
    },
    [onSelectionChange]
  );

  // Optimized connect handler
  const handleConnect = useCallback(
    (params: Connection) => {
      if (isViewOnlyMode || !params.source || !params.target) return;
      
      onConnect({
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        label: 'connects',
      });
    },
    [isViewOnlyMode, onConnect]
  );

  // Optimized delete handlers
  const handleNodesDelete = useCallback(
    (deletedNodes: RFNode[]) => {
      if (isViewOnlyMode) return;
      deletedNodes.forEach((node) => onNodesDelete(node.id));
    },
    [isViewOnlyMode, onNodesDelete]
  );

  const handleEdgesDelete = useCallback(
    (deletedEdges: RFEdge[]) => {
      if (isViewOnlyMode) return;
      deletedEdges.forEach((edge) => onEdgesDelete(edge.id));
    },
    [isViewOnlyMode, onEdgesDelete]
  );

  // Update nodes and edges when mapData changes
  React.useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) { // Throttle updates
      setRfNodes(optimizedNodes);
      lastUpdateRef.current = now;
    }
  }, [optimizedNodes, setRfNodes]);

  React.useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current > 100) { // Throttle updates
      setRfEdges(optimizedEdges);
      lastUpdateRef.current = now;
    }
  }, [optimizedEdges, setRfEdges]);

  // Auto-fit view with debouncing
  React.useEffect(() => {
    if (rfNodes.length > 0 && reactFlowInstance) {
      const debouncedFitView = debouncedCompute(
        'fit-view',
        () => {
          reactFlowInstance.fitView({
            duration: 300,
            padding: 0.2,
            includeHiddenNodes: true,
          });
        },
        [rfNodes.length],
        200
      );
      
      if (debouncedFitView) {
        setTimeout(debouncedFitView, 100);
      }
    }
  }, [rfNodes.length, reactFlowInstance, debouncedCompute]);

  return {
    nodes: rfNodes,
    edges: rfEdges,
    nodeTypes,
    edgeTypes,
    onNodesChange: throttledNodesChange,
    onEdgesChange: throttledEdgesChange,
    onNodesDelete: handleNodesDelete,
    onEdgesDelete: handleEdgesDelete,
    onConnect: handleConnect,
    onSelectionChange: handleSelectionChange,
  };
});

OptimizedFlowCanvas.displayName = 'OptimizedFlowCanvas';