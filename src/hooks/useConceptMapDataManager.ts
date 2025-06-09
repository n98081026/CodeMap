
"use client";

import { useCallback, useEffect, useRef } from 'react'; // Added useRef
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
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    isViewOnlyMode, // Make sure this is destructured if used by saveMap
    mapData,
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError: setStoreError,
    temporalStoreAPI,
  } = useConceptMapStore();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

  // Use a ref to hold the latest version of loadMapDataInternal
  // This helps if loadMapDataInternal needs to be called from the main useEffect
  // without being a direct dependency that could cause loops.
  const loadMapDataInternalRef = useRef<((idToLoad: string) => Promise<void>) | null>(null);

  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    setIsLoading(true); // Set loading true at the start
    setStoreError(null);

    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;
    // console.log(`[DataManager loadMapDataInternal] Called for ID: '${idToLoad}'. User: ${effectiveUserForLoadHook?.id}`);

    try {
      if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
          // console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
          setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
          temporalStoreAPI.getState().clear();
          return; // Return early
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        // console.error("[DataManager loadMapDataInternal] User not authenticated. Cannot load map.");
        setStoreError("User not authenticated. Cannot load map.");
        return;
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        // console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id);
          temporalStoreAPI.getState().clear();
        } else {
          setStoreError(errorMsg);
        }
        return;
      }
      const data: ConceptMap = await response.json();
      // console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      // console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      setStoreError(errorMsg);
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false); // Ensure isLoading is false in all paths
    }
  }, [
    user, // user object itself might be unstable, consider user?.id if issues persist
    setIsLoading,
    setStoreError,
    setLoadedMap,
    temporalStoreAPI,
    toast,
    initializeNewMap,
    // BYPASS_AUTH_FOR_TESTING and MOCK_ constants are stable
  ]);

  // Update the ref whenever loadMapDataInternal changes
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);


  useEffect(() => {
    const currentRouteMapId = routeMapIdFromProps;
    // console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${currentRouteMapId}', store (mapId:'${storeMapId}', isNew:${isNewMapMode}, owner:'${currentMapOwnerId}', isLoading:${isLoading})`);

    if (!effectiveUserId) {
      // console.log('[DataManager useEffect] Guard: User not available. Setting isLoading to false if currently true.');
      if (isLoading) setIsLoading(false);
      return;
    }
    
    // Critical Guard: If routeMapIdFromProps is not yet available from the router, do nothing.
    if (!currentRouteMapId || currentRouteMapId.trim() === "") {
        // console.log('[DataManager useEffect] Guard: currentRouteMapId is falsy or empty. Doing nothing, awaiting router update or page redirect.');
        // If store indicates it's loading but we have no route ID, something is off, or it's an initial state.
        // If store implies a map *is* loaded, don't mess with it.
        if (isLoading && !(storeMapId && storeMapId !== 'new' && !isNewMapMode)) {
            // console.log('[DataManager useEffect] Guard: currentRouteMapId MISSING & store NOT showing specific loaded map. Setting isLoading false if needed.');
            // setIsLoading(false); // This might be too aggressive if it's truly the first load before route ID is ready
        } else if (isLoading && storeMapId && storeMapId !== 'new' && !isNewMapMode) {
            // console.log('[DataManager useEffect] Guard: currentRouteMapId MISSING but store HAS specific loaded map. Trusting store, ensuring isLoading is false.');
             setIsLoading(false);
        }
        return;
    }

    // At this point, currentRouteMapId is valid.

    // Case 1: The URL is for a new map.
    if (currentRouteMapId === 'new') {
      const isAlreadyInCorrectNewMapState = isNewMapMode && (storeMapId === 'new' || storeMapId === null) && currentMapOwnerId === effectiveUserId;
      if (!isAlreadyInCorrectNewMapState) {
        // console.log(`[DataManager useEffect] Action: Initializing NEW map for user: '${effectiveUserId}'. currentRouteMapId is 'new'.`);
        initializeNewMap(effectiveUserId); // This action sets isLoading to false.
        temporalStoreAPI.getState().clear();
      } else {
        // console.log(`[DataManager useEffect] Info: Already in NEW map state for user: '${effectiveUserId}'. No re-initialization.`);
        if (isLoading) setIsLoading(false);
      }
    }
    // Case 2: The URL is for a specific, existing map.
    else {
      const needsToLoad = storeMapId !== currentRouteMapId || isNewMapMode;
      if (needsToLoad) {
        // console.log(`[DataManager useEffect] Action: Loading map ID: '${currentRouteMapId}'.`);
        if (loadMapDataInternalRef.current) { // Call through ref
          loadMapDataInternalRef.current(currentRouteMapId);
        }
      } else {
        // console.log(`[DataManager useEffect] Info: Map ID '${currentRouteMapId}' correctly loaded in store. No re-load.`);
        if (isLoading) setIsLoading(false);
      }
    }
  }, [
    routeMapIdFromProps,
    effectiveUserId, // Derived from user and BYPASS_AUTH_FOR_TESTING
    // Store states that drive decisions:
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    // Stable store actions:
    initializeNewMap,
    setIsLoading,
    temporalStoreAPI,
    // Note: loadMapDataInternal (the function itself) is NOT in the dependency array.
    // Its logic is accessed via loadMapDataInternalRef.current.
    // The stability of loadMapDataInternal is handled by its own useCallback.
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
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]); // This sets isLoading to false
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
    setIsLoading(true);
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
            sharedWithClassroomId: sharedWithClassroomId, ownerId: payloadOwnerId,
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
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${isViewOnlyMode ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      // console.error("[DataManager saveMap] Catch block error:", errorMsg);
      setStoreError(errorMsg);
      setIsLoading(false); // Ensure isLoading is false on error during save
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt, isViewOnlyMode, // isViewOnlyMode from store for redirect logic
    router, toast, setIsLoading, setLoadedMap, setStoreError, temporalStoreAPI,
    // BYPASS_AUTH_FOR_TESTING and MOCK_ constants are stable
  ]);

  // Return the original loadMapDataInternal aliased as loadMapData for external direct calls if any.
  return { saveMap, loadMapData: loadMapDataInternal };
}

