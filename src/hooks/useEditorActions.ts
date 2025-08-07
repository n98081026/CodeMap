'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { ConceptMapNode, ConceptMapEdge } from '@/types';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { Routes } from '@/lib/routes';
import { useConceptMapStore } from '@/stores/concept-map-store';

interface UseEditorActionsProps {
  routeMapId: string;
  user: any;
}

export const useEditorActions = ({
  routeMapId,
  user,
}: UseEditorActionsProps) => {
  const { toast } = useToast();
  const router = useRouter();
  const { saveMap } = useConceptMapDataManager({ routeMapId, user });

  const {
    updateNode,
    updateEdge,
    deleteNode,
    deleteEdge,
    setSelectedElement,
    setMultiSelectedNodeIds,
    multiSelectedNodeIds,
    selectedElementId,
    selectedElementType,
  } = useConceptMapStore();

  // Save map action
  const handleSaveMap = useCallback(
    async (isViewOnly = false) => {
      try {
        await saveMap(isViewOnly);
      } catch (error) {
        console.error('Save map error:', error);
        toast({
          title: 'Save failed',
          description:
            error instanceof Error
              ? error.message
              : 'Failed to save the concept map. Please try again.',
          variant: 'destructive',
        });
      }
    },
    [saveMap, toast]
  );

  // Node actions
  const handleUpdateNode = useCallback(
    (nodeId: string, updates: Partial<ConceptMapNode>) => {
      updateNode(nodeId, updates);
    },
    [updateNode]
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updates: Partial<ConceptMapEdge>) => {
      updateEdge(edgeId, updates);
    },
    [updateEdge]
  );

  // Delete selected elements
  const handleDeleteSelectedElements = useCallback(() => {
    if (selectedElementType === 'node' && selectedElementId) {
      deleteNode(selectedElementId);
      setSelectedElement(null, null);
    } else if (selectedElementType === 'edge' && selectedElementId) {
      deleteEdge(selectedElementId);
      setSelectedElement(null, null);
    }

    // Delete multi-selected nodes
    if (multiSelectedNodeIds.length > 0) {
      multiSelectedNodeIds.forEach((nodeId) => deleteNode(nodeId));
      setMultiSelectedNodeIds([]);
    }
  }, [
    selectedElementType,
    selectedElementId,
    multiSelectedNodeIds,
    deleteNode,
    deleteEdge,
    setSelectedElement,
    setMultiSelectedNodeIds,
  ]);

  // Navigation actions
  const handleNewMap = useCallback(() => {
    router.push(Routes.ConceptMaps.NEW);
  }, [router]);

  const handleExportMap = useCallback(() => {
    try {
      const { mapData, mapName } = useConceptMapStore.getState();
      const dataStr = JSON.stringify(mapData, null, 2);
      const dataUri =
        'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

      const exportFileDefaultName = `${mapName || 'concept-map'}.json`;

      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();

      toast({
        title: 'Map exported',
        description: `${exportFileDefaultName} has been downloaded.`,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export the concept map.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const handleTriggerImport = useCallback(() => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const content = e.target?.result as string;
              const importedData = JSON.parse(content);

              // Validate the imported data structure
              if (importedData.nodes && importedData.edges) {
                const { setMapData } = useConceptMapStore.getState();
                setMapData(importedData);
                toast({
                  title: 'Map imported',
                  description: 'Concept map has been imported successfully.',
                });
              } else {
                throw new Error('Invalid concept map format');
              }
            } catch (parseError) {
              toast({
                title: 'Import failed',
                description:
                  'Invalid file format. Please select a valid concept map JSON file.',
                variant: 'destructive',
              });
            }
          };
          reader.readAsText(file);
        }
      };
      input.click();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: 'Failed to import the concept map.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Context menu actions
  const handleContextMenuAction = useCallback(
    (action: string, nodeId?: string) => {
      switch (action) {
        case 'edit':
          if (nodeId) {
            setSelectedElement(nodeId, 'node');
          }
          break;
        case 'delete':
          if (nodeId) {
            deleteNode(nodeId);
          }
          break;
        case 'duplicate':
          if (nodeId) {
            const { mapData, addNode } = useConceptMapStore.getState();
            const nodeToDuplicate = mapData.nodes.find((n) => n.id === nodeId);
            if (nodeToDuplicate) {
              const duplicatedNode = {
                ...nodeToDuplicate,
                id: `${nodeId}-copy-${Date.now()}`,
                text: `${nodeToDuplicate.text} (Copy)`,
                x: (nodeToDuplicate.x || 0) + 50,
                y: (nodeToDuplicate.y || 0) + 50,
              };
              addNode(duplicatedNode);
              toast({
                title: 'Node duplicated',
                description: 'Node has been duplicated successfully.',
              });
            }
          }
          break;
        default:
          break;
      }
    },
    [setSelectedElement, deleteNode, toast]
  );

  return {
    // State
    isSaving: false, // This should come from the store or data manager

    // Actions
    handleSaveMap,
    handleUpdateNode,
    handleUpdateEdge,
    handleDeleteSelectedElements,
    handleNewMap,
    handleExportMap,
    handleTriggerImport,
    handleContextMenuAction,
  };
};
