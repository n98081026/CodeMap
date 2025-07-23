'use client';

import { useVirtualizer } from '@tanstack/react-virtual'; // Import useVirtualizer
import {
  GitFork,
  Brain,
  Search,
  Lightbulb,
  PlusCircle,
  Info,
  MessageSquareDashed,
  CheckSquare,
  Edit3,
  BotMessageSquare,
  Zap,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react'; // Added useRef

import type { ConceptMapData, ConceptMapNode } from '@/types';

import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area'; // ScrollArea will wrap the virtualized list container
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import useConceptMapStore from '@/stores/concept-map-store';

interface ExtractedConceptItem {
    concept: string;
    context?: string;
    source?: string;
}

interface RelationSuggestion {
  source: string;
  target: string;
  relation: string;
  reason?: string;
}

interface AISuggestionPanelProps {
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

// Moved outside to avoid re-declaration on each render of AISuggestionPanel
const RenderEditableConceptLabel: React.FC<{
  item: EditableExtractedConcept;
  index: number;
  itemStatus: ItemStatus;
  isViewOnlyMode?: boolean;
  onToggleEdit: (index: number, field: 'concept') => void;
  onInputChange: (index: number, value: string, field: 'concept') => void;
  onConfirmEdit: (index: number) => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  clearDragPreview: () => void;
}> = ({
  item,
  index,
  itemStatus,
  isViewOnlyMode,
  onToggleEdit,
  onInputChange,
  onConfirmEdit,
  setDragPreview,
  clearDragPreview,
}) => {
  const isExactMatch = itemStatus === 'exact-match';

  const handleDragStart = (
    event: React.DragEvent<HTMLDivElement>,
    conceptItem: ExtractedConceptItem
  ) => {
    event.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        type: 'concept-suggestion',
        text: conceptItem.concept,
        conceptType: 'ai-concept',
      })
    );
    event.dataTransfer.effectAllowed = 'copy';
    setDragPreview({ text: conceptItem.concept, type: 'ai-concept' });
  };

  const handleDragEnd = () => {
    clearDragPreview();
  };

  if (item.isEditing && item.editingField === 'concept' && !isViewOnlyMode) {
    return (
      <div className='flex items-center space-x-2 w-full'>
        <Input
          value={item.current.concept}
          onChange={(e) => onInputChange(index, e.target.value, 'concept')}
          className='h-8 text-sm flex-grow'
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onConfirmEdit(index)}
          onBlur={() => onConfirmEdit(index)}
          disabled={isViewOnlyMode}
        />
        <Button
          size='icon'
          variant='ghost'
          onClick={() => onConfirmEdit(index)}
          className='h-8 w-8'
          disabled={isViewOnlyMode}
        >
          <CheckSquare className='h-4 w-4 text-green-600' />
        </Button>
      </div>
    );
  }
  return (
    <div className='w-full'>
      <div
        className='flex items-center justify-between w-full group'
        draggable={!isViewOnlyMode && !item.isEditing && !isExactMatch}
        onDragStart={(e) =>
          !isViewOnlyMode &&
          !item.isEditing &&
          !isExactMatch &&
          handleDragStart(e, item.current)
        }
        onDragEnd={handleDragEnd}
        title={
          !isViewOnlyMode && !item.isEditing && !isExactMatch
            ? 'Drag this concept to the canvas'
            : item.current.context || item.current.concept
        }
      >
        <Label
          htmlFor={`extracted-concept-${index}`}
          className={cn(
            'text-sm font-normal flex-grow flex items-center',
            !isViewOnlyMode && !item.isEditing && !isExactMatch
              ? 'cursor-grab'
              : 'cursor-default',
            (isExactMatch || isViewOnlyMode) && 'cursor-default'
          )}
        >
          {itemStatus === 'exact-match' && (
            <CheckSquare
              className='h-4 w-4 mr-2 text-green-600 flex-shrink-0'
            />
          )}
          {itemStatus === 'similar-match' && (
            <Zap
              className='h-4 w-4 mr-2 text-yellow-600 dark:text-yellow-400 flex-shrink-0'
            />
          )}
          {itemStatus === 'new' && (
            <PlusCircle
              className='h-4 w-4 mr-2 text-blue-500 flex-shrink-0'
            />
          )}
          {item.current.concept}
        </Label>
        {!isViewOnlyMode && !isExactMatch && (
          <div className='flex items-center'>
            {(item.current.context || item.current.source) && (
              <TooltipProvider>
                {' '}
                <Tooltip>
                  {' '}
                  <TooltipTrigger asChild>
                    <Info className='h-3.5 w-3.5 mr-1 text-blue-500 cursor-help flex-shrink-0' />
                  </TooltipTrigger>{' '}
                  <TooltipContent
                    side='top'
                    className='max-w-xs bg-background border shadow-lg p-3'
                  >
                    {item.current.context && (
                      <p className='text-xs text-muted-foreground mb-1'>
                        <strong>Context:</strong> {item.current.context}
                      </p>
                    )}
                    {item.current.source && (
                      <p className='text-xs text-muted-foreground'>
                        <strong>Source:</strong>{' '}
                        <em>"{item.current.source}"</em>
                      </p>
                    )}
                  </TooltipContent>{' '}
                </Tooltip>{' '}
              </TooltipProvider>
            )}
            <Button
              size='icon'
              variant='ghost'
              onClick={() => onToggleEdit(index, 'concept')}
              className='h-6 w-6 opacity-0 group-hover:opacity-100'
              disabled={isViewOnlyMode}
            >
              <Edit3 className='h-3 w-3' />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
RenderEditableConceptLabel.displayName = 'RenderEditableConceptLabel';

const RenderEditableRelationLabel: React.FC<{
  item: EditableRelationSuggestion;
  index: number;
  isViewOnlyMode?: boolean;
  relationNodeExistence?: { source?: boolean; target?: boolean };
  onToggleEdit: (
    index: number,
    field: 'source' | 'target' | 'relation'
  ) => void;
  onInputChange: (
    index: number,
    value: string,
    field: 'source' | 'target' | 'relation'
  ) => void;
  onConfirmEdit: (index: number) => void;
  setDraggedRelationPreview: (label: string | null) => void;
  clearDragPreview: () => void;
}> = ({
  item,
  index,
  isViewOnlyMode,
  relationNodeExistence,
  onToggleEdit,
  onInputChange,
  onConfirmEdit,
  setDraggedRelationPreview,
  clearDragPreview,
}) => {
  const renderField = (
    field: 'source' | 'target' | 'relation',
    nodeExists?: boolean
  ) => {
    if (item.isEditing && item.editingField === field && !isViewOnlyMode) {
      return (
        <Input
          value={String((item.current as Record<string, unknown>)[field] || '')}
          onChange={(e) => onInputChange(index, e.target.value, field)}
          className='h-7 text-xs px-1 py-0.5 mx-0.5 inline-block w-auto min-w-[60px] max-w-[120px]'
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onConfirmEdit(index);
          }}
          onBlur={() => onConfirmEdit(index)}
          disabled={isViewOnlyMode}
        />
      );
    }
    return (
      <span
        onClick={isViewOnlyMode ? undefined : () => onToggleEdit(index, field)}
        className={cn(
          'hover:bg-muted/50 px-1 rounded inline-flex items-center',
          !isViewOnlyMode && 'cursor-pointer'
        )}
      >
        {String((item.current as Record<string, unknown>)[field])}
        {nodeExists && field !== 'relation' && (
          <CheckSquare
            className='h-3 w-3 ml-1 text-green-600 inline-block'
          />
        )}
        {!nodeExists && field !== 'relation' && (
          <AlertCircle
            className='h-3 w-3 ml-1 text-orange-500 inline-block'
          />
        )}
      </span>
    );
  };

  return (
    <div
      data-tutorial-id={`suggested-relation-item-${index}`}
      className='flex items-center text-sm group w-full'
      draggable={!isViewOnlyMode && !item.isEditing}
      onDragStart={(e) => {
        if (isViewOnlyMode || item.isEditing) return;
        e.dataTransfer.setData(
          'application/json',
          JSON.stringify({
            type: 'relation-suggestion',
            sourceText: item.current.source,
            targetText: item.current.target,
            label: item.current.relation,
          })
        );
        e.dataTransfer.effectAllowed = 'copy';
        setDraggedRelationPreview(item.current.relation);
      }}
      onDragEnd={() => {
        if (!isViewOnlyMode) clearDragPreview();
      }}
      title={
        !isViewOnlyMode && !item.isEditing
          ? 'Drag this relation to the canvas (experimental)'
          : item.current.reason || 'Suggested relation'
      }
    >
      <GitFork
        className={cn(
          'h-4 w-4 mr-2 text-purple-500 flex-shrink-0',
          !isViewOnlyMode && !item.isEditing && 'cursor-grab'
        )}
      />
      {renderField('source', relationNodeExistence?.source)}
      <span className='mx-1'>→</span>
      {renderField('target', relationNodeExistence?.target)}
      <span className='mx-1 text-muted-foreground'>
        ({renderField('relation')})
      </span>
      {item.current.reason && (
        <TooltipProvider>
          {' '}
          <Tooltip>
            {' '}
            <TooltipTrigger asChild>
              <Info className='h-3.5 w-3.5 ml-2 text-blue-500 cursor-help flex-shrink-0' />
            </TooltipTrigger>{' '}
            <TooltipContent
              side='top'
              className='max-w-xs bg-background border shadow-lg p-3'
            >
              <p className='text-xs font-medium text-foreground'>
                AI's Reasoning:
              </p>
              <p className='text-xs text-muted-foreground'>
                {item.current.reason}
              </p>
            </TooltipContent>{' '}
          </Tooltip>{' '}
        </TooltipProvider>
      )}
    </div>
  );
};
RenderEditableRelationLabel.displayName = 'RenderEditableRelationLabel';

export const AISuggestionPanel = React.memo(function AISuggestionPanel({
  mapData, // mapData prop seems unused directly in this component now
  currentMapNodes = [],
  extractedConcepts = [],
  suggestedRelations = [],
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  isViewOnlyMode,
}: AISuggestionPanelProps) {
  const { setDragPreview, clearDragPreview, setDraggedRelationPreview } =
    useConceptMapStore(
      useCallback(
        (s: any) => ({
          setDragPreview: s.setDragPreview,
          clearDragPreview: s.clearDragPreview,
          setDraggedRelationPreview: s.setDraggedRelationPreview,
        }),
        []
      )
    );

  const [editableExtracted, setEditableExtracted] = useState<
    EditableExtractedConcept[]
  >([]);
  const [editableRelations, setEditableRelations] = useState<
    EditableRelationSuggestion[]
  >([]);

  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<
    Set<number>
  >(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<
    Set<number>
  >(new Set());

  const existingNodeTexts = useMemo(() => {
    return new Set(currentMapNodes.map((n) => n.text.toLowerCase().trim()));
  }, [currentMapNodes]);

  const mapExtractedToEditable = useCallback(
    (items: ExtractedConceptItem[]): EditableExtractedConcept[] =>
      items.map((item) => ({
        original: item,
        current: { ...item },
        isEditing: false,
        editingField: null,
      })),
    []
  );

  const mapRelationsToEditable = useCallback(
    (items: Array<RelationSuggestion>): EditableRelationSuggestion[] =>
      items.map((item) => ({
        original: item,
        current: { ...item },
        isEditing: false,
        editingField: null,
      })),
    []
  );

  useEffect(() => {
    setEditableExtracted(mapExtractedToEditable(extractedConcepts || []));
    setSelectedExtractedIndices(new Set());
  }, [extractedConcepts, mapExtractedToEditable]);

  useEffect(() => {
    setEditableRelations(mapRelationsToEditable(suggestedRelations || []));
    setSelectedRelationIndices(new Set());
  }, [suggestedRelations, mapRelationsToEditable]);

  const handleToggleEditFactory = useCallback(
    (type: 'extracted' | 'relation') =>
      (
        index: number,
        field?:
          | 'concept'
          | 'context'
          | 'source'
          | 'target'
          | 'relation'
          | 'reason'
      ) => {
        if (isViewOnlyMode) return;
        const setStateAction =
          type === 'extracted' ? setEditableExtracted : setEditableRelations;
        const items =
          type === 'extracted' ? editableExtracted : editableRelations;

        const setState =
          type === 'extracted'
            ? (setEditableExtracted as React.Dispatch<
                React.SetStateAction<EditableExtractedConcept[]>
              >)
            : (setEditableRelations as React.Dispatch<
                React.SetStateAction<EditableRelationSuggestion[]>
              >);

        setState((prevItems: any) =>
          prevItems.map((item: any, idx: number) => {
            if (idx === index)
              return {
                ...item,
                isEditing: !item.isEditing,
                editingField: field || null,
              };
            return { ...item, isEditing: false, editingField: null }; // Close other edits
          })
        );
      },
    [isViewOnlyMode, editableExtracted, editableRelations]
  );

  const handleInputChangeFactory = useCallback(
    (type: 'extracted' | 'relation') =>
      (
        index: number,
        value: string,
        field:
          | 'concept'
          | 'context'
          | 'source'
          | 'target'
          | 'relation'
          | 'reason'
      ) => {
        const setStateAction =
          type === 'extracted' ? setEditableExtracted : setEditableRelations;

        const setState =
          type === 'extracted'
            ? (setEditableExtracted as React.Dispatch<
                React.SetStateAction<EditableExtractedConcept[]>
              >)
            : (setEditableRelations as React.Dispatch<
                React.SetStateAction<EditableRelationSuggestion[]>
              >);
        setState((prevItems: any) =>
          prevItems.map((item: any, idx: number) => {
            if (idx === index)
              return {
                ...item,
                current: { ...item.current, [field]: value },
              };
            return item;
          })
        );
      },
    []
  );

  const handleConfirmEditFactory = useCallback(
    (type: 'extracted' | 'relation') => (index: number) => {
      handleToggleEditFactory(type)(index, undefined); // Toggles isEditing off
    },
    [handleToggleEditFactory]
  );

  const handleSelectionToggleFactory =
    (type: 'extracted' | 'relation') => (index: number, checked: boolean) => {
      const setIndices =
        type === 'extracted'
          ? setSelectedExtractedIndices
          : setSelectedRelationIndices;
      setIndices((prev) => {
        const next = new Set(prev);
        if (checked) next.add(index);
        else next.delete(index);
        return next;
      });
    };

  const getConceptStatus = useCallback(
    (itemValue: ExtractedConceptItem): ItemStatus => {
      const normalizedConcept = itemValue.concept.toLowerCase().trim();
      if (existingNodeTexts.has(normalizedConcept)) return 'exact-match';
      for (const existingNode of existingNodeTexts) {
        if (
          existingNode.length !== normalizedConcept.length &&
          (existingNode.includes(normalizedConcept) ||
            normalizedConcept.includes(existingNode))
        ) {
          return 'similar-match';
        }
      }
      return 'new';
    },
    [existingNodeTexts]
  );

  const checkRelationNodesExistOnMap = useCallback(
    (relationValue: RelationSuggestion) => ({
      source: existingNodeTexts.has(relationValue.source.toLowerCase().trim()),
      target: existingNodeTexts.has(relationValue.target.toLowerCase().trim()),
    }),
    [existingNodeTexts]
  );

  // Refs for virtualizer scroll parents
  const conceptsParentRef = useRef<HTMLDivElement>(null);
  const relationsParentRef = useRef<HTMLDivElement>(null);

  const conceptsRowVirtualizer = useVirtualizer({
    count: editableExtracted.length,
    getScrollElement: () => conceptsParentRef.current,
    estimateSize: () => 45, // Approx height: p-2 (8px*2=16) + text-sm (14*1.5=21) + border (1) ~= 38px. Add some padding.
    overscan: 5,
  });

  const relationsRowVirtualizer = useVirtualizer({
    count: editableRelations.length,
    getScrollElement: () => relationsParentRef.current,
    estimateSize: () => 45, // Similar to concepts, might be slightly taller with reason.
    overscan: 5,
  });

  const renderSuggestionSection = (
    title: string,
    IconComponent: React.ElementType,
    items: (EditableExtractedConcept | EditableRelationSuggestion)[],
    selectedIndicesSet: Set<number>,
    itemKeyPrefix: string,
    // renderItemContent is now specific to each type
    onAddSelectedItems: (selectedItems: any[]) => void,
    onClearCategory?: () => void,
    cardClassName?: string,
    titleClassName?: string,
    parentRef: React.RefObject<HTMLDivElement>, // For virtualizer
    rowVirtualizerInstance: ReturnType<typeof useVirtualizer> // Instance of useVirtualizer
  ) => {
    const isRelationsSection = itemKeyPrefix.startsWith('relation-');
    const sectionId = isRelationsSection
      ? 'suggested-relations-section'
      : 'extracted-concepts-section';

    if (!onAddSelectedItems && items.length === 0 && !mapData) return null; // mapData was unused, removed
    if (!items || items.length === 0) {
      return (
        <Card
          className={cn('mb-4 bg-background/80 shadow-md', cardClassName)}
          data-tutorial-id={sectionId}
        >
          <CardHeader>
            <CardTitle
              className={cn(
                'text-base font-semibold text-muted-foreground flex items-center',
                titleClassName
              )}
            >
              <IconComponent className='mr-2 h-5 w-5' /> {title} (0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={MessageSquareDashed}
              title={`No New ${title}`}
              description={`No new ${title.toLowerCase()} to display currently. Try using the AI tools to generate some!`}
            />
          </CardContent>
        </Card>
      );
    }

    const getComparableItemValue = (
      item: EditableExtractedConcept | EditableRelationSuggestion
    ) => item.current;

    const clearSelectionForCategory = () => {
      if (itemKeyPrefix.startsWith('extracted-'))
        setSelectedExtractedIndices(new Set());
      else if (itemKeyPrefix.startsWith('relation-'))
        setSelectedRelationIndices(new Set());
    };

    const handleAddSelected = () => {
      if (!onAddSelectedItems) return;
      const toAdd = items
        .filter((_item, index) => selectedIndicesSet.has(index))
        .map((item) => item.current)
        .filter((itemValue) => {
          const status = itemKeyPrefix.startsWith('extracted-')
            ? getConceptStatus(itemValue as ExtractedConceptItem)
            : 'new'; // Relations always 'new' for addability
          return (
            status !== 'exact-match' || itemKeyPrefix.startsWith('relation-')
          );
        });
      if (toAdd.length > 0) {
        onAddSelectedItems(toAdd);
        clearSelectionForCategory();
      }
    };

    const handleSelectAllNewOrSimilar = (checked: boolean) => {
      const newSelectedIndices = new Set<number>();
      if (checked) {
        items.forEach((item, index) => {
          const value = getComparableItemValue(item);
          const status = itemKeyPrefix.startsWith('extracted-')
            ? getConceptStatus(value as ExtractedConceptItem)
            : 'new';
          if (
            status !== 'exact-match' ||
            itemKeyPrefix.startsWith('relation-')
          ) {
            newSelectedIndices.add(index);
          }
        });
      }
      if (itemKeyPrefix.startsWith('extracted-'))
        setSelectedExtractedIndices(newSelectedIndices);
      else if (itemKeyPrefix.startsWith('relation-'))
        setSelectedRelationIndices(newSelectedIndices);
    };

    const countOfAllNewOrSimilar = items.filter((item) => {
      const value = getComparableItemValue(item);
      const status = itemKeyPrefix.startsWith('extracted-')
        ? getConceptStatus(value as ExtractedConceptItem)
        : 'new';
      return status !== 'exact-match' || itemKeyPrefix.startsWith('relation-');
    }).length;

    const allSelectableAreChecked =
      countOfAllNewOrSimilar > 0 &&
      selectedIndicesSet.size === countOfAllNewOrSimilar;
    const countOfSelectedAndSelectable = Array.from(selectedIndicesSet).filter(
      (index) => {
        const value = getComparableItemValue(items[index]);
        const status = itemKeyPrefix.startsWith('extracted-')
          ? getConceptStatus(value as ExtractedConceptItem)
          : 'new';
        return (
          status !== 'exact-match' || itemKeyPrefix.startsWith('relation-')
        );
      }
    ).length;

    const virtualItems = rowVirtualizerInstance.getVirtualItems();

    return (
      <Card
        className={cn(
          'mb-4 bg-background/80 shadow-md flex flex-col',
          cardClassName
        )}
        style={{ minHeight: 200 }}
        data-tutorial-id={sectionId} // Added data-tutorial-id here as well
      >
        {' '}
        {/* Ensure card can shrink/grow */}
        <CardHeader>
          <div className='flex justify-between items-center'>
            <CardTitle
              className={cn(
                'text-base font-semibold flex items-center',
                titleClassName || 'text-primary'
              )}
            >
              <IconComponent className='mr-2 h-5 w-5' /> {title} ({items.length}
              )
            </CardTitle>
            <div className='flex items-center space-x-2'>
              {!isViewOnlyMode &&
                items.length > 0 &&
                countOfAllNewOrSimilar > 0 &&
                onAddSelectedItems && (
                  <>
                    <Checkbox
                      id={`${itemKeyPrefix}-select-all`}
                      checked={allSelectableAreChecked}
                      onCheckedChange={(cs) =>
                        handleSelectAllNewOrSimilar(Boolean(cs))
                      }
                      disabled={isViewOnlyMode}
                    />
                    <Label
                      htmlFor={`${itemKeyPrefix}-select-all`}
                      className='text-xs'
                    >
                      Select New/Similar
                    </Label>
                  </>
                )}
              {onClearCategory && !isViewOnlyMode && items.length > 0 && (
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={onClearCategory}
                  title={`Clear all ${title} suggestions`}
                  disabled={isViewOnlyMode}
                >
                  <Trash2 className='h-4 w-4 text-destructive' />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className='flex-grow overflow-hidden p-0'>
          {' '}
          {/* p-0 for ScrollArea child */}
          <ScrollArea className='h-full'>
            {' '}
            {/* Use ScrollArea's viewportRef */}
            {virtualItems.length > 0 ? (
              <div
                style={{
                  height: `${rowVirtualizerInstance.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualItems.map((virtualRow) => {
                  const item = items[virtualRow.index];
                  const displayId = `${itemKeyPrefix}-${virtualRow.index}`; // Use virtualRow.index for key
                  const itemValue = getComparableItemValue(item);
                  const itemStatus = itemKeyPrefix.startsWith('extracted-')
                    ? getConceptStatus(itemValue as ExtractedConceptItem)
                    : 'new';
                  const relationNodeExistence = itemKeyPrefix.startsWith(
                    'relation-'
                  )
                    ? checkRelationNodesExistOnMap(
                        itemValue as RelationSuggestion
                      )
                    : undefined;

                  return (
                    <div
                      key={displayId}
                      data-index={virtualRow.index} // Important for react-virtual
                      ref={(el) => rowVirtualizerInstance.measureElement(el)} // For dynamic height (optional but good)
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={cn(
                        'flex items-start space-x-3 p-2 border-b', // Keep p-2 here for item content padding
                        itemStatus === 'exact-match' &&
                          itemKeyPrefix.startsWith('extracted-') &&
                          'opacity-60 bg-muted/30',
                        itemStatus === 'similar-match' &&
                          itemKeyPrefix.startsWith('extracted-') &&
                          'bg-yellow-500/5 border-yellow-500/20'
                      )}
                    >
                      {!isViewOnlyMode && onAddSelectedItems && (
                        <Checkbox
                          id={displayId}
                          checked={selectedIndicesSet.has(virtualRow.index)}
                          onCheckedChange={(checked) =>
                            handleSelectionToggleFactory(
                              itemKeyPrefix.startsWith('extracted-')
                                ? 'extracted'
                                : 'relation'
                            )(virtualRow.index, Boolean(checked))
                          }
                          disabled={
                            (itemStatus === 'exact-match' &&
                              itemKeyPrefix.startsWith('extracted-')) ||
                            (item as EditableExtractedConcept | EditableRelationSuggestion).isEditing ||
                            isViewOnlyMode
                          }
                        />
                      )}
                      <div className='flex-grow'>
                        {isRelationsSection ? (
                          <RenderEditableRelationLabel
                            item={item as EditableRelationSuggestion}
                            index={virtualRow.index}
                            isViewOnlyMode={isViewOnlyMode}
                            relationNodeExistence={relationNodeExistence}
                            onToggleEdit={handleToggleEditFactory('relation')}
                            onInputChange={handleInputChangeFactory('relation')}
                            onConfirmEdit={handleConfirmEditFactory('relation')}
                            setDraggedRelationPreview={
                              setDraggedRelationPreview
                            }
                            clearDragPreview={clearDragPreview}
                          />
                        ) : (
                          <RenderEditableConceptLabel
                            item={item as EditableExtractedConcept}
                            index={virtualRow.index}
                            itemStatus={itemStatus}
                            isViewOnlyMode={isViewOnlyMode}
                            onToggleEdit={handleToggleEditFactory('extracted')}
                            onInputChange={handleInputChangeFactory(
                              'extracted'
                            )}
                            onConfirmEdit={handleConfirmEditFactory(
                              'extracted'
                            )}
                            setDragPreview={setDragPreview}
                            clearDragPreview={clearDragPreview}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='p-6 text-center h-full flex flex-col justify-center'>
                <EmptyState
                  icon={MessageSquareDashed}
                  title={`No ${title} to Display`}
                  description={`Currently no ${title.toLowerCase()} available.`}
                />
              </div>
            )}
          </ScrollArea>
        </CardContent>
        {!isViewOnlyMode &&
          items.length > 0 &&
          onAddSelectedItems &&
          countOfAllNewOrSimilar > 0 && (
            <CardFooter className='flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t'>
              <Button
                data-tutorial-id={
                  isRelationsSection
                    ? 'add-selected-relations-button'
                    : 'add-selected-concepts-button'
                }
                size='sm'
                variant='outline'
                onClick={handleAddSelected}
                disabled={isViewOnlyMode || countOfSelectedAndSelectable === 0}
                className='w-full sm:w-auto'
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Add Selected (
                {countOfSelectedAndSelectable})
              </Button>
              <Button
                data-tutorial-id={
                  isRelationsSection
                    ? 'add-all-new-relations-button'
                    : 'add-all-new-concepts-button'
                }
                size='sm'
                variant='default'
                onClick={() => {
                  // Implement Add All New/Similar functionality directly
                  const toAdd = items
                    .map((item) => item.current)
                    .filter((itemValue) => {
                      const status = itemKeyPrefix.startsWith('extracted-')
                        ? getConceptStatus(itemValue as ExtractedConceptItem)
                        : 'new';
                      return (
                        status !== 'exact-match' || itemKeyPrefix.startsWith('relation-')
                      );
                    });
                  if (toAdd.length > 0) {
                    onAddSelectedItems(toAdd);
                    clearSelectionForCategory();
                  }
                }}
                disabled={isViewOnlyMode || countOfAllNewOrSimilar === 0}
                className='w-full sm:w-auto'
              >
                <PlusCircle className='mr-2 h-4 w-4' /> Add All New/Similar (
                {countOfAllNewOrSimilar})
              </Button>
            </CardFooter>
          )}
      </Card>
    );
  };

  const mainContent = () => {
    const noExtracted = !editableExtracted || editableExtracted.length === 0;
    const noRelations = !editableRelations || editableRelations.length === 0;

    if (!currentMapNodes && noExtracted && noRelations) {
      // Check currentMapNodes instead of mapData
      return (
        <div className='text-muted-foreground py-8'>
          No suggestions available yet.
        </div>
      );
    }
    if (
      currentMapNodes &&
      currentMapNodes.length > 0 &&
      noExtracted &&
      noRelations
    ) {
      return (
        <div className='text-muted-foreground py-8'>
          No suggestions available for the current map.
        </div>
      );
    }

    return (
      // The ScrollArea is now *inside* renderSuggestionSection
      // This outer div will just hold the sections
      <div
        className='h-full w-full p-4 space-y-4 text-left overflow-y-auto'
        data-tutorial-id='ai-suggestion-panel-content'
      >
        {' '}
        {/* Added ID to content area */}
        {onAddExtractedConcepts &&
          renderSuggestionSection(
            'Extracted Concepts',
            Search,
            editableExtracted,
            selectedExtractedIndices,
            'extracted-concept',
            onAddExtractedConcepts as any,
            onClearExtractedConcepts,
            'bg-blue-500/5 border-blue-500/20',
            'text-blue-700 dark:text-blue-400',
            conceptsParentRef,
            conceptsRowVirtualizer
          )}
        {onAddSuggestedRelations &&
          renderSuggestionSection(
            'Suggested Relations',
            Lightbulb,
            editableRelations,
            selectedRelationIndices,
            'relation-',
            onAddSuggestedRelations as any,
            onClearSuggestedRelations,
            'bg-purple-500/5 border-purple-500/20',
            'text-purple-700 dark:text-purple-400',
            relationsParentRef,
            relationsRowVirtualizer
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
        {mainContent()}
      </CardContent>
    </Card>
  );
});
AISuggestionPanel.displayName = 'AISuggestionPanel';
