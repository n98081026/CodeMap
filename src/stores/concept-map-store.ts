
import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TemporalState as ZundoTemporalState } from 'zundo';

import type { ConceptMap, ConceptMapData, ConceptMapNode, ConceptMapEdge } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';

// Conceptual GraphAdapter related types
export type GraphologyInstance = { nodesMap: Map<string, ConceptMapNode> }; // Simplified for mock

export interface GraphAdapterUtility {
  fromArrays: (nodes: ConceptMapNode[], edges: ConceptMapEdge[]) => GraphologyInstance;
  getDescendants: (graphInstance: GraphologyInstance, nodeId: string) => string[];
  toArrays: (graphInstance: GraphologyInstance) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] }; // Keep for interface completeness
  getAncestors: (graphInstance: GraphologyInstance, nodeId: string) => string[]; // Keep for interface completeness
  getNeighborhood: ( // Keep for interface completeness
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: { depth?: number; direction?: 'in' | 'out' | 'both' }
  ) => string[];
  getSubgraphData: ( // Keep for interface completeness
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };
}

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

  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{ source: string; target: string; relation: string }>;

  debugLogs: string[];

  // Staging area state
  stagedMapData: ConceptMapData | null;
  isStagingActive: boolean;

// Concept expansion preview state
conceptExpansionPreview: ConceptExpansionPreviewState | null;

connectingState: { sourceNodeId: string; sourceHandleId?: string | null; } | null; // New state for connection mode

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

// Layout action
applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;

// Connection mode actions
startConnectionMode: (nodeId: string, handleId?: string | null) => void;
completeConnectionMode: (targetNodeId: string, targetHandleId?: string | null) => void;
cancelConnectionMode: () => void;
}

type TrackedState = Pick<ConceptMapState, 'mapData' | 'mapName' | 'isPublic' | 'sharedWithClassroomId' | 'selectedElementId' | 'selectedElementType' | 'multiSelectedNodeIds' | 'editingNodeId' | 'stagedMapData' | 'isStagingActive' | 'conceptExpansionPreview' /* connectingState is not tracked for undo/redo */>;

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
  'setConceptExpansionPreview' | 'applyLayout' |
  'startConnectionMode' | 'completeConnectionMode' | 'cancelConnectionMode' // Added connection mode actions
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
  aiExtractedConcepts: [],
  aiSuggestedRelations: [],
  debugLogs: [],
  stagedMapData: null,
  isStagingActive: false,
  conceptExpansionPreview: null, // Added concept expansion preview state
  connectingState: null, // Initial value for new state
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
        get().addDebugLog(`[STORE deleteNode] Attempting to delete node: ${nodeIdToDelete} and its descendants.`);
        set((state) => {
          const nodes = state.mapData.nodes;
          const edges = state.mapData.edges;

          const graphInstance = MockGraphAdapter.fromArrays(nodes, edges);

          if (!graphInstance.nodesMap.has(nodeIdToDelete)) {
             get().addDebugLog(`[STORE deleteNode] Node ${nodeIdToDelete} not found. No changes made.`);
             return state;
          }

          const descendants = MockGraphAdapter.getDescendants(graphInstance, nodeIdToDelete);
          const nodesToDeleteSet = new Set<string>([nodeIdToDelete, ...descendants]);

          get().addDebugLog(`[STORE deleteNode] Full set of nodes to delete (including descendants): ${JSON.stringify(Array.from(nodesToDeleteSet))}`);

          let newNodes = nodes.filter(node => !nodesToDeleteSet.has(node.id));

          const nodeBeingDeletedDirectly = nodes.find(n => n.id === nodeIdToDelete);
          if (nodeBeingDeletedDirectly?.parentNode) {
            const parentNodeId = nodeBeingDeletedDirectly.parentNode;
            newNodes = newNodes.map(node => {
              if (node.id === parentNodeId) {
                const newChildIds = (node.childIds || []).filter(id => id !== nodeIdToDelete);
                get().addDebugLog(`[STORE deleteNode] Updating parent ${parentNodeId}, removing child ${nodeIdToDelete}. New childIds: ${JSON.stringify(newChildIds)}`);
                return { ...node, childIds: newChildIds };
              }
              return node;
            });
          }

          const newEdges = edges.filter(
            edge => !nodesToDeleteSet.has(edge.source) && !nodesToDeleteSet.has(edge.target)
          );

          let newSelectedElementId = state.selectedElementId;
          let newSelectedElementType = state.selectedElementType;
          if (state.selectedElementId && nodesToDeleteSet.has(state.selectedElementId)) {
            newSelectedElementId = null;
            newSelectedElementType = null;
            get().addDebugLog(`[STORE deleteNode] Cleared selection as deleted node was selected.`);
          }
          const newMultiSelectedNodeIds = state.multiSelectedNodeIds.filter(id => !nodesToDeleteSet.has(id));
          const newAiProcessingNodeId = state.aiProcessingNodeId && nodesToDeleteSet.has(state.aiProcessingNodeId) && nodesToDeleteSet.has(state.aiProcessingNodeId) ? null : state.aiProcessingNodeId;
          const newEditingNodeId = state.editingNodeId && nodesToDeleteSet.has(state.editingNodeId) ? null : state.editingNodeId;

          if (newNodes.length === nodes.length && newEdges.length === edges.length && newSelectedElementId === state.selectedElementId && newMultiSelectedNodeIds.length === state.multiSelectedNodeIds.length ) {
            get().addDebugLog(`[STORE deleteNode] No effective changes to nodes/edges arrays or selection after filtering.`);
          }

          get().addDebugLog(`[STORE deleteNode] Deletion complete. Nodes remaining: ${newNodes.length}, Edges remaining: ${newEdges.length}`);
          return {
            mapData: {
              nodes: newNodes,
              edges: newEdges,
            },
            selectedElementId: newSelectedElementId,
            selectedElementType: newSelectedElementType,
            multiSelectedNodeIds: newMultiSelectedNodeIds,
            aiProcessingNodeId: newAiProcessingNodeId,
            editingNodeId: newEditingNodeId,
          };
        });
      },

      addEdge: (options) => set((state) => {
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
            return state;
          }
        });
      },

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
    }),
    {
      partialize: (state): TrackedState => {
        const { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview } = state;
        return { mapData, mapName, isPublic, sharedWithClassroomId, selectedElementId, selectedElementType, multiSelectedNodeIds, editingNodeId, stagedMapData, isStagingActive, conceptExpansionPreview };
      },
      limit: 50,
    }
  )
);


export default useConceptMapStore;
