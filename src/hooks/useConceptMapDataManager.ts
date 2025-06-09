
"use client";

import { useCallback, useEffect }
from 'react';
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
    setIsLoading, // Adjusted to use setIsLoading from store correctly
    setIsSaving: setStoreIsSaving,
    setError: setStoreError,
    temporalStoreAPI, // Get temporal API from store
  } = useConceptMapStore();
  

  useEffect(() => {
    const userIdToInit = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

    // --- Critical Guard Clause ---
    // If routeMapId is not yet available from the router (undefined, null, or empty string), do nothing.
    // This prevents incorrect actions during transient states in page transitions.
    // The effect will re-run once props.routeMapId provides the actual value.
    if (!routeMapId || routeMapId.trim() === "") {
      // If there's no routeMapId AT ALL (e.g. navigating to /editor),
      // and the store isn't already on a 'new' map, this might be a place to initialize.
      // However, the NewConceptMapPage component should handle redirecting to /editor/new.
      // This hook should primarily react to the routeMapId it's given.
      // If no routeMapId means 'new map by default', that logic would be here.
      // For now, we assume a valid routeMapId ('new' or an ID) is required for action.
      // console.log('[ConceptMapDataManager] useEffect: No valid routeMapId, returning early.');
      if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      return;
    }

    if (!userIdToInit) {
      // console.log('[ConceptMapDataManager] useEffect: User not available, skipping map data management.');
      if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      return;
    }

    // Case 1: The URL is for a new map.
    if (routeMapId === 'new') {
      const isAlreadyInNewMapState =
        isNewMapMode &&
        (storeMapId === 'new' || storeMapId === null) && // Check for both 'new' and null
        currentMapOwnerId === userIdToInit;

      if (!isAlreadyInNewMapState) {
        // console.log(`[ConceptMapDataManager] useEffect: Initializing new map for user: ${userIdToInit}`);
        initializeNewMap(userIdToInit);
        temporalStoreAPI.getState().clear();
      } else {
        // console.log('[ConceptMapDataManager] useEffect: Already in new map state, setting loading false.');
        if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      }
    }
    // Case 2: The URL is for a specific, existing map.
    else { // routeMapId is defined and not 'new'
      const needsToLoad = storeMapId !== routeMapId || isNewMapMode;
      if (needsToLoad) {
        // console.log(`[ConceptMapDataManager] useEffect: Loading map data for mapId: ${routeMapId}`);
        // loadMapData itself will set isLoading to true at its start and false at its end.
        loadMapData(routeMapId);
      } else {
        // console.log('[ConceptMapDataManager] useEffect: Map already loaded, setting loading false.');
        if (useConceptMapStore.getState().isLoading) setIsLoading(false);
      }
    }
  }, [
    routeMapId, 
    user?.id, // Use user?.id directly as userIdToInit is derived from it
    initializeNewMap, 
    loadMapData, 
    storeMapId, 
    isNewMapMode, 
    currentMapOwnerId, 
    setIsLoading, 
    BYPASS_AUTH_FOR_TESTING, 
    temporalStoreAPI
  ]);


  const loadMapData = useCallback(async (idToLoad: string) => {
    const effectiveUser = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    setIsLoading(true); // Moved setIsLoading to the beginning of loadMapData
    setStoreError(null);

    if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        // console.warn(`BYPASS_AUTH: Loading mock map for ID ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
        temporalStoreAPI.getState().clear();
        setIsLoading(false);
        return;
    }
    // BYPASS_AUTH_FOR_TESTING for 'new' is handled in the main useEffect now.

    if (!effectiveUser?.id && !BYPASS_AUTH_FOR_TESTING) {
      setStoreError("User not authenticated. Cannot load map.");
      setIsLoading(false);
      return;
    }
    
    // This check is now less critical here due to main useEffect, but kept for direct calls to loadMapData
    if (!idToLoad || idToLoad.trim() === '' || idToLoad === "new") { 
      if (idToLoad === "new" && effectiveUser?.id) {
        initializeNewMap(effectiveUser.id);
        temporalStoreAPI.getState().clear();
      } else if (effectiveUser?.id) {
        // Fallback if called with empty ID but not 'new' - should ideally not happen
        initializeNewMap(effectiveUser.id);
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
        // If map load fails, fall back to a new map for the current user IF they exist
        if (effectiveUser?.id) {
          initializeNewMap(effectiveUser.id); 
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
    const effectiveUser = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUser) {
        // console.warn("BYPASS_AUTH: Simulating map save for map:", mapName);
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v2_${Date.now()}`;
        
        MOCK_USER_FOR_TESTING_MAPS[mapIdToSave] = { 
            id: mapIdToSave,
            name: mapName,
            ownerId: effectiveUser.id,
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


    if (!effectiveUser) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? effectiveUser.id : currentMapOwnerId;

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
  
  return { saveMap, loadMapData };
}

