'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { ConceptMapNode, ConceptMapEdge } from '@/types';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { Routes } from '@/lib/routes';
import { useEditorUIStore } from '@/stores/editor-ui-store';
import { useMapDataStore } from '@/stores/map-data-store';
import { useMapMetaStore } from '@/stores/map-meta-store';

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

  const { setMapName, setIsPublic } = useMapMetaStore();
  const {
    addNode,
    updateNode,
    updateEdge,
    deleteNode,
    deleteEdge,
    importMapData,
  } = useMapDataStore();

  const {
    setSelectedElement,
    setMultiSelectedNodeIds,
    multiSelectedNodeIds,
    selectedElementId,
    selectedElementType,
  } = useEditorUIStore();

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

  const handleAddNode = useCallback(() => {
    const { x, y } = useMapDataStore.getState().mapData.nodes.reduce(
      (acc, node) => ({
        x: acc.x + (node.x || 0),
        y: acc.y + (node.y || 0),
      }),
      { x: 0, y: 0 }
    );
    const count = useMapDataStore.getState().mapData.nodes.length;
    const position =
      count > 0 ? { x: x / count + 100, y: y / count } : { x: 250, y: 150 };

    const newNodeId = addNode({
      text: 'New Concept',
      type: 'default',
      position,
    });
    const newNode = useMapDataStore
      .getState()
      .mapData.nodes.find((n) => n.id === newNodeId);
    if (!newNode) {
      throw new Error('Failed to create and find new node in store.');
    }
    return newNode;
  }, [addNode]);

  const handleUpdateElement = useCallback(
    (
      elementId: string,
      elementType: 'node' | 'edge' | null,
      updates: Partial<ConceptMapNode> | Partial<ConceptMapEdge>
    ) => {
      if (elementType === 'node') {
        updateNode(elementId, updates as Partial<ConceptMapNode>);
      } else if (elementType === 'edge') {
        updateEdge(elementId, updates as Partial<ConceptMapEdge>);
      }
    },
    [updateNode, updateEdge]
  );

  const handleDeleteElement = useCallback(
    (elementId: string, elementType: 'node' | 'edge' | null) => {
      if (elementType === 'node') {
        deleteNode(elementId);
      } else if (elementType === 'edge') {
        deleteEdge(elementId);
      }
      setSelectedElement(null, null);
    },
    [deleteNode, deleteEdge, setSelectedElement]
  );

  const handleDeleteSelectedElements = useCallback(() => {
    if (selectedElementType === 'node' && selectedElementId) {
      deleteNode(selectedElementId);
      setSelectedElement(null, null);
    } else if (selectedElementType === 'edge' && selectedElementId) {
      deleteEdge(selectedElementId);
      setSelectedElement(null, null);
    }

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

  const handleNewMap = useCallback(() => {
    router.push(Routes.ConceptMaps.NEW);
  }, [router]);

  const handleExportMap = useCallback(() => {
    try {
      const { mapData } = useMapDataStore.getState();
      const { mapName } = useMapMetaStore.getState();
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

  const handleImportMap = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        const importedData = JSON.parse(content);
        if (importedData.nodes && importedData.edges) {
          importMapData(importedData);
          toast({
            title: 'Map imported',
            description: 'Concept map has been imported successfully.',
          });
        } else {
          throw new Error('Invalid concept map format');
        }
      } catch (error) {
        toast({
          title: 'Import failed',
          description:
            'Invalid file format or error reading file. Please select a valid concept map JSON file.',
          variant: 'destructive',
        });
      }
    },
    [importMapData, toast]
  );

  const handleUpdateMapProperties = useCallback(
    (updates: { name?: string; isPublic?: boolean }) => {
      if (updates.name !== undefined) {
        setMapName(updates.name);
      }
      if (updates.isPublic !== undefined) {
        setIsPublic(updates.isPublic);
      }
      toast({
        title: 'Map updated',
        description: 'Map properties have been updated.',
      });
    },
    [setMapName, setIsPublic, toast]
  );

  const handleContextMenuAction = useCallback(
    (action: string, nodeId?: string) => {
      switch (action) {
        case 'edit':
          if (nodeId) setSelectedElement(nodeId, 'node');
          break;
        case 'delete':
          if (nodeId) deleteNode(nodeId);
          break;
        case 'duplicate':
          if (nodeId) {
            const nodeToDuplicate = useMapDataStore
              .getState()
              .mapData.nodes.find((n) => n.id === nodeId);
            if (nodeToDuplicate) {
              addNode({
                ...nodeToDuplicate,
                id: undefined,
                text: `${nodeToDuplicate.text} (Copy)`,
                position: {
                  x: (nodeToDuplicate.x || 0) + 50,
                  y: (nodeToDuplicate.y || 0) + 50,
                },
              });
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
    [setSelectedElement, deleteNode, addNode, toast]
  );

  return {
    isSaving: useMapMetaStore((s) => s.isSaving),
    saveMap: handleSaveMap,
    addNode: handleAddNode,
    updateElement: handleUpdateElement,
    deleteElement: handleDeleteElement,
    deleteSelectedElements: handleDeleteSelectedElements,
    newMap: handleNewMap,
    exportMap: handleExportMap,
    importMap: handleImportMap,
    updateMapProperties: handleUpdateMapProperties,
    contextMenuAction: handleContextMenuAction,
  };
};
