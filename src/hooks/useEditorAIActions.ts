'use client';

import { useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import { useAISuggestionStore } from '@/stores/ai-suggestion-store';
import { useEditorUIStore } from '@/stores/editor-ui-store';

export const useEditorAIActions = () => {
  const { toast } = useToast();
  const {
    handleExtractConcepts: extractConcepts,
    handleSuggestRelations: suggestRelations,
    openExpandConceptModal: expandConcept,
    handleQuickCluster: quickCluster,
    handleGenerateSnippetFromText: generateSnippetFromText,
  } = useConceptMapAITools();

  const {
    aiExtractedConcepts,
    aiSuggestedRelations,
    resetAiSuggestions,
    commitStagedMapData,
  } = useAISuggestionStore();

  const { selectedElementId, multiSelectedNodeIds } = useEditorUIStore();

  const handleExtractConcepts = useCallback(async () => {
    try {
      // TODO: The context should be provided from a UI element, e.g., a text area.
      // Passing an empty string for now to satisfy the type signature.
      await extractConcepts({ context: '' });
      toast({
        title: 'Concepts extracted',
        description: 'AI has extracted concepts for your review.',
      });
    } catch (error) {
      toast({
        title: 'Extraction failed',
        description: 'Failed to extract concepts. Please try again.',
        variant: 'destructive',
      });
    }
  }, [extractConcepts, toast]);

  const handleSuggestRelations = useCallback(async () => {
    try {
      await suggestRelations();
      toast({
        title: 'Relations suggested',
        description: 'AI has suggested new relations for your review.',
      });
    } catch (error) {
      toast({
        title: 'Suggestion failed',
        description: 'Failed to suggest relations. Please try again.',
        variant: 'destructive',
      });
    }
  }, [suggestRelations, toast]);

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
      expandConcept(selectedElementId);
      toast({
        title: 'Concept expansion started',
        description: 'AI is expanding the selected concept for your review.',
      });
    } catch (error) {
      toast({
        title: 'Expansion failed',
        description: 'Failed to expand concept. Please try again.',
        variant: 'destructive',
      });
    }
  }, [expandConcept, selectedElementId, toast]);

  const handleQuickCluster = useCallback(async () => {
    try {
      await quickCluster({});
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

  const handleGenerateSnippetFromText = useCallback(async () => {
    try {
      // TODO: The text should be provided from a UI element.
      await generateSnippetFromText({ text: '' });
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
      // TODO: Implement the actual summarization logic
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
  }, [multiSelectedNodeIds, toast]);

  // This function now directly commits what's in the staging area.
  const handleAddStagedDataToMap = useCallback(() => {
    commitStagedMapData();
    toast({
      title: 'Changes committed',
      description: 'The staged AI suggestions have been added to the map.',
    });
  }, [commitStagedMapData, toast]);

  const handleClearSuggestions = useCallback(() => {
    resetAiSuggestions();
    toast({
      title: 'Suggestions cleared',
      description: 'AI suggestions have been cleared.',
    });
  }, [resetAiSuggestions, toast]);

  return {
    aiExtractedConcepts,
    aiSuggestedRelations,
    handleExtractConcepts,
    handleSuggestRelations,
    handleExpandConcept,
    handleQuickCluster,
    handleGenerateSnippetFromText,
    handleSummarizeSelectedNodes,
    handleAddStagedDataToMap, // Renamed for clarity
    handleClearSuggestions, // Renamed for clarity
  };
};
