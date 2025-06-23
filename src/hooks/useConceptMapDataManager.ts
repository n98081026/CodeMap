
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

    // Guard against trying to API-fetch example maps directly if not in bypass mode.
    // Example maps should be loaded into the store by the ExamplesPage logic.
    if (idToLoad && idToLoad.startsWith('example-') && !BYPASS_AUTH_FOR_TESTING) {
      addDebugLog(`[DataManager loadMapDataInternal V12] Attempt to load example map '${idToLoad}' via API. This path should ideally be avoided if data is pre-loaded by ExamplesPage.`);

      const store = useConceptMapStore.getState();
      // Check if the map is already in the store and matches the idToLoad
      if (store.mapId === idToLoad && store.mapData && store.mapData.nodes && store.mapData.nodes.length > 0) {
        addDebugLog(`[DataManager loadMapDataInternal V12] Data for example map '${idToLoad}' is already present in the store. Using store data.`);
        // Ensure the store's viewOnlyMode is respected or updated if needed, though targetViewOnlyMode is passed.
        // setLoadedMap(store, targetViewOnlyMode); // Re-affirm store state. setLoadedMap also sets initialLoadComplete.
        // No, setLoadedMap here might be risky if it resets things unnecessarily.
        // The main useEffect should handle setting the map if it's already in store.
        // This path in loadMapDataInternal for an example map means something unexpected happened.
        toast({ title: "Info", description: `Example map '${idToLoad}' is already available.`, variant: "default" });
      } else {
        addDebugLog(`[DataManager loadMapDataInternal V12] Data for example map '${idToLoad}' not found in store. API fetch for examples is blocked.`);
        setError(`Example map '${idToLoad}' data not found or is not meant to be fetched via API. Please navigate from the Examples gallery.`);
      }

      setIsLoading(false);
      setInitialLoadComplete(true); // Mark as complete because we are not proceeding with API fetch.
      return;
    }

    // setIsLoading(true) is called before try block
    // setError(null) is called before try block
    // setInitialLoadComplete(false) is called before try block
    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new') {
        // This BYPASS_AUTH_FOR_TESTING block should also handle example- map IDs if needed for testing.
        // If idToLoad starts with 'example-' and BYPASS_AUTH_FOR_TESTING is true, it will proceed here.
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

      let response; // Declare response outside the try block
      const controller = new AbortController();
      const signal = controller.signal;
      const FETCH_TIMEOUT = 15000; // 15 seconds

      const timeoutId = setTimeout(() => {
        addDebugLog(`[DataManager loadMapDataInternal V10] Fetch timeout triggered for ID: ${idToLoad}`);
        controller.abort();
      }, FETCH_TIMEOUT);

      try {
        addDebugLog(`[DataManager loadMapDataInternal V10] Fetching from API: /api/concept-maps/${idToLoad} with timeout.`);
        response = await fetch(`/api/concept-maps/${idToLoad}`, { signal });
        clearTimeout(timeoutId); // Clear timeout if fetch completes or errors normally
        addDebugLog(`[DataManager loadMapDataInternal V11] Raw response status for ID '${idToLoad}': ${response.status}`);
      } catch (fetchError) {
        clearTimeout(timeoutId); // Ensure timeout is cleared on any fetch error
        if ((fetchError as Error).name === 'AbortError') {
          addDebugLog(`[DataManager loadMapDataInternal V10] Fetch aborted for ID: ${idToLoad} (likely due to timeout).`);
          throw new Error(`Map load timed out for '${idToLoad}'.`);
        }
        addDebugLog(`[DataManager loadMapDataInternal V10] Fetch error for ID: ${idToLoad}: ${(fetchError as Error).message}`);
        throw fetchError; // Re-throw other fetch errors
      }

      if (!response.ok) {
        addDebugLog(`[DataManager loadMapDataInternal V11] Response not OK for ID '${idToLoad}'. Status: ${response.status}. Attempting to parse error JSON.`);
        // If response is not ok, try to parse error message, otherwise use statusText
        let errorDetail = response.statusText;
        try {
          const errData = await response.json();
          errorDetail = errData.message || errorDetail;
        } catch (parseError) {
          addDebugLog(`[DataManager loadMapDataInternal V10] Could not parse error response for ID: ${idToLoad}`);
        }
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errorDetail}`;
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
      addDebugLog(`[DataManager loadMapDataInternal V11] Parsed data for ID '${idToLoad}': Nodes count: ${data.mapData?.nodes?.length ?? 'undefined/null'}. Edges count: ${data.mapData?.edges?.length ?? 'undefined/null'}. Map name: ${data.name}`);
      addDebugLog(`[DataManager loadMapDataInternal V10] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`); // Existing log
      addDebugLog(`[DataManager loadMapDataInternal V11] Calling setLoadedMap for ID '${idToLoad}' with Nodes count: ${data.mapData?.nodes?.length ?? 'undefined/null'}. targetViewOnlyMode: ${targetViewOnlyMode}`);
      setLoadedMap(data, targetViewOnlyMode); // Sets initialLoadComplete = true
      useConceptMapStore.temporal.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager loadMapDataInternal V10] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHookId && errorMsg.includes("Cannot load map."))) {
        setError(errorMsg);
      }
      addDebugLog(`[DataManager loadMapDataInternal V10 Catch] Setting initialLoadComplete=true after error: ${errorMsg}`);
      setInitialLoadComplete(true); // Ensure load attempt is marked complete even on failure
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false); // This should always be called
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
    const { loadExampleMapData: storeLoadExampleMapData } = useConceptMapStore.getState();


    addDebugLog(`[DataManager useEffect V13] RUNNING: RouteID='${routeMapIdFromProps}', Store(ID='${storeMapId}', isNew=${isNewMapMode}, Owner='${currentMapOwnerId}', isLoading=${isLoading}, initComp=${initialLoadComplete}, viewOnly=${isViewOnlyModeInStore}). EffectiveUser='${effectiveUserId}', URLViewOnly=${currentViewOnlyQueryParam}`);

    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
      addDebugLog('[DataManager useEffect V13] Guard: routeMapIdFromProps is falsy or empty. Waiting.');
      return;
    }

    // User check is only critical if NOT loading an example map via direct link (as guests can do that)
    // and not in bypass mode.
    if (!routeMapIdFromProps.startsWith('example-') && !effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
      addDebugLog('[DataManager useEffect V13] Guard: User not available (not example, not bypass). Aborting.');
      setError("User not authenticated. Cannot perform map operations.");
      if (isLoading) setIsLoading(false);
      if (!initialLoadComplete) setInitialLoadComplete(true);
      return;
    }

    if (isViewOnlyModeInStore !== currentViewOnlyQueryParam) {
        addDebugLog(`[DataManager useEffect V13] Syncing viewOnlyMode in store. Param: ${currentViewOnlyQueryParam}, Store: ${isViewOnlyModeInStore}`);
        setIsViewOnlyMode(currentViewOnlyQueryParam);
        return;
    }

    // Handle direct loading of example maps if route indicates an example
    // and it's not already correctly loaded in the store.
    if (routeMapIdFromProps.startsWith('example-')) {
      const exampleKey = routeMapIdFromProps.substring('example-'.length);
      const isExampleCorrectlyLoaded = storeMapId === routeMapIdFromProps &&
                                      mapData.nodes.length > 0 && // Ensure it's not an empty map state
                                      initialLoadComplete &&
                                      isViewOnlyModeInStore; // Examples should be view-only

      if (!isExampleCorrectlyLoaded) {
        addDebugLog(`[DataManager useEffect V13] Action: Attempting to load example map '${exampleKey}' directly. Store state: (mapId: ${storeMapId}, nodes: ${mapData.nodes.length}, initComp: ${initialLoadComplete}, viewOnly: ${isViewOnlyModeInStore})`);
        setIsLoading(true);
        setError(null);
        setInitialLoadComplete(false);

        // Dynamically import exampleProjects to avoid circular dependency if this hook is used by example-data itself.
        // This is a common pattern for such cases.
        import('@/lib/example-data').then(module => {
          const exampleProject = module.exampleProjects.find(p => p.key === exampleKey);
          if (exampleProject) {
            fetch(exampleProject.mapJsonPath)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch example: ${response.statusText}`);
                return response.json();
              })
              .then(exampleMapData => {
                storeLoadExampleMapData(exampleMapData, exampleProject.name); // This sets viewOnly=true internally
                addDebugLog(`[DataManager useEffect V13] Example map '${exampleKey}' loaded directly.`);
              })
              .catch(err => {
                addDebugLog(`[DataManager useEffect V13] Error loading example map '${exampleKey}' directly: ${err.message}`);
                setError(`Failed to load example: ${err.message}`);
                toast({ title: "Error Loading Example", description: `Could not load example '${exampleKey}'.`, variant: "destructive" });
              })
              .finally(() => {
                setIsLoading(false);
                setInitialLoadComplete(true);
              });
          } else {
            addDebugLog(`[DataManager useEffect V13] Example project with key '${exampleKey}' not found.`);
            setError(`Example '${exampleKey}' not found.`);
            toast({ title: "Error", description: `Example '${exampleKey}' does not exist.`, variant: "destructive" });
            setIsLoading(false);
            setInitialLoadComplete(true);
          }
        }).catch(err => {
            addDebugLog(`[DataManager useEffect V13] Error importing example-data: ${err.message}`);
            setError(`Failed to load example list: ${err.message}`);
            setIsLoading(false);
            setInitialLoadComplete(true);
        });
      } else {
        addDebugLog(`[DataManager useEffect V13] Info: Example map '${exampleKey}' already correctly loaded in store.`);
        if (isLoading) setIsLoading(false); // Ensure loading is false
      }
      return; // Handled example map loading
    }


    if (routeMapIdFromProps === 'new') {
      // This requires an authenticated user (or bypass)
      if (!effectiveUserId) {
         addDebugLog('[DataManager useEffect V13] Guard: Attempt to create new map without user. Aborting.');
         setError("User not authenticated. Cannot create new map.");
         if (isLoading) setIsLoading(false);
         if (!initialLoadComplete) setInitialLoadComplete(true);
         return;
      }
      const storeIsAlreadyCorrectForNewMap = 
        isNewMapMode && storeMapId === 'new' && currentMapOwnerId === effectiveUserId && initialLoadComplete;

      if (!storeIsAlreadyCorrectForNewMap) {
        addDebugLog(`[DataManager useEffect V13] Action: Initializing NEW map for user '${effectiveUserId}'.`);
        initializeNewMap(effectiveUserId);
        useConceptMapStore.temporal.getState().clear();
      } else {
        addDebugLog(`[DataManager useEffect V13] Info: Store already correct for new map by user '${effectiveUserId}'.`);
        if (isLoading) setIsLoading(false);
      }
      return;
    }

    // Handle loading existing, non-example maps
    if (routeMapIdFromProps && !routeMapIdFromProps.startsWith('example-') && routeMapIdFromProps !== 'new') {
       if (!effectiveUserId) { // Should have been caught earlier, but double check
         addDebugLog('[DataManager useEffect V13] Guard: Attempt to load existing map without user. Aborting.');
         setError("User not authenticated. Cannot load map.");
         if (isLoading) setIsLoading(false);
         if (!initialLoadComplete) setInitialLoadComplete(true);
         return;
      }
      const isCorrectMapIdInStore = storeMapId === routeMapIdFromProps;
      const isStoreInPotentiallyValidLoadedState = !isNewMapMode && initialLoadComplete && !isLoading;
      let shouldLoad = false;

      if (!isCorrectMapIdInStore || isNewMapMode || isLoading || !initialLoadComplete) {
        shouldLoad = true;
        addDebugLog(`[DataManager useEffect V13] Condition Met for load (existing map): Basic criteria (wrong ID, new mode, loading, or no initial load).`);
      } else if (isCorrectMapIdInStore && isStoreInPotentiallyValidLoadedState && mapData.nodes.length === 0 && !routeMapIdFromProps.startsWith('example-')) {
        // Only force reload for non-empty maps if it's not an example (examples might legitimately be empty if file is bad)
        shouldLoad = true;
        addDebugLog(`[DataManager useEffect V13] Condition Met for load (existing map): Correct mapId, load completed, but no nodes. Forcing reload.`);
      }

      addDebugLog(`[DataManager useEffect V13] Existing Map Evaluation: RouteID='${routeMapIdFromProps}'. Calculated shouldLoad: ${shouldLoad}`);
      if (shouldLoad) {
        addDebugLog(`[DataManager useEffect V13] Action: Loading existing map '${routeMapIdFromProps}'. TargetViewOnly: ${isViewOnlyModeInStore}`);
        loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore);
      } else {
        addDebugLog(`[DataManager useEffect V13] Info: Map ID '${routeMapIdFromProps}' considered loaded and not requiring re-fetch.`);
        if (isLoading) setIsLoading(false);
      }
      return;
    }

    if (!routeMapIdFromProps && isLoading) {
        addDebugLog('[DataManager useEffect V13] Fallback: routeMapIdFromProps is empty, ensuring isLoading is false.');
        setIsLoading(false);
    }

  }, [
    routeMapIdFromProps, user, storeMapId, isNewMapMode, currentMapOwnerId, isLoading, initialLoadComplete, isViewOnlyModeInStore, mapData.nodes.length, // Added mapData.nodes.length
    initializeNewMap, setIsLoading, setError, addDebugLog, setInitialLoadComplete, setIsViewOnlyMode, paramsHook.viewOnly, toast, storeLoadExampleMapData // Added toast and storeLoadExampleMapData
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
