'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { useConceptMapStore } from '@/stores/concept-map-store';
import type { ConceptMapNode, ConceptMapEdge } from '@/types';

export const useEditorActions = (routeMapId: string) => {
  const { toast } = useToast();
  const router = useRouter();
  const { saveMapData, isLoading: isSaving } = useConceptMapDataManager();
  
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
  const handleSaveMap = useCallback(async () => {
    try {
      await saveMapData();
      toast({
        title: 'Map saved successfully',
        description: 'Your concept map has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Save failed',
        description: 'Failed to save the concept map. Please try again.',
        variant: 'destructive',
      });
    }
  }, [saveMapData, toast]);

  // Node actions
  const handleUpdateNode = useCallback((nodeId: string, updates: Partial<ConceptMapNode>) => {
    updateNode(nodeId, updates);
  }, [updateNode]);

  const handleUpdateEdge = useCallback((edgeId: string, updates: Partial<ConceptMapEdge>) => {
    updateEdge(edgeId, updates);
  }, [updateEdge]);

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
      multiSelectedNodeIds.forEach(nodeId => deleteNode(nodeId));
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
    router.push('/concept-maps/new');
  }, [router]);

  const handleExportMap = useCallback(() => {
    // TODO: Implement export functionality
    toast({
      title: 'Export feature',
      description: 'Export functionality will be implemented soon.',
    });
  }, [toast]);

  const handleTriggerImport = useCallback(() => {
    // TODO: Implement import functionality
    toast({
      title: 'Import feature',
      description: 'Import functionality will be implemented soon.',
    });
  }, [toast]);

  // Context menu actions
  const handleContextMenuAction = useCallback((action: string, nodeId?: string) => {
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
        // TODO: Implement duplicate functionality
        toast({
          title: 'Duplicate feature',
          description: 'Duplicate functionality will be implemented soon.',
        });
        break;
      default:
        break;
    }
  }, [setSelectedElement, deleteNode, toast]);

  return {
    // State
    isSaving,
    
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