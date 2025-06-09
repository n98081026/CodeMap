
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER_V3, MOCK_USER_FOR_TESTING_MAPS } from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string;
  user: User | null;
}

export function useConceptMapDataManager({ routeMapIdFromProps, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING
    ? (MOCK_STUDENT_USER_V3 ? MOCK_STUDENT_USER_V3.id : null)
    : user?.id;

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    mapData,
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    temporalStoreAPI,
  } = useConceptMapStore();

  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    console.log(`[DataManager loadMapDataInternal] Attempting to load map ID: '${idToLoad}'. User: ${effectiveUserId}`);
    setIsLoading(true);
    setError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3 : user;

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad], useConceptMapStore.getState().isViewOnlyMode);
        temporalStoreAPI.getState().clear();
        return;
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        console.error(`[DataManager loadMapDataInternal] ${authErrorMsg}`);
        setError(authErrorMsg);
        throw new Error(authErrorMsg);
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id);
        } else {
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        return;
      }
      const data: ConceptMap = await response.json();
      console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, useConceptMapStore.getState().isViewOnlyMode);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHook?.id && errorMsg.includes("Cannot load map."))) {
          setError(errorMsg);
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      if (useConceptMapStore.getState().isLoading) { // Check store's isLoading
        setIsLoading(false);
      }
    }
  }, [
    user, // Direct dependency instead of effectiveUserId here for useCallback
    setIsLoading,
    setError,
    setLoadedMap,
    temporalStoreAPI,
    toast,
    initializeNewMap,
    effectiveUserId, // Used in log
  ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    // Guard 1: Route parameter is our single source of truth. If unstable, wait.
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        console.log('[DataManager Refactored] Guard: routeMapIdFromProps is falsy or empty. Waiting for stable route param.');
        return; // **CRITICAL: Do nothing, wait for the next render with a stable ID**
    }

    // Guard 2: Must have a user to proceed (unless in bypass mode where effectiveUserId might be from mock)
    if (!effectiveUserId) {
        console.log('[DataManager Refactored] Guard: User not available. Aborting map operations.');
        if (isLoading) setIsLoading(false); // Ensure not stuck in loading if no user
        setError("User not authenticated. Cannot perform map operations.");
        return;
    }

    console.log(`[DataManager Refactored RUNNING] RouteID: '${routeMapIdFromProps}', StoreID: '${storeMapId}', StoreIsNew: ${isNewMapMode}, StoreIsLoading: ${isLoading}, StoreOwner: ${currentMapOwnerId}, EffectiveUserID: ${effectiveUserId}`);

    // --- Core Decision Logic ---

    // Case A: URL explicitly indicates a new map ('/editor/new')
    if (routeMapIdFromProps === 'new') {
        // Only initialize if the store isn't already reflecting the "new map for this user" state
        if (!isNewMapMode || storeMapId !== 'new' || currentMapOwnerId !== effectiveUserId) {
            console.log(`[DataManager Refactored] Action: Initializing NEW map for user '${effectiveUserId}' as per route 'new'.`);
            initializeNewMap(effectiveUserId); // This action itself sets isLoading appropriately and clears temporal
        } else {
            console.log('[DataManager Refactored] Info: Store is already in new map mode for this user. No action needed.');
            if (isLoading) setIsLoading(false); // If somehow isLoading was true, correct it
        }
        return; // Finished handling 'new'
    }

    // Case B: URL indicates a specific map ID, and it's different from what's in the store
    // (or store thinks it's a new map, but URL now has a specific ID)
    if (routeMapIdFromProps !== storeMapId || isNewMapMode) {
        console.log(`[DataManager Refactored] Action: Loading map. Route ID '${routeMapIdFromProps}' differs from Store ID '${storeMapId}' or store is in 'new' mode.`);
        loadMapDataInternalRef.current(routeMapIdFromProps); // This action itself sets isLoading appropriately
        return; // Finished handling load
    }

    // Case C: URL indicates a specific map ID, and it MATCHES what's in the store, and store is NOT in new map mode.
    // This means the map is correctly loaded. This is the common case for re-renders or query param changes like viewOnly.
    console.log(`[DataManager Refactored] Info: Map ID '${routeMapIdFromProps}' correctly loaded in store. No re-load needed.`);
    if (isLoading) { // If we were loading but now see data is correct, stop loading.
        console.log('[DataManager Refactored] Info: Setting isLoading to false as no operation is needed.');
        setIsLoading(false);
    }
    // No return needed here, effect finishes.

  }, [
    routeMapIdFromProps,
    effectiveUserId, // Derived from user and BYPASS_AUTH_FOR_TESTING
    storeMapId,
    isNewMapMode,
    currentMapOwnerId, // For new map state check
    isLoading, // To potentially correct it in Case C
    initializeNewMap, // Store action
    setIsLoading,     // Store action
    setError          // Store action
    // loadMapDataInternalRef.current is called, but the ref itself is stable.
    // The function it points to (loadMapDataInternal) has its own dependencies.
  ]);

  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3 : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUserForSave) {
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v3_${Date.now()}`;
        console.log(`[DataManager saveMap] BYPASS: Saving map ID: ${mapIdToSave}, Name: ${mapName}`);
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
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave], useConceptMapStore.getState().isViewOnlyMode);
        if (isNewMapMode || storeMapId === 'new') {
           router.replace(`/application/concept-maps/editor/${mapIdToSave}${useConceptMapStore.getState().isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
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
    
    const actualCurrentMapOwnerId = currentMapOwnerId || effectiveUserForSave.id; // Fallback if currentMapOwnerId is somehow null for a new map

    setIsLoading(true); // Use store's setIsLoading for save operation
    console.log(`[DataManager saveMap] Attempting to save map. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}, ActualOwnerForPayload: ${actualCurrentMapOwnerId}`);

    const payload = {
      name: mapName,
      ownerId: actualCurrentMapOwnerId,
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new' || storeMapId === null) ? null : storeMapId;
      console.log(`[DataManager saveMap] currentMapIdForAPI: ${currentMapIdForAPI}`);

      if (!currentMapIdForAPI) {
        console.log("[DataManager saveMap] Creating NEW map via POST /api/concept-maps");
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // For updates, ensure the ownerId in the payload matches the map's current owner IF it's an existing map.
        // This is more of a server-side check, but good to be aware.
        const updatePayload = {
            name: mapName, mapData: mapData, isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId, ownerId: actualCurrentMapOwnerId, // Ensure ownerId is part of update for auth checks server-side
        };
        console.log(`[DataManager saveMap] Updating EXISTING map via PUT /api/concept-maps/${currentMapIdForAPI}`, updatePayload);
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[DataManager saveMap] Save error response:", errorData);
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      console.log("[DataManager saveMap] Save successful. Saved map data:", savedMapData);
      
      // Critical: Ensure viewOnlyMode state is preserved from the store, not just defaulting to false
      setLoadedMap(savedMapData, useConceptMapStore.getState().isViewOnlyMode); 
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         console.log(`[DataManager saveMap] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${useConceptMapStore.getState().isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error("[DataManager saveMap] Catch block error:", errorMsg);
      setError(errorMsg); // Use store's setError
      toast({ title: "Error Saving Map", description: errorMsg, variant: "destructive" });
    } finally {
        if (useConceptMapStore.getState().isLoading) { // Check store's isLoading
             setIsLoading(false); // Use store's setIsLoading
        }
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt,
    router, toast, setIsLoading, setLoadedMap, setError, temporalStoreAPI,
  ]);
  
  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}

