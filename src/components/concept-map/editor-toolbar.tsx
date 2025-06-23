"use client";

import React, { useState } from 'react'; // Added useState
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
// React was imported twice, removed one instance
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
<<<<<<< HEAD
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FilePlus, Save, Upload, Download, Undo, Redo, PlusSquare, Spline, Shuffle, LayoutPanelLeft, BoxSelect, // Added BoxSelect
  SearchCode, Lightbulb, Brain, Loader2, Settings2, BotMessageSquare, Sparkles, TextSearch, ListCollapse, ScrollText, Wand2, SearchPlus, TestTube2, type LucideIcon, Eye, EyeOff, // Added Eye, EyeOff for overview toggle
  Edit3, // Added Edit3 for "Copy & Edit" button
  FileText as FileTextIcon // Renamed to avoid conflict with component
} from "lucide-react"; // Added Wand2, SearchPlus, TestTube2
=======
  FilePlus, Save, Upload, Download, Undo, Redo, PlusSquare, Spline, Shuffle, LayoutGrid, ScanSearch, Wand2, // Added Wand2
  SearchCode, Lightbulb, Brain, Loader2, Settings2, BotMessageSquare, Sparkles, TextSearch, ListCollapse, ScrollText,
<<<<<<< HEAD
  Network, AlignHorizontalDistributeCenter, Grid // Added Grid icon
=======
  Network, AlignHorizontalDistributeCenter, BrainCircuit // Added BrainCircuit for new button
>>>>>>> master
} from "lucide-react";
>>>>>>> master
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import useConceptMapStore from '@/stores/concept-map-store';
import { fetchAllStructuralSuggestionsFlow } from '@/ai/flows'; // Import the new flow
import { useAuth } from '@/contexts/auth-context'; // For checking guest status
import { useRouter } from 'next/navigation'; // For redirecting to login

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
<<<<<<< HEAD
  onAutoLayout?: () => void; // Made optional
  arrangeActions?: ArrangeAction[];
  onSuggestAISemanticGroup?: () => void; // New prop
  onSuggestAIArrangement?: () => void;
  isSuggestingAIArrangement?: boolean;
  onAIDiscoverGroup?: () => void;
  isAIDiscoveringGroup?: boolean;
  mapNodeCount?: number;
  onAISuggestImprovement?: () => void;
  isAISuggestingImprovement?: boolean;
  onTestEdgeOverlay?: () => void;
  onToggleOverviewMode?: () => void; // New prop for toggling overview mode
  isOverviewModeActive?: boolean; // New prop to indicate if overview mode is active
  onSummarizeMap?: () => void; // New prop for summarizing map
  isSummarizingMap?: boolean; // New prop for loading state of map summary
}

export interface ArrangeAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  action: () => void;
  isSeparator?: boolean;
=======
  onAutoLayout?: () => void;
  onTidySelection?: () => void;
  onSuggestMapImprovements?: () => void;
  isSuggestingMapImprovements?: boolean;
  onApplySemanticTidyUp?: () => void; // New prop for Semantic Tidy
  isApplyingSemanticTidyUp?: boolean; // New prop for Semantic Tidy
  onAiTidySelection?: () => void; // New prop
  onDagreTidySelection?: () => void; // For Dagre-based selection tidy
  isDagreTidying?: boolean;         // Loading state for Dagre tidy
>>>>>>> master
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
<<<<<<< HEAD
  arrangeActions,
  onSuggestAISemanticGroup,
  onSuggestAIArrangement,
  isSuggestingAIArrangement,
  onAIDiscoverGroup,
  isAIDiscoveringGroup,
  mapNodeCount,
  onAISuggestImprovement, // Destructure from prev step
  isAISuggestingImprovement,
  onTestEdgeOverlay,
  onToggleOverviewMode, // Destructure new prop
  isOverviewModeActive, // Destructure new prop
  onSummarizeMap, // Destructure new prop
  isSummarizingMap, // Destructure new prop
=======
  onTidySelection,
  onSuggestMapImprovements,
  isSuggestingMapImprovements,
  onApplySemanticTidyUp, // Destructure new prop
  isApplyingSemanticTidyUp, // Destructure new prop
  onAiTidySelection, // Destructure new prop
  onDagreTidySelection,
  isDagreTidying,
>>>>>>> master
}: EditorToolbarProps) {
  const { toast } = useToast();
  const store = useConceptMapStore(); // Get store instance for actions
  const { isAuthenticated, isLoading: authIsLoading } = useAuth(); // Get auth state
  const router = useRouter(); // For redirection
  const currentMapId = useConceptMapStore((s) => s.mapId);


  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

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

  const handleCopyToWorkspace = () => {
    if (currentMapId && currentMapId.startsWith('example-')) {
      const exampleKey = currentMapId.substring('example-'.length);
      const params = new URLSearchParams();
      params.set('action', 'copyExample');
      params.set('exampleKey', exampleKey);
      router.push(`/login?${params.toString()}`);
    } else {
      toast({
        title: "Error",
        description: "This map cannot be copied to workspace automatically.",
        variant: "destructive",
      });
    }
  };

  const showCopyButton = isViewOnlyMode && currentMapId && currentMapId.startsWith('example-') && !authIsLoading && !isAuthenticated;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="mb-2 flex h-14 items-center gap-1 rounded-lg border bg-card p-2 shadow-sm flex-wrap">
        {/* "Copy to My Workspace & Edit" Button for Guests viewing Examples */}
        {showCopyButton && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline_primary" size="sm" onClick={handleCopyToWorkspace} className="mr-2">
                  <Edit3 className="h-4 w-4 mr-2" />
                  Copy to My Workspace & Edit
                </Button>
              </TooltipTrigger>
              <TooltipContent>Log in or sign up to copy and edit this example map.</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-full" />
          </>
        )}

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
            <Button variant="ghost" size="icon" onClick={onSaveMap} disabled={isSaving || isViewOnlyMode || showCopyButton}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to save maps" : isViewOnlyMode ? "Save Map (Disabled in View Mode)" : "Save Map"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onTriggerImport} disabled={isViewOnlyMode || showCopyButton}>
              <Upload className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to import maps" : isViewOnlyMode ? "Import Map (Disabled)" : "Import Map (JSON)"}</TooltipContent>
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
            <Button variant="ghost" size="icon" onClick={onUndo} disabled={isViewOnlyMode || !canUndo || showCopyButton}>
              <Undo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use undo/redo" : isViewOnlyMode ? "Undo (Disabled)" : !canUndo ? "Nothing to Undo" : "Undo"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onRedo} disabled={isViewOnlyMode || !canRedo || showCopyButton}>
              <Redo className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use undo/redo" : isViewOnlyMode ? "Redo (Disabled)" : !canRedo ? "Nothing to Redo" : "Redo"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Insert Elements */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onAddNodeToData} disabled={isViewOnlyMode || showCopyButton}>
              <PlusSquare className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to add elements" : isViewOnlyMode ? "Add Node (Disabled)" : "Add Node"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onAddEdgeToData} disabled={isViewOnlyMode || !canAddEdge || showCopyButton}>
              <Spline className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to add elements" : isViewOnlyMode ? "Add Edge (Disabled)" : !canAddEdge ? "Add Edge (Requires 2+ nodes)" : "Add Edge"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Auto-layout Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onAutoLayout?.()} disabled={isViewOnlyMode || !onAutoLayout || showCopyButton}>
              <Shuffle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use layout tools" : isViewOnlyMode ? "Shuffle Layout (Disabled)" : !onAutoLayout ? "Shuffle Layout (Not Configured)" : "Shuffle Layout (Experimental)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onTidySelection?.()}
              disabled={isViewOnlyMode || !onTidySelection || numMultiSelectedNodes < 2 || showCopyButton}
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use layout tools" :
             isViewOnlyMode
              ? "Tidy Selection (Disabled in View Mode)"
              : !onTidySelection
              ? "Tidy Selection (Not Configured)"
              : numMultiSelectedNodes < 2
              ? "Tidy Selection (Select 2+ nodes)"
              : "Tidy Selected Nodes"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleGenAIClick(onApplySemanticTidyUp!, "AI Semantic Tidy")}
              disabled={isViewOnlyMode || !onApplySemanticTidyUp || isApplyingSemanticTidyUp || numMultiSelectedNodes < 2 || showCopyButton}
            >
              {isApplyingSemanticTidyUp ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use AI tools" :
             isViewOnlyMode
              ? "AI Semantic Tidy (Disabled in View Mode)"
              : !onApplySemanticTidyUp
              ? "AI Semantic Tidy (Not Configured)"
              : isApplyingSemanticTidyUp
              ? "Processing..."
              : numMultiSelectedNodes < 2
              ? "AI Semantic Tidy (Select 2+ nodes)"
              : "Arrange Selected Nodes with AI (Semantic Tidy)"}
          </TooltipContent>
        </Tooltip>

<<<<<<< HEAD
        {/* New Auto-layout (Dagre) Button - Full Map */}
=======
        {/* New "Suggest Structural Improvements" Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={async () => {
                if (isViewOnlyMode) {
                  toast({ title: "View Only Mode", description: "Cannot suggest improvements in view-only mode.", variant: "default" });
                  return;
                }
                setIsLoadingSuggestions(true);
                try {
                  const currentMapData = store.getState().mapData;
                  // Prepare mapData in the format expected by the flow (nodes and edges only with required fields)
                  const flowInput = {
                    nodes: currentMapData.nodes.map(n => ({ id: n.id, text: n.text, details: n.details || "" })),
                    edges: currentMapData.edges.map(e => ({ source: e.source, target: e.target, label: e.label || "" })),
                  };
                  const results = await fetchAllStructuralSuggestionsFlow.run(flowInput as any); // Cast as any if schema mismatch, ensure correct schema
                  store.getState().setStructuralSuggestions(results);
                  toast({ title: "AI Suggestions", description: `Received ${results.length} structural suggestions.` });
                } catch (error) {
                  console.error("Failed to fetch structural suggestions", error);
                  toast({ title: "Error", description: "Failed to fetch AI structural suggestions.", variant: "destructive" });
                  store.getState().clearStructuralSuggestions(); // Clear any stale suggestions
                } finally {
                  setIsLoadingSuggestions(false);
                }
              }}
              disabled={isViewOnlyMode || isLoadingSuggestions}
            >
              {isLoadingSuggestions ? <Loader2 className="h-5 w-5 animate-spin" /> : <BrainCircuit className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isViewOnlyMode ? "Suggest Improvements (Disabled)" : isLoadingSuggestions ? "Loading..." : "Suggest Structural Improvements (AI)"}
          </TooltipContent>
        </Tooltip>

        {/* New Auto-layout (Dagre) Button */}
>>>>>>> master
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              disabled={isViewOnlyMode || !onAutoLayout || showCopyButton}
              onClick={() => onAutoLayout?.()}
              aria-label="Auto-layout Full Map (Dagre)"
            >
              <Network className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{showCopyButton ? "Log in to use layout tools" : isViewOnlyMode ? "Auto-layout Full Map (Disabled)" : !onAutoLayout ? "Auto-layout Full Map (Not Configured)" : "Auto-layout Full Map (Dagre)"}</p>
          </TooltipContent>
        </Tooltip>

        {/* Dagre Tidy Selection Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleGenAIClick(onDagreTidySelection!, "Dagre Tidy Selection")}
              disabled={isViewOnlyMode || !onDagreTidySelection || isDagreTidying || numMultiSelectedNodeIds < 2 || showCopyButton}
              aria-label="Tidy Selected Subgraph (Dagre)"
            >
              {isDagreTidying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Grid className="h-4 w-4" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use layout tools" :
             isViewOnlyMode ? "Tidy Selection (Dagre - Disabled)"
              : !onDagreTidySelection ? "Tidy Selection (Dagre - Not Configured)"
              : numMultiSelectedNodeIds < 2 ? "Tidy Selection (Dagre - Select 2+ nodes)"
              : isDagreTidying ? "Processing..."
              : "Tidy Selected Subgraph (Dagre)"}
          </TooltipContent>
        </Tooltip>


        <Separator orientation="vertical" className="mx-1 h-full" />

        {/* Suggest AI Group Button (conditionally rendered) */}
        {!isViewOnlyMode && !showCopyButton && numMultiSelectedNodes >= 2 && onSuggestAISemanticGroup && (
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
        {!isViewOnlyMode && !showCopyButton && numMultiSelectedNodes >= 2 && arrangeActions && arrangeActions.length > 0 && (
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

        {/* AI Suggest Arrangement Button */}
        {!isViewOnlyMode && !showCopyButton && numMultiSelectedNodes >= 2 && onSuggestAIArrangement && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSuggestAIArrangement}
                  disabled={isSuggestingAIArrangement}
                >
                  {isSuggestingAIArrangement ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Wand2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Suggest Arrangement</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-full" />
          </>
        )}

        {/* AI Discover Group Button */}
        {!isViewOnlyMode && !showCopyButton && mapNodeCount && mapNodeCount >= 3 && onAIDiscoverGroup && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onAIDiscoverGroup}
                  disabled={isAIDiscoveringGroup}
                >
                  {isAIDiscoveringGroup ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <SearchPlus className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Discover Potential Group</TooltipContent>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-full" />
          </>
        )}

        {/* GenAI Tools */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleGenAIClick(onSuggestMapImprovements!, "Suggest Map Improvements")}
              disabled={isViewOnlyMode || !onSuggestMapImprovements || isSuggestingMapImprovements || showCopyButton}
            >
              {isSuggestingMapImprovements ? <Loader2 className="h-5 w-5 animate-spin" /> : <ScanSearch className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use AI tools" :
             isViewOnlyMode
              ? "Suggest Improvements (Disabled in View Mode)"
              : !onSuggestMapImprovements
              ? "Suggest Improvements (Not Configured)"
              : isSuggestingMapImprovements
              ? "Processing..."
              : "Scan Map for Structure Suggestions (AI)"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onQuickCluster, "Quick AI Cluster")} disabled={isViewOnlyMode || showCopyButton}>
              <Sparkles className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use AI tools" : isViewOnlyMode ? "Quick AI Cluster (Disabled)" : "Quick AI Node/Cluster from Prompt"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onGenerateSnippetFromText, "Generate Snippet from Text")} disabled={isViewOnlyMode || showCopyButton}>
              <TextSearch className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use AI tools" : isViewOnlyMode ? "Generate Snippet (Disabled)" : "Generate Map Snippet from Text (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExtractConcepts, "Extract Concepts")} disabled={isViewOnlyMode || showCopyButton}>
              <SearchCode className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use AI tools" : isViewOnlyMode ? "Extract Concepts (Disabled)" : "Extract Concepts from Text or Selection (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSuggestRelations, "Suggest Relations")} disabled={isViewOnlyMode || showCopyButton}>
              <Lightbulb className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use AI tools" : isViewOnlyMode ? "Suggest Relations (Disabled)" : "Suggest Relations for Selection (AI)"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onExpandConcept, "Expand Concept")} disabled={isExpandConceptDisabled || showCopyButton}>
              <Brain className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use AI tools" : getExpandConceptTooltip()}
          </TooltipContent>
        </Tooltip>
         <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => handleGenAIClick(onSummarizeSelectedNodes, "Summarize Selection")} disabled={isSummarizeNodesDisabled || showCopyButton}>
              <ListCollapse className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{showCopyButton ? "Log in to use AI tools" : getSummarizeNodesTooltip()}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleGenAIClick(onAiTidySelection!, "AI Tidy Selection")}
              disabled={isViewOnlyMode || numMultiSelectedNodes < 2 || !onAiTidySelection || showCopyButton}
            >
              <AlignHorizontalDistributeCenter className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton ? "Log in to use AI tools" :
             isViewOnlyMode
              ? "AI Tidy (Disabled in View Mode)"
              : numMultiSelectedNodes < 2
              ? "AI Tidy (Select 2+ nodes)"
              : !onAiTidySelection
              ? "AI Tidy (Not available)"
              : "AI Tidy Selection"}
          </TooltipContent>
        </Tooltip>

        {/* Summarize Map Button */}
        {onSummarizeMap && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleGenAIClick(onSummarizeMap, "Summarize Map")}
                disabled={isViewOnlyMode || showCopyButton || isSummarizingMap}
              >
                {isSummarizingMap ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileTextIcon className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {showCopyButton ? "Log in to use AI tools" :
               isViewOnlyMode ? "Summarize Map (Disabled in View Mode)" :
               isSummarizingMap ? "Summarizing..." :
               "Summarize Current Map (AI)"}
            </TooltipContent>
          </Tooltip>
        )}

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

        {/* Temporary Test Edge Overlay Button */}
        {onTestEdgeOverlay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={onTestEdgeOverlay}
                className="border-yellow-500 hover:bg-yellow-500/10"
              >
                <TestTube2 className="h-5 w-5 text-yellow-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Test Edge Overlay (Dev)</TooltipContent>
          </Tooltip>
        )}

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

        {/* Toggle Overview Mode Button */}
        {onToggleOverviewMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleOverviewMode}
                className={cn(isOverviewModeActive && "bg-accent text-accent-foreground")}
                disabled={isViewOnlyMode || showCopyButton}
              >
                {isOverviewModeActive ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showCopyButton ? "Log in to use Project Overview" : isOverviewModeActive ? "Exit Overview Mode" : "Show Project Overview (AI)"}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
});
EditorToolbar.displayName = "EditorToolbar";
