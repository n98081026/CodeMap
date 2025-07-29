'use client';

import { useCallback, useState } from 'react';

import type { VisualEdgeSuggestion } from '@/types';

export interface EditorState {
  // Panel states
  isPropertiesPanelOpen: boolean;
  isAiPanelOpen: boolean;
  isDebugLogViewerOpen: boolean;
  
  // Context menu state
  contextMenuState: {
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
  };
  
  // Visual edge suggestion
  activeVisualEdgeSuggestion: VisualEdgeSuggestion | null;
}

export const useEditorState = () => {
  const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isDebugLogViewerOpen, setIsDebugLogViewerOpen] = useState(false);
  
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    nodeId: null,
  });
  
  const [activeVisualEdgeSuggestion, setActiveVisualEdgeSuggestion] =
    useState<VisualEdgeSuggestion | null>(null);

  // Panel toggle functions
  const togglePropertiesPanel = useCallback(() => {
    setIsPropertiesPanelOpen(prev => !prev);
  }, []);

  const toggleAiPanel = useCallback(() => {
    setIsAiPanelOpen(prev => !prev);
  }, []);

  const toggleDebugLogViewer = useCallback(() => {
    setIsDebugLogViewerOpen(prev => !prev);
  }, []);

  // Context menu functions
  const openContextMenu = useCallback((position: { x: number; y: number }, nodeId: string | null) => {
    setContextMenuState({
      isOpen: true,
      position,
      nodeId,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(prev => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // Visual edge suggestion functions
  const setVisualEdgeSuggestion = useCallback((suggestion: VisualEdgeSuggestion | null) => {
    setActiveVisualEdgeSuggestion(suggestion);
  }, []);

  return {
    // State
    isPropertiesPanelOpen,
    isAiPanelOpen,
    isDebugLogViewerOpen,
    contextMenuState,
    activeVisualEdgeSuggestion,
    
    // Actions
    togglePropertiesPanel,
    toggleAiPanel,
    toggleDebugLogViewer,
    openContextMenu,
    closeContextMenu,
    setVisualEdgeSuggestion,
  };
};