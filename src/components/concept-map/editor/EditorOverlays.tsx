import React from 'react';
import AIStagingToolbar from '@/components/concept-map/ai-staging-toolbar';
import GhostPreviewToolbar from '@/components/concept-map/GhostPreviewToolbar';
import AISuggestionFloater, { type SuggestionAction } from '@/components/concept-map/ai-suggestion-floater';
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';

interface EditorOverlaysProps {
  // Staging toolbar
  isStagingActive: boolean;
  isOverviewModeActive: boolean;
  handleCommitStagedData: () => void;
  handleClearStagedData: () => void;
  stagedItemCount: { nodes: number; edges: number };
  
  // AI suggestion floater
  floaterState: {
    isVisible: boolean;
    position?: { x: number; y: number };
    suggestions: SuggestionAction[];
    title?: string;
  };
  Floater_handleDismiss: () => void;
  
  // Context menu
  contextMenu: {
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null;
  closeContextMenu: () => void;
  handleDeleteNodeFromContextMenu: () => void;
  storeIsViewOnlyMode: boolean;
}

const EditorOverlays: React.FC<EditorOverlaysProps> = React.memo(({
  isStagingActive,
  isOverviewModeActive,
  handleCommitStagedData,
  handleClearStagedData,
  stagedItemCount,
  floaterState,
  Floater_handleDismiss,
  contextMenu,
  closeContextMenu,
  handleDeleteNodeFromContextMenu,
  storeIsViewOnlyMode,
}) => {
  return (
    <>
      <AIStagingToolbar
        isVisible={isStagingActive && !isOverviewModeActive}
        onCommit={handleCommitStagedData}
        onClear={handleClearStagedData}
        stagedItemCount={stagedItemCount}
      />
      
      <GhostPreviewToolbar />
      
      <AISuggestionFloater
        isVisible={floaterState.isVisible && !isOverviewModeActive}
        position={floaterState.position || { x: 0, y: 0 }}
        suggestions={floaterState.suggestions}
        onDismiss={Floater_handleDismiss}
        title={floaterState.title || 'Quick Actions'}
      />
      
      {contextMenu?.isOpen && contextMenu.nodeId && !isOverviewModeActive && (
        <NodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={closeContextMenu}
          onDeleteNode={handleDeleteNodeFromContextMenu}
          onExpandConcept={() => {
            closeContextMenu();
          }}
          onSuggestRelations={() => {
            closeContextMenu();
          }}
          onExtractConcepts={() => {
            closeContextMenu();
          }}
          onAskQuestion={() => {
            closeContextMenu();
          }}
          onRewriteContent={() => {
            closeContextMenu();
          }}
          isViewOnlyMode={storeIsViewOnlyMode}
        />
      )}
    </>
  );
});

EditorOverlays.displayName = 'EditorOverlays';

export default EditorOverlays;