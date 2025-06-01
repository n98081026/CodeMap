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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Import AI functions (assuming they are server actions or callable client-side)
import { extractConcepts as aiExtractConcepts } from "@/ai/flows/extract-concepts";
import { suggestRelations as aiSuggestRelations } from "@/ai/flows/suggest-relations";
import { expandConcept as aiExpandConcept } from "@/ai/flows/expand-concept";

interface GenAIModalsProps {
  triggerComponent?: React.ReactNode; // For custom triggers outside toolbar
  onConceptsExtracted?: (concepts: string[]) => void;
  onRelationsSuggested?: (relations: { source: string; target: string; relation: string }[]) => void;
  onConceptExpanded?: (newConcepts: string[]) => void;
}

// Extract Concepts Modal
export function ExtractConceptsModal({ onConceptsExtracted }: { onConceptsExtracted?: (concepts: string[]) => void }) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Error Extracting Concepts", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* The trigger is expected to be provided by EditorToolbar */}
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
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExtract} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Extract Concepts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// Suggest Relations Modal (Simplified - assumes concepts are manually entered or pre-filled)
export function SuggestRelationsModal({ onRelationsSuggested, initialConcepts = [] }: { onRelationsSuggested?: (relations: any[]) => void, initialConcepts?: string[] }) {
  const [conceptsInput, setConceptsInput] = useState(initialConcepts.join(", "));
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Error Suggesting Relations", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleSuggest} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suggest Relations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Expand Concept Modal
export function ExpandConceptModal({ onConceptExpanded, initialConcept = "", initialContext = "" }: { onConceptExpanded?: (newConcepts: string[]) => void, initialConcept?: string, initialContext?: string }) {
  const [concept, setConcept] = useState(initialConcept);
  const [context, setContext] = useState(initialContext);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    } catch (error) {
      toast({ title: "Error Expanding Concept", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
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
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleExpand} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Expand Concept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// This is a wrapper or state manager if you want to open modals from the toolbar
export function GenAIToolsManager({
  onConceptsExtracted,
  onRelationsSuggested,
  onConceptExpanded,
}: GenAIModalsProps) {
  // This component would typically manage the open state of the modals
  // For simplicity, the modals manage their own open state if triggered directly.
  // If EditorToolbar needs to control them, this component would need state and props to pass to modals.
  return null; // For now, modals are self-contained for open state management
}

// Helper to open modals from toolbar (if modals don't handle DialogTrigger themselves)
// This is one way to do it. Another is to have DialogTrigger inside EditorToolbar.
// For this example, we assume the Modals have their own state and are mounted,
// and the toolbar buttons will somehow trigger their internal 'setIsOpen(true)'.
// A more robust way would be to use React Context or Zustand for modal state.
// The current EditorToolbar directly calls functions which can then open the modals if they are structured to do so.
// The GenAI modals above are structured to be controlled by their `isOpen` state, 
// which can be set by a parent component, or they can have their own Triggers.
// For simplicity, let's assume the functions passed to EditorToolbar (onExtractConcepts, etc.)
// will be responsible for setting the respective modal's isOpen state to true.
// This requires these functions to be defined in the parent component of EditorToolbar and the modals.
