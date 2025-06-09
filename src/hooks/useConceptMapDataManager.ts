
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore, { type ConceptMapStoreTemporalState } from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER_V3, MOCK_USER_FOR_TESTING_MAPS } from '@/lib/config';

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
    temporalStoreAPI,
    addDebugLog, // Get the new action from the store
  } = useConceptMapStore();

  const loadMapDataInternal = useCallback(async (idToLoad: string, targetViewOnlyMode: boolean) => {
    addDebugLog(`[DataManager loadMapDataInternal V4] Called with ID: '${idToLoad}', TargetViewOnly: ${targetViewOnlyMode}. User: ${user?.id}`);
    setIsLoading(true);
    setError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3 ?? null) : user;

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        addDebugLog(`[DataManager loadMapDataInternal V4] BYPASS: Loading mock map for ID: ${idToLoad}`);
        const mockMap = MOCK_USER_FOR_TESTING_MAPS[idToLoad];
        setLoadedMap(mockMap, targetViewOnlyMode);
        temporalStoreAPI.getState().clear();
        return;
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        addDebugLog(`[DataManager loadMapDataInternal V4] ${authErrorMsg}`);
        setError(authErrorMsg);
        // setIsLoading(false) will be handled in finally
        throw new Error(authErrorMsg);
      }

      addDebugLog(`[DataManager loadMapDataInternal V4] Fetching from API: /api/concept-maps/${idToLoad}`);
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        addDebugLog(`[DataManager loadMapDataInternal V4] ${errorMsg}`);

        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id);
          if (useConceptMapStore.getState().isViewOnlyMode !== targetViewOnlyMode) {
            setIsViewOnlyMode(targetViewOnlyMode);
          }
        } else {
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        return; // Already handled loading state via initializeNewMap or setError
      }
      const data: ConceptMap = await response.json();
      addDebugLog(`[DataManager loadMapDataInternal V4] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, targetViewOnlyMode);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      addDebugLog(`[DataManager loadMapDataInternal V4] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHook?.id && errorMsg.includes("Cannot load map."))) {
        setError(errorMsg);
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
      addDebugLog(`[DataManager loadMapDataInternal V4] Finished for ID: '${idToLoad}', isLoading set to false.`);
    }
  }, [
      user, // For effectiveUserForLoadHook
      setIsLoading, setError, setLoadedMap, temporalStoreAPI, toast, initializeNewMap, setIsViewOnlyMode, addDebugLog // Include addDebugLog
    ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);


  useEffect(() => {
    const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);
    addDebugLog(`[DataManager useEffect V5 RUNNING] RouteID: '${routeMapIdFromProps}', StoreID: '${storeMapId}', StoreIsNew: ${isNewMapMode}, StoreIsLoading: ${isLoading}, StoreOwner: ${currentMapOwnerId}, StoreViewOnly: ${isViewOnlyModeInStore}, EffectiveUser: ${effectiveUserId}`);

    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        addDebugLog('[DataManager useEffect V5] Guard: routeMapIdFromProps is falsy or empty. Waiting for stable route param.');
        return;
    }

    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) { // Allow bypass even if MOCK_STUDENT_USER_V3 is briefly undefined
        addDebugLog('[DataManager useEffect V5] Guard: User not available and not in bypass mode. Aborting map operations.');
        setError("User not authenticated. Cannot perform map operations.");
        if (isLoading) setIsLoading(false);
        return;
    }
    
    if (routeMapIdFromProps === 'new') {
        if (!isNewMapMode || storeMapId !== 'new' || currentMapOwnerId !== effectiveUserId) {
            addDebugLog(`[DataManager useEffect V5] Action: Initializing NEW map for user '${effectiveUserId}'.`);
            initializeNewMap(effectiveUserId); // This sets isLoading:false internally.
            temporalStoreAPI.getState().clear();
        } else {
            addDebugLog('[DataManager useEffect V5] Info: Store is already in new map mode for this user. No action needed.');
            if (isLoading) {
                addDebugLog('[DataManager useEffect V5] Info: isLoading was true for new map, setting to false.');
                setIsLoading(false);
            }
        }
        return; // Handled 'new'
    }

    // At this point, routeMapIdFromProps is a specific ID (not 'new')
    if (routeMapIdFromProps !== storeMapId || isNewMapMode) {
        addDebugLog(`[DataManager useEffect V5] Action: Loading map. Route ID '${routeMapIdFromProps}' differs from Store ID '${storeMapId}' or store is in 'new' mode.`);
        loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore); // This handles isLoading.
        return; // Handled loading.
    }

    // If we reach here, routeMapId matches storeMapId, and it's not a 'new' map scenario.
    addDebugLog(`[DataManager useEffect V5] Info: Map ID '${routeMapIdFromProps}' matches store. No load/init needed.`);
    if (isLoading) { // If for some reason isLoading is true, but no operation is needed.
        addDebugLog('[DataManager useEffect V5] Info: isLoading was true but no operation needed. Setting isLoading to false.');
        setIsLoading(false);
    }

}, [
    routeMapIdFromProps,
    user, // For deriving effectiveUserId
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isViewOnlyModeInStore,
    isLoading, // Kept for cleanup if no operation is performed
    initializeNewMap,
    setIsLoading,
    setError,
    temporalStoreAPI,
    addDebugLog // Added new store action
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
            ownerId: effectiveUserForSave.id, // Ensure ownerId is part of update payload for auth checks on server
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
      temporalStoreAPI.getState().clear();
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
    router, toast, setIsLoading, setLoadedMap, setError, temporalStoreAPI, addDebugLog
  ]);

  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}

