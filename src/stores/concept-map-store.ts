
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState as ZundoTemporalState } from 'zundo';

import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';

const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface ConceptMapState {
  mapId: string | null;
  mapName: string;
  currentMapOwnerId: string | null;
  currentMapCreatedAt: string | null;
  isPublic: boolean;
  sharedWithClassroomId: string | null;
  isNewMapMode: boolean;
  isViewOnlyMode: boolean;
  initialLoadComplete: boolean; 

  mapData: ConceptMapData;

  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[];
  editingNodeId: string | null; // For auto-focusing node label input
  aiProcessingNodeId: string | null;

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;

  debugLogs: string[];

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

  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (nodeId: string | null) => void; // Action for auto-focus
  setAiProcessingNodeId: (nodeId: string | null) => void;

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  resetAiSuggestions: () => void;

  removeExtractedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;
  removeSuggestedRelationsFromSuggestions: (relationsToRemove: Array<{ source: string; target: string; relation: string }>) => void;

  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;

  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap, viewOnly?: boolean) => void;
  importMapData: (importedData: ConceptMapData, fileName?: string) => void;
  resetStore: () => void;

  addNode: (options: { text: string; type: string; position: { x: number; y: number }; details?: string; parentNode?: string; backgroundColor?: string; shape?: 'rectangle' | 'ellipse'; width?: number; height?: number; }) => string;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;

  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => void;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
}

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds' | 'editingNodeId'>;

export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;


const initialStateBase: Omit<ConceptMapState,
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' |
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' |
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setEditingNodeId' | 'setAiProcessingNodeId' |
  'setAiExtractedConcepts' | 'setAiSuggestedRelations' |
  'resetAiSuggestions' | 'removeExtractedConceptsFromSuggestions' | 'removeSuggestedRelationsFromSuggestions' |
  'addDebugLog' | 'clearDebugLogs' |
  'initializeNewMap' | 'setLoadedMap' | 'importMapData' | 'resetStore' |
  'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 'deleteEdge'
> = {
  mapId: null,
  mapName: 'Untitled Concept Map',
  currentMapOwnerId: null,
  currentMapCreatedAt: null,
  isPublic: false,
  sharedWithClassroomId: null,
  isNewMapMode: true,
  isViewOnlyMode: false,
  initialLoadComplete: false, 
  mapData: { nodes: [], edges: [] },
  isLoading: false,
  isSaving: false,
  error: null,
  selectedElementId: null,
  selectedElementType: null,
  multiSelectedNodeIds: [],
  editingNodeId: null,
  aiProcessingNodeId: null,
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  debugLogs: [],
};


export const useConceptMapStore = create<ConceptMapState>()(
  temporal(
    (set, get) => ({
      ...initialStateBase,

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

      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),

      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [] }),

      removeExtractedConceptsFromSuggestions: (conceptsToRemove) => set((state) => ({
        aiExtractedConcepts: state.aiExtractedConcepts.filter(concept => !conceptsToRemove.includes(concept))
      })),
      removeSuggestedRelationsFromSuggestions: (relationsToRemove) => set((state) => ({
        aiSuggestedRelations: state.aiSuggestedRelations.filter(relation =>
          !relationsToRemove.some(rtr =>
            rtr.source === relation.source && rtr.target === relation.target && rtr.relation === relation.relation
          )
        )
      })),

      addDebugLog: (log) => set((state) => ({
        debugLogs: [...state.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100)
      })),
      clearDebugLogs: () => set({ debugLogs: [] }),

      initializeNewMap: (userId: string) => {
        const previousMapId = get().mapId;
        const previousIsNewMapMode = get().isNewMapMode;
        get().addDebugLog(`[STORE] INITIALIZE_NEW_MAP CALLED! User: ${userId}. Prev mapId: ${previousMapId}, prevIsNew: ${previousIsNewMapMode}.`);
        get().addDebugLog(`[STORE initializeNewMap V11] Setting mapData to empty nodes/edges. User: ${userId}.`);

        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'New Concept Map',
          mapData: {
            nodes: [],
            edges: [],
          },
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isViewOnlyMode: false,
          isLoading: false,
          initialLoadComplete: true, 
          multiSelectedNodeIds: [],
          editingNodeId: null, 
          aiProcessingNodeId: null,
          isPublic: initialStateBase.isPublic,
          sharedWithClassroomId: initialStateBase.sharedWithClassroomId,
          debugLogs: get().debugLogs,
        };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => {
        get().addDebugLog(`[STORE] SET_LOADED_MAP CALLED! Map ID: ${map.id}, Name: ${map.name}, ViewOnly: ${viewOnly}`);
        get().addDebugLog(`[STORE setLoadedMap V11] Received map ID '${map.id}'. MapData nodes count: ${map.mapData?.nodes?.length ?? 'undefined/null'}, edges count: ${map.mapData?.edges?.length ?? 'undefined/null'}. ViewOnly: ${viewOnly}`);
        set({
          mapId: map.id,
          mapName: map.name,
          currentMapOwnerId: map.ownerId,
          currentMapCreatedAt: map.createdAt,
          isPublic: map.isPublic,
          sharedWithClassroomId: map.sharedWithClassroomId || null,
          mapData: map.mapData || { nodes: [], edges: [] },
          isNewMapMode: false,
          isViewOnlyMode: viewOnly,
          isLoading: false,
          initialLoadComplete: true, 
          error: null,
          multiSelectedNodeIds: [],
          editingNodeId: null, 
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiProcessingNodeId: null,
          debugLogs: get().debugLogs,
        });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `${fileName}` : `Imported: ${currentMapName}`;
        get().addDebugLog(`[STORE] IMPORT_MAP_DATA CALLED! New Name: ${newName}`);

        set((state) => ({
          mapData: importedData,
          mapName: newName,
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [],
          editingNodeId: null,
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiProcessingNodeId: null,
          mapId: state.isNewMapMode ? 'new' : state.mapId,
          isNewMapMode: state.isNewMapMode,
          isViewOnlyMode: false,
          isLoading: false,
          initialLoadComplete: true, 
          isSaving: false,
          error: null,
          debugLogs: get().debugLogs,
        }));
        useConceptMapStore.temporal.getState().clear();
      },
      resetStore: () => {
        get().addDebugLog(`[STORE] RESET_STORE CALLED!`);
        set({ ...initialStateBase, initialLoadComplete: false, debugLogs: [] });
        useConceptMapStore.temporal.getState().clear();
      },

      addNode: (options) => {
        const newNode: ConceptMapNode = {
          id: uniqueNodeId(),
          text: options.text,
          type: options.type,
          x: options.position.x,
          y: options.position.y,
          details: options.details || '',
          parentNode: options.parentNode,
          childIds: [], // Initialize childIds for the new node
          backgroundColor: options.backgroundColor || undefined,
          shape: options.shape || 'rectangle',
          width: options.width,
          height: options.height,
        };

        set((state) => {
          let newNodes = [...state.mapData.nodes, newNode];
          // If this node has a parent, update the parent's childIds
          if (options.parentNode) {
            const parentIndex = newNodes.findIndex(n => n.id === options.parentNode);
            if (parentIndex !== -1) {
              const parentNode = { ...newNodes[parentIndex] };
              parentNode.childIds = [...(parentNode.childIds || []), newNode.id];
              newNodes[parentIndex] = parentNode;
            }
          }
          return { mapData: { ...state.mapData, nodes: newNodes } };
        });
        return newNode.id;
      },

      updateNode: (nodeId, updates) => set((state) => ({
        mapData: {
          ...state.mapData,
          nodes: state.mapData.nodes.map((node) =>
            node.id === nodeId ? { ...node, ...updates } : node
          ),
        },
      })),

      deleteNode: (nodeIdToDelete) => set((state) => {
        const nodesToDeleteSet = new Set<string>();
        const queue: string[] = [nodeIdToDelete];
        
        // Populate nodesToDeleteSet with the initial node and all its descendants
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (nodesToDeleteSet.has(currentId)) continue; // Already processed
            nodesToDeleteSet.add(currentId);
            const node = state.mapData.nodes.find(n => n.id === currentId);
            if (node && node.childIds) {
                node.childIds.forEach(childId => {
                    if (!nodesToDeleteSet.has(childId)) {
                        queue.push(childId);
                    }
                });
            }
        }

        // Filter out the deleted nodes
        const newNodes = state.mapData.nodes.filter(node => !nodesToDeleteSet.has(node.id));

        // Update parent's childIds if the deleted node had a parent
        const nodeToDelete = state.mapData.nodes.find(n => n.id === nodeIdToDelete);
        if (nodeToDelete?.parentNode) {
            const parentIndex = newNodes.findIndex(n => n.id === nodeToDelete.parentNode);
            if (parentIndex !== -1) {
                const parentNode = { ...newNodes[parentIndex] };
                parentNode.childIds = (parentNode.childIds || []).filter(id => id !== nodeIdToDelete);
                newNodes[parentIndex] = parentNode;
            }
        }

        // Filter out edges connected to any of the deleted nodes
        const newEdges = state.mapData.edges.filter(
          edge => !nodesToDeleteSet.has(edge.source) && !nodesToDeleteSet.has(edge.target)
        );

        let newSelectedElementId = state.selectedElementId;
        let newSelectedElementType = state.selectedElementType;
        if (state.selectedElementId && nodesToDeleteSet.has(state.selectedElementId)) {
            newSelectedElementId = null;
            newSelectedElementType = null;
        }
        const newMultiSelectedNodeIds = state.multiSelectedNodeIds.filter(id => !nodesToDeleteSet.has(id));
        const newAiProcessingNodeId = state.aiProcessingNodeId && nodesToDeleteSet.has(state.aiProcessingNodeId) ? null : state.aiProcessingNodeId;
        const newEditingNodeId = state.editingNodeId && nodesToDeleteSet.has(state.editingNodeId) ? null : state.editingNodeId;

        return {
          mapData: { nodes: newNodes, edges: newEdges },
          selectedElementId: newSelectedElementId,
          selectedElementType: newSelectedElementType,
          multiSelectedNodeIds: newMultiSelectedNodeIds,
          editingNodeId: newEditingNodeId,
          aiProcessingNodeId: newAiProcessingNodeId,
        };
      }),

      addEdge: (options) => set((state) => {
        const newEdge: ConceptMapEdge = {
          id: uniqueEdgeId(),
          source: options.source,
          target: options.target,
          sourceHandle: options.sourceHandle || null,
          targetHandle: options.targetHandle || null,
          label: options.label || 'connects',
          color: options.color || undefined,
          lineType: options.lineType || 'solid',
          markerStart: options.markerStart || 'none',
          markerEnd: options.markerEnd || 'arrowclosed',
        };
        return { mapData: { ...state.mapData, edges: [...state.mapData.edges, newEdge] } };
      }),

      updateEdge: (edgeId, updates) => set((state) => ({
        mapData: {
          ...state.mapData,
          edges: state.mapData.edges.map((edge) =>
            edge.id === edgeId ? { ...edge, ...updates } : edge
          ),
        },
      })),

      deleteEdge: (edgeId) => set((state) => {
        const newSelectedElementId = state.selectedElementId === edgeId ? null : state.selectedElementId;
        const newSelectedElementType = state.selectedElementId === edgeId ? null : state.selectedElementType;
        return {
          mapData: {
            ...state.mapData,
            edges: state.mapData.edges.filter((edge) => edge.id !== edgeId),
          },
          selectedElementId: newSelectedElementId,
          selectedElementType: newSelectedElementType,
        };
      })
    }),
    {
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId };
      },
      limit: 50,
    }
  )
);


export default useConceptMapStore;
