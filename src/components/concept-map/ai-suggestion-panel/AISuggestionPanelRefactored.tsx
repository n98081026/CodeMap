import React from 'react';
import { Search, Lightbulb } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAISuggestionPanelLogic } from '@/hooks/useAISuggestionPanelLogic';
import SuggestionSection from './SuggestionSection';
import type { ConceptMapData, ConceptMapNode } from '@/types';

export interface ExtractedConceptItem {
  concept: string;
  context?: string;
  source?: string;
}

export interface RelationSuggestion {
  source: string;
  target: string;
  relation: string;
  reason?: string;
}

export interface AISuggestionPanelProps {
  mapData?: ConceptMapData;
  currentMapNodes?: ConceptMapNode[];
  extractedConcepts?: ExtractedConceptItem[];
  suggestedRelations?: Array<RelationSuggestion>;
  onAddExtractedConcepts?: (concepts: ExtractedConceptItem[]) => void;
  onAddSuggestedRelations?: (relations: Array<RelationSuggestion>) => void;
  onClearExtractedConcepts?: () => void;
  onClearSuggestedRelations?: () => void;
  isViewOnlyMode?: boolean;
}

const AISuggestionPanelRefactored: React.FC<AISuggestionPanelProps> = React.memo(({
  mapData,
  currentMapNodes = [],
  extractedConcepts = [],
  suggestedRelations = [],
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  isViewOnlyMode,
}) => {
  const {
    editableExtracted,
    editableRelations,
    selectedExtractedIndices,
    selectedRelationIndices,
    conceptsParentRef,
    relationsParentRef,
    conceptsRowVirtualizer,
    relationsRowVirtualizer,
    setDragPreview,
    clearDragPreview,
    setDraggedRelationPreview,
    getConceptStatus,
    checkRelationNodesExistOnMap,
    handleToggleConceptEdit,
    handleConceptInputChange,
    handleConfirmConceptEdit,
    handleToggleRelationEdit,
    handleRelationInputChange,
    handleConfirmRelationEdit,
    handleToggleConceptSelection,
    handleToggleRelationSelection,
  } = useAISuggestionPanelLogic({
    currentMapNodes,
    extractedConcepts,
    suggestedRelations,
  });

  const renderMainContent = () => {
    const noExtracted = !editableExtracted || editableExtracted.length === 0;
    const noRelations = !editableRelations || editableRelations.length === 0;

    if (!currentMapNodes && noExtracted && noRelations) {
      return (
        <div className='text-muted-foreground py-8 text-center'>
          No suggestions available yet.
        </div>
      );
    }

    if (currentMapNodes && currentMapNodes.length > 0 && noExtracted && noRelations) {
      return (
        <div className='text-muted-foreground py-8 text-center'>
          No suggestions available for the current map.
        </div>
      );
    }

    return (
      <div
        className='h-full w-full p-4 space-y-4 text-left overflow-y-auto'
        data-tutorial-id='ai-suggestion-panel-content'
      >
        {onAddExtractedConcepts && editableExtracted.length > 0 && (
          <SuggestionSection
            title="Extracted Concepts"
            icon={Search}
            items={editableExtracted}
            selectedIndices={selectedExtractedIndices}
            itemKeyPrefix="extracted-concept"
            parentRef={conceptsParentRef}
            rowVirtualizer={conceptsRowVirtualizer}
            onAddItems={onAddExtractedConcepts}
            onClearItems={onClearExtractedConcepts}
            cardClassName="bg-blue-500/5 border-blue-500/20"
            titleClassName="text-blue-700 dark:text-blue-400"
            isViewOnlyMode={isViewOnlyMode}
            getConceptStatus={getConceptStatus}
            onToggleConceptSelection={handleToggleConceptSelection}
            onToggleConceptEdit={handleToggleConceptEdit}
            onConceptInputChange={handleConceptInputChange}
            onConfirmConceptEdit={handleConfirmConceptEdit}
            setDragPreview={setDragPreview}
            clearDragPreview={clearDragPreview}
          />
        )}

        {onAddSuggestedRelations && editableRelations.length > 0 && (
          <SuggestionSection
            title="Suggested Relations"
            icon={Lightbulb}
            items={editableRelations}
            selectedIndices={selectedRelationIndices}
            itemKeyPrefix="relation-"
            parentRef={relationsParentRef}
            rowVirtualizer={relationsRowVirtualizer}
            onAddItems={onAddSuggestedRelations}
            onClearItems={onClearSuggestedRelations}
            cardClassName="bg-purple-500/5 border-purple-500/20"
            titleClassName="text-purple-700 dark:text-purple-400"
            isViewOnlyMode={isViewOnlyMode}
            checkRelationNodesExistOnMap={checkRelationNodesExistOnMap}
            onToggleRelationSelection={handleToggleRelationSelection}
            onToggleRelationEdit={handleToggleRelationEdit}
            onRelationInputChange={handleRelationInputChange}
            onConfirmRelationEdit={handleConfirmRelationEdit}
            setDraggedRelationPreview={setDraggedRelationPreview}
          />
        )}
      </div>
    );
  };

  return (
    <Card
      className='h-full w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner'
      data-tutorial-id='ai-suggestion-panel'
    >
      <CardContent className='flex h-full flex-col items-center justify-center text-center p-0'>
        {renderMainContent()}
      </CardContent>
    </Card>
  );
});

AISuggestionPanelRefactored.displayName = 'AISuggestionPanelRefactored';

export default AISuggestionPanelRefactored;