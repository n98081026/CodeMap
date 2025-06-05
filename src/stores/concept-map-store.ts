
import { create } from 'zustand';
import { temporal } from 'zundo'; // Import temporal from zundo
import type { TemporalState as ZundoTemporalState } from 'zundo'; // Import type from zundo

import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';

// --- Unique ID Generation ---
const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

interface ConceptMapState {
  // Map Identification & Core Properties
  mapId: string | null;
  mapName: string;
  currentMapOwnerId: string | null;
  currentMapCreatedAt: string | null;
  isPublic: boolean;
  sharedWithClassroomId: string | null;
  isNewMapMode: boolean;

  // Map Content
  mapData: ConceptMapData;

  // UI & Interaction States
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[]; 

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;
  aiExpandedConcepts: string[];

  // Actions
  setMapId: (id: string | null) => void;
  setMapName: (name: string) => void;
  setCurrentMapOwnerId: (ownerId: string | null) => void;
  setCurrentMapCreatedAt: (createdAt: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setSharedWithClassroomId: (classroomId: string | null) => void;
  setIsNewMapMode: (isNew: boolean) => void;
  
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void; 

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  setAiExpandedConcepts: (concepts: string[]) => void;
  resetAiSuggestions: () => void;
  
  removeExtractedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;
  removeSuggestedRelationsFromSuggestions: (relationsToRemove: Array<{ source: string; target: string; relation: string }>) => void;
  removeExpandedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;

  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap) => void;
  importMapData: (importedData: ConceptMapData, fileName?: string) => void;
  resetStore: () => void;

  // Granular actions for map data
  addNode: (options: { text: string; type: string; position: { x: number; y: number }; details?: string }) => string; 
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  
  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string }) => void;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
}

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds'>;

export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;


const initialStateBase: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' | 
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' | 'setAiExpandedConcepts' | 
  'resetAiSuggestions' | 'removeExtractedConceptsFromSuggestions' | 'removeSuggestedRelationsFromSuggestions' | 'removeExpandedConceptsFromSuggestions' | 
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
  mapData: { nodes: [], edges: [] },
  isLoading: false,
  isSaving: false,
  error: null,
  selectedElementId: null,
  selectedElementType: null,
  multiSelectedNodeIds: [], 
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  aiExpandedConcepts: [],
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
      
      setIsLoading: (loading) => set({ isLoading: loading }),
      setIsSaving: (saving) => set({ isSaving: saving }),
      setError: (errorMsg) => set({ error: errorMsg }),

      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }), 
      
      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      setAiExpandedConcepts: (concepts) => set({ aiExpandedConcepts: concepts }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [], aiExpandedConcepts: [] }),

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
      removeExpandedConceptsFromSuggestions: (conceptsToRemove) => set((state) => ({
        aiExpandedConcepts: state.aiExpandedConcepts.filter(concept => !conceptsToRemove.includes(concept))
      })),

      initializeNewMap: (userId) => {
        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'New Concept Map', 
          mapData: { 
            nodes: [], // Start with an empty map initially for user to add
            edges: [],
          },
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isLoading: false,
          multiSelectedNodeIds: [], 
        };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map) => {
        set({
          mapId: map.id,
          mapName: map.name,
          currentMapOwnerId: map.ownerId,
          currentMapCreatedAt: map.createdAt,
          isPublic: map.isPublic,
          sharedWithClassroomId: map.sharedWithClassroomId || null,
          mapData: map.mapData || { nodes: [], edges: [] },
          isNewMapMode: false,
          isLoading: false,
          error: null,
          multiSelectedNodeIds: [], 
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
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
          aiExpandedConcepts: [],
          mapId: state.isNewMapMode ? 'new' : state.mapId, 
          isNewMapMode: state.isNewMapMode, 
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
        };
        set((state) => ({ mapData: { ...state.mapData, nodes: [...state.mapData.nodes, newNode] } }));
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

      deleteNode: (nodeId) => set((state) => {
        const newNodes = state.mapData.nodes.filter((node) => node.id !== nodeId);
        const newEdges = state.mapData.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        );
        const newSelectedElementId = state.selectedElementId === nodeId ? null : state.selectedElementId;
        const newSelectedElementType = state.selectedElementId === nodeId ? null : state.selectedElementType;
        const newMultiSelectedNodeIds = state.multiSelectedNodeIds.filter(id => id !== nodeId);
        return { 
          mapData: { nodes: newNodes, edges: newEdges },
          selectedElementId: newSelectedElementId,
          selectedElementType: newSelectedElementType,
          multiSelectedNodeIds: newMultiSelectedNodeIds,
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
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds };
      },
      limit: 50, 
    }
  )
);
        

export default useConceptMapStore;
