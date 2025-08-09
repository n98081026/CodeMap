'use client';

import {
  FilePlus,
  Save,
  Upload,
  Download,
  Undo,
  Redo,
  PlusSquare,
  Spline,
  Shuffle,
  BoxSelect,
  LayoutGrid,
  ScanSearch,
  Wand2, // 合併所有 icon
  Search,
  Lightbulb,
  Brain,
  Loader2,
  Settings2,
  BotMessageSquare,
  Sparkles,
  TextSearch,
  ListCollapse,
  ScrollText,
  TestTube2,
  type LucideIcon,
  Eye,
  EyeOff,
  Edit3,
  FileText as FileTextIcon,
  MessagesSquare,
  GraduationCap,
  Grid,
  AlignHorizontalDistributeCenter,
  BrainCircuit,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';
import { z } from 'zod';

import type { ConceptMapNode, ConceptMapEdge } from '@/types';
import { StructuralSuggestionItemSchema } from '@/types/ai-suggestions';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useConceptMapStore } from '@/stores/concept-map-store';
import useTutorialStore from '@/stores/tutorial-store';

export interface ArrangeAction {
  id: string;
  label: string;
  icon?: LucideIcon;
  action: () => void;
  isSeparator?: boolean;
}

export interface EditorToolbarProps {
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
  onSuggestAISemanticGroup?: () => void;
  onSuggestAIArrangement?: () => void;
  isSuggestingAIArrangement?: boolean;
  onAIDiscoverGroup?: () => void;
  isAIDiscoveringGroup?: boolean;
  mapNodeCount?: number;
  onAISuggestImprovement?: () => void; // Kept from HEAD, seems similar to onSuggestMapImprovements
  onTestEdgeOverlay?: () => void;
  onToggleOverviewMode?: () => void;
  isOverviewModeActive?: boolean;
  onSummarizeMap?: () => void;
  isSummarizingMap?: boolean;
  onAskQuestionAboutMapContext?: () => void;
  isAskingAboutMapContext?: boolean;
  onSuggestMapImprovements?: () => void;
  onApplySemanticTidyUp?: () => void;
  isApplyingSemanticTidyUp?: boolean;
  onAiTidySelection?: () => void;
  onDagreTidySelection?: () => void;
  isDagreTidying?: boolean;
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
  onSuggestAISemanticGroup,
  onSuggestAIArrangement,
  isSuggestingAIArrangement,
  onAIDiscoverGroup,
  isAIDiscoveringGroup,
  mapNodeCount,
  onTestEdgeOverlay,
  onToggleOverviewMode,
  isOverviewModeActive,
  onSummarizeMap,
  isSummarizingMap,

  onAskQuestionAboutMapContext,
  isAskingAboutMapContext,
  onApplySemanticTidyUp,
  isApplyingSemanticTidyUp,
  onAiTidySelection,

  onDagreTidySelection,
  isDagreTidying,
}: EditorToolbarProps) {
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const {
    mapId: currentMapId,
    isFetchingOverview,
    mapData,
    setStructuralSuggestions,
    clearStructuralSuggestions,
  } = useConceptMapStore(
    useCallback(
      (s) => ({
        mapId: s.mapId,
        isFetchingOverview: s.isFetchingOverview,
        mapData: s.mapData,
        setStructuralSuggestions: s.setStructuralSuggestions,
        clearStructuralSuggestions: s.clearStructuralSuggestions,
      }),
      []
    )
  );
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback((s) => ({ startOrResumeTutorial: s.startOrResumeTutorial }), [])
  );

  // TEMP: Button to test manualAddNodeTutorial
  const handleTestManualAddNodeTutorial = () => {
    startOrResumeTutorial('manualAddNodeTutorial', 0, true);
  };

  // TEMP: Button to test manualCreateEdgeTutorial
  const handleTestManualCreateEdgeTutorial = () => {
    startOrResumeTutorial('manualCreateEdgeTutorial', 0, true);
  };

  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false); // For the BrainCircuit button

  const handleGenAIClick = React.useCallback(
    (
      actionCallback: (() => void) | (() => Promise<void>),
      toolName: string
    ) => {
      if (isViewOnlyMode) {
        toast({
          title: 'View Only Mode',
          description: `Cannot use ${toolName} in view-only mode.`,
          variant: 'default',
        });
        return;
      }
      actionCallback();
    },
    [isViewOnlyMode, toast]
  );

  const isExpandConceptDisabled =
    isViewOnlyMode || !selectedNodeId || numMultiSelectedNodes > 1;

  const isSummarizeNodesDisabled = isViewOnlyMode || numMultiSelectedNodes < 2;

  const numMultiSelectedNodeIds = useConceptMapStore(
    (s) => s.multiSelectedNodeIds
  ).length;

  const handleCopyToWorkspace = () => {
    if (currentMapId && currentMapId.startsWith('example-')) {
      const exampleKey = currentMapId.substring('example-'.length);
      const params = new URLSearchParams();
      params.set('action', 'copyExample');
      params.set('exampleKey', exampleKey);
      router.push(`/login?${params.toString()}`);
    } else {
      toast({
        title: 'Error',
        description: 'This map cannot be copied to workspace automatically.',
        variant: 'destructive',
      });
    }
  };

  const showCopyButton =
    isViewOnlyMode &&
    currentMapId &&
    currentMapId.startsWith('example-') &&
    !authIsLoading &&
    !isAuthenticated;

  return (
    <TooltipProvider delayDuration={100}>
      <div
        className='mb-2 flex h-14 items-center gap-1 rounded-lg border bg-card p-2 shadow-sm flex-wrap'
        data-testid='editor-toolbar' // Added for test isolation
      >
        {showCopyButton && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={handleCopyToWorkspace}
                  className='mr-2'
                >
                  <Edit3 className='h-4 w-4 mr-2' />
                  Copy to My Workspace & Edit
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Log in or sign up to copy and edit this example map.
              </TooltipContent>
            </Tooltip>
            <Separator orientation='vertical' className='mx-1 h-full' />
          </>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onNewMap}
              title='New map'
            >
              <FilePlus className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>New Map</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onSaveMap}
              disabled={!!(isSaving || isViewOnlyMode || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to save maps'
                  : isViewOnlyMode
                    ? 'Save Map (Disabled in View Mode)'
                    : 'Save Map'
              }
            >
              {isSaving ? (
                <Loader2 className='h-5 w-5 animate-spin' />
              ) : (
                <Save className='h-5 w-5' />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to save maps'
              : isViewOnlyMode
                ? 'Save Map (Disabled in View Mode)'
                : 'Save Map'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onTriggerImport}
              disabled={!!(isViewOnlyMode || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to import maps'
                  : isViewOnlyMode
                    ? 'Import Map (Disabled)'
                    : 'Import Map (JSON)'
              }
            >
              <Upload className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to import maps'
              : isViewOnlyMode
                ? 'Import Map (Disabled)'
                : 'Import Map (JSON)'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onExportMap}
              title='Export Map (JSON)'
            >
              <Download className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export Map (JSON)</TooltipContent>
        </Tooltip>

        <Separator orientation='vertical' className='mx-1 h-full' />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onUndo}
              disabled={!!(isViewOnlyMode || !canUndo || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to use undo/redo'
                  : isViewOnlyMode
                    ? 'Undo (Disabled)'
                    : !canUndo
                      ? 'Nothing to Undo'
                      : 'Undo'
              }
            >
              <Undo className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to use undo/redo'
              : isViewOnlyMode
                ? 'Undo (Disabled)'
                : !canUndo
                  ? 'Nothing to Undo'
                  : 'Undo'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onRedo}
              disabled={!!(isViewOnlyMode || !canRedo || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to use undo/redo'
                  : isViewOnlyMode
                    ? 'Redo (Disabled)'
                    : !canRedo
                      ? 'Nothing to Redo'
                      : 'Redo'
              }
            >
              <Redo className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to use undo/redo'
              : isViewOnlyMode
                ? 'Redo (Disabled)'
                : !canRedo
                  ? 'Nothing to Redo'
                  : 'Redo'}
          </TooltipContent>
        </Tooltip>

        <Separator orientation='vertical' className='mx-1 h-full' />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onAddNodeToData}
              disabled={!!(isViewOnlyMode || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to add elements'
                  : isViewOnlyMode
                    ? 'Add Node (Disabled)'
                    : 'Add Node'
              }
            >
              <PlusSquare className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to add elements'
              : isViewOnlyMode
                ? 'Add Node (Disabled)'
                : 'Add Node'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onAddEdgeToData}
              disabled={!!(isViewOnlyMode || !canAddEdge || showCopyButton)}
              title={
                showCopyButton
                  ? 'Log in to add elements'
                  : isViewOnlyMode
                    ? 'Add Edge (Disabled)'
                    : !canAddEdge
                      ? 'Add Edge (Requires 2+ nodes)'
                      : 'Add Edge'
              }
            >
              <Spline className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to add elements'
              : isViewOnlyMode
                ? 'Add Edge (Disabled)'
                : !canAddEdge
                  ? 'Add Edge (Requires 2+ nodes)'
                  : 'Add Edge'}
          </TooltipContent>
        </Tooltip>

        <Separator orientation='vertical' className='mx-1 h-full' />

        {/* AI Tools Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={!!(isViewOnlyMode || showCopyButton)}
                  aria-label='AI Tools'
                  data-tutorial-id='editor-toolbar-ai-tools-button' // Added tutorial ID
                >
                  <Sparkles className='h-5 w-5' />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {showCopyButton
                ? 'Log in to use AI tools'
                : isViewOnlyMode
                  ? 'AI Tools (Disabled)'
                  : 'AI Tools'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align='start'>
            <DropdownMenuItem
              onClick={() =>
                handleGenAIClick(onQuickCluster, 'Quick AI Cluster')
              }
              disabled={isViewOnlyMode}
            >
              <Sparkles className='mr-2 h-4 w-4' /> Quick AI Cluster
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleGenAIClick(onGenerateSnippetFromText, 'Generate Snippet')
              }
              disabled={isViewOnlyMode}
            >
              <TextSearch className='mr-2 h-4 w-4' /> Generate Snippet from Text
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleGenAIClick(onExtractConcepts, 'Extract Concepts')
              }
              disabled={isViewOnlyMode}
            >
              <Search className='mr-2 h-4 w-4' /> Extract Concepts
            </DropdownMenuItem>
            <DropdownMenuItem
              data-tutorial-id='ai-tool-suggest-relations'
              onClick={() =>
                handleGenAIClick(onSuggestRelations, 'Suggest Relations')
              }
              disabled={isViewOnlyMode}
            >
              <Lightbulb className='mr-2 h-4 w-4' /> Suggest Relations
            </DropdownMenuItem>
            <DropdownMenuItem
              data-tutorial-id='ai-tool-expand-concept' // Added tutorial ID
              onClick={() =>
                handleGenAIClick(onExpandConcept, 'Expand Concept')
              }
              disabled={isExpandConceptDisabled}
            >
              <Brain className='mr-2 h-4 w-4' /> Expand Selected Concept
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                handleGenAIClick(
                  onSummarizeSelectedNodes,
                  'Summarize Selection'
                )
              }
              disabled={isSummarizeNodesDisabled}
            >
              <ListCollapse className='mr-2 h-4 w-4' /> Summarize Selection
            </DropdownMenuItem>
            {onSummarizeMap && (
              <DropdownMenuItem
                onClick={() =>
                  handleGenAIClick(onSummarizeMap, 'Summarize Map')
                }
              disabled={!!(isViewOnlyMode || isSummarizingMap)}
              >
                {isSummarizingMap ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <FileTextIcon className='mr-2 h-4 w-4' />
                )}
                Summarize Map
              </DropdownMenuItem>
            )}
            {onAskQuestionAboutMapContext && (
              <DropdownMenuItem
                onClick={() =>
                  handleGenAIClick(
                    onAskQuestionAboutMapContext,
                    'Ask AI About Map'
                  )
                }
              disabled={!!(isViewOnlyMode || isAskingAboutMapContext)}
              >
                {isAskingAboutMapContext ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <MessagesSquare className='mr-2 h-4 w-4' />
                )}
                Ask AI About Map
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Layout Tools Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  disabled={!!(isViewOnlyMode || showCopyButton)}
                  aria-label='Layout Tools'
                >
                  <LayoutGrid className='h-5 w-5' />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              {showCopyButton
                ? 'Log in to use Layout tools'
                : isViewOnlyMode
                  ? 'Layout Tools (Disabled)'
                  : 'Layout Tools'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align='start'>
            {onAutoLayout && (
              <DropdownMenuItem
                onClick={() => handleGenAIClick(onAutoLayout, 'Auto Layout')}
              disabled={!!isViewOnlyMode}
              >
                <Shuffle className='mr-2 h-4 w-4' /> Auto-layout Full Map (Old)
              </DropdownMenuItem>
            )}
            {onDagreTidySelection && (
              <DropdownMenuItem
                data-tutorial-id='layout-tool-dagre-tidy' // Added tutorial ID
                onClick={() =>
                  handleGenAIClick(onDagreTidySelection, 'Dagre Tidy Selection')
                }
                disabled={
                !!(
                  isViewOnlyMode ||
                  isDagreTidying ||
                  numMultiSelectedNodeIds < 2
                )
                }
              >
                {isDagreTidying ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Grid className='mr-2 h-4 w-4' />
                )}
                Tidy Selection (Dagre)
              </DropdownMenuItem>
            )}
            {onAiTidySelection && (
              <DropdownMenuItem
                onClick={() =>
                  handleGenAIClick(onAiTidySelection, 'AI Tidy Selection')
                }
              disabled={!!(isViewOnlyMode || numMultiSelectedNodeIds < 2)}
              >
                <AlignHorizontalDistributeCenter className='mr-2 h-4 w-4' /> AI
                Tidy Selection
              </DropdownMenuItem>
            )}
            {onApplySemanticTidyUp && (
              <DropdownMenuItem
                onClick={() =>
                  handleGenAIClick(onApplySemanticTidyUp, 'AI Semantic Tidy')
                }
                disabled={
                !!(
                  isViewOnlyMode ||
                  isApplyingSemanticTidyUp ||
                  numMultiSelectedNodeIds < 2
                )
                }
              >
                {isApplyingSemanticTidyUp ? (
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                ) : (
                  <Wand2 className='mr-2 h-4 w-4' />
                )}
                AI Semantic Tidy
              </DropdownMenuItem>
            )}
            {arrangeActions && arrangeActions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {arrangeActions.map((actionItem) =>
                  actionItem.isSeparator ? (
                    <DropdownMenuSeparator key={actionItem.id} />
                  ) : (
                    <DropdownMenuItem
                      key={actionItem.id}
                      onSelect={actionItem.action}
                    disabled={!!(isViewOnlyMode || numMultiSelectedNodeIds < 1)}
                    >
                      {actionItem.icon && (
                        <actionItem.icon className='mr-2 h-4 w-4' />
                      )}
                      {actionItem.label}
                    </DropdownMenuItem>
                  )
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* AI Suggestion Tools that are direct buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={async () => {
                if (isViewOnlyMode) {
                  return;
                }
                setIsLoadingSuggestions(true);
                try {
                  const flowInput = {
                    nodes: mapData.nodes.map((n: ConceptMapNode) => ({
                      id: n.id,
                      text: n.text,
                      details: n.details || '',
                    })),
                    edges: mapData.edges.map((e: ConceptMapEdge) => ({
                      source: e.source,
                      target: e.target,
                      label: e.label || '',
                    })),
                  };
                  // const results = await runFlow(
                  //   fetchAllStructuralSuggestionsFlow,
                  //   flowInput
                  // );
                  const results: z.infer<
                    typeof StructuralSuggestionItemSchema
                  >[] = [];
                  setStructuralSuggestions(results);
                  toast({
                    title: 'AI Suggestions',
                    description: `Received ${results.length} structural suggestions.`,
                  });
                } catch (error) {
                  console.error(
                    'Failed to fetch structural suggestions',
                    error
                  );
                  toast({
                    title: 'Error',
                    description: 'Failed to fetch AI structural suggestions.',
                    variant: 'destructive',
                  });
                  clearStructuralSuggestions();
                } finally {
                  setIsLoadingSuggestions(false);
                }
              }}
              disabled={
                !!(isViewOnlyMode || isLoadingSuggestions || showCopyButton)
              }
            >
              {isLoadingSuggestions ? (
                <Loader2 className='h-5 w-5 animate-spin' />
              ) : (
                <BrainCircuit className='h-5 w-5' />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {showCopyButton
              ? 'Log in to use AI tools'
              : isViewOnlyMode
                ? 'Suggest Improvements (Disabled)'
                : isLoadingSuggestions
                  ? 'Loading...'
                  : 'Suggest Structural Improvements (AI)'}
          </TooltipContent>
        </Tooltip>

        {!isViewOnlyMode &&
          !showCopyButton &&
          onSuggestAISemanticGroup &&
          numMultiSelectedNodes >= 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    handleGenAIClick(
                      onSuggestAISemanticGroup,
                      'Suggest AI Grouping'
                    )
                  }
                >
                  <BoxSelect className='h-5 w-5' />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Suggest AI Grouping for Selection</TooltipContent>
            </Tooltip>
          )}
        {!isViewOnlyMode &&
          !showCopyButton &&
          onSuggestAIArrangement &&
          numMultiSelectedNodes >= 2 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    handleGenAIClick(
                      onSuggestAIArrangement,
                      'AI Suggest Arrangement'
                    )
                  }
                disabled={!!isSuggestingAIArrangement}
                >
                  {isSuggestingAIArrangement ? (
                    <Loader2 className='h-5 w-5 animate-spin' />
                  ) : (
                    <Wand2 className='h-5 w-5' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                AI Suggest Arrangement for Selection
              </TooltipContent>
            </Tooltip>
          )}
        {!isViewOnlyMode &&
          !showCopyButton &&
          onAIDiscoverGroup &&
          mapNodeCount &&
          mapNodeCount >= 3 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  onClick={() =>
                    handleGenAIClick(onAIDiscoverGroup, 'AI Discover Group')
                  }
                disabled={!!isAIDiscoveringGroup}
                >
                  {isAIDiscoveringGroup ? (
                    <Loader2 className='h-5 w-5 animate-spin' />
                  ) : (
                    <ScanSearch className='h-5 w-5' />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                AI Discover Potential Group in Map
              </TooltipContent>
            </Tooltip>
          )}

        <div className='flex-grow' />

        <Separator orientation='vertical' className='mx-1 h-full' />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onToggleDebugLogViewer}
              className={cn(
                isDebugLogViewerOpen && 'bg-accent text-accent-foreground'
              )}
            >
              <ScrollText className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isDebugLogViewerOpen ? 'Hide Debug Logs' : 'Show Debug Logs'}
          </TooltipContent>
        </Tooltip>

        {onTestEdgeOverlay && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant='outline'
                size='icon'
                onClick={onTestEdgeOverlay}
                className='border-yellow-500 hover:bg-yellow-500/10'
              >
                <TestTube2 className='h-5 w-5 text-yellow-600' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Test Edge Overlay (Dev)</TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              id='tutorial-target-toggle-properties-button'
              variant='ghost'
              size='icon'
              onClick={onToggleProperties}
              className={cn(
                isPropertiesPanelOpen && 'bg-accent text-accent-foreground'
              )}
              title={
                isPropertiesPanelOpen ? 'Hide Properties' : 'Show Properties'
              }
            >
              <Settings2 className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPropertiesPanelOpen ? 'Hide Properties' : 'Show Properties'}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant='ghost'
              size='icon'
              onClick={onToggleAiPanel}
              className={cn(
                isAiPanelOpen && 'bg-accent text-accent-foreground'
              )}
              title={
                isAiPanelOpen ? 'Hide AI Suggestions' : 'Show AI Suggestions'
              }
            >
              <BotMessageSquare className='h-5 w-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isAiPanelOpen ? 'Hide AI Suggestions' : 'Show AI Suggestions'}
          </TooltipContent>
        </Tooltip>

        {!isViewOnlyMode && !showCopyButton && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost' size='icon' aria-label='Tutorials'>
                    <GraduationCap className='h-5 w-5' />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Editor Tutorials</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuItem
                onSelect={() =>
                  startOrResumeTutorial('editorTutorial', 0, true)
                }
              >
                Editor Basics Tour
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  startOrResumeTutorial('extractConceptsToolTutorial', 0, true)
                }
              >
                Using AI: Extract Concepts
              </DropdownMenuItem>
              {/* Example for another AI tool tutorial if it existed */}
              {/* <DropdownMenuItem onSelect={() => startOrResumeTutorial('expandConceptToolTutorial', 0, true)}>
                Using AI: Expand Concept
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleTestManualAddNodeTutorial}>
                Test: Manual Add Node Tutorial
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleTestManualCreateEdgeTutorial}>
                Test: Manual Create Edge Tutorial
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  startOrResumeTutorial('suggestRelationsToolTutorial', 0, true)
                }
              >
                Test: Suggest Relations Tutorial
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {onToggleOverviewMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                data-tutorial-id='toolbar-toggle-project-overview' // Added tutorial ID
                variant='ghost'
                size='icon'
                onClick={onToggleOverviewMode}
                className={cn(
                  isOverviewModeActive &&
                    !isFetchingOverview &&
                    'bg-accent text-accent-foreground'
                )}
                disabled={
                !!(isViewOnlyMode || showCopyButton || isFetchingOverview)
                }
              >
                {isFetchingOverview ? (
                  <Loader2 className='h-5 w-5 animate-spin' />
                ) : isOverviewModeActive ? (
                  <EyeOff className='h-5 w-5' />
                ) : (
                  <Eye className='h-5 w-5' />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFetchingOverview
                ? 'AI is generating project overview...'
                : showCopyButton
                  ? 'Log in to use Project Overview'
                  : isOverviewModeActive
                    ? 'Exit Overview Mode'
                    : 'Show Project Overview (AI)'}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
});
EditorToolbar.displayName = 'EditorToolbar';
