import { useCallback } from 'react';

import type { ConceptMapNode } from '@/types';

import { useToast } from '@/hooks/use-toast';
import {
  useConceptMapStore,
  type ConceptMapState,
} from '@/stores/concept-map-store';

interface UseEditorOverviewModeProps {
  storeIsViewOnlyMode: boolean;
  isOverviewModeActive: boolean;
  projectOverviewData: any;
  currentSubmissionId: string | null;
  storeMapData: { nodes: ConceptMapNode[] };
  user: { id: string } | null;
  toggleOverviewMode: () => void;
  fetchProjectOverview: (input: {
    projectStoragePath: string;
    userGoals: string;
  }) => void;
}

export const useEditorOverviewMode = ({
  storeIsViewOnlyMode,
  isOverviewModeActive,
  projectOverviewData,
  currentSubmissionId,
  storeMapData,
  user,
  toggleOverviewMode,
  fetchProjectOverview,
}: UseEditorOverviewModeProps) => {
  const { toast } = useToast();

  const handleToggleOverviewMode = useCallback(() => {
    if (storeIsViewOnlyMode) {
      toast({
        title: 'View-only mode',
        description: 'Overview mode is not available in view-only mode.',
        variant: 'destructive',
      });
      return;
    }

    const newOverviewModeState = !isOverviewModeActive;
    toggleOverviewMode(); // Toggle the state in Zustand

    if (newOverviewModeState && !projectOverviewData && currentSubmissionId) {
      // Fetch overview data only if entering overview mode and data is not already there
      if (currentSubmissionId) {
        // This is a placeholder for deriving projectStoragePath from currentSubmissionId
        const projectStoragePath =
          (useConceptMapStore.getState() as ConceptMapState).mapData
            .projectFileStoragePath || // Check if already in mapData
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
          (
            useConceptMapStore.getState() as ConceptMapState
          ).setProjectOverviewData({
            overallSummary:
              'Project source information is unclear. Cannot generate a detailed AI overview for this map at the moment.',
            keyModules: [],
            error: 'Project source path not found.',
          });
          return; // Prevent calling fetchProjectOverview with bad path
        }

        const overviewInput: {
          projectStoragePath: string;
          userGoals: string;
        } = {
          projectStoragePath,
          userGoals:
            "Provide a high-level overview of this project's structure and purpose.",
        };
        fetchProjectOverview(overviewInput);
      } else if (!currentSubmissionId && storeMapData.nodes.length > 0) {
        toast({
          title: 'Overview Mode',
          description:
            'Generating a basic overview from current map content...',
          variant: 'default',
        });

        (
          useConceptMapStore.getState() as ConceptMapState
        ).setProjectOverviewData({
          overallSummary:
            'This is an overview based on the current concepts on your map. For a more detailed AI analysis, please upload a project.',
          keyModules: storeMapData.nodes
            .slice(0, Math.min(5, storeMapData.nodes.length))
            .map((n: ConceptMapNode) => ({
              name: n.text,
              description: n.details || 'A key concept from the map.',
              filePaths: [], // Add required filePaths property
            })),
          moduleConnections: [], // Add required moduleConnections property
        });
      } else {
        toast({
          title: 'Overview Mode',
          description:
            'No project context or map content to generate an overview from.',
          variant: 'default',
        });

        (
          useConceptMapStore.getState() as ConceptMapState
        ).setProjectOverviewData({
          overallSummary:
            'No content available to generate an overview. Try uploading a project or adding nodes to your map.',
          keyModules: [],
          moduleConnections: [], // Add required moduleConnections property
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

  return {
    handleToggleOverviewMode,
  };
};
