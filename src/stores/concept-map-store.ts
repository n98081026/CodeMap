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

  // Map data actions are now in map-data-store.ts

  // UI actions
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
  setFocusOnNodes: (nodeIds: string[]) => void;
}

const initialState: Omit<ConceptMapState, 
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 
  'setIsPublic' | 'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 
  'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' | 
  'addDebugLog' | 'clearDebugLogs' | 'initializeNewMap' | 'setLoadedMap' | 'resetStore' |
  'setConnectingNodeId' | 'startConnectionMode' |
  'cancelConnection' | 'completeConnectionMode' | 'setAiExtractedConcepts' | 'setAiSuggestedRelations' |
  'resetAiSuggestions' | 'setStagedMapData' | 'commitStagedMapData' | 'setGhostPreview' |
  'acceptGhostPreview' | 'cancelGhostPreview' | 'setStructuralSuggestions' | 'removeStructuralSuggestion' |
  'toggleOverviewMode' | 'setProjectOverviewData' | 'setIsFetchingOverview' | 'fetchProjectOverview' |
  'setTutorialTempTargetNodeId' | 'setTutorialTempTargetEdgeId' | 'setDragPreview' | 'clearDragPreview' |
  'setDraggedRelationPreview' | 'setFocusOnNodes'
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

      // Map data actions are now in map-data-store.ts

      // UI actions
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
        // This action has been moved to useMapDataStore, this logic needs to be handled by the calling hook
        // get().applyLayout(updates);
        console.log("Applying layout updates from ghost preview", updates)
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
