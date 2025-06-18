"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import React from 'react'; // Ensure React is imported for React.FC
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilePlus, Save, Upload, Download, Undo, Redo, PlusSquare, Spline, Shuffle, LayoutPanelLeft, BoxSelect, // Added BoxSelect
  SearchCode, Lightbulb, Brain, Loader2, Settings2, BotMessageSquare, Sparkles, TextSearch, ListCollapse, ScrollText, type LucideIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import useConceptMapStore from '@/stores/concept-map-store';

interface EditorToolbarProps {
  onNewMap: () => void;
  onSaveMap: () => void;
  isSaving: boolean;
  onExportMap: () => void;
  onTriggerImport: () => void;
  onExtractConcepts: () => void;
  onSuggestRelations: () => void;
  onExpandConcept: () => void;
  onQuickCluster: () => void;
  onGenerateSnippetFromText: () => void;
  onSummarizeSelectedNodes: () => void;
  isViewOnlyMode?: boolean;
  onAddNodeToData?: () => void;
  onAddEdgeToData?: () => void;
  canAddEdge?: boolean;
  onToggleProperties: () => void;
  onToggleAiPanel: () => void;
  onToggleDebugLogViewer: () => void; 
  isPropertiesPanelOpen?: boolean;
  isAiPanelOpen?: boolean;
  isDebugLogViewerOpen?: boolean; 
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedNodeId: string | null;
  numMultiSelectedNodes: number;
  onAutoLayout?: () => void; // Made optional
  arrangeActions?: ArrangeAction[];
  onSuggestAISemanticGroup?: () => void; // New prop
}

export interface ArrangeAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  action: () => void;
  isSeparator?: boolean;
}

export const EditorToolbar = React.memo(function EditorToolbar({
  onNewMap,
  onSaveMap,
  isSaving,
  onExportMap,
  onTriggerImport,
  onExtractConcepts,
  onSuggestRelations,
  onExpandConcept,
  onQuickCluster,
  onGenerateSnippetFromText,
  onSummarizeSelectedNodes,
  isViewOnlyMode,
  onAddNodeToData,
  onAddEdgeToData,
  canAddEdge,
  onToggleProperties,
  onToggleAiPanel,
  onToggleDebugLogViewer, 
  isPropertiesPanelOpen,
  isAiPanelOpen,
  isDebugLogViewerOpen, 
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  selectedNodeId,
  numMultiSelectedNodes,
  onAutoLayout,
  arrangeActions,
  onSuggestAISemanticGroup, // Destructure new prop
}: EditorToolbarProps) {
  const { toast } = useToast();

  const handleGenAIClick = React.useCallback((actionCallback: () => void, toolName: string) => {
    if (isViewOnlyMode) {
       toast({ title: "View Only Mode", description: `Cannot use ${toolName} in view-only mode.`, variant: "default" });
      return;
    }
    actionCallback();
  }, [isViewOnlyMode, toast]);

  const isExpandConceptDisabled = isViewOnlyMode || !selectedNodeId || numMultiSelectedNodes > 1;
  const getExpandConceptTooltip = () => {
    if (isViewOnlyMode) return "Expand Concept (Disabled in View Mode)";
    if (!selectedNodeId) return "Expand Concept (Select a node first)";
    if (numMultiSelectedNodes > 1) return "Expand Concept (Select a single node)";
    return "Expand Selected Concept (AI)";
  };

  const isSummarizeNodesDisabled = isViewOnlyMode || numMultiSelectedNodes < 2;
  const getSummarizeNodesTooltip = () => {
    if (isViewOnlyMode) return "Summarize Selection (Disabled in View Mode)";
    if (numMultiSelectedNodes < 2) return "Summarize Selection (Select 2+ nodes)";
    return "Summarize Selection (AI)";
  };


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
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={isViewOnlyMode || !canUndo}>
              <Undo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Undo (Disabled)" : !canUndo ? "Nothing to Undo" : "Undo"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={isViewOnlyMode || !canRedo}>
              <Redo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Redo (Disabled)" : !canRedo ? "Nothing to Redo" : "Redo"}</TooltipContent>
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

        {/* Auto-layout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onAutoLayout?.()} disabled={isViewOnlyMode || !onAutoLayout}>
              <Shuffle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Auto-layout Map (Disabled)" : !onAutoLayout ? "Auto-layout (Not Configured)" : "Auto-layout Map (Experimental)"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Suggest AI Group Button (conditionally rendered) */}
        {!isViewOnlyMode && numMultiSelectedNodes >= 2 && onSuggestAISemanticGroup && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSuggestAISemanticGroup}
                >
                  <BoxSelect className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Suggest AI Grouping</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-full" />
          </>
        )}

        {/* Arrange Selection Button (conditionally rendered) */}
        {!isViewOnlyMode && numMultiSelectedNodes >= 2 && arrangeActions && arrangeActions.length > 0 && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <LayoutPanelLeft className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {arrangeActions.map((actionItem) => (
                      actionItem.isSeparator ? (
                        <DropdownMenuSeparator key={actionItem.id} />
                      ) : (
                        <DropdownMenuItem key={actionItem.id} onSelect={actionItem.action}>
                          {actionItem.icon && <actionItem.icon className="mr-2 h-4 w-4" />}
                          {actionItem.label}
                        </DropdownMenuItem>
                      )
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>Arrange Selection</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-full" />
          </>
        )}

        {/* GenAI Tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onQuickCluster, "Quick AI Cluster")} disabled={isViewOnlyMode}>
              <Sparkles className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Quick AI Cluster (Disabled)" : "Quick AI Node/Cluster from Prompt"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onGenerateSnippetFromText, "Generate Snippet from Text")} disabled={isViewOnlyMode}>
              <TextSearch className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Generate Snippet (Disabled)" : "Generate Map Snippet from Text (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExtractConcepts, "Extract Concepts")} disabled={isViewOnlyMode}>
              <SearchCode className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Extract Concepts (Disabled)" : "Extract Concepts from Text or Selection (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSuggestRelations, "Suggest Relations")} disabled={isViewOnlyMode}>
              <Lightbulb className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isViewOnlyMode ? "Suggest Relations (Disabled)" : "Suggest Relations for Selection (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExpandConcept, "Expand Concept")} disabled={isExpandConceptDisabled}>
              <Brain className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {getExpandConceptTooltip()}
          </TooltipContent>
        </Tooltip>
         <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSummarizeSelectedNodes, "Summarize Selection")} disabled={isSummarizeNodesDisabled}>
              <ListCollapse className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{getSummarizeNodesTooltip()}</TooltipContent>
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
              onClick={onToggleDebugLogViewer}
              className={cn(isDebugLogViewerOpen && "bg-accent text-accent-foreground")}
            >
              <ScrollText className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDebugLogViewerOpen ? "Hide Debug Logs" : "Show Debug Logs"}</TooltipContent>
        </Tooltip>
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
          <TooltipContent>{isAiPanelOpen ? "Hide AI Suggestions" : "Show AI Suggestions"}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
});
EditorToolbar.displayName = "EditorToolbar";
