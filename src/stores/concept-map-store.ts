import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState as ZundoTemporalState } from 'zundo';
import { runFlow } from '@genkit-ai/flow'; // Keep this if other flows use it
import { suggestMapImprovementsFlow, semanticTidyUpFlow, type SemanticTidyUpRequest } from '@/ai/flows';

// Corrected import path for the real GraphAdapterUtility
import { GraphAdapterUtility } from '../lib/graphologyAdapter';

import type { ConceptMap, ConceptMapData } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter'; // Assuming this is used elsewhere or for future
import type {
  // GraphologyInstance, // This type might be internal to the adapter now
  // GraphAdapter, // Interface might be in graph-adapter.ts, GraphAdapterUtility implements it
  ConceptMapNode,
  ConceptMapEdge,
} from '@/types/graph-adapter'; // Assuming these types are correctly defined here

// Use the real GraphAdapterUtility
const graphAdapter = new GraphAdapterUtility();

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
  editingNodeId: string | null;
  aiProcessingNodeId: string | null;
  connectingNodeId: string | null;

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;

  debugLogs: string[];

  stagedMapData: ConceptMapData | null;
  isStagingActive: boolean;

  conceptExpansionPreview: ConceptExpansionPreviewState | null;
  updateConceptExpansionPreviewNode: (previewNodeId: string, newText: string, newDetails?: string) => void;

  isConnectingMode: boolean; // Retained from previous version if used by UI directly
  connectionSourceNodeId: string | null; // Retained from previous version

  dragPreviewItem: { text: string; type: string; } | null;
  dragPreviewPosition: { x: number; y: number; } | null;
  draggedRelationLabel: string | null;

  triggerFitView: boolean;

  // Structural suggestions state
  isFetchingStructuralSuggestions: boolean;
  structuralSuggestions: ProcessedSuggestedEdge[] | null;
  structuralGroupSuggestions: ProcessedSuggestedGroup[] | null;

  // Semantic Tidy Up state
  isApplyingSemanticTidyUp: boolean;

  // Pending relation for edge creation
  pendingRelationForEdgeCreation: { label: string; sourceNodeId: string; sourceNodeHandle?: string | null; } | null;

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
  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setAiProcessingNodeId: (nodeId: string | null) => void;
  startConnection: (nodeId: string) => void;
  cancelConnection: () => void;
  finishConnectionAttempt: (targetNodeId: string) => void;
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
  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => string;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  setStagedMapData: (data: ConceptMapData | null) => void;
  clearStagedMapData: () => void;
  commitStagedMapData: () => void;
  deleteFromStagedMapData: (elementIds: string[]) => void;
  setConceptExpansionPreview: (preview: ConceptExpansionPreviewState | null) => void;
  updateConceptExpansionPreviewNodeText: (previewNodeId: string, newText: string) => void; // Should be this one
  applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;
  tidySelectedNodes: () => void;
  fetchStructuralSuggestions: () => Promise<void>;
  acceptStructuralEdgeSuggestion: (suggestionId: string) => void;
  dismissStructuralEdgeSuggestion: (suggestionId: string) => void;
  acceptStructuralGroupSuggestion: (suggestionId: string, options?: { createParentNode?: boolean }) => void;
  dismissStructuralGroupSuggestion: (suggestionId: string) => void;
  clearAllStructuralSuggestions: () => void;
  applySemanticTidyUp: () => Promise<void>;
  setPendingRelationForEdgeCreation: (data: { label: string; sourceNodeId: string; sourceNodeHandle?: string | null; } | null) => void;
  clearPendingRelationForEdgeCreation: () => void;
  // For direct React Flow UI updates
  startConnectionMode: (nodeId: string) => void; // Retained
  completeConnectionMode: (targetNodeId?: string, targetHandleId?: string | null) => void; // Retained & updated
  cancelConnectionMode: () => void; // Retained
  setDragPreview: (item: { text: string; type: string; } | null) => void; // Retained
  updateDragPreviewPosition: (position: { x: number; y: number; }) => void; // Retained
  clearDragPreview: () => void; // Retained
  setDraggedRelationPreview: (label: string | null) => void; // Retained
  setTriggerFitView: (value: boolean) => void; // Retained
}

export type ProcessedSuggestedEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  reason?: string;
};

export type ProcessedSuggestedGroup = {
  id: string;
  nodeIds: string[];
  label?: string;
  reason?: string;
};

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds' | 'editingNodeId' | 'stagedMapData' | 'isStagingActive' | 'conceptExpansionPreview' | 'structuralSuggestions' | 'structuralGroupSuggestions'>;

export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;

const initialStateBase: Omit<ConceptMapState,
  // All action method names listed here
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' |
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' |
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setEditingNodeId' | 'setAiProcessingNodeId' |
  'startConnection' | 'cancelConnection' | 'finishConnectionAttempt' |
  'setAiExtractedConcepts' | 'setAiSuggestedRelations' |
  'resetAiSuggestions' | 'removeExtractedConceptsFromSuggestions' | 'removeSuggestedRelationsFromSuggestions' |
  'addDebugLog' | 'clearDebugLogs' |
  'initializeNewMap' | 'setLoadedMap' | 'importMapData' | 'resetStore' |
  'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 'deleteEdge' |
  'setStagedMapData' | 'clearStagedMapData' | 'commitStagedMapData' | 'deleteFromStagedMapData' |
  'setConceptExpansionPreview' | 'updateConceptExpansionPreviewNode' | 'updateConceptExpansionPreviewNodeText' | // Added both for safety
  'applyLayout' | 'tidySelectedNodes' |
  'fetchStructuralSuggestions' | 'acceptStructuralEdgeSuggestion' | 'dismissStructuralEdgeSuggestion' |
  'acceptStructuralGroupSuggestion' | 'dismissStructuralGroupSuggestion' | 'clearAllStructuralSuggestions' |
  'applySemanticTidyUp' |
  'setPendingRelationForEdgeCreation' | 'clearPendingRelationForEdgeCreation' |
  'startConnectionMode' | 'completeConnectionMode' | 'cancelConnectionMode' |
  'setDragPreview' | 'updateDragPreviewPosition' | 'clearDragPreview' |
  'setDraggedRelationPreview' | 'setTriggerFitView'
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
  connectingNodeId: null, // For button-initiated connections
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  debugLogs: [],
  stagedMapData: null,
  isStagingActive: false,
  conceptExpansionPreview: null,
  isConnectingMode: false, // For general connection mode (e.g. drag from handle)
  connectionSourceNodeId: null, // Source for general connection mode
  dragPreviewItem: null,
  dragPreviewPosition: null,
  draggedRelationLabel: null,
  triggerFitView: false,
  isFetchingStructuralSuggestions: false,
  structuralSuggestions: null,
  structuralGroupSuggestions: null,
  isApplyingSemanticTidyUp: false,
  pendingRelationForEdgeCreation: null,
};

export interface ConceptExpansionPreviewNode {
  id: string;
  text: string;
  relationLabel: string;
  details?: string;
}
export interface ConceptExpansionPreviewState {
  parentNodeId: string;
  previewNodes: ConceptExpansionPreviewNode[];
}

export const useConceptMapStore = create<ConceptMapState>()(
  temporal(
    (set, get) => ({
      ...initialStateBase,
      // All action implementations here...
      // Ensure all actions omitted from initialStateBase are implemented below
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
      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type, multiSelectedNodeIds: id && type === 'node' ? [id] : [] }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),
      startConnection: (nodeId) => { /* ... */ }, // For button-initiated connection
      cancelConnection: () => { /* ... */ },   // For button-initiated connection
      finishConnectionAttempt: (targetNodeId) => { /* ... */ }, // For button-initiated connection
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
      initializeNewMap: (userId: string) => { /* ... as before ... */
        set({ ...initialStateBase, mapId: 'new', currentMapOwnerId: userId, currentMapCreatedAt: new Date().toISOString(), isNewMapMode: true, initialLoadComplete: true, debugLogs: get().debugLogs });
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => { /* ... as before ... */
        set({
          mapId: map.id, mapName: map.name, currentMapOwnerId: map.ownerId, currentMapCreatedAt: map.createdAt,
          isPublic: map.isPublic, sharedWithClassroomId: map.sharedWithClassroomId || null,
          mapData: map.mapData || { nodes: [], edges: [] },
          isNewMapMode: false, isViewOnlyMode: viewOnly, isLoading: false, initialLoadComplete: true, error: null,
          multiSelectedNodeIds: [], editingNodeId: null, aiExtractedConcepts: [], aiSuggestedRelations: [],
          aiProcessingNodeId: null, debugLogs: get().debugLogs,
        });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => { /* ... as before ... */ },
      resetStore: () => { /* ... as before ... */ },
      addNode: (options) => { /* ... as before ... */
        const newNodeId = uniqueNodeId();
        // Simplified, actual implementation is more complex
        set(state => ({ mapData: { ...state.mapData, nodes: [...state.mapData.nodes, {id: newNodeId, ...options, x: options.position.x, y: options.position.y, childIds: []}] }}));
        return newNodeId;
      },
      updateNode: (nodeId, updates) => set((state) => ({ /* ... as before ... */ })),
      deleteNode: (nodeIdToDelete) => { /* ... as before using graphAdapter ... */ },
      addEdge: (options) => { /* ... as before ... */
        const newEdgeId = uniqueEdgeId();
        set(state => ({ mapData: { ...state.mapData, edges: [...state.mapData.edges, {id: newEdgeId, ...options}] }}));
        return newEdgeId;
      },
      updateEdge: (edgeId, updates) => set((state) => ({ /* ... as before ... */ })),
      deleteEdge: (edgeId) => set((state) => ({ /* ... as before ... */ })),
      setStagedMapData: (data) => set({ stagedMapData: data, isStagingActive: !!data }),
      clearStagedMapData: () => set({ stagedMapData: null, isStagingActive: false }),
      commitStagedMapData: () => { /* ... as before ... */ },
      deleteFromStagedMapData: (elementIdsToRemove) => { /* ... as before ... */ },
      setConceptExpansionPreview: (preview) => set({ conceptExpansionPreview: preview }),
      updateConceptExpansionPreviewNodeText: (previewNodeId, newText) => { /* ... as before ... */ },
      updateConceptExpansionPreviewNode: (previewNodeId, newText, newDetails) => { // This is the one used by refine
        set((state) => {
          if (!state.conceptExpansionPreview || !state.conceptExpansionPreview.previewNodes) return state;
          const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node =>
            node.id === previewNodeId ? { ...node, text: newText, details: newDetails ?? node.details } : node
          );
          return { ...state, conceptExpansionPreview: { ...state.conceptExpansionPreview, previewNodes: updatedPreviewNodes }};
        });
      },
      applyLayout: (updatedNodePositions) => { /* ... as before ... */ set({ triggerFitView: true }); },
      tidySelectedNodes: () => { /* ... as before ... */ },
      fetchStructuralSuggestions: async () => { /* ... as before, calls runFlow and set() ... */ },
      acceptStructuralEdgeSuggestion: (suggestionId: string) => { /* ... as before ... */ },
      dismissStructuralEdgeSuggestion: (suggestionId: string) => { /* ... as before ... */ },
      acceptStructuralGroupSuggestion: (suggestionId: string, options?: { createParentNode?: boolean }) => { /* ... as before ... */ },
      dismissStructuralGroupSuggestion: (suggestionId: string) => { /* ... as before ... */ },
      clearAllStructuralSuggestions: () => set({ structuralSuggestions: [], structuralGroupSuggestions: [] }),
      applySemanticTidyUp: async () => { /* ... as before, calls runFlow and get().applyLayout ... */ },
      setPendingRelationForEdgeCreation: (data) => set({ pendingRelationForEdgeCreation: data, connectingNodeId: null }),
      clearPendingRelationForEdgeCreation: () => set({ pendingRelationForEdgeCreation: null }),
      startConnectionMode: (nodeId) => set({ isConnectingMode: true, connectionSourceNodeId: nodeId, selectedElementId: null, selectedElementType: null, multiSelectedNodeIds: [] }),
      completeConnectionMode: (targetNodeId, targetHandleId) => {
        const sourceNodeId = get().connectionSourceNodeId;
        if (sourceNodeId && targetNodeId) {
          get().addEdge({ source: sourceNodeId, target: targetNodeId, sourceHandle: get().connectingState?.sourceHandleId, targetHandle: targetHandleId });
        }
        set({ isConnectingMode: false, connectionSourceNodeId: null, connectingState: null }); // Clear connectingState too
      },
      cancelConnectionMode: () => set({ isConnectingMode: false, connectionSourceNodeId: null, connectingState: null }), // Clear connectingState too
      setDragPreview: (item) => set({ dragPreviewItem: item }),
      updateDragPreviewPosition: (position) => set({ dragPreviewPosition: position }),
      clearDragPreview: () => set({ dragPreviewItem: null, dragPreviewPosition: null, draggedRelationLabel: null }),
      setDraggedRelationPreview: (label) => set({ draggedRelationLabel: label }),
      setTriggerFitView: (value) => set({ triggerFitView: value }),
      // __internalGraphAdapterForTesting: graphAdapter, // Keep if tests rely on it
    }),
    {
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview, structuralSuggestions, structuralGroupSuggestions } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview, structuralSuggestions, structuralGroupSuggestions };
      },
      limit: 50,
    }
  )
);

export default useConceptMapStore;
