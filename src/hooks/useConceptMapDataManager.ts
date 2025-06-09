
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

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    isViewOnlyMode,
    mapData,
    isLoading,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    temporalStoreAPI,
  } = useConceptMapStore();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER_V3.id : user?.id;

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
        return; // setIsLoading(false) is handled by setLoadedMap
      }

      if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
        const authErrorMsg = "User not authenticated. Cannot load map.";
        console.error(`[DataManager loadMapDataInternal] ${authErrorMsg}`);
        setError(authErrorMsg);
        throw new Error(authErrorMsg); // Throw to ensure finally block sets isLoading false
      }

      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id);
          temporalStoreAPI.getState().clear();
        } else {
          setError(errorMsg);
          throw new Error(errorMsg); // Ensure finally block is hit
        }
        return; // setIsLoading(false) handled by initializeNewMap or finally
      }
      const data: ConceptMap = await response.json();
      console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data, useConceptMapStore.getState().isViewOnlyMode);
      temporalStoreAPI.getState().clear();
      // setIsLoading(false) handled by setLoadedMap
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      // Avoid setting error if initializeNewMap was called, as it handles its own state.
      if (!(errorMsg.includes("User not authenticated") && effectiveUserForLoadHook?.id)) {
          setError(errorMsg); // Only set error if not handled by initializeNewMap or a specific auth error that was thrown
      }
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
      // setIsLoading(false) will be handled by the finally block
    } finally {
        // Ensure isLoading is set to false if not already handled by setLoadedMap or initializeNewMap
        if (useConceptMapStore.getState().isLoading) {
            setIsLoading(false);
        }
    }
  }, [
    user, // Now using full user object as effectiveUserId derives from it
    setIsLoading,
    setError,
    setLoadedMap,
    temporalStoreAPI,
    toast,
    initializeNewMap,
    // BYPASS_AUTH_FOR_TESTING & MOCK_USER_FOR_TESTING_MAPS are constants
  ]);

  const loadMapDataInternalRef = useRef(loadMapDataInternal);
  useEffect(() => {
    loadMapDataInternalRef.current = loadMapDataInternal;
  }, [loadMapDataInternal]);

  useEffect(() => {
    console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${routeMapIdFromProps}'. Store (mapId:'${storeMapId}', isNew:${isNewMapMode}, isLoading:${isLoading}, owner:'${currentMapOwnerId}') User: ${effectiveUserId}`);

    // --- ABSOLUTE GUARD for routeMapIdFromProps ---
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
        console.log('[DataManager useEffect] GUARD: routeMapIdFromProps is falsy or empty. DOING NOTHING until it stabilizes.');
        // If isLoading is true here, it means a previous operation might have started it.
        // We should not turn it off prematurely unless we know for sure the store is in a stable, non-loading state
        // and this effect run is simply because routeMapIdFromProps became transiently undefined.
        // Example: if storeMapId is valid and !isNewMapMode, then the map is loaded.
        if (isLoading && storeMapId && storeMapId !== 'new' && !isNewMapMode) {
           // console.log('[DataManager useEffect] routeMapId missing, but store has a specific map. Setting isLoading false.');
           // setIsLoading(false); // This might be too aggressive if a load WAS in progress
        }
        return; // Wait for a valid routeMapIdFromProps
    }

    // --- USER GUARD ---
    // This guard is after routeMapId check, because routeMapId 'new' might not strictly need a user right away
    // for BYPASS_AUTH_FOR_TESTING, but any actual load/save ops will.
    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) { // Only enforce if not bypassing auth
        console.log('[DataManager useEffect] USER GUARD: No effectiveUserId and not bypassing auth. Setting error.');
        setError("User not authenticated. Cannot perform map operations.");
        if (isLoading) setIsLoading(false); // Stop loading as we can't proceed
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
            if (effectiveUserId) { // Ensure user ID for new map init
                initializeNewMap(effectiveUserId); // This sets isLoading: false and resets temporal
                temporalStoreAPI.getState().clear();
            } else if (!BYPASS_AUTH_FOR_TESTING){ // If not bypassing and no user, this is an issue
                console.error("[DataManager useEffect] Attempted to initialize new map without effectiveUserId and not bypassing auth.");
                setError("Cannot initialize a new map without a user.");
                if(isLoading) setIsLoading(false);
            } else { // Bypassing auth, user might be implicit (MOCK_STUDENT_USER_V3.id)
                 initializeNewMap(MOCK_STUDENT_USER_V3.id);
                 temporalStoreAPI.getState().clear();
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
            if (loadMapDataInternalRef.current) {
                loadMapDataInternalRef.current(routeMapIdFromProps); // This handles its own isLoading
            } else {
                console.error("[DataManager useEffect] CRITICAL: loadMapDataInternalRef.current is null! Cannot load map.");
                if(isLoading) setIsLoading(false);
            }
        } else {
            console.log(`[DataManager useEffect] Info: Map ID '${routeMapIdFromProps}' correctly loaded in store. No re-load. isLoading: ${isLoading}`);
            if (isLoading) setIsLoading(false);
        }
    }
  }, [
    routeMapIdFromProps,
    effectiveUserId, // Derived from user?.id and BYPASS_AUTH_FOR_TESTING
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isLoading, // Only to conditionally set it false if no other action is taken
    initializeNewMap,
    setError,
    setIsLoading,
    temporalStoreAPI,
    // loadMapDataInternalRef is stable and its .current is used inside.
    // BYPASS_AUTH_FOR_TESTING is a constant.
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
    setIsLoading(true); // Use store's setIsLoading
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
      setLoadedMap(savedMapData, useConceptMapStore.getState().isViewOnlyMode); // This will set isLoading to false
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
      setIsLoading(false); // Explicitly set isLoading false on error
    } finally {
        // Ensure isLoading is false if not already handled by setLoadedMap
        if (useConceptMapStore.getState().isLoading) {
             setIsLoading(false);
        }
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt, // Removed isViewOnlyMode from here
    router, toast, setIsLoading, setLoadedMap, setError, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING
  ]);
  
  return { saveMap, loadMapData: loadMapDataInternalRef.current };
}

