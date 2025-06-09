
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

  mapData: ConceptMapData;

  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[]; 
  editingNodeId: string | null; 
  aiProcessingNodeId: string | null; 

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;

  setMapId: (id: string | null) => void;
  setMapName: (name: string) => void;
  setCurrentMapOwnerId: (ownerId: string | null) => void;
  setCurrentMapCreatedAt: (createdAt: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setSharedWithClassroomId: (classroomId: string | null) => void;
  setIsNewMapMode: (isNew: boolean) => void;
  setIsViewOnlyMode: (isViewOnly: boolean) => void; 
  
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void; 
  setEditingNodeId: (nodeId: string | null) => void;
  setAiProcessingNodeId: (nodeId: string | null) => void;

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  resetAiSuggestions: () => void;
  
  removeExtractedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;
  removeSuggestedRelationsFromSuggestions: (relationsToRemove: Array<{ source: string; target: string; relation: string }>) => void;

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
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setEditingNodeId' | 'setAiProcessingNodeId' | 
  'setAiExtractedConcepts' | 'setAiSuggestedRelations' | 
  'resetAiSuggestions' | 'removeExtractedConceptsFromSuggestions' | 'removeSuggestedRelationsFromSuggestions' | 
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

      initializeNewMap: (userId: string) => {
        const previousMapId = get().mapId; 
        const previousIsNewMapMode = get().isNewMapMode;
        console.error(`[STORE] INITIALIZE_NEW_MAP CALLED! User: ${userId}. Previous mapId: ${previousMapId}, previousIsNewMapMode: ${previousIsNewMapMode}. Stack:`, new Error().stack);
        
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
          multiSelectedNodeIds: [], 
          aiProcessingNodeId: null,
          isPublic: initialStateBase.isPublic, 
          sharedWithClassroomId: initialStateBase.sharedWithClassroomId,
        };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => {
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
          error: null,
          multiSelectedNodeIds: [], 
          aiExtractedConcepts: [], 
          aiSuggestedRelations: [], 
          aiProcessingNodeId: null,
        });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `${fileName}` : `Imported: ${currentMapName}`; 
        
        set((state) => ({
          mapData: importedData,
          mapName: newName, 
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [], 
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiProcessingNodeId: null,
          mapId: state.isNewMapMode ? 'new' : state.mapId, 
          isNewMapMode: state.isNewMapMode, 
          isViewOnlyMode: false, 
          isLoading: false,
          isSaving: false,
          error: null,
        }));
        useConceptMapStore.temporal.getState().clear();
      },
      resetStore: () => {
        set(initialStateBase);
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
          childIds: [], 
          backgroundColor: options.backgroundColor || undefined, 
          shape: options.shape || 'rectangle', 
          width: options.width, 
          height: options.height, 
        };
        
        set((state) => {
          const newNodes = [...state.mapData.nodes, newNode];
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
        const nodeToDelete = state.mapData.nodes.find(n => n.id === nodeIdToDelete);
        let parentNodeToUpdate: ConceptMapNode | undefined;
        let parentNodeIndex = -1;

        if (nodeToDelete?.parentNode) {
          parentNodeIndex = state.mapData.nodes.findIndex(n => n.id === nodeToDelete.parentNode);
          if (parentNodeIndex !== -1) {
            parentNodeToUpdate = { ...state.mapData.nodes[parentNodeIndex] };
            parentNodeToUpdate.childIds = (parentNodeToUpdate.childIds || []).filter(id => id !== nodeIdToDelete);
          }
        }

        const nodesToDeleteSet = new Set<string>([nodeIdToDelete]);
        const queue = [nodeIdToDelete];
      
        while (queue.length > 0) {
          const currentParentId = queue.shift()!;
          state.mapData.nodes.forEach(node => {
            if (node.parentNode === currentParentId && !nodesToDeleteSet.has(node.id)) {
              nodesToDeleteSet.add(node.id);
              queue.push(node.id);
            }
          });
        }
      
        let newNodes = state.mapData.nodes.filter(node => !nodesToDeleteSet.has(node.id));
        if (parentNodeToUpdate && parentNodeIndex !== -1) {
           newNodes = newNodes.map(n => n.id === parentNodeToUpdate!.id ? parentNodeToUpdate! : n);
           const stillExistsParentIndex = newNodes.findIndex(n => n.id === parentNodeToUpdate!.id);
           if(stillExistsParentIndex !== -1) {
               newNodes[stillExistsParentIndex] = parentNodeToUpdate;
           }
        }

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

        return { 
          mapData: { nodes: newNodes, edges: newEdges },
          selectedElementId: newSelectedElementId,
          selectedElementType: newSelectedElementType,
          multiSelectedNodeIds: newMultiSelectedNodeIds,
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

