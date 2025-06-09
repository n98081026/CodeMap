
"use client";

import { useCallback, useEffect } from 'react'; // Removed useRef as it's not part of this specific fix approach
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
    // isViewOnlyMode, // Not directly used in this hook's core logic besides saveMap param
    mapData,
    initializeNewMap,
    setLoadedMap,
    isLoading,
    setIsLoading,
    setIsSaving,
    setError: setStoreError, // Renamed to avoid conflict with local error variables
    temporalStoreAPI,
  } = useConceptMapStore();

  const effectiveUserId = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : user?.id;

  const loadMapDataInternal = useCallback(async (idToLoad: string) => {
    const effectiveUserForLoadHook = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user; // Use user from hook closure
    console.log(`[DataManager loadMapDataInternal] Called for ID: '${idToLoad}'. User: ${effectiveUserForLoadHook?.id}`);
    setIsLoading(true);
    setStoreError(null);

    if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.log(`[DataManager loadMapDataInternal] BYPASS: Loading mock map for ID: ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
        temporalStoreAPI.getState().clear();
        setIsLoading(false);
        return;
    }

    if (!effectiveUserForLoadHook?.id && !BYPASS_AUTH_FOR_TESTING) {
      console.error("[DataManager loadMapDataInternal] User not authenticated. Cannot load map.");
      setStoreError("User not authenticated. Cannot load map.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        const errorMsg = `Map Load Failed for '${idToLoad}': ${errData.message || response.statusText}`;
        console.error(`[DataManager loadMapDataInternal] ${errorMsg}`);
        if (effectiveUserForLoadHook?.id) {
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
          initializeNewMap(effectiveUserForLoadHook.id); // Fallback to new map for the user
          temporalStoreAPI.getState().clear();
        } else {
          setStoreError(errorMsg);
        }
        return;
      }
      const data: ConceptMap = await response.json();
      console.log(`[DataManager loadMapDataInternal] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`);
      setLoadedMap(data);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(`[DataManager loadMapDataInternal] Catch block error for ID '${idToLoad}': ${errorMsg}`);
      setStoreError(errorMsg);
      toast({ title: "Error Loading Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [
    user, // Dependency for effectiveUserForLoadHook
    setIsLoading, setStoreError, setLoadedMap, temporalStoreAPI, toast,
    BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER.id, initializeNewMap
    // MOCK_USER_FOR_TESTING_MAPS is a stable import, not needed in deps
  ]);

  useEffect(() => {
    console.log(`[DataManager useEffect RUNNING] routeMapIdProp: '${routeMapIdFromProps}', effectiveUserId: '${effectiveUserId}', storeMapId: '${storeMapId}', isNewMapMode: ${isNewMapMode}, isLoading: ${isLoading}`);

    // --- Critical Guard Clause ---
    // If routeMapIdFromProps is not yet available from the router (falsy), do nothing.
    // The effect will re-run once useParams (via page props) provides the actual value.
    // This prevents incorrect actions during transient states in page transitions.
    if (!routeMapIdFromProps || routeMapIdFromProps.trim() === "") {
      console.log("[DataManager useEffect] Guard: routeMapIdFromProps is falsy or empty. Doing nothing, awaiting router update or page redirect.");
      // If isLoading is true, it means we were expecting a routeMapId. Don't set it to false yet.
      // If isLoading is false, and we hit this, it's likely an initial state before router is ready or a navigation to base /editor/
      return;
    }

    if (!effectiveUserId) {
      console.log('[DataManager useEffect] Guard: User not available (effectiveUserId is falsy). Skipping map data management.');
      if (isLoading) setIsLoading(false); // Stop loading if we can't proceed
      return;
    }

    // Case 1: The URL explicitly targets a new map.
    if (routeMapIdFromProps === 'new') {
      const isAlreadyInCorrectNewMapState = isNewMapMode && (storeMapId === 'new' || storeMapId === null) && currentMapOwnerId === effectiveUserId;
      if (!isAlreadyInCorrectNewMapState) {
        console.log(`[DataManager useEffect] Action: Initializing NEW map for user: '${effectiveUserId}'. routeMapIdProp is 'new'. Previous store (mapId:'${storeMapId}', isNew:${isNewMapMode}, owner:'${currentMapOwnerId}')`);
        initializeNewMap(effectiveUserId);
        temporalStoreAPI.getState().clear();
      } else {
        console.log(`[DataManager useEffect] Info: Already in NEW map state for user: '${effectiveUserId}'. No re-initialization.`);
        if (isLoading) setIsLoading(false);
      }
    }
    // Case 2: The URL targets a specific, existing map ID.
    else {
      const needsToLoad = storeMapId !== routeMapIdFromProps || isNewMapMode;
      if (needsToLoad) {
        console.log(`[DataManager useEffect] Action: Loading map ID: '${routeMapIdFromProps}'. Current store (mapId:'${storeMapId}', isNew:${isNewMapMode})`);
        loadMapDataInternal(routeMapIdFromProps);
      } else {
        console.log(`[DataManager useEffect] Info: Map ID '${routeMapIdFromProps}' correctly loaded in store. No re-load.`);
        if (isLoading) setIsLoading(false);
      }
    }
  }, [
    routeMapIdFromProps,
    effectiveUserId, // Derived from user and BYPASS_AUTH_FOR_TESTING
    // Store state values that determine logic:
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isLoading,
    // Stable store actions and other stable dependencies:
    initializeNewMap,
    setIsLoading,
    loadMapDataInternal, // Now a dependency
    temporalStoreAPI,
    // BYPASS_AUTH_FOR_TESTING, // effectiveUserId already captures this
  ]);

  const saveMap = useCallback(async (isViewOnlyParam: boolean) => {
    if (isViewOnlyParam) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUserForSave = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUserForSave) {
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v2_${Date.now()}`;
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
    setIsSaving(true);
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
      setLoadedMap(savedMapData);
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new' || storeMapId === null) && savedMapData.id) {
         console.log(`[DataManager saveMap] New map saved, redirecting to /editor/${savedMapData.id}`);
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${isViewOnlyParam ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error("[DataManager saveMap] Catch block error:", errorMsg);
      setStoreError(errorMsg);
      toast({ title: "Error Saving Map", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId, currentMapCreatedAt, // currentMapCreatedAt for new mock map
    router, toast, setIsSaving, setLoadedMap, setStoreError, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING,
    MOCK_STUDENT_USER.id
  ]);

  // Expose loadMapDataInternal as loadMapData for external calls if needed, though primarily used internally.
  return { saveMap, loadMapData: loadMapDataInternal };
}
