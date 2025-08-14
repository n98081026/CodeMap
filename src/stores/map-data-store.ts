import { temporal, type TemporalState as ZundoTemporalState } from 'zundo';
import { create, StateCreator, StoreApi, UseBoundStore } from 'zustand';
import type { ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';

const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface MapDataState {
  mapData: ConceptMapData;
  isApplyingSemanticTidyUp: boolean; // This might belong in UI store, but let's keep it with the action for now.

  setMapData: (data: ConceptMapData) => void;
  addNode: (options: {
    id?: string;
    text: string;
    type: ConceptMapNode['type'];
    position: { x: number; y: number };
    details?: string;
    parentNode?: string;
    backgroundColor?: string;
    shape?: 'rectangle' | 'ellipse';
    width?: number;
    height?: number;
  }) => string;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (options: {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    color?: string;
    lineType?: 'solid' | 'dashed';
    markerStart?: string;
    markerEnd?: string;
  }) => string;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;
  findEdgeByNodes: (sourceId: string, targetId: string) => ConceptMapEdge | undefined;
  applyFormGroupSuggestion: (
    nodeIds: string[],
    groupName: string | undefined,
    overlayGeometry?: { x: number; y: number; width?: number; height?: number }
  ) => string;
  applySemanticTidyUp: (updates: { id: string; x: number; y: number }[]) => void;
}

const initialState: Omit<MapDataState, 'setMapData' | 'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 'deleteEdge' | 'applyLayout' | 'findEdgeByNodes' | 'applyFormGroupSuggestion' | 'applySemanticTidyUp'> = {
  mapData: { nodes: [], edges: [] },
  isApplyingSemanticTidyUp: false,
};

type TrackedState = Pick<MapDataState, 'mapData'>;
export type MapDataStoreTemporalState = ZundoTemporalState<TrackedState>;

const storeDefinition: StateCreator<MapDataState> = (set, get) => ({
  ...initialState,
  setMapData: (data) => set({ mapData: data }),
  addNode: (options) => {
    const newNodeId = options.id || uniqueNodeId();
    const newNode: ConceptMapNode = {
      id: newNodeId,
      text: options.text,
      type: options.type,
      x: options.position.x,
      y: options.position.y,
      details: options.details || '',
      parentNode: options.parentNode,
      childIds: [],
      backgroundColor: options.backgroundColor,
      shape: options.shape || 'rectangle',
      width: options.width ?? 150,
      height: options.height ?? 70,
    };
    set((state) => {
      const newNodes = [...state.mapData.nodes, newNode];
      const newEdges = [...state.mapData.edges];
      if (options.parentNode) {
        const parentIndex = newNodes.findIndex((n) => n.id === options.parentNode);
        if (parentIndex > -1) {
          const parentNode = { ...newNodes[parentIndex] };
          parentNode.childIds = [...(parentNode.childIds || []), newNode.id];
          newNodes[parentIndex] = parentNode;
        }
      }
      return { mapData: { nodes: newNodes, edges: newEdges } };
    });
    return newNodeId;
  },
  updateNode: (nodeId, updates) =>
    set((state) => ({
      mapData: {
        ...state.mapData,
        nodes: state.mapData.nodes.map((node) => (node.id === nodeId ? { ...node, ...updates } : node)),
      },
    })),
  deleteNode: (nodeIdToDelete) => {
    set((state) => {
      const graphUtil = new GraphAdapterUtility();
      const graphInstance = graphUtil.fromConceptMap(state.mapData);
      if (!graphInstance.hasNode(nodeIdToDelete as string | number)) return state;
      const descendants = graphUtil.getDescendants(graphInstance, nodeIdToDelete);
      const nodesToDeleteSet = new Set<string>([nodeIdToDelete, ...descendants]);
      const finalNodesToKeep = state.mapData.nodes
        .filter((node) => !nodesToDeleteSet.has(node.id))
        .map((node) => ({ ...node, childIds: node.childIds?.filter((childId) => !nodesToDeleteSet.has(childId)) }));
      const edgesToKeep = state.mapData.edges.filter((edge) => !nodesToDeleteSet.has(edge.source) && !nodesToDeleteSet.has(edge.target));
      return { mapData: { nodes: finalNodesToKeep, edges: edgesToKeep } };
    });
  },
  addEdge: (options) => {
    const newEdgeId = options.id || uniqueEdgeId();
    const newEdge: ConceptMapEdge = {
      id: newEdgeId,
      source: options.source,
      target: options.target,
      sourceHandle: options.sourceHandle || null,
      targetHandle: options.targetHandle || null,
      label: options.label || 'connects',
      color: options.color,
      lineType: options.lineType || 'solid',
      markerStart: options.markerStart || 'none',
      markerEnd: options.markerEnd || 'arrowclosed',
    };
    set((state) => ({ mapData: { ...state.mapData, edges: [...state.mapData.edges, newEdge] } }));
    return newEdgeId;
  },
  updateEdge: (edgeId, updates) =>
    set((state) => ({
      mapData: { ...state.mapData, edges: state.mapData.edges.map((edge) => (edge.id === edgeId ? { ...edge, ...updates } : edge)) },
    })),
  deleteEdge: (edgeId) =>
    set((state) => ({
      mapData: { ...state.mapData, edges: state.mapData.edges.filter((edge) => edge.id !== edgeId) },
    })),
  applyLayout: (updatedNodePositions) => {
    set((state) => {
      const updatedNodesMap = new Map<string, LayoutNodeUpdate>();
      updatedNodePositions.forEach((update) => updatedNodesMap.set(update.id, update));
      const newNodes = state.mapData.nodes.map((node) => {
        const updateForNode = updatedNodesMap.get(node.id);
        if (updateForNode) return { ...node, x: updateForNode.x, y: updateForNode.y };
        return node;
      });
      if (newNodes.some((nn, i) => nn.x !== state.mapData.nodes[i].x || nn.y !== state.mapData.nodes[i].y)) {
        return { mapData: { ...state.mapData, nodes: newNodes } };
      }
      return state;
    });
  },
  findEdgeByNodes: (sourceId, targetId) => {
    return get().mapData.edges.find(
      (edge) => (edge.source === sourceId && edge.target === targetId) || (edge.source === targetId && edge.target === sourceId)
    );
  },
  applyFormGroupSuggestion: (nodeIds, groupName, overlayGeometry) => {
    const { addNode: addNodeAction, updateNode: updateNodeAction } = get();
    let groupNodeX = 100, groupNodeY = 100;
    if (overlayGeometry && overlayGeometry.x !== undefined && overlayGeometry.y !== undefined) {
      groupNodeX = overlayGeometry.x + (overlayGeometry.width || 300) / 2 - 75;
      groupNodeY = overlayGeometry.y + 20;
    } else {
      const groupNodes = get().mapData.nodes.filter(
        (n) => nodeIds.includes(n.id) && n.x !== undefined && n.y !== undefined
      );
      if (groupNodes.length > 0) {
        groupNodeX = groupNodes.reduce((acc, n) => acc + n.x!, 0) / groupNodes.length;
        groupNodeY = groupNodes.reduce((acc, n) => acc + n.y!, 0) / groupNodes.length - 50;
      }
    }
    const newGroupId = addNodeAction({
      text: groupName || 'New Group',
      type: 'ai-group-parent',
      position: { x: groupNodeX, y: groupNodeY },
      width: overlayGeometry?.width ? Math.max(overlayGeometry.width * 0.8, 200) : 200,
      height: overlayGeometry?.height ? Math.max(overlayGeometry.height * 0.8, 100) : 100,
    });
    nodeIds.forEach((nodeId) => {
      const nodeToUpdate = get().mapData.nodes.find((n) => n.id === nodeId);
      if (nodeToUpdate) updateNodeAction(nodeId, { parentNode: newGroupId });
    });
    return newGroupId;
  },
  applySemanticTidyUp: (updates) => {
    set((state) => {
      const updatedNodes = state.mapData.nodes.map((node) => {
        const update = updates.find((u) => u.id === node.id);
        return update ? { ...node, x: update.x, y: update.y } : node;
      });
      return { ...state, mapData: { ...state.mapData, nodes: updatedNodes } };
    });
  },
});

export const useMapDataStore = create(
  temporal(storeDefinition, {
    partialize: (state): TrackedState => ({ mapData: state.mapData }),
    limit: 50,
  })
);
