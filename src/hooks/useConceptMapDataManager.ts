
"use client";

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER_V3 as MOCK_STUDENT_USER, MOCK_USER_FOR_TESTING_MAPS } from '@/lib/config';

interface UseConceptMapDataManagerProps {
  routeMapIdFromProps?: string; // This comes from page props, derived from useParams
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
    // isViewOnlyMode, // Not directly used by saveMap's core logic, but by its parameter
    mapData,
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading, // Changed from setStoreIsLoading to setIsLoading for consistency
    setError: setStoreError, // Aliased to avoid conflict if local setError is needed
    temporalStoreAPI,
  } = useConceptMapStore();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    setIsLoading(true);
    setStoreError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;
    console.log(`[DataManager loadMapDataInternal] Called for ID: '${idToLoad}'. User: ${effectiveUserForLoadHook?.id}`);

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
          console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
          setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]); // This sets isLoading to false
          temporalStoreAPI.getState().clear();
          return;
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        console.error("[DataManager loadMapDataInternal] User not authenticated. Cannot load map.");
        setStoreError("User not authenticated. Cannot load map.");
        // Explicitly set isLoading false if we're erroring out here
        setIsLoading(false);
        return;
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        
        // If user is present, try to initialize a new map instead of just showing error
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id); // This action sets isLoading to false.
          temporalStoreAPI.getState().clear();
        } else {
          setStoreError(errorMsg);
          setIsLoading(false); // Set loading false if no user to initialize for
        }
        return;
      }
      const data: ConceptMap = await response.json();
      console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data); // This sets isLoading to false
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      setStoreError(errorMsg);
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
      setIsLoading(false); // Ensure isLoading is false on error
    }
  }, [
    user, // Depends on the user object for auth status
    setIsLoading,
    setStoreError,
    setLoadedMap,
    temporalStoreAPI,
    toast,
    initializeNewMap, // Because it's called in error handling
    // BYPASS_AUTH_FOR_TESTING and MOCK_USER_FOR_TESTING_MAPS are stable constants
  ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);


  useEffect(() => {
    const currentRouteMapId = routeMapIdFromProps; // Use a local const for clarity within this effect
    
    console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${currentRouteMapId}', Store (mapId:'${storeMapId}', isNew:${isNewMapMode}, owner:'${currentMapOwnerId}', isLoading:${isLoading}, effectiveUserId: '${effectiveUserId}')`);

    // --- Critical Guard Clause ---
    // If routeMapId is not yet available from the router (transient state during page transitions) OR
    // if user is not yet available (and not bypassing auth), DO NOTHING.
    // The effect will re-run once these values are stable.
    if ((!currentRouteMapId || currentRouteMapId.trim() === "") || (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING)) {
      console.log(`[DataManager useEffect] Guard: routeMapId ('${currentRouteMapId}') or effectiveUserId ('${effectiveUserId}') not ready. Waiting...`);
      // Do not call initializeNewMap or setIsLoading(false) here.
      // Let subsequent runs handle it once routeId/userId are stable.
      // If isLoading is true due to a previous op, it will be reset by that op's finally block or next valid run.
      return;
    }

    // At this point, currentRouteMapId IS defined (not empty) AND effectiveUserId IS defined (or bypassing)

    // Case 1: The URL is EXPLICITLY for a new map.
    if (currentRouteMapId === 'new') {
      const isAlreadyInCorrectNewMapState = isNewMapMode && 
                                          (storeMapId === 'new' || storeMapId === null) && 
                                          currentMapOwnerId === effectiveUserId;
      if (!isAlreadyInCorrectNewMapState) {
        console.log(`[DataManager useEffect] Action: Initializing NEW map for user: '${effectiveUserId}'. currentRouteMapId is 'new'. Store (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId})`);
        initializeNewMap(effectiveUserId); // This sets isLoading: false internally
        temporalStoreAPI.getState().clear();
      } else {
        console.log(`[DataManager useEffect] Info: Already in NEW map state for user: '${effectiveUserId}'. No re-initialization. currentRouteMapId is 'new'. isLoading: ${isLoading}`);
        if (isLoading) setIsLoading(false); // Ensure loading is off if already in correct state
      }
    }
    // Case 2: The URL is for a specific, existing map.
    else { // currentRouteMapId is a specific ID, not 'new' and not empty/falsy
      const needsToLoad = storeMapId !== currentRouteMapId || isNewMapMode;
      if (needsToLoad) {
        console.log(`[DataManager useEffect] Action: Loading map ID: '${currentRouteMapId}'. Current store (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId})`);
        if (loadMapDataInternalRef.current) {
          loadMapDataInternalRef.current(currentRouteMapId); // This sets isLoading true, then false in finally
        } else {
            console.error("[DataManager useEffect] CRITICAL: loadMapDataInternalRef.current is null! Cannot load map.");
            if(isLoading) setIsLoading(false); // Safety for isLoading
        }
      } else {
        console.log(`[DataManager useEffect] Info: Map ID '${currentRouteMapId}' correctly loaded in store. No re-load. Store (mapId: ${storeMapId}, isNew: ${isNewMapMode}, owner: ${currentMapOwnerId}). isLoading: ${isLoading}`);
        if (isLoading) setIsLoading(false); // Ensure loading is off if map already correct
      }
    }
  }, [
    routeMapIdFromProps, // Primary trigger for map identity
    effectiveUserId,     // Derived from user and BYPASS_AUTH_FOR_TESTING
    // Store state that determines if action is needed:
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isLoading,          // To allow setting it to false if no action is taken but it was true
    // Store actions (stable references from zustand, but needed if called):
    initializeNewMap,
    setIsLoading,        // Direct calls to setIsLoading
    temporalStoreAPI,
    // loadMapDataInternalRef itself is stable, its .current points to the memoized loadMapDataInternal
  ]);


  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

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
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]);
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
            sharedWithClassroomId: sharedWithClassroomId, ownerId: payloadOwnerId, // ownerId for auth check by service
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
      setLoadedMap(savedMapData);
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         console.log(`[DataManager saveMap] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${useConceptMapStore.getState().isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error("[DataManager saveMap] Catch block error:", errorMsg);
      setStoreError(errorMsg);
      toast({ title: "Error Saving Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false); // Ensure isLoading is false after save attempt
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId, // State from store used in save logic
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt, // More store state
    router, toast, setIsLoading, setLoadedMap, setStoreError, temporalStoreAPI, // Hooks and store setters
    // BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_USER_FOR_TESTING_MAPS are stable
  ]);

  return { saveMap, loadMapData: loadMapDataInternalRef.current }; // Return the function from the ref for direct calls
}
