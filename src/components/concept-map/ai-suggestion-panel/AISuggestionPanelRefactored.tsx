'use client';

import { GitFork, Lightbulb } from 'lucide-react';
import React, { useState, useMemo, useCallback } from 'react';

import type { ConceptMapData, ConceptMapNode } from '@/types';

import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent } from '@/components/ui/card';
import { useConceptMapStore } from '@/stores/concept-map-store';

import { EditableConceptLabel } from './EditableConceptLabel';
import { EditableRelationLabel } from './EditableRelationLabel';
import { SuggestionSection } from './SuggestionSection';
import type {
  ExtractedConceptItem,
  RelationSuggestion,
  EditableExtractedConcept,
  EditableRelationSuggestion,
  ItemStatus,
} from './AISuggestionPanelTypes';

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

export const AISuggestionPanelRefactored: React.FC<AISuggestionPanelProps> = ({
  mapData,
  currentMapNodes = [],
  extractedConcepts = [],
  suggestedRelations = [],
  onAddExtractedConcepts,
  onAddSuggestedRelations,
  onClearExtractedConcepts,
  onClearSuggestedRelations,
  isViewOnlyMode = false,
}) => {
  // Local state for editing
  const [editableConcepts, setEditableConcepts] = useState<EditableExtractedConcept[]>([]);
  const [editableRelations, setEditableRelations] = useState<EditableRelationSuggestion[]>([]);
  const [selectedConceptIndices, setSelectedConceptIndices] = useState<Set<number>>(new Set());
  const [selectedRelationIndices, setSelectedRelationIndices] = useState<Set<number>>(new Set());

  // Store hooks for drag preview
  const { setDragPreviewItem, updateDragPreviewPosition, setDraggedRelationLabel } = useConceptMapStore();

  // Initialize editable items when props change
  React.useEffect(() => {
    setEditableConcepts(
      extractedConcepts.map(concept => ({
        original: concept,
        current: { ...concept },
        isEditing: false,
        editingField: null,
      }))
    );
  }, [extractedConcepts]);

  React.useEffect(() => {
    setEditableRelations(
      suggestedRelations.map(relation => ({
        original: relation,
        current: { ...relation },
        isEditing: false,
        editingField: null,
      }))
    );
  }, [suggestedRelations]);

  // Determine concept status (new, exact match, similar match)
  const getConceptStatus = useCallback((concept: string): ItemStatus => {
    const normalizedConcept = concept.toLowerCase().trim();
    const existingConcepts = currentMapNodes.map(node => node.text.toLowerCase().trim());
    
    if (existingConcepts.includes(normalizedConcept)) {
      return 'exact-match';
    }
    
    // Check for similar matches (simple similarity check)
    const hasSimilar = existingConcepts.some(existing => 
      existing.includes(normalizedConcept) || normalizedConcept.includes(existing)
    );
    
    return hasSimilar ? 'similar-match' : 'new';
  }, [currentMapNodes]);

  // Check if relation nodes exist
  const getRelationNodeExistence = useCallback((relation: RelationSuggestion) => {
    const nodeTexts = currentMapNodes.map(node => node.text.toLowerCase().trim());
    return {
      source: nodeTexts.includes(relation.source.toLowerCase().trim()),
      target: nodeTexts.includes(relation.target.toLowerCase().trim()),
    };
  }, [currentMapNodes]);

  // Concept editing handlers
  const handleConceptToggleEdit = useCallback((index: number, field: 'concept') => {
    setEditableConcepts(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, isEditing: !item.isEditing, editingField: item.isEditing ? null : field }
        : { ...item, isEditing: false, editingField: null }
    ));
  }, []);

  const handleConceptInputChange = useCallback((index: number, value: string, field: 'concept') => {
    setEditableConcepts(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, current: { ...item.current, [field]: value } }
        : item
    ));
  }, []);

  const handleConceptConfirmEdit = useCallback((index: number) => {
    setEditableConcepts(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, isEditing: false, editingField: null }
        : item
    ));
  }, []);

  // Relation editing handlers
  const handleRelationToggleEdit = useCallback((index: number, field: 'source' | 'target' | 'relation') => {
    setEditableRelations(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, isEditing: !item.isEditing, editingField: item.isEditing ? null : field }
        : { ...item, isEditing: false, editingField: null }
    ));
  }, []);

  const handleRelationInputChange = useCallback((index: number, value: string, field: 'source' | 'target' | 'relation') => {
    setEditableRelations(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, current: { ...item.current, [field]: value } }
        : item
    ));
  }, []);

  const handleRelationConfirmEdit = useCallback((index: number) => {
    setEditableRelations(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, isEditing: false, editingField: null }
        : item
    ));
  }, []);

  // Drag handlers
  const setDragPreview = useCallback((item: { text: string; type: string } | null) => {
    setDragPreviewItem(item);
  }, [setDragPreviewItem]);

  const clearDragPreview = useCallback(() => {
    setDragPreviewItem(null);
    setDraggedRelationLabel(null);
  }, [setDragPreviewItem, setDraggedRelationLabel]);

  const setDraggedRelationPreview = useCallback((label: string | null) => {
    setDraggedRelationLabel(label);
  }, [setDraggedRelationLabel]);

  // Add handlers
  const handleAddSelectedConcepts = useCallback((concepts: EditableExtractedConcept[]) => {
    const conceptItems = concepts.map(c => c.current);
    onAddExtractedConcepts?.(conceptItems);
  }, [onAddExtractedConcepts]);

  const handleAddSelectedRelations = useCallback((relations: EditableRelationSuggestion[]) => {
    const relationItems = relations.map(r => r.current);
    onAddSuggestedRelations?.(relationItems);
  }, [onAddSuggestedRelations]);

  // Render functions
  const renderConceptItem = useCallback((item: EditableExtractedConcept, index: number) => {
    const status = getConceptStatus(item.current.concept);
    
    return (
      <EditableConceptLabel
        item={item}
        index={index}
        itemStatus={status}
        isViewOnlyMode={isViewOnlyMode}
        onToggleEdit={handleConceptToggleEdit}
        onInputChange={handleConceptInputChange}
        onConfirmEdit={handleConceptConfirmEdit}
        setDragPreview={setDragPreview}
        clearDragPreview={clearDragPreview}
      />
    );
  }, [
    getConceptStatus,
    isViewOnlyMode,
    handleConceptToggleEdit,
    handleConceptInputChange,
    handleConceptConfirmEdit,
    setDragPreview,
    clearDragPreview,
  ]);

  const renderRelationItem = useCallback((item: EditableRelationSuggestion, index: number) => {
    const nodeExistence = getRelationNodeExistence(item.current);
    
    return (
      <EditableRelationLabel
        item={item}
        index={index}
        isViewOnlyMode={isViewOnlyMode}
        relationNodeExistence={nodeExistence}
        onToggleEdit={handleRelationToggleEdit}
        onInputChange={handleRelationInputChange}
        onConfirmEdit={handleRelationConfirmEdit}
        setDraggedRelationPreview={setDraggedRelationPreview}
        clearDragPreview={clearDragPreview}
      />
    );
  }, [
    getRelationNodeExistence,
    isViewOnlyMode,
    handleRelationToggleEdit,
    handleRelationInputChange,
    handleRelationConfirmEdit,
    setDraggedRelationPreview,
    clearDragPreview,
  ]);

  // Main content
  const hasAnySuggestions = extractedConcepts.length > 0 || suggestedRelations.length > 0;

  if (!hasAnySuggestions) {
    return (
      <Card
        className='h-full w-full rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/10 shadow-inner'
        data-tutorial-id='ai-suggestion-panel'
      >
        <CardContent className='flex h-full flex-col items-center justify-center text-center p-6'>
          <EmptyState
            icon={GitFork}
            title='No AI Suggestions'
            description='Use AI tools to extract concepts and suggest relations for your concept map.'
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className='h-full w-full rounded-lg border shadow-sm'
      data-tutorial-id='ai-suggestion-panel'
    >
      <CardContent className='h-full p-0 flex flex-col'>
        <div className='flex-1 space-y-4 p-4'>
          {/* Extracted Concepts Section */}
          {extractedConcepts.length > 0 && (
            <SuggestionSection
              title='Extracted Concepts'
              icon={GitFork}
              items={editableConcepts}
              selectedIndices={selectedConceptIndices}
              onSelectionChange={setSelectedConceptIndices}
              onAddSelected={handleAddSelectedConcepts}
              onClearAll={onClearExtractedConcepts}
              renderItem={renderConceptItem}
              isViewOnlyMode={isViewOnlyMode}
              className='bg-blue-500/5 border border-blue-500/20 rounded-lg'
              headerClassName='text-blue-700 dark:text-blue-400'
            />
          )}

          {/* Suggested Relations Section */}
          {suggestedRelations.length > 0 && (
            <SuggestionSection
              title='Suggested Relations'
              icon={Lightbulb}
              items={editableRelations}
              selectedIndices={selectedRelationIndices}
              onSelectionChange={setSelectedRelationIndices}
              onAddSelected={handleAddSelectedRelations}
              onClearAll={onClearSuggestedRelations}
              renderItem={renderRelationItem}
              isViewOnlyMode={isViewOnlyMode}
              className='bg-purple-500/5 border border-purple-500/20 rounded-lg'
              headerClassName='text-purple-700 dark:text-purple-400'
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};

AISuggestionPanelRefactored.displayName = 'AISuggestionPanelRefactored';