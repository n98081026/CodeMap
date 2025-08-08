'use client';

import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

import { AIActions } from './AIActions';
import { EditActions } from './EditActions';
import { FileActions } from './FileActions';
import { LayoutActions, type ArrangeAction } from './LayoutActions';
import { ToolbarSection } from './ToolbarSection';
import { ViewActions } from './ViewActions';

import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Routes } from '@/lib/routes';
import { useConceptMapStore } from '@/stores/concept-map-store';
import useTutorialStore from '@/stores/tutorial-store';

export interface EditorToolbarProps {
  onNewMap: () => void;
  onSaveMap: () => void;
  isSaving: boolean;
  onExportMap: () => void;
  onTriggerImport: () => void;
  onExtractConcepts: () => void;
  onSuggestRelations: () => void;
  onExpandConcept: () => void;
  onQuickCluster: () => void;
  onGenerateSnippetFromText: () => void;
  onSummarizeSelectedNodes: () => void;
  isViewOnlyMode?: boolean;
  onAddNodeToData?: () => void;
  onAddEdgeToData?: () => void;
  canAddEdge?: boolean;
  onToggleProperties: () => void;
  onToggleAiPanel: () => void;
  onToggleDebugLogViewer: () => void;
  isPropertiesPanelOpen?: boolean;
  isAiPanelOpen?: boolean;
  isDebugLogViewerOpen?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedNodeId: string | null;
  numMultiSelectedNodes: number;
  onAutoLayout?: () => void;
  arrangeActions?: ArrangeAction[];
}

export const EditorToolbarRefactored: React.FC<EditorToolbarProps> = ({
  onNewMap,
  onSaveMap,
  isSaving,
  onExportMap,
  onTriggerImport,
  onExtractConcepts,
  onSuggestRelations,
  onExpandConcept,
  onQuickCluster,
  onGenerateSnippetFromText,
  onSummarizeSelectedNodes,
  isViewOnlyMode = false,
  onAddNodeToData,
  onAddEdgeToData,
  canAddEdge = false,
  onToggleProperties,
  onToggleAiPanel,
  onToggleDebugLogViewer,
  isPropertiesPanelOpen = false,
  isAiPanelOpen = false,
  isDebugLogViewerOpen = false,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedNodeId,
  numMultiSelectedNodes,
  onAutoLayout,
  arrangeActions = [],
}) => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const router = useRouter();


  // Tutorial store
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback((s) => ({ startOrResumeTutorial: s.startOrResumeTutorial }), [])
  );

  // Local state for AI loading
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Enhanced AI action handlers with loading states
  const handleExtractConcepts = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onExtractConcepts();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onExtractConcepts]);

  const handleSuggestRelations = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onSuggestRelations();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onSuggestRelations]);

  const handleExpandConcept = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onExpandConcept();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onExpandConcept]);

  const handleQuickCluster = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onQuickCluster();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onQuickCluster]);

  const handleGenerateSnippetFromText = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onGenerateSnippetFromText();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onGenerateSnippetFromText]);

  const handleSummarizeSelectedNodes = useCallback(async () => {
    setIsLoadingAI(true);
    try {
      await onSummarizeSelectedNodes();
    } finally {
      setIsLoadingAI(false);
    }
  }, [onSummarizeSelectedNodes]);

  // Tutorial handler
  const handleStartTutorial = useCallback(() => {
    if (!isAuthenticated) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to access the tutorial.',
        variant: 'destructive',
      });
      router.push(Routes.LOGIN);
      return;
    }

    startOrResumeTutorial('editor');
  }, [isAuthenticated, startOrResumeTutorial, toast, router]);

  return (
    <div className='flex items-center gap-2 p-2 bg-background border-b border-border'>
      {/* File Actions */}
      <ToolbarSection withSeparator>
        <FileActions
          onNewMap={onNewMap}
          onSaveMap={onSaveMap}
          isSaving={isSaving}
          onExportMap={onExportMap}
          onTriggerImport={onTriggerImport}
          isViewOnlyMode={isViewOnlyMode}
        />
      </ToolbarSection>

      {/* Edit Actions */}
      <ToolbarSection withSeparator>
        <EditActions
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onAddNodeToData={onAddNodeToData}
          onAddEdgeToData={onAddEdgeToData}
          canAddEdge={canAddEdge}
          isViewOnlyMode={isViewOnlyMode}
        />
      </ToolbarSection>

      {/* AI Actions */}
      <ToolbarSection withSeparator>
        <AIActions
          onExtractConcepts={handleExtractConcepts}
          onSuggestRelations={handleSuggestRelations}
          onExpandConcept={handleExpandConcept}
          onQuickCluster={handleQuickCluster}
          onGenerateSnippetFromText={handleGenerateSnippetFromText}
          onSummarizeSelectedNodes={handleSummarizeSelectedNodes}
          selectedNodeId={selectedNodeId}
          numMultiSelectedNodes={numMultiSelectedNodes}
          isViewOnlyMode={isViewOnlyMode}
          isLoading={isLoadingAI}
        />
      </ToolbarSection>

      {/* Layout Actions */}
      <ToolbarSection withSeparator>
        <LayoutActions
          onAutoLayout={onAutoLayout}
          arrangeActions={arrangeActions}
          isViewOnlyMode={isViewOnlyMode}
        />
      </ToolbarSection>

      {/* View Actions */}
      <ToolbarSection>
        <ViewActions
          onToggleProperties={onToggleProperties}
          onToggleAiPanel={onToggleAiPanel}
          onToggleDebugLogViewer={onToggleDebugLogViewer}
          isPropertiesPanelOpen={isPropertiesPanelOpen}
          isAiPanelOpen={isAiPanelOpen}
          isDebugLogViewerOpen={isDebugLogViewerOpen}
          onStartTutorial={handleStartTutorial}
          isViewOnlyMode={isViewOnlyMode}
        />
      </ToolbarSection>
    </div>
  );
};

EditorToolbarRefactored.displayName = 'EditorToolbarRefactored';
