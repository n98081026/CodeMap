
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Sparkles, ArrowRightLeft } from 'lucide-react';
import type { NodeContentToRewrite } from '@/hooks/useConceptMapAITools'; 
// Import directly from the flow file, changing to relative path
import { 
  rewriteNodeContent as aiRewriteNodeContent, 
  type RewriteNodeContentOutput 
} from '../../ai/flows/rewrite-node-content-flow'; 
import useConceptMapStore from '@/stores/concept-map-store'; 


interface RewriteNodeContentModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  nodeContent: NodeContentToRewrite | null;
  onRewriteConfirm: (nodeId: string, newText: string, newDetails?: string, tone?: string) => Promise<void>; 
}

type ToneOption = "formal" | "casual" | "concise" | "elaborate" | "humorous" | "professional" | "simple";

const toneOptions: { value: ToneOption; label: string }[] = [
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "concise", label: "Concise" },
  { value: "elaborate", label: "Elaborate" },
  { value: "humorous", label: "Humorous" },
  { value: "professional", label: "Professional" },
  { value: "simple", label: "Simple" },
];

export function RewriteNodeContentModal({
  isOpen,
  onOpenChange,
  nodeContent,
  onRewriteConfirm,
}: RewriteNodeContentModalProps) {
  const { toast } = useToast();
  const { setAiProcessingNodeId } = useConceptMapStore(); 
  const [selectedTone, setSelectedTone] = useState<ToneOption>("concise");
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [previewDetails, setPreviewDetails] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && nodeContent) {
      setPreviewText(null); 
      setPreviewDetails(null);
      setSelectedTone("concise");
    }
  }, [isOpen, nodeContent]);

  const handleGeneratePreview = useCallback(async () => {
    if (!nodeContent) return;
    setIsLoading(true);
    setAiProcessingNodeId(nodeContent.id); 
    setPreviewText(null);
    setPreviewDetails(null);
    try {
      const result: RewriteNodeContentOutput = await aiRewriteNodeContent({
        currentText: nodeContent.text,
        currentDetails: nodeContent.details,
        targetTone: selectedTone,
      });
      setPreviewText(result.rewrittenText);
      setPreviewDetails(result.rewrittenDetails || null);
      toast({ title: "Preview Ready", description: "AI rewrite preview generated." });
    } catch (error) {
      toast({ title: "Error Generating Preview", description: (error as Error).message, variant: "destructive" });
      setAiProcessingNodeId(null); 
    } finally {
      setIsLoading(false);
    }
  }, [nodeContent, selectedTone, toast, setAiProcessingNodeId]);

  const handleApplyRewrite = async () => {
    if (nodeContent && (previewText !== null || previewDetails !== null)) {
      setIsLoading(true); 
      if(useConceptMapStore.getState().aiProcessingNodeId !== nodeContent.id) {
        setAiProcessingNodeId(nodeContent.id);
      }
      try {
        await onRewriteConfirm(nodeContent.id, previewText ?? nodeContent.text, previewDetails ?? nodeContent.details, selectedTone);
        onOpenChange(false);
      } catch (error) {
        toast({ title: "Error Applying Rewrite", description: (error as Error).message, variant: "destructive"});
      } finally {
        setIsLoading(false);
        setAiProcessingNodeId(null); 
      }
    } else {
      toast({ title: "No Preview Available", description: "Please generate a preview before applying.", variant: "default" });
    }
  };
  
  const handleCloseDialog = (openState: boolean) => {
    if (!openState) { 
      if (nodeContent && useConceptMapStore.getState().aiProcessingNodeId === nodeContent.id && !isLoading) {
        setAiProcessingNodeId(null);
      }
    }
    onOpenChange(openState);
  }

  if (!nodeContent) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseDialog}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" />Rewrite Node Content (AI)</DialogTitle>
          <DialogDescription>
            Refine the text and details of the node "{nodeContent.text}" using AI. Choose a tone, generate a preview, and then apply the changes to update the node.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[60vh] overflow-y-auto">
          <div className="space-y-3">
            <h3 className="font-semibold text-md">Original Content</h3>
            <div>
              <Label htmlFor="original-text">Text:</Label>
              <Textarea id="original-text" value={nodeContent.text} readOnly rows={3} className="bg-muted/50"/>
            </div>
            {nodeContent.details && (
              <div>
                <Label htmlFor="original-details">Details:</Label>
                <Textarea id="original-details" value={nodeContent.details} readOnly rows={5} className="bg-muted/50"/>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
                <h3 className="font-semibold text-md">AI Rewritten Preview</h3>
                <Select value={selectedTone} onValueChange={(value) => setSelectedTone(value as ToneOption)} disabled={isLoading}>
                    <SelectTrigger className="w-[180px] h-9">
                        <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                        {toneOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
              <Label htmlFor="preview-text">Rewritten Text:</Label>
              <Textarea id="preview-text" value={previewText ?? ""} readOnly={!previewText} placeholder="Generate preview to see rewritten text..." rows={3} className={previewText === null ? "italic bg-muted/30" : "bg-background"}/>
            </div>
            <div>
              <Label htmlFor="preview-details">Rewritten Details:</Label>
              <Textarea id="preview-details" value={previewDetails ?? ""} readOnly={!previewDetails} placeholder="Generate preview to see rewritten details..." rows={5} className={previewDetails === null ? "italic bg-muted/30" : "bg-background"}/>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 pt-4 border-t">
          <Button variant="outline" onClick={() => handleCloseDialog(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleGeneratePreview} disabled={isLoading} variant="secondary">
            {isLoading && previewText === null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {isLoading && previewText === null ? 'Generating...' : 'Generate Preview'}
          </Button>
          <Button onClick={handleApplyRewrite} disabled={isLoading || previewText === null}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            Apply Rewrite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
