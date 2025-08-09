import { useVirtualizer } from '@tanstack/react-virtual';
import { PlusCircle, Trash2, type LucideIcon } from 'lucide-react';
import React from 'react';

import ConceptSuggestionItem from './ConceptSuggestionItem';
import RelationSuggestionItem from './RelationSuggestionItem';

import type {
  ExtractedConceptItem,
  RelationSuggestion,
} from '../ai-suggestion-panel';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface EditableExtractedConcept {
  original: ExtractedConceptItem;
  current: ExtractedConceptItem;
  isEditing: boolean;
  editingField: 'concept' | 'context' | 'source' | null;
}

interface EditableRelationSuggestion {
  original: RelationSuggestion;
  current: RelationSuggestion;
  isEditing: boolean;
  editingField: 'source' | 'target' | 'relation' | 'reason' | null;
}

type ItemStatus = 'new' | 'exact-match' | 'similar-match';

interface SuggestionSectionProps {
  title: string;
  icon: LucideIcon;
  items: EditableExtractedConcept[] | EditableRelationSuggestion[];
  selectedIndices: Set<number>;
  itemKeyPrefix: string;
  parentRef: React.RefObject<HTMLDivElement>;
  rowVirtualizer: ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
  onAddItems: (items: any[]) => void;
  onClearItems?: () => void;
  cardClassName: string;
  titleClassName: string;
  isViewOnlyMode?: boolean;

  // For concepts
  getConceptStatus?: (item: ExtractedConceptItem) => ItemStatus;
  onToggleConceptSelection?: (index: number) => void;
  onToggleConceptEdit?: (index: number, field: 'concept') => void;
  onConceptInputChange?: (
    index: number,
    value: string,
    field: 'concept'
  ) => void;
  onConfirmConceptEdit?: (index: number) => void;
  setDragPreview?: (item: { text: string; type: string } | null) => void;
  clearDragPreview?: () => void;

  // For relations
  checkRelationNodesExistOnMap?: (relation: RelationSuggestion) => boolean;
  onToggleRelationSelection?: (index: number) => void;
  onToggleRelationEdit?: (
    index: number,
    field: 'source' | 'target' | 'relation' | 'reason'
  ) => void;
  onRelationInputChange?: (
    index: number,
    value: string,
    field: 'source' | 'target' | 'relation' | 'reason'
  ) => void;
  onConfirmRelationEdit?: (index: number) => void;
  setDraggedRelationPreview?: (relation: RelationSuggestion | null) => void;
}

const SuggestionSection: React.FC<SuggestionSectionProps> = React.memo(
  ({
    title,
    icon: Icon,
    items,
    selectedIndices,
    itemKeyPrefix,
    parentRef,
    rowVirtualizer,
    onAddItems,
    onClearItems,
    cardClassName,
    titleClassName,
    isViewOnlyMode,

    // Concept props
    getConceptStatus,
    onToggleConceptSelection,
    onToggleConceptEdit,
    onConceptInputChange,
    onConfirmConceptEdit,
    setDragPreview,
    clearDragPreview,

    // Relation props
    checkRelationNodesExistOnMap,
    onToggleRelationSelection,
    onToggleRelationEdit,
    onRelationInputChange,
    onConfirmRelationEdit,
    setDraggedRelationPreview,
  }) => {
    const isConceptSection = itemKeyPrefix.startsWith('extracted-');

    // Calculate counts
    const countOfSelectedAndSelectable = Array.from(selectedIndices).filter(
      (index) => {
        const item = items[index];
        if (isConceptSection && getConceptStatus) {
          const status = getConceptStatus(
            (item as EditableExtractedConcept).current
          );
          return status !== 'exact-match';
        }
        return true;
      }
    ).length;

    const countOfAllNewOrSimilar = items.filter((item, index) => {
      if (isConceptSection && getConceptStatus) {
        const status = getConceptStatus(
          (item as EditableExtractedConcept).current
        );
        return status !== 'exact-match';
      }
      return true;
    }).length;

    const handleAddSelected = () => {
      const selectedItems = Array.from(selectedIndices)
        .map((index) => items[index])
        .filter((item, index) => {
          if (isConceptSection && getConceptStatus) {
            const status = getConceptStatus(
              (item as EditableExtractedConcept).current
            );
            return status !== 'exact-match';
          }
          return true;
        })
        .map((item) => (item as any).current);

      if (selectedItems.length > 0) {
        onAddItems(selectedItems);
        selectedIndices.clear();
      }
    };

    const handleAddAllNewSimilar = () => {
      const toAdd = items
        .map((item) => (item as any).current)
        .filter((itemValue) => {
          if (isConceptSection && getConceptStatus) {
            const status = getConceptStatus(itemValue as ExtractedConceptItem);
            return status !== 'exact-match';
          }
          return true;
        });

      if (toAdd.length > 0) {
        onAddItems(toAdd);
        selectedIndices.clear();
      }
    };

    if (items.length === 0) {
      return null;
    }

    return (
      <Card className={cn('w-full', cardClassName)}>
        <CardHeader className='pb-3'>
          <CardTitle
            className={cn('flex items-center gap-2 text-lg', titleClassName)}
          >
            <Icon className='h-5 w-5' />
            {title} ({items.length})
          </CardTitle>
        </CardHeader>

        <CardContent className='pt-0'>
          <div
            ref={parentRef}
            className='h-64 overflow-auto'
            style={{ contain: 'strict' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                const item = items[virtualItem.index];
                const isSelected = selectedIndices.has(virtualItem.index);

                return (
                  <div
                    key={`${itemKeyPrefix}-${virtualItem.index}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    {isConceptSection ? (
                      <ConceptSuggestionItem
                        item={item as EditableExtractedConcept}
                        index={virtualItem.index}
                        itemStatus={
                          getConceptStatus?.(
                            (item as EditableExtractedConcept).current
                          ) || 'new'
                        }
                        isViewOnlyMode={isViewOnlyMode}
                        isSelected={isSelected}
                        onToggleSelection={onToggleConceptSelection!}
                        onToggleEdit={onToggleConceptEdit!}
                        onInputChange={onConceptInputChange!}
                        onConfirmEdit={onConfirmConceptEdit!}
                        setDragPreview={setDragPreview!}
                        clearDragPreview={clearDragPreview!}
                      />
                    ) : (
                      <RelationSuggestionItem
                        item={item as EditableRelationSuggestion}
                        index={virtualItem.index}
                        isViewOnlyMode={isViewOnlyMode}
                        isSelected={isSelected}
                        nodesExistOnMap={
                          checkRelationNodesExistOnMap?.(
                            (item as EditableRelationSuggestion).current
                          ) || false
                        }
                        onToggleSelection={onToggleRelationSelection!}
                        onToggleEdit={onToggleRelationEdit!}
                        onInputChange={onRelationInputChange!}
                        onConfirmEdit={onConfirmRelationEdit!}
                        setDraggedRelationPreview={setDraggedRelationPreview!}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>

        <CardFooter className='flex flex-col sm:flex-row gap-2 pt-3'>
          <Button
            size='sm'
            variant='outline'
            onClick={handleAddSelected}
            disabled={isViewOnlyMode || countOfSelectedAndSelectable === 0}
            className='w-full sm:w-auto'
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Add Selected ({countOfSelectedAndSelectable})
          </Button>

          <Button
            size='sm'
            variant='default'
            onClick={handleAddAllNewSimilar}
            disabled={isViewOnlyMode || countOfAllNewOrSimilar === 0}
            className='w-full sm:w-auto'
          >
            <PlusCircle className='mr-2 h-4 w-4' />
            Add All New/Similar ({countOfAllNewOrSimilar})
          </Button>

          {onClearItems && (
            <Button
              size='sm'
              variant='destructive'
              onClick={onClearItems}
              disabled={isViewOnlyMode}
              className='w-full sm:w-auto'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Clear All
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
);

SuggestionSection.displayName = 'SuggestionSection';

export default SuggestionSection;
