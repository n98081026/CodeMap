
import { create } from 'zustand';
import { temporal, type TemporalState } from 'zustand/middleware';
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
}

// Define the part of the state that will be tracked by temporal middleware
type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId'>;

const initialStateBase: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' | 
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'setSelectedElement' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' | 'setAiExpandedConcepts' | 
  'resetAiSuggestions' | 'initializeNewMap' | 'setLoadedMap' | 'importMapData' | 'resetStore' | 
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
      
      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      setAiExpandedConcepts: (concepts) => set({ aiExpandedConcepts: concepts }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [], aiExpandedConcepts: [] }),

      initializeNewMap: (userId) => {
        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'Untitled Concept Map',
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isLoading: false,
        };
        set(newMapState);
        // Manually clear temporal history for a new map
        (get() as any).temporal?.clear(); 
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
        // Manually clear temporal history when a map is loaded
        (get() as any).temporal?.clear();
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `Imported: ${fileName}` : `Imported: ${currentMapName}`;
        
        set((state) => ({
          mapData: importedData,
          mapName: newName, 
          selectedElementId: null,
          selectedElementType: null,
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
          isLoading: false,
          isSaving: false,
          error: null,
        }));
        // Manually clear temporal history for an imported map
         (get() as any).temporal?.clear();
      },
      resetStore: () => {
        set(initialStateBase);
        (get() as any).temporal?.clear();
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
      // Temporal middleware configuration
      limit: 50, // Max number of history states
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId };
      },
      // equality: (currentState, pastState) => isEqual(currentState, pastState) // Optional: for deep equality checks if needed
    }
  )
);
    
export default useConceptMapStore;

// Type assertion for the temporal store part, if direct type inference isn't enough
export type ConceptMapStoreWithTemporal = ReturnType<typeof useConceptMapStore.getState> & {
  temporal: TemporalState<TrackedState>;
};
