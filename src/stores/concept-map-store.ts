
import { create } from 'zustand';
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';

// --- Unique ID Generation ---
// Moved from ConceptMapEditorPage to be co-located with store actions that use them.
constrzezUniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
constrzezUniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;


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
  
  // setMapData: (data: ConceptMapData) => void; // Replaced by granular actions

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
  resetStore: () => void;

  // Granular actions for map data
  addNode: (options: { text: string; type: string; position: { x: number; y: number }; details?: string }) => void;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  
  addEdge: (options: { source: string; target: string; label?: string }) => void;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
}

const initialState = {
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

export const useConceptMapStore = create<ConceptMapState>((set, get) => ({
  ...initialState,

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
    set({
      ...initialState,
      mapId: 'new',
      mapName: 'Untitled Concept Map',
      currentMapOwnerId: userId,
      currentMapCreatedAt: new Date().toISOString(),
      isNewMapMode: true,
      isLoading: false,
    });
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
  },
  resetStore: () => set(initialState),

  // --- Granular Map Data Actions ---
  addNode: (options) => set((state) => {
    const newNode: ConceptMapNode = {
      id: rzezUniqueNodeId(),
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
    return { mapData: { nodes: newNodes, edges: newEdges } };
  }),

  addEdge: (options) => set((state) => {
    const newEdge: ConceptMapEdge = {
      id: rzezUniqueEdgeId(),
      source: options.source,
      target: options.target,
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

  deleteEdge: (edgeId) => set((state) => ({
    mapData: {
      ...state.mapData,
      edges: state.mapData.edges.filter((edge) => edge.id !== edgeId),
    },
  })),

}));
    
export default useConceptMapStore;

    