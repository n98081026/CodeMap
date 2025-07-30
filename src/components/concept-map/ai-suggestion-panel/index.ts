// Export the refactored components
export { default as AISuggestionPanelRefactored } from './AISuggestionPanelRefactored';
export { default as ConceptSuggestionItem } from './ConceptSuggestionItem';
export { default as RelationSuggestionItem } from './RelationSuggestionItem';
export { default as SuggestionSection } from './SuggestionSection';

// Re-export types for convenience
export type {
  ExtractedConceptItem,
  RelationSuggestion,
  AISuggestionPanelProps,
} from './AISuggestionPanelRefactored';