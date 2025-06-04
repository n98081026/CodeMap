
import { create } from 'zustand';
// import { temporal, type TemporalState } from 'zustand/middleware'; // Old import
import * as ZustandMiddleware from 'zustand/middleware'; // New import style
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

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  setAiExpandedConcepts: (concepts: string[]) => void;
  resetAiSuggestions: () => void;
  
  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap) => void;
  importMapData: (importedData: ConceptMapData, fileName?: string) => void;
  resetStore: () => void;

  // Granular actions for map data
  addNode: (options: { text: string; type: string; position: { x: number; y: number }; details?: string }) => void;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  
  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string }) => void;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;

  // Placeholder for methods added by zustand/middleware/temporal if different from zundo
  // undo?: () => void;
  // redo?: () => void;
  // clear?: () => void; 
  // pastStates?: TrackedState[];
  // futureStates?: TrackedState[];
}

// Define the part of the state that will be tracked by temporal middleware
type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId'>;

// Type for the temporal state structure if using a middleware that adds a .temporal property (like zundo)
// For zustand/middleware/temporal, this structure is different.
// The `ZustandMiddleware.TemporalState` type will be used by the middleware itself.
// The store state type `ConceptMapState` will be augmented by the middleware with methods like undo, redo.
// type ZustandTemporalState = ZustandMiddleware.TemporalState<TrackedState>;


const initialStateBase: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' | 
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'setSelectedElement' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' | 'setAiExpandedConcepts' | 
  'resetAiSuggestions' | 'initializeNewMap' | 'setLoadedMap' | 'importMapData' | 'resetStore' | 
  'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 'deleteEdge' 
  // Remove undo/redo etc. from Omit as they might be added by the middleware to ConceptMapState
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
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  aiExpandedConcepts: [],
};


export const useConceptMapStore = create<ConceptMapState>()(
  ZustandMiddleware.temporal( // Use the imported middleware object's temporal property
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
      
      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      setAiExpandedConcepts: (concepts) => set({ aiExpandedConcepts: concepts }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [], aiExpandedConcepts: [] }),

      initializeNewMap: (userId) => {
        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'Mock Initial Map', // Added mock name
          mapData: { // Added mock data
            nodes: [
              { id: uniqueNodeId(), text: 'Main Component', type: 'ui_view', x: 100, y: 100, details: 'The primary UI entry point.' },
              { id: uniqueNodeId(), text: 'API Service', type: 'service_component', x: 300, y: 150, details: 'Handles data fetching.' },
              { id: uniqueNodeId(), text: 'Database Schema', type: 'data_model', x: 100, y: 300, details: 'Represents user data.' },
            ],
            edges: [
              { id: uniqueEdgeId(), source: 'node-0', target: 'node-1', label: 'fetches from' }, // Placeholder IDs, will be dynamic
            ],
          },
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isLoading: false,
        };
        // Adjust mock IDs after generation
        if (newMapState.mapData.nodes.length >= 2) {
             newMapState.mapData.edges[0].source = newMapState.mapData.nodes[0].id;
             newMapState.mapData.edges[0].target = newMapState.mapData.nodes[1].id;
        }
        
        set(newMapState);
        const store = get() as any;
        if (store.clear) store.clear();
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
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
        });
        const store = get() as any;
        if (store.clear) store.clear();
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `${fileName}` : `Imported: ${currentMapName}`; 
        
        set((state) => ({
          mapData: importedData,
          mapName: newName, 
          selectedElementId: null,
          selectedElementType: null,
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
          mapId: state.isNewMapMode ? 'new' : state.mapId, 
          isNewMapMode: state.isNewMapMode, 
          isLoading: false,
          isSaving: false,
          error: null,
        }));
        const store = get() as any;
        if (store.clear) store.clear();
      },
      resetStore: () => {
        set(initialStateBase);
        const store = get() as any;
        if (store.clear) store.clear();
      },

      addNode: (options) => set((state) => {
        const newNode: ConceptMapNode = {
          id: uniqueNodeId(),
          text: options.text,
          type: options.type,
          x: options.position.x,
          y: options.position.y,
          details: options.details || '',
        };
        return { mapData: { ...state.mapData, nodes: [...state.mapData.nodes, newNode] } };
      }),

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
        return { 
          mapData: { nodes: newNodes, edges: newEdges },
          selectedElementId: newSelectedElementId,
          selectedElementType: newSelectedElementType,
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
      limit: 50, 
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId };
      },
    }
  )
);
        
// This type and its usage for accessing .temporal.undo etc. are likely for zundo or zustand-temporal,
// not directly for zustand/middleware/temporal. This will need to be addressed if the "not a function" error is resolved.
export type ConceptMapStoreWithTemporal = ReturnType<typeof useConceptMapStore.getState> & {
  temporal: ZustandMiddleware.TemporalState<TrackedState>;
};

export default useConceptMapStore;

    