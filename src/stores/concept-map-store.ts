
import { create } from 'zustand';
import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';

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
  
  // Selected Element (to be expanded later)
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;

  // AI Suggestions (to be expanded later)
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
  
  setMapData: (data: ConceptMapData) => void;
  // More granular mapData actions (addNode, addEdge, etc.) will be added later

  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;

  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;

  setAiExtractedConcepts: (concepts: string[]) => void;
  setAiSuggestedRelations: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  setAiExpandedConcepts: (concepts: string[]) => void;
  resetAiSuggestions: () => void;
  
  // Composite actions
  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap) => void;
  resetStore: () => void;
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

  // Simple Setters
  setMapId: (id) => set({ mapId: id }),
  setMapName: (name) => set({ mapName: name }),
  setCurrentMapOwnerId: (ownerId) => set({ currentMapOwnerId: ownerId }),
  setCurrentMapCreatedAt: (createdAt) => set({ currentMapCreatedAt: createdAt }),
  setIsPublic: (isPublicStatus) => set({ isPublic: isPublicStatus }),
  setSharedWithClassroomId: (id) => set({ sharedWithClassroomId: id }),
  setIsNewMapMode: (isNew) => set({ isNewMapMode: isNew }),
  
  setMapData: (data) => set({ mapData: data }),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setError: (errorMsg) => set({ error: errorMsg }),

  setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
  
  setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
  setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
  setAiExpandedConcepts: (concepts) => set({ aiExpandedConcepts: concepts }),
  resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [], aiExpandedConcepts: [] }),

  // Composite Actions
  initializeNewMap: (userId) => {
    set({
      ...initialState, // Reset most things
      mapId: 'new', // Special ID for new maps before saving
      mapName: 'Untitled Concept Map',
      currentMapOwnerId: userId,
      currentMapCreatedAt: new Date().toISOString(),
      isNewMapMode: true,
      isLoading: false, // Explicitly set loading to false
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
      aiExtractedConcepts: [], // Reset AI suggestions when a new map is loaded
      aiSuggestedRelations: [],
      aiExpandedConcepts: [],
    });
  },
  resetStore: () => set(initialState),
}));

// Node and Edge specific actions will be added in a subsequent step
// e.g., addNode, updateNodePosition, addEdge, deleteNode, deleteEdge etc.
// These will manipulate the `mapData` state.
    
export default useConceptMapStore;
