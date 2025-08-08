import { Loader2, Compass, ArrowLeft } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import React from 'react';

import type { ConceptMapData, ConceptMapNode } from '@/types';

import ProjectOverviewDisplay from '@/components/concept-map/project-overview-display';
import { Button } from '@/components/ui/button';

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

interface EditorMainContentProps {
  // Loading and error states
  isStoreLoading: boolean;
  storeError: string | null;

  // Overview mode
  isOverviewModeActive: boolean;
  projectOverviewData: {
    overallSummary: string;
    keyModules: Array<{
      name: string;
      description: string;
      importance: 'high' | 'medium' | 'low';
    }>;
    suggestedConcepts?: string[];
    error?: string;
  } | null;
  isFetchingOverview: boolean;

  // Map data and view mode
  storeMapData: ConceptMapData;
  storeIsViewOnlyMode: boolean;

  // Event handlers
  handleFlowSelectionChange: (
    id: string | null,
    type: 'node' | 'edge' | null
  ) => void;
  handleMultiNodeSelectionChange: (nodeIds: string[]) => void;
  updateStoreNode: (nodeId: string, updates: Partial<ConceptMapNode>) => void;
  deleteStoreNode: (nodeId: string) => void;
  deleteStoreEdge: (edgeId: string) => void; // Added this
  onConnectInStore: (params: {
    source: string | null;
    target: string | null;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }) => void; // Added this
  handleNodeContextMenu: (
    event: React.MouseEvent,
    node: ConceptMapNode
  ) => void;
  handlePaneContextMenuRequest: (
    event: React.MouseEvent,
    position: { x: number; y: number }
  ) => void;
  handleConceptSuggestionDrop: (
    conceptItem: {
      text: string;
      type: string;
      context?: string;
      source?: string;
    },
    position: { x: number; y: number }
  ) => void;
  handleStartConnectionFromNode: (nodeId: string) => void;
  handleNewMap: () => void;

  // Staging
  setSelectedStagedElementIds: (ids: string[]) => void;

  // Visual edge suggestions
  activeVisualEdgeSuggestion: {
    id: string;
    source: string;
    target: string;
    label: string;
  } | null;
  handleAcceptVisualEdge: (suggestionId: string) => void;
  handleRejectVisualEdge: (suggestionId: string) => void;
}

const EditorMainContent: React.FC<EditorMainContentProps> = React.memo(
  ({
    isStoreLoading,
    storeError,
    isOverviewModeActive,
    projectOverviewData,
    isFetchingOverview,
    storeMapData,
    storeIsViewOnlyMode,
    handleFlowSelectionChange,
    handleMultiNodeSelectionChange,
    updateStoreNode,
    deleteStoreNode,
    deleteStoreEdge,
    onConnectInStore,
    handleNodeContextMenu,
    handlePaneContextMenuRequest,
    handleConceptSuggestionDrop,
    handleStartConnectionFromNode,
    handleNewMap,
    setSelectedStagedElementIds,
    activeVisualEdgeSuggestion,
    handleAcceptVisualEdge,
    handleRejectVisualEdge,
  }) => {
    const router = useRouter();

    if (isStoreLoading) {
      return (
        <div className='flex h-full w-full items-center justify-center'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
          <span className='ml-2 text-lg'>Loading concept map...</span>
        </div>
      );
    }

    if (storeError) {
      return (
        <div className='flex h-full w-full flex-col items-center justify-center space-y-4'>
          <div className='text-center'>
            <h2 className='text-xl font-semibold text-red-600'>
              Error Loading Map
            </h2>
            <p className='text-gray-600'>{storeError}</p>
          </div>
          <div className='flex gap-4'>
            <Button onClick={handleNewMap} variant='default'>
              <Compass className='mr-2 h-4 w-4' /> Create a New Map
            </Button>
            <Button onClick={() => router.back()} variant='outline'>
              <ArrowLeft className='mr-2 h-4 w-4' /> Go Back
            </Button>
          </div>
        </div>
      );
    }

    if (isOverviewModeActive) {
      return (
        <ProjectOverviewDisplay
          overviewData={projectOverviewData}
          isLoading={isFetchingOverview}
        />
      );
    }

    return (
      <FlowCanvasCore
        mapDataFromStore={storeMapData}
        isViewOnlyMode={storeIsViewOnlyMode}
        onSelectionChange={handleFlowSelectionChange}
        onMultiNodeSelectionChange={handleMultiNodeSelectionChange}
        onNodesChangeInStore={updateStoreNode}
        onNodesDeleteInStore={deleteStoreNode}
        onEdgesDeleteInStore={(edgeIds) => {
          if (Array.isArray(edgeIds)) {
            edgeIds.forEach((edgeId) => deleteStoreEdge(edgeId));
          }
        }}
        onConnectInStore={onConnectInStore}
        onNodeContextMenuRequest={handleNodeContextMenu}
        onPaneContextMenuRequest={handlePaneContextMenuRequest}
        onStagedElementsSelectionChange={setSelectedStagedElementIds}
        onConceptSuggestionDrop={handleConceptSuggestionDrop}
        onNodeStartConnectionRequest={handleStartConnectionFromNode}
        activeVisualEdgeSuggestion={activeVisualEdgeSuggestion}
        onAcceptVisualEdge={handleAcceptVisualEdge}
        onRejectVisualEdge={handleRejectVisualEdge}
      />
    );
  }
);

EditorMainContent.displayName = 'EditorMainContent';

export default EditorMainContent;
