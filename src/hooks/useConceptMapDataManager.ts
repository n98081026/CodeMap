
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore, { type ConceptMapStoreTemporalState } from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER_V3, MOCK_USER_FOR_TESTING_MAPS } from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string; // Made optional as it can be undefined during route transitions
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
    setIsViewOnlyMode, // Action to set viewOnlyMode in store
    temporalStoreAPI,
  } = useConceptMapStore();


  const loadMapDataInternal = useCallback(async (idToLoad: string, targetViewOnlyMode: boolean) => {
    console.log(`[DataManager loadMapDataInternal V3] Attempting to load map ID: '${idToLoad}'. TargetViewOnly: ${targetViewOnlyMode}. User: ${user?.id}`);
    setIsLoading(true);
    setError(null);

    const effectiveUserForLoad = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3 : user;

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.log(`[DataManager loadMapDataInternal V3] BYPASS: Loading mock map for ID: ${idToLoad}`);
        const mockMap = MOCK_USER_FOR_TESTING_MAPS[idToLoad];
        setLoadedMap(mockMap, targetViewOnlyMode); // Pass targetViewOnlyMode
        temporalStoreAPI.getState().clear();
        return;
      }

      if (!effectiveUserForLoad?.id && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        console.error(`[DataManager loadMapDataInternal V3] ${authErrorMsg}`);
        setError(authErrorMsg);
        throw new Error(authErrorMsg);
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        console.error(`[DataManager loadMapDataInternal V3] ${errorMsg}`);
        
        if (effectiveUserForLoad?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          // Initialize new map with the correct user ID and targetViewOnlyMode
          initializeNewMap(effectiveUserForLoad.id); 
          // If initializeNewMap doesn't handle viewOnlyMode, set it explicitly after
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
      console.log(`[DataManager loadMapDataInternal V3] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, targetViewOnlyMode); // Pass targetViewOnlyMode
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal V3] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoad?.id && errorMsg.includes("Cannot load map."))) {
          setError(errorMsg);
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      // setIsLoading(false) is handled by setLoadedMap or initializeNewMap or error path
    }
  }, [user, setIsLoading, setError, setLoadedMap, temporalStoreAPI, toast, initializeNewMap, setIsViewOnlyMode]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    const currentEffectiveUserId = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3?.id ?? null) : (user?.id ?? null);

    // Guard 1: Route parameter is our single source of truth. If it's not stable, wait.
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        console.log(`[DataManager useEffect Final] Guard: routeMapIdFromProps ('${routeMapIdFromProps}') is falsy. Waiting.`);
        // If we are already loading something, let it continue. Otherwise, if no map ID, no action.
        // This avoids setting isLoading to false prematurely if a load for a *previous* valid ID was initiated.
        return;
    }

    // Guard 2: Must have a user (unless in testing bypass mode where currentEffectiveUserId might be set from mock)
    if (!currentEffectiveUserId) {
        console.log('[DataManager useEffect Final] Guard: User not available. Aborting.');
        if (isLoading) setIsLoading(false); // No user, so definitely not loading anything.
        setError("User not authenticated. Cannot perform map operations.");
        return;
    }
    
    console.log(`[DataManager useEffect Final RUNNING] RouteID: '${routeMapIdFromProps}', Store (ID: '${storeMapId}', New: ${isNewMapMode}, Loading: ${isLoading}, Owner: ${currentMapOwnerId}, ViewOnly: ${isViewOnlyModeInStore}) EffectiveUser: ${currentEffectiveUserId}`);

    // --- Core Decision Logic based on routeMapIdFromProps ---

    // Case A: URL explicitly indicates 'new' map.
    if (routeMapIdFromProps === 'new') {
        // Only initialize if the store doesn't already reflect a new map for the current user.
        if (!isNewMapMode || storeMapId !== 'new' || currentMapOwnerId !== currentEffectiveUserId) {
            console.log('[DataManager useEffect Final] Action: Initializing NEW map as per route "new".');
            initializeNewMap(currentEffectiveUserId); // This action sets isLoading false internally.
            temporalStoreAPI.getState().clear();
        } else {
            console.log('[DataManager useEffect Final] Info: Store is already in new map mode for this user. No action needed for map data.');
            if (isLoading) setIsLoading(false); // Ensure loading is false if no operation.
        }
        return; // Handled 'new' case.
    }

    // Case B: URL has a specific ID, and it's different from store's current map ID,
    // OR the store thinks it's a new map (isNewMapMode is true) but URL provides a specific ID.
    // This means we need to load the map specified by the URL.
    if (routeMapIdFromProps !== storeMapId || isNewMapMode) {
        console.log(`[DataManager useEffect Final] Action: Loading map. Route ID '${routeMapIdFromProps}' differs from Store ID '${storeMapId}' or store is in 'new' mode.`);
        // The isViewOnlyModeInStore read here from the store should be up-to-date due to ConceptMapEditorPageContent's own useEffect.
        loadMapDataInternalRef.current(routeMapIdFromProps, isViewOnlyModeInStore); // loadMapData handles isLoading.
        return; // Handled map loading.
    }

    // Case C: URL ID matches store ID, and store is not in new map mode.
    // This implies the map data is already what the URL expects.
    // The main reason this effect might re-run in this state is if `isViewOnlyModeInStore` changed.
    console.log(`[DataManager useEffect Final] Info: Map ID '${routeMapIdFromProps}' seems correctly loaded. Checking view-only sync.`);
    
    // Sync the store's isViewOnlyMode if it differs from the prop (which comes from URL query param).
    // This ensures the store reflects the mode dictated by the URL.
    if (isViewOnlyModeInStore !== useConceptMapStore.getState().isViewOnlyMode) {
        console.log(`[DataManager useEffect Final] Action: Syncing view-only mode in store to: ${isViewOnlyModeInStore}`);
        setIsViewOnlyMode(isViewOnlyModeInStore); // This is a Zustand action
    }

    if (isLoading) {
        console.log('[DataManager useEffect Final] Info: isLoading was true but no map data operation needed. Setting isLoading to false.');
        setIsLoading(false);
    }

}, [
    routeMapIdFromProps,
    user, // For deriving currentEffectiveUserId
    // Store states used for decision making:
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isViewOnlyModeInStore, // Reflects the URL's viewOnly query param via PageContent's useEffect
    // Store states for cleanup:
    isLoading,
    // Stable store actions:
    initializeNewMap,
    setIsLoading,
    setError,
    setIsViewOnlyMode, // Store action to update view mode
    temporalStoreAPI // For clearing history
]);


  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? (MOCK_STUDENT_USER_V3 ?? null) : user;

    if (!effectiveUserForSave) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    
    // For a new map, currentMapOwnerId might be null initially until initializeNewMap sets it.
    // Fallback to effectiveUserForSave.id if it's a truly new save.
    const ownerIdForPayload = currentMapOwnerId || effectiveUserForSave.id;

    setIsLoading(true);
    console.log(`[DataManager saveMap V3] Attempting to save. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}, OwnerForPayload: ${ownerIdForPayload}`);

    const payload = {
      name: mapName,
      ownerId: ownerIdForPayload, // Use the derived ownerId
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new' || storeMapId === null) ? null : storeMapId;
      console.log(`[DataManager saveMap V3] currentMapIdForAPI: ${currentMapIdForAPI}`);

      if (!currentMapIdForAPI) {
        console.log("[DataManager saveMap V3] Creating NEW map via POST /api/concept-maps");
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName, mapData: mapData, isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId, 
            ownerId: ownerIdForPayload, // Include ownerId for server-side auth check if needed
        };
        console.log(`[DataManager saveMap V3] Updating EXISTING map via PUT /api/concept-maps/${currentMapIdForAPI}`, updatePayload);
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[DataManager saveMap V3] Save error response:", errorData);
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      console.log("[DataManager saveMap V3] Save successful. Saved map data:", savedMapData);
      
      // Preserve the current view-only mode from the store when setting loaded map
      const currentViewOnlyModeInStore = useConceptMapStore.getState().isViewOnlyMode;
      setLoadedMap(savedMapData, currentViewOnlyModeInStore); 
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         console.log(`[DataManager saveMap V3] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${currentViewOnlyModeInStore ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error("[DataManager saveMap V3] Catch block error:", errorMsg);
      setError(errorMsg);
    } finally {
        setIsLoading(false);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, 
    router, toast, setIsLoading, setLoadedMap, setError, temporalStoreAPI,
  ]);
  
  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}
