
"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  FilePlus, Save, Upload, Download, Undo, Redo, PlusSquare, Spline, 
  SearchCode, Lightbulb, Brain, Loader2, Settings2, BotMessageSquare 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  onNewMap: () => void;
  onSaveMap: () => void;
  isSaving: boolean;
  onExportMap: () => void;
  onTriggerImport: () => void; // New prop to trigger file input
  onExtractConcepts: () => void;
  onSuggestRelations: () => void;
  onExpandConcept: () => void;
  isViewOnlyMode?: boolean;
  onAddNodeToData?: () => void;
  onAddEdgeToData?: () => void;
  canAddEdge?: boolean;
  onToggleProperties: () => void;
  onToggleAiPanel: () => void;
  isPropertiesPanelOpen?: boolean;
  isAiPanelOpen?: boolean;
}

export const EditorToolbar = React.memo(function EditorToolbar({ 
  onNewMap,
  onSaveMap, 
  isSaving, 
  onExportMap,
  onTriggerImport, // Destructure new prop
  onExtractConcepts, 
  onSuggestRelations, 
  onExpandConcept,
  isViewOnlyMode,
  onAddNodeToData,
  onAddEdgeToData,
  canAddEdge,
  onToggleProperties,
  onToggleAiPanel,
  isPropertiesPanelOpen,
  isAiPanelOpen,
}: EditorToolbarProps) {
  const { toast } = useToast();

  const handlePlaceholderClick = React.useCallback((action: string) => {
    if (isViewOnlyMode) {
      toast({ title: "View Only Mode", description: `Cannot perform "${action}" in view-only mode.`, variant: "default" });
      return;
    }
    toast({
      title: "Action Clicked (Placeholder)",
      description: `${action} functionality is not yet implemented.`,
    });
  }, [isViewOnlyMode, toast]);

  const handleGenAIClick = React.useCallback((actionCallback: () => void, toolName: string) => {
    if (isViewOnlyMode) {
       toast({ title: "View Only Mode", description: `Cannot use ${toolName} in view-only mode.`, variant: "default" });
      return;
    }
    actionCallback();
  }, [isViewOnlyMode, toast]);


  return (
    <TooltipProvider delayDuration={100}>
      <div className="mb-2 flex h-14 items-center gap-1 rounded-lg border bg-card p-2 shadow-sm flex-wrap">
        {/* File Operations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onNewMap} >
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
          <TooltipContent>{isViewOnlyMode ? "Save Map (Disabled in View Mode)" : "Save Map"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            {/* Updated Import button to use onTriggerImport */}
            <Button variant="ghost" size="icon" onClick={onTriggerImport} disabled={isViewOnlyMode}>
              <Upload className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Import Map (Disabled)" : "Import Map (JSON)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onExportMap}>
              <Download className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export Map (JSON)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Edit Operations */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Undo")} disabled={isViewOnlyMode}>
              <Undo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Undo (Disabled)" : "Undo (Placeholder)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handlePlaceholderClick("Redo")} disabled={isViewOnlyMode}>
              <Redo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Redo (Disabled)" : "Redo (Placeholder)"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Insert Elements */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onAddNodeToData} disabled={isViewOnlyMode}>
              <PlusSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Add Node (Disabled)" : "Add Node"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onAddEdgeToData} disabled={isViewOnlyMode || !canAddEdge}>
              <Spline className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Add Edge (Disabled)" : !canAddEdge ? "Add Edge (Requires 2+ nodes)" : "Add Edge"}</TooltipContent>
        </Tooltip>
        
        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* GenAI Tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExtractConcepts, "Extract Concepts")} disabled={isViewOnlyMode}>
              <SearchCode className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Extract Concepts (AI) (Disabled)" : "Extract Concepts (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSuggestRelations, "Suggest Relations")} disabled={isViewOnlyMode}>
              <Lightbulb className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Suggest Relations (AI) (Disabled)" : "Suggest Relations (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExpandConcept, "Expand Concept")} disabled={isViewOnlyMode}>
              <Brain className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Expand Concept (AI) (Disabled)" : "Expand Concept (AI)"}</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* View/Panel Toggles */}
        <Separator orientation="vertical" className="mx-1 h-full" />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleProperties} 
              className={cn(isPropertiesPanelOpen && "bg-accent text-accent-foreground")}
            >
              <Settings2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isPropertiesPanelOpen ? "Hide Properties" : "Show Properties"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleAiPanel}
              className={cn(isAiPanelOpen && "bg-accent text-accent-foreground")}
            >
              <BotMessageSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isAiPanelOpen ? "Hide AI Suggestions / Map Info" : "Show AI Suggestions / Map Info"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});
EditorToolbar.displayName = "EditorToolbar";
    
