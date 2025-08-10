import { useCallback, useState } from 'react';

import type {
  ConceptMapNode,
  ConceptMapEdge,
  VisualEdgeSuggestion,
} from '@/types';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapStore } from '@/stores/concept-map-store';

interface UseEditorEventHandlersProps {
  updateStoreNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  updateStoreEdge: (edgeId: string, updates: Partial<ConceptMapEdge>) => void;
  setStoreSelectedElement: (
    id: string | null,
    type: 'node' | 'edge' | null
  ) => void;
  setStoreMultiSelectedNodeIds: (nodeIds: string[]) => void;
  storeIsViewOnlyMode: boolean;
}

export const useEditorEventHandlers = ({
  updateStoreNode,
  updateStoreEdge,
  setStoreSelectedElement,
  setStoreMultiSelectedNodeIds,
  storeIsViewOnlyMode,
}: UseEditorEventHandlersProps) => {
  const { toast } = useToast();

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);

  // Visual edge suggestion state
  const [activeVisualEdgeSuggestion, setActiveVisualEdgeSuggestion] =
    useState<VisualEdgeSuggestion | null>(null);

  // Staged element selection state
  const [selectedStagedElementIds, setSelectedStagedElementIds] = useState<
    string[]
  >([]);

  // Flow selection handlers
  const handleFlowSelectionChange = useCallback(
    (id: string | null, type: 'node' | 'edge' | null) => {
      setStoreSelectedElement(id, type);
    },
    [setStoreSelectedElement]
  );

  const handleMultiNodeSelectionChange = useCallback(
    (nodeIds: string[]) => {
      setStoreMultiSelectedNodeIds(nodeIds);
    },
    [setStoreMultiSelectedNodeIds]
  );

  // Context menu handlers
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: ConceptMapNode) => {
      if (storeIsViewOnlyMode) return;

      event.preventDefault();
      setContextMenu({
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    [storeIsViewOnlyMode]
  );

  const handlePaneContextMenuRequest = useCallback(
    (event: React.MouseEvent, positionInFlow: { x: number; y: number }) => {
      if (storeIsViewOnlyMode) return;
      // Handle pane context menu if needed
    },
    [storeIsViewOnlyMode]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleDeleteNodeFromContextMenu = useCallback(() => {
    if (contextMenu?.nodeId) {
      useConceptMapStore.getState().deleteNode(contextMenu.nodeId);
      closeContextMenu();
      toast({
        title: 'Node deleted',
        description: 'The node has been removed from the map.',
      });
    }
  }, [contextMenu?.nodeId, closeContextMenu, toast]);

  // Concept suggestion drop handler
  const handleConceptSuggestionDrop = useCallback(
    (
      conceptItem: { concept: string; context?: string },
      position: { x: number; y: number }
    ) => {
      if (storeIsViewOnlyMode) return;

      useConceptMapStore.getState().addNode({
        text: conceptItem.concept,
        details: conceptItem.context || '',
        position: position,
        type: 'manual-node', // Assign a default type for dropped nodes
      });

      toast({
        title: 'Concept added',
        description: `Added "${conceptItem.concept}" to the map.`,
      });
    },
    [storeIsViewOnlyMode, toast]
  );

  // Connection handlers
  const handleStartConnectionFromNode = useCallback(
    (nodeId: string) => {
      if (storeIsViewOnlyMode) return;
      useConceptMapStore.getState().startConnectionMode(nodeId);
    },
    [storeIsViewOnlyMode]
  );

  // Visual edge suggestion handlers
  const handleAcceptVisualEdge = useCallback(
    (suggestionId: string) => {
      if (
        activeVisualEdgeSuggestion &&
        activeVisualEdgeSuggestion.id === suggestionId
      ) {
        // Convert suggestion to actual edge
        const newEdge: ConceptMapEdge = {
          id: `edge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          source: activeVisualEdgeSuggestion.sourceNodeId,
          target: activeVisualEdgeSuggestion.targetNodeId,
          label: activeVisualEdgeSuggestion.suggestedLabel || '',
        };

        useConceptMapStore.getState().addEdge(newEdge);
        setActiveVisualEdgeSuggestion(null);

        toast({
          title: 'Edge added',
          description: 'The suggested connection has been added to the map.',
        });
      }
    },
    [activeVisualEdgeSuggestion, toast]
  );

  const handleRejectVisualEdge = useCallback(
    (suggestionId: string) => {
      if (
        activeVisualEdgeSuggestion &&
        activeVisualEdgeSuggestion.id === suggestionId
      ) {
        setActiveVisualEdgeSuggestion(null);
      }
    },
    [activeVisualEdgeSuggestion]
  );

  // Property update handlers
  const handleMapPropertiesChange = useCallback(() => {
    // Handle map properties change
  }, []);

  const handleSelectedElementPropertyUpdateInspector = useCallback(() => {
    // Handle selected element property update
  }, []);

  return {
    // State
    contextMenu,
    activeVisualEdgeSuggestion,
    selectedStagedElementIds,

    // Handlers
    handleFlowSelectionChange,
    handleMultiNodeSelectionChange,
    handleNodeContextMenu,
    handlePaneContextMenuRequest,
    closeContextMenu,
    handleDeleteNodeFromContextMenu,
    handleConceptSuggestionDrop,
    handleStartConnectionFromNode,
    handleAcceptVisualEdge,
    handleRejectVisualEdge,
    handleMapPropertiesChange,
    handleSelectedElementPropertyUpdateInspector,
    setSelectedStagedElementIds,
    setActiveVisualEdgeSuggestion,
  };
};
