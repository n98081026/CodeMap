import type { TemporalState } from 'zundo';
import type { MapDataState } from './map-data-store';
import type { EditorUIState } from './editor-ui-store';
import type { MapMetaState } from './map-meta-store';
import type { AISuggestionState } from './ai-suggestion-store';

// This is the state with the temporal middleware's properties
type MapDataStateWithTemporal = MapDataState & {
  temporal: TemporalState<{ mapData: MapDataState['mapData'] }>;
};

// Selectors for map-data-store
export const selectMapData = (state: MapDataState) => state.mapData;
export const selectNodes = (state: MapDataState) => state.mapData.nodes;
export const selectEdges = (state: MapDataState) => state.mapData.edges;
export const selectNodesCount = (state: MapDataState) => state.mapData.nodes.length;
export const selectEdgesCount = (state: MapDataState) => state.mapData.edges.length;
export const selectCanUndo = (state: MapDataStateWithTemporal) => (state.temporal?.pastStates?.length ?? 0) > 0;
export const selectCanRedo = (state: MapDataStateWithTemporal) => (state.temporal?.futureStates?.length ?? 0) > 0;


// Selectors for editor-ui-store
export const selectHasSelection = (state: EditorUIState) =>
  state.selectedElementId !== null || state.multiSelectedNodeIds.length > 0;

export const selectEditorInteractions = (state: EditorUIState) => ({
    selectedElementId: state.selectedElementId,
    selectedElementType: state.selectedElementType,
    multiSelectedNodeIds: state.multiSelectedNodeIds,
    editingNodeId: state.editingNodeId,
});

// Selectors for map-meta-store
export const selectIsLoadingOrSaving = (state: MapMetaState) => state.isLoading || state.isSaving;

// Selectors for ai-suggestion-store
export const selectAIState = (state: AISuggestionState) => ({
    stagedMapData: state.stagedMapData,
    isStagingActive: state.isStagingActive,
    ghostPreviewData: state.ghostPreviewData,
});
