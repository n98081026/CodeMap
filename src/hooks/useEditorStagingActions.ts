import { useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseEditorStagingActionsProps {
  storeStagedMapData: any;
  commitStagedMapData: () => void;
  clearStagedMapData: () => void;
}

export const useEditorStagingActions = ({
  storeStagedMapData,
  commitStagedMapData,
  clearStagedMapData,
}: UseEditorStagingActionsProps) => {
  const { toast } = useToast();

  const handleCommitStagedData = useCallback(() => {
    commitStagedMapData();
    toast({ 
      title: 'Staged items added to map.',
      description: 'All staged elements have been committed to the main map.',
    });
  }, [commitStagedMapData, toast]);

  const handleClearStagedData = useCallback(() => {
    clearStagedMapData();
    toast({ 
      title: 'Staging area cleared.',
      description: 'All staged elements have been removed.',
    });
  }, [clearStagedMapData, toast]);

  const stagedItemCount = useMemo(
    () => ({
      nodes: storeStagedMapData?.nodes?.length || 0,
      edges: storeStagedMapData?.edges?.length || 0,
    }),
    [storeStagedMapData]
  );

  return {
    handleCommitStagedData,
    handleClearStagedData,
    stagedItemCount,
  };
};