
"use client";

import { useCallback, useEffect }
from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_CONCEPT_MAP_STUDENT, MOCK_CONCEPT_MAP_STUDENT_V2 } from '@/lib/config'; // Use V2 for more distinct testing

interface UseConceptMapDataManagerProps {
  routeMapId?: string;
  user: User | null;
}

// MOCK_USER_FOR_TESTING_MAPS now uses the new V2 mock map.
// The key 'map-student-bypass-1' is kept if old URLs might still use it, pointing to the new V2 data.
// Or, change the key to MOCK_CONCEPT_MAP_STUDENT_V2.id if you want to ensure only new IDs are used.
const MOCK_USER_FOR_TESTING_MAPS: { [key: string]: ConceptMap } = {
    [MOCK_CONCEPT_MAP_STUDENT_V2.id]: MOCK_CONCEPT_MAP_STUDENT_V2, 
    // Example: If you still want "map1" to load something for tests, map it to a V2 map
    // "map1": MOCK_CONCEPT_MAP_STUDENT_V2, 
};


export function useConceptMapDataManager({ routeMapId, user }: UseConceptMapDataManagerProps) {
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
    mapData,
    initializeNewMap,
    setLoadedMap,
    setIsLoading: setStoreIsLoading,
    setIsSaving: setStoreIsSaving,
    setError: setStoreError,
  } = useConceptMapStore();
  
  const temporalStoreAPI = useConceptMapStore.temporal;

  const loadMapData = useCallback(async (idToLoad: string) => {
    const effectiveUser = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.warn(`BYPASS_AUTH: Loading mock map for ID ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
        temporalStoreAPI.getState().clear();
        return;
    }
    if (BYPASS_AUTH_FOR_TESTING && idToLoad === 'new' && effectiveUser) {
        console.warn("BYPASS_AUTH: Initializing new mock map.");
        initializeNewMap(effectiveUser.id);
        temporalStoreAPI.getState().clear();
        return;
    }

    if (!effectiveUser?.id && !BYPASS_AUTH_FOR_TESTING) {
      setStoreError("User not authenticated. Cannot load or initialize map.");
      setStoreIsLoading(false);
      return;
    }
    
    if (!idToLoad || idToLoad.trim() === '') { 
      if (effectiveUser?.id) {
        initializeNewMap(effectiveUser.id);
        temporalStoreAPI.getState().clear();
      } else {
         setStoreError("Cannot initialize new map: User not found.");
      }
      setStoreIsLoading(false);
      return;
    }

    if (idToLoad === "new") {
      if (effectiveUser?.id) {
        initializeNewMap(effectiveUser.id);
        temporalStoreAPI.getState().clear();
      } else {
        setStoreError("User data not available for new map initialization.");
        toast({ title: "Authentication Error", description: "User data not available for new map.", variant: "destructive" });
      }
      setStoreIsLoading(false);
      return;
    }

    setStoreIsLoading(true);
    setStoreError(null);
    try {
      const response = await fetch(`/api/concept-maps/${idToLoad}`);
      if (!response.ok) {
        const errData = await response.json();
        if (effectiveUser?.id) {
          initializeNewMap(effectiveUser.id); 
          temporalStoreAPI.getState().clear();
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map instead. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
        } else {
          throw new Error(errData.message || "Failed to load map and no user for new map fallback");
        }
        return; 
      }
      const data: ConceptMap = await response.json();
      setLoadedMap(data);
      temporalStoreAPI.getState().clear();
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Loading Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsLoading(false);
    }
  }, [user?.id, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, toast, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING]);

  useEffect(() => {
    const effectiveUserId = user?.id;
    const currentIsLoading = useConceptMapStore.getState().isLoading;

    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
      if (currentIsLoading) {
        setStoreIsLoading(false);
      }
      return;
    }
  
    const currentStoreMapId = useConceptMapStore.getState().mapId;
    const currentIsNewMapMode = useConceptMapStore.getState().isNewMapMode;
    const currentOwnerIdInStore = useConceptMapStore.getState().currentMapOwnerId;


    if (routeMapId && routeMapId.trim() !== "") {
      if (routeMapId === 'new') {
        if (currentStoreMapId !== 'new' || !currentIsNewMapMode || currentOwnerIdInStore !== (BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : effectiveUserId) ) {
          const userIdToInit = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : effectiveUserId;
          if (userIdToInit) {
            initializeNewMap(userIdToInit);
            temporalStoreAPI.getState().clear();
          } else {
            if (currentIsLoading) setStoreIsLoading(false);
          }
        } else {
           if (currentIsLoading) setStoreIsLoading(false);
        }
      } else { // routeMapId is a specific map ID
        if (routeMapId !== currentStoreMapId || currentIsNewMapMode) {
          loadMapData(routeMapId);
        } else {
          // Map ID matches and not in new mode, should be loaded.
           if (currentIsLoading) setStoreIsLoading(false);
        }
      }
    } else { // No routeMapId or empty string
      // This case should ideally not lead to initializing a new map if one is already in the store,
      // unless the store explicitly has no mapId or is in newMapMode.
      // For safety, if store has a map, keep it. If store indicates new/no map, then initialize.
      if (!currentStoreMapId || currentStoreMapId === 'new' || currentIsNewMapMode) {
        const userIdToInit = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER.id : effectiveUserId;
        if (userIdToInit) {
            initializeNewMap(userIdToInit);
            temporalStoreAPI.getState().clear();
        }
      } else {
         if (currentIsLoading) setStoreIsLoading(false);
      }
    }
  }, [routeMapId, user?.id, currentMapOwnerId, initializeNewMap, loadMapData, temporalStoreAPI, setStoreIsLoading, BYPASS_AUTH_FOR_TESTING]);


  const saveMap = useCallback(async (isViewOnly: boolean) => {
    if (isViewOnly) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUser = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUser) {
        console.warn("BYPASS_AUTH: Simulating map save for map:", mapName);
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_v2_${Date.now()}`;
        
        MOCK_USER_FOR_TESTING_MAPS[mapIdToSave] = { 
            id: mapIdToSave,
            name: mapName,
            ownerId: effectiveUser.id,
            mapData,
            isPublic,
            sharedWithClassroomId,
            createdAt: currentMapCreatedAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]); 
        if (isNewMapMode || storeMapId === 'new') {
           router.replace(`/application/concept-maps/editor/${mapIdToSave}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
        }
        toast({ title: "Map Saved (Mocked)", description: `"${mapName}" changes saved locally for bypass mode.` });
        return;
    }


    if (!effectiveUser) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? effectiveUser.id : currentMapOwnerId;

    const payload = {
      name: mapName,
      ownerId: payloadOwnerId,
      mapData: mapData,
      isPublic: isPublic,
      sharedWithClassroomId: sharedWithClassroomId,
    };

    try {
      let response;
      const currentMapIdForAPI = (isNewMapMode || storeMapId === 'new') ? null : storeMapId;

      if (!currentMapIdForAPI) {
        response = await fetch('/api/concept-maps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const updatePayload = {
            name: mapName,
            mapData: mapData,
            isPublic: isPublic,
            sharedWithClassroomId: sharedWithClassroomId,
            ownerId: payloadOwnerId, 
        };
        response = await fetch(`/api/concept-maps/${currentMapIdForAPI}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatePayload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save map");
      }
      const savedMapData: ConceptMap = await response.json();
      setLoadedMap(savedMapData); 
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMapData.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new') && savedMapData.id) {
         router.replace(`/application/concept-maps/editor/${savedMapData.id}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, currentMapCreatedAt, storeMapId,
    router, toast, setStoreIsSaving, setLoadedMap, setStoreError, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING
  ]); 
  
  return { saveMap, loadMapData };
}


    