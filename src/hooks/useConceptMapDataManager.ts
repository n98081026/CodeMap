
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
    ? (MOCK_STUDENT_USER_V3 ? MOCK_STUDENT_USER_V3.id : null) // Defensive access
    : user?.id;

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    // isViewOnlyMode, // Not directly used in this hook's top-level logic, but passed to saveMap
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
    setIsLoading(true); // Start loading
    setError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3 : user;

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad], useConceptMapStore.getState().isViewOnlyMode);
        temporalStoreAPI.getState().clear();
        // setIsLoading(false) is handled by setLoadedMap
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
          initializeNewMap(effectiveUserForLoadHook.id); // This sets isLoading: false
          temporalStoreAPI.getState().clear();
        } else {
          setError(errorMsg);
          throw new Error(errorMsg);
        }
        return;
      }
      const data: ConceptMap = await response.json();
      console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, useConceptMapStore.getState().isViewOnlyMode); // This sets isLoading: false
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHook?.id && errorMsg.includes("Cannot load map."))) {
          setError(errorMsg);
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      // Ensure isLoading is false if not already handled by setLoadedMap or initializeNewMap
      if (useConceptMapStore.getState().isLoading) {
        setIsLoading(false);
      }
    }
  }, [
    user, // Keep user as main dep, effectiveUserId is derived
    setIsLoading,
    setError,
    setLoadedMap,
    temporalStoreAPI,
    toast,
    initializeNewMap,
    // BYPASS_AUTH_FOR_TESTING and mock objects are constants, no need to list them if their values don't change during component lifecycle
    // effectiveUserId is derived from user, so user is sufficient here
  ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${routeMapIdFromProps}'. Store (mapId:'${storeMapId}', isNew:${isNewMapMode}, isLoading:${isLoading}, owner:'${currentMapOwnerId}') User: ${effectiveUserId}`);

    // --- CRITICAL GUARD CLAUSE ---
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        console.log('[DataManager useEffect] Guard: routeMapIdFromProps is falsy or empty. Doing nothing and waiting for stable route param.');
        // If isLoading is true, it implies a previous operation may not have completed setting it to false.
        // Or, it's the very initial load.
        // We should not flip isLoading to false here UNLESS we are sure no other operation is pending.
        // If the store already has a specific map loaded, and routeMapId is just temporarily missing,
        // we should trust the store's loading state.
        const storeHasSpecificMap = storeMapId && storeMapId !== 'new' && !isNewMapMode;
        if (storeHasSpecificMap && isLoading) {
            // console.log('[DataManager useEffect] RouteId missing, but store has specific map. Assuming it's loaded. Setting isLoading=false.');
            // setIsLoading(false); // Potentially risky if a real load WAS pending.
        }
        return; // Absolutely do nothing if routeMapId is not ready.
    }
    
    // User check after routeMapId is confirmed to be present
    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
        console.log('[DataManager useEffect] Guard: User not available (and not bypassing auth). Aborting map operations.');
        setError("User not authenticated. Cannot perform map operations.");
        if (isLoading) setIsLoading(false);
        return;
    }
    
    // --- MAIN LOGIC ---
    if (routeMapIdFromProps === 'new') {
        console.log(`[DataManager useEffect] Case: routeMapId is 'new'. Store (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId}) User: ${effectiveUserId}`);
        const isAlreadyCorrectNewMapState =
            isNewMapMode &&
            (storeMapId === 'new' || storeMapId === null) &&
            currentMapOwnerId === effectiveUserId;

        if (!isAlreadyCorrectNewMapState) {
            console.log(`[DataManager useEffect] Action: Initializing NEW map for user '${effectiveUserId}'.`);
             const userIdToInit = effectiveUserId || (BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3?.id : null) ;
             if (userIdToInit) {
                initializeNewMap(userIdToInit); // This sets isLoading: false and resets temporal
                temporalStoreAPI.getState().clear();
             } else {
                console.error("[DataManager useEffect] Critical: Cannot initialize new map. No user ID available even in bypass mode (MOCK_STUDENT_USER_V3 might be undefined).");
                setError("Cannot initialize new map: User ID missing.");
                if(isLoading) setIsLoading(false);
             }
        } else {
            console.log(`[DataManager useEffect] Info: Already in NEW map state for user '${effectiveUserId}'. No re-initialization. isLoading: ${isLoading}`);
            if (isLoading) setIsLoading(false);
        }
    } else { // routeMapIdFromProps is a specific ID
        console.log(`[DataManager useEffect] Case: routeMapId is specific ('${routeMapIdFromProps}'). Store (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId})`);
        const needsToLoad = storeMapId !== routeMapIdFromProps || isNewMapMode;

        if (needsToLoad) {
            console.log(`[DataManager useEffect] Action: Loading map ID: '${routeMapIdFromProps}'.`);
            loadMapDataInternalRef.current(routeMapIdFromProps); // This handles its own isLoading
        } else {
            console.log(`[DataManager useEffect] Info: Map ID '${routeMapIdFromProps}' correctly loaded in store. No re-load. isLoading: ${isLoading}`);
            if (isLoading) setIsLoading(false);
        }
    }
  }, [
    routeMapIdFromProps,
    effectiveUserId, // This is now derived safely
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isLoading, // Needed to conditionally set it false if no other action taken
    initializeNewMap,
    setError,
    setIsLoading,
    temporalStoreAPI,
    // loadMapDataInternalRef.current is stable due to its own useEffect updating the ref
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
    setIsLoading(true);
    console.log(`[DataManager saveMap] Attempting to save map. isNewMapMode: ${isNewMapMode}, storeMapId: ${storeMapId}, mapName: ${mapName}`);

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
      console.log(`[DataManager saveMap] currentMapIdForAPI: ${currentMapIdForAPI}`);

      if (!currentMapIdForAPI) {
        console.log("[DataManager saveMap] Creating NEW map via POST /api/concept-maps");
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName, mapData: mapData, isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId, ownerId: payloadOwnerId,
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
      setError(errorMsg);
      toast({ title: "Error Saving Map", description: errorMsg, variant: "destructive" });
    } finally {
        if (useConceptMapStore.getState().isLoading) {
             setIsLoading(false);
        }
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt, // isViewOnlyMode is not from store here, but passed as param
    router, toast, setIsLoading, setLoadedMap, setError, temporalStoreAPI,
    // BYPASS_AUTH_FOR_TESTING and MOCK_STUDENT_USER_V3 are constants
  ]);
  
  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}
