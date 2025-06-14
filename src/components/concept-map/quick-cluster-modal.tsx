
// src/components/concept-map/quick-cluster-modal.tsx
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
import { Loader2, Sparkles } from "lucide-react";
import { generateQuickCluster, type GenerateQuickClusterOutput } from "@/ai/flows/generate-quick-cluster";

interface QuickClusterModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onClusterGenerated: (output: GenerateQuickClusterOutput) => void;
}

export function QuickClusterModal({ isOpen, onOpenChange, onClusterGenerated }: QuickClusterModalProps) {
  const [promptText, setPromptText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateCluster = async () => {
    if (!promptText.trim()) {
      toast({ title: "Prompt Required", description: "Please enter a topic or idea for the cluster.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateQuickCluster({ prompt: promptText });
      if (!result || !result.nodes || result.nodes.length === 0) {
        toast({ title: "AI: No Cluster Generated", description: "The AI could not generate a cluster for this prompt. Try rephrasing.", variant: "default" });
      } else {
        toast({ title: "AI: Cluster Ready", description: `Generated ${result.nodes.length} nodes and ${result.edges?.length || 0} relations.` });
        onClusterGenerated(result);
      }
      onOpenChange(false); 
      setPromptText(""); 
    } catch (error) {
      console.error("Error generating quick cluster:", error);
      toast({ title: "Error Generating Cluster", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogStateChange = (open: boolean) => {
    if (!open) {
        setPromptText(""); 
    }
    onOpenChange(open);
  };


  return (
    <Dialog open={isOpen} onOpenChange={handleDialogStateChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Quick AI Node Cluster
          </DialogTitle>
          <DialogDescription>
            Enter a topic, question, or idea. The AI will generate a small cluster of related concept nodes and suggest connections. These will be added directly to your map.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Label htmlFor="quick-cluster-prompt">Your Prompt:</Label>
          <Textarea
            id="quick-cluster-prompt"
            placeholder="e.g., 'Key benefits of using TypeScript', 'How to improve team collaboration?', 'Brainstorm ideas for a new mobile app'"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={4}
            className="resize-none"
            disabled={isLoading}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleDialogStateChange(false)} disabled={isLoading}>Cancel</Button>
          <Button onClick={handleGenerateCluster} disabled={isLoading || !promptText.trim()}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            {isLoading ? "Generating..." : "Generate Cluster"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

