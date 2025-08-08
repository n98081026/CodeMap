'use client';

import React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Brain, Lightbulb, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import { ExtractConceptsModal } from './ExtractConceptsModal';
import { QuickClusterModal } from './quick-cluster-modal';
import { GenerateSnippetModal } from './generate-snippet-modal';
import { MapSummaryModal } from './map-summary-modal';
import { RewriteNodeContentModal } from './rewrite-node-content-modal';
import { AskQuestionAboutEdgeModal } from './AskQuestionAboutEdgeModal';
import { SuggestIntermediateNodeModal } from './suggest-intermediate-node-modal';

// Define schemas for form validation
const extractConceptsSchema = z.object({
  textToExtract: z.string().min(1, 'Text is required'),
  extractionFocus: z.string().optional(),
});

const suggestRelationsSchema = z.object({
  customPrompt: z.string().optional(),
});

const expandConceptSchema = z.object({
  conceptToExpand: z.string().min(1, 'Concept is required'),
  userRefinementPrompt: z.string().optional(),
});

const askQuestionAboutSelectedNodeSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  context: z.string().optional(),
});

interface GenAIModalProps<T extends z.ZodType<any, any>> {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onSubmit: (values: z.infer<T>) => void;
    isProcessing: boolean;
}

export const SuggestRelationsModal: React.FC<
  Omit<GenAIModalProps<typeof suggestRelationsSchema>, 'isProcessing'> & {
    concepts: string[];
  }
> = ({ isOpen, onOpenChange, onSubmit, concepts }) => {
  const form = useForm<z.infer<typeof suggestRelationsSchema>>({
    resolver: zodResolver(suggestRelationsSchema),
    defaultValues: { customPrompt: '' },
  });
  const { isProcessing: isProcessingRelations } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      form.reset({ customPrompt: '' });
    }
  }, [concepts, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-tutorial-id="suggest-relations-modal">
        <DialogHeader>
          <DialogTitle id="suggest-relations-title">AI 幫你連連看 (Suggest Relations)</DialogTitle>
          <DialogDescription>
            AI 會試著找出選中節點之間可能存在的關聯，並在「AI 建議」面板中給你建議。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="customPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Context (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      data-tutorial-id="suggest-relations-custom-prompt-input"
                      placeholder="e.g., focus on causal relationships, or data flow"
                      {...field}
                      rows={2}
                      className="resize-none mt-1"
                      disabled={isProcessingRelations}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessingRelations}
              >
                Cancel
              </Button>
              <Button
                data-tutorial-id="suggest-relations-submit-button"
                type="submit"
                disabled={isProcessingRelations || concepts.length < 2}
              >
                {isProcessingRelations && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isProcessingRelations ? 'Suggesting...' : (
                  <>
                    <Lightbulb className="mr-2 h-4 w-4" /> Suggest Relations
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const ExpandConceptModal: React.FC<
  Omit<GenAIModalProps<typeof expandConceptSchema>, 'isProcessing'> & {
    initialConceptText?: string;
    existingMapContext?: string[];
  }
> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  initialConceptText,
  existingMapContext,
}) => {
  const form = useForm<z.infer<typeof expandConceptSchema>>({
    resolver: zodResolver(expandConceptSchema),
    defaultValues: {
      conceptToExpand: initialConceptText || '',
      userRefinementPrompt: '',
    },
  });
  const { isProcessing: isProcessingExpansion } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      form.reset({
        conceptToExpand: initialConceptText || '',
        userRefinementPrompt: '',
      });
    }
  }, [initialConceptText, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        aria-labelledby="expand-concept-title"
      >
        <DialogHeader>
          <DialogTitle id="expand-concept-title">AI 幫你想更多 (Expand Concept)</DialogTitle>
          <DialogDescription>
            輸入一個詞彙或想法，AI
            會幫你聯想更多相關的點子，並自動加到概念圖上。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="conceptToExpand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>要深入思考的詞彙/想法</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="例如：人工智慧、專案管理、學習新技能"
                      {...field}
                      disabled={isProcessingExpansion}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="userRefinementPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>引導 AI 的方向 (選填)</FormLabel>
                  <FormControl>
                    <Textarea
                      data-tutorial-id="expand-concept-refinement-prompt-input"
                      placeholder="例如：多想一些優點、有哪些應用場景、跟『學習效率』有什麼關係？"
                      {...field}
                      rows={3}
                      className="resize-none mt-1"
                      disabled={isProcessingExpansion}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {existingMapContext && existingMapContext.length > 0 && (
              <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/50">
                <strong>Context from map:</strong> {existingMapContext.length}{' '}
                node(s) like "{existingMapContext[0]}"
                {existingMapContext.length > 1
                  ? ` and ${existingMapContext.length - 1} other(s)`
                  : ''}
                .
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessingExpansion}
              >
                Cancel
              </Button>
              <Button
                data-tutorial-id="expand-concept-submit-button"
                type="submit"
                disabled={isProcessingExpansion || !form.watch('conceptToExpand')?.trim()}
              >
                {isProcessingExpansion && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isProcessingExpansion ? (
                  'Expanding...'
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" /> Expand Concept
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const GenAIModals: React.FC = () => {
  const aiTools = useConceptMapAITools();

  return (
    <>
      <ExtractConceptsModal
        isOpen={aiTools.isExtractConceptsModalOpen}
        onOpenChange={aiTools.setIsExtractConceptsModalOpen}
        onConfirm={aiTools.handleExtractConcepts}
        isLoading={aiTools.isProcessing}
        contextText={aiTools.textForExtraction}
      />
      <QuickClusterModal
        isOpen={aiTools.isQuickClusterModalOpen}
        onOpenChange={aiTools.setIsQuickClusterModalOpen}
        onConfirm={aiTools.handleQuickCluster}
        isLoading={aiTools.isProcessing}
      />
      <GenerateSnippetModal
        isOpen={aiTools.isGenerateSnippetModalOpen}
        onOpenChange={aiTools.setIsGenerateSnippetModalOpen}
        onConfirm={aiTools.handleGenerateSnippetFromText}
        isLoading={aiTools.isProcessing}
      />
      <MapSummaryModal
        isOpen={aiTools.isSummarizeMapModalOpen}
        onOpenChange={aiTools.setIsSummarizeMapModalOpen}
        onConfirm={() => aiTools.handleSummarizeMap()}
        isLoading={aiTools.isProcessing}
        summary={aiTools.mapSummary}
      />
      <RewriteNodeContentModal
        isOpen={!!aiTools.rewriteModalState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setRewriteModalState((prev) => ({ ...prev, isOpen }))
        }
        onConfirm={(style, customInstruction) =>
          aiTools.handleRewriteNodeContent(style, customInstruction)
        }
        isLoading={aiTools.isProcessing}
        originalContent={aiTools.rewriteModalState.originalContent}
        rewrittenContent={aiTools.rewriteModalState.rewrittenContent}
        nodeId={aiTools.rewriteModalState.nodeId}
      />
      <AskQuestionAboutEdgeModal
        isOpen={!!aiTools.askQuestionAboutEdgeState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setAskQuestionAboutEdgeState((prev) => ({ ...prev, isOpen }))
        }
        edgeContext={aiTools.askQuestionAboutEdgeState.edgeContext}
        onSubmitQuestion={aiTools.handleAskQuestionAboutEdge}
        isLoading={aiTools.isProcessing}
        answer={aiTools.askQuestionAboutEdgeState.answer}
        onCloseModal={() =>
          aiTools.setAskQuestionAboutEdgeState({
            isOpen: false,
            edgeContext: null,
            answer: null,
          })
        }
      />
      <SuggestIntermediateNodeModal
        isOpen={!!aiTools.suggestIntermediateNodeState.isOpen}
        onOpenChange={(isOpen) =>
          aiTools.setSuggestIntermediateNodeState((prev) => ({
            ...prev,
            isOpen,
          }))
        }
        edgeInfo={aiTools.suggestIntermediateNodeState.edgeInfo}
        suggestions={aiTools.suggestIntermediateNodeState.suggestions}
        isLoading={aiTools.isProcessing}
        onConfirm={(suggestion) =>
          aiTools.confirmAddIntermediateNode(suggestion)
        }
      />
    </>
  );
};
