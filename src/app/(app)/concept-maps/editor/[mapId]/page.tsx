'use client';

import {
  AlignLeft,
  AlignCenterHorizontal,
  AlignRight,
  AlignCenterVertical,
  ArrowLeft,
  Compass,
  Share2,
  Loader2,
  EyeOff,
  HelpCircle,
  Save,
} from 'lucide-react';
import { Info, UserPlus, LogIn } from 'lucide-react'; // For CTA
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlowProvider, useReactFlow } from 'reactflow';

// import { generateProjectOverviewFlow } from '@/ai/flows/generate-project-overview';
// import { extractConceptsFlow } from '@/ai/flows/extract-concepts';
import type { CustomNodeData } from '@/components/concept-map/custom-node';
import type { ArrangeAction } from '@/components/concept-map/editor-toolbar';
import type {
  ConceptMap,
  ConceptMapData,
  ConceptMapNode,
  ConceptMapEdge,
  VisualEdgeSuggestion,
} from '@/types';
import type { DagreLayoutOptions, LayoutNodeUpdate } from '@/types/graph-adapter';
import type { Node as RFNode, Edge as RFEdge } from 'reactflow';

import AIStagingToolbar from '@/components/concept-map/ai-staging-toolbar';
import AISuggestionFloater, {
  type SuggestionAction,
} from '@/components/concept-map/ai-suggestion-floater';
import { EditorToolbar } from '@/components/concept-map/editor-toolbar';
import GhostPreviewToolbar from '@/components/concept-map/GhostPreviewToolbar';
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';
import ProjectOverviewDisplay from '@/components/concept-map/project-overview-display'; // Import the new component
import { PropertiesInspector } from '@/components/concept-map/properties-inspector';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import AppTutorial from '@/components/tutorial/app-tutorial'; // Import AppTutorial
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // For CTA
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import useConceptMapStore from '@/stores/concept-map-store';
import useTutorialStore from '@/stores/tutorial-store'; // Import tutorial store
import { UserRole } from '@/types';

const FlowCanvasCore = dynamic(
  () => import('@/components/concept-map/flow-canvas-core'),
  {
    ssr: false,
    loading: () => (
      <div className='flex h-full w-full items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    ),
  }
);

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;

// CTA Banner for Guest viewing an example
const EditorGuestCtaBanner: React.FC<{ routeMapId: string }> = ({
  routeMapId,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const storeIsViewOnlyMode = useConceptMapStore(
    (state: any) => state.isViewOnlyMode
  );

  const isActuallyGuest = !isLoading && !isAuthenticated;
  const isExampleMap = routeMapId && routeMapId.startsWith('example-');

  if (!isActuallyGuest || !storeIsViewOnlyMode || !isExampleMap) {
    return null;
  }

  return (
    <Alert className='mx-4 my-2 border-primary/50 bg-primary/5 text-primary-foreground text-sm rounded-md'>
      <Info className='h-4 w-4 !text-primary mr-2' />
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
        <span className='text-primary/90'>
          You're viewing an example. To create maps, save your work, or use AI
          tools, please
        </span>
        <div className='mt-2 sm:mt-0 sm:ml-4 flex gap-2 flex-shrink-0'>
          <Button
            asChild
            size='sm'
            variant='outline'
            className='py-1 px-2 h-auto text-xs'
          >
            <Link href='/register'>
              <UserPlus className='mr-1 h-3 w-3' /> Sign Up
            </Link>
          </Button>
          <Button
            asChild
            size='sm'
            variant='outline'
            className='py-1 px-2 h-auto text-xs'
          >
            <Link href='/login'>
              <LogIn className='mr-1 h-3 w-3' /> Log In
            </Link>
          </Button>
        </div>
      </div>
    </Alert>
  );
};

export default function ConceptMapEditorPage() {
  const paramsHook = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback((s: any) => ({ startOrResumeTutorial: s.startOrResumeTutorial }), [])
  );
  // const [runEditorTutorial, setRunEditorTutorial] = useState(false); // Removed local state

  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyModeQueryParam = searchParams.get('viewOnly') === 'true';

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    isViewOnlyMode: storeIsViewOnlyMode,
    mapData: storeMapData,
    isLoading: isStoreLoading,
    isSaving: isStoreSaving,
    error: storeError,
    selectedElementId,
    selectedElementType,
    multiSelectedNodeIds,
    isStagingActive,
    stagedMapData: storeStagedMapData,
    commitStagedMapData,
    clearStagedMapData,
    deleteFromStagedMapData,
    setMapName: setStoreMapName,
    setIsPublic: setStoreIsPublic,
    setSharedWithClassroomId: setStoreSharedWithClassroomId,
    deleteNode: deleteStoreNode,
    updateNode: updateStoreNode,
    updateEdge: updateStoreEdge,
    setSelectedElement: setStoreSelectedElement,
    setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds,
    importMapData,
    setIsViewOnlyMode: setStoreIsViewOnlyMode,
    addDebugLog,
    applyLayout: storeApplyLayout,
    // Overview Mode State and Actions from Zustand
    isOverviewModeActive,
    projectOverviewData,
    isFetchingOverview,
    toggleOverviewMode,
    fetchProjectOverview,
  } = useConceptMapStore(
    useCallback(
      (s: any) => ({
        mapId: s.mapId,
        mapName: s.mapName,
        currentMapOwnerId: s.currentMapOwnerId,
        currentMapCreatedAt: s.currentMapCreatedAt,
        isPublic: s.isPublic,
        sharedWithClassroomId: s.sharedWithClassroomId,
        isNewMapMode: s.isNewMapMode,
        isViewOnlyMode: s.isViewOnlyMode,
        mapData: s.mapData,
        isLoading: s.isLoading,
        isSaving: s.isSaving,
        error: s.error,
        selectedElementId: s.selectedElementId,
        selectedElementType: s.selectedElementType,
        multiSelectedNodeIds: s.multiSelectedNodeIds,
        aiExtractedConcepts: s.aiExtractedConcepts,
        aiSuggestedRelations: s.aiSuggestedRelations,
        isStagingActive: s.isStagingActive,
        stagedMapData: s.stagedMapData,
        commitStagedMapData: s.commitStagedMapData,
        clearStagedMapData: s.clearStagedMapData,
        deleteFromStagedMapData: s.deleteFromStagedMapData,
        setMapName: s.setMapName,
        setIsPublic: s.setIsPublic,
        setSharedWithClassroomId: s.setSharedWithClassroomId,
        deleteNode: s.deleteNode,
        updateNode: s.updateNode,
        updateEdge: s.updateEdge,
        setSelectedElement: s.setSelectedElement,
        setMultiSelectedNodeIds: s.setMultiSelectedNodeIds,
        importMapData: s.importMapData,
        setIsViewOnlyMode: s.setIsViewOnlyMode,
        addDebugLog: s.addDebugLog,
        applyLayout: s.applyLayout,
        applySemanticTidyUp: s.applySemanticTidyUp,
        isApplyingSemanticTidyUp: s.isApplyingSemanticTidyUp,
        // Overview Mode
        isOverviewModeActive: s.isOverviewModeActive,
        projectOverviewData: s.projectOverviewData,
        isFetchingOverview: s.isFetchingOverview,
        toggleOverviewMode: s.toggleOverviewMode,
        fetchProjectOverview: s.fetchProjectOverview,
      }),
      []
    )
  );

  const reactFlowInstance = useReactFlow(); // Moved here to be available for handleAutoLayout

  const [activeVisualEdgeSuggestion, setActiveVisualEdgeSuggestion] =
    useState<VisualEdgeSuggestion | null>(null);

  useEffect(() => {
    addDebugLog(
      `[EditorPage V12] storeMapData processed. Nodes: ${storeMapData.nodes?.length ?? 'N/A'}, Edges: ${storeMapData.edges?.length ?? 'N/A'}. isLoading: ${isStoreLoading}, initialLoadComplete: ${(useConceptMapStore.getState() as any).initialLoadComplete}`
    );
  }, [storeMapData, isStoreLoading, addDebugLog]);

  useEffect(() => {
    setStoreIsViewOnlyMode(isViewOnlyModeQueryParam);
  }, [isViewOnlyModeQueryParam, setStoreIsViewOnlyMode]);

  // Editor tutorial trigger logic
  useEffect(() => {
    if (
      !isAuthLoading &&
      user &&
      (useConceptMapStore.getState() as any).initialLoadComplete &&
      !isStoreLoading
    ) {
      const tutorialCompleted =
        localStorage.getItem('editorTutorial_completed') === 'true';
      if (!tutorialCompleted) {
        setTimeout(() => startOrResumeTutorial('editorTutorial'), 500);
      }
    }
  }, [
    user,
    isAuthLoading,
    isStoreLoading,
    routeMapId,
    startOrResumeTutorial,
    (useConceptMapStore.getState() as any).initialLoadComplete,
  ]);

  const { handleUndo, handleRedo, canUndo, canRedo } = {
    handleUndo: () => {},
    handleRedo: () => {},
    canUndo: false,
    canRedo: false,
  };

  const { saveMap, currentSubmissionId } = useConceptMapDataManager({
    routeMapId,
    user,
  });

  const [selectedStagedElementIds, setSelectedStagedElementIds] = useState<
    string[]
  >([]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        isStagingActive &&
        selectedStagedElementIds.length > 0 &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        if (
          document.activeElement &&
          (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA')
        ) {
          return;
        }
        event.preventDefault();
        deleteFromStagedMapData(selectedStagedElementIds);
        setSelectedStagedElementIds([]);
        toast({
          title: 'Staged Items Deleted',
          description: `${selectedStagedElementIds.length} item(s) removed from staging area.`,
        });
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isStagingActive,
    selectedStagedElementIds,
    deleteFromStagedMapData,
    toast,
  ]);

  const handleSaveMap = useCallback(() => {
    saveMap(storeIsViewOnlyMode);
  }, [saveMap, storeIsViewOnlyMode]);

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] =
    useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);

  const [floaterState, setFloaterState] = useState<{
    isVisible: boolean;
    position: { x: number; y: number } | null;
    suggestions: SuggestionAction[];
    contextElementId?: string | null;
    contextType?: 'pane' | 'node' | 'edge' | 'conceptExpansionControls' | null;
    title?: string;
  }>({
    isVisible: false,
    position: null,
    suggestions: [],
    contextElementId: null,
    contextType: null,
  });
  const Floater_handleDismiss = useCallback(() => {
    /* ... */
  }, [
    floaterState.contextType,
  ]);
  useEffect(() => {
    /* for edgeLabelSuggestions */
  }, [
    reactFlowInstance,
    updateStoreEdge,
    Floater_handleDismiss,
    floaterState.isVisible,
    floaterState.contextType,
  ]);
  const handleAddNodeFromFloater = useCallback(
    (position?: { x: number; y: number }) => {},
    []
  );
  const handlePaneContextMenuRequest = useCallback(
    (event: React.MouseEvent, positionInFlow: { x: number; y: number }) => {
      /* ... */
    },
    [
      storeIsViewOnlyMode,
      Floater_handleDismiss,
      contextMenu,
      () => setContextMenu(null),
    ]
  );
  const handleNodeContextMenuRequest = useCallback(
    async (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      /* ... */
    },
    [
      storeIsViewOnlyMode,
      contextMenu,
      () => setContextMenu(null),
      Floater_handleDismiss,
    ]
  );
  const handleCommitStagedData = useCallback(() => {
    commitStagedMapData();
    toast({ title: 'Staged items added to map.' });
  }, [commitStagedMapData, toast]);
  const handleClearStagedData = useCallback(() => {
    clearStagedMapData();
    toast({ title: 'Staging area cleared.' });
  }, [clearStagedMapData, toast]);
  const stagedItemCount = React.useMemo(
    () => ({
      nodes: storeStagedMapData?.nodes?.length || 0,
      edges: storeStagedMapData?.edges?.length || 0,
    }),
    [storeStagedMapData]
  );
  useEffect(() => {
    /* for conceptExpansionPreview */
  }, [
    reactFlowInstance,
    floaterState.isVisible,
    floaterState.contextType,
    Floater_handleDismiss,
  ]);
  const handleConceptSuggestionDrop = useCallback(
    (conceptItem: any, position: { x: number; y: number }) => {
      if (storeIsViewOnlyMode) return;
      // aiToolsHook.addStoreNode({
      //   text: conceptItem.concept,
      //   type: 'ai-concept', // Or derive from conceptItem if it has a type
      //   position,
      //   details: conceptItem.context
      //     ? `Context: ${conceptItem.context}${conceptItem.source ? `\nSource: "${conceptItem.source}"` : ''}`
      //     : conceptItem.source
      //       ? `Source: "${conceptItem.source}"`
      //       : '',
      // });
      // // Optionally remove from suggestions if onAddExtractedConcepts handles it, or call a specific removal function
      // toast({
      //   title: 'Concept Added',
      //   description: `"${conceptItem.concept}" added from suggestions.`,
      // });
    },
    [storeIsViewOnlyMode, toast]
  );

  const handleMapPropertiesChange = useCallback(
    (properties: {
      name: string;
      isPublic: boolean;
      sharedWithClassroomId: string | null;
    }) => {
      /* ... */
    },
    [
      storeIsViewOnlyMode,
      toast,
      setStoreMapName,
      setStoreIsPublic,
      setStoreSharedWithClassroomId,
    ]
  );
  const handleFlowSelectionChange = useCallback(
    (elementId: string | null, elementType: 'node' | 'edge' | null) => {
      setStoreSelectedElement(elementId, elementType);
    },
    [setStoreSelectedElement]
  );
  const handleMultiNodeSelectionChange = useCallback(
    (nodeIds: string[]) => {
      setStoreMultiSelectedNodeIds(nodeIds);
    },
    [setStoreMultiSelectedNodeIds]
  );
  const handleAddNodeToData = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeMapData.nodes,
  ]);
  const handleAddEdgeToData = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeMapData.nodes,
  ]);
  const getRoleBasedDashboardLink = useCallback(() => {
    return user ? `/${user.role}/dashboard` : '/login';
  }, [user]);
  const getBackLink = useCallback(() => {
    return user && user.role === UserRole.TEACHER
      ? '/application/teacher/classrooms'
      : '/application/student/concept-maps';
  }, [user]);
  const getBackButtonText = useCallback(() => {
    return user && user.role === UserRole.TEACHER
      ? 'Back to Classrooms'
      : 'Back to My Maps';
  }, [user]);
  const onTogglePropertiesInspector = useCallback(
    () => setIsPropertiesInspectorOpen((prev) => !prev),
    []
  );
  const onToggleAiPanel = useCallback(
    () => setIsAiPanelOpen((prev) => !prev),
    []
  );
  let mapForInspector: ConceptMap | null =
    storeMapId && storeMapId !== 'new' && currentMapOwnerId
      ? {
          id: storeMapId,
          name: mapName,
          ownerId: currentMapOwnerId,
          mapData: storeMapData,
          isPublic: isPublic,
          sharedWithClassroomId: sharedWithClassroomId,
          createdAt: currentMapCreatedAt || '',
          updatedAt: new Date().toISOString(),
        }
      : null;
  if ((isNewMapMode || storeMapId === 'new') && !mapForInspector && user) {
    mapForInspector = {
      id: 'new',
      name: mapName,
      ownerId: user.id,
      mapData: storeMapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
      createdAt: currentMapCreatedAt || '',
      updatedAt: new Date().toISOString(),
    };
  }
  let actualSelectedElementForInspector:
    | ConceptMapNode
    | ConceptMapEdge
    | null = null;
  if (selectedElementId && selectedElementType) {
    actualSelectedElementForInspector =
      selectedElementType === 'node'
        ? storeMapData.nodes.find((n: any) => n.id === selectedElementId) || null
        : storeMapData.edges.find((e: any) => e.id === selectedElementId) || null;
  }
  const canAddEdge = storeMapData.nodes.length >= 2;
  const handleNewMap = useCallback(() => {
    router.push('/application/concept-maps/editor/new');
  }, [router]);
  const handleExportMap = useCallback(() => {
    /* ... */
  }, [mapName, storeMapData, isPublic, sharedWithClassroomId, toast]);
  const handleTriggerImport = useCallback(() => {
    /* ... */
  }, [storeIsViewOnlyMode, toast]);
  const handleFileSelectedForImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      /* ... */
    },
    [storeIsViewOnlyMode, toast, importMapData]
  );
  const closeContextMenu = useCallback(() => setContextMenu(null), []);
  const handleAlignLefts = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleAlignCentersH = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleAlignRights = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleAlignTops = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleAlignMiddlesV = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleAlignBottoms = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleDistributeHorizontally = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const handleDistributeVertically = useCallback(() => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    toast,
    storeApplyLayout,
    storeMapData,
    multiSelectedNodeIds,
  ]);
  const arrangeActions = React.useMemo<ArrangeAction[]>(
    () => [
      /* ... */
    ],
    [
      handleAlignLefts,
      handleAlignCentersH,
      handleAlignRights,
      handleAlignTops,
      handleAlignMiddlesV,
      handleAlignBottoms,
      handleDistributeHorizontally,
      handleDistributeVertically,
    ]
  );
  const handleTriggerAISemanticGroup = useCallback(async () => {
    /* ... */
  }, [
    toast,
    addDebugLog,
    storeIsViewOnlyMode,
    multiSelectedNodeIds,
    storeMapData.nodes,
  ]);
  const handleRequestAIArrangementSuggestion = useCallback(async () => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    multiSelectedNodeIds,
    toast,
    addDebugLog,
    storeMapData.nodes,
  ]);
  const handleConfirmAIArrangement = useCallback(() => {
    /* ... */
  }, [
    arrangeActions,
    toast,
    addDebugLog,
    handleAlignLefts,
    handleAlignCentersH,
    handleAlignRights,
    handleAlignTops,
    handleAlignMiddlesV,
    handleAlignBottoms,
    handleDistributeHorizontally,
    handleDistributeVertically,
  ]);
  const handleRequestAIDiscoverGroup = useCallback(async () => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    storeMapData,
    toast,
    addDebugLog,
  ]);
  const handleConfirmAIDiscoverGroup = useCallback(async () => {
    /* ... */
  }, [
    updateStoreNode,
    toast,
    addDebugLog,
    storeApplyLayout,
  ]);
  const handleRequestAIMapImprovement = useCallback(async () => {
    /* ... */
  }, [
    storeIsViewOnlyMode,
    storeMapData,
    toast,
    addDebugLog,
  ]);
  const handleConfirmAIMapImprovement = useCallback(() => {
    /* ... */
  }, [toast]);
  const handleConfirmAISemanticGroup = useCallback(async () => {
    /* ... */
  }, [
    multiSelectedNodeIds,
    storeMapData.nodes,
    updateStoreNode,
    toast,
    addDebugLog,
    storeApplyLayout,
  ]);
  const handleDeleteNodeFromContextMenu = useCallback(
    (nodeId: string) => {
      /* ... */
    },
    [storeIsViewOnlyMode, deleteStoreNode, closeContextMenu]
  );
  const handleSelectedElementPropertyUpdateInspector = useCallback(
    (updates: any) => {
      /* ... */
    },
    [
      storeIsViewOnlyMode,
      selectedElementId,
      selectedElementType,
      updateStoreNode,
      updateStoreEdge,
    ]
  );
  const inspectorAiTools = React.useMemo(
    () => ({
      // openExpandConceptModal: aiToolsHook.openExpandConceptModal,
      // openRewriteNodeContentModal: aiToolsHook.openRewriteNodeContentModal,
      // openAskQuestionAboutNodeModal: aiToolsHook.openAskQuestionModal, // Assuming this is for nodes
      // openAskQuestionAboutEdgeModal: aiToolsHook.openAskQuestionAboutEdgeModal, // Wire up edge Q&A modal opener
      // handleSuggestIntermediateNodeRequest is not directly an aiTool but a handler, passed separately
    }),
    [
    ]
  );

  const showEmptyMapMessage =
    !isStoreLoading &&
    (useConceptMapStore.getState() as any).initialLoadComplete &&
    !storeError &&
    routeMapId !== 'new' &&
    storeMapData.nodes.length === 0 &&
    storeMapId === routeMapId;
  const handleStartConnectionFromNode = useCallback(
    (nodeId: string) => {
      /* ... */
    },
    [storeIsViewOnlyMode, toast, addDebugLog]
  );
  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      /* ... */
    },
    []
  );
  const handleAcceptVisualEdge = () => {
    setActiveVisualEdgeSuggestion(null);
  };
  const handleRejectVisualEdge = () => {
    setActiveVisualEdgeSuggestion(null);
  };

  const handleAutoLayout = useCallback(async () => {
    addDebugLog('[EditorPage] Dagre Auto-Layout triggered.');
    if (storeIsViewOnlyMode) {
      toast({
        title: 'View Only Mode',
        description: 'Auto-layout is disabled.',
        variant: 'default',
      });
      return;
    }
    const currentGlobalNodes = reactFlowInstance.getNodes();
    if (currentGlobalNodes.length === 0) {
      toast({
        title: 'Empty Map',
        description: 'Cannot apply layout to an empty map.',
      });
      return;
    }
    const loadingToast = toast({
      title: 'Applying Dagre Auto Layout...',
      description: (
        <div className='flex items-center'>
          <Loader2 className='mr-2 h-4 w-4 animate-spin' /> Please wait.
        </div>
      ),
      duration: Infinity,
    });
    try {
      const nodesForDagre: any[] = currentGlobalNodes
        .map((n) => ({
          id: n.id,
          width: n.width || DEFAULT_NODE_WIDTH,
          height: n.height || DEFAULT_NODE_HEIGHT,
        }))
        .filter((n) => n.width && n.height) as any[];
      if (nodesForDagre.length === 0 && currentGlobalNodes.length > 0) {
        loadingToast.dismiss();
        toast({
          title: 'Layout Warning',
          description:
            'Could not determine dimensions for layout for any node.',
          variant: 'destructive',
        });
        return;
      }
      if (nodesForDagre.length < 1) {
        loadingToast.dismiss();
        toast({
          title: 'Layout Info',
          description:
            'Not enough nodes with dimensions to perform auto-layout.',
        });
        return;
      }
      const currentGlobalEdges = (useConceptMapStore.getState() as any).mapData.edges;
      const edgesForDagre: any[] = currentGlobalEdges.map((e: any) => ({
        source: e.source,
        target: e.target,
        id: e.id,
      }));
      addDebugLog(
        `[EditorPage] Prepared ${nodesForDagre.length} nodes and ${edgesForDagre.length} edges for Dagre layout.`
      );
      const dagreOptions: DagreLayoutOptions = {
        direction: 'TB',
        rankSep: 70,
        nodeSep: 60,
        edgeSep: 20,
      };
      const newPositions: LayoutNodeUpdate[] = [];
      addDebugLog(
        `[EditorPage] Dagre layout calculated. ${newPositions.length} new positions received.`
      );
      storeApplyLayout(newPositions);
      addDebugLog('[EditorPage] store.applyLayout action called for Dagre.');
      setTimeout(() => {
        if (reactFlowInstance) {
          reactFlowInstance.fitView({ padding: 0.1, duration: 300 });
          addDebugLog(
            '[EditorPage] reactFlowInstance.fitView() called after Dagre layout.'
          );
        }
      }, 100);
      loadingToast.dismiss();
      toast({
        title: 'Map Auto-Layout Applied',
        description: 'The entire map has been arranged using Dagre.',
      });
      addDebugLog('[EditorPage] Dagre auto-layout successfully applied.');
    } catch (e: any) {
      addDebugLog(`[EditorPage] Error during Dagre auto-layout: ${e.message}`);
      loadingToast.dismiss();
      toast({
        title: 'Auto-Layout Failed',
        description:
          e.message || 'An unexpected error occurred during Dagre layout.',
        variant: 'destructive',
      });
    }
  }, [
    storeIsViewOnlyMode,
    reactFlowInstance,
    storeApplyLayout,
    toast,
    addDebugLog,
  ]);

  const handleToggleOverviewMode = useCallback(() => {
    if (storeIsViewOnlyMode) {
      toast({
        title: 'View Only Mode',
        description: 'Overview mode toggle is disabled.',
      });
      return;
    }
    const newOverviewModeState = !isOverviewModeActive;
    toggleOverviewMode(); // Toggle the state in Zustand

    if (newOverviewModeState && !projectOverviewData && currentSubmissionId) {
      // Fetch overview data only if entering overview mode and data is not already there
      // And if there's a submission ID to fetch data for (or adapt for current map content)
      const overviewInput: any = {
        projectStoragePath: `submission_related_path_for_${currentSubmissionId}`, // This needs to be the actual storage path
        userGoals: 'Provide a high-level overview of this project.', // Generic goal
      };
      // Check if currentSubmissionId has a valid path, or if mapId can be used to derive project path
      // For now, this part is conceptual as direct projectStoragePath might not be available here.
      // A more robust solution would fetch based on mapId or submissionId if available.
      if (currentSubmissionId) {
        // This is a placeholder for deriving projectStoragePath from currentSubmissionId
        // In a real application, you'd fetch submission details to get its fileStoragePath
        const projectStoragePath =
          (useConceptMapStore.getState() as any).mapData.projectFileStoragePath || // Check if already in mapData
          `user-${user?.id}/project-archives/some-path-derived-from-${currentSubmissionId}.zip`; // Placeholder

        if (
          !projectStoragePath ||
          projectStoragePath.includes('some-path-derived-from')
        ) {
          console.warn(
            'Overview: projectStoragePath could not be reliably determined for submission ID:',
            currentSubmissionId
          );
          toast({
            title: 'Overview Generation',
            description:
              'Could not determine project source for overview. Displaying generic info if possible.',
            variant: 'default',
          });
          // Provide some minimal data or rely on the flow's error handling
          (useConceptMapStore.getState() as any).setProjectOverviewData({
            overallSummary:
              'Project source information is unclear. Cannot generate a detailed AI overview for this map at the moment.',
            keyModules: [],
            error: 'Project source path not found.',
          });
          return; // Prevent calling fetchProjectOverview with bad path
        }

        const overviewInput: any = {
          projectStoragePath,
          userGoals:
            "Provide a high-level overview of this project's structure and purpose.",
        };
        fetchProjectOverview(overviewInput); // This now internally handles toasts and loading states via callAIWithStandardFeedback
      } else if (!currentSubmissionId && storeMapData.nodes.length > 0) {
        toast({
          title: 'Overview Mode',
          description:
            'Generating a basic overview from current map content...',
          variant: 'default',
        });
        (useConceptMapStore.getState() as any).setProjectOverviewData({
          overallSummary:
            'This is an overview based on the current concepts on your map. For a more detailed AI analysis, please upload a project.',
          keyModules: storeMapData.nodes
            .slice(0, Math.min(5, storeMapData.nodes.length))
            .map((n: any) => ({
              name: n.text,
              description: n.details || 'A key concept from the map.',
            })),
        });
      } else {
        toast({
          title: 'Overview Mode',
          description:
            'No project context or map content to generate an overview from.',
          variant: 'default',
        });
        (useConceptMapStore.getState() as any).setProjectOverviewData({
          overallSummary:
            'No content available to generate an overview. Try uploading a project or adding nodes to your map.',
          keyModules: [],
          error: 'No content for overview.',
        });
      }
    }
  }, [
    storeIsViewOnlyMode,
    toast,
    toggleOverviewMode,
    isOverviewModeActive,
    projectOverviewData,
    fetchProjectOverview,
    currentSubmissionId,
    storeMapData.nodes,
    user?.id,
  ]);

  return (
    <div className='flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col concept-map-editor-container'>
      {' '}
      {/* Added class for tutorial targeting */}
      <input
        type='file'
        accept='.json'
        ref={fileInputRef}
        onChange={handleFileSelectedForImport}
        style={{ display: 'none' }}
        disabled={storeIsViewOnlyMode}
      />
      <DashboardHeader
        title={mapName}
        description={
          storeIsViewOnlyMode
            ? 'Currently in view-only mode.'
            : 'Create, edit, and visualize your ideas.'
        }
        icon={
          storeIsViewOnlyMode
            ? EyeOff
            : isNewMapMode || storeMapId === 'new'
              ? Compass
              : Share2
        }
        iconLinkHref={getRoleBasedDashboardLink()}
      >
        {!storeIsViewOnlyMode && (
          <Button
            onClick={handleSaveMap}
            disabled={isStoreSaving || storeIsViewOnlyMode}
          >
            {isStoreSaving ? (
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
            ) : (
              <Save className='mr-2 h-4 w-4' />
            )}
            Save
          </Button>
        )}
        <Button asChild variant='outline'>
          <Link href={getBackLink()}>
            <ArrowLeft className='mr-2 h-4 w-4' /> {getBackButtonText()}
          </Link>
        </Button>
      </DashboardHeader>
      <ReactFlowProvider>
        <EditorToolbar
          onNewMap={handleNewMap}
          onSaveMap={handleSaveMap}
          isSaving={isStoreSaving}
          onExportMap={handleExportMap}
          onTriggerImport={handleTriggerImport}
          onExtractConcepts={() => {}}
          onSuggestRelations={() => {}}
          onExpandConcept={() => {}}
          onQuickCluster={() => {}}
          onGenerateSnippetFromText={() => {}}
          onSummarizeSelectedNodes={() => {}}
          isViewOnlyMode={storeIsViewOnlyMode}
          onAddNodeToData={handleAddNodeToData}
          onAddEdgeToData={handleAddEdgeToData}
          canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector}
          onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen}
          isAiPanelOpen={isAiPanelOpen}
          onUndo={() => {}}
          onRedo={() => {}}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedNodeId={selectedElementId}
          numMultiSelectedNodes={multiSelectedNodeIds.length}
          onAutoLayout={handleAutoLayout}
          onTidySelection={() => {}}
          onSuggestMapImprovements={() => {}}
          isSuggestingMapImprovements={false}
          onAiTidySelection={() => {}}
          onDagreTidySelection={() => {}}
          isDagreTidying={false}
          onToggleOverviewMode={handleToggleOverviewMode} // Pass handler
          isOverviewModeActive={isOverviewModeActive}
          onSummarizeMap={() => {}}
          isSummarizingMap={false}
          onAskQuestionAboutMapContext={() => {}} // Pass handler for map context Q&A
          isAskingAboutMapContext={false} // Pass loading state for map context Q&A
          onToggleDebugLogViewer={() => {}}
        />
        <EditorGuestCtaBanner routeMapId={routeMapId} />
        <div
          id='tutorial-target-map-canvas-wrapper'
          className='flex-grow relative overflow-hidden'
        >
          {showEmptyMapMessage ? (
            <div className='absolute inset-0 flex flex-col items-center justify-center text-center p-8'>
              <HelpCircle className='h-12 w-12 text-muted-foreground mb-4' />
              <h2 className='text-xl font-semibold mb-2'>Empty Map</h2>
              <p className='text-muted-foreground mb-4'>
                It looks like this concept map is empty or could not be loaded.
              </p>
              <div className='flex gap-4'>
                <Button onClick={handleNewMap} variant='default'>
                  <Compass className='mr-2 h-4 w-4' /> Create a New Map
                </Button>
                <Button onClick={() => router.back()} variant='outline'>
                  <ArrowLeft className='mr-2 h-4 w-4' /> Go Back
                </Button>
              </div>
            </div>
          ) : isOverviewModeActive ? (
            <ProjectOverviewDisplay
              overviewData={projectOverviewData}
              isLoading={isFetchingOverview}
            />
          ) : (
            <FlowCanvasCore
              mapDataFromStore={storeMapData}
              isViewOnlyMode={storeIsViewOnlyMode}
              onSelectionChange={handleFlowSelectionChange}
              onMultiNodeSelectionChange={handleMultiNodeSelectionChange}
              onNodesChangeInStore={updateStoreNode}
              onNodesDeleteInStore={deleteStoreNode}
              onEdgesDeleteInStore={(edgeIds: any) =>
                edgeIds.forEach((edgeId: any) =>
                  (useConceptMapStore.getState() as any).deleteEdge(edgeId)
                )
              }
              onConnectInStore={(params: any) => (useConceptMapStore.getState() as any).addEdge(params)}
              onNodeContextMenuRequest={handleNodeContextMenu}
              onPaneContextMenuRequest={handlePaneContextMenuRequest}
              onStagedElementsSelectionChange={setSelectedStagedElementIds}
              onConceptSuggestionDrop={handleConceptSuggestionDrop}
              onNodeStartConnectionRequest={handleStartConnectionFromNode}
              activeVisualEdgeSuggestion={activeVisualEdgeSuggestion}
              onAcceptVisualEdge={handleAcceptVisualEdge}
              onRejectVisualEdge={handleRejectVisualEdge}
            />
          )}
        </div>
        <AIStagingToolbar
          isVisible={isStagingActive && !isOverviewModeActive}
          onCommit={handleCommitStagedData}
          onClear={handleClearStagedData}
          stagedItemCount={stagedItemCount}
        />
        <GhostPreviewToolbar /> {/* Add the GhostPreviewToolbar here */}
        <AISuggestionFloater
          isVisible={floaterState.isVisible && !isOverviewModeActive}
          position={floaterState.position || { x: 0, y: 0 }}
          suggestions={floaterState.suggestions}
          onDismiss={Floater_handleDismiss}
          title={floaterState.title || 'Quick Actions'}
        />
        {contextMenu?.isOpen && contextMenu.nodeId && !isOverviewModeActive && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={closeContextMenu}
            onDeleteNode={handleDeleteNodeFromContextMenu}
            onExpandConcept={() => {
              closeContextMenu();
            }}
            onSuggestRelations={() => {
              closeContextMenu();
            }}
            onExtractConcepts={() => {
              closeContextMenu();
            }}
            onAskQuestion={() => {
              closeContextMenu();
            }}
            onRewriteContent={() => {
              closeContextMenu();
            }}
            isViewOnlyMode={storeIsViewOnlyMode}
          />
        )}
        <Sheet
          open={isPropertiesInspectorOpen && !isOverviewModeActive}
          onOpenChange={setIsPropertiesInspectorOpen}
        >
          {' '}
          <SheetContent
            side='right'
            className='w-full sm:max-w-md overflow-y-auto'
          >
            {' '}
            <PropertiesInspector
              currentMap={mapForInspector}
              onMapPropertiesChange={handleMapPropertiesChange}
              selectedElement={actualSelectedElementForInspector}
              selectedElementType={selectedElementType}
              onSelectedElementPropertyUpdate={
                handleSelectedElementPropertyUpdateInspector
              }
              onSuggestIntermediateNode={() => {}}
              isNewMapMode={isNewMapMode}
              isViewOnlyMode={storeIsViewOnlyMode}
            />{' '}
          </SheetContent>{' '}
        </Sheet>
        {/* <Sheet
          open={isAiPanelOpen && !isOverviewModeActive}
          onOpenChange={setIsAiPanelOpen}
        >
          {' '}
          <SheetContent side='bottom' className='h-[40vh] sm:h-1/3'>
            {' '}
            <AISuggestionPanel
              currentMapNodes={storeMapData.nodes}
              extractedConcepts={[]}
              suggestedRelations={[]}
              onAddExtractedConcepts={() => {}}
              onAddSuggestedRelations={() => {}}
              onClearExtractedConcepts={() => {}}
              onClearSuggestedRelations={() => {}}
              isViewOnlyMode={storeIsViewOnlyMode}
            />{' '}
          </SheetContent>{' '}
        </Sheet> */}
        </Sheet>
      </ReactFlowProvider>
      {/* AppTutorial is now globally managed via AppLayout and tutorial-store */}
      {/* <AppTutorial
        run={runEditorTutorial}
        setRun={setRunEditorTutorial}
        tutorialKey="editorTutorial"
      /> */}
    </div>
  );
}
