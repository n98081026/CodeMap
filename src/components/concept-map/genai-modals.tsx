
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"; // DialogTrigger removed as modals are controlled by parent
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

import { extractConcepts as aiExtractConcepts } from "@/ai/flows/extract-concepts";
import { suggestRelations as aiSuggestRelations } from "@/ai/flows/suggest-relations";
import { expandConcept as aiExpandConcept } from "@/ai/flows/expand-concept";

interface ModalProps {
  onOpenChange: (isOpen: boolean) => void; // To control visibility from parent
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
      toast({ title: "Concepts Extracted", description: `${result.concepts.length} concepts found.` });
      onConceptsExtracted?.(result.concepts);
      onOpenChange(false); // Close dialog
    } catch (error) {
      toast({ title: "Error Extracting Concepts", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Dialog open state is controlled by parent via isExtractConceptsModalOpen prop passed to ConceptMapEditorPage
    <Dialog open={true} onOpenChange={onOpenChange}> 
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Extract Concepts with AI</DialogTitle>
          <DialogDescription>
            Paste text below. The AI will identify and extract key concepts.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Textarea
            placeholder="Paste your text here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="resize-none"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExtract} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extract Concepts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SuggestRelationsModalProps extends ModalProps {
  onRelationsSuggested?: (relations: any[]) => void;
  initialConcepts?: string[];
}

export function SuggestRelationsModal({ onRelationsSuggested, initialConcepts = [], onOpenChange }: SuggestRelationsModalProps) {
  const [conceptsInput, setConceptsInput] = useState(initialConcepts.join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSuggest = async () => {
    const concepts = conceptsInput.split(",").map(c => c.trim()).filter(Boolean);
    if (concepts.length < 2) {
      toast({ title: "Input Required", description: "Please provide at least two concepts (comma-separated).", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiSuggestRelations({ concepts });
      toast({ title: "Relations Suggested", description: `${result.length} relations found.` });
      onRelationsSuggested?.(result);
      onOpenChange(false); // Close dialog
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
            Enter concepts (comma-separated) or use selected concepts from the map.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="concepts-sr">Concepts</Label>
          <Input 
            id="concepts-sr" 
            value={conceptsInput} 
            onChange={(e) => setConceptsInput(e.target.value)}
            placeholder="e.g., User Authentication, JWT, Database" 
          />
           <p className="text-xs text-muted-foreground">Provide a comma-separated list of concepts.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSuggest} disabled={isLoading}>
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
  initialContext?: string;
}

export function ExpandConceptModal({ onConceptExpanded, initialConcept = "", initialContext = "", onOpenChange }: ExpandConceptModalProps) {
  const [concept, setConcept] = useState(initialConcept);
  const [context, setContext] = useState(initialContext);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleExpand = async () => {
    if (!concept.trim()) {
      toast({ title: "Input Required", description: "Please enter a concept to expand.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await aiExpandConcept({ concept, context });
      toast({ title: "Concept Expanded", description: `${result.newConcepts.length} new ideas generated.` });
      onConceptExpanded?.(result.newConcepts);
      onOpenChange(false); // Close dialog
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
            Enter a concept and optional context. The AI will suggest related ideas.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div>
            <Label htmlFor="concept-ec">Concept</Label>
            <Input 
              id="concept-ec" 
              value={concept} 
              onChange={(e) => setConcept(e.target.value)} 
              placeholder="e.g., Microservices" 
            />
          </div>
          <div>
            <Label htmlFor="context-ec">Context (Optional)</Label>
            <Textarea 
              id="context-ec" 
              value={context} 
              onChange={(e) => setContext(e.target.value)} 
              placeholder="e.g., Related to e-commerce platform scalability"
              rows={3}
              className="resize-none"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExpand} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Expand Concept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
