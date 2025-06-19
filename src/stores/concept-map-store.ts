
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState as ZundoTemporalState } from 'zundo';
<<<<<<< HEAD
import { runFlow } from '@genkit-ai/flow';
import { suggestMapImprovementsFlow, semanticTidyUpFlow, type SemanticTidyUpRequest } from '@/ai/flows'; // Added semanticTidyUpFlow and types
=======
// import Graph from 'graphology'; // No longer needed directly here if using adapter
import { GraphAdapterUtility } from '../../lib/graphologyAdapter'; // Import the utility
>>>>>>> master

import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import type { LayoutNodeUpdate, GraphologyInstance } from '@/types/graph-adapter'; // Assuming GraphologyInstance is here

// Local GraphAdapter related types are removed as we now import GraphAdapterUtility and use types from graph-adapter.ts

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
  editingNodeId: string | null; // For auto-focusing node label input
  aiProcessingNodeId: string | null;
  connectingNodeId: string | null; // For initiating edge creation from a node

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;

  debugLogs: string[];

  // Staging area state
  stagedMapData: ConceptMapData | null;
  isStagingActive: boolean;

// Concept expansion preview state
conceptExpansionPreview: ConceptExpansionPreviewState | null;
updateConceptExpansionPreviewNode: (previewNodeId: string, newText: string, newDetails?: string) => void; // New action

connectingState: { sourceNodeId: string; sourceHandleId?: string | null; } | null;

// Drag preview state
dragPreviewItem: { text: string; type: string; } | null;
dragPreviewPosition: { x: number; y: number; } | null;
draggedRelationLabel: string | null; // New state for edge label preview

  triggerFitView: boolean; // For auto-layout fitView trigger

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
  setEditingNodeId: (nodeId: string | null) => void; // Action for auto-focus
  setAiProcessingNodeId: (nodeId: string | null) => void;
  startConnection: (nodeId: string) => void;
  cancelConnection: () => void;
  finishConnectionAttempt: (targetNodeId: string) => void; // Renamed

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

  addEdge: (options: { source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null; label?: string; color?: string; lineType?: 'solid' | 'dashed'; markerStart?: string; markerEnd?: string; }) => string; // Changed return type to string
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;

  // Staging area actions
  setStagedMapData: (data: ConceptMapData | null) => void;
  clearStagedMapData: () => void;
  commitStagedMapData: () => void;
deleteFromStagedMapData: (elementIds: string[]) => void;

// Concept expansion preview actions
setConceptExpansionPreview: (preview: ConceptExpansionPreviewState | null) => void;
updatePreviewNode: (parentNodeId: string, previewNodeId: string, updates: Partial<ConceptExpansionPreviewNode>) => void; // Added action

// Layout action
applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;
<<<<<<< HEAD
tidySelectedNodes: () => void;

// Structural suggestions
isFetchingStructuralSuggestions: boolean;
structuralSuggestions: ProcessedSuggestedEdge[] | null; // For edges
structuralGroupSuggestions: ProcessedSuggestedGroup[] | null; // For groups
fetchStructuralSuggestions: () => Promise<void>;
acceptStructuralSuggestion: (suggestionId: string) => void;
dismissStructuralSuggestion: (suggestionId: string) => void;
acceptGroupSuggestion: (suggestionId: string, options?: { createParentNode?: boolean }) => void; // New
dismissGroupSuggestion: (suggestionId: string) => void; // New
clearAllStructuralSuggestions: () => void;

// Semantic Tidy Up
isApplyingSemanticTidyUp: boolean;
applySemanticTidyUp: () => Promise<void>;

// Pending relation for edge creation from drag-and-drop
pendingRelationForEdgeCreation: { label: string; sourceNodeId: string; sourceNodeHandle?: string | null; } | null;
setPendingRelationForEdgeCreation: (data: { label: string; sourceNodeId: string; sourceNodeHandle?: string | null; } | null) => void;
clearPendingRelationForEdgeCreation: () => void;
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
=======

// Connection mode actions
startConnectionMode: (nodeId: string, handleId?: string | null) => void;
completeConnectionMode: (targetNodeId: string, targetHandleId?: string | null) => void;
cancelConnectionMode: () => void;

// Drag preview actions
setDragPreview: (item: { text: string; type: string } | null, position?: { x: number; y: number } | null) => void;
updateDragPreviewPosition: (position: { x: number; y: number }) => void;
clearDragPreview: () => void;
setDraggedRelationPreview: (label: string | null) => void; // New action

  setTriggerFitView: (value: boolean) => void; // Action for fitView trigger
}

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds' | 'editingNodeId' | 'stagedMapData' | 'isStagingActive' | 'conceptExpansionPreview' /* triggerFitView, connectingState, dragPreviewItem, dragPreviewPosition, draggedRelationLabel are not tracked */>;
>>>>>>> master

export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;


const initialStateBase: Omit<ConceptMapState,
  'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' |
  'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' |
  'setSelectedElement' | 'setMultiSelectedNodeIds' | 'setEditingNodeId' | 'setAiProcessingNodeId' |
  'setAiExtractedConcepts' | 'setAiSuggestedRelations' |
  'resetAiSuggestions' | 'removeExtractedConceptsFromSuggestions' | 'removeSuggestedRelationsFromSuggestions' |
  'addDebugLog' | 'clearDebugLogs' |
  'initializeNewMap' | 'setLoadedMap' | 'importMapData' | 'resetStore' |
  'addNode' | 'updateNode' | 'deleteNode' | 'addEdge' | 'updateEdge' | 'deleteEdge' |
  'setStagedMapData' | 'clearStagedMapData' | 'commitStagedMapData' | 'deleteFromStagedMapData' |
<<<<<<< HEAD
  'setConceptExpansionPreview' | 'updateConceptExpansionPreviewNode' | 'applyLayout' | 'tidySelectedNodes' |
  'startConnection' | 'cancelConnection' | 'finishConnectionAttempt' |
  // Structural suggestions
  'fetchStructuralSuggestions' | 'acceptStructuralSuggestion' | 'dismissStructuralSuggestion' |
  'acceptGroupSuggestion' | 'dismissGroupSuggestion' | 'clearAllStructuralSuggestions' |
  // Semantic Tidy Up
  'applySemanticTidyUp' |
  // Pending Relation
  'setPendingRelationForEdgeCreation' | 'clearPendingRelationForEdgeCreation'
=======
  'setConceptExpansionPreview' | 'updatePreviewNode' |
  'applyLayout' |
  'startConnectionMode' | 'completeConnectionMode' | 'cancelConnectionMode' |
  'setDragPreview' | 'updateDragPreviewPosition' | 'clearDragPreview' |
  'setDraggedRelationPreview' | 'setTriggerFitView' // Added to Omit
>>>>>>> master
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
  connectingNodeId: null,
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  debugLogs: [],
  stagedMapData: null,
  isStagingActive: false,
  conceptExpansionPreview: null,
<<<<<<< HEAD
  // Structural suggestions initial state
  isFetchingStructuralSuggestions: false,
  structuralSuggestions: null,
  structuralGroupSuggestions: null,
  // Semantic Tidy Up initial state
  isApplyingSemanticTidyUp: false,
  // Pending relation initial state
  pendingRelationForEdgeCreation: null,
=======
  connectingState: null,
  dragPreviewItem: null,
  dragPreviewPosition: null,
  draggedRelationLabel: null, // Initial value for new state
  triggerFitView: false, // Initial value for new state
>>>>>>> master
};

// Define ConceptExpansionPreviewNode and ConceptExpansionPreviewState types
export interface ConceptExpansionPreviewNode {
  id: string; // Temporary ID, e.g., "preview-node-1"
  text: string;
  relationLabel: string; // Label for the edge connecting to parent
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

      setSelectedElement: (id, type) => set({ selectedElementId: id, selectedElementType: type }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),

      startConnection: (nodeId) => {
        get().addDebugLog(`[STORE startConnection] Starting connection from node: ${nodeId}`);
        set({ connectingNodeId: nodeId, selectedElementId: null, selectedElementType: null, multiSelectedNodeIds: [] }); // Clear selection when starting connection
      },
      cancelConnection: () => {
        get().addDebugLog(`[STORE cancelConnection] Cancelling connection. Was: ${get().connectingNodeId}`);
        set({ connectingNodeId: null });
      },
      finishConnectionAttempt: (targetNodeId) => { // Renamed
        const sourceNodeId = get().connectingNodeId;
        if (!sourceNodeId) {
          get().addDebugLog(`[STORE finishConnectionAttempt] No source node to complete connection. Target: ${targetNodeId}`);
          return;
        }
        get().addDebugLog(`[STORE finishConnectionAttempt] Attempting to complete connection from ${sourceNodeId} to ${targetNodeId}`);
        // Actual edge creation will be handled by FlowCanvasCore or a similar component
        // that calls addEdge. For now, just reset connectingNodeId.
        set({ connectingNodeId: null });
        // Potentially, select the new edge after creation, or the source/target node.
        // This might be handled by the component initiating addEdge.
      },

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

      initializeNewMap: (userId: string) => {
        const previousMapId = get().mapId;
        const previousIsNewMapMode = get().isNewMapMode;
        get().addDebugLog(`[STORE] INITIALIZE_NEW_MAP CALLED! User: ${userId}. Prev mapId: ${previousMapId}, prevIsNew: ${previousIsNewMapMode}.`);
        get().addDebugLog(`[STORE initializeNewMap V11] Setting mapData to empty nodes/edges. User: ${userId}.`);

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
          initialLoadComplete: true, 
          multiSelectedNodeIds: [],
          editingNodeId: null, 
          aiProcessingNodeId: null,
          isPublic: initialStateBase.isPublic,
          sharedWithClassroomId: initialStateBase.sharedWithClassroomId,
          debugLogs: get().debugLogs,
        };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => {
        get().addDebugLog(`[STORE] SET_LOADED_MAP CALLED! Map ID: ${map.id}, Name: ${map.name}, ViewOnly: ${viewOnly}`);
        get().addDebugLog(`[STORE setLoadedMap V11] Received map ID '${map.id}'. MapData nodes count: ${map.mapData?.nodes?.length ?? 'undefined/null'}, edges count: ${map.mapData?.edges?.length ?? 'undefined/null'}. ViewOnly: ${viewOnly}`);
        if (!map.mapData || !map.mapData.nodes || map.mapData.nodes.length === 0) {
          get().addDebugLog(`[STORE setLoadedMap V12] Map '${map.id}' ('${map.name}') is being loaded with 0 nodes.`);
        }
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
          initialLoadComplete: true, 
          error: null,
          multiSelectedNodeIds: [],
          editingNodeId: null, 
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiProcessingNodeId: null,
          debugLogs: get().debugLogs,
        });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => {
        const currentMapName = get().mapName;
        const newName = fileName ? `${fileName}` : `Imported: ${currentMapName}`;
        get().addDebugLog(`[STORE] IMPORT_MAP_DATA CALLED! New Name: ${newName}`);

        set((state) => ({
          mapData: importedData,
          mapName: newName,
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [],
          editingNodeId: null,
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          aiProcessingNodeId: null,
          mapId: state.isNewMapMode ? 'new' : state.mapId,
          isNewMapMode: state.isNewMapMode,
          isViewOnlyMode: false,
          isLoading: false,
          initialLoadComplete: true, 
          isSaving: false,
          error: null,
          debugLogs: get().debugLogs,
        }));
        useConceptMapStore.temporal.getState().clear();
      },
      resetStore: () => {
        get().addDebugLog(`[STORE] RESET_STORE CALLED!`);
        set({ ...initialStateBase, initialLoadComplete: false, debugLogs: [] });
        useConceptMapStore.temporal.getState().clear();
      },

      addNode: (options) => {
        // Define default dimensions
        const NODE_DEFAULT_WIDTH = 150;
        const NODE_DEFAULT_HEIGHT = 70;

        // Original log for options can be kept or removed if too verbose
        // get().addDebugLog(`[STORE addNode] Attempting to add node with options: ${JSON.stringify(options)}`);

        const newNode: ConceptMapNode = {
          id: uniqueNodeId(),
          text: options.text,
          type: options.type,
          x: options.position.x,
          y: options.position.y,
          details: options.details || '',
          parentNode: options.parentNode,
          childIds: [], // Initialize childIds for the new node
          backgroundColor: options.backgroundColor || undefined,
          shape: options.shape || 'rectangle',
          width: options.width ?? NODE_DEFAULT_WIDTH,
          height: options.height ?? NODE_DEFAULT_HEIGHT,
        };

        // New log for the created newNode object
        get().addDebugLog(`[STORE addNode] newNode object created: ${JSON.stringify(newNode)}`);

        set((state) => {
          let newNodes = [...state.mapData.nodes, newNode];
          // If this node has a parent, update the parent's childIds
          if (options.parentNode) {
            const parentIndex = newNodes.findIndex(n => n.id === options.parentNode);
            if (parentIndex !== -1) {
              const parentNode = { ...newNodes[parentIndex] };
              parentNode.childIds = [...(parentNode.childIds || []), newNode.id];
              newNodes[parentIndex] = parentNode;
            }
          }
          get().addDebugLog(`[STORE addNode] Successfully added. Nodes count: ${newNodes.length}. Last node ID: ${newNode.id}`);
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

      deleteNode: (nodeIdToDelete) => {
        get().addDebugLog(`[STORE deleteNode GraphAdapter] Attempting to delete node: ${nodeIdToDelete} and its descendants.`);
        set((state) => {
          const currentNodes = state.mapData.nodes;
          const currentEdges = state.mapData.edges;
          const graphAdapter = new GraphAdapterUtility();

          const graphInstance = graphAdapter.fromArrays(currentNodes, currentEdges);

          if (!graphInstance.hasNode(nodeIdToDelete)) {
            get().addDebugLog(`[STORE deleteNode GraphAdapter] Node ${nodeIdToDelete} not found in graph. No changes made.`);
            return state; // Return current state if node doesn't exist
          }

          const descendants = graphAdapter.getDescendants(graphInstance, nodeIdToDelete);
          const allNodeIdsToDelete = new Set<string>([nodeIdToDelete, ...descendants]);
          get().addDebugLog(`[STORE deleteNode GraphAdapter] Nodes to delete (incl. descendants): ${JSON.stringify(Array.from(allNodeIdsToDelete))}`);

          const nodesToKeepIntermediate = currentNodes.filter(node => !allNodeIdsToDelete.has(node.id));
          const edgesToKeep = currentEdges.filter(edge =>
            !allNodeIdsToDelete.has(edge.source) && !allNodeIdsToDelete.has(edge.target)
          );

          // Update childIds for parents of any deleted nodes (only considering parents that are NOT themselves deleted)
          const finalNodesToKeep = nodesToKeepIntermediate.map(node => {
            if (node.childIds && node.childIds.length > 0) {
              const newChildIds = node.childIds.filter(childId => !allNodeIdsToDelete.has(childId));
              if (newChildIds.length !== node.childIds.length) {
                get().addDebugLog(`[STORE deleteNode GraphAdapter] Updating parent ${node.id}, removing deleted children. Old childIds: ${JSON.stringify(node.childIds)}, New: ${JSON.stringify(newChildIds)}`);
                return { ...node, childIds: newChildIds };
              }
            }
            return node;
          });

          // Clear selection if any of the deleted nodes were selected
          let newSelectedElementId = state.selectedElementId;
          let newSelectedElementType = state.selectedElementType;

          if (state.selectedElementId && allNodeIdsToDelete.has(state.selectedElementId)) {
            newSelectedElementId = null;
            newSelectedElementType = null;
            get().addDebugLog(`[STORE deleteNode GraphAdapter] Cleared selection as a deleted node was selected.`);
          } else if (state.selectedElementType === 'edge' && state.selectedElementId) {
            // If an edge was selected, check if it was removed
            const selectedEdgeWasRemoved = !edgesToKeep.find(e => e.id === state.selectedElementId);
            if (selectedEdgeWasRemoved) {
              newSelectedElementId = null;
              newSelectedElementType = null;
              get().addDebugLog(`[STORE deleteNode GraphAdapter] Cleared selection as a selected edge was removed.`);
            }
          }

          const newMultiSelectedNodeIds = state.multiSelectedNodeIds.filter(id => !allNodeIdsToDelete.has(id));
          const newAiProcessingNodeId = state.aiProcessingNodeId && allNodeIdsToDelete.has(state.aiProcessingNodeId) ? null : state.aiProcessingNodeId;
          const newEditingNodeId = state.editingNodeId && allNodeIdsToDelete.has(state.editingNodeId) ? null : state.editingNodeId;

          get().addDebugLog(`[STORE deleteNode GraphAdapter] Deletion complete. Nodes remaining: ${finalNodesToKeep.length}, Edges remaining: ${edgesToKeep.length}`);
          return {
            mapData: {
              nodes: finalNodesToKeep,
              edges: edgesToKeep,
            },
            selectedElementId: newSelectedElementId,
            selectedElementType: newSelectedElementType,
            multiSelectedNodeIds: newMultiSelectedNodeIds,
            aiProcessingNodeId: newAiProcessingNodeId,
            editingNodeId: newEditingNodeId,
          };
        });
      },

      addEdge: (options) => {
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
        set((state) => ({ mapData: { ...state.mapData, edges: [...state.mapData.edges, newEdge] } }));
        return newEdge.id; // Return the new edge's ID
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
      }),

      // Staging area action implementations
      setStagedMapData: (data) => {
        get().addDebugLog(`[STORE setStagedMapData] Setting staged data. Nodes: ${data?.nodes?.length ?? 0}, Edges: ${data?.edges?.length ?? 0}`);
        set({ stagedMapData: data, isStagingActive: !!data });
      },
      clearStagedMapData: () => {
        get().addDebugLog(`[STORE clearStagedMapData] Clearing staged data.`);
        set({ stagedMapData: null, isStagingActive: false });
      },
      commitStagedMapData: () => {
        const stagedData = get().stagedMapData;
        if (!stagedData) {
          get().addDebugLog('[STORE commitStagedMapData] No staged data to commit.');
          return;
        }
        get().addDebugLog(`[STORE commitStagedMapData] Committing ${stagedData.nodes.length} nodes and ${stagedData.edges.length} edges.`);

        // Simplified merge for now, ensuring new IDs.
        // Positioning and more complex ID remapping will be handled later.
        set((state) => ({
          mapData: {
            nodes: [
              ...state.mapData.nodes,
              // Ensure new IDs on commit to avoid conflicts if items were somehow derived from existing ones
              ...stagedData.nodes.map(n => ({ ...n, id: uniqueNodeId() }))
            ],
            edges: [
              ...(state.mapData.edges || []),
              ...(stagedData.edges || []).map(e => ({ ...e, id: uniqueEdgeId() })) // Ensure new IDs
            ],
          },
          stagedMapData: null,
          isStagingActive: false,
        }));
      },
      deleteFromStagedMapData: (elementIdsToRemove) => {
        if (!get().isStagingActive || !get().stagedMapData) {
          get().addDebugLog('[STORE deleteFromStagedMapData] Staging not active or no data.');
          return;
        }

        const currentStagedData = get().stagedMapData!;
        const newStagedNodes = currentStagedData.nodes.filter(node => !elementIdsToRemove.includes(node.id));

        // Create a set of IDs of nodes that will remain, to filter edges correctly
        const remainingNodeIds = new Set(newStagedNodes.map(node => node.id));

        const newStagedEdges = (currentStagedData.edges || []).filter(edge =>
          !elementIdsToRemove.includes(edge.id) && // Remove if edge itself is selected
          remainingNodeIds.has(edge.source) &&     // Keep if source node still exists
          remainingNodeIds.has(edge.target)        // Keep if target node still exists
        );

        if (newStagedNodes.length === 0) {
          get().addDebugLog(`[STORE deleteFromStagedMapData] All staged nodes removed or orphaned. Clearing staging area.`);
          set({ stagedMapData: null, isStagingActive: false });
        } else {
          get().addDebugLog(`[STORE deleteFromStagedMapData] Removed elements. Remaining: ${newStagedNodes.length} nodes, ${newStagedEdges.length} edges.`);
          set({
            stagedMapData: {
              nodes: newStagedNodes,
              edges: newStagedEdges,
            },
            isStagingActive: true, // Keep active if there are still nodes
          });
        }
      },

      // Concept expansion preview action implementation
      setConceptExpansionPreview: (preview) => {
        get().addDebugLog(`[STORE setConceptExpansionPreview] Setting preview for parent ${preview?.parentNodeId}. Nodes: ${preview?.previewNodes?.length ?? 0}`);
        set({ conceptExpansionPreview: preview });
      },
      updatePreviewNode: (parentNodeId, previewNodeId, updates) => set((state) => {
        if (!state.conceptExpansionPreview || state.conceptExpansionPreview.parentNodeId !== parentNodeId) {
          console.warn('[STORE updatePreviewNode] No matching concept expansion preview active for parentNodeId:', parentNodeId);
          return state;
        }
        const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node =>
          node.id === previewNodeId
            ? { ...node, ...updates }
            : node
        );

        const originalNode = state.conceptExpansionPreview.previewNodes.find(n => n.id === previewNodeId);
        const updatedNode = updatedPreviewNodes.find(n => n.id === previewNodeId);

        if (!originalNode || !updatedNode || JSON.stringify(originalNode) === JSON.stringify(updatedNode)) {
          console.warn('[STORE updatePreviewNode] Preview node not found or no actual update for previewNodeId:', previewNodeId, 'Updates:', updates);
          return state;
        }

        get().addDebugLog(`[STORE updatePreviewNode] Updated preview node ${previewNodeId} for parent ${parentNodeId}. Updates: ${JSON.stringify(updates)}`);
        return {
          ...state,
          conceptExpansionPreview: {
            ...state.conceptExpansionPreview,
            previewNodes: updatedPreviewNodes,
          },
        };
      }),

      updateConceptExpansionPreviewNode: (previewNodeId, newText, newDetails) => {
        set((state) => {
          if (!state.conceptExpansionPreview || !state.conceptExpansionPreview.previewNodes) {
            state.addDebugLog(`[STORE updateConceptExpansionPreviewNode] No active concept expansion preview to update node ${previewNodeId}.`);
            return state; // No preview active, do nothing
          }

          let nodeFoundAndUpdated = false;
          const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node => {
            if (node.id === previewNodeId) {
              state.addDebugLog(`[STORE updateConceptExpansionPreviewNode] Updating preview node ${previewNodeId}. New text: "${newText}", New details: "${newDetails !== undefined ? newDetails : 'no change'}".`);
              nodeFoundAndUpdated = true;
              return {
                ...node,
                text: newText,
                details: newDetails !== undefined ? newDetails : node.details, // Only update details if newDetails is provided
              };
            }
            return node;
          });

          if (!nodeFoundAndUpdated) {
               state.addDebugLog(`[STORE updateConceptExpansionPreviewNode] Preview node ${previewNodeId} not found in current preview. No changes made.`);
               return state; // Node not found, no change
          }

          return {
            ...state,
            conceptExpansionPreview: {
              ...state.conceptExpansionPreview,
              previewNodes: updatedPreviewNodes,
            },
          };
        });
      },

      applyLayout: (updatedNodePositions) => {
        get().addDebugLog(`[STORE applyLayout] Attempting to apply new layout to ${updatedNodePositions.length} nodes.`);
        set((state) => {
          const updatedNodesMap = new Map<string, LayoutNodeUpdate>();
          updatedNodePositions.forEach(update => updatedNodesMap.set(update.id, update));

          const newNodes = state.mapData.nodes.map(node => {
            const updateForNode = updatedNodesMap.get(node.id);
            if (updateForNode) {
              get().addDebugLog(`[STORE applyLayout] Updating node ${node.id}: old pos (x: ${node.x}, y: ${node.y}), new pos (x: ${updateForNode.x}, y: ${updateForNode.y})`);
              return {
                ...node,
                x: updateForNode.x,
                y: updateForNode.y,
              };
            }
            return node;
          });

          const hasChanges = newNodes.some((newNode, index) => {
            const oldNode = state.mapData.nodes[index];
            return oldNode ? (newNode.x !== oldNode.x || newNode.y !== oldNode.y) : true;
          });

          if (hasChanges) {
            get().addDebugLog(`[STORE applyLayout] Layout changes applied. Node count: ${newNodes.length}`);
            return {
              mapData: {
                ...state.mapData,
                nodes: newNodes,
              },
            };
          } else {
            get().addDebugLog(`[STORE applyLayout] No actual position changes detected. State not updated.`);
            return state; // Return current state if no changes
          }
        });
        // After positions are applied (or if no changes but still called), trigger fitView
        // This ensures fitView is attempted even if the layout algorithm returns same positions
        // but other map elements might have changed that require a fitView (though less likely for applyLayout).
        // Crucially, it runs after the state update from applyLayout is processed.
        set({ triggerFitView: true });
      },

<<<<<<< HEAD
      tidySelectedNodes: () => {
        const { mapData, multiSelectedNodeIds } = get();
        const NODE_SPACING = 30; // pixels

        if (multiSelectedNodeIds.length < 2) {
          get().addDebugLog('[STORE tidySelectedNodes] Less than 2 nodes selected, no action taken.');
          return;
        }

        const selectedNodesRaw = mapData.nodes.filter(n => multiSelectedNodeIds.includes(n.id));

        // Defensive check: Ensure all nodes have width and height, defaulting if necessary
        // This should ideally be guaranteed by node creation logic.
        const selectedNodes = selectedNodesRaw.map(n => ({
          ...n,
          width: n.width ?? 150, // Default width if undefined
          height: n.height ?? 70, // Default height if undefined
        }));


        if (selectedNodes.length < 2) {
          get().addDebugLog('[STORE tidySelectedNodes] Filtered selected nodes resulted in less than 2, no action taken.');
          return;
        }

        // 1. Find the minimum Y for alignment (Align Tops)
        const minY = Math.min(...selectedNodes.map(n => n.y));

        // 2. Sort nodes by their current X position
        selectedNodes.sort((a, b) => a.x - b.x);

        // 3. Distribute horizontally
        const updatedNodePositions: Array<Partial<ConceptMapNode> & { id: string }> = [];
        let currentX = selectedNodes[0].x; // Start with the X of the leftmost node

        selectedNodes.forEach((node, index) => {
          const newPosition: Partial<ConceptMapNode> & { id: string } = {
            id: node.id,
            y: minY, // Align to top
            x: currentX,
          };
          updatedNodePositions.push(newPosition);

          // For all but the last node, calculate the start of the next node
          if (index < selectedNodes.length -1) {
            currentX += (node.width ?? 150) + NODE_SPACING; // Use actual or default width
          }
        });

        get().addDebugLog(`[STORE tidySelectedNodes] Applying tidy layout to ${updatedNodePositions.length} nodes. Target minY: ${minY}.`);

        set((state) => ({
          mapData: {
            ...state.mapData,
            nodes: state.mapData.nodes.map(n => {
              const updatedNode = updatedNodePositions.find(unp => unp.id === n.id);
              // Merge only x and y, keep other properties like text, details, etc.
              return updatedNode ? { ...n, x: updatedNode.x!, y: updatedNode.y! } : n;
            }),
          },
        }));
      },

      // Structural Suggestions actions
      fetchStructuralSuggestions: async () => {
        get().addDebugLog('[STORE fetchStructuralSuggestions] Initiating...');
        set({
          isFetchingStructuralSuggestions: true,
          structuralSuggestions: null,
          structuralGroupSuggestions: null, // Clear previous group suggestions
          error: null
        });

        const { nodes, edges } = get().mapData;
        const flowInput = {
          nodes: nodes.map(n => ({ id: n.id, text: n.text, details: n.details })),
          edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target, label: e.label })),
        };

        try {
          const result = await runFlow(suggestMapImprovementsFlow, flowInput); // result is SuggestedImprovements

          const processedEdgeSuggestions: ProcessedSuggestedEdge[] = (result.suggestedEdges || []).map((edge, i) => ({
            ...edge,
            id: `struct-edge-${Date.now()}-${i}`, // Changed prefix for clarity
          }));

          const processedGroupSuggestions: ProcessedSuggestedGroup[] = (result.suggestedGroups || []).map((group, i) => ({
            ...group,
            id: `struct-group-${Date.now()}-${i}`,
          }));

          set({
            structuralSuggestions: processedEdgeSuggestions,
            structuralGroupSuggestions: processedGroupSuggestions,
            isFetchingStructuralSuggestions: false
          });
          get().addDebugLog(`[STORE fetchStructuralSuggestions] Received ${processedEdgeSuggestions.length} edge suggestions and ${processedGroupSuggestions.length} group suggestions.`);

          if (processedEdgeSuggestions.length === 0 && processedGroupSuggestions.length === 0) {
            get().addDebugLog('[STORE fetchStructuralSuggestions] No actionable suggestions received from flow.');
            // Optionally set a specific message if needed, or rely on UI to indicate no suggestions
          }
        } catch (error) {
          console.error("Error fetching structural suggestions:", error);
          const errorMsg = error instanceof Error ? error.message : "Failed to fetch structural suggestions.";
          get().addDebugLog(`[STORE fetchStructuralSuggestions] Error: ${errorMsg}`);
          set({ isFetchingStructuralSuggestions: false, error: errorMsg, structuralSuggestions: [], structuralGroupSuggestions: [] });
        }
      },
      acceptStructuralSuggestion: (suggestionId: string) => {
        const suggestion = get().structuralSuggestions?.find(s => s.id === suggestionId);
        if (suggestion) {
          get().addDebugLog(`[STORE acceptStructuralSuggestion] Accepting suggestion: ${suggestionId}`);
          get().addEdge({
            source: suggestion.source,
            target: suggestion.target,
            label: suggestion.label || 'Suggested Connection', // Provide a default label
            // Potentially add a specific style or type for AI suggested edges
          });
          set(state => ({
            structuralSuggestions: state.structuralSuggestions?.filter(s => s.id !== suggestionId) || null,
          }));
        } else {
          get().addDebugLog(`[STORE acceptStructuralSuggestion] Suggestion not found: ${suggestionId}`);
        }
      },
      dismissStructuralSuggestion: (suggestionId: string) => {
        get().addDebugLog(`[STORE dismissStructuralSuggestion] Dismissing suggestion: ${suggestionId}`);
        set(state => ({
          structuralSuggestions: state.structuralSuggestions?.filter(s => s.id !== suggestionId) || null,
        }));
      },
      clearAllStructuralSuggestions: () => {
        get().addDebugLog('[STORE clearAllStructuralSuggestions] Clearing all structural suggestions.');
        set({ structuralSuggestions: [], structuralGroupSuggestions: [] });
      },

      acceptGroupSuggestion: (suggestionId: string, options?: { createParentNode?: boolean }) => {
        const suggestion = get().structuralGroupSuggestions?.find(s => s.id === suggestionId);
        if (!suggestion) {
          get().addDebugLog(`[STORE acceptGroupSuggestion] Group suggestion not found: ${suggestionId}`);
          return;
        }
        get().addDebugLog(`[STORE acceptGroupSuggestion] Accepting group suggestion: ${suggestionId}`);

        if (options?.createParentNode) {
          const parentNodeId = uniqueNodeId();
          const groupNodes = get().mapData.nodes.filter(n => suggestion.nodeIds.includes(n.id));

          if (groupNodes.length === 0) {
            get().addDebugLog(`[STORE acceptGroupSuggestion] No valid nodes found for group ${suggestionId}.`);
            return;
          }

          // Calculate position for the new parent node (centroid of children)
          let sumX = 0, sumY = 0;
          groupNodes.forEach(n => { sumX += n.x; sumY += n.y; });
          const avgX = sumX / groupNodes.length;
          const avgY = sumY / groupNodes.length;
          // Position parent slightly above the centroid for better visibility of children
          const parentPosition = { x: avgX, y: avgY - 100 };

          get().addNode({
            text: suggestion.label || 'New Group',
            details: suggestion.reason || 'AI Suggested Group',
            position: parentPosition,
            type: 'group-node', // Or a specific type for AI groups
            // Consider default width/height for group nodes or calculate based on children
          });

          const updatedNodes = suggestion.nodeIds.map(nodeId => ({
            id: nodeId,
            parentNode: parentNodeId,
            // Optionally, adjust child positions relative to the new parent or to avoid overlaps.
            // This can be complex and might be better handled by a subsequent layout pass or user action.
            // For now, just setting parentNode. React Flow might handle basic nesting.
          }));

          // Batch update nodes to set their parent
          set(state => ({
            mapData: {
              ...state.mapData,
              nodes: state.mapData.nodes.map(n => {
                const update = updatedNodes.find(u => u.id === n.id);
                return update ? { ...n, ...update } : n;
              }),
            },
          }));
        }
        // If not creating a parent node, other logic might apply (e.g., highlighting, tagging - not implemented here)

        set(state => ({
          structuralGroupSuggestions: state.structuralGroupSuggestions?.filter(s => s.id !== suggestionId) || null,
        }));
      },
      dismissGroupSuggestion: (suggestionId: string) => {
        get().addDebugLog(`[STORE dismissGroupSuggestion] Dismissing group suggestion: ${suggestionId}`);
        set(state => ({
          structuralGroupSuggestions: state.structuralGroupSuggestions?.filter(s => s.id !== suggestionId) || null,
        }));
      },

      applySemanticTidyUp: async () => {
        const { mapData, multiSelectedNodeIds, applyLayout, addDebugLog } = get();

        if (multiSelectedNodeIds.length < 2) {
          addDebugLog('[STORE applySemanticTidyUp] Less than 2 nodes selected. No action.');
          return;
        }

        const selectedNodesData = mapData.nodes
          .filter(n => multiSelectedNodeIds.includes(n.id))
          .map(n => ({
            id: n.id,
            text: n.text || '',
            details: n.details || '',
            x: n.x,
            y: n.y,
            width: n.width || 150,
            height: n.height || 70,
          }));

        if (selectedNodesData.length < 2) {
          addDebugLog('[STORE applySemanticTidyUp] Filtered selected nodes data resulted in less than 2. No action.');
          return;
        }

        addDebugLog(`[STORE applySemanticTidyUp] Initiating for ${selectedNodesData.length} nodes.`);
        set({ isApplyingSemanticTidyUp: true, error: null });

        try {
          const suggestedPositions = await runFlow(semanticTidyUpFlow, selectedNodesData as SemanticTidyUpRequest);

          if (suggestedPositions && suggestedPositions.length > 0) {
            applyLayout(suggestedPositions); // applyLayout expects LayoutNodeUpdate[] which matches SemanticTidyUpResponse
            addDebugLog(`[STORE applySemanticTidyUp] Successfully applied semantic layout to ${suggestedPositions.length} nodes.`);
          } else {
            addDebugLog('[STORE applySemanticTidyUp] Semantic tidy up flow returned no valid positions.');
            set({ error: "AI Semantic Tidy-Up did not return new positions."});
          }
        } catch (err) {
          console.error("Error during semanticTidyUpFlow execution:", err);
          const errorMsg = err instanceof Error ? err.message : "Failed to apply AI semantic tidy-up.";
          addDebugLog(`[STORE applySemanticTidyUp] Error: ${errorMsg}`);
          set({ error: errorMsg });
        } finally {
          set({ isApplyingSemanticTidyUp: false });
        }
      },

      setPendingRelationForEdgeCreation: (data) => {
        if (data) {
          get().addDebugLog(`[STORE setPendingRelationForEdgeCreation] Setting pending relation: label='${data.label}', source='${data.sourceNodeId}'`);
        } else {
          get().addDebugLog(`[STORE setPendingRelationForEdgeCreation] Clearing pending relation (data was null).`);
        }
        set({ pendingRelationForEdgeCreation: data });
        // If setting a pending relation, cancel any node-to-node connection mode
        if (data) {
          set({ connectingNodeId: null });
        }
      },
      clearPendingRelationForEdgeCreation: () => {
        get().addDebugLog('[STORE clearPendingRelationForEdgeCreation] Clearing pending relation.');
        set({ pendingRelationForEdgeCreation: null });
      },
=======
      // Connection Mode Actions
      startConnectionMode: (nodeId, handleId = null) => {
        get().addDebugLog(`[STORE startConnectionMode] Source: ${nodeId}, Handle: ${handleId}`);
        set({
          connectingState: { sourceNodeId: nodeId, sourceHandleId: handleId },
          selectedElementId: null, // Optionally clear selection to avoid confusion
          selectedElementType: null,
        });
      },
      completeConnectionMode: (targetNodeId, targetHandleId = null) => {
        const { connectingState, addEdge } = get();
        if (connectingState) {
          get().addDebugLog(`[STORE completeConnectionMode] Target: ${targetNodeId}, Handle: ${targetHandleId}. Source was: ${connectingState.sourceNodeId}`);
          // Call existing addEdge function
          addEdge({
            source: connectingState.sourceNodeId,
            sourceHandle: connectingState.sourceHandleId,
            target: targetNodeId,
            targetHandle: targetHandleId,
            label: 'connects',
          });
          set({ connectingState: null }); // Reset connection mode
        } else {
          get().addDebugLog(`[STORE completeConnectionMode] Called without active connectingState.`);
        }
      },
      cancelConnectionMode: () => {
        if (get().connectingState) { // Only log if it was active
          get().addDebugLog(`[STORE cancelConnectionMode] Connection mode cancelled.`);
        }
        set({ connectingState: null });
      },

      // Drag Preview Actions
      setDragPreview: (item, position = null) => {
        get().addDebugLog(`[STORE setDragPreview] Item: ${item ? item.text : 'null'}, Pos: ${JSON.stringify(position)}`);
        set({ dragPreviewItem: item, dragPreviewPosition: item ? position : null });
      },
      updateDragPreviewPosition: (position) => {
        if (get().dragPreviewItem) { // Only update if there's an active item
          set({ dragPreviewPosition: position });
        }
      },
      clearDragPreview: () => {
        if (get().dragPreviewItem || get().draggedRelationLabel) { // Log if any drag preview was active
           get().addDebugLog(`[STORE clearDragPreview] All drag previews cleared.`);
        }
        set({
          dragPreviewItem: null,
          dragPreviewPosition: null,
          draggedRelationLabel: null, // Also clear relation label
        });
      },
      setDraggedRelationPreview: (label) => {
        get().addDebugLog(`[STORE setDraggedRelationPreview] Label: ${label}`);
        if (label && get().dragPreviewItem) { // If a node drag preview was active, clear it
          set({ draggedRelationLabel: label, dragPreviewItem: null, dragPreviewPosition: null });
        } else {
          set({ draggedRelationLabel: label });
        }
      },
      setTriggerFitView: (value) => set({ triggerFitView: value }),
>>>>>>> master
    }),
    {
      partialize: (state): TrackedState => {
    // Exclude connectingNodeId, isApplyingSemanticTidyUp, and pendingRelationForEdgeCreation from temporal state
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview, structuralSuggestions, structuralGroupSuggestions } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview, structuralSuggestions, structuralGroupSuggestions };
      },
      limit: 50,
    }
  )
);


export default useConceptMapStore;
