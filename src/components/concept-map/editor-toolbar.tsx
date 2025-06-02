
"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FilePlus, Save, Upload, Download, Undo, Redo, PlusSquare, Spline, SearchCode, Lightbulb, Brain, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditorToolbarProps {
  onSaveMap: () => void;
  isSaving: boolean;
  onExtractConcepts: () => void;
  onSuggestRelations: () => void;
  onExpandConcept: () => void;
  isViewOnlyMode?: boolean;
}


export function EditorToolbar({ 
  onSaveMap, 
  isSaving, 
  onExtractConcepts, 
  onSuggestRelations, 
  onExpandConcept,
  isViewOnlyMode 
}: EditorToolbarProps) {
  const { toast } = useToast();

  const handlePlaceholderClick = (action: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: "This action is disabled in view-only mode.", variant: "default" });
      return;
    }
    toast({
      title: "Action Clicked (Placeholder)",
      description: `${action} functionality is not yet implemented.`,
    });
  };

  const handleGenAIClick = (actionCallback: () => void, toolName: string) => {
    if (isViewOnlyMode) {
       toast({ title: "View Only Mode", description: `Cannot use ${toolName} in view-only mode.`, variant: "default" });
      return;
    }
    actionCallback();
  }


  return (
    <TooltipProvider>
      <div className="mb-4 flex h-14 items-center gap-1 rounded-lg border bg-card p-2 shadow-sm">
        {/* File Operations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("New Map")} disabled={isViewOnlyMode}>
              <FilePlus className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Map</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onSaveMap} disabled={isSaving || isViewOnlyMode}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Save Map</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Import Map")} disabled={isViewOnlyMode}>
              <Upload className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Export Map")} disabled={isViewOnlyMode}>
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Edit Operations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Undo")} disabled={isViewOnlyMode}>
              <Undo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Redo")} disabled={isViewOnlyMode}>
              <Redo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redo</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Insert Elements */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Add Node")} disabled={isViewOnlyMode}>
              <PlusSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Node</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Add Edge")} disabled={isViewOnlyMode}>
              <Spline className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Add Edge</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* GenAI Tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExtractConcepts, "Extract Concepts")} disabled={isViewOnlyMode}>
              <SearchCode className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Extract Concepts (AI)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSuggestRelations, "Suggest Relations")} disabled={isViewOnlyMode}>
              <Lightbulb className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Suggest Relations (AI)</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExpandConcept, "Expand Concept")} disabled={isViewOnlyMode}>
              <Brain className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Expand Concept (AI)</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* Zoom/Pan could go here or be part of canvas */}
      </div>
    </TooltipProvider>
  );
}
