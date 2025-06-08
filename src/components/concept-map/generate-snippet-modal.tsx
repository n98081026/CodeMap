
// src/components/concept-map/generate-snippet-modal.tsx
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
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TextSearch, Wand2 } from "lucide-react";
import { generateMapSnippetFromText, type GenerateMapSnippetOutput } from "@/ai/flows/generate-map-snippet-from-text";

interface GenerateSnippetModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSnippetGenerated: (output: GenerateMapSnippetOutput) => void;
}

export function GenerateSnippetModal({ isOpen, onOpenChange, onSnippetGenerated }: GenerateSnippetModalProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateSnippet = async () => {
    if (inputText.trim().length < 50) { 
      toast({ title: "Input Too Short", description: "Please provide more text (at least 50 characters) to generate a meaningful snippet.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateMapSnippetFromText({ text: inputText });
      if (!result || !result.nodes || result.nodes.length === 0) {
        toast({ title: "AI: No Snippet Generated", description: "The AI could not generate a map snippet for this text. Try rephrasing or providing different content.", variant: "default" });
      } else {
        toast({ title: "AI: Map Snippet Ready", description: `Generated ${result.nodes.length} nodes and ${result.edges?.length || 0} relations.` });
        onSnippetGenerated(result);
      }
      onOpenChange(false); 
      setInputText(""); 
    } catch (error) {
      console.error("Error generating map snippet:", error);
      toast({ title: "Error Generating Snippet", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
        setInputText(""); 
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TextSearch className="mr-2 h-5 w-5 text-primary" />
            Generate Map Snippet from Text
          </DialogTitle>
          <DialogDescription>
            Paste a block of text (e.g., meeting notes, documentation). The AI will analyze it and generate a small concept map snippet, which will be added directly to your map.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="generate-snippet-text">Your Text:</Label>
          <Textarea
            id="generate-snippet-text"
            placeholder="Paste your text here (min. 50 characters)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={10}
            className="resize-none"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogStateChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleGenerateSnippet} disabled={isLoading || inputText.trim().length < 50}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Generating..." : "Generate Snippet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


