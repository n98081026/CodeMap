
"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
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
import { Loader2, HelpCircle } from "lucide-react"; 

import { extractConcepts as aiExtractConcepts } from "@/ai/flows/extract-concepts";
import { suggestRelations as aiSuggestRelations } from "@/ai/flows/suggest-relations";
import { expandConcept as aiExpandConcept, type ExpandConceptInput, type ExpandConceptOutput } from "@/ai/flows/expand-concept"; 
import { askQuestionAboutNode as aiAskQuestionAboutNode, type AskQuestionAboutNodeOutput, type AskQuestionAboutNodeInput } from "@/ai/flows/ask-question-about-node";

interface ModalProps {
  onOpenChange: (isOpen: boolean) => void; 
}

interface ExtractConceptsModalProps extends ModalProps {
  onConceptsExtracted?: (concepts: string[]) => void;
  initialText?: string; 
}

export function ExtractConceptsModal({ onConceptsExtracted, initialText = "", onOpenChange }: ExtractConceptsModalProps) {
  const [text, setText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  const handleExtract = async () => {
    if (!text.trim()) {
      toast({ title: "Input Required", description: "Please enter some text to extract concepts.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiExtractConcepts({ text });
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
      if (!isOpen) setText(""); 
      onOpenChange(isOpen);
    }}> 
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extract Concepts with AI</DialogTitle>
          <DialogDescription>
            Paste text below, or use text from selected map nodes. The AI will identify and extract key concepts. These will appear in the AI Suggestions panel.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Paste your text here (e.g., a project description, requirements document, or a technical article)..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="resize-none"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExtract} disabled={isLoading || !text.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extract Concepts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SuggestRelationsModalProps extends ModalProps {
  onRelationsSuggested?: (relations: Array<{ source: string; target: string; relation: string }>) => void;
  initialConcepts?: string[];
}

export function SuggestRelationsModal({ onRelationsSuggested, initialConcepts = [], onOpenChange }: SuggestRelationsModalProps) {
  const [conceptsInput, setConceptsInput] = useState(initialConcepts.join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConceptsInput(initialConcepts.join(", "));
  }, [initialConcepts]);

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
      const result = await aiSuggestRelations({ concepts });
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
      if (!isOpen) setConceptsInput(""); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Suggest Relations with AI</DialogTitle>
          <DialogDescription>
            The AI will suggest relationships based on the provided concepts. These concepts may be derived from your current selection, a specific node, or an overview of your map.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="concepts-sr">Concepts for Relation Suggestion</Label>
          <Textarea 
            id="concepts-sr" 
            value={conceptsInput} 
            onChange={(e) => setConceptsInput(e.target.value)}
            placeholder="e.g., User Authentication, JWT, Database Security." 
            rows={3}
            className="resize-none"
            disabled={isLoading}
          />
           <p className="text-xs text-muted-foreground">Provide a comma-separated list of concepts. At least two are recommended for meaningful suggestions.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSuggest} disabled={isLoading || conceptsInput.trim().length === 0}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suggest Relations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ExpandConceptModalProps extends ModalProps {
  onConceptExpanded?: (output: ExpandConceptOutput) => Promise<void>; // Changed to Promise for async application
  initialConceptText?: string; 
  existingMapContext?: string[];
}

export function ExpandConceptModal({ onConceptExpanded, initialConceptText = "", existingMapContext = [], onOpenChange }: ExpandConceptModalProps) {
  const [concept, setConcept] = useState(initialConceptText);
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConcept(initialConceptText);
    setRefinementPrompt(""); 
  }, [initialConceptText]);

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
        await onConceptExpanded(result); // Await the application of changes
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expand Concept with AI</DialogTitle>
          <DialogDescription>
            Enter a concept. Optionally, add a refinement to guide the AI. New ideas will be added directly to the map.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="concept-ec">Concept to Expand</Label>
            <Input 
              id="concept-ec" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value)} 
              placeholder="e.g., Microservices, Machine Learning. Often based on a selected map node." 
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="refinement-prompt-ec">Refinement (Optional)</Label>
            <Textarea
              id="refinement-prompt-ec"
              value={refinementPrompt}
              onChange={(e) => setRefinementPrompt(e.target.value)}
              placeholder="e.g., 'focus on security aspects', 'generate ideas for children', 'consider scalability implications'"
              rows={3}
              className="resize-none"
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
          <Button onClick={handleExpand} disabled={isLoading || !concept.trim()}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Expand & Add to Map
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AskQuestionModalProps extends ModalProps {
  nodeContext: { text: string; details?: string; id: string; } | null;
  onQuestionAnswered: (question: string, nodeContext: { text: string; details?: string; id: string; }) => Promise<void>; // Now takes question and context
}

export function AskQuestionModal({ nodeContext, onQuestionAnswered, onOpenChange }: AskQuestionModalProps) {
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAskQuestion = useCallback(async () => {
    if (!question.trim() || !nodeContext) {
      toast({ title: "Input Required", description: "Please enter your question and ensure a node context is available.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      // onQuestionAnswered is now responsible for the AI call and setting the processing node ID
      await onQuestionAnswered(question, nodeContext); 
      onOpenChange(false); 
    } catch (error) {
      // Error toast is handled in onQuestionAnswered (via useConceptMapAITools)
    } finally {
      setIsLoading(false);
    }
  }, [question, nodeContext, onQuestionAnswered, onOpenChange, toast]);

  return (
    <Dialog open={true} onOpenChange={(isOpen) => {
      if (!isOpen) setQuestion(""); 
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <HelpCircle className="mr-2 h-5 w-5 text-primary" /> Ask AI About Node
          </DialogTitle>
          {nodeContext && (
            <DialogDescription>
              Node: <strong className="text-foreground">{nodeContext.text}</strong>
              {nodeContext.details && <span className="block text-xs text-muted-foreground mt-1">Details: {nodeContext.details}</span>}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="ai-question">Your Question:</Label>
          <Textarea
            id="ai-question"
            placeholder="e.g., What are the implications of this concept? Can you explain this in simpler terms?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isLoading || !nodeContext}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleAskQuestion} disabled={isLoading || !question.trim() || !nodeContext}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ask Question
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
