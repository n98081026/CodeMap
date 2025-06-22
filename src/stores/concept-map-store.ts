import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState as ZundoTemporalState } from 'zundo';
import { GraphAdapterUtility } from '../../lib/graphologyAdapter'; // Ensure this is the correct path

import type { ConceptMap, ConceptMapData } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';
import { z } from 'zod';
import { StructuralSuggestionItemSchema } from '@/types/ai-suggestions';
import type {
  // GraphologyInstance, // GraphologyInstance is not explicitly used in the store's public interface after this change
  ConceptMapNode,
  ConceptMapEdge,
} from '@/types/graph-adapter';
import { v4 as uuidv4 } from 'uuid';

// graphAdapter instance will be created on-demand inside actions where needed, or globally if preferred
// For now, let's create it on demand in deleteNode to ensure it uses the imported utility.
// const graphAdapter = new GraphAdapterUtility(); // This would make it global

const uniqueNodeId = () => `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () => `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
<<<<<<< HEAD

=======
>>>>>>> master
  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;
  debugLogs: string[];
<<<<<<< HEAD

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
=======
  stagedMapData: ConceptMapData | null;
  isStagingActive: boolean;
  conceptExpansionPreview: ConceptExpansionPreviewState | null;
  updateConceptExpansionPreviewNode: (previewNodeId: string, newText: string, newDetails?: string) => void;
  isConnectingMode: boolean;
  connectionSourceNodeId: string | null;
  dragPreviewItem: { text: string; type: string; } | null;
  dragPreviewPosition: { x: number; y: number; } | null;
  draggedRelationLabel: string | null;
  triggerFitView: boolean;
  structuralSuggestions: z.infer<typeof StructuralSuggestionItemSchema>[];
>>>>>>> master

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
<<<<<<< HEAD
  setInitialLoadComplete: (complete: boolean) => void; 
=======
  setInitialLoadComplete: (complete: boolean) => void;
>>>>>>> master
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
<<<<<<< HEAD
  addNode: (options: { text: string; type: string; position: { x: number; y: number }; details?: string; parentNode?: string; backgroundColor?: string; shape?: 'rectangle' | 'ellipse'; width?: number; height?: number; }) => string;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => string;
=======
  addNode: (options: { id?: string; text: string; type: string; position: { x: number; y: number }; details?: string; parentNode?: string; backgroundColor?: string; shape?: 'rectangle' | 'ellipse'; width?: number; height?: number; }) => string;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (options: { id?: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => string;
>>>>>>> master
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  setStagedMapData: (data: ConceptMapData | null) => void;
  clearStagedMapData: () => void;
  commitStagedMapData: () => void;
  deleteFromStagedMapData: (elementIds: string[]) => void;
  setConceptExpansionPreview: (preview: ConceptExpansionPreviewState | null) => void;
<<<<<<< HEAD
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
=======
  updateConceptExpansionPreviewNodeText: (previewNodeId: string, newText: string) => void;
  updatePreviewNode: (parentNodeId: string, previewNodeId: string, updates: Partial<ConceptExpansionPreviewNode>) => void;
  applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;
  startConnectionMode: (nodeId: string) => void;
  completeConnectionMode: () => void;
  cancelConnectionMode: () => void;
  setDragPreview: (item: { text: string; type: string; } | null) => void;
  updateDragPreviewPosition: (position: { x: number; y: number; } | null) => void;
  clearDragPreview: () => void;
  setDraggedRelationPreview: (label: string | null) => void;
  setTriggerFitView: (value: boolean) => void;

  setStructuralSuggestions: (suggestions: z.infer<typeof StructuralSuggestionItemSchema>[]) => void;
  addStructuralSuggestion: (suggestion: z.infer<typeof StructuralSuggestionItemSchema>) => void;
  updateStructuralSuggestion: (updatedSuggestion: Partial<z.infer<typeof StructuralSuggestionItemSchema>> & { id: string }) => void;
  removeStructuralSuggestion: (suggestionId: string) => void;
  clearStructuralSuggestions: () => void;
  findEdgeByNodes: (sourceId: string, targetId: string) => ConceptMapEdge | undefined;
  applyFormGroupSuggestion: (nodeIds: string[], groupName: string | undefined, overlayGeometry?: { x: number; y: number; width?: number; height?: number }) => string;
>>>>>>> master
}

const initialStateBaseOmitKeys = [
  'setMapId', 'setMapName', 'setCurrentMapOwnerId', 'setCurrentMapCreatedAt', 'setIsPublic',
  'setSharedWithClassroomId', 'setIsNewMapMode', 'setIsViewOnlyMode', 'setInitialLoadComplete', 'setIsLoading', 'setIsSaving', 'setError',
  'setSelectedElement', 'setMultiSelectedNodeIds', 'setEditingNodeId', 'setAiProcessingNodeId',
  'setAiExtractedConcepts', 'setAiSuggestedRelations',
  'resetAiSuggestions', 'removeExtractedConceptsFromSuggestions', 'removeSuggestedRelationsFromSuggestions',
  'addDebugLog', 'clearDebugLogs',
  'initializeNewMap', 'setLoadedMap', 'importMapData', 'resetStore',
  'addNode', 'updateNode', 'deleteNode', 'addEdge', 'updateEdge', 'deleteEdge',
  'setStagedMapData', 'clearStagedMapData', 'commitStagedMapData', 'deleteFromStagedMapData',
  'setConceptExpansionPreview', 'updatePreviewNode',
  'updateConceptExpansionPreviewNodeText',
  'applyLayout',
  'startConnectionMode', 'completeConnectionMode', 'cancelConnectionMode',
  'startConnection', 'cancelConnection', 'finishConnectionAttempt',
  'setDragPreview', 'updateDragPreviewPosition', 'clearDragPreview',
  'setDraggedRelationPreview', 'setTriggerFitView',
  'updateConceptExpansionPreviewNode',
  'setStructuralSuggestions', 'addStructuralSuggestion',
  'updateStructuralSuggestion', 'removeStructuralSuggestion', 'clearStructuralSuggestions',
  'applyFormGroupSuggestion',
] as const;
type InitialStateBaseOmitType = typeof initialStateBaseOmitKeys[number];

<<<<<<< HEAD
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
=======
const initialStateBase: Omit<ConceptMapState, InitialStateBaseOmitType> = {
>>>>>>> master
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
<<<<<<< HEAD
  isConnectingMode: false, // For general connection mode (e.g. drag from handle)
  connectionSourceNodeId: null, // Source for general connection mode
=======
  isConnectingMode: false,
  connectionSourceNodeId: null,
>>>>>>> master
  dragPreviewItem: null,
  dragPreviewPosition: null,
  draggedRelationLabel: null,
  triggerFitView: false,
<<<<<<< HEAD
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
=======
  structuralSuggestions: [],
};

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds' | 'editingNodeId' | 'stagedMapData' | 'isStagingActive' | 'conceptExpansionPreview'>;
export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;
>>>>>>> master

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
<<<<<<< HEAD
      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type, multiSelectedNodeIds: id && type === 'node' ? [id] : [] }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),
      startConnection: (nodeId) => { /* ... */ }, // For button-initiated connection
      cancelConnection: () => { /* ... */ },   // For button-initiated connection
      finishConnectionAttempt: (targetNodeId) => { /* ... */ }, // For button-initiated connection
=======
      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),
      startConnection: (nodeId) => set({ connectingNodeId: nodeId, selectedElementId: null, selectedElementType: null, multiSelectedNodeIds: [] }),
      cancelConnection: () => set({ connectingNodeId: null }),
      finishConnectionAttempt: () => set({ connectingNodeId: null }),
>>>>>>> master
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
<<<<<<< HEAD
          )
        )
      })),
      addDebugLog: (log) => set((state) => ({
        debugLogs: [...state.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100)
=======
          ))
>>>>>>> master
      })),
      addDebugLog: (log) => set((state) => ({ debugLogs: [...state.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100) })),
      clearDebugLogs: () => set({ debugLogs: [] }),
<<<<<<< HEAD
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
=======
      initializeNewMap: (userId: string) => {
        get().addDebugLog(`[STORE initializeNewMap] User: ${userId}.`);
        const newMapState = { ...initialStateBase, mapId: 'new', mapName: 'New Concept Map', mapData: { nodes: [], edges: [] }, currentMapOwnerId: userId, currentMapCreatedAt: new Date().toISOString(), isNewMapMode: true, isViewOnlyMode: false, isLoading: false, initialLoadComplete: true, debugLogs: get().debugLogs, structuralSuggestions: [] };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => {
        get().addDebugLog(`[STORE setLoadedMap] Map ID: ${map.id}, ViewOnly: ${viewOnly}`);
        set({ mapId: map.id, mapName: map.name, currentMapOwnerId: map.ownerId, currentMapCreatedAt: map.createdAt, isPublic: map.isPublic, sharedWithClassroomId: map.sharedWithClassroomId || null, mapData: map.mapData || { nodes: [], edges: [] }, isNewMapMode: false, isViewOnlyMode: viewOnly, isLoading: false, initialLoadComplete: true, error: null, debugLogs: get().debugLogs, structuralSuggestions: [] });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => {
        const newName = fileName ? fileName : `Imported: ${get().mapName}`;
        get().addDebugLog(`[STORE importMapData] New Name: ${newName}`);
        set((state) => ({ mapData: importedData, mapName: newName, selectedElementId: null, selectedElementType: null, multiSelectedNodeIds: [], editingNodeId: null, mapId: state.isNewMapMode ? 'new' : state.mapId, isViewOnlyMode: false,isLoading: false, initialLoadComplete: true, error: null, debugLogs: get().debugLogs, structuralSuggestions: [] }));
        useConceptMapStore.temporal.getState().clear();
      },
      resetStore: () => { set({ ...initialStateBase, initialLoadComplete: false, debugLogs: [], structuralSuggestions: [] }); useConceptMapStore.temporal.getState().clear(); },
      addNode: (options) => {
        const newNodeId = options.id || uniqueNodeId();
        const newNode: ConceptMapNode = { id: newNodeId, text: options.text, type: options.type, x: options.position.x, y: options.position.y, details: options.details || '', parentNode: options.parentNode, childIds: [], backgroundColor: options.backgroundColor, shape: options.shape || 'rectangle', width: options.width ?? 150, height: options.height ?? 70 };
        set((state) => {
          let newNodes = [...state.mapData.nodes, newNode];
          if (options.parentNode) {
            const parentIndex = newNodes.findIndex(n => n.id === options.parentNode);
            if (parentIndex !== -1) { const parentNode = { ...newNodes[parentIndex] }; parentNode.childIds = [...(parentNode.childIds || []), newNode.id]; newNodes[parentIndex] = parentNode; }
          }
          return { mapData: { ...state.mapData, nodes: newNodes } };
        });
        return newNodeId;
      },
      updateNode: (nodeId, updates) => set((state) => ({ mapData: { ...state.mapData, nodes: state.mapData.nodes.map((node) => node.id === nodeId ? { ...node, ...updates } : node) } })),
      deleteNode: (nodeIdToDelete) => {
        get().addDebugLog(`[STORE deleteNode GraphAdapter] Attempting to delete node: ${nodeIdToDelete} and its descendants.`);
        set((state) => {
          const currentNodes = state.mapData.nodes;
          const currentEdges = state.mapData.edges;

          // Use the imported GraphAdapterUtility
          const graphUtil = new GraphAdapterUtility();
          const graphInstance = graphUtil.fromArrays(currentNodes, currentEdges);

          if (!graphInstance.hasNode(nodeIdToDelete)) { // graphology's hasNode
            get().addDebugLog(`[STORE deleteNode GraphAdapter] Node ${nodeIdToDelete} not found in graph. No changes made.`);
            return state;
          }

          const descendants = graphUtil.getDescendants(graphInstance, nodeIdToDelete);
          const nodesToDeleteSet = new Set<string>([nodeIdToDelete, ...descendants]);

          const finalNodesToKeep = currentNodes.filter(node => !nodesToDeleteSet.has(node.id)).map(node => ({ ...node, childIds: node.childIds?.filter(childId => !nodesToDeleteSet.has(childId)) }));
          const edgesToKeep = currentEdges.filter(edge => !nodesToDeleteSet.has(edge.source) && !nodesToDeleteSet.has(edge.target));

          let { selectedElementId, selectedElementType } = state;
          if (selectedElementId && nodesToDeleteSet.has(selectedElementId)) { selectedElementId = null; selectedElementType = null; }

          return {
            mapData: { nodes: finalNodesToKeep, edges: edgesToKeep },
            selectedElementId,
            selectedElementType,
            multiSelectedNodeIds: state.multiSelectedNodeIds.filter(id => !nodesToDeleteSet.has(id)),
            aiProcessingNodeId: state.aiProcessingNodeId && nodesToDeleteSet.has(state.aiProcessingNodeId) ? null : state.aiProcessingNodeId,
            editingNodeId: state.editingNodeId && nodesToDeleteSet.has(state.editingNodeId) ? null : state.editingNodeId
          };
        });
      },
      addEdge: (options) => {
        const newEdgeId = options.id || uniqueEdgeId();
        const newEdge: ConceptMapEdge = { id: newEdgeId, source: options.source, target: options.target, sourceHandle: options.sourceHandle || null, targetHandle: options.targetHandle || null, label: options.label || 'connects', color: options.color, lineType: options.lineType || 'solid', markerStart: options.markerStart || 'none', markerEnd: options.markerEnd || 'arrowclosed' };
        set((state) => ({ mapData: { ...state.mapData, edges: [...state.mapData.edges, newEdge] } }));
        return newEdgeId;
      },
      updateEdge: (edgeId, updates) => set((state) => ({ mapData: { ...state.mapData, edges: state.mapData.edges.map((edge) => edge.id === edgeId ? { ...edge, ...updates } : edge) } })),
      deleteEdge: (edgeId) => set((state) => ({ mapData: { ...state.mapData, edges: state.mapData.edges.filter((edge) => edge.id !== edgeId) }, selectedElementId: state.selectedElementId === edgeId ? null : state.selectedElementId, selectedElementType: state.selectedElementId === edgeId ? null : state.selectedElementType })),
      setStagedMapData: (data) => set({ stagedMapData: data, isStagingActive: !!data }),
      clearStagedMapData: () => set({ stagedMapData: null, isStagingActive: false }),
      commitStagedMapData: () => {
        const stagedData = get().stagedMapData; if (!stagedData) return;
        set((state) => ({ mapData: { nodes: [...state.mapData.nodes, ...stagedData.nodes.map(n => ({ ...n, id: uniqueNodeId() }))], edges: [...(state.mapData.edges || []), ...(stagedData.edges || []).map(e => ({ ...e, id: uniqueEdgeId() }))] }, stagedMapData: null, isStagingActive: false }));
      },
      deleteFromStagedMapData: (elementIdsToRemove) => {
        const currentStagedData = get().stagedMapData; if (!currentStagedData) return;
        const newStagedNodes = currentStagedData.nodes.filter(node => !elementIdsToRemove.includes(node.id));
        const remainingNodeIds = new Set(newStagedNodes.map(node => node.id));
        const newStagedEdges = (currentStagedData.edges || []).filter(edge => !elementIdsToRemove.includes(edge.id) && remainingNodeIds.has(edge.source) && remainingNodeIds.has(edge.target));
        if (newStagedNodes.length === 0 && newStagedEdges.length === 0) { set({ stagedMapData: null, isStagingActive: false }); } else { set({ stagedMapData: { nodes: newStagedNodes, edges: newStagedEdges }, isStagingActive: true }); }
      },
      setConceptExpansionPreview: (preview) => set({ conceptExpansionPreview: preview }),
      updateConceptExpansionPreviewNodeText: (previewNodeId, newText) => {
        const currentPreview = get().conceptExpansionPreview;
        if (currentPreview && currentPreview.previewNodes) {
          const updatedPreviewNodes = currentPreview.previewNodes.map(node => node.id === previewNodeId ? { ...node, text: newText } : node);
          set({ conceptExpansionPreview: { ...currentPreview, previewNodes: updatedPreviewNodes } });
        }
      },
      updatePreviewNode: (parentNodeId, previewNodeId, updates) => {
        set((state) => {
          if (!state.conceptExpansionPreview || state.conceptExpansionPreview.parentNodeId !== parentNodeId) return state;
          const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node => node.id === previewNodeId ? { ...node, ...updates } : node);
          return { ...state, conceptExpansionPreview: { ...state.conceptExpansionPreview, previewNodes: updatedPreviewNodes } };
        });
      },
      updateConceptExpansionPreviewNode: (previewNodeId, newText, newDetails) => {
        set((state) => {
          if (!state.conceptExpansionPreview || !state.conceptExpansionPreview.previewNodes) return state;
          const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node => node.id === previewNodeId ? { ...node, text: newText, details: newDetails !== undefined ? newDetails : node.details } : node);
          return { ...state, conceptExpansionPreview: { ...state.conceptExpansionPreview, previewNodes: updatedPreviewNodes } };
        });
      },
      applyLayout: (updatedNodePositions) => { set((state) => {
          const updatedNodesMap = new Map<string, LayoutNodeUpdate>(); updatedNodePositions.forEach(update => updatedNodesMap.set(update.id, update));
          const newNodes = state.mapData.nodes.map(node => { const updateForNode = updatedNodesMap.get(node.id); if (updateForNode) { return { ...node, x: updateForNode.x, y: updateForNode.y }; } return node; });
          if (newNodes.some((nn, i) => nn.x !== state.mapData.nodes[i].x || nn.y !== state.mapData.nodes[i].y)) { return { mapData: { ...state.mapData, nodes: newNodes } }; } return state;
        }); set({ triggerFitView: true });
      },
      startConnectionMode: (nodeId) => set({ isConnectingMode: true, connectionSourceNodeId: nodeId, selectedElementId: null, selectedElementType: null, multiSelectedNodeIds: [] }),
      completeConnectionMode: () => set({ isConnectingMode: false, connectionSourceNodeId: null }),
      cancelConnectionMode: () => set({ isConnectingMode: false, connectionSourceNodeId: null, dragPreviewItem: null, draggedRelationLabel: null }),
      setDragPreview: (item) => set({ dragPreviewItem: item }),
      updateDragPreviewPosition: (position) => set({ dragPreviewPosition: position }),
      clearDragPreview: () => set({ dragPreviewItem: null, dragPreviewPosition: null }),
      setDraggedRelationPreview: (label) => set({ draggedRelationLabel: label }),
      setTriggerFitView: (value) => set({ triggerFitView: value }),

      setStructuralSuggestions: (suggestions) => set({ structuralSuggestions: suggestions }),
      addStructuralSuggestion: (suggestion) => set((state) => ({ structuralSuggestions: [...state.structuralSuggestions, suggestion] })),
      updateStructuralSuggestion: (updatedSuggestion) => set((state) => ({
        structuralSuggestions: state.structuralSuggestions.map(s => s.id === updatedSuggestion.id ? { ...s, ...updatedSuggestion } : s)
      })),
      removeStructuralSuggestion: (suggestionId) => set((state) => ({
        structuralSuggestions: state.structuralSuggestions.filter(s => s.id !== suggestionId)
      })),
      clearStructuralSuggestions: () => set({ structuralSuggestions: [] }),
      findEdgeByNodes: (sourceId, targetId) => {
        const { mapData } = get();
        return mapData.edges.find(edge =>
          (edge.source === sourceId && edge.target === targetId) ||
          (edge.source === targetId && edge.target === sourceId)
        );
      },
      applyFormGroupSuggestion: (nodeIds, groupName, overlayGeometry) => {
        const { addNode: addNodeAction, updateNode: updateNodeAction } = get();
        let groupNodeX = 100, groupNodeY = 100;
        if (overlayGeometry && overlayGeometry.x !== undefined && overlayGeometry.y !== undefined) {
            groupNodeX = overlayGeometry.x + (overlayGeometry.width || 300) / 2 - 75;
            groupNodeY = overlayGeometry.y + 20;
        } else {
            const groupNodes = get().mapData.nodes.filter(n => nodeIds.includes(n.id) && n.x !== undefined && n.y !== undefined);
            if (groupNodes.length > 0) {
                groupNodeX = groupNodes.reduce((acc, n) => acc + n.x!, 0) / groupNodes.length;
                groupNodeY = groupNodes.reduce((acc, n) => acc + n.y!, 0) / groupNodes.length - 50;
            }
        }
        const newGroupId = addNodeAction({
          text: groupName || 'New Group',
          type: 'customConceptNode',
          position: { x: groupNodeX, y: groupNodeY },
          width: overlayGeometry?.width ? Math.max(overlayGeometry.width * 0.8, 200) : 200,
          height: undefined,
        });
        nodeIds.forEach(nodeId => {
          const nodeToUpdate = get().mapData.nodes.find(n => n.id === nodeId);
          if (nodeToUpdate) {
             updateNodeAction(nodeId, { parentNode: newGroupId });
          }
        });
        get().addDebugLog(`[STORE applyFormGroupSuggestion] Group node ${newGroupId} created. Children: ${nodeIds.join(', ')} parented.`);
        return newGroupId;
      },
    }),
    {
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview };
>>>>>>> master
      },
      limit: 50,
    }
  )
);

export default useConceptMapStore;
