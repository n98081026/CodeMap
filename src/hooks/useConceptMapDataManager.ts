
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore, { type ConceptMapStoreTemporalState } from '@/stores/concept-map-store';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_STUDENT_USER_V3, // Ensure this is the one used for effectiveUserId
  MOCK_USER_FOR_TESTING_MAPS // This is the key import
} from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string;
  user: User | null;
}

export function useConceptMapDataManager({ routeMapIdFromProps, user }: UseConceptMapDataManagerProps) {
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
    isViewOnlyMode: isViewOnlyModeInStore,
    mapData,
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    setIsViewOnlyMode,
    addDebugLog,
  } = useConceptMapStore();

  const loadMapDataInternal = useCallback(async (idToLoad: string, targetViewOnlyMode: boolean) => {
    const effectiveUserForLoadHookId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);

    addDebugLog(`[DataManager loadMapDataInternal V8] Called with ID: '${idToLoad}', TargetViewOnly: ${targetViewOnlyMode}. User: ${effectiveUserForLoadHookId}`);
    setIsLoading(true);
    setError(null);

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new') {
        addDebugLog(`[DataManager loadMapDataInternal V8] BYPASS: Attempting to load mock map for ID: ${idToLoad}`);
        let mockMapToLoad: ConceptMap | undefined = undefined;

        if (MOCK_USER_FOR_TESTING_MAPS && typeof MOCK_USER_FOR_TESTING_MAPS === 'object' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
            mockMapToLoad = MOCK_USER_FOR_TESTING_MAPS[idToLoad];
        }

        if (mockMapToLoad) {
            setLoadedMap(mockMapToLoad, targetViewOnlyMode);
            useConceptMapStore.temporal.getState().clear();
        } else {
            const reason = (MOCK_USER_FOR_TESTING_MAPS && typeof MOCK_USER_FOR_TESTING_MAPS === 'object')
                ? `Mock map for ID '${idToLoad}' NOT FOUND in MOCK_USER_FOR_TESTING_MAPS.`
                : "MOCK_USER_FOR_TESTING_MAPS object is not available or not an object for bypass.";
            addDebugLog(`[DataManager loadMapDataInternal V8] BYPASS: ${reason}`);
            const errorMsg = `Bypass Mode: ${reason}`;
            setError(errorMsg);
            if (effectiveUserForLoadHookId) {
                initializeNewMap(effectiveUserForLoadHookId);
                toast({ title: "Map Not Found (Bypass)", description: `Mock map '${idToLoad}' is not defined. Displaying a new map.`, variant: "destructive"});
            } else {
                toast({ title: "Map Not Found (Bypass)", description: `Mock map '${idToLoad}' not found and no user context for new map.`, variant: "destructive"});
            }
        }
        return; // Return after handling bypass case completely
      }

      if (!effectiveUserForLoadHookId && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        addDebugLog(`[DataManager loadMapDataInternal V8] ${authErrorMsg}`);
        setError(authErrorMsg);
        throw new Error(authErrorMsg);
      }

      addDebugLog(`[DataManager loadMapDataInternal V8] Fetching from API: /api/concept-maps/${idToLoad}`);
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        addDebugLog(`[DataManager loadMapDataInternal V8] ${errorMsg}`);

        if (effectiveUserForLoadHookId) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHookId);
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
      addDebugLog(`[DataManager loadMapDataInternal V8] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, targetViewOnlyMode);
      useConceptMapStore.temporal.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager loadMapDataInternal V8] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHookId && errorMsg.includes("Cannot load map."))) {
        setError(errorMsg);
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      addDebugLog(`[DataManager loadMapDataInternal V8] Finished for ID: '${idToLoad}', isLoading set to false.`);
    }
  }, [
      user, // For effectiveUserForLoadHookId
      setIsLoading, setError, setLoadedMap, toast, initializeNewMap, setIsViewOnlyMode, addDebugLog
    ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);
    addDebugLog(`[DataManager useEffect V8 Refactored RUNNING] RouteID: '${routeMapIdFromProps}', StoreID: '${storeMapId}', isNew: ${isNewMapMode}, StoreOwner: ${currentMapOwnerId}, isLoading: ${isLoading}. EffectiveUser: ${effectiveUserId}`);

    // Guard 1: Route parameter is the single source of truth. If unstable, wait.
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
      addDebugLog('[DataManager useEffect V8 Refactored] Guard: routeMapIdFromProps is falsy or empty. Waiting for stable route param.');
      // If we were previously loading something and the route ID vanished,
      // it's safer to ensure isLoading is false if the store isn't already handling a new map init.
      // This prevents getting stuck if e.g. a redirect happens and the old loading state isn't cleared.
      if (isLoading && !(isNewMapMode && storeMapId === 'new')) {
        //setIsLoading(false); // Re-evaluating if this is needed or if loadMapDataInternal/initializeNewMap handle it better
      }
      return;
    }

    // Guard 2: User must be available (unless in bypass mode)
    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
      addDebugLog('[DataManager useEffect V8 Refactored] Guard: User not available (and not in bypass). Aborting.');
      setError("User not authenticated. Cannot perform map operations.");
      if (isLoading) setIsLoading(false);
      return;
    }

    // --- Core Decision Logic ---

    // Case A: URL explicitly indicates a new map
    if (routeMapIdFromProps === 'new') {
      if (!isNewMapMode || storeMapId !== 'new' || currentMapOwnerId !== effectiveUserId) {
        addDebugLog(`[DataManager useEffect V8 Refactored] Action: Initializing NEW map for user '${effectiveUserId}'.`);
        initializeNewMap(effectiveUserId); // This sets isLoading:false internally.
        useConceptMapStore.temporal.getState().clear();
      } else {
        addDebugLog('[DataManager useEffect V8 Refactored] Info: Store is already in new map mode for this user. No action needed.');
        if (isLoading) { // Should not be loading if already in new map mode, but as a safeguard
            setIsLoading(false);
        }
      }
      return; // Handled 'new' case
    }

    // Case B & C: URL indicates an existing map ID
    // Case B: Route ID differs from store ID, or store is still in 'new map mode' (needs loading specific map)
    if (routeMapIdFromProps !== storeMapId || isNewMapMode) {
      addDebugLog(`[DataManager useEffect V8 Refactored] Action: Loading map. Route ID '${routeMapIdFromProps}'. Store (ID: '${storeMapId}', isNew: ${isNewMapMode}, owner: '${currentMapOwnerId}'). EffectiveUser: '${effectiveUserId}'.`);
      loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore); // This sets isLoading true/false internally
    }
    // Case C: Route ID matches store ID and not in new map mode (already loaded)
    else {
      addDebugLog(`[DataManager useEffect V8 Refactored] Info: Map ID '${routeMapIdFromProps}' already correctly loaded in store for user '${effectiveUserId}'. No re-load needed.`);
      if (isLoading) { // If somehow still loading, ensure it's set to false
        addDebugLog('[DataManager useEffect V8 Refactored] Cleanup: Setting isLoading to false as no load is needed.');
        setIsLoading(false);
      }
    }
  }, [
    routeMapIdFromProps,
    user, // For effectiveUserId
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isViewOnlyModeInStore,
    isLoading, // For cleanup in Case C and A-else
    initializeNewMap,
    setIsLoading,
    setError,
    addDebugLog
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

    setIsLoading(true); // Set loading true for the save operation
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
            ownerId: effectiveUserForSave.id, // Include ownerId for potential RLS checks on update if any
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
      setLoadedMap(savedMapData, currentViewOnlyModeInStore); // This sets isNewMapMode=false, isViewOnlyMode, etc.
      useConceptMapStore.temporal.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      // If it was a new map (storeMapId was 'new' or null) and now we have a real ID, update URL
      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         addDebugLog(`[DataManager saveMap V3] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${currentViewOnlyModeInStore ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager saveMap V3] Catch block error: ${errorMsg}`);
      setError(errorMsg); // Set error in store
      toast({ title: "Save Failed", description: errorMsg, variant: "destructive" });
    } finally {
        setIsLoading(false); // Set loading false after save attempt
        addDebugLog(`[DataManager saveMap V3] Finished save attempt, isLoading set to false.`);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, storeMapId, // These are for decision making within saveMap
    router, toast, setIsLoading, setLoadedMap, setError, addDebugLog
  ]);

  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}
