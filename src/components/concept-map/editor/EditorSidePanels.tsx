'use client';

import React, { useMemo } from 'react';

import type { ConceptMapData, ConceptMapNode } from '@/types';

import {
  AISuggestionPanel,
  type ExtractedConceptItem,
  type RelationSuggestion,
} from '@/components/concept-map/ai-suggestion-panel';
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';
import ProjectOverviewDisplay from '@/components/concept-map/project-overview-display';
import { PropertiesInspector } from '@/components/concept-map/properties-inspector';
import { Sheet, SheetContent } from '@/components/ui/sheet';

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
  const selectedElement = useMemo(() => {
    if (!selectedElementId || !selectedElementType) return null;
    return selectedElementType === 'node'
      ? mapData.nodes.find((n) => n.id === selectedElementId)
      : mapData.edges.find((e) => e.id === selectedElementId);
  }, [selectedElementId, selectedElementType, mapData.nodes, mapData.edges]);

  const handleContextMenuAction = (action: string) => {
    if (contextMenuState.nodeId) {
      onContextMenuAction(action, contextMenuState.nodeId);
    }
  };

  const onSelectedElementPropertyUpdate = (updates: any) => {
    if (!selectedElement) return;
    if (selectedElementType === 'node') {
      onUpdateNode(selectedElement.id, updates);
    } else {
      onUpdateEdge(selectedElement.id, updates);
    }
  };

  return (
    <>
      {/* Properties Panel */}
      <Sheet open={isPropertiesPanelOpen}>
        <SheetContent side='right' className='w-80 p-0'>
          <PropertiesInspector
            currentMap={null}
            onMapPropertiesChange={() => {}}
            selectedElement={selectedElement}
            selectedElementType={selectedElementType}
            onSelectedElementPropertyUpdate={onSelectedElementPropertyUpdate}
            isViewOnlyMode={isViewOnlyMode}
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
            overviewData={projectOverviewData}
            isLoading={isFetchingOverview}
          />
        </SheetContent>
      </Sheet>

      {/* Context Menu */}
      {contextMenuState.isOpen && contextMenuState.nodeId && (
        <NodeContextMenu
          x={contextMenuState.position.x}
          y={contextMenuState.position.y}
          nodeId={contextMenuState.nodeId}
          onClose={onCloseContextMenu}
          onDeleteNode={() => handleContextMenuAction('delete')}
          onExpandConcept={() => handleContextMenuAction('expand')}
          onSuggestRelations={() => handleContextMenuAction('suggest-relations')}
          onExtractConcepts={() => handleContextMenuAction('extract-concepts')}
          onAskQuestion={() => handleContextMenuAction('ask-question')}
          onRewriteContent={() => handleContextMenuAction('rewrite-content')}
          isViewOnlyMode={isViewOnlyMode}
        />
      )}
    </>
  );
};
