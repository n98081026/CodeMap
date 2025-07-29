// Types for AI Suggestion Panel components

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

export interface EditableExtractedConcept {
  original: ExtractedConceptItem;
  current: ExtractedConceptItem;
  isEditing: boolean;
  editingField: 'concept' | 'context' | 'source' | null;
}

export interface EditableRelationSuggestion {
  original: RelationSuggestion;
  current: RelationSuggestion;
  isEditing: boolean;
  editingField: 'source' | 'target' | 'relation' | 'reason' | null;
}

export type ItemStatus = 'new' | 'exact-match' | 'similar-match';

export interface ConceptLabelProps {
  item: EditableExtractedConcept;
  index: number;
  itemStatus: ItemStatus;
  isViewOnlyMode?: boolean;
  onToggleEdit: (index: number, field: 'concept') => void;
  onInputChange: (index: number, value: string, field: 'concept') => void;
  onConfirmEdit: (index: number) => void;
  setDragPreview: (item: { text: string; type: string } | null) => void;
  clearDragPreview: () => void;
}

export interface RelationLabelProps {
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
}