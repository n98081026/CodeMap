'use client';

import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import { useConceptMapStore } from '@/stores/concept-map-store';
import type { ExtractedConceptItem, RelationSuggestion } from '@/components/concept-map/ai-suggestion-panel';

export const useEditorAIActions = () => {
  const { toast } = useToast();
  const {
    extractConcepts,
    suggestRelations,
    expandConcept,
    quickCluster,
    generateSnippetFromText,
    summarizeSelectedNodes,
  } = useConceptMapAITools();

  const {
    aiExtractedConcepts,
    aiSuggestedRelations,
    clearExtractedConcepts,
    clearSuggestedRelations,
    addConceptsToMap,
    addRelationsToMap,
    selectedElementId,
    multiSelectedNodeIds,
  } = useConceptMapStore();

  // Extract concepts action
  const handleExtractConcepts = useCallback(async () => {
    try {
      await extractConcepts();
      toast({
        title: 'Concepts extracted',
        description: 'AI has extracted concepts from your content.',
      });
    } catch (error) {
      toast({
        title: 'Extraction failed',
        description: 'Failed to extract concepts. Please try again.',
        variant: 'destructive',
      });
    }
  }, [extractConcepts, toast]);

  // Suggest relations action
  const handleSuggestRelations = useCallback(async () => {
    try {
      await suggestRelations();
      toast({
        title: 'Relations suggested',
        description: 'AI has suggested new relations between concepts.',
      });
    } catch (error) {
      toast({
        title: 'Suggestion failed',
        description: 'Failed to suggest relations. Please try again.',
        variant: 'destructive',
      });
    }
  }, [suggestRelations, toast]);

  // Expand concept action
  const handleExpandConcept = useCallback(async () => {
    if (!selectedElementId) {
      toast({
        title: 'No concept selected',
        description: 'Please select a concept to expand.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await expandConcept(selectedElementId);
      toast({
        title: 'Concept expanded',
        description: 'AI has expanded the selected concept.',
      });
    } catch (error) {
      toast({
        title: 'Expansion failed',
        description: 'Failed to expand concept. Please try again.',
        variant: 'destructive',
      });
    }
  }, [expandConcept, selectedElementId, toast]);

  // Quick cluster action
  const handleQuickCluster = useCallback(async () => {
    try {
      await quickCluster();
      toast({
        title: 'Concepts clustered',
        description: 'AI has organized your concepts into clusters.',
      });
    } catch (error) {
      toast({
        title: 'Clustering failed',
        description: 'Failed to cluster concepts. Please try again.',
        variant: 'destructive',
      });
    }
  }, [quickCluster, toast]);

  // Generate snippet action
  const handleGenerateSnippetFromText = useCallback(async () => {
    try {
      await generateSnippetFromText();
      toast({
        title: 'Snippet generated',
        description: 'AI has generated a concept snippet from text.',
      });
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate snippet. Please try again.',
        variant: 'destructive',
      });
    }
  }, [generateSnippetFromText, toast]);

  // Summarize selected nodes action
  const handleSummarizeSelectedNodes = useCallback(async () => {
    if (multiSelectedNodeIds.length === 0) {
      toast({
        title: 'No nodes selected',
        description: 'Please select multiple nodes to summarize.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await summarizeSelectedNodes();
      toast({
        title: 'Nodes summarized',
        description: 'AI has created a summary of the selected nodes.',
      });
    } catch (error) {
      toast({
        title: 'Summarization failed',
        description: 'Failed to summarize nodes. Please try again.',
        variant: 'destructive',
      });
    }
  }, [summarizeSelectedNodes, multiSelectedNodeIds, toast]);

  // Add extracted concepts to map
  const handleAddExtractedConcepts = useCallback((concepts: ExtractedConceptItem[]) => {
    addConceptsToMap(concepts);
    toast({
      title: 'Concepts added',
      description: `Added ${concepts.length} concepts to the map.`,
    });
  }, [addConceptsToMap, toast]);

  // Add suggested relations to map
  const handleAddSuggestedRelations = useCallback((relations: RelationSuggestion[]) => {
    addRelationsToMap(relations);
    toast({
      title: 'Relations added',
      description: `Added ${relations.length} relations to the map.`,
    });
  }, [addRelationsToMap, toast]);

  // Clear extracted concepts
  const handleClearExtractedConcepts = useCallback(() => {
    clearExtractedConcepts();
    toast({
      title: 'Concepts cleared',
      description: 'Extracted concepts have been cleared.',
    });
  }, [clearExtractedConcepts, toast]);

  // Clear suggested relations
  const handleClearSuggestedRelations = useCallback(() => {
    clearSuggestedRelations();
    toast({
      title: 'Relations cleared',
      description: 'Suggested relations have been cleared.',
    });
  }, [clearSuggestedRelations, toast]);

  return {
    // State
    aiExtractedConcepts,
    aiSuggestedRelations,
    
    // Actions
    handleExtractConcepts,
    handleSuggestRelations,
    handleExpandConcept,
    handleQuickCluster,
    handleGenerateSnippetFromText,
    handleSummarizeSelectedNodes,
    handleAddExtractedConcepts,
    handleAddSuggestedRelations,
    handleClearExtractedConcepts,
    handleClearSuggestedRelations,
  };
};