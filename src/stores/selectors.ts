// Optimized selectors for concept map store to prevent unnecessary re-renders
import type { TemporalState } from 'zundo';

import type { ConceptMapState } from './concept-map-store';

// This is the state with the temporal middleware's properties
type ConceptMapStateWithTemporal = ConceptMapState & {
  temporal: TemporalState<ConceptMapState>;
};

// Basic selectors with minimal dependencies
export const selectMapData = (state: ConceptMapState) => state.mapData;
export const selectMapId = (state: ConceptMapState) => state.mapId;
export const selectMapName = (state: ConceptMapState) => state.mapName;
export const selectSelectedElementId = (state: ConceptMapState) =>
  state.selectedElementId;
export const selectSelectedElementType = (state: ConceptMapState) =>
  state.selectedElementType;
export const selectMultiSelectedNodeIds = (state: ConceptMapState) =>
  state.multiSelectedNodeIds;
export const selectIsConnectingMode = (state: ConceptMapState) =>
  state.isConnectingMode;

// Computed selectors that derive data
export const selectNodesCount = (state: ConceptMapState) =>
  state.mapData.nodes.length;
export const selectEdgesCount = (state: ConceptMapState) =>
  state.mapData.edges.length;
export const selectHasSelection = (state: ConceptMapState) =>
  state.selectedElementId !== null || state.multiSelectedNodeIds.length > 0;

// AI-related selectors
export const selectAIExtractedConcepts = (state: ConceptMapState) =>
  state.aiExtractedConcepts;
export const selectAISuggestedRelations = (state: ConceptMapState) =>
  state.aiSuggestedRelations;
export const selectStagedMapData = (state: ConceptMapState) =>
  state.stagedMapData;
export const selectGhostPreviewData = (state: ConceptMapState) =>
  state.ghostPreviewData;

// Complex computed selectors
export const selectSelectedNode = (state: ConceptMapState) => {
  if (state.selectedElementType !== 'node' || !state.selectedElementId)
    return null;
  return (
    state.mapData.nodes.find((node) => node.id === state.selectedElementId) ||
    null
  );
};

export const selectSelectedEdge = (state: ConceptMapState) => {
  if (state.selectedElementType !== 'edge' || !state.selectedElementId)
    return null;
  return (
    state.mapData.edges.find((edge) => edge.id === state.selectedElementId) ||
    null
  );
};

export const selectMultiSelectedNodes = (state: ConceptMapState) => {
  if (state.multiSelectedNodeIds.length === 0) return [];
  return state.mapData.nodes.filter((node) =>
    state.multiSelectedNodeIds.includes(node.id)
  );
};

// Undo/Redo selectors
export const selectCanUndo = (state: ConceptMapStateWithTemporal) => {
  // Check if temporal state exists and has past states
  return (state.temporal?.pastStates?.length ?? 0) > 0;
};

export const selectCanRedo = (state: ConceptMapStateWithTemporal) => {
  // Check if temporal state exists and has future states
  return (state.temporal?.futureStates?.length ?? 0) > 0;
};

// Performance-optimized combined selectors
export const selectEditorUIState = (state: ConceptMapState) => ({
  selectedElementId: state.selectedElementId,
  selectedElementType: state.selectedElementType,
  multiSelectedNodeIds: state.multiSelectedNodeIds,
  isConnectingMode: state.isConnectingMode,
  editingNodeId: state.editingNodeId,
});

export const selectMapStats = (state: ConceptMapState) => ({
  nodeCount: state.mapData.nodes.length,
  edgeCount: state.mapData.edges.length,
  hasSelection:
    state.selectedElementId !== null || state.multiSelectedNodeIds.length > 0,
});

export const selectAIState = (state: ConceptMapState) => ({
  extractedConcepts: state.aiExtractedConcepts,
  suggestedRelations: state.aiSuggestedRelations,
  stagedMapData: state.stagedMapData,
  ghostPreviewData: state.ghostPreviewData,
});
