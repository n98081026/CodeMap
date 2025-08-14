// @ts-nocheck
'use client';

import {
  ArrowLeft,
  Compass,
  EyeOff,
  Loader2,
  Save,
  Share2,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlowProvider, useReactFlow, Node, Edge } from 'reactflow';

import type { ConceptMap, ConceptMapNode, ConceptMapEdge } from '@/types';
import type { LayoutNodeUpdate } from '@/types/graph-adapter';

import { AISuggestionPanel } from '@/components/concept-map/ai-suggestion-panel';
import { EditorGuestCtaBanner } from '@/components/concept-map/editor/EditorGuestCtaBanner';
import EditorMainContent from '@/components/concept-map/editor/EditorMainContent';
import EditorOverlays from '@/components/concept-map/editor/EditorOverlays';
import { EditorToolbar } from '@/components/concept-map/editor-toolbar';
import { PropertiesInspector } from '@/components/concept-map/properties-inspector';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { useEditorActions } from '@/hooks/useEditorActions';
import { useEditorAIActions } from '@/hooks/useEditorAIActions';
import { useEditorEventHandlers } from '@/hooks/useEditorEventHandlers';
import { useEditorFloaterState } from '@/hooks/useEditorFloaterState';
import { useEditorOverviewMode } from '@/hooks/useEditorOverviewMode';
import { useEditorStagingActions } from '@/hooks/useEditorStagingActions';
import { Routes } from '@/lib/routes';
import { useMapDataStore } from '@/stores/map-data-store';
import { useMapMetaStore } from '@/stores/map-meta-store';
import { useEditorUIStore } from '@/stores/editor-ui-store';
import { useAISuggestionStore } from '@/stores/ai-suggestion-store';
import useTutorialStore, {
  type TutorialStoreState,
} from '@/stores/tutorial-store';
import { UserRole } from '@/types';

const DEFAULT_NODE_WIDTH = 150;
const DEFAULT_NODE_HEIGHT = 70;

export default function ConceptMapEditorPage() {
  const paramsHook = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const { startOrResumeTutorial } = useTutorialStore(
    useCallback(
      (s: TutorialStoreState) => ({
        startOrResumeTutorial: s.startOrResumeTutorial,
      }),
      []
    )
  );

  const routeMapId = paramsHook.mapId as string;
  const isViewOnlyModeQueryParam = searchParams.get('viewOnly') === 'true';

  // State from map-meta-store
  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    isViewOnlyMode: storeIsViewOnlyMode,
    isLoading: isStoreLoading,
    isSaving: isStoreSaving,
    error: storeError,
    addDebugLog,
    setIsViewOnlyMode: setStoreIsViewOnlyMode,
  } = useMapMetaStore();

  // State from map-data-store
  const {
    mapData: storeMapData,
    updateNode: updateStoreNode,
    updateEdge: updateStoreEdge,
    applyLayout: storeApplyLayout,
    temporal,
  } = useMapDataStore();
  const { undo, redo, pastStates, futureStates } = temporal;

  // State from editor-ui-store
  const {
    selectedElementId,
    selectedElementType,
    multiSelectedNodeIds,
    setSelectedElement: setStoreSelectedElement,
    setMultiSelectedNodeIds: setStoreMultiSelectedNodeIds,
  } = useEditorUIStore();

  // State from ai-suggestion-store
  const {
    aiExtractedConcepts,
    aiSuggestedRelations,
    isStagingActive,
    stagedMapData: storeStagedMapData,
    commitStagedMapData,
    clearStagedMapData,
    deleteFromStagedMapData,
    isOverviewModeActive,
    projectOverviewData,
    isFetchingOverview,
    toggleOverviewMode,
    fetchProjectOverview,
  } = useAISuggestionStore();


  const canUndo = pastStates?.length > 0;
  const canRedo = futureStates?.length > 0;

  const editorActions = useEditorActions({ routeMapId, user });
  const aiActions = useEditorAIActions();

  const editorEventHandlers = useEditorEventHandlers({
    updateStoreNode,
    updateStoreEdge,
    setStoreSelectedElement,
    setStoreMultiSelectedNodeIds,
    storeIsViewOnlyMode,
  });

  const editorStagingActions = useEditorStagingActions({
    storeStagedMapData,
    commitStagedMapData,
    clearStagedMapData,
  });

  const editorFloaterState = useEditorFloaterState();

  const { saveMap, currentSubmissionId } = useConceptMapDataManager({
    routeMapId,
    user,
  });

  const editorOverviewMode = useEditorOverviewMode({
    storeIsViewOnlyMode,
    isOverviewModeActive,
    projectOverviewData,
    currentSubmissionId,
    storeMapData,
    user,
    toggleOverviewMode,
    fetchProjectOverview,
  });

  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    addDebugLog(
      `[EditorPage V12] storeMapData processed. Nodes: ${
        storeMapData.nodes?.length ?? 'N/A'
      }, Edges: ${
        storeMapData.edges?.length ?? 'N/A'
      }. isLoading: ${isStoreLoading}, initialLoadComplete: ${
        useMapMetaStore.getState().initialLoadComplete
      }`
    );
  }, [storeMapData, isStoreLoading, addDebugLog]);

  useEffect(() => {
    setStoreIsViewOnlyMode(isViewOnlyModeQueryParam);
  }, [isViewOnlyModeQueryParam, setStoreIsViewOnlyMode]);

  useEffect(() => {
    if (
      !isAuthLoading &&
      user &&
      useMapMetaStore.getState().initialLoadComplete &&
      !isStoreLoading
    ) {
      const tutorialCompleted =
        localStorage.getItem('editorTutorial_completed') === 'true';
      if (!tutorialCompleted) {
        setTimeout(() => startOrResumeTutorial('editorTutorial'), 500);
      }
    }
  }, [user, isAuthLoading, isStoreLoading, startOrResumeTutorial]);

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
    editorActions.saveMap(storeIsViewOnlyMode);
  }, [editorActions, storeIsViewOnlyMode]);

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] =
    useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddNodeToData = useCallback(() => {
    if (storeIsViewOnlyMode) return;
    const newNode = editorActions.addNode();
    toast({
      title: 'Node Added',
      description: `Node ${newNode.id} added to the map.`,
    });
  }, [storeIsViewOnlyMode, toast, editorActions]);

  const handleAddEdgeToData = useCallback(() => {
    if (storeIsViewOnlyMode) return;
    // This is a placeholder. A real implementation would need a UI to select source and target nodes.
    toast({
      title: 'Add Edge',
      description: 'This functionality requires a UI to select nodes.',
    });
  }, [storeIsViewOnlyMode, toast]);

  const getRoleBasedDashboardLink = useCallback(() => {
    if (!user) return Routes.LOGIN;
    switch (user.role) {
      case UserRole.ADMIN:
        return Routes.Admin.DASHBOARD;
      case UserRole.TEACHER:
        return Routes.Teacher.DASHBOARD;
      default:
        return Routes.Student.DASHBOARD;
    }
  }, [user]);

  const getBackLink = useCallback(() => {
    return user && user.role === UserRole.TEACHER
      ? Routes.Teacher.CLASSROOMS
      : Routes.Student.CONCEPT_MAPS;
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
        ? storeMapData.nodes.find((n) => n.id === selectedElementId) || null
        : storeMapData.edges.find((e) => e.id === selectedElementId) || null;
  }

  const canAddEdge = storeMapData.nodes.length >= 2;

  const handleNewMap = useCallback(() => {
    editorActions.newMap();
  }, [editorActions]);

  const handleExportMap = useCallback(() => {
    editorActions.exportMap();
  }, [editorActions]);

  const handleTriggerImport = useCallback(() => {
    if (storeIsViewOnlyMode) {
      toast({
        title: 'View Only Mode',
        description: 'Importing is disabled.',
      });
      return;
    }
    fileInputRef.current?.click();
  }, [storeIsViewOnlyMode, toast]);

  const handleFileSelectedForImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      await editorActions.importMap(event);
    },
    [editorActions]
  );

  const handleSelectedElementPropertyUpdateInspector = useCallback(
    (updates: Record<string, any>) => {
      if (selectedElementId) {
        editorActions.updateElement(
          selectedElementId,
          selectedElementType,
          updates
        );
      }
    },
    [selectedElementId, selectedElementType, editorActions]
  );

  const handleMapPropertiesChange = useCallback(
    (updates: Record<string, any>) => {
      editorActions.updateMapProperties(updates);
    },
    [editorActions]
  );

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
      const nodesForDagre = currentGlobalNodes
        .map((n: Node) => ({
          id: n.id,
          width: n.width || DEFAULT_NODE_WIDTH,
          height: n.height || DEFAULT_NODE_HEIGHT,
        }))
        .filter((n: { width: number; height: number }) => n.width && n.height);
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
      const edgesForDagre = storeMapData.edges.map((e: Edge) => ({
        source: e.source,
        target: e.target,
        id: e.id,
      }));
      addDebugLog(
        `[EditorPage] Prepared ${nodesForDagre.length} nodes and ${edgesForDagre.length} edges for Dagre layout.`
      );
      const newPositions: LayoutNodeUpdate[] = []; // This should be calculated by a worker
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
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      addDebugLog(`[EditorPage] Error during Dagre auto-layout: ${message}`);
      loadingToast.dismiss();
      toast({
        title: 'Auto-Layout Failed',
        description:
          message || 'An unexpected error occurred during Dagre layout.',
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

  const handleToggleOverviewMode = editorOverviewMode.handleToggleOverviewMode;

  return (
    <div className='flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col concept-map-editor-container'>
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
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onNewMap={handleNewMap}
          onSaveMap={handleSaveMap}
          isSaving={isStoreSaving}
          onExportMap={handleExportMap}
          onTriggerImport={handleTriggerImport}
          onExtractConcepts={aiActions.handleExtractConcepts}
          onSuggestRelations={aiActions.handleSuggestRelations}
          onExpandConcept={aiActions.handleExpandConcept}
          onQuickCluster={aiActions.handleQuickCluster}
          onGenerateSnippetFromText={aiActions.handleGenerateSnippetFromText}
          onSummarizeSelectedNodes={aiActions.handleSummarizeSelectedNodes}
          isViewOnlyMode={storeIsViewOnlyMode}
          onAddNodeToData={handleAddNodeToData}
          onAddEdgeToData={handleAddEdgeToData}
          canAddEdge={canAddEdge}
          onToggleProperties={onTogglePropertiesInspector}
          onToggleAiPanel={onToggleAiPanel}
          isPropertiesPanelOpen={isPropertiesInspectorOpen}
          isAiPanelOpen={isAiPanelOpen}
          selectedNodeId={selectedElementId}
          numMultiSelectedNodeIds={multiSelectedNodeIds.length}
          onAutoLayout={handleAutoLayout}
          onSuggestMapImprovements={() => {}}
          onAiTidySelection={() => {}}
          onDagreTidySelection={() => {}}
          isDagreTidying={false}
          onToggleOverviewMode={handleToggleOverviewMode}
          isOverviewModeActive={isOverviewModeActive}
          onSummarizeMap={() => {}}
          isSummarizingMap={false}
          onAskQuestionAboutMapContext={() => {}}
          isAskingAboutMapContext={false}
          onToggleDebugLogViewer={() => {}}
        />
        <EditorGuestCtaBanner routeMapId={routeMapId} />
        <div
          id='tutorial-target-map-canvas-wrapper'
          className='flex-grow relative overflow-hidden'
        >
          <EditorMainContent
            isStoreLoading={isStoreLoading}
            storeError={storeError}
            isOverviewModeActive={isOverviewModeActive}
            projectOverviewData={projectOverviewData}
            isFetchingOverview={isFetchingOverview}
            storeMapData={storeMapData}
            storeIsViewOnlyMode={storeIsViewOnlyMode}
            handleFlowSelectionChange={
              editorEventHandlers.handleFlowSelectionChange
            }
            handleMultiNodeSelectionChange={
              editorEventHandlers.handleMultiNodeSelectionChange
            }
            updateStoreNode={updateStoreNode}
            deleteStoreNode={(nodeId: string) =>
              editorActions.deleteElement(nodeId, 'node')
            }
            handleNodeContextMenu={editorEventHandlers.handleNodeContextMenu}
            handlePaneContextMenuRequest={
              editorEventHandlers.handlePaneContextMenuRequest
            }
            handleConceptSuggestionDrop={
              editorEventHandlers.handleConceptSuggestionDrop
            }
            handleStartConnectionFromNode={
              editorEventHandlers.handleStartConnectionFromNode
            }
            handleNewMap={handleNewMap}
            setSelectedStagedElementIds={setSelectedStagedElementIds}
            activeVisualEdgeSuggestion={
              editorEventHandlers.activeVisualEdgeSuggestion
            }
            handleAcceptVisualEdge={editorEventHandlers.handleAcceptVisualEdge}
            handleRejectVisualEdge={editorEventHandlers.handleRejectVisualEdge}
          />
        </div>
        <EditorOverlays
          isStagingActive={isStagingActive}
          isOverviewModeActive={isOverviewModeActive}
          handleCommitStagedData={editorStagingActions.handleCommitStagedData}
          handleClearStagedData={editorStagingActions.handleClearStagedData}
          stagedItemCount={editorStagingActions.stagedItemCount}
          floaterState={editorFloaterState.floaterState}
          Floater_handleDismiss={editorFloaterState.Floater_handleDismiss}
          contextMenu={editorEventHandlers.contextMenu}
          closeContextMenu={editorEventHandlers.closeContextMenu}
          handleDeleteNodeFromContextMenu={
            editorEventHandlers.handleDeleteNodeFromContextMenu
          }
          storeIsViewOnlyMode={storeIsViewOnlyMode}
        />
        <Sheet
          open={isPropertiesInspectorOpen && !isOverviewModeActive}
          onOpenChange={setIsPropertiesInspectorOpen}
        >
          <SheetContent
            side='right'
            className='w-full sm:max-w-md overflow-y-auto'
          >
            <PropertiesInspector
              currentMap={mapForInspector}
              onMapPropertiesChange={handleMapPropertiesChange}
              selectedElement={actualSelectedElementForInspector}
              selectedElementType={selectedElementType}
              onSelectedElementPropertyUpdate={
                handleSelectedElementPropertyUpdateInspector
              }
              isNewMapMode={isNewMapMode}
              isViewOnlyMode={storeIsViewOnlyMode}
            />
          </SheetContent>
        </Sheet>
        <Sheet
          open={isAiPanelOpen && !isOverviewModeActive}
          onOpenChange={setIsAiPanelOpen}
        >
          <SheetContent side='bottom' className='h-[40vh] sm:h-1/3'>
            <AISuggestionPanel
              currentMapNodes={storeMapData.nodes}
              extractedConcepts={(aiExtractedConcepts || []).map(
                (concept: string) => ({
                  concept,
                })
              )}
              suggestedRelations={aiSuggestedRelations || []}
              onAddExtractedConcepts={aiActions.handleAddExtractedConcepts}
              onAddSuggestedRelations={aiActions.handleAddSuggestedRelations}
              onClearExtractedConcepts={aiActions.handleClearExtractedConcepts}
              onClearSuggestedRelations={
                aiActions.handleClearSuggestedRelations
              }
              isViewOnlyMode={storeIsViewOnlyMode}
            />
          </SheetContent>
        </Sheet>
      </ReactFlowProvider>
    </div>
  );
}
