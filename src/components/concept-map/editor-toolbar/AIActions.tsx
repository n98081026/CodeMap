'use client';

import {
  Search,
  Lightbulb,
  Brain,
  Sparkles,
  TextSearch,
  ListCollapse,
  BrainCircuit,
  Loader2,
} from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface AIActionsProps {
  onExtractConcepts: () => void;
  onSuggestRelations: () => void;
  onExpandConcept: () => void;
  onQuickCluster: () => void;
  onGenerateSnippetFromText: () => void;
  onSummarizeSelectedNodes: () => void;
  selectedNodeId: string | null;
  numMultiSelectedNodes: number;
  isViewOnlyMode?: boolean;
  isLoading?: boolean;
}

export const AIActions: React.FC<AIActionsProps> = ({
  onExtractConcepts,
  onSuggestRelations,
  onExpandConcept,
  onQuickCluster,
  onGenerateSnippetFromText,
  onSummarizeSelectedNodes,
  selectedNodeId,
  numMultiSelectedNodes,
  isViewOnlyMode = false,
  isLoading = false,
}) => {
  if (isViewOnlyMode) {
    return null;
  }

  const hasSelectedNode = selectedNodeId !== null;
  const hasMultipleNodes = numMultiSelectedNodes > 1;

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='sm'
                disabled={isLoading}
                className='h-8 w-8 p-0'
              >
                {isLoading ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <BrainCircuit className='h-4 w-4' />
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>AI Tools</TooltipContent>
        </Tooltip>

        <DropdownMenuContent align='start' className='w-56'>
          <DropdownMenuItem onClick={onExtractConcepts}>
            <Search className='mr-2 h-4 w-4' />
            Extract Concepts
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onSuggestRelations}>
            <Lightbulb className='mr-2 h-4 w-4' />
            Suggest Relations
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onGenerateSnippetFromText}>
            <TextSearch className='mr-2 h-4 w-4' />
            Generate from Text
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onQuickCluster}>
            <ListCollapse className='mr-2 h-4 w-4' />
            Quick Cluster
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={onExpandConcept}
            disabled={!hasSelectedNode}
          >
            <Brain className='mr-2 h-4 w-4' />
            Expand Selected Concept
            {!hasSelectedNode && (
              <span className='ml-auto text-xs text-muted-foreground'>
                Select a node
              </span>
            )}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={onSummarizeSelectedNodes}
            disabled={!hasMultipleNodes}
          >
            <Sparkles className='mr-2 h-4 w-4' />
            Summarize Selected Nodes
            {!hasMultipleNodes && (
              <span className='ml-auto text-xs text-muted-foreground'>
                Select multiple nodes
              </span>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
};
