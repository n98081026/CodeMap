
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Added useParams
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_STUDENT_USER_V3,
  MOCK_USER_FOR_TESTING_MAPS
} from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string; // This will now be the primary source for routeMapId
  user: User | null;
}

export function useConceptMapDataManager({ routeMapIdFromProps, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();
  const paramsHook = useParams(); // Use params from Next.js for initial check

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    // currentMapCreatedAt, // Not directly used in this hook's logic beyond setLoadedMap
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    isViewOnlyMode: isViewOnlyModeInStore,
    mapData,
    isLoading,
    initialLoadComplete, // Get new state
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    setIsViewOnlyMode,
    setInitialLoadComplete, // Get new action
    addDebugLog,
  } = useConceptMapStore();

  const loadMapDataInternal = useCallback(async (idToLoad: string, targetViewOnlyMode: boolean) => {
    const effectiveUserForLoadHookId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);

    addDebugLog(`[DataManager loadMapDataInternal V10] Called with ID: '${idToLoad}', TargetViewOnly: ${targetViewOnlyMode}. User: ${effectiveUserForLoadHookId}`);
    setIsLoading(true);
    setError(null);
    setInitialLoadComplete(false); // Reset on new load attempt

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new') {
        addDebugLog(`[DataManager loadMapDataInternal V10] BYPASS: Attempting to load mock map for ID: ${idToLoad}`);
        let mockMapToLoad: ConceptMap | undefined = undefined;

        if (MOCK_USER_FOR_TESTING_MAPS && typeof MOCK_USER_FOR_TESTING_MAPS === 'object') {
            mockMapToLoad = MOCK_USER_FOR_TESTING_MAPS[idToLoad];
        }

        if (mockMapToLoad) {
            setLoadedMap(mockMapToLoad, targetViewOnlyMode); // setLoadedMap now also sets initialLoadComplete = true
            useConceptMapStore.temporal.getState().clear();
        } else {
            const reason = (MOCK_USER_FOR_TESTING_MAPS && typeof MOCK_USER_FOR_TESTING_MAPS === 'object')
                ? `Mock map for ID '${idToLoad}' NOT FOUND in MOCK_USER_FOR_TESTING_MAPS.`
                : "MOCK_USER_FOR_TESTING_MAPS object is not available or not an object for bypass.";
            addDebugLog(`[DataManager loadMapDataInternal V10] BYPASS: ${reason}`);
            const errorMsg = `Bypass Mode: ${reason}`;
            setError(errorMsg);
            if (effectiveUserForLoadHookId) {
                initializeNewMap(effectiveUserForLoadHookId); // initializeNewMap also sets initialLoadComplete = true
                toast({ title: "Map Not Found (Bypass)", description: `Mock map '${idToLoad}' is not defined. Displaying a new map.`, variant: "destructive"});
            } else {
                toast({ title: "Map Not Found (Bypass)", description: `Mock map '${idToLoad}' not found and no user context for new map.`, variant: "destructive"});
            }
        }
        return;
      }

      if (!effectiveUserForLoadHookId && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        addDebugLog(`[DataManager loadMapDataInternal V10] ${authErrorMsg}`);
        setError(authErrorMsg);
        throw new Error(authErrorMsg);
      }

      addDebugLog(`[DataManager loadMapDataInternal V10] Fetching from API: /api/concept-maps/${idToLoad}`);
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        addDebugLog(`[DataManager loadMapDataInternal V10] ${errorMsg}`);

        if (effectiveUserForLoadHookId) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHookId); // Sets initialLoadComplete = true
          if (useConceptMapStore.getState().isViewOnlyMode !== targetViewOnlyMode) {
            setIsViewOnlyMode(targetViewOnlyMode);
          }
        } else {
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        return;
      }
      const data: ConceptMap = await response.json();
      addDebugLog(`[DataManager loadMapDataInternal V10] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, targetViewOnlyMode); // Sets initialLoadComplete = true
      useConceptMapStore.temporal.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager loadMapDataInternal V10] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHookId && errorMsg.includes("Cannot load map."))) {
        setError(errorMsg);
      }
      // Do not set initialLoadComplete to true here on error path unless a new map is initialized.
      // initializeNewMap and setLoadedMap handle setting it true on success.
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      addDebugLog(`[DataManager loadMapDataInternal V10] Finished for ID: '${idToLoad}', isLoading set to false.`);
    }
  }, [
      user, setIsLoading, setError, setInitialLoadComplete, setLoadedMap, toast, initializeNewMap, setIsViewOnlyMode, addDebugLog
    ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);
    const currentViewOnlyQueryParam = paramsHook.viewOnly === 'true';

    addDebugLog(`[DataManager useEffect V10] RUNNING: RouteID='${routeMapIdFromProps}', Store(ID='${storeMapId}', isNew=${isNewMapMode}, Owner='${currentMapOwnerId}', isLoading=${isLoading}, initComp=${initialLoadComplete}, viewOnly=${isViewOnlyModeInStore}). EffectiveUser='${effectiveUserId}', URLViewOnly=${currentViewOnlyQueryParam}`);

    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
      addDebugLog('[DataManager useEffect V10] Guard: routeMapIdFromProps is falsy or empty. Waiting.');
      return;
    }

    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
      addDebugLog('[DataManager useEffect V10] Guard: User not available (and not in bypass). Aborting.');
      setError("User not authenticated. Cannot perform map operations.");
      if (isLoading) setIsLoading(false);
      if (!initialLoadComplete) setInitialLoadComplete(true); // Consider this state "complete" in terms of auth failure
      return;
    }

    // Sync store's viewOnlyMode with URL if they differ
    if (isViewOnlyModeInStore !== currentViewOnlyQueryParam) {
        addDebugLog(`[DataManager useEffect V10] Syncing viewOnlyMode in store. Param: ${currentViewOnlyQueryParam}, Store: ${isViewOnlyModeInStore}`);
        setIsViewOnlyMode(currentViewOnlyQueryParam);
        // This state change will cause a re-run of the useEffect. Return to process with synced state.
        return;
    }

    if (routeMapIdFromProps === 'new') {
      const storeIsAlreadyCorrectForNewMap = 
        isNewMapMode && 
        storeMapId === 'new' && 
        currentMapOwnerId === effectiveUserId &&
        initialLoadComplete; // Ensure init has actually finished

      if (!storeIsAlreadyCorrectForNewMap) {
        addDebugLog(`[DataManager useEffect V10] Action: Initializing NEW map for user '${effectiveUserId}'. Store state: (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId}, initComp: ${initialLoadComplete})`);
        initializeNewMap(effectiveUserId); // This sets initialLoadComplete = true & isLoading = false
        useConceptMapStore.temporal.getState().clear();
      } else {
        addDebugLog(`[DataManager useEffect V10] Info: Store already correct for new map by user '${effectiveUserId}'. (initComp: ${initialLoadComplete})`);
        if (isLoading) {
           addDebugLog('[DataManager useEffect V10] Cleanup: New map correct, but isLoading=true. Setting isLoading=false.');
           setIsLoading(false); // Ensure loading is false if state is already correct
        }
      }
      return;
    }

    if (routeMapIdFromProps && routeMapIdFromProps !== 'new') {
      const storeIsAlreadyCorrectForExistingMap =
        storeMapId === routeMapIdFromProps &&
        !isNewMapMode &&
        currentMapOwnerId === effectiveUserId &&
        !isLoading && 
        initialLoadComplete;

      addDebugLog(`[DataManager useEffect V10] DEBUG Existing: RouteID='${routeMapIdFromProps}'. Store: (mapId=${storeMapId}, isNew=${isNewMapMode}, owner=${currentMapOwnerId}, isLoading=${isLoading}, initComp=${initialLoadComplete}). Condition for load: ${!storeIsAlreadyCorrectForExistingMap}`);

      if (!storeIsAlreadyCorrectForExistingMap) {
        addDebugLog(`[DataManager useEffect V10] Action: Loading existing map '${routeMapIdFromProps}' for user '${effectiveUserId}'. TargetViewOnly: ${isViewOnlyModeInStore}`);
        loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore);
      } else {
        addDebugLog(`[DataManager useEffect V10] Info: Map ID '${routeMapIdFromProps}' already loaded and ready for user '${effectiveUserId}'. No re-load needed.`);
        if (isLoading) { // Should not happen if storeIsAlreadyCorrectForExistingMap is true
          addDebugLog('[DataManager useEffect V10] Cleanup: Existing map correct, but isLoading=true. Setting isLoading=false.');
          setIsLoading(false);
        }
      }
      return;
    }

    if (!routeMapIdFromProps && isLoading) {
        addDebugLog('[DataManager useEffect V10] Fallback: routeMapIdFromProps is empty, ensuring isLoading is false.');
        setIsLoading(false);
    }

  }, [
    routeMapIdFromProps, user, storeMapId, isNewMapMode, currentMapOwnerId, isLoading, initialLoadComplete, isViewOnlyModeInStore, // Core state dependencies
    initializeNewMap, setIsLoading, setError, addDebugLog, setInitialLoadComplete, setIsViewOnlyMode, paramsHook.viewOnly // Actions and query param for viewOnly sync
  ]);

  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        addDebugLog("[DataManager saveMap V3] Attempted save in view-only mode. Aborted.");
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3 ?? null) : user;

    if (!effectiveUserForSave) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        addDebugLog("[DataManager saveMap V3] Auth Error: No user to save map.");
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        addDebugLog("[DataManager saveMap V3] Validation Error: Map name required.");
        return;
    }

    setIsLoading(true);
    addDebugLog(`[DataManager saveMap V3] Attempting to save. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}, Owner: ${effectiveUserForSave.id}`);

    const payload = {
      name: mapName,
      ownerId: effectiveUserForSave.id,
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new' || storeMapId === null) ? null : storeMapId;
      addDebugLog(`[DataManager saveMap V3] currentMapIdForAPI: ${currentMapIdForAPI}`);

      if (!currentMapIdForAPI) {
        addDebugLog("[DataManager saveMap V3] Creating NEW map via POST /api/concept-maps");
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName, mapData: mapData, isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: effectiveUserForSave.id,
        };
        addDebugLog(`[DataManager saveMap V3] Updating EXISTING map via PUT /api/concept-maps/${currentMapIdForAPI}`);
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        addDebugLog(`[DataManager saveMap V3] Save error response: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      addDebugLog(`[DataManager saveMap V3] Save successful. Saved map data: ID ${savedMapData.id}`);

      const currentViewOnlyModeInStore = useConceptMapStore.getState().isViewOnlyMode;
      setLoadedMap(savedMapData, currentViewOnlyModeInStore);
      useConceptMapStore.temporal.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         addDebugLog(`[DataManager saveMap V3] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${currentViewOnlyModeInStore ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager saveMap V3] Catch block error: ${errorMsg}`);
      setError(errorMsg);
      toast({ title: "Save Failed", description: errorMsg, variant: "destructive" });
    } finally {
        setIsLoading(false);
        addDebugLog(`[DataManager saveMap V3] Finished save attempt, isLoading set to false.`);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, storeMapId,
    router, toast, setIsLoading, setLoadedMap, setError, addDebugLog
  ]);

  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}
