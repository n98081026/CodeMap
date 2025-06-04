
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
  multiSelectedNodeIds: string[]; // New: To store multiple selected node IDs

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
  setMultiSelectedNodeIds: (ids: string[]) => void; // New: Action to set multiple selected node IDs

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

  // Note: undo, redo, clear are not part of the state slice but are methods on the store.temporal object provided by zundo
}

// Define the part of the state that will be tracked by zundo
type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds'>;

// Type for the temporal state structure provided by zundo.
// This is typically accessed via useConceptMapStore.temporal.getState()
export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;


const initialStateBase: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' | 
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' | 'setAiExpandedConcepts' | 
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
  multiSelectedNodeIds: [], // Initialize new state
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
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }), // Implement new action
      
      setAiExtractedConcepts: (concepts) => set({ aiExtractedConcepts: concepts }),
      setAiSuggestedRelations: (relations) => set({ aiSuggestedRelations: relations }),
      setAiExpandedConcepts: (concepts) => set({ aiExpandedConcepts: concepts }),
      resetAiSuggestions: () => set({ aiExtractedConcepts: [], aiSuggestedRelations: [], aiExpandedConcepts: [] }),

      initializeNewMap: (userId) => {
        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'Mock Initial Map', 
          mapData: { 
            nodes: [
              { id: uniqueNodeId(), text: 'Main Component', type: 'ui_view', x: 100, y: 100, details: 'The primary UI entry point.' },
              { id: uniqueNodeId(), text: 'API Service', type: 'service_component', x: 300, y: 150, details: 'Handles data fetching.' },
              { id: uniqueNodeId(), text: 'Database Schema', type: 'data_model', x: 100, y: 300, details: 'Represents user data.' },
            ],
            edges: [
              { id: uniqueEdgeId(), source: 'node-0', target: 'node-1', label: 'fetches from' }, 
            ],
          },
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isLoading: false,
          multiSelectedNodeIds: [], // Reset multi-selection
        };
        
        if (newMapState.mapData.nodes.length >= 2 && newMapState.mapData.edges.length > 0) {
             newMapState.mapData.edges[0].source = newMapState.mapData.nodes[0].id;
             newMapState.mapData.edges[0].target = newMapState.mapData.nodes[1].id;
        }
        
        set(newMapState);
        // History clearing will be handled by the component after state update
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
          multiSelectedNodeIds: [], // Reset multi-selection
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
        });
        // History clearing will be handled by the component after state update
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `${fileName}` : `Imported: ${currentMapName}`; 
        
        set((state) => ({
          mapData: importedData,
          mapName: newName, 
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [], // Reset multi-selection
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiExpandedConcepts: [],
          mapId: state.isNewMapMode ? 'new' : state.mapId, 
          isNewMapMode: state.isNewMapMode, 
          isLoading: false,
          isSaving: false,
          error: null,
        }));
        // History clearing will be handled by the component after state update
      },
      resetStore: () => {
        set(initialStateBase);
        // History clearing will be handled by the component after state update
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
      // equality: (pastState, currentState) => { /* custom equality function if needed */ },
      // onSave: (pastState, currentState) => { /* callback on save */ },
    }
  )
);
        

export default useConceptMapStore;
