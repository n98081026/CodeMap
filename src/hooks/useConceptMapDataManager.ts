
"use client";

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_USER_FOR_TESTING_MAPS } from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string;
  user: User | null;
}

export function useConceptMapDataManager({ routeMapIdFromProps, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    mapId: storeMapId,
    mapName, // Needed for saveMap
    currentMapOwnerId,
    currentMapCreatedAt, // Needed for saveMap (mock)
    isPublic, // Needed for saveMap
    sharedWithClassroomId, // Needed for saveMap
    isNewMapMode,
    mapData, // Needed for saveMap
    isLoading, // For logging and conditional logic, but NOT for main useEffect dep array
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError: setStoreError,
    temporalStoreAPI,
  } = useConceptMapStore();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    setIsLoading(true); // Set loading true at the start
    setStoreError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;
    // console.log(`[DataManager loadMapDataInternal] Called for ID: '${idToLoad}'. User: ${effectiveUserForLoadHook?.id}`);

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
          // console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
          setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]); // This sets isLoading: false
          temporalStoreAPI.getState().clear();
          return; // Return early
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        // console.error("[DataManager loadMapDataInternal] User not authenticated. Cannot load map.");
        setStoreError("User not authenticated. Cannot load map.");
        setIsLoading(false); // Explicitly set loading false
        return;
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        // console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id); // This also sets isLoading to false
          temporalStoreAPI.getState().clear();
        } else {
          setStoreError(errorMsg);
          setIsLoading(false); // Explicitly set loading false
        }
        return;
      }
      const data: ConceptMap = await response.json();
      // console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data); // This sets isLoading to false
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      // console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      setStoreError(errorMsg);
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
      setIsLoading(false); // Explicitly set loading false on error
    }
  }, [
    user?.id, // Changed from user to user?.id
    setIsLoading, // Store action
    setStoreError, // Store action
    setLoadedMap, // Store action
    temporalStoreAPI, // Stable store part
    toast, // Assuming stable for now
    initializeNewMap, // Store action
    // BYPASS_AUTH_FOR_TESTING and MOCK constants are stable and don't need to be in deps
  ]);

  useEffect(() => {
    // console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${routeMapIdFromProps}', effectiveUserId: '${effectiveUserId}', store (mapId:'${storeMapId}', isNew:${isNewMapMode}, owner:'${currentMapOwnerId}', isLoading:${isLoading})`);

    // Critical Guard: If routeMapIdFromProps is not yet available, do nothing.
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
      // console.log("[DataManager useEffect] Guard: routeMapIdFromProps is falsy or empty. Doing nothing, awaiting router update or page redirect.");
      // If isLoading is true, it implies an operation was expected. If routeMapId is missing, an operation might not complete.
      // However, if the store's isLoading is true and we exit here, it might remain true.
      // This situation means the page is expecting a routeMapId but hasn't received one.
      // If isLoading is true, and this condition is met, perhaps it means the very first effect run
      // where `isLoading` might be true from the store's initial state, and `routeMapId` is not yet ready.
      // We should not set isLoading to false here generally, as this effect might re-run with a valid routeMapId.
      // Exception: If it's not loading AND we have no routeMapId, we are in a stable "no action" state.
      if (!isLoading) {
          // This is a no-op state, ensure isLoading is false if it wasn't already.
          // This might be redundant if other paths handle it.
      }
      return;
    }

    if (!effectiveUserId) {
      // console.log('[DataManager useEffect] Guard: User not available. Setting isLoading to false.');
      if (isLoading) setIsLoading(false); // Stop loading if no user
      return;
    }

    // Case 1: The URL explicitly targets a new map.
    if (routeMapIdFromProps === 'new') {
      const isAlreadyInCorrectNewMapState = isNewMapMode && (storeMapId === 'new' || storeMapId === null) && currentMapOwnerId === effectiveUserId;
      if (!isAlreadyInCorrectNewMapState) {
        // console.log(`[DataManager useEffect] Action: Initializing NEW map for user: '${effectiveUserId}'. routeMapIdProp is 'new'.`);
        initializeNewMap(effectiveUserId); // This action sets isLoading to false.
        temporalStoreAPI.getState().clear();
      } else {
        // console.log(`[DataManager useEffect] Info: Already in NEW map state for user: '${effectiveUserId}'. No re-initialization.`);
        if (isLoading) setIsLoading(false); // Ensure loading is false if already in correct state.
      }
    }
    // Case 2: The URL targets a specific, existing map ID.
    else {
      const needsToLoad = storeMapId !== routeMapIdFromProps || isNewMapMode;
      if (needsToLoad) {
        // console.log(`[DataManager useEffect] Action: Loading map ID: '${routeMapIdFromProps}'.`);
        loadMapDataInternal(routeMapIdFromProps); // This action manages its own isLoading states.
      } else {
        // console.log(`[DataManager useEffect] Info: Map ID '${routeMapIdFromProps}' correctly loaded in store. No re-load.`);
        if (isLoading) setIsLoading(false); // Ensure loading is false if map is already correctly loaded.
      }
    }
  }, [
    routeMapIdFromProps,
    user?.id, // Main user dependency for effectiveUserId
    // Store values that indicate if re-evaluation is needed:
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    // Store actions (should be stable references from zustand):
    initializeNewMap,
    loadMapDataInternal, // The function itself, re-created if its deps change
    setIsLoading,
    // Other stable dependencies:
    temporalStoreAPI,
    // BYPASS_AUTH_FOR_TESTING, // effectiveUserId already incorporates this
  ]);


  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUserForSave) {
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v2_${Date.now()}`;
        // console.log(`[DataManager saveMap] BYPASS: Saving map ID: ${mapIdToSave}, Name: ${mapName}`);
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
           router.replace(`/application/concept-maps/editor/${mapIdToSave}${isViewOnlyParam ? '?viewOnly=true' : ''}`, { scroll: false });
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
    setIsLoading(true); // Use general isLoading from store for save operation
    // console.log(`[DataManager saveMap] Attempting to save map. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}`);

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId || currentMapOwnerId === 'new') ? effectiveUserForSave.id : currentMapOwnerId;

    const payload = {
      name: mapName,
      ownerId: payloadOwnerId,
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new' || storeMapId === null) ? null : storeMapId;
      // console.log(`[DataManager saveMap] currentMapIdForAPI: ${currentMapIdForAPI}`);

      if (!currentMapIdForAPI) {
        // console.log("[DataManager saveMap] Creating NEW map via POST /api/concept-maps");
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName, mapData: mapData, isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId, ownerId: payloadOwnerId, // ownerId is used by service for auth check
        };
        // console.log(`[DataManager saveMap] Updating EXISTING map via PUT /api/concept-maps/${currentMapIdForAPI}`, updatePayload);
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        // console.error("[DataManager saveMap] Save error response:", errorData);
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      // console.log("[DataManager saveMap] Save successful. Saved map data:", savedMapData);
      setLoadedMap(savedMapData); // This sets isLoading to false
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         // console.log(`[DataManager saveMap] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${isViewOnlyParam ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      // console.error("[DataManager saveMap] Catch block error:", errorMsg);
      setStoreError(errorMsg);
      toast({ title: "Error Saving Map", description: errorMsg, variant: "destructive" });
      setIsLoading(false); // Ensure isLoading is false on error during save
    }
    // setIsLoading(false) is handled by setLoadedMap or catch block for save
  }, [
    user?.id, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt,
    router, toast, setIsLoading, setLoadedMap, setStoreError, temporalStoreAPI,
    // BYPASS_AUTH_FOR_TESTING and MOCK constants are stable
  ]);

  return { saveMap, loadMapData: loadMapDataInternal };
}
