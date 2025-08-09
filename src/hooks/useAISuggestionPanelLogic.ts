import { useVirtualizer } from '@tanstack/react-virtual';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import type {
  ExtractedConceptItem,
  RelationSuggestion,
} from '@/components/concept-map/ai-suggestion-panel';
import type { ConceptMapNode } from '@/types';

import { useConceptMapStore } from '@/stores/concept-map-store';

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

interface UseAISuggestionPanelLogicProps {
  currentMapNodes: ConceptMapNode[];
  extractedConcepts: ExtractedConceptItem[];
  suggestedRelations: RelationSuggestion[];
}

export const useAISuggestionPanelLogic = ({
  currentMapNodes,
  extractedConcepts,
  suggestedRelations,
}: UseAISuggestionPanelLogicProps) => {
  // Store selectors
  const { setDragPreview, clearDragPreview, setDraggedRelationPreview } =
    useConceptMapStore(
      useCallback(
        (s) => ({
          setDragPreview: s.setDragPreview,
          clearDragPreview: s.clearDragPreview,
          setDraggedRelationPreview: s.setDraggedRelationPreview,
        }),
        []
      )
    );

  // State for editable items
  const [editableExtracted, setEditableExtracted] = useState<
    EditableExtractedConcept[]
  >([]);
  const [editableRelations, setEditableRelations] = useState<
    EditableRelationSuggestion[]
  >([]);

  // Selection state
  const [selectedExtractedIndices, setSelectedExtractedIndices] = useState<
    Set<number>
  >(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<
    Set<number>
  >(new Set());

  // Refs for virtualization
  const conceptsParentRef = useRef<HTMLDivElement>(null);
  const relationsParentRef = useRef<HTMLDivElement>(null);

  // Memoized existing node texts for comparison
  const existingNodeTexts = useMemo(() => {
    return new Set(currentMapNodes.map((n) => n.text.toLowerCase().trim()));
  }, [currentMapNodes]);

  // Mapping functions
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
    (items: RelationSuggestion[]): EditableRelationSuggestion[] =>
      items.map((item) => ({
        original: item,
        current: { ...item },
        isEditing: false,
        editingField: null,
      })),
    []
  );

  // Update editable items when props change
  useEffect(() => {
    setEditableExtracted(mapExtractedToEditable(extractedConcepts || []));
    setSelectedExtractedIndices(new Set());
  }, [extractedConcepts, mapExtractedToEditable]);

  useEffect(() => {
    setEditableRelations(mapRelationsToEditable(suggestedRelations || []));
    setSelectedRelationIndices(new Set());
  }, [suggestedRelations, mapRelationsToEditable]);

  // Virtualizers
  const conceptsRowVirtualizer = useVirtualizer({
    count: editableExtracted.length,
    getScrollElement: () => conceptsParentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const relationsRowVirtualizer = useVirtualizer({
    count: editableRelations.length,
    getScrollElement: () => relationsParentRef.current,
    estimateSize: () => 100,
    overscan: 5,
  });

  // Status checking functions
  const getConceptStatus = useCallback(
    (item: ExtractedConceptItem): ItemStatus => {
      const conceptText = item.concept.toLowerCase().trim();
      if (existingNodeTexts.has(conceptText)) {
        return 'exact-match';
      }
      // Simple similarity check - could be enhanced
      for (const existingText of existingNodeTexts) {
        if (
          existingText.includes(conceptText) ||
          conceptText.includes(existingText)
        ) {
          return 'similar-match';
        }
      }
      return 'new';
    },
    [existingNodeTexts]
  );

  const checkRelationNodesExistOnMap = useCallback(
    (relation: RelationSuggestion): boolean => {
      const sourceExists = existingNodeTexts.has(
        relation.source.toLowerCase().trim()
      );
      const targetExists = existingNodeTexts.has(
        relation.target.toLowerCase().trim()
      );
      return sourceExists && targetExists;
    },
    [existingNodeTexts]
  );

  // Edit handlers for concepts
  const handleToggleConceptEdit = useCallback(
    (index: number, field: 'concept') => {
      setEditableExtracted((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                isEditing: !item.isEditing,
                editingField: item.isEditing ? null : field,
              }
            : { ...item, isEditing: false, editingField: null }
        )
      );
    },
    []
  );

  const handleConceptInputChange = useCallback(
    (index: number, value: string, field: 'concept') => {
      setEditableExtracted((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, current: { ...item.current, [field]: value } }
            : item
        )
      );
    },
    []
  );

  const handleConfirmConceptEdit = useCallback((index: number) => {
    setEditableExtracted((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isEditing: false, editingField: null } : item
      )
    );
  }, []);

  // Edit handlers for relations
  const handleToggleRelationEdit = useCallback(
    (index: number, field: 'source' | 'target' | 'relation' | 'reason') => {
      setEditableRelations((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                isEditing: !item.isEditing,
                editingField: item.isEditing ? null : field,
              }
            : { ...item, isEditing: false, editingField: null }
        )
      );
    },
    []
  );

  const handleRelationInputChange = useCallback(
    (
      index: number,
      value: string,
      field: 'source' | 'target' | 'relation' | 'reason'
    ) => {
      setEditableRelations((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, current: { ...item.current, [field]: value } }
            : item
        )
      );
    },
    []
  );

  const handleConfirmRelationEdit = useCallback((index: number) => {
    setEditableRelations((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isEditing: false, editingField: null } : item
      )
    );
  }, []);

  // Selection handlers
  const handleToggleConceptSelection = useCallback((index: number) => {
    setSelectedExtractedIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  const handleToggleRelationSelection = useCallback((index: number) => {
    setSelectedRelationIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  }, []);

  return {
    // State
    editableExtracted,
    editableRelations,
    selectedExtractedIndices,
    selectedRelationIndices,

    // Refs
    conceptsParentRef,
    relationsParentRef,

    // Virtualizers
    conceptsRowVirtualizer,
    relationsRowVirtualizer,

    // Store actions
    setDragPreview,
    clearDragPreview,
    setDraggedRelationPreview,

    // Status functions
    getConceptStatus,
    checkRelationNodesExistOnMap,

    // Handlers
    handleToggleConceptEdit,
    handleConceptInputChange,
    handleConfirmConceptEdit,
    handleToggleRelationEdit,
    handleRelationInputChange,
    handleConfirmRelationEdit,
    handleToggleConceptSelection,
    handleToggleRelationSelection,
  };
};
