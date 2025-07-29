'use client';

import {
  ArrowLeft,
  Compass,
  Share2,
  Loader2,
  AlertTriangle,
  Save,
  EyeOff,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlowProvider } from 'reactflow';

import type { CustomNodeData } from '@/components/concept-map/custom-node';
import type {
  ConceptMap,
  ConceptMapData,
  ConceptMapNode,
  ConceptMapEdge,
  User,
} from '@/types';
import type { Node as RFNode } from 'reactflow';

import { EditorToolbar } from '@/components/concept-map/editor-toolbar';
import GhostPreviewToolbar from '@/components/concept-map/GhostPreviewToolbar'; // Import GhostPreviewToolbar
import { NodeContextMenu } from '@/components/concept-map/node-context-menu';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapDataManager } from '@/hooks/useConceptMapDataManager';
import { getNodePlacement } from '@/lib/layout-utils';
import { useConceptMapStore } from '@/stores/concept-map-store';
import { UserRole } from '@/types';

// Dynamically import components
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

const PropertiesInspector = dynamic(
  () =>
    import('@/components/concept-map/properties-inspector').then(
      (mod) => mod.PropertiesInspector
    ),
  {
    ssr: false,
    loading: () => (
      <div className='p-4 text-center text-sm text-muted-foreground'>
        Loading Properties...
      </div>
    ),
  }
);

const DynamicDebugLogViewerDialog = dynamic(
  () =>
    import('@/components/debug/debug-log-viewer-dialog').then(
      (mod) => mod.DebugLogViewerDialog
    ),
  { ssr: false }
);

interface ConceptMapEditorPageContentProps {
  currentUser: User;
}

function ConceptMapEditorPageContent({
  currentUser,
}: ConceptMapEditorPageContentProps) {
  const paramsHook = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const router = useRouter();

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
    editingNodeId: editingNodeIdFromStore,
    setEditingNodeId,
  } = useConceptMapStore();

  const [isPropertiesInspectorOpen, setIsPropertiesInspectorOpen] =
    useState(false);
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(false);
  const [isDebugLogViewerOpen, setIsDebugLogViewerOpen] = useState(false);

  useEffect(() => {
    setStoreIsViewOnlyMode(isViewOnlyModeQueryParam);
  }, [isViewOnlyModeQueryParam, setStoreIsViewOnlyMode]);

  const temporalStoreAPI = (useConceptMapStore as any).temporal;
  const canUndo = temporalStoreAPI.getState().pastStates.length > 0;
  const canRedo = temporalStoreAPI.getState().futureStates.length > 0;

  const { saveMap } = useConceptMapDataManager({
    routeMapId: routeMapId,
    user: currentUser,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  } | null>(null);

  const handleMapPropertiesChange = useCallback(
    (properties: {
      name: string;
      isPublic: boolean;
      sharedWithClassroomId: string | null;
    }) => {
      if (storeIsViewOnlyMode) {
        toast({
          title: 'View Only Mode',
          description: 'Map properties cannot be changed.',
          variant: 'default',
        });
        return;
      }
      setStoreMapName(properties.name);
      setStoreIsPublic(properties.isPublic);
      setStoreSharedWithClassroomId(properties.sharedWithClassroomId);
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
      if (elementType === 'node' && elementId) {
        setEditingNodeId(elementId);
      } else {
        setEditingNodeId(null);
      }
      if (elementId) {
        setTimeout(() => setIsPropertiesInspectorOpen(true), 0);
      }
    },
    [setStoreSelectedElement, setEditingNodeId, setIsPropertiesInspectorOpen]
  );

  const handleMultiNodeSelectionChange = useCallback(
    (nodeIds: string[]) => {
      setStoreMultiSelectedNodeIds(nodeIds);
    },
    [setStoreMultiSelectedNodeIds]
  );

  const handleAddNodeToData = useCallback(() => {
    if (storeIsViewOnlyMode) {
      toast({ title: 'View Only Mode', variant: 'default' });
      return;
    }
    const newNodeText = `Node ${useConceptMapStore.getState().mapData.nodes.length + 1}`;
    const { x, y } = getNodePlacement(
      useConceptMapStore.getState().mapData.nodes,
      'generic',
      null,
      null,
      20
    );
    const newNodeId = useConceptMapStore.getState().addNode({
      text: newNodeText,
      type: 'manual-node',
      position: { x, y },
    });
    toast({ title: 'Node Added', description: `"${newNodeText}" added.` });
    setStoreSelectedElement(newNodeId, 'node');
    setEditingNodeId(newNodeId);
  }, [storeIsViewOnlyMode, toast, setStoreSelectedElement, setEditingNodeId]);

  const handleAddEdgeToData = useCallback(() => {
    if (storeIsViewOnlyMode) {
      toast({ title: 'View Only Mode', variant: 'default' });
      return;
    }
    const nodes = useConceptMapStore.getState().mapData.nodes;
    if (nodes.length < 2) {
      toast({
        title: 'Cannot Add Edge',
        description: 'At least two nodes are required to add an edge.',
        variant: 'default',
      });
      return;
    }
    const sourceNode = nodes[nodes.length - 2];
    const targetNode = nodes[nodes.length - 1];
    if (!sourceNode || !targetNode) {
      toast({
        title: 'Error Adding Edge',
        description: 'Source or target node for edge not found.',
        variant: 'destructive',
      });
      return;
    }
    useConceptMapStore.getState().addEdge({
      source: sourceNode.id,
      target: targetNode.id,
      label: 'connects',
    });
    toast({ title: 'Edge Added' });
  }, [storeIsViewOnlyMode, toast]);

  const getRoleBasedDashboardLink = useCallback(() => {
    return currentUser
      ? `/application/${currentUser.role}/dashboard`
      : '/login';
  }, [currentUser]);
  const getBackLink = useCallback(() => {
    return currentUser && currentUser.role === UserRole.TEACHER
      ? '/application/teacher/classrooms'
      : '/application/student/concept-maps';
  }, [currentUser]);
  const getBackButtonText = useCallback(() => {
    return currentUser && currentUser.role === UserRole.TEACHER
      ? 'Back to Classrooms'
      : 'Back to My Maps';
  }, [currentUser]);

  const onTogglePropertiesInspector = useCallback(
    () => setIsPropertiesInspectorOpen((prev) => !prev),
    [setIsPropertiesInspectorOpen]
  );
  const onToggleAiPanel = useCallback(
    () => setIsAiPanelOpen((prev) => !prev),
    [setIsAiPanelOpen]
  );
  const onToggleDebugLogViewer = useCallback(
    () => setIsDebugLogViewerOpen((prev) => !prev),
    [setIsDebugLogViewerOpen]
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
  if (
    (isNewMapMode || storeMapId === 'new') &&
    !mapForInspector &&
    currentUser
  ) {
    mapForInspector = {
      id: 'new',
      name: mapName,
      ownerId: currentUser.id,
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
        ? storeMapData.nodes.find((n: any) => n.id === selectedElementId) ||
          null
        : storeMapData.edges.find((e: any) => e.id === selectedElementId) ||
          null;
  }
  const canAddEdge = storeMapData.nodes.length >= 2;

  const handleNewMap = useCallback(() => {
    router.push('/application/concept-maps/editor/new');
  }, [router]);

  const handleExportMap = useCallback(() => {
    const mapToExport = {
      name: mapName,
      mapData: storeMapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(mapToExport, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `${mapName.replace(/\s+/g, '_') || 'concept_map'}.json`;
    link.click();
    toast({
      title: 'Map Exported',
      description: `${mapName}.json has been downloaded.`,
    });
  }, [mapName, storeMapData, isPublic, sharedWithClassroomId, toast]);

  const handleTriggerImport = useCallback(() => {
    if (!storeIsViewOnlyMode) fileInputRef.current?.click();
    else toast({ title: 'View Only Mode', description: 'Import disabled.' });
  }, [storeIsViewOnlyMode, toast]);

  const handleFileSelectedForImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (storeIsViewOnlyMode) return;
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const fileContent = await file.text();
        const importedJson = JSON.parse(fileContent);
        if (
          typeof importedJson.mapData !== 'object' ||
          !Array.isArray(importedJson.mapData.nodes) ||
          !Array.isArray(importedJson.mapData.edges)
        ) {
          throw new Error('Invalid map data structure in JSON file.');
        }
        importMapData(
          importedJson.mapData,
          importedJson.name || file.name.replace(/\.json$/i, '')
        );
        temporalStoreAPI.getState().clear();
        toast({
          title: 'Map Imported',
          description: `"${importedJson.name || file.name}" loaded successfully.`,
        });
      } catch (e) {
        toast({
          title: 'Import Failed',
          description: `Error importing map: ${(e as Error).message}`,
          variant: 'destructive',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [storeIsViewOnlyMode, toast, importMapData, temporalStoreAPI]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode<CustomNodeData>) => {
      event.preventDefault();
      setContextMenu({
        isOpen: true,
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
      });
    },
    []
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  const handleDeleteNodeFromContextMenu = useCallback(
    (nodeId: string) => {
      if (!storeIsViewOnlyMode) deleteStoreNode(nodeId);
      closeContextMenu();
    },
    [storeIsViewOnlyMode, deleteStoreNode, closeContextMenu]
  );

  const handleSelectedElementPropertyUpdateInspector = useCallback(
    (updates: any) => {
      if (storeIsViewOnlyMode || !selectedElementId || !selectedElementType)
        return;
      if (selectedElementType === 'node')
        updateStoreNode(selectedElementId, updates);
      else if (selectedElementType === 'edge')
        updateStoreEdge(selectedElementId, updates);
    },
    [
      storeIsViewOnlyMode,
      selectedElementId,
      selectedElementType,
      updateStoreNode,
      updateStoreEdge,
    ]
  );

  const handleSaveMapCallback = useCallback(
    () => saveMap(storeIsViewOnlyMode),
    [saveMap, storeIsViewOnlyMode]
  );
  const handleUndoCallback = useCallback(
    () => temporalStoreAPI.getState().undo(),
    [temporalStoreAPI]
  );
  const handleRedoCallback = useCallback(
    () => temporalStoreAPI.getState().redo(),
    [temporalStoreAPI]
  );
  const handleEdgesDeleteCallback = useCallback(
    (edgeId: string) => useConceptMapStore.getState().deleteEdge(edgeId),
    []
  );

  const handleAddChildNodeFromHover = useCallback(
    (parentNodeId: string, direction: 'top' | 'right' | 'bottom' | 'left') => {
      if (storeIsViewOnlyMode) return;
      const parentNode = useConceptMapStore
        .getState()
        .mapData.nodes.find((n: any) => n.id === parentNodeId);
      if (!parentNode) return;

      const currentNodes = useConceptMapStore.getState().mapData.nodes;
      const childPosition = getNodePlacement(
        currentNodes,
        'child',
        parentNode,
        null,
        20,
        direction
      );
      const newNodeId = useConceptMapStore.getState().addNode({
        text: 'New Idea',
        type: 'manual-node',
        position: childPosition,
        parentNode: parentNode.id,
      });
      useConceptMapStore.getState().addEdge({
        source: parentNode.id,
        target: newNodeId,
        label: 'relates to',
      });

      setStoreSelectedElement(newNodeId, 'node');
      setEditingNodeId(newNodeId);
      toast({
        title: 'Child Node Added',
        description: 'New child node created and selected.',
      });
    },
    [storeIsViewOnlyMode, setStoreSelectedElement, setEditingNodeId, toast]
  );

  // Keyboard listener for Tab and Enter node creation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        storeIsViewOnlyMode ||
        (document.activeElement &&
          (document.activeElement.tagName === 'INPUT' ||
            document.activeElement.tagName === 'TEXTAREA'))
      )
        return;

      const currentSelectedElementId =
        useConceptMapStore.getState().selectedElementId;
      const currentSelectedElementType =
        useConceptMapStore.getState().selectedElementType;
      const currentMapData = useConceptMapStore.getState().mapData;

      if (
        currentSelectedElementId &&
        currentSelectedElementType === 'node' &&
        (event.key === 'Tab' || event.key === 'Enter')
      ) {
        event.preventDefault();
        const selectedStoreNode = currentMapData.nodes.find(
          (n: any) => n.id === currentSelectedElementId
        );
        if (!selectedStoreNode) return;

        let newNodeId: string;
        const GRID_SIZE = 20;

        if (event.key === 'Tab') {
          // Create child node
          const childPosition = getNodePlacement(
            currentMapData.nodes,
            'child',
            selectedStoreNode,
            null,
            GRID_SIZE,
            'right'
          );
          newNodeId = useConceptMapStore.getState().addNode({
            text: 'New Idea',
            type: 'manual-node',
            position: childPosition,
            parentNode: selectedStoreNode.id,
          });
          useConceptMapStore.getState().addEdge({
            source: selectedStoreNode.id,
            target: newNodeId,
            label: 'relates to',
          });
        } else {
          // Create sibling node (Enter key)
          const parentOfSelected = selectedStoreNode.parentNode
            ? currentMapData.nodes.find(
                (n: any) => n.id === selectedStoreNode.parentNode
              )
            : null;
          const siblingPosition = getNodePlacement(
            currentMapData.nodes,
            'sibling',
            parentOfSelected,
            selectedStoreNode,
            GRID_SIZE
          );
          newNodeId = useConceptMapStore.getState().addNode({
            text: 'New Sibling',
            type: 'manual-node',
            position: siblingPosition,
            parentNode: selectedStoreNode.parentNode,
          });
        }

        setStoreSelectedElement(newNodeId, 'node');
        setEditingNodeId(newNodeId); // Set for potential auto-focus
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [storeIsViewOnlyMode, setStoreSelectedElement, setEditingNodeId, toast]);

  if (isStoreLoading && !storeError) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }
  if (storeError) {
    return (
      <div className='p-4 text-destructive flex flex-col items-center justify-center h-full gap-4'>
        <AlertTriangle className='h-10 w-10' /> <p>{storeError}</p>{' '}
        <Button asChild>
          <Link href={getBackLink()}>{getBackButtonText()}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className='flex h-[calc(100vh-var(--navbar-height,4rem))] flex-col'>
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
            onClick={handleSaveMapCallback}
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
          onSaveMap={handleSaveMapCallback}
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
          onToggleDebugLogViewer={onToggleDebugLogViewer}
          isPropertiesPanelOpen={isPropertiesInspectorOpen}
          isAiPanelOpen={isAiPanelOpen}
          isDebugLogViewerOpen={isDebugLogViewerOpen}
          onUndo={handleUndoCallback}
          onRedo={handleRedoCallback}
          canUndo={canUndo}
          canRedo={canRedo}
          selectedNodeId={
            selectedElementType === 'node' ? selectedElementId : null
          }
          numMultiSelectedNodes={multiSelectedNodeIds.length}
        />
        <div className='flex-grow relative overflow-hidden'>
          <FlowCanvasCore
            mapDataFromStore={storeMapData}
            isViewOnlyMode={storeIsViewOnlyMode}
            onSelectionChange={handleFlowSelectionChange}
            onMultiNodeSelectionChange={handleMultiNodeSelectionChange}
            onNodesChangeInStore={updateStoreNode}
            onNodesDeleteInStore={deleteStoreNode}
            onEdgesDeleteInStore={handleEdgesDeleteCallback}
            onConnectInStore={(params: any) =>
              useConceptMapStore.getState().addEdge(params)
            }
            onNodeContextMenuRequest={handleNodeContextMenu}
            panActivationKeyCode='Space'
          />
        </div>
        {contextMenu?.isOpen && contextMenu.nodeId && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={closeContextMenu}
            onDeleteNode={handleDeleteNodeFromContextMenu}
            onExpandConcept={() => {}}
            onSuggestRelations={() => {}}
            onExtractConcepts={() => {}}
            onAskQuestion={() => {}}
            onRewriteContent={() => {}}
            isViewOnlyMode={storeIsViewOnlyMode}
          />
        )}
        <Sheet
          open={isPropertiesInspectorOpen}
          onOpenChange={setIsPropertiesInspectorOpen}
        >
          <SheetContent
            side='right'
            className='w-full sm:max-w-md overflow-y-auto'
          >
            <SheetHeader>
              <SheetTitle>Element & Map Properties</SheetTitle>
              <SheetDescription>
                {storeIsViewOnlyMode
                  ? 'Viewing properties. Editing is disabled.'
                  : 'Edit properties for the selected element or the map.'}
              </SheetDescription>
            </SheetHeader>
            {isPropertiesInspectorOpen && (
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
                editingNodeId={editingNodeIdFromStore}
              />
            )}
          </SheetContent>
        </Sheet>
        {/* <Sheet open={isAiPanelOpen} onOpenChange={setIsAiPanelOpen}>
          <SheetContent side='bottom' className='h-[40vh] sm:h-1/3'>
            <SheetHeader>
              <SheetTitle>AI Suggestions Panel</SheetTitle>
              <SheetDescription>
                Review and add AI-generated concepts and relations to your map.
              </SheetDescription>
            </SheetHeader>
            {isAiPanelOpen && (
              <AISuggestionPanel
                currentMapNodes={storeMapData.nodes}
                extractedConcepts={[]}
                suggestedRelations={[]}
                onAddExtractedConcepts={() => {}}
                onAddSuggestedRelations={() => {}}
                onClearExtractedConcepts={() => {}}
                onClearSuggestedRelations={() => {}}
                isViewOnlyMode={storeIsViewOnlyMode}
              />
            )}
          </SheetContent>
        </Sheet> */}
        {isDebugLogViewerOpen && (
          <DynamicDebugLogViewerDialog
            isOpen={isDebugLogViewerOpen}
            onOpenChange={setIsDebugLogViewerOpen}
          />
        )}
        <GhostPreviewToolbar /> {/* Add GhostPreviewToolbar here */}
      </ReactFlowProvider>
    </div>
  );
}

export default function ConceptMapEditorPageOuter() {
  const { user, isLoading: authIsLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authIsLoading && !user) {
      router.replace('/login');
    }
  }, [authIsLoading, user, router]);

  if (authIsLoading || (!user && !authIsLoading)) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <Loader2 className='h-12 w-12 animate-spin text-primary' />
      </div>
    );
  }

  if (user) {
    return <ConceptMapEditorPageContent currentUser={user} />;
  }

  return null;
}
