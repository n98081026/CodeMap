
"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";

import { extractConcepts as aiExtractConcepts } from "@/ai/flows/extract-concepts";
import { suggestRelations as aiSuggestRelations } from "@/ai/flows/suggest-relations";
import { expandConcept as aiExpandConcept } from "@/ai/flows/expand-concept";

interface ModalProps {
  onOpenChange: (isOpen: boolean) => void; 
}

interface ExtractConceptsModalProps extends ModalProps {
  onConceptsExtracted?: (concepts: string[]) => void;
}

export function ExtractConceptsModal({ onConceptsExtracted, onOpenChange }: ExtractConceptsModalProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

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
    <Dialog open={true} onOpenChange={onOpenChange}> 
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extract Concepts with AI</DialogTitle>
          <DialogDescription>
            Paste text below. The AI will identify and extract key concepts. These will appear in the AI Suggestions panel.
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
    if (concepts.length < 2 && concepts.length > 0) { // If only one concept, it's okay, but more are better
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
    <Dialog open={true} onOpenChange={onOpenChange}>
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
  onConceptExpanded?: (newConcepts: string[]) => void;
  initialConcept?: string;
  existingMapContext?: string[];
}

export function ExpandConceptModal({ onConceptExpanded, initialConcept = "", existingMapContext = [], onOpenChange }: ExpandConceptModalProps) {
  const [concept, setConcept] = useState(initialConcept);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setConcept(initialConcept);
  }, [initialConcept]);

  const handleExpand = async () => {
    if (!concept.trim()) {
      toast({ title: "Input Required", description: "Please enter a concept to expand.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiExpandConcept({ concept, existingMapContext });
      toast({ title: "AI: Expansion Ready", description: `${result.newConcepts.length} new ideas generated. View them in the AI Suggestions panel.` });
      onConceptExpanded?.(result.newConcepts);
      onOpenChange(false);
    } catch (error) {
      toast({ title: "Error Expanding Concept", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Expand Concept with AI</DialogTitle>
          <DialogDescription>
            Enter a concept. The AI will suggest related ideas, considering existing map context if available.
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
            Expand Concept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

