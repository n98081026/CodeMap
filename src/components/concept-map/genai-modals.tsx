'use client';

import {
  Loader2,
  HelpCircle,
  Search,
  Lightbulb,
  Brain,
  Send,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Node } from 'reactflow';
import { z } from 'zod';

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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapAITools } from '@/hooks/useConceptMapAITools';
import {
  extractConceptsSchema,
  suggestRelationsSchema,
  expandConceptSchema,
  askQuestionAboutSelectedNodeSchema,
} from '@/types/zodSchemas';

interface GenAIModalProps<T> {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: T) => void;
  isProcessing: boolean;
}

export const ExtractConceptsModal: React.FC<
  Omit<GenAIModalProps<z.infer<typeof extractConceptsSchema>>, 'isProcessing'> & {
    initialText?: string;
  }
> = ({ isOpen, onOpenChange, onSubmit, initialText }) => {
  const form = useForm<z.infer<typeof extractConceptsSchema>>({
    resolver: zodResolver(extractConceptsSchema),
    defaultValues: { textToExtract: initialText || '', extractionFocus: '' },
  });
  const { isProcessing: isProcessingExtraction } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      form.reset({ textToExtract: initialText || '', extractionFocus: '' });
    }
  }, [initialText, form, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-tutorial-id="extract-concepts-modal-content">
        <DialogHeader>
          <DialogTitle id="extract-concepts-title">AI 幫你抓重點 (Extract Concepts)</DialogTitle>
          <DialogDescription>
            把一段文字貼進來，或者直接使用選中節點的內容。AI
            會自動幫你找出裡面最重要的詞彙或短語，並顯示在「AI
            建議」面板中，方便你加到概念圖裡。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="textToExtract"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text to Extract Concepts From</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste your text here..."
                      {...field}
                      rows={10}
                      disabled={isProcessingExtraction}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="extractionFocus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Focus of Extraction (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 'key technologies', 'main actors', 'challenges'"
                      {...field}
                      disabled={isProcessingExtraction}
                    />
                  </FormControl>
                  <FormDescription>
                    Guide the AI on what kind of concepts to prioritize.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessingExtraction}
              >
                Cancel
              </Button>
              <Button
                data-tutorial-id="extract-concepts-submit-button"
                type="submit"
                disabled={
                  isProcessingExtraction || !form.watch('textToExtract')?.trim()
                }
              >
                {isProcessingExtraction && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isProcessingExtraction ? 'Extracting...' : 'Extract Concepts'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const SuggestRelationsModal: React.FC<
  Omit<GenAIModalProps<z.infer<typeof suggestRelationsSchema>>, 'isProcessing'> & {
    concepts: string[];
  }
> = ({ isOpen, onOpenChange, onSubmit, concepts }) => {
  const form = useForm<z.infer<typeof suggestRelationsSchema>>({
    resolver: zodResolver(suggestRelationsSchema),
    defaultValues: { concepts: concepts, customPrompt: '' },
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
              name="concepts"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concepts to Relate</FormLabel>
                  <FormControl>
                    <Input readOnly {...field} value={field.value.join(', ')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
  Omit<GenAIModalProps<z.infer<typeof expandConceptSchema>>, 'isProcessing'> & {
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

export const AskQuestionModal: React.FC<
  Omit<GenAIModalProps<z.infer<typeof askQuestionAboutSelectedNodeSchema>>, 'isProcessing'> & {
    nodeContextText?: string;
    nodeContextDetails?: string;
  }
> = ({
  isOpen,
  onOpenChange,
  onSubmit,
  nodeContextText,
  nodeContextDetails,
}) => {
  const form = useForm<z.infer<typeof askQuestionAboutSelectedNodeSchema>>({
    resolver: zodResolver(askQuestionAboutSelectedNodeSchema),
    defaultValues: { question: '', context: '' },
  });
  const { isProcessing: isProcessingQuestion } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      let context = `Node: ${nodeContextText || 'N/A'}`;
      if (nodeContextDetails) context += `\nDetails: ${nodeContextDetails}`;
      form.reset({ question: '', context });
    }
  }, [isOpen, nodeContextText, nodeContextDetails, form]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" /> Ask AI About
            This Node
          </DialogTitle>
          {nodeContextText && (
            <DialogDescription>
              You are asking about node:{' '}
              <strong className="text-foreground">{nodeContextText}</strong>
              <br />
              The AI's answer will appear as a toast notification. This action
              does not modify the map.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-4"
          >
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Question</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., What are the main applications of this concept?"
                      {...field}
                      rows={3}
                      disabled={isProcessingQuestion || !nodeContextText}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="context"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Context (Automatically populated)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      readOnly
                      className="bg-muted"
                      rows={4}
                      disabled={isProcessingQuestion}
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
                disabled={isProcessingQuestion}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isProcessingQuestion ||
                  !form.watch('question')?.trim() ||
                  !nodeContextText
                }
              >
                {isProcessingQuestion && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isProcessingQuestion ? (
                  'Asking...'
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" /> Ask Question
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
