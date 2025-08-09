'use client';

import { Brain, Lightbulb, Wand2, MessageSquare } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';

interface AIToolsIntegrationProps {
  isViewOnly?: boolean;
  selectedNodeId?: string | null;
  onToolComplete?: () => void;
}

export const AIToolsIntegration: React.FC<AIToolsIntegrationProps> = ({
  isViewOnly = false,
  selectedNodeId,
  onToolComplete,
}) => {
  const { toast } = useToast();
  const aiTools = useConceptMapAITools();

  const handleExtractConcepts = async () => {
    try {
      await aiTools.handleExtractConcepts({ context: '' });
      toast({
        title: 'Concepts Extracted',
        description: 'AI has extracted concepts from your content.',
      });
      onToolComplete?.();
    } catch (error) {
      toast({
        title: 'Extraction Failed',
        description: 'Failed to extract concepts. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleSuggestRelations = async () => {
    try {
      await aiTools.handleSuggestRelations();
      toast({
        title: 'Relations Suggested',
        description: 'AI has suggested relationships between concepts.',
      });
      onToolComplete?.();
    } catch (error) {
      toast({
        title: 'Suggestion Failed',
        description: 'Failed to suggest relations. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleExpandConcept = async () => {
    if (!selectedNodeId) {
      toast({
        title: 'No Node Selected',
        description: 'Please select a node to expand.',
        variant: 'destructive',
      });
      return;
    }

    try {
      aiTools.openExpandConceptModal(selectedNodeId);
      onToolComplete?.();
    } catch (error) {
      toast({
        title: 'Expansion Failed',
        description: 'Failed to expand concept. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isViewOnly) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Brain className='h-5 w-5' />
            AI Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            AI tools are disabled in view-only mode.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Brain className='h-5 w-5' />
          AI Tools
        </CardTitle>
      </CardHeader>
      <CardContent className='space-y-2'>
        <Button
          onClick={handleExtractConcepts}
          disabled={aiTools.isProcessing}
          className='w-full justify-start'
          variant='outline'
        >
          <Lightbulb className='h-4 w-4 mr-2' />
          Extract Concepts
        </Button>

        <Button
          onClick={handleSuggestRelations}
          disabled={aiTools.isProcessing}
          className='w-full justify-start'
          variant='outline'
        >
          <Wand2 className='h-4 w-4 mr-2' />
          Suggest Relations
        </Button>

        <Button
          onClick={handleExpandConcept}
          disabled={aiTools.isProcessing || !selectedNodeId}
          className='w-full justify-start'
          variant='outline'
        >
          <Brain className='h-4 w-4 mr-2' />
          Expand Concept
        </Button>

        {selectedNodeId && (
          <Button
            onClick={() => aiTools.openRewriteNodeContentModal(selectedNodeId)}
            disabled={aiTools.isProcessing}
            className='w-full justify-start'
            variant='outline'
          >
            <MessageSquare className='h-4 w-4 mr-2' />
            Rewrite Content
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
