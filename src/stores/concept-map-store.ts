import { create } from 'zustand';
import { temporal, type TemporalState as ZundoTemporalState } from 'zundo';
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';

const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface ConceptMapState {
  // Map metadata
  mapId: string | null;
  mapName: string;
  currentMapOwnerId: string | null;
  currentMapCreatedAt: string | null;
  isPublic: boolean;
  sharedWithClassroomId: string | null;
  isNewMapMode: boolean;
  isViewOnlyMode: boolean;
  initialLoadComplete: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  debugLogs: string[];

  // Map data
  mapData: ConceptMapData;
  isApplyingSemanticTidyUp: boolean;

  // UI state
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[];
  connectingNodeId: string | null;
  isConnectionMode: boolean;

  // AI suggestions
  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;
  stagedMapData: StagedMapDataWithContext | null;
  isStagingActive: boolean;
  structuralSuggestions: any[];
  ghostPreviewData: {
    nodes: Array<{
      id: string;
      x: number;
      y: number;
      originalX?: number;
      originalY?: number;
      width?: number;
      height?: number;
    }>;
  } | null;
  isOverviewModeActive: boolean;
  projectOverviewData: {
    overallSummary: string;
    keyModules: { name: string; description: string }[];
    error?: string;
  } | null;
  isFetchingOverview: boolean;

  // Tutorial state
  tutorialTempTargetNodeId: string | null;
  tutorialTempTargetEdgeId: string | null;

  // Drag and drop
  dragPreview: any;
  draggedRelationPreview: any;

  // Actions
  setMapId: (id: string | null) => void;
  setMapName: (name: string) => void;
  setCurrentMapOwnerId: (ownerId: string | null) => void;
  setCurrentMapCreatedAt: (createdAt: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setSharedWithClassroomId: (classroomId: string | null) => void;
  setIsNewMapMode: (isNew: boolean) => void;
  setIsViewOnlyMode: (isViewOnly: boolean) => void;
  setInitialLoadComplete: (complete: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;
  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap, viewOnly?: boolean) => void;
  resetStore: () => void;

  // Map data actions
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
  loadExampleMapData: () => void;

  // UI actions
  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void;
  setConnectingNodeId: (id: string | null) => void;
  startConnectionMode: (nodeId: string) => void;
  cancelConnection: () => void;
  completeConnectionMode: () => void;

  // AI suggestion actions
  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  resetAiSuggestions: () => void;
  setStagedMapData: (data: StagedMapDataWithContext | null) => void;
  commitStagedMapData: () => void;
  setGhostPreview: (nodesToPreview: Array<{ id: string; x: number; y: number; width?: number; height?: number; }>) => void;
  acceptGhostPreview: () => void;
  cancelGhostPreview: () => void;
  setStructuralSuggestions: (suggestions: any[]) => void;
  removeStructuralSuggestion: (suggestionId: string) => void;
  toggleOverviewMode: () => void;
  setProjectOverviewData: (data: ConceptMapState['projectOverviewData']) => void;
  setIsFetchingOverview: (fetching: boolean) => void;
  fetchProjectOverview: (input: { projectStoragePath: string; userGoals: string; }) => Promise<void>;

  // Tutorial actions
  setTutorialTempTargetNodeId: (id: string | null) => void;
  setTutorialTempTargetEdgeId: (id: string | null) => void;

  // Drag and drop actions
  setDragPreview: (preview: any) => void;
  clearDragPreview: () => void;
  setDraggedRelationPreview: (preview: any) => void;

  // Import/Export
  importMapData: (data: ConceptMapData) => void;
  setFocusOnNodes: (nodeIds: string[]) => void;
}

const initialState: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 
  'setIsPublic' | 'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 
  'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'addDebugLog' | 'clearDebugLogs' | 'initializeNewMap' | 'setLoadedMap' | 'resetStore' |
  'setMapData' | 'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 
  'deleteEdge' | 'applyLayout' | 'findEdgeByNodes' | 'applyFormGroupSuggestion' | 
  'applySemanticTidyUp' | 'loadExampleMapData' |
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setConnectingNodeId' | 'startConnectionMode' |
  'cancelConnection' | 'completeConnectionMode' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' |
  'resetAiSuggestions' | 'setStagedMapData' | 'commitStagedMapData' | 'setGhostPreview' |
  'acceptGhostPreview' | 'cancelGhostPreview' | 'setStructuralSuggestions' | 'removeStructuralSuggestion' |
  'toggleOverviewMode' | 'setProjectOverviewData' | 'setIsFetchingOverview' | 'fetchProjectOverview' |
  'setTutorialTempTargetNodeId' | 'setTutorialTempTargetEdgeId' | 'setDragPreview' | 'clearDragPreview' |
  'setDraggedRelationPreview' | 'importMapData' | 'setFocusOnNodes'
> = {
  // Map metadata
  mapId: null,
  mapName: 'Untitled Concept Map',
  currentMapOwnerId: null,
  currentMapCreatedAt: null,
  isPublic: false,
  sharedWithClassroomId: null,
  isNewMapMode: true,
  isViewOnlyMode: false,
  initialLoadComplete: false,
  isLoading: false,
  isSaving: false,
  error: null,
  debugLogs: [],

  // Map data
  mapData: { nodes: [], edges: [] },
  isApplyingSemanticTidyUp: false,

  // UI state
  selectedElementId: null,
  selectedElementType: null,
  multiSelectedNodeIds: [],
  connectingNodeId: null,
  isConnectionMode: false,

  // AI suggestions
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  stagedMapData: null,
  isStagingActive: false,
  structuralSuggestions: [],
  ghostPreviewData: null,
  isOverviewModeActive: false,
  projectOverviewData: null,
  isFetchingOverview: false,

  // Tutorial state
  tutorialTempTargetNodeId: null,
  tutorialTempTargetEdgeId: null,

  // Drag and drop
  dragPreview: null,
  draggedRelationPreview: null,
};

type TrackedState = Pick<ConceptMapState, 'mapData'>;
export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;

export const useConceptMapStore = create<ConceptMapState>()(
  temporal(
    (set, get) => ({
      ...initialState,

      // Map metadata actions
      setMapId: (id) => set({ mapId: id }),
      setMapName: (name) => set({ mapName: name }),
      setCurrentMapOwnerId: (ownerId) => set({ currentMapOwnerId: ownerId }),
      setCurrentMapCreatedAt: (createdAt) => set({ currentMapCreatedAt: createdAt }),
      setIsPublic: (isPublicStatus) => set({ isPublic: isPublicStatus }),
      setSharedWithClassroomId: (id) => set({ sharedWithClassroomId: id }),
      setIsNewMapMode: (isNew) => set({ isNewMapMode: isNew }),
      setIsViewOnlyMode: (isViewOnly) => set({ isViewOnlyMode: isViewOnly }),
      setInitialLoadComplete: (complete) => set({ initialLoadComplete: complete }),
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setError: (errorMsg) => set({ error: errorMsg }),
      addDebugLog: (log) =>
        set((state) => ({
          debugLogs: [...state.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100),
        })),
      clearDebugLogs: () => set({ debugLogs: [] }),
      initializeNewMap: (userId: string) => {
        get().addDebugLog(`[STORE initializeNewMap] User: ${userId}.`);
        set({
          ...initialState,
          mapId: 'new',
          mapName: 'New Concept Map',
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          initialLoadComplete: true,
          debugLogs: get().debugLogs,
        });
      },
      setLoadedMap: (map, viewOnly = false) => {
        get().addDebugLog(`[STORE setLoadedMap] Map ID: ${map.id}, ViewOnly: ${viewOnly}`);
        set({
          ...initialState,
          mapId: map.id,
          mapName: map.name,
          currentMapOwnerId: map.ownerId,
          currentMapCreatedAt: map.createdAt,
          isPublic: map.isPublic,
          sharedWithClassroomId: map.sharedWithClassroomId || null,
          isNewMapMode: false,
          isViewOnlyMode: viewOnly,
          initialLoadComplete: true,
          mapData: map.mapData || { nodes: [], edges: [] },
          debugLogs: get().debugLogs,
        });
      },
      resetStore: () => set(initialState),

      // Map data actions
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
      deleteNode: (nodeId) => {
        set((state) => {
          // Simple deletion without graph analysis for now
          const finalNodesToKeep = state.mapData.nodes.filter((node) => node.id !== nodeId);
          const edgesToKeep = state.mapData.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);
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
      loadExampleMapData: () => {
        const exampleData: ConceptMapData = {
          nodes: [
            {
              id: 'example-1',
              text: 'Example Concept 1',
              type: 'default',
              x: 100,
              y: 100,
              details: 'This is an example concept',
              backgroundColor: '#e3f2fd',
              shape: 'rectangle',
              width: 150,
              height: 70,
            },
            {
              id: 'example-2',
              text: 'Example Concept 2',
              type: 'default',
              x: 300,
              y: 100,
              details: 'Another example concept',
              backgroundColor: '#f3e5f5',
              shape: 'rectangle',
              width: 150,
              height: 70,
            },
          ],
          edges: [
            {
              id: 'example-edge-1',
              source: 'example-1',
              target: 'example-2',
              label: 'connects to',
              color: '#666',
              lineType: 'solid',
              markerStart: 'none',
              markerEnd: 'arrowclosed',
            },
          ],
        };
        set({ mapData: exampleData });
      },

      // UI actions
      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setConnectingNodeId: (id) => set({ connectingNodeId: id }),
      startConnectionMode: (nodeId) => set({ connectingNodeId: nodeId, isConnectionMode: true }),
      cancelConnection: () => set({ connectingNodeId: null, isConnectionMode: false }),
      completeConnectionMode: () => set({ connectingNodeId: null, isConnectionMode: false }),

      // AI suggestion actions
      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [] }),
      setStagedMapData: (data) => set({ stagedMapData: data, isStagingActive: !!data }),
      commitStagedMapData: () => {
        const { stagedMapData } = get();
        if (!stagedMapData) return;
        // Implementation would go here
        set({ stagedMapData: null, isStagingActive: false });
      },
      setGhostPreview: (nodesToPreview) => {
        const { nodes } = get().mapData;
        const previewNodesWithOriginalData = nodesToPreview.map((previewNode) => {
          const originalNode = nodes.find((n) => n.id === previewNode.id);
          return {
            ...previewNode,
            originalX: originalNode?.x,
            originalY: originalNode?.y,
            width: originalNode?.width || previewNode.width || 150,
            height: originalNode?.height || previewNode.height || 70,
          };
        });
        set({
          ghostPreviewData: { nodes: previewNodesWithOriginalData },
          stagedMapData: null,
          isStagingActive: false,
        });
      },
      acceptGhostPreview: () => {
        const previewData = get().ghostPreviewData;
        if (!previewData) return;
        const updates = previewData.nodes.map((node) => ({ id: node.id, x: node.x, y: node.y }));
        get().applyLayout(updates);
        set({ ghostPreviewData: null });
      },
      cancelGhostPreview: () => set({ ghostPreviewData: null }),
      setStructuralSuggestions: (suggestions) => set({ structuralSuggestions: suggestions }),
      removeStructuralSuggestion: (suggestionId) => {
        set((state) => ({
          structuralSuggestions: state.structuralSuggestions.filter((s) => s.id !== suggestionId),
        }));
      },
      toggleOverviewMode: () => set((state) => ({ isOverviewModeActive: !state.isOverviewModeActive })),
      setProjectOverviewData: (data) => set({ projectOverviewData: data, isFetchingOverview: false }),
      setIsFetchingOverview: (fetching) => set({ isFetchingOverview: fetching }),
      fetchProjectOverview: async (input) => {
        if (get().isFetchingOverview) return;
        set({ isFetchingOverview: true, projectOverviewData: null });
        try {
          // Mock implementation for now
          set({
            projectOverviewData: {
              overallSummary: 'Project overview generated successfully.',
              keyModules: [],
            },
            isFetchingOverview: false,
          });
        } catch (e: unknown) {
          set({
            projectOverviewData: {
              overallSummary: 'Failed to generate overview.',
              keyModules: [],
              error: (e as Error).message,
            },
            isFetchingOverview: false,
          });
        }
      },

      // Tutorial actions
      setTutorialTempTargetNodeId: (id) => set({ tutorialTempTargetNodeId: id }),
      setTutorialTempTargetEdgeId: (id) => set({ tutorialTempTargetEdgeId: id }),

      // Drag and drop actions
      setDragPreview: (preview) => set({ dragPreview: preview }),
      clearDragPreview: () => set({ dragPreview: null }),
      setDraggedRelationPreview: (preview) => set({ draggedRelationPreview: preview }),

      // Import/Export
      importMapData: (data) => set({ mapData: data }),
      setFocusOnNodes: (nodeIds) => {
        // Implementation would go here - for now just a placeholder
        console.log('Focus on nodes:', nodeIds);
      },
    }),
    {
      partialize: (state): TrackedState => ({ mapData: state.mapData }),
      limit: 50,
    }
  )
);

// Export types for external use
export type StagedMapDataWithContext = {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  actionType?:
    | 'extractConcepts'
    | 'suggestRelations'
    | 'expandConcept'
    | 'intermediateNode'
    | 'summarizeNodes'
    | 'quickCluster'
    | 'generateSnippet'
    | 'aiTidyUpComplete';
  originalElementId?: string;
  originalElementIds?: string[];
};
