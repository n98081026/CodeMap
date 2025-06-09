
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

  // Destructure only what's needed directly for top-level logic or stable dependencies
  const {
    mapId: storeMapId,
    mapName, // Used in saveMap
    currentMapOwnerId,
    currentMapCreatedAt, // Used in saveMap (indirectly via setLoadedMap)
    isPublic, // Used in saveMap
    sharedWithClassroomId, // Used in saveMap
    isNewMapMode,
    isViewOnlyMode: isViewOnlyModeInStore, // Used in loadMapDataInternal
    mapData, // Used in saveMap
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    setIsViewOnlyMode, // used in loadMapDataInternal
    addDebugLog,
  } = useConceptMapStore();


  const loadMapDataInternal = useCallback(async (idToLoad: string, targetViewOnlyMode: boolean) => {
    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3 ?? null) : user;
    const effectiveUserForLoadHookId = effectiveUserForLoadHook?.id ?? null;

    addDebugLog(`[DataManager loadMapDataInternal V8] Called with ID: '${idToLoad}', TargetViewOnly: ${targetViewOnlyMode}. User: ${effectiveUserForLoadHookId}`);
    setIsLoading(true);
    setError(null);

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new') {
        addDebugLog(`[DataManager loadMapDataInternal V8] BYPASS: Attempting to load mock map for ID: ${idToLoad}`);
        let mockMapToLoad: ConceptMap | undefined = undefined;

        if (MOCK_USER_FOR_TESTING_MAPS && typeof MOCK_USER_FOR_TESTING_MAPS === 'object') {
            mockMapToLoad = MOCK_USER_FOR_TESTING_MAPS[idToLoad];
        }

        if (mockMapToLoad) {
            setLoadedMap(mockMapToLoad, targetViewOnlyMode);
            useConceptMapStore.temporal.getState().clear(); // Direct access
        } else {
            const reason = MOCK_USER_FOR_TESTING_MAPS ? `Mock map for ID '${idToLoad}' NOT FOUND.` : "MOCK_USER_FOR_TESTING_MAPS object is not available for bypass.";
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
        return;
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
      useConceptMapStore.temporal.getState().clear(); // Direct access
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
      user, // For effectiveUserForLoadHook
      setIsLoading, setError, setLoadedMap, toast, initializeNewMap, setIsViewOnlyMode, addDebugLog
    ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);


  useEffect(() => {
    const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);
    addDebugLog(`[DataManager useEffect V8 Refactored RUNNING] RouteID: '${routeMapIdFromProps}', StoreID: '${storeMapId}', isNew: ${isNewMapMode}, StoreOwner: ${currentMapOwnerId}, isLoading: ${isLoading}. EffectiveUser: ${effectiveUserId}`);

    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        addDebugLog('[DataManager useEffect V8 Refactored] Guard: routeMapIdFromProps is falsy. Waiting for stable route param.');
        return;
    }

    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
        addDebugLog('[DataManager useEffect V8 Refactored] Guard: User not available and not in bypass mode. Aborting.');
        setError("User not authenticated. Cannot perform map operations.");
        if (isLoading) setIsLoading(false);
        return;
    }

    if (routeMapIdFromProps === 'new') {
        if (!isNewMapMode || storeMapId !== 'new' || currentMapOwnerId !== effectiveUserId) {
            addDebugLog(`[DataManager useEffect V8 Refactored] Action: Initializing NEW map for user '${effectiveUserId}'.`);
            initializeNewMap(effectiveUserId);
            useConceptMapStore.temporal.getState().clear(); // Direct access
        } else {
            addDebugLog('[DataManager useEffect V8 Refactored] Info: Store is already in new map mode for this user. No action needed.');
            if (isLoading) setIsLoading(false);
        }
        return;
    }

    if (routeMapIdFromProps !== storeMapId || isNewMapMode || currentMapOwnerId !== effectiveUserId) {
       if (isNewMapMode && routeMapIdFromProps === storeMapId && currentMapOwnerId === effectiveUserId) {
         addDebugLog(`[DataManager useEffect V8 Refactored] Info: Route ID matches store ID ('${routeMapIdFromProps}'), but store is still in 'isNewMapMode' for current user. This usually happens right after a new map is saved and URL changes. Assuming load isn't needed.`);
         if (isLoading) setIsLoading(false);
       } else {
        addDebugLog(`[DataManager useEffect V8 Refactored] Action: Loading map. Route ID '${routeMapIdFromProps}'. Store (ID: '${storeMapId}', isNew: ${isNewMapMode}, owner: '${currentMapOwnerId}'). EffectiveUser: '${effectiveUserId}'.`);
        loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore);
       }
        return;
    }

    addDebugLog(`[DataManager useEffect V8 Refactored] Info: Map ID '${routeMapIdFromProps}' already correctly loaded in store for user '${effectiveUserId}'. No re-load needed.`);
    if (isLoading) {
        addDebugLog('[DataManager useEffect V8 Refactored] Cleanup: Setting isLoading to false as no load is needed.');
        setIsLoading(false);
    }
}, [
    routeMapIdFromProps,
    user, // Recalculates effectiveUserId inside
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isViewOnlyModeInStore, // Dependency for loadMapDataInternalRef.current
    isLoading,
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
      useConceptMapStore.temporal.getState().clear(); // Direct access
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
