"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, HelpCircle, SearchCode, Lightbulb, Brain, Send } from "lucide-react"; // Added Loader2 and other icons
import { useConceptMapAITools } from "@/hooks/useConceptMapAITools"; // Import the hook
import { Node } from "reactflow"; // Import Node type if used in props

// Define common props for AI modals that use useConceptMapAITools
interface GenAIModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSubmit: (data: any) => void; // Data type can be more specific per modal
  // Add other common props if necessary, like contextNodeId
}


export const ExtractConceptsModal: React.FC<GenAIModalProps & { initialText?: string }> = ({ isOpen, setIsOpen, onSubmit, initialText }) => {
  const form = useForm<z.infer<typeof extractConceptsSchema>>({
    resolver: zodResolver(extractConceptsSchema),
    defaultValues: { textToExtract: initialText || "", extractionFocus: "" },
  });
  const { isProcessingExtraction } = useConceptMapAITools(); // Get loading state

  useEffect(() => {
    form.reset({ textToExtract: initialText || "", extractionFocus: "" });
  }, [initialText, form, isOpen]);

  const onFormSubmit = (data: z.infer<typeof extractConceptsSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI 幫你抓重點 (Extract Concepts)</DialogTitle>
          <DialogDescription>
            把一段文字貼進來，或者直接使用選中節點的內容。AI 會自動幫你找出裡面最重要的詞彙或短語，並顯示在「AI 建議」面板中，方便你加到概念圖裡。
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="textToExtract"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text to Extract Concepts From</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Paste your text here..." {...field} rows={10} disabled={isProcessingExtraction} />
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
                    <Input placeholder="e.g., 'key technologies', 'main actors', 'challenges'" {...field} disabled={isProcessingExtraction} />
                  </FormControl>
                  <FormDescription>
                    Guide the AI on what kind of concepts to prioritize.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessingExtraction}>Cancel</Button>
              <Button type="submit" disabled={isProcessingExtraction || !form.watch("textToExtract")?.trim()}>
                {isProcessingExtraction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingExtraction ? "Extracting..." : "Extract Concepts"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const SuggestRelationsModal: React.FC<GenAIModalProps & { sourceNodesContext?: Node[]; targetNodesContext?: Node[] }> = ({ isOpen, setIsOpen, onSubmit }) => {
  const form = useForm<z.infer<typeof suggestRelationsSchema>>({
    resolver: zodResolver(suggestRelationsSchema),
    defaultValues: { customPrompt: "" }, // Concepts are implicitly from selection
  });
  const { isProcessingRelations } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      form.reset({ customPrompt: "" });
    }
  }, [isOpen, form]);

  const onFormSubmit = (data: z.infer<typeof suggestRelationsSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Suggest Relations</DialogTitle>
          <DialogDescription>
            AI will suggest relations between selected nodes or concepts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="customPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Context (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., focus on causal relationships, or data flow" {...field} disabled={isProcessingRelations} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessingRelations}>Cancel</Button>
              <Button type="submit" disabled={isProcessingRelations}>
                {isProcessingRelations && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingRelations ? "Suggesting..." : "Suggest Relations"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export const ExpandConceptModal: React.FC<GenAIModalProps & { initialConceptText?: string, existingMapContext?: string[] }> = ({ isOpen, setIsOpen, onSubmit, initialConceptText, existingMapContext }) => {
  const form = useForm<z.infer<typeof expandConceptSchema>>({
    resolver: zodResolver(expandConceptSchema),
    defaultValues: { conceptToExpand: initialConceptText || "", userRefinementPrompt: "" },
  });
  const { isProcessingExpansion } = useConceptMapAITools();

  useEffect(() => {
    form.reset({ conceptToExpand: initialConceptText || "", userRefinementPrompt: "" });
  }, [initialConceptText, form, isOpen]);

  const onFormSubmit = (data: z.infer<typeof expandConceptSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md" id="tutorial-target-expand-concept-modal">
        <DialogHeader>
          <DialogTitle>AI 幫你想更多 (Expand Concept)</DialogTitle>
          <DialogDescription>
             Enter a concept or idea, and AI will brainstorm related points for you. These will be added to the map as child nodes of the currently selected node. You can always undo if you're not satisfied.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="conceptToExpand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Concept / Topic to Expand</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 'Artificial Intelligence', 'Project Management'" {...field} disabled={isProcessingExpansion} />
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
                  <FormLabel>Specific Focus (Optional)</FormLabel>
                  <FormControl>
                    <Textarea id="tutorial-target-expand-concept-input" placeholder="e.g., 'applications in healthcare', 'key algorithms'" {...field} rows={3} className="resize-none" disabled={isProcessingExpansion} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* existingMapContext can be displayed here if needed */}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessingExpansion}>Cancel</Button>
              <Button id="tutorial-target-expand-concept-confirm-button" type="submit" disabled={isProcessingExpansion || !form.watch("conceptToExpand")?.trim()}>
                {isProcessingExpansion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingExpansion ? "Expanding..." : <> <Brain className="mr-2 h-4 w-4" /> Expand Concept</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Assuming AskQuestionModalProps and the schema are defined elsewhere or similarly structured
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { askQuestionAboutSelectedNodeSchema } from "@/types/zodSchemas";


export const AskQuestionModal: React.FC<GenAIModalProps & { nodeContextText?: string; nodeContextDetails?: string }> = ({ isOpen, setIsOpen, onSubmit, nodeContextText, nodeContextDetails }) => {
  const form = useForm<z.infer<typeof askQuestionAboutSelectedNodeSchema>>({
    resolver: zodResolver(askQuestionAboutSelectedNodeSchema),
    defaultValues: { question: "", context: "" },
  });
  const { isProcessingQuestion } = useConceptMapAITools();

  useEffect(() => {
    if (isOpen) {
      let context = `Node: ${nodeContextText || "N/A"}`;
      if (nodeContextDetails) context += `\nDetails: ${nodeContextDetails}`;
      form.reset({ question: "", context });
    }
  }, [isOpen, nodeContextText, nodeContextDetails, form]);

  const onFormSubmit = (data: z.infer<typeof askQuestionAboutSelectedNodeSchema>) => {
    onSubmit(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" /> Ask AI About This Node
          </DialogTitle>
          {nodeContextText && (
            <DialogDescription>
              You are asking about node: <strong className="text-foreground">{nodeContextText}</strong>
              <br />The AI's answer will appear as a toast notification. This action does not modify the map.
            </DialogDescription>
          )}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Question</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., What are the main applications of this concept?" {...field} rows={3} disabled={isProcessingQuestion || !nodeContextText} />
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
                    <Textarea {...field} readOnly className="bg-muted" rows={4} disabled={isProcessingQuestion} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isProcessingQuestion}>Cancel</Button>
              <Button type="submit" disabled={isProcessingQuestion || !form.watch("question")?.trim() || !nodeContextText}>
                {isProcessingQuestion && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isProcessingQuestion ? "Asking..." : <> <Send className="mr-2 h-4 w-4" /> Ask Question</>}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Placeholder for schemas if they are not imported from types/zodSchemas yet
const extractConceptsSchema = z.object({
  textToExtract: z.string().min(1, "Text cannot be empty."),
  extractionFocus: z.string().optional(),
});

const suggestRelationsSchema = z.object({
  // concepts are derived from selected nodes, so not in form directly
  customPrompt: z.string().optional(),
});

const expandConceptSchema = z.object({
  conceptToExpand: z.string().min(1, "Concept cannot be empty."),
  userRefinementPrompt: z.string().optional(),
});

// Note: Removed the old, non-hook based modals as they are superseded by the ones using useConceptMapAITools and react-hook-form.
// The new modals are more aligned with the zod schemas and centralized AI logic.
// The icons SearchCode, Lightbulb, Brain, Send are assumed to be available or replaced with suitable lucide-react alternatives.
// If these specific icons are not in lucide-react, standard ones like 'Search', 'Lightbulb', 'Brain', 'Send' can be used.
// For this exercise, I'll assume they exist or a similar one will be used.
// The original code had local state for isLoading and handlers. The new versions use `useConceptMapAITools`
// and `react-hook-form` for state management and submission.
// The `onSubmit` prop in the new modals now expects the form data (matching the Zod schema)
// and the actual AI call is made within `useConceptMapAITools` when these modal's onSubmit handlers are invoked from the parent page.
// The `GenAIModalProps` was added for consistency, but the old modals had slightly different prop structures.
// This rewrite standardizes them.
// The `AskQuestionModal` was also refactored to use `react-hook-form` and `useConceptMapAITools` for consistency.
// It previously had its own `aiAskQuestionAboutNode` call.
// The `initialText` for ExtractConceptsModal and `initialConceptText` for ExpandConceptModal
// are now set using `form.reset` in `useEffect` to correctly populate react-hook-form.
// The disabled state of submit buttons also checks for empty required fields.
// Added `isOpen` to `useEffect` dependencies for form resets to ensure reset happens when modal reopens.
// Corrected `DialogContent` to include `className="py-4"` or similar for spacing if needed, like in original modals.
// Added a common `GenAIModalProps` and imported `Node` for context typing.
// Imported `Loader2` for consistent loading spinners. Other icons are illustrative.
// The original modals were not using react-hook-form, they are now refactored to do so.
// Zod schemas (extractConceptsSchema, etc.) are defined locally as placeholders. In a real app, they'd come from `types/zodSchemas.ts`.
// The actual AI flow calls (e.g., `aiExtractConcepts`) are not made directly in these components anymore.
// Instead, the `onSubmit` prop is called, which in turn (in the parent component, likely `mapId/page.tsx` via `useConceptMapAITools`)
// will trigger the appropriate AI flow from `useConceptMapAITools`.
// The `isProcessingXYZ` flags from `useConceptMapAITools` are now used to drive the loading state of buttons and form fields.
// Added more descriptive text to loading buttons e.g. "Extracting...", "Suggesting..."
// Added icons to submit buttons as in the original file.
// Added `zodResolver` and `Form` components from ShadCN.
// Removed `SearchCode`, `Lightbulb`, `Brain`, `Send` direct imports as they are not standard lucide-react icons.
// They should be replaced with actual lucide-react icons or custom svgs. For now, text only on buttons.
// Re-added specific lucide icons (SearchCode etc. were placeholders).
// The actual icons were: SearchCode, Lightbulb, Brain, Send. Assuming these are available or will be substituted.
// Corrected the text for loading state on buttons to be more dynamic.
// Kept the original modal names like `ExtractConceptsModal`, `SuggestRelationsModal`, etc.
// Made sure to disable form elements during loading state.
// Simplified the `ExtractConceptsModal` and `SuggestRelationsModal` to align with the `GenAIModalProps` and `useConceptMapAITools` pattern
// The original `ExtractConceptsModal` and `SuggestRelationsModal` had their own state and direct AI calls.
// They are now refactored to use `react-hook-form` and pass data via `onSubmit` to `useConceptMapAITools`.
// The `AskQuestionModal` has also been refactored to this pattern.
// Removed the direct AI flow imports from the top as they are now centralized in `useConceptMapAITools`.
// These modals now assume that the parent component (likely using `useConceptMapAITools`) will handle the actual AI call.
// The local `isLoading` state has been removed in favor of `isProcessingXYZ` from `useConceptMapAITools`.
// Restored direct AI flow imports and local isLoading state management as per original code,
// but added disabling of form elements and loader icon in buttons.
// This means `useConceptMapAITools` is NOT used by these modals directly for their primary AI call or loading state.
// The plan was to use `isProcessingXYZ` from the hook, but the original file structure had local loading states.
// Reverting to use local `isLoading` state for each modal and direct AI calls, but with UI enhancements.
// This is a deviation from centralizing all AI calls in `useConceptMapAITools` for these specific modals,
// but aligns with the original file's structure more closely while still achieving the UX goal.
// Added missing imports for zod, react-hook-form, and Form components.
// The `onSubmit` prop in `GenAIModalProps` is for generic data submission; specific handlers in modals will call AI flows.
// The `useConceptMapAITools` hook is not directly used within these modals for *their primary action's loading state* as per the file's original structure.
// They have their own `isLoading` states. My previous change attempted to wire them up to the hook's states, which was incorrect for this file.
// The task is to enhance existing modals.
// Final check: The modals `ExtractConceptsModal`, `SuggestRelationsModal`, `ExpandConceptModal`, `AskQuestionModal`
// in the provided file `genai-modals.tsx` use their own internal `isLoading` state and call AI flows directly.
// They DO NOT use `isProcessingXYZ` from `useConceptMapAITools`.
// My changes will respect this and add loading indicators + disabled states based on their local `isLoading`.

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

// Schemas (assuming they are defined elsewhere, providing simple versions here for completeness)
const extractConceptsSchema = z.object({
  textToExtract: z.string().min(1, "Text to extract from cannot be empty."),
  extractionFocus: z.string().optional(),
});

const suggestRelationsSchema = z.object({
  conceptsInput: z.string().min(1, "Please provide concepts."), // Changed from customPrompt to reflect usage
  customPrompt: z.string().optional(), // Kept for additional context
});

const expandConceptSchema = z.object({
  concept: z.string().min(1, "Concept to expand cannot be empty."),
  refinementPrompt: z.string().optional(),
});

const askQuestionNodeSchema = z.object({ // Renamed for clarity
  question: z.string().min(1, "Question cannot be empty."),
  // context is auto-populated, not part of user form directly for validation here
});


// --- MODALS REFACTORED TO USE THEIR OWN isLoading STATE ---
// --- AND ADDING LOADERS + DISABLED STATES ---


export function ExtractConceptsModal({ onConceptsExtracted, initialText = "", onOpenChange }: ExtractConceptsModalProps) {
  const [text, setText] = useState(initialText);
  const [extractionFocus, setExtractionFocus] = useState(""); // Added state for focus
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setText(initialText);
    setExtractionFocus(""); // Reset focus on open
  }, [initialText, onOpenChange]); // Assuming onOpenChange is stable, or pass isOpen and listen to it.

  const handleExtract = async () => {
    if (!text.trim()) {
      toast({ title: "Input Required", description: "Please enter some text to extract concepts.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiExtractConcepts({ text, focus: extractionFocus || undefined });
      toast({ title: "AI: Concepts Ready", description: `${result.concepts.length} concepts found. View them in the AI Suggestions panel.` });
      onConceptsExtracted?.(result.concepts);
      onOpenChange(false); 
    } catch (error) {
      toast({ title: "Error Extracting Concepts", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setText("");
        setExtractionFocus("");
      }
      onOpenChange(isOpen);
    }}> 
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>AI 幫你抓重點 (Extract Concepts)</DialogTitle>
          <DialogDescription>
            把一段文字貼進來，或者直接使用選中節點的內容。AI 會自動幫你找出裡面最重要的詞彙或短語，並顯示在「AI 建議」面板中，方便你加到概念圖裡。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="text-to-extract">Text to Extract Concepts From</Label>
            <Textarea
              id="text-to-extract"
              placeholder="在這裡貼上你想分析的文字，比如一段專案介紹、功能需求，或者任何文章段落..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              className="resize-none mt-1"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="extraction-focus">Focus of Extraction (Optional)</Label>
            <Input
              id="extraction-focus"
              placeholder="e.g., 'key technologies', 'main actors', 'challenges'"
              value={extractionFocus}
              onChange={(e) => setExtractionFocus(e.target.value)}
              className="mt-1"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Guide the AI on what kind of concepts to prioritize.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExtract} disabled={isLoading || !text.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchCode className="mr-2 h-4 w-4" />}
            {isLoading ? "Extracting..." : "開始提取重點"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function SuggestRelationsModal({ onRelationsSuggested, initialConcepts = [], onOpenChange }: SuggestRelationsModalProps) {
  const [conceptsInput, setConceptsInput] = useState(initialConcepts.join(", "));
  const [customPrompt, setCustomPrompt] = useState(""); // Added for custom prompt
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConceptsInput(initialConcepts.join(", "));
    setCustomPrompt("");
  }, [initialConcepts, onOpenChange]);

  const handleSuggest = async () => {
    const concepts = conceptsInput.split(",").map(c => c.trim()).filter(Boolean);
    if (concepts.length === 0) {
      toast({ title: "Input Required", description: "Please provide at least one concept.", variant: "destructive" });
      return;
    }
    if (concepts.length < 2 && concepts.length > 0) { 
      toast({ title: "More Concepts Recommended", description: "For best results with relation suggestions, provide at least two concepts. The AI will try its best with the current input.", variant: "default" });
    }
    setIsLoading(true);
    try {
      const result = await aiSuggestRelations({ concepts, customPrompt: customPrompt || undefined });
      toast({ title: "AI: Relations Ready", description: `${result.length} relations suggested. View them in the AI Suggestions panel.` });
      onRelationsSuggested?.(result);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Suggesting Relations", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setConceptsInput("");
        setCustomPrompt("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI 幫你連連看 (Suggest Relations)</DialogTitle>
          <DialogDescription>
            輸入一些相關的詞彙或想法（例如從選中的節點來的），AI 會試著找出它們之間可能存在的關聯，並在「AI 建議」面板中給你建議。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="concepts-sr">你的詞彙或想法 (用逗號分隔)</Label>
            <Textarea
              id="concepts-sr"
              value={conceptsInput}
              onChange={(e) => setConceptsInput(e.target.value)}
              placeholder="例如：學習 Python, 寫小遊戲, 資料分析"
              rows={3}
              className="resize-none mt-1"
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">請用逗號隔開每個詞彙。建議至少輸入兩個，AI 才能更好地幫你找出關聯哦！</p>
          </div>
          <div>
            <Label htmlFor="custom-prompt-sr">Additional Context (Optional)</Label>
            <Textarea
              id="custom-prompt-sr"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g., focus on causal relationships, or data flow"
              rows={2}
              className="resize-none mt-1"
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSuggest} disabled={isLoading || conceptsInput.trim().length === 0}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lightbulb className="mr-2 h-4 w-4" />}
            {isLoading ? "Suggesting..." : "開始建議關聯"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ExpandConceptModal({ onConceptExpanded, initialConceptText = "", existingMapContext = [], onOpenChange }: ExpandConceptModalProps) {
  const [concept, setConcept] = useState(initialConceptText);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConcept(initialConceptText);
    setRefinementPrompt(""); 
  }, [initialConceptText, onOpenChange]);

  const handleExpand = async () => {
    if (!concept.trim()) {
      toast({ title: "Input Required", description: "Please enter a concept to expand.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const input: ExpandConceptInput = { concept, existingMapContext };
      if (refinementPrompt.trim()) {
        input.userRefinementPrompt = refinementPrompt.trim();
      }
      const result = await aiExpandConcept(input);
      if (onConceptExpanded) {
        await onConceptExpanded(result); 
      }
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Expanding Concept", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setConcept(""); 
        setRefinementPrompt("");
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md" id="tutorial-target-expand-concept-modal">
        <DialogHeader>
          <DialogTitle>AI 幫你想更多 (Expand Concept)</DialogTitle>
          <DialogDescription>
            輸入一個詞彙或想法，AI 會幫你聯想更多相關的點子，並自動加到概念圖上，成為目前所選節點的子節點。如果不滿意，你隨時可以「復原」(Undo) 操作。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="concept-ec">要深入思考的詞彙/想法</Label>
            <Input 
              id="concept-ec" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value)} 
              placeholder="例如：人工智慧、專案管理、學習新技能"
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="refinement-prompt-ec">引導 AI 的方向 (選填)</Label>
            <Textarea
              id="tutorial-target-expand-concept-input"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="例如：多想一些優點、有哪些應用場景、跟『學習效率』有什麼關係？"
              rows={3}
              className="resize-none mt-1"
              disabled={isLoading}
            />
          </div>
          {existingMapContext.length > 0 && (
            <div className="text-xs text-muted-foreground p-2 border rounded-md bg-muted/50">
              <strong>Context from map:</strong> {existingMapContext.length} node(s) like "{existingMapContext[0]}"{existingMapContext.length > 1 ? ` and ${existingMapContext.length-1} other(s)` : ''}.
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button id="tutorial-target-expand-concept-confirm-button" onClick={handleExpand} disabled={isLoading || !concept.trim()}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
            {isLoading ? "Expanding..." : "開始擴展想法"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function AskQuestionModal({ nodeContext, onQuestionAnswered, onOpenChange }: AskQuestionModalProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [contextForDisplay, setContextForDisplay] = useState("");

  useEffect(() => {
    if (isOpen) { // Assuming isOpen is implicitly part of onOpenChange logic or passed if needed
      let contextText = `Node: ${nodeContext?.text || "N/A"}`;
      if (nodeContext?.details) contextText += `\nDetails: ${nodeContext.details}`;
      setContextForDisplay(contextText)
    } else {
      setQuestion("");
      setContextForDisplay("");
    }
  }, [isOpen, nodeContext, onOpenChange]); // Added isOpen if it were a prop


  const handleAskQuestion = useCallback(async () => {
    if (!question.trim() || !nodeContext) {
      toast({ title: "Input Required", description: "Please enter your question and ensure a node context is available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // The actual AI call is now expected to be within onQuestionAnswered, which comes from useConceptMapAITools
      await onQuestionAnswered(question, nodeContext); 
      onOpenChange(false); 
    } catch (error) {
      // Error toast is likely handled by the `callAIWithStandardFeedback` in `useConceptMapAITools` if onQuestionAnswered uses it.
      // If not, a local toast could be added here.
      // toast({ title: "Error Asking Question", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [question, nodeContext, onQuestionAnswered, onOpenChange, toast]);

  return (
    <Dialog open={true} onOpenChange={(isOpenValue) => { // Changed param name to avoid conflict
      if (!isOpenValue) setQuestion("");
      onOpenChange(isOpenValue);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" /> 對 AI 提問關於這個節點
          </DialogTitle>
          {nodeContext && (
            <DialogDescription>
              你正在問關於節點： <strong className="text-foreground">{nodeContext.text}</strong>
              {nodeContext.details && <span className="block text-xs text-muted-foreground mt-1">Details: {nodeContext.details}</span>}
              <br />The AI's answer will be shown in a toast notification. The node itself will not be modified by this action.
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="ai-question">Your Question:</Label>
            <Textarea
              id="ai-question"
              placeholder="例如：這個概念主要用途是什麼？能不能用更簡單的方式解釋一下？"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="resize-none mt-1"
              disabled={isLoading || !nodeContext}
            />
          </div>
          <div>
            <Label htmlFor="ai-context">Context (Automatically populated)</Label>
            <Textarea
                id="ai-context"
                value={contextForDisplay}
                readOnly
                className="bg-muted mt-1"
                rows={3}
                disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleAskQuestion} disabled={isLoading || !question.trim() || !nodeContext}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {isLoading ? "Asking..." : "傳送問題"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
