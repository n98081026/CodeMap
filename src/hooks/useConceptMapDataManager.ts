
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_CONCEPT_MAP_STUDENT_V2 } from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapId?: string; // This comes from page params
  user: User | null;
}

const MOCK_USER_FOR_TESTING_MAPS: { [key: string]: ConceptMap } = {
    [MOCK_CONCEPT_MAP_STUDENT_V2.id]: MOCK_CONCEPT_MAP_STUDENT_V2,
};


export function useConceptMapDataManager({ routeMapId, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    mapData,
    initializeNewMap,
    setLoadedMap,
    setIsLoading, 
    setIsSaving: setStoreIsSaving,
    setError: setStoreError,
    temporalStoreAPI, 
  } = useConceptMapStore();
  
  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;


  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    const effectiveUserForLoad = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    setIsLoading(true); 
    setStoreError(null);

    if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
        temporalStoreAPI.getState().clear();
        setIsLoading(false);
        return;
    }

    if (!effectiveUserForLoad?.id && !BYPASS_AUTH_FOR_TESTING) {
      setStoreError("User not authenticated. Cannot load map.");
      setIsLoading(false);
      return;
    }
    
    if (!idToLoad || idToLoad.trim() === '' || idToLoad === "new") { 
      if (idToLoad === "new" && effectiveUserForLoad?.id) {
        initializeNewMap(effectiveUserForLoad.id);
        temporalStoreAPI.getState().clear();
      } else if (effectiveUserForLoad?.id) {
        initializeNewMap(effectiveUserForLoad.id);
        temporalStoreAPI.getState().clear();
      } else {
         setStoreError("Cannot initialize/load map: User not found or invalid Map ID.");
      }
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        if (effectiveUserForLoad?.id) {
          initializeNewMap(effectiveUserForLoad.id); 
          temporalStoreAPI.getState().clear();
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map instead. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
        } else {
          throw new Error(errData.message || "Failed to load map and no user for new map fallback");
        }
        return; 
      }
      const data: ConceptMap = await response.json();
      setLoadedMap(data);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, initializeNewMap, setLoadedMap, setStoreError, setIsLoading, toast, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING]);

  const saveMap = useCallback(async (isViewOnly: boolean) => {
    if (isViewOnly) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUserForSave) {
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v2_${Date.now()}`;
        
        MOCK_USER_FOR_TESTING_MAPS[mapIdToSave] = { 
            id: mapIdToSave,
            name: mapName,
            ownerId: effectiveUserForSave.id,
            mapData,
            isPublic,
            sharedWithClassroomId,
            createdAt: currentMapCreatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]); 
        if (isNewMapMode || storeMapId === 'new') {
           router.replace(`/application/concept-maps/editor/${mapIdToSave}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
        }
        toast({ title: "Map Saved (Mocked)", description: `"${mapName}" changes saved locally for bypass mode.` });
        return;
    }

    if (!effectiveUserForSave) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? effectiveUserForSave.id : currentMapOwnerId;

    const payload = {
      name: mapName,
      ownerId: payloadOwnerId,
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new') ? null : storeMapId;

      if (!currentMapIdForAPI) {
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName,
            mapData: mapData,
            isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: payloadOwnerId, 
        };
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      setLoadedMap(savedMapData); 
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new') && savedMapData.id) {
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, currentMapCreatedAt, storeMapId,
    router, toast, setStoreIsSaving, setLoadedMap, setStoreError, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING
  ]);

  useEffect(() => {
    const userIdToInit = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

    if (!routeMapId || routeMapId.trim() === "") {
      return; 
    }

    if (!userIdToInit) {
      // console.log('[ConceptMapDataManager] User not available, skipping map data management.');
      if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      return;
    }

    const storeState = useConceptMapStore.getState();
    const currentStoreMapId = storeState.mapId;
    const currentIsNewMapMode = storeState.isNewMapMode;
    const currentOwnerIdInStore = storeState.currentMapOwnerId;

    if (routeMapId === 'new') {
      const isAlreadyInNewMapState =
        currentIsNewMapMode &&
        (currentStoreMapId === 'new' || currentStoreMapId === null) &&
        currentOwnerIdInStore === userIdToInit;

      if (!isAlreadyInNewMapState) {
        initializeNewMap(userIdToInit);
        temporalStoreAPI.getState().clear();
      } else {
        if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      }
    } else { // routeMapId is a specific ID
      const needsToLoad = currentStoreMapId !== routeMapId || currentIsNewMapMode;
      if (needsToLoad) {
        loadMapDataInternal(routeMapId);
      } else {
        if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      }
    }
  }, [
    routeMapId, 
    user?.id, // Still need user?.id to derive userIdToInit correctly.
    initializeNewMap, // This is a stable function from the store.
    // loadMapDataInternal is called directly, so it's not needed in deps.
    storeMapId, 
    isNewMapMode, 
    currentMapOwnerId, 
    setIsLoading, 
    temporalStoreAPI, 
    BYPASS_AUTH_FOR_TESTING,
    loadMapDataInternal // Added loadMapDataInternal because it's used in the effect
  ]);
  
  return { saveMap, loadMapData: loadMapDataInternal };
}

