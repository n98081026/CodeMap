'use client';

import React from 'react';

import AISuggestionPanel, {
  type ExtractedConceptItem,
  type RelationSuggestion,
} from '@/components/concept-map/ai-suggestion-panel';
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';
import ProjectOverviewDisplay from '@/components/concept-map/project-overview-display';
import { PropertiesInspector } from '@/components/concept-map/properties-inspector';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import type { ConceptMapData, ConceptMapNode } from '@/types';

interface EditorSidePanelsProps {
  // Properties Panel
  isPropertiesPanelOpen: boolean;
  selectedElementId: string | null;
  selectedElementType: 'node' | 'edge' | null;
  multiSelectedNodeIds: string[];
  mapData: ConceptMapData;
  isViewOnlyMode: boolean;
  onUpdateNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  onUpdateEdge: (edgeId: string, updates: any) => void;
  onDeleteSelectedElements: () => void;

  // AI Panel
  isAiPanelOpen: boolean;
  extractedConcepts: ExtractedConceptItem[];
  suggestedRelations: RelationSuggestion[];
  onAddExtractedConcepts: (concepts: ExtractedConceptItem[]) => void;
  onAddSuggestedRelations: (relations: RelationSuggestion[]) => void;
  onClearExtractedConcepts: () => void;
  onClearSuggestedRelations: () => void;

  // Project Overview
  isOverviewModeActive: boolean;
  projectOverviewData: any;
  isFetchingOverview: boolean;

  // Context Menu
  contextMenuState: {
    isOpen: boolean;
    position: { x: number; y: number };
    nodeId: string | null;
  };
  onCloseContextMenu: () => void;
  onContextMenuAction: (action: string, nodeId?: string) => void;
}

export const EditorSidePanels: React.FC<EditorSidePanelsProps> = ({
  isPropertiesPanelOpen,
  selectedElementId,
  selectedElementType,
  multiSelectedNodeIds,
  mapData,
  isViewOnlyMode,
  onUpdateNode,
  onUpdateEdge,
  onDeleteSelectedElements,
  isAiPanelOpen,
  extractedConcepts,
  suggestedRelations,
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  isOverviewModeActive,
  projectOverviewData,
  isFetchingOverview,
  contextMenuState,
  onCloseContextMenu,
  onContextMenuAction,
}) => {
  return (
    <>
      {/* Properties Panel */}
      <Sheet open={isPropertiesPanelOpen}>
        <SheetContent side='right' className='w-80 p-0'>
          <PropertiesInspector
            selectedElementId={selectedElementId}
            selectedElementType={selectedElementType}
            multiSelectedNodeIds={multiSelectedNodeIds}
            mapData={mapData}
            isViewOnlyMode={isViewOnlyMode}
            onUpdateNode={onUpdateNode}
            onUpdateEdge={onUpdateEdge}
            onDeleteSelectedElements={onDeleteSelectedElements}
          />
        </SheetContent>
      </Sheet>

      {/* AI Suggestion Panel */}
      <Sheet open={isAiPanelOpen}>
        <SheetContent side='left' className='w-96 p-4'>
          <AISuggestionPanel
            mapData={mapData}
            currentMapNodes={mapData.nodes}
            extractedConcepts={extractedConcepts}
            suggestedRelations={suggestedRelations}
            onAddExtractedConcepts={onAddExtractedConcepts}
            onAddSuggestedRelations={onAddSuggestedRelations}
            onClearExtractedConcepts={onClearExtractedConcepts}
            onClearSuggestedRelations={onClearSuggestedRelations}
            isViewOnlyMode={isViewOnlyMode}
          />
        </SheetContent>
      </Sheet>

      {/* Project Overview Panel */}
      <Sheet open={isOverviewModeActive}>
        <SheetContent side='left' className='w-96 p-4'>
          <ProjectOverviewDisplay
            projectOverviewData={projectOverviewData}
            isLoading={isFetchingOverview}
            onClose={() => {
              // This will be handled by the parent component
            }}
          />
        </SheetContent>
      </Sheet>

      {/* Context Menu */}
      {contextMenuState.isOpen && (
        <NodeContextMenu
          isOpen={contextMenuState.isOpen}
          position={contextMenuState.position}
          nodeId={contextMenuState.nodeId}
          onClose={onCloseContextMenu}
          onAction={onContextMenuAction}
        />
      )}
    </>
  );
};