'use client';

import React, { memo, useMemo, useCallback, useState } from 'react';

import { EditableConceptLabel } from '../ai-suggestion-panel/EditableConceptLabel';
import { EditableRelationLabel } from '../ai-suggestion-panel/EditableRelationLabel';

import type {
  ExtractedConceptItem,
  RelationSuggestion,
  EditableExtractedConcept,
  EditableRelationSuggestion,
  ItemStatus,
} from '../ai-suggestion-panel/AISuggestionPanelTypes';
import type { ConceptMapData, ConceptMapNode } from '@/types';

import { useDebounce, useDebouncedCallback } from '@/hooks/useDebounce';
import { useVirtualizedList } from '@/hooks/useVirtualizedList';
import { usePerformanceMonitor } from '@/utils/performanceMonitor';

export interface OptimizedAISuggestionPanelProps {
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

// Memoized concept item component
const MemoizedConceptItem = memo<{
  item: EditableExtractedConcept;
  index: number;
  status: ItemStatus;
  isViewOnlyMode: boolean;
  onToggleEdit: (index: number, field: 'concept') => void;
  onInputChange: (index: number, value: string, field: 'concept') => void;
  onConfirmEdit: (index: number) => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  clearDragPreview: () => void;
}>(
  ({
    item,
    index,
    status,
    isViewOnlyMode,
    onToggleEdit,
    onInputChange,
    onConfirmEdit,
    setDragPreview,
    clearDragPreview,
  }) => (
    <EditableConceptLabel
      item={item}
      index={index}
      itemStatus={status}
      isViewOnlyMode={isViewOnlyMode}
      onToggleEdit={onToggleEdit}
      onInputChange={onInputChange}
      onConfirmEdit={onConfirmEdit}
      setDragPreview={setDragPreview}
      clearDragPreview={clearDragPreview}
    />
  )
);

MemoizedConceptItem.displayName = 'MemoizedConceptItem';

// Memoized relation item component
const MemoizedRelationItem = memo<{
  item: EditableRelationSuggestion;
  index: number;
  isViewOnlyMode: boolean;
  relationNodeExistence: { source?: boolean; target?: boolean };
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
}>(
  ({
    item,
    index,
    isViewOnlyMode,
    relationNodeExistence,
    onToggleEdit,
    onInputChange,
    onConfirmEdit,
    setDraggedRelationPreview,
    clearDragPreview,
  }) => (
    <EditableRelationLabel
      item={item}
      index={index}
      isViewOnlyMode={isViewOnlyMode}
      relationNodeExistence={relationNodeExistence}
      onToggleEdit={onToggleEdit}
      onInputChange={onInputChange}
      onConfirmEdit={onConfirmEdit}
      setDraggedRelationPreview={setDraggedRelationPreview}
      clearDragPreview={clearDragPreview}
    />
  )
);

MemoizedRelationItem.displayName = 'MemoizedRelationItem';

export const OptimizedAISuggestionPanel: React.FC<OptimizedAISuggestionPanelProps> =
  memo(
    ({
      currentMapNodes = [],
      extractedConcepts = [],
      suggestedRelations = [],
      isViewOnlyMode = false,
    }) => {
      const { measure } = usePerformanceMonitor();

      // Local state with debouncing for better performance
      const [searchTerm, setSearchTerm] = useState('');
      const debouncedSearchTerm = useDebounce(searchTerm, 300);

      const [editableConcepts, setEditableConcepts] = useState<
        EditableExtractedConcept[]
      >([]);
      const [editableRelations, setEditableRelations] = useState<
        EditableRelationSuggestion[]
      >([]);

      // Memoized filtered concepts with performance monitoring
      const filteredConcepts = useMemo(() => {
        return measure('filter-concepts', () => {
          if (!debouncedSearchTerm.trim()) return editableConcepts;

          const searchLower = debouncedSearchTerm.toLowerCase();
          return editableConcepts.filter(
            (concept) =>
              concept.current.concept.toLowerCase().includes(searchLower) ||
              concept.current.context?.toLowerCase().includes(searchLower) ||
              concept.current.source?.toLowerCase().includes(searchLower)
          );
        });
      }, [editableConcepts, debouncedSearchTerm, measure]);

      // Memoized filtered relations with performance monitoring
      const filteredRelations = useMemo(() => {
        return measure('filter-relations', () => {
          if (!debouncedSearchTerm.trim()) return editableRelations;

          const searchLower = debouncedSearchTerm.toLowerCase();
          return editableRelations.filter(
            (relation) =>
              relation.current.source.toLowerCase().includes(searchLower) ||
              relation.current.target.toLowerCase().includes(searchLower) ||
              relation.current.relation.toLowerCase().includes(searchLower) ||
              relation.current.reason?.toLowerCase().includes(searchLower)
          );
        });
      }, [editableRelations, debouncedSearchTerm, measure]);

      // Virtualized lists for performance
      const conceptsVirtualizer = useVirtualizedList({
        items: filteredConcepts,
        estimateSize: () => 80,
        overscan: 5,
        getItemKey: (index, item) => item.original.concept + index,
      });

      const relationsVirtualizer = useVirtualizedList({
        items: filteredRelations,
        estimateSize: () => 60,
        overscan: 5,
        getItemKey: (index, item) =>
          `${item.original.source}-${item.original.target}-${index}`,
      });

      // Memoized concept status calculation
      const getConceptStatus = useCallback(
        (concept: string): ItemStatus => {
          const normalizedConcept = concept.toLowerCase().trim();
          const existingConcepts = currentMapNodes.map((node) =>
            node.text.toLowerCase().trim()
          );

          if (existingConcepts.includes(normalizedConcept)) {
            return 'exact-match';
          }

          const hasSimilar = existingConcepts.some(
            (existing) =>
              existing.includes(normalizedConcept) ||
              normalizedConcept.includes(existing)
          );

          return hasSimilar ? 'similar-match' : 'new';
        },
        [currentMapNodes]
      );

      // Memoized relation node existence check
      const getRelationNodeExistence = useCallback(
        (relation: RelationSuggestion) => {
          const nodeTexts = currentMapNodes.map((node) =>
            node.text.toLowerCase().trim()
          );
          return {
            source: nodeTexts.includes(relation.source.toLowerCase().trim()),
            target: nodeTexts.includes(relation.target.toLowerCase().trim()),
          };
        },
        [currentMapNodes]
      );

      // Debounced editing handlers for better performance
      const debouncedConceptEdit = useDebouncedCallback(
        (index: number, value: string) => {
          setEditableConcepts((prev) =>
            prev.map((item, i) =>
              i === index
                ? { ...item, current: { ...item.current, concept: value } }
                : item
            )
          );
        },
        150
      );

      const debouncedRelationEdit = useDebouncedCallback(
        (
          index: number,
          value: string,
          field: 'source' | 'target' | 'relation'
        ) => {
          setEditableRelations((prev) =>
            prev.map((item, i) =>
              i === index
                ? { ...item, current: { ...item.current, [field]: value } }
                : item
            )
          );
        },
        150
      );

      // Initialize editable items when props change
      React.useEffect(() => {
        setEditableConcepts(
          extractedConcepts.map((concept) => ({
            original: concept,
            current: { ...concept },
            isEditing: false,
            editingField: null,
          }))
        );
      }, [extractedConcepts]);

      React.useEffect(() => {
        setEditableRelations(
          suggestedRelations.map((relation) => ({
            original: relation,
            current: { ...relation },
            isEditing: false,
            editingField: null,
          }))
        );
      }, [suggestedRelations]);

      // Render functions for virtualized lists
      const renderConceptItem = useCallback(
        (item: EditableExtractedConcept, index: number) => {
          const status = getConceptStatus(item.current.concept);

          return (
            <MemoizedConceptItem
              key={`concept-${index}`}
              item={item}
              index={index}
              status={status}
              isViewOnlyMode={isViewOnlyMode}
              onToggleEdit={() => {}} // Implement as needed
              onInputChange={debouncedConceptEdit}
              onConfirmEdit={() => {}} // Implement as needed
              setDragPreview={() => {}} // Implement as needed
              clearDragPreview={() => {}} // Implement as needed
            />
          );
        },
        [getConceptStatus, isViewOnlyMode, debouncedConceptEdit]
      );

      const renderRelationItem = useCallback(
        (item: EditableRelationSuggestion, index: number) => {
          const nodeExistence = getRelationNodeExistence(item.current);

          return (
            <MemoizedRelationItem
              key={`relation-${index}`}
              item={item}
              index={index}
              isViewOnlyMode={isViewOnlyMode}
              relationNodeExistence={nodeExistence}
              onToggleEdit={() => {}} // Implement as needed
              onInputChange={debouncedRelationEdit}
              onConfirmEdit={() => {}} // Implement as needed
              setDraggedRelationPreview={() => {}} // Implement as needed
              clearDragPreview={() => {}} // Implement as needed
            />
          );
        },
        [getRelationNodeExistence, isViewOnlyMode, debouncedRelationEdit]
      );

      // Performance metrics
      const performanceMetrics = useMemo(
        () => ({
          conceptsCount: filteredConcepts.length,
          relationsCount: filteredRelations.length,
          visibleConceptsCount: conceptsVirtualizer.metrics.visibleItemsCount,
          visibleRelationsCount: relationsVirtualizer.metrics.visibleItemsCount,
        }),
        [
          filteredConcepts.length,
          filteredRelations.length,
          conceptsVirtualizer.metrics,
          relationsVirtualizer.metrics,
        ]
      );

      if (process.env.NODE_ENV === 'development') {
        console.log(
          'AI Suggestion Panel Performance Metrics:',
          performanceMetrics
        );
      }

      return (
        <div className='h-full flex flex-col space-y-4 p-4'>
          {/* Search Input */}
          <div className='relative'>
            <input
              type='text'
              placeholder='Search suggestions...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>

          {/* Concepts Section */}
          {filteredConcepts.length > 0 && (
            <div className='flex-1'>
              <h3 className='text-lg font-semibold mb-2'>
                Extracted Concepts ({filteredConcepts.length})
              </h3>
              <div
                ref={conceptsVirtualizer.parentRef}
                className='h-64 overflow-auto border rounded-md'
                style={{ height: conceptsVirtualizer.totalSize }}
              >
                <div className='relative'>
                  {conceptsVirtualizer.virtualItems.map((virtualItem) => {
                    const item = filteredConcepts[virtualItem.index];
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        {renderConceptItem(item, virtualItem.index)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Relations Section */}
          {filteredRelations.length > 0 && (
            <div className='flex-1'>
              <h3 className='text-lg font-semibold mb-2'>
                Suggested Relations ({filteredRelations.length})
              </h3>
              <div
                ref={relationsVirtualizer.parentRef}
                className='h-64 overflow-auto border rounded-md'
                style={{ height: relationsVirtualizer.totalSize }}
              >
                <div className='relative'>
                  {relationsVirtualizer.virtualItems.map((virtualItem) => {
                    const item = filteredRelations[virtualItem.index];
                    return (
                      <div
                        key={virtualItem.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      >
                        {renderRelationItem(item, virtualItem.index)}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }
  );

OptimizedAISuggestionPanel.displayName = 'OptimizedAISuggestionPanel';
