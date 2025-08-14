import { create } from 'zustand';
import { useMapDataStore } from './map-data-store';

export interface EditorUIState {
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[];
  editingNodeId: string | null;
  aiProcessingNodeId: string | null;
  connectingNodeId: string | null;
  isConnectingMode: boolean;
  connectionSourceNodeId: string | null;
  dragPreviewItem: { text: string; type: string } | null;
  dragPreviewPosition: { x: number; y: number } | null;
  draggedRelationLabel: string | null;
  triggerFitView: boolean;
  focusViewOnNodeIds: string[] | null;
  triggerFocusView: boolean;
  tutorialTempTargetNodeId: string | null;
  tutorialTempTargetEdgeId: string | null;

  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setAiProcessingNodeId: (nodeId: string | null) => void;
  startConnection: (nodeId: string) => void;
  cancelConnection: () => void;
  finishConnectionAttempt: (targetNodeId: string) => void;
  startConnectionMode: (nodeId: string) => void;
  completeConnectionMode: (targetNodeId?: string, targetHandleId?: string | null) => void;
  cancelConnectionMode: () => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  updateDragPreviewPosition: (position: { x: number; y: number } | null) => void;
  clearDragPreview: () => void;
  setDraggedRelationPreview: (label: string | null) => void;
  setTriggerFitView: (value: boolean) => void;
  setFocusOnNodes: (nodeIds: string[], isOverviewExit?: boolean) => void;
  clearFocusViewTrigger: () => void;
  setTutorialTempTargetNodeId: (nodeId: string | null) => void;
  setTutorialTempTargetEdgeId: (edgeId: string | null) => void;
}

export const useEditorUIStore = create<EditorUIState>((set, get) => ({
  selectedElementId: null,
  selectedElementType: null,
  multiSelectedNodeIds: [],
  editingNodeId: null,
  aiProcessingNodeId: null,
  connectingNodeId: null,
  isConnectingMode: false,
  connectionSourceNodeId: null,
  dragPreviewItem: null,
  dragPreviewPosition: null,
  draggedRelationLabel: null,
  triggerFitView: false,
  focusViewOnNodeIds: null,
  triggerFocusView: false,
  tutorialTempTargetNodeId: null,
  tutorialTempTargetEdgeId: null,

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
      useMapDataStore.getState().addEdge({
        source: sourceNodeId,
        target: targetNodeId,
        label: 'connects',
      });
    }
    set({ connectingNodeId: null });
  },
  startConnectionMode: (nodeId) =>
    set({
      isConnectingMode: true,
      connectionSourceNodeId: nodeId,
      selectedElementId: null,
      selectedElementType: null,
      multiSelectedNodeIds: [],
    }),
  completeConnectionMode: (targetNodeId?: string) => {
    const sourceNodeId = get().connectionSourceNodeId;
    if (sourceNodeId && targetNodeId) {
      useMapDataStore.getState().addEdge({
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
  updateDragPreviewPosition: (position) => set({ dragPreviewPosition: position }),
  clearDragPreview: () =>
    set({
      dragPreviewItem: null,
      dragPreviewPosition: null,
      draggedRelationLabel: null,
    }),
  setDraggedRelationPreview: (label) => set({ draggedRelationLabel: label }),
  setTriggerFitView: (value) => set({ triggerFitView: value }),
  setFocusOnNodes: (nodeIds, isOverviewExit = false) => {
    // This action might need to interact with other stores, e.g., the AI store
    // to clear previews. For now, it only sets its own state.
    set({
      focusViewOnNodeIds: nodeIds,
      triggerFocusView: true,
    });
  },
  clearFocusViewTrigger: () => set({ triggerFocusView: false }),
  setTutorialTempTargetNodeId: (nodeId) => set({ tutorialTempTargetNodeId: nodeId }),
  setTutorialTempTargetEdgeId: (edgeId) => set({ tutorialTempTargetEdgeId: edgeId }),
}));
