import { useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

import type { ConceptMap, User } from '@/types';

import { useToast } from '@/hooks/use-toast';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER } from '@/lib/config';
import * as mapService from '@/services/conceptMaps/conceptMapService';
import useConceptMapStore from '@/stores/concept-map-store';

interface UseMapSaverProps {
  user: User | null;
}

export function useMapSaver({ user }: UseMapSaverProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const {
    mapId: storeMapId,
    mapName,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    mapData,
    setLoadedMap,
    setIsLoading,
    setError,
    addDebugLog,
  } = useConceptMapStore();

  const saveMap = useCallback(
    async (isViewOnlyParam: boolean) => {
      console.log('saveMap called with isViewOnlyParam:', isViewOnlyParam);
      if (isViewOnlyParam) {
        toast({
          title: 'View Only Mode',
          description: 'Cannot save changes in view-only mode.',
          variant: 'default',
        });
        addDebugLog(
          '[DataManager saveMap V3] Attempted save in view-only mode. Aborted.'
        );
        return;
      }
      const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING
        ? (MOCK_STUDENT_USER ?? null)
        : user;

      if (!effectiveUserForSave) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to save a map.',
          variant: 'destructive',
        });
        addDebugLog(
          '[DataManager saveMap V3] Auth Error: No user to save map.'
        );
        return;
      }
      if (!mapName.trim()) {
        toast({
          title: 'Map Name Required',
          description: 'Please provide a name for your concept map.',
          variant: 'destructive',
        });
        addDebugLog(
          '[DataManager saveMap V3] Validation Error: Map name required.'
        );
        return;
      }

      setIsLoading(true);
      addDebugLog(
        `[DataManager saveMap V3] Attempting to save. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}, Owner: ${effectiveUserForSave.id}`
      );

      const payload = {
        name: mapName,
        ownerId: effectiveUserForSave.id as string | null,
        mapData: mapData,
        isPublic: isPublic,
        sharedWithClassroomId: sharedWithClassroomId,
      };

      try {
        let savedMapData: ConceptMap;
        if (isNewMapMode || storeMapId === 'new' || storeMapId === null) {
          savedMapData = await mapService.createConceptMap(payload);
        } else {
          savedMapData = await mapService.updateConceptMap(
            storeMapId,
            payload as any
          );
        }

        const currentViewOnlyModeInStore =
          useConceptMapStore.getState().isViewOnlyMode;
        setLoadedMap(savedMapData, currentViewOnlyModeInStore);
        useConceptMapStore.temporal.getState().clear();
        toast({
          title: 'Map Saved',
          description: `"${savedMapData.name}" has been saved successfully.`,
        });

        if (
          (isNewMapMode || storeMapId === 'new' || storeMapId === null) &&
          savedMapData.id
        ) {
          addDebugLog(
            `[DataManager saveMap V3] New map saved, redirecting to /editor/${savedMapData.id}`
          );
          const newPath = pathname.replace(/(new|map-\w+)/, savedMapData.id);
          router.replace(
            `${newPath}${currentViewOnlyModeInStore ? '?viewOnly=true' : ''}`,
            { scroll: false }
          );
        }
      } catch (err) {
        const errorMsg = (err as Error).message;
        addDebugLog(`[DataManager saveMap V3] Catch block error: ${errorMsg}`);
        setError(errorMsg);
        toast({
          title: 'Save Failed',
          description: errorMsg,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        addDebugLog(
          `[DataManager saveMap V3] Finished save attempt, isLoading set to false.`
        );
      }
    },
    [
      user,
      mapName,
      mapData,
      isPublic,
      sharedWithClassroomId,
      isNewMapMode,
      storeMapId,
      router,
      toast,
      setIsLoading,
      setLoadedMap,
      setError,
      addDebugLog,
      pathname,
    ]
  );

  return { saveMap };
}
