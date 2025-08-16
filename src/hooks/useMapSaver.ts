import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';

import type { User } from '@/types';

import { useToast } from '@/hooks/use-toast';
import {
  createConceptMap,
  updateConceptMap,
} from '@/services/conceptMaps/conceptMapService';
import { useMapDataStore } from '@/stores/map-data-store';
import { useMapMetaStore } from '@/stores/map-meta-store';

interface UseMapSaverProps {
  user: User | null;
}

export function useMapSaver({ user }: UseMapSaverProps) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const {
    mapId: storeMapId,
    isNewMapMode,
    mapName,
    isPublic,
    sharedWithClassroomId,
    setLoadedMap,
    setIsLoading,
    addDebugLog,
    setError,
  } = useMapMetaStore();
  const { mapData } = useMapDataStore();

  const saveMap = useCallback(
    async (isViewOnlyParam: boolean) => {
      if (!user) {
        toast({
          title: 'Authentication Error',
          description: 'You must be logged in to save a map.',
          variant: 'destructive',
        });
        return;
      }
      if (!mapName.trim()) {
        toast({
          title: 'Map Name Required',
          description: 'Please enter a name for your map before saving.',
          variant: 'destructive',
        });
        return;
      }

      setIsLoading(true);
      addDebugLog(
        `[DataManager saveMap V3] Attempting to save. isNewMapMode: ${isNewMapMode}`
      );

      try {
        if (isNewMapMode) {
          const newMap = await createConceptMap(
            mapName,
            user.id,
            mapData,
            isPublic,
            sharedWithClassroomId
          );
          if (!newMap) {
            throw new Error('Failed to create new map. Result was null.');
          }
          addDebugLog(
            `[DataManager saveMap V3] Map created with ID: ${newMap.id}`
          );
          setLoadedMap(newMap, isViewOnlyParam);
          toast({
            title: 'Map Saved',
            description: `"${mapName}" has been saved successfully.`,
          });
          if (!pathname.includes(newMap.id)) {
            router.push(`/concept-maps/editor/${newMap.id}`);
          }
        } else if (storeMapId) {
          const updatedMap = await updateConceptMap(storeMapId, {
            ownerId: user.id, // Add ownerId for authorization
            name: mapName,
            mapData,
            isPublic,
            sharedWithClassroomId,
          });
          if (!updatedMap) {
            throw new Error('Failed to update map. Result was null.');
          }
          addDebugLog(
            `[DataManager saveMap V3] Map updated for ID: ${storeMapId}`
          );
          setLoadedMap(updatedMap, isViewOnlyParam);
          toast({
            title: 'Map Saved',
            description: `"${mapName}" has been saved successfully.`,
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'An unknown error occurred.';
        addDebugLog(`[DataManager saveMap V3] Save failed: ${errorMessage}`);
        setError(errorMessage);
        toast({
          title: 'Save Failed',
          description: errorMessage,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
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
      setIsLoading,
      addDebugLog,
      toast,
      setLoadedMap,
      setError,
      pathname,
      router,
    ]
  );

  return { saveMap };
}
