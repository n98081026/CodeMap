import { create } from 'zustand';
import { useMapDataStore } from './map-data-store';

export interface EditorUIState {
  // Selection
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[];

  // Node states
  editingNodeId: string | null;
  aiProcessingNodeId: string | null;

  // Connection mode
  connectingNodeId: string | null;
  isConnectingMode: boolean;
  connectionSourceNodeId: string | null;

  // Drag and Drop
  dragPreviewItem: { text: string; type: string } | null;
  dragPreviewPosition: { x: number; y: number } | null;
  draggedRelationLabel: string | null;

  // Viewport control
  triggerFitView: boolean;
  focusViewOnNodeIds: string[] | null;
  triggerFocusView: boolean;

  // Tutorial
  tutorialTempTargetNodeId: string | null;
  tutorialTempTargetEdgeId: string | null;

  // Actions
  setSelectedElement: (id: string | null, type: 'node' | 'edge' | null) => void;
  setMultiSelectedNodeIds: (ids: string[]) => void;
  setEditingNodeId: (nodeId: string | null) => void;
  setAiProcessingNodeId: (nodeId: string | null) => void;

  // Connection actions
  startConnection: (nodeId: string) => void;
  cancelConnection: () => void;
  finishConnectionAttempt: (targetNodeId: string) => void;

  // Drag and Drop actions
  setDragPreview: (item: { text: string; type: string } | null) => void;
  updateDragPreviewPosition: (position: { x: number; y: number } | null) => void;
  clearDragPreview: () => void;
  setDraggedRelationPreview: (label: string | null) => void;

  // Viewport actions
  setTriggerFitView: (value: boolean) => void;
  setFocusOnNodes: (nodeIds: string[], isOverviewExit?: boolean) => void;
  clearFocusViewTrigger: () => void;

  // Tutorial actions
  setTutorialTempTargetNodeId: (nodeId: string | null) => void;
  setTutorialTempTargetEdgeId: (edgeId: string | null) => void;
}

export const useEditorUIStore = create<EditorUIState>((set, get) => ({
  // Initial State
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

  // Actions
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
  cancelConnection: () => set({ connectingNodeId: null, isConnectingMode: false, connectionSourceNodeId: null }),
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
    set({
      focusViewOnNodeIds: nodeIds,
      triggerFocusView: true,
    });
  },
  clearFocusViewTrigger: () => set({ triggerFocusView: false }),

  setTutorialTempTargetNodeId: (nodeId) => set({ tutorialTempTargetNodeId: nodeId }),
  setTutorialTempTargetEdgeId: (edgeId) => set({ tutorialTempTargetEdgeId: edgeId }),
}));
