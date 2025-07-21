// src/stores/concept-map-store.ts
// Manually processed content of src/stores/concept-map-store.ts

// Removed unused import: import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { temporal } from 'zundo';
import { create } from 'zustand';

import { GraphAdapterUtility } from '@/lib/graphologyAdapter';

import type { ConceptMap, ConceptMapData } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';
import type { TemporalState as ZundoTemporalState } from 'zundo';

import {
  type GenerateProjectOverviewInput,
  type GenerateProjectOverviewOutput,
  generateProjectOverviewFlow,
} from '@/ai/flows/generate-project-overview';
import { StructuralSuggestionItemSchema } from '@/types/ai-suggestions';

// Assuming these types are correctly imported or defined elsewhere, like in '@/ai/flows/generate-project-overview'

const uniqueNodeId = () =>
  `node-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const uniqueEdgeId = () =>
  `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`;

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

export interface StagedMapDataWithContext {
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  actionType?:
    | 'intermediateNode'
    | 'summarizeNodes'
    | 'quickCluster'
    | 'generateSnippet'
    | 'aiTidyUpComplete';
  originalElementId?: string;
  originalElementIds?: string[];
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
  aiExtractedConcepts: string[];
  aiSuggestedRelations: Array<{
    source: string;
    target: string;
    relation: string;
  }>;
  debugLogs: string[];
  stagedMapData: StagedMapDataWithContext | null;
  isStagingActive: boolean;
  // conceptExpansionPreview: ConceptExpansionPreviewState | null; // Removed
  // updateConceptExpansionPreviewNode: (previewNodeId: string, newText: string, newDetails?: string) => void; // Removed
  isConnectingMode: boolean;
  connectionSourceNodeId: string | null;
  dragPreviewItem: { text: string; type: string } | null;
  dragPreviewPosition: { x: number; y: number } | null;
  draggedRelationLabel: string | null;
  triggerFitView: boolean;
  structuralSuggestions: z.infer<typeof StructuralSuggestionItemSchema>[];

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
  projectOverviewData: GenerateProjectOverviewOutput | null;
  isFetchingOverview: boolean;

  // View Focus State
  focusViewOnNodeIds: string[] | null;
  triggerFocusView: boolean;

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
  setAiSuggestedRelations: (
    relations: Array<{ source: string; target: string; relation: string }>
  ) => void;
  resetAiSuggestions: () => void;
  removeExtractedConceptsFromSuggestions: (conceptsToRemove: string[]) => void;
  removeSuggestedRelationsFromSuggestions: (
    relationsToRemove: Array<{
      source: string;
      target: string;
      relation: string;
    }>
  ) => void;
  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;
  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap, viewOnly?: boolean) => void;
  importMapData: (importedData: ConceptMapData, fileName?: string) => void;
  resetStore: () => void;
  addNode: (options: {
    id?: string;
    text: string;
    type: string;
    position: { x: number; y: number };
    details?: string;
    parentNode?: string;
    backgroundColor?: string;
    shape?: 'rectangle' | 'ellipse';
    width?: number;
    height?: number;
  }) => string;
  updateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteNode: (nodeId: string) => void;
  addEdge: (options: {
    id?: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
    label?: string;
    color?: string;
    lineType?: 'solid' | 'dashed';
    markerStart?: string;
    markerEnd?: string;
  }) => string;
  updateEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  deleteEdge: (edgeId: string) => void;
  setStagedMapData: (data: StagedMapDataWithContext | null) => void;
  clearStagedMapData: () => void;
  commitStagedMapData: () => void;
  deleteFromStagedMapData: (elementIds: string[]) => void;
  // setConceptExpansionPreview: (preview: ConceptExpansionPreviewState | null) => void; // Removed
  // updateConceptExpansionPreviewNode: (previewNodeId: string, newText: string, newDetails?: string) => void; // Removed
  applyLayout: (updatedNodePositions: LayoutNodeUpdate[]) => void;
  startConnectionMode: (nodeId: string) => void;
  completeConnectionMode: (
    targetNodeId?: string,
    targetHandleId?: string | null
  ) => void;
  cancelConnectionMode: () => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  updateDragPreviewPosition: (
    position: { x: number; y: number } | null
  ) => void;
  clearDragPreview: () => void;
  setDraggedRelationPreview: (label: string | null) => void;
  setTriggerFitView: (value: boolean) => void;
  toggleOverviewMode: () => void;
  setProjectOverviewData: (data: GenerateProjectOverviewOutput | null) => void;
  setIsFetchingOverview: (fetching: boolean) => void;
  fetchProjectOverview: (input: GenerateProjectOverviewInput) => Promise<void>;
  loadExampleMapData: (mapData: ConceptMapData, exampleName: string) => void;
  setGhostPreview: (
    nodesToPreview: Array<{
      id: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
    }>
  ) => void;
  acceptGhostPreview: () => void;
  cancelGhostPreview: () => void;
  setStructuralSuggestions: (
    suggestions: z.infer<typeof StructuralSuggestionItemSchema>[]
  ) => void;
  addStructuralSuggestion: (
    suggestion: z.infer<typeof StructuralSuggestionItemSchema>
  ) => void;
  updateStructuralSuggestion: (
    updatedSuggestion: Partial<
      z.infer<typeof StructuralSuggestionItemSchema>
    > & { id: string }
  ) => void;
  removeStructuralSuggestion: (suggestionId: string) => void;
  clearStructuralSuggestions: () => void;
  findEdgeByNodes: (
    sourceId: string,
    targetId: string
  ) => ConceptMapEdge | undefined;
  applyFormGroupSuggestion: (
    nodeIds: string[],
    groupName: string | undefined,
    overlayGeometry?: { x: number; y: number; width?: number; height?: number }
  ) => string;
  // New actions for focus
  setFocusOnNodes: (nodeIds: string[], isOverviewExit?: boolean) => void;
  clearFocusViewTrigger: () => void;

  // For tutorial system to target newly added elements
  tutorialTempTargetNodeId: string | null;
  setTutorialTempTargetNodeId: (nodeId: string | null) => void;
  tutorialTempTargetEdgeId: string | null; // For new edges
  setTutorialTempTargetEdgeId: (edgeId: string | null) => void; // For new edges
}

const initialStateBaseOmitKeys = [
  'setMapId',
  'setMapName',
  'setCurrentMapOwnerId',
  'setCurrentMapCreatedAt',
  'setIsPublic',
  'setGhostPreview',
  'acceptGhostPreview',
  'cancelGhostPreview',
  'setSharedWithClassroomId',
  'setIsNewMapMode',
  'setIsViewOnlyMode',
  'setInitialLoadComplete',
  'setIsLoading',
  'setIsSaving',
  'setError',
  'setSelectedElement',
  'setMultiSelectedNodeIds',
  'setEditingNodeId',
  'setAiProcessingNodeId',
  'setAiExtractedConcepts',
  'setAiSuggestedRelations',
  'resetAiSuggestions',
  'removeExtractedConceptsFromSuggestions',
  'removeSuggestedRelationsFromSuggestions',
  'addDebugLog',
  'clearDebugLogs',
  'initializeNewMap',
  'setLoadedMap',
  'importMapData',
  'resetStore',
  'addNode',
  'updateNode',
  'deleteNode',
  'addEdge',
  'updateEdge',
  'deleteEdge',
  'setStagedMapData',
  'clearStagedMapData',
  'commitStagedMapData',
  'deleteFromStagedMapData',
  // 'setConceptExpansionPreview', // Removed
  // 'updateConceptExpansionPreviewNode', // Removed
  'applyLayout',
  'startConnectionMode',
  'completeConnectionMode',
  'cancelConnectionMode',
  'startConnection',
  'cancelConnection',
  'finishConnectionAttempt',
  'setDragPreview',
  'updateDragPreviewPosition',
  'clearDragPreview',
  'setDraggedRelationPreview',
  'setTriggerFitView',
  'setStructuralSuggestions',
  'addStructuralSuggestion',
  'updateStructuralSuggestion',
  'removeStructuralSuggestion',
  'clearStructuralSuggestions',
  'applyFormGroupSuggestion',
  'toggleOverviewMode',
  'setProjectOverviewData',
  'setIsFetchingOverview',
  'fetchProjectOverview',
  'loadExampleMapData',
  'setFocusOnNodes',
  'clearFocusViewTrigger',
  'setTutorialTempTargetNodeId',
  'setTutorialTempTargetEdgeId', // Added new action
] as const;
type InitialStateBaseOmitType = (typeof initialStateBaseOmitKeys)[number];

export const initialStateBase: Omit<ConceptMapState, InitialStateBaseOmitType> = {
  // Added removed types here
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
  // conceptExpansionPreview: null, // Removed
  isConnectingMode: false,
  connectionSourceNodeId: null,
  dragPreviewItem: null,
  dragPreviewPosition: null,
  draggedRelationLabel: null,
  triggerFitView: false,
  structuralSuggestions: [],
  ghostPreviewData: null,
  isOverviewModeActive: false,
  projectOverviewData: null,
  isFetchingOverview: false,
  focusViewOnNodeIds: null,
  triggerFocusView: false,
  tutorialTempTargetNodeId: null,
  tutorialTempTargetEdgeId: null, // Added new state
};

type TrackedState = Pick<
  ConceptMapState,
  | 'mapData'
  | 'mapName'
  | 'isPublic'
  | 'sharedWithClassroomId'
  | 'selectedElementId'
  | 'selectedElementType'
  | 'multiSelectedNodeIds'
  | 'editingNodeId'
  | 'stagedMapData'
  | 'isStagingActive'
  /* 'conceptExpansionPreview' REMOVED */
  | 'ghostPreviewData'
  | 'structuralSuggestions'
  | 'isOverviewModeActive'
  | 'projectOverviewData'
  | 'focusViewOnNodeIds'
>;
export type ConceptMapStoreTemporalState = ZundoTemporalState<TrackedState>;

export const useConceptMapStore = create<ConceptMapState>()(
  temporal(
    (set, get) => ({
      ...initialStateBase,
      // Ensure all functions from ConceptMapState (that are actions) are implemented
      // For properties that were removed from ConceptMapState, ensure their setters are also removed or handled
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
        set({
          selectedElementId: id,
          selectedElementType: type,
          multiSelectedNodeIds: id && type === 'node' ? [id] : [],
        }),
      setMultiSelectedNodeIds: (ids) => set({ multiSelectedNodeIds: ids }),
      setEditingNodeId: (nodeId) => set({ editingNodeId: nodeId }),
      setAiProcessingNodeId: (nodeId) => set({ aiProcessingNodeId: nodeId }),
      startConnection: (nodeId) =>
        set({
          connectingNodeId: nodeId,
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [],
        }),
      cancelConnection: () => set({ connectingNodeId: null }),
      finishConnectionAttempt: (targetNodeId) => {
        const sourceNodeId = get().connectingNodeId;
        if (sourceNodeId && targetNodeId) {
          get().addEdge({
            source: sourceNodeId,
            target: targetNodeId,
            label: 'connects',
          });
        }
        set({ connectingNodeId: null });
      },
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
      initializeNewMap: (userId: string) => {
        get().addDebugLog(`[STORE initializeNewMap] User: ${userId}.`);
        const newMapState = {
          ...initialStateBase,
          mapId: 'new',
          mapName: 'New Concept Map',
          mapData: { nodes: [], edges: [] },
          currentMapOwnerId: userId,
          currentMapCreatedAt: new Date().toISOString(),
          isNewMapMode: true,
          isViewOnlyMode: false,
          isLoading: false,
          initialLoadComplete: true,
          debugLogs: get().debugLogs,
          aiExtractedConcepts: [],
          aiSuggestedRelations: [],
          stagedMapData: null,
          isStagingActive: false,
          // conceptExpansionPreview: null, // Removed
          ghostPreviewData: null,
          structuralSuggestions: [],
          isOverviewModeActive: false,
          projectOverviewData: null,
          isFetchingOverview: false,
          focusViewOnNodeIds: null,
          triggerFocusView: false,
        };
        set(newMapState);
        useConceptMapStore.temporal.getState().clear();
      },
      setLoadedMap: (map, viewOnly = false) => {
        get().addDebugLog(
          `[STORE setLoadedMap] Map ID: ${map.id}, ViewOnly: ${viewOnly}`
        );
        set({
          ...initialStateBase,
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
          debugLogs: get().debugLogs,
          focusViewOnNodeIds: null,
          triggerFocusView: false,
        });
        useConceptMapStore.temporal.getState().clear();
      },
      importMapData: (importedData, fileName) => {
        const newName = fileName
          ? fileName.replace(/\.json$/i, '')
          : `Imported Map`;
        get().addDebugLog(`[STORE importMapData] New Name: ${newName}`);
        set((state) => ({
          ...initialStateBase,
          mapData: importedData,
          mapName: newName,
          mapId: state.isNewMapMode
            ? 'new'
            : state.mapId || `imported-${Date.now()}`,
          isViewOnlyMode: false,
          isLoading: false,
          initialLoadComplete: true,
          error: null,
          debugLogs: get().debugLogs,
          focusViewOnNodeIds: null,
          triggerFocusView: false,
        }));
        useConceptMapStore.temporal.getState().clear();
      },
      resetStore: () => {
        set({ ...initialStateBase, initialLoadComplete: false, debugLogs: [] });
        useConceptMapStore.temporal.getState().clear();
      },
      addNode: (options) => {
        const newNodeId = options.id || uniqueNodeId();
        const newNode: ConceptMapNode = {
          id: newNodeId,
          text: options.text,
          type: options.type,
          x: options.position.x,
          y: options.position.y,
          details: options.details || '',
          parentNode: options.parentNode,
          childIds: [],
          backgroundColor: options.backgroundColor,
          shape: options.shape || 'rectangle',
          width: options.width ?? 150,
          height: options.height ?? 70,
        };
        set((state) => {
          let newNodes = [...state.mapData.nodes, newNode];
          if (options.parentNode) {
            newNodes = newNodes.map((n) => {
              if (n.id === options.parentNode) {
                return { ...n, childIds: [...(n.childIds || []), newNode.id] };
              }
              return n;
            });
          }
          return { mapData: { ...state.mapData, nodes: newNodes } };
        });
        // After node is added, set it as the temporary target for tutorials
        get().setTutorialTempTargetNodeId(newNodeId);
        get().addDebugLog(
          `[STORE addNode] Node ${newNodeId} added and set as tutorial target.`
        );
        return newNodeId;
      },
      updateNode: (nodeId, updates) =>
        set((state) => ({
          mapData: {
            ...state.mapData,
            nodes: state.mapData.nodes.map((node) =>
              node.id === nodeId ? { ...node, ...updates } : node
            ),
          },
        })),
      deleteNode: (nodeIdToDelete) => {
        get().addDebugLog(
          `[STORE deleteNode GraphAdapter] Attempting to delete node: ${nodeIdToDelete} and its descendants.`
        );
        set((state) => {
          const graphUtil = new GraphAdapterUtility();
          const graphInstance = graphUtil.fromArrays(
            state.mapData.nodes,
            state.mapData.edges
          );
          if (!graphInstance.hasNode(nodeIdToDelete)) {
            return state;
          }
          const descendants = graphUtil.getDescendants(
            graphInstance,
            nodeIdToDelete
          );
          const nodesToDeleteSet = new Set<string>([
            nodeIdToDelete,
            ...descendants,
          ]);
          const finalNodesToKeep = state.mapData.nodes
            .filter((node) => !nodesToDeleteSet.has(node.id))
            .map((node) => ({
              ...node,
              childIds: node.childIds?.filter(
                (childId) => !nodesToDeleteSet.has(childId)
              ),
            }));
          const edgesToKeep = state.mapData.edges.filter(
            (edge) =>
              !nodesToDeleteSet.has(edge.source) &&
              !nodesToDeleteSet.has(edge.target)
          );
          let { selectedElementId, selectedElementType } = state;
          if (selectedElementId && nodesToDeleteSet.has(selectedElementId)) {
            selectedElementId = null;
            selectedElementType = null;
          }
          return {
            mapData: { nodes: finalNodesToKeep, edges: edgesToKeep },
            selectedElementId,
            selectedElementType,
            multiSelectedNodeIds: state.multiSelectedNodeIds.filter(
              (id) => !nodesToDeleteSet.has(id)
            ),
            aiProcessingNodeId:
              state.aiProcessingNodeId &&
              nodesToDeleteSet.has(state.aiProcessingNodeId)
                ? null
                : state.aiProcessingNodeId,
            editingNodeId:
              state.editingNodeId && nodesToDeleteSet.has(state.editingNodeId)
                ? null
                : state.editingNodeId,
          };
        });
      },
      addEdge: (options) => {
        const newEdgeId = options.id || uniqueEdgeId();
        const newEdge: ConceptMapEdge = {
          id: newEdgeId,
          source: options.source,
          target: options.target,
          sourceHandle: options.sourceHandle || null,
          targetHandle: options.targetHandle || null,
          label: options.label || 'connects',
          color: options.color,
          lineType: options.lineType || 'solid',
          markerStart: options.markerStart || 'none',
          markerEnd: options.markerEnd || 'arrowclosed',
        };
        set((state) => ({
          mapData: {
            ...state.mapData,
            edges: [...state.mapData.edges, newEdge],
          },
        }));
        get().setTutorialTempTargetEdgeId(newEdgeId); // Set temp target for tutorial
        get().addDebugLog(
          `[STORE addEdge] Edge ${newEdgeId} added and set as tutorial target.`
        );
        return newEdgeId;
      },
      updateEdge: (edgeId, updates) =>
        set((state) => ({
          mapData: {
            ...state.mapData,
            edges: state.mapData.edges.map((edge) =>
              edge.id === edgeId ? { ...edge, ...updates } : edge
            ),
          },
        })),
      deleteEdge: (edgeId) =>
        set((state) => ({
          mapData: {
            ...state.mapData,
            edges: state.mapData.edges.filter((edge) => edge.id !== edgeId),
          },
          selectedElementId:
            state.selectedElementId === edgeId ? null : state.selectedElementId,
          selectedElementType:
            state.selectedElementId === edgeId
              ? null
              : state.selectedElementType,
        })),
      setStagedMapData: (data: StagedMapDataWithContext | null) =>
        set({
          stagedMapData: data,
          isStagingActive: !!data,
          ghostPreviewData: null,
        }),
      clearStagedMapData: () =>
        set({ stagedMapData: null, isStagingActive: false }),
      commitStagedMapData: () => {
        const stagedData = get().stagedMapData;
        if (!stagedData) return;
        set((state) => {
          let finalNodes = [...state.mapData.nodes];
          let finalEdges = [...state.mapData.edges];
          if (
            stagedData.actionType === 'intermediateNode' &&
            stagedData.originalElementId
          ) {
            finalEdges = finalEdges.filter(
              (edge) => edge.id !== stagedData.originalElementId
            );
            get().addDebugLog(
              `[STORE commitStagedMapData] Original edge ${stagedData.originalElementId} deleted for intermediateNode action.`
            );
            stagedData.nodes.forEach((n) =>
              finalNodes.push({ ...n, id: uniqueNodeId() })
            ); // Ensure new nodes get truly unique IDs
            // Ensure edges connect to the *new* unique IDs of staged nodes if they were part of the staged data.
            // This requires mapping old staged IDs to new permanent IDs if edges reference other staged nodes.
            // For intermediateNode, this is simple as it's one new node.
            const stagedNodeToPermanentIdMap = new Map<string, string>();
            stagedData.nodes.forEach((node, index) => {
              const permanentId =
                finalNodes[
                  finalNodes.length - (stagedData.nodes.length - index)
                ].id; // Get ID of just pushed node
              stagedNodeToPermanentIdMap.set(node.id, permanentId);
            });

            stagedData.edges.forEach((e) => {
              const sourceId =
                stagedNodeToPermanentIdMap.get(e.source) || e.source; // Use permanent ID if source was staged
              const targetId =
                stagedNodeToPermanentIdMap.get(e.target) || e.target; // Use permanent ID if target was staged
              finalEdges.push({
                ...e,
                id: uniqueEdgeId(),
                source: sourceId,
                target: targetId,
              });
            });
          } else if (stagedData.actionType === 'aiTidyUpComplete') {
            get().addDebugLog(
              `[STORE commitStagedMapData] Processing aiTidyUpComplete.`
            );
            const stagedParentNodeInfo = stagedData.nodes.find((n) =>
              n.id.startsWith('staged-parent-')
            );
            let newPermanentParentId = '';
            const stagedNodeToPermanentIdMap = new Map<string, string>();

            if (stagedParentNodeInfo) {
              newPermanentParentId = uniqueNodeId();
              finalNodes.push({
                ...stagedParentNodeInfo,
                id: newPermanentParentId,
                childIds: [],
              }); // childIds will be populated below
              stagedNodeToPermanentIdMap.set(
                stagedParentNodeInfo.id,
                newPermanentParentId
              );
            }

            const childNodeUpdates = stagedData.nodes.filter(
              (n) => !n.id.startsWith('staged-parent-')
            );
            const finalChildIdsForParent: string[] = [];

            childNodeUpdates.forEach((stagedChild) => {
              const existingNodeIndex = finalNodes.findIndex(
                (n) => n.id === stagedChild.id
              );
              if (existingNodeIndex !== -1) {
                // Modifying existing node
                finalNodes[existingNodeIndex] = {
                  ...finalNodes[existingNodeIndex],
                  x: stagedChild.x,
                  y: stagedChild.y,
                  parentNode:
                    newPermanentParentId ||
                    finalNodes[existingNodeIndex].parentNode, // Assign new parent if created
                  width:
                    stagedChild.width || finalNodes[existingNodeIndex].width,
                  height:
                    stagedChild.height || finalNodes[existingNodeIndex].height,
                };
                if (newPermanentParentId)
                  finalChildIdsForParent.push(finalNodes[existingNodeIndex].id);
              } else {
                // Adding new node (should not happen for aiTidyUpComplete if only existing nodes are tidied)
                const newChildId = uniqueNodeId();
                finalNodes.push({
                  ...stagedChild,
                  id: newChildId,
                  parentNode: newPermanentParentId || stagedChild.parentNode,
                });
                stagedNodeToPermanentIdMap.set(stagedChild.id, newChildId);
                if (newPermanentParentId)
                  finalChildIdsForParent.push(newChildId);
              }
            });
            if (newPermanentParentId) {
              const parentIndex = finalNodes.findIndex(
                (n) => n.id === newPermanentParentId
              );
              if (parentIndex !== -1) {
                finalNodes[parentIndex].childIds = finalChildIdsForParent;
              }
            }
            // Edges are usually not modified by tidy up, but if they were part of stagedData, handle them
            (stagedData.edges || []).forEach((e) => {
              const sourceId =
                stagedNodeToPermanentIdMap.get(e.source) || e.source;
              const targetId =
                stagedNodeToPermanentIdMap.get(e.target) || e.target;
              finalEdges.push({
                ...e,
                id: uniqueEdgeId(),
                source: sourceId,
                target: targetId,
              });
            });
          } else {
            // Default: add all staged nodes and edges with new IDs
            const stagedNodeToPermanentIdMap = new Map<string, string>();
            stagedData.nodes.forEach((n) => {
              const permanentId = uniqueNodeId();
              finalNodes.push({ ...n, id: permanentId });
              stagedNodeToPermanentIdMap.set(n.id, permanentId);
            });
            (stagedData.edges || []).forEach((e) => {
              const sourceId =
                stagedNodeToPermanentIdMap.get(e.source) || e.source;
              const targetId =
                stagedNodeToPermanentIdMap.get(e.target) || e.target;
              finalEdges.push({
                ...e,
                id: uniqueEdgeId(),
                source: sourceId,
                target: targetId,
              });
            });
          }
          return {
            mapData: { nodes: finalNodes, edges: finalEdges },
            stagedMapData: null,
            isStagingActive: false,
          };
        });
        get().addDebugLog(
          `[STORE commitStagedMapData] Committed staged data. Action: ${stagedData.actionType || 'none'}`
        );
      },
      deleteFromStagedMapData: (elementIdsToRemove) => {
        const currentStagedData = get().stagedMapData;
        if (!currentStagedData) return;
        const newStagedNodes = currentStagedData.nodes.filter(
          (node) => !elementIdsToRemove.includes(node.id)
        );
        const remainingNodeIds = new Set(newStagedNodes.map((node) => node.id));
        const newStagedEdges = (currentStagedData.edges || []).filter(
          (edge) =>
            !elementIdsToRemove.includes(edge.id) &&
            remainingNodeIds.has(edge.source) &&
            remainingNodeIds.has(edge.target)
        );
        if (newStagedNodes.length === 0 && newStagedEdges.length === 0) {
          set({ stagedMapData: null, isStagingActive: false });
        } else {
          set({
            stagedMapData: {
              ...currentStagedData,
              nodes: newStagedNodes,
              edges: newStagedEdges,
            },
            isStagingActive: true,
          });
        } // Persist actionType and other context
      },
      // setConceptExpansionPreview: (preview) => set({ conceptExpansionPreview: preview }), // Removed
      // updateConceptExpansionPreviewNode: (previewNodeId, newText, newDetails) => { // Removed
      // set((state) => {
      // if (!state.conceptExpansionPreview || !state.conceptExpansionPreview.previewNodes) return state;
      // const updatedPreviewNodes = state.conceptExpansionPreview.previewNodes.map(node =>
      // node.id === previewNodeId ? { ...node, text: newText, details: newDetails ?? node.details } : node
      // );
      // return { ...state, conceptExpansionPreview: { ...state.conceptExpansionPreview, previewNodes: updatedPreviewNodes }};
      // });
      // },
      applyLayout: (updatedNodePositions) => {
        set((state) => {
          const updatedNodesMap = new Map<string, LayoutNodeUpdate>();
          updatedNodePositions.forEach((update) =>
            updatedNodesMap.set(update.id, update)
          );
          const newNodes = state.mapData.nodes.map((node) => {
            const updateForNode = updatedNodesMap.get(node.id);
            if (updateForNode) {
              return { ...node, x: updateForNode.x, y: updateForNode.y };
            }
            return node;
          });
          if (
            newNodes.some(
              (nn, i) =>
                nn.x !== state.mapData.nodes[i].x ||
                nn.y !== state.mapData.nodes[i].y
            )
          ) {
            return { mapData: { ...state.mapData, nodes: newNodes } };
          }
          return state;
        });
        set({ triggerFitView: true });
      },
      startConnectionMode: (nodeId) =>
        set({
          isConnectingMode: true,
          connectionSourceNodeId: nodeId,
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [],
        }),
      completeConnectionMode: (
        targetNodeId?: string,
        targetHandleId?: string | null
      ) => {
        const sourceNodeId = get().connectionSourceNodeId;
        if (sourceNodeId && targetNodeId) {
          get().addEdge({
            source: sourceNodeId,
            target: targetNodeId,
            label: 'connects',
          });
        }
        set({ isConnectingMode: false, connectionSourceNodeId: null });
      },
      cancelConnectionMode: () =>
        set({
          isConnectingMode: false,
          connectionSourceNodeId: null,
          dragPreviewItem: null,
          draggedRelationLabel: null,
        }),
      setDragPreview: (item) => set({ dragPreviewItem: item }),
      updateDragPreviewPosition: (position) =>
        set({
          dragPreviewPosition: position as { x: number; y: number } | null,
        }),
      clearDragPreview: () =>
        set({
          dragPreviewItem: null,
          dragPreviewPosition: null,
          draggedRelationLabel: null,
        }),
      setDraggedRelationPreview: (label) =>
        set({ draggedRelationLabel: label }),
      setTriggerFitView: (value) => set({ triggerFitView: value }),
      toggleOverviewMode: () =>
        set((state) => ({
          isOverviewModeActive: !state.isOverviewModeActive,
          selectedElementId: null,
          selectedElementType: null,
          multiSelectedNodeIds: [],
          focusViewOnNodeIds: null,
          triggerFocusView: false,
        })),
      setProjectOverviewData: (data) =>
        set({ projectOverviewData: data, isFetchingOverview: false }),
      setIsFetchingOverview: (fetching) =>
        set({ isFetchingOverview: fetching }),
      fetchProjectOverview: async (input) => {
        if (get().isFetchingOverview) return;
        set({
          isFetchingOverview: true,
          projectOverviewData: null,
          error: null,
        });
        try {
          const overviewData = await generateProjectOverviewFlow(input);
          set({
            projectOverviewData: overviewData,
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
            error: `Overview Error: ${(e as Error).message}`,
          });
        }
      },
      loadExampleMapData: (mapDataToLoad, exampleName) => {
        get().addDebugLog(
          `[STORE loadExampleMapData] Loading example: ${exampleName}`
        );
        set({
          ...initialStateBase,
          mapId: `example-${exampleName.toLowerCase().replace(/\s+/g, '-')}`,
          mapName: `${exampleName} (Example)`,
          currentMapOwnerId: 'example-user',
          currentMapCreatedAt: new Date().toISOString(),
          isPublic: true,
          mapData: mapDataToLoad,
          isNewMapMode: false,
          isViewOnlyMode: true,
          initialLoadComplete: true,
          debugLogs: get().debugLogs,
        });
        useConceptMapStore.temporal.getState().clear();
        set({ triggerFitView: true });
      },
      setGhostPreview: (nodesToPreview) => {
        const currentNodes = get().mapData.nodes;
        const previewNodesWithOriginalData = nodesToPreview.map(
          (previewNode) => {
            const originalNode = currentNodes.find(
              (n) => n.id === previewNode.id
            );
            return {
              ...previewNode,
              originalX: originalNode?.x,
              originalY: originalNode?.y,
              width: originalNode?.width || previewNode.width || 150,
              height: originalNode?.height || previewNode.height || 70,
            };
          }
        );
        set({
          ghostPreviewData: { nodes: previewNodesWithOriginalData },
          stagedMapData: null,
          isStagingActive: false,
        });
        get().addDebugLog(
          `[STORE setGhostPreview] Ghost preview set for ${nodesToPreview.length} nodes. Staging cleared.`
        );
      },
      acceptGhostPreview: () => {
        const previewData = get().ghostPreviewData;
        if (!previewData) return;
        const updates: LayoutNodeUpdate[] = previewData.nodes.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
        }));
        get().applyLayout(updates);
        set({ ghostPreviewData: null });
        get().addDebugLog(
          `[STORE acceptGhostPreview] Ghost preview accepted and applied.`
        );
      },
      cancelGhostPreview: () => {
        set({ ghostPreviewData: null });
        get().addDebugLog(
          `[STORE cancelGhostPreview] Ghost preview cancelled.`
        );
      },
      setStructuralSuggestions: (suggestions) =>
        set({ structuralSuggestions: suggestions }),
      addStructuralSuggestion: (suggestion) =>
        set((state) => ({
          structuralSuggestions: [...state.structuralSuggestions, suggestion],
        })),
      updateStructuralSuggestion: (updatedSuggestion) =>
        set((state) => ({
          structuralSuggestions: state.structuralSuggestions.map((s) =>
            s.id === updatedSuggestion.id ? { ...s, ...updatedSuggestion } : s
          ),
        })),
      removeStructuralSuggestion: (suggestionId) =>
        set((state) => ({
          structuralSuggestions: state.structuralSuggestions.filter(
            (s) => s.id !== suggestionId
          ),
        })),
      clearStructuralSuggestions: () => set({ structuralSuggestions: [] }),
      findEdgeByNodes: (sourceId, targetId) => {
        return get().mapData.edges.find(
          (edge) =>
            (edge.source === sourceId && edge.target === targetId) ||
            (edge.source === targetId && edge.target === sourceId)
        );
      },
      applyFormGroupSuggestion: (nodeIds, groupName, overlayGeometry) => {
        const { addNode: addNodeAction, updateNode: updateNodeAction } = get();
        let groupNodeX = 100,
          groupNodeY = 100;
        if (
          overlayGeometry &&
          overlayGeometry.x !== undefined &&
          overlayGeometry.y !== undefined
        ) {
          groupNodeX =
            overlayGeometry.x + (overlayGeometry.width || 300) / 2 - 75; // Center the new group node textually
          groupNodeY = overlayGeometry.y + 20; // Position it near the top of the overlay
        } else {
          // Fallback if no geometry: average position of nodes, then offset upwards.
          const groupNodes = get().mapData.nodes.filter(
            (n) =>
              nodeIds.includes(n.id) && n.x !== undefined && n.y !== undefined
          );
          if (groupNodes.length > 0) {
            groupNodeX =
              groupNodes.reduce((acc, n) => acc + n.x!, 0) / groupNodes.length;
            groupNodeY =
              groupNodes.reduce((acc, n) => acc + n.y!, 0) / groupNodes.length -
              50; // Offset upwards
          }
        }
        const newGroupId = addNodeAction({
          text: groupName || 'New Group',
          type: 'ai-group-parent', // MODIFIED HERE
          position: { x: groupNodeX, y: groupNodeY },
          width: overlayGeometry?.width
            ? Math.max(overlayGeometry.width * 0.8, 200)
            : 200,
          height: overlayGeometry?.height
            ? Math.max(overlayGeometry.height * 0.8, 100)
            : 100, // MODIFIED HERE
        });
        nodeIds.forEach((nodeId) => {
          const nodeToUpdate = get().mapData.nodes.find((n) => n.id === nodeId);
          if (nodeToUpdate) {
            updateNodeAction(nodeId, { parentNode: newGroupId });
          }
        });
        get().addDebugLog(
          `[STORE applyFormGroupSuggestion] Group node ${newGroupId} created. Children: ${nodeIds.join(', ')} parented.`
        );
        return newGroupId;
      },
      // New action implementations for focus
      setFocusOnNodes: (nodeIds, isOverviewExit = false) => {
        const updates: Partial<ConceptMapState> = {
          focusViewOnNodeIds: nodeIds,
          triggerFocusView: true,
          ghostPreviewData: null, // Clear other previews
          stagedMapData: null,
          isStagingActive: false,
        };
        if (isOverviewExit) {
          updates.isOverviewModeActive = false;
        }
        set(updates);
        get().addDebugLog(
          `[STORE setFocusOnNodes] Focus set for nodes: ${nodeIds.join(', ')}. Triggered view update. Overview exit: ${isOverviewExit}`
        );
      },
      clearFocusViewTrigger: () => {
        set({ triggerFocusView: false });
        // Optionally clear focusViewOnNodeIds as well, depending on desired behavior
        // set({ focusViewOnNodeIds: null, triggerFocusView: false });
        get().addDebugLog(
          `[STORE clearFocusViewTrigger] Focus view trigger cleared.`
        );
      },
      setTutorialTempTargetNodeId: (nodeId) =>
        set({ tutorialTempTargetNodeId: nodeId }),
      setTutorialTempTargetEdgeId: (edgeId) =>
        set({ tutorialTempTargetEdgeId: edgeId }),
    }),
    {
      partialize: (state): TrackedState => {
        const {
          mapData,
          mapName,
          isPublic,
          sharedWithClassroomId,
          selectedElementId,
          selectedElementType,
          multiSelectedNodeIds,
          editingNodeId,
          stagedMapData,
          isStagingActive,
          /* conceptExpansionPreview REMOVED */ ghostPreviewData,
          structuralSuggestions,
          isOverviewModeActive,
          projectOverviewData,
          focusViewOnNodeIds,
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
          stagedMapData,
          isStagingActive,
          /* conceptExpansionPreview REMOVED */ ghostPreviewData,
          structuralSuggestions,
          isOverviewModeActive,
          projectOverviewData,
          focusViewOnNodeIds,
        };
      },
      limit: 50,
    }
  )
);

export default useConceptMapStore;
