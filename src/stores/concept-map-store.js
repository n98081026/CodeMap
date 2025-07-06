'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.useConceptMapStore = void 0;
const zustand_1 = require('zustand');
const zundo_1 = require('zundo');
const uniqueNodeId = () =>
  `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () =>
  `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const initialStateBase = {
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
};
exports.useConceptMapStore = (0, zustand_1.create)()(
  (0, zundo_1.temporal)(
    (set, get) =>
      Object.assign(Object.assign({}, initialStateBase), {
        setMapId: (id) => set({ mapId: id }),
        setMapName: (name) => set({ mapName: name }),
        setCurrentMapOwnerId: (ownerId) => set({ currentMapOwnerId: ownerId }),
        setCurrentMapCreatedAt: (createdAt) =>
          set({ currentMapCreatedAt: createdAt }),
        setIsPublic: (isPublicStatus) => set({ isPublic: isPublicStatus }),
        setSharedWithClassroomId: (id) => set({ sharedWithClassroomId: id }),
        setIsNewMapMode: (isNew) => set({ isNewMapMode: isNew }),
        setIsViewOnlyMode: (isViewOnly) => set({ isViewOnlyMode: isViewOnly }),
        setInitialLoadComplete: (complete) =>
          set({ initialLoadComplete: complete }),
        setIsLoading: (loading) => set({ isLoading: loading }),
        setIsSaving: (saving) => set({ isSaving: saving }),
        setError: (errorMsg) => set({ error: errorMsg }),
        setSelectedElement: (id, type) =>
          set({ selectedElementId: id, selectedElementType: type }),
        setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
        setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
        setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),
        setAiExtractedConcepts: (concepts) =>
          set({ aiExtractedConcepts: concepts }),
        setAiSuggestedRelations: (relations) =>
          set({ aiSuggestedRelations: relations }),
        resetAiSuggestions: () =>
          set({ aiExtractedConcepts: [], aiSuggestedRelations: [] }),
        removeExtractedConceptsFromSuggestions: (conceptsToRemove) =>
          set((state) => ({
            aiExtractedConcepts: state.aiExtractedConcepts.filter(
              (concept) => !conceptsToRemove.includes(concept)
            ),
          })),
        removeSuggestedRelationsFromSuggestions: (relationsToRemove) =>
          set((state) => ({
            aiSuggestedRelations: state.aiSuggestedRelations.filter(
              (relation) =>
                !relationsToRemove.some(
                  (rtr) =>
                    rtr.source === relation.source &&
                    rtr.target === relation.target &&
                    rtr.relation === relation.relation
                )
            ),
          })),
        addDebugLog: (log) =>
          set((state) => ({
            debugLogs: [
              ...state.debugLogs,
              `${new Date().toISOString()}: ${log}`,
            ].slice(-100),
          })),
        clearDebugLogs: () => set({ debugLogs: [] }),
        initializeNewMap: (userId) => {
          const previousMapId = get().mapId;
          const previousIsNewMapMode = get().isNewMapMode;
          get().addDebugLog(
            `[STORE] INITIALIZE_NEW_MAP CALLED! User: ${userId}. Prev mapId: ${previousMapId}, prevIsNew: ${previousIsNewMapMode}.`
          );
          get().addDebugLog(
            `[STORE initializeNewMap V11] Setting mapData to empty nodes/edges. User: ${userId}.`
          );
          const newMapState = Object.assign(
            Object.assign({}, initialStateBase),
            {
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
            }
          );
          set(newMapState);
          exports.useConceptMapStore.temporal.getState().clear();
        },
        setLoadedMap: (map, viewOnly = false) => {
          var _a, _b, _c, _d, _e, _f;
          get().addDebugLog(
            `[STORE] SET_LOADED_MAP CALLED! Map ID: ${map.id}, Name: ${map.name}, ViewOnly: ${viewOnly}`
          );
          get().addDebugLog(
            `[STORE setLoadedMap V11] Received map ID '${map.id}'. MapData nodes count: ${(_c = (_b = (_a = map.mapData) === null || _a === void 0 ? void 0 : _a.nodes) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 'undefined/null'}, edges count: ${(_f = (_e = (_d = map.mapData) === null || _d === void 0 ? void 0 : _d.edges) === null || _e === void 0 ? void 0 : _e.length) !== null && _f !== void 0 ? _f : 'undefined/null'}. ViewOnly: ${viewOnly}`
          );
          if (
            !map.mapData ||
            !map.mapData.nodes ||
            map.mapData.nodes.length === 0
          ) {
            get().addDebugLog(
              `[STORE setLoadedMap V12] Map '${map.id}' ('${map.name}') is being loaded with 0 nodes.`
            );
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
          exports.useConceptMapStore.temporal.getState().clear();
        },
        importMapData: (importedData, fileName) => {
          const currentMapName = get().mapName;
          const newName = fileName
            ? `${fileName}`
            : `Imported: ${currentMapName}`;
          get().addDebugLog(
            `[STORE] IMPORT_MAP_DATA CALLED! New Name: ${newName}`
          );
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
          exports.useConceptMapStore.temporal.getState().clear();
        },
        resetStore: () => {
          get().addDebugLog(`[STORE] RESET_STORE CALLED!`);
          set(
            Object.assign(Object.assign({}, initialStateBase), {
              initialLoadComplete: false,
              debugLogs: [],
            })
          );
          exports.useConceptMapStore.temporal.getState().clear();
        },
        addNode: (options) => {
          var _a, _b;
          // Define default dimensions
          const NODE_DEFAULT_WIDTH = 150;
          const NODE_DEFAULT_HEIGHT = 70;
          // Original log for options can be kept or removed if too verbose
          // get().addDebugLog(`[STORE addNode] Attempting to add node with options: ${JSON.stringify(options)}`);
          const newNode = {
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
            width:
              (_a = options.width) !== null && _a !== void 0
                ? _a
                : NODE_DEFAULT_WIDTH,
            height:
              (_b = options.height) !== null && _b !== void 0
                ? _b
                : NODE_DEFAULT_HEIGHT,
          };
          // New log for the created newNode object
          get().addDebugLog(
            `[STORE addNode] newNode object created: ${JSON.stringify(newNode)}`
          );
          set((state) => {
            let newNodes = [...state.mapData.nodes, newNode];
            // If this node has a parent, update the parent's childIds
            if (options.parentNode) {
              const parentIndex = newNodes.findIndex(
                (n) => n.id === options.parentNode
              );
              if (parentIndex !== -1) {
                const parentNode = Object.assign({}, newNodes[parentIndex]);
                parentNode.childIds = [
                  ...(parentNode.childIds || []),
                  newNode.id,
                ];
                newNodes[parentIndex] = parentNode;
              }
            }
            get().addDebugLog(
              `[STORE addNode] Successfully added. Nodes count: ${newNodes.length}. Last node ID: ${newNode.id}`
            );
            return {
              mapData: Object.assign(Object.assign({}, state.mapData), {
                nodes: newNodes,
              }),
            };
          });
          return newNode.id;
        },
        updateNode: (nodeId, updates) =>
          set((state) => ({
            mapData: Object.assign(Object.assign({}, state.mapData), {
              nodes: state.mapData.nodes.map((node) =>
                node.id === nodeId
                  ? Object.assign(Object.assign({}, node), updates)
                  : node
              ),
            }),
          })),
        deleteNode: (nodeIdToDelete) =>
          set((state) => {
            const nodesToDeleteSet = new Set();
            const queue = [nodeIdToDelete];
            // Populate nodesToDeleteSet with the initial node and all its descendants
            while (queue.length > 0) {
              const currentId = queue.shift();
              if (nodesToDeleteSet.has(currentId)) continue; // Already processed
              nodesToDeleteSet.add(currentId);
              const node = state.mapData.nodes.find((n) => n.id === currentId);
              if (node && node.childIds) {
                node.childIds.forEach((childId) => {
                  if (!nodesToDeleteSet.has(childId)) {
                    queue.push(childId);
                  }
                });
              }
            }
            // Filter out the deleted nodes
            const newNodes = state.mapData.nodes.filter(
              (node) => !nodesToDeleteSet.has(node.id)
            );
            // Update parent's childIds if the deleted node had a parent
            const nodeToDelete = state.mapData.nodes.find(
              (n) => n.id === nodeIdToDelete
            );
            if (
              nodeToDelete === null || nodeToDelete === void 0
                ? void 0
                : nodeToDelete.parentNode
            ) {
              const parentIndex = newNodes.findIndex(
                (n) => n.id === nodeToDelete.parentNode
              );
              if (parentIndex !== -1) {
                const parentNode = Object.assign({}, newNodes[parentIndex]);
                parentNode.childIds = (parentNode.childIds || []).filter(
                  (id) => id !== nodeIdToDelete
                );
                newNodes[parentIndex] = parentNode;
              }
            }
            // Filter out edges connected to any of the deleted nodes
            const newEdges = state.mapData.edges.filter(
              (edge) =>
                !nodesToDeleteSet.has(edge.source) &&
                !nodesToDeleteSet.has(edge.target)
            );
            let newSelectedElementId = state.selectedElementId;
            let newSelectedElementType = state.selectedElementType;
            if (
              state.selectedElementId &&
              nodesToDeleteSet.has(state.selectedElementId)
            ) {
              newSelectedElementId = null;
              newSelectedElementType = null;
            }
            const newMultiSelectedNodeIds = state.multiSelectedNodeIds.filter(
              (id) => !nodesToDeleteSet.has(id)
            );
            const newAiProcessingNodeId =
              state.aiProcessingNodeId &&
              nodesToDeleteSet.has(state.aiProcessingNodeId)
                ? null
                : state.aiProcessingNodeId;
            const newEditingNodeId =
              state.editingNodeId && nodesToDeleteSet.has(state.editingNodeId)
                ? null
                : state.editingNodeId;
            return {
              mapData: { nodes: newNodes, edges: newEdges },
              selectedElementId: newSelectedElementId,
              selectedElementType: newSelectedElementType,
              multiSelectedNodeIds: newMultiSelectedNodeIds,
              editingNodeId: newEditingNodeId,
              aiProcessingNodeId: newAiProcessingNodeId,
            };
          }),
        addEdge: (options) =>
          set((state) => {
            const newEdge = {
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
            return {
              mapData: Object.assign(Object.assign({}, state.mapData), {
                edges: [...state.mapData.edges, newEdge],
              }),
            };
          }),
        updateEdge: (edgeId, updates) =>
          set((state) => ({
            mapData: Object.assign(Object.assign({}, state.mapData), {
              edges: state.mapData.edges.map((edge) =>
                edge.id === edgeId
                  ? Object.assign(Object.assign({}, edge), updates)
                  : edge
              ),
            }),
          })),
        deleteEdge: (edgeId) =>
          set((state) => {
            const newSelectedElementId =
              state.selectedElementId === edgeId
                ? null
                : state.selectedElementId;
            const newSelectedElementType =
              state.selectedElementId === edgeId
                ? null
                : state.selectedElementType;
            return {
              mapData: Object.assign(Object.assign({}, state.mapData), {
                edges: state.mapData.edges.filter((edge) => edge.id !== edgeId),
              }),
              selectedElementId: newSelectedElementId,
              selectedElementType: newSelectedElementType,
            };
          }),
      }),
    {
      partialize: (state) => {
        const {
          mapData,
          mapName,
          isPublic,
          sharedWithClassroomId,
          selectedElementId,
          selectedElementType,
          multiSelectedNodeIds,
          editingNodeId,
        } = state;
        return {
          mapData,
          mapName,
          isPublic,
          sharedWithClassroomId,
          selectedElementId,
          selectedElementType,
          multiSelectedNodeIds,
          editingNodeId,
        };
      },
      limit: 50,
    }
  )
);
exports.default = exports.useConceptMapStore;
