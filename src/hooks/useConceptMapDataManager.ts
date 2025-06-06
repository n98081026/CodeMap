
"use client";

import { useCallback, useEffect }
from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { ConceptMap, User } from '@/types';
import useConceptMapStore from '@/stores/concept-map-store';
import { BYPASS_AUTH_FOR_TESTING, MOCK_STUDENT_USER, MOCK_CONCEPT_MAP_STUDENT } from '@/lib/config'; // Import shared config

interface UseConceptMapDataManagerProps {
  routeMapId?: string;
  user: User | null;
}

// Update MOCK_USER_FOR_TESTING_MAPS to use the new MOCK_CONCEPT_MAP_STUDENT
const MOCK_USER_FOR_TESTING_MAPS: { [key: string]: ConceptMap } = {
    "map1": {
        ...MOCK_CONCEPT_MAP_STUDENT, // Use the imported mock map
        id: "map1", // Override id if needed for specific test cases
        name: "Bypass Mock Map 1",
    },
    // Add more mock maps as needed for testing
};


export function useConceptMapDataManager({ routeMapId, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    isPublic,
    sharedWithClassroomId,
    isNewMapMode,
    mapData,
    initializeNewMap,
    setLoadedMap,
    setIsLoading: setStoreIsLoading,
    setIsSaving: setStoreIsSaving,
    setError: setStoreError,
    clearTemporalHistory,
  } = useConceptMapStore();
  
  const temporalStoreAPI = useConceptMapStore.temporal;

  const loadMapData = useCallback(async (idToLoad: string) => {
    if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new' && MOCK_USER_FOR_TESTING_MAPS[idToLoad]) {
        console.warn(`BYPASS_AUTH: Loading mock map for ID ${idToLoad}`);
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[idToLoad]);
        setStoreIsLoading(false);
        temporalStoreAPI.getState().clear();
        return;
    }
    if (BYPASS_AUTH_FOR_TESTING && idToLoad === 'new' && MOCK_STUDENT_USER) {
        console.warn("BYPASS_AUTH: Initializing new mock map.");
        initializeNewMap(MOCK_STUDENT_USER.id);
        setStoreIsLoading(false);
        temporalStoreAPI.getState().clear();
        return;
    }


    if (!user && !BYPASS_AUTH_FOR_TESTING) {
      setStoreError("User not authenticated. Cannot load or initialize map.");
      setStoreIsLoading(false);
      return;
    }
    
    if (!idToLoad || idToLoad.trim() === '') {
      if (user?.id) {
        initializeNewMap(user.id);
        temporalStoreAPI.getState().clear();
      } else {
         setStoreError("Cannot initialize new map: User not found.");
      }
      setStoreIsLoading(false);
      return;
    }

    if (idToLoad === "new") {
      if (user?.id) {
        initializeNewMap(user.id);
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
        if (user?.id) {
          initializeNewMap(user.id);
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
  }, [user, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, toast, temporalStoreAPI]);

  useEffect(() => {
    if (routeMapId) {
      loadMapData(routeMapId);
    } else if (user?.id && !storeMapId && isNewMapMode) { 
      initializeNewMap(user.id);
      temporalStoreAPI.getState().clear();
    }
  }, [routeMapId, user?.id, initializeNewMap, loadMapData, storeMapId, isNewMapMode, temporalStoreAPI]);


  const saveMap = useCallback(async (isViewOnly: boolean) => {
    if (isViewOnly) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    if (BYPASS_AUTH_FOR_TESTING) {
        console.warn("BYPASS_AUTH: Simulating map save for map:", mapName);
        const mapIdToSave = storeMapId || `mock_map_${Date.now()}`;
        MOCK_USER_FOR_TESTING_MAPS[mapIdToSave] = { // Use an in-memory mock store for maps during bypass
            id: mapIdToSave,
            name: mapName,
            ownerId: MOCK_STUDENT_USER.id,
            mapData,
            isPublic,
            sharedWithClassroomId,
            createdAt: currentMapOwnerId ? new Date(currentMapOwnerId).toISOString() : new Date().toISOString(), // Reuse or set new
            updatedAt: new Date().toISOString(),
        };
        // Simulate updating the store with the "saved" map details, especially if it was a new map
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]);
        if (isNewMapMode || storeMapId === 'new') {
           router.replace(`/application/concept-maps/editor/${mapIdToSave}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
        }
        toast({ title: "Map Saved (Mocked)", description: `"${mapName}" changes saved locally for bypass mode.` });
        return;
    }
    if (!user) {
        toast({ title: "Authentication Error", description: "You must be logged in to save a map.", variant: "destructive"});
        return;
    }
    if (!mapName.trim()) {
        toast({ title: "Map Name Required", description: "Please provide a name for your concept map.", variant: "destructive"});
        return;
    }
    setStoreIsSaving(true);

    const payloadOwnerId = (isNewMapMode || !currentMapOwnerId) ? user.id : currentMapOwnerId;
    if (!payloadOwnerId) {
        toast({ title: "Authentication Error", description: "Cannot determine map owner. Please ensure you are logged in.", variant: "destructive"});
        setStoreIsSaving(false);
        return;
    }

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
            ownerId: currentMapOwnerId, 
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
      const savedMap: ConceptMap = await response.json();
      setLoadedMap(savedMap); 
      temporalStoreAPI.getState().clear();
      toast({ title: "Map Saved", description: `"${savedMap.name}" has been saved successfully.` });

      if ((isNewMapMode || storeMapId === 'new') && savedMap.id) {
         router.replace(`/application/concept-maps/editor/${savedMap.id}${isViewOnly ? '?viewOnly=true' : ''}`, { scroll: false });
      }
    } catch (err) {
      setStoreError((err as Error).message);
      toast({ title: "Error Saving Map", description: (err as Error).message, variant: "destructive" });
    } finally {
      setStoreIsSaving(false);
    }
  }, [
    user, mapName, mapData, isPublic, sharedWithClassroomId,
    isNewMapMode, currentMapOwnerId, storeMapId,
    router, toast, setStoreIsSaving, setLoadedMap, setStoreError, temporalStoreAPI
  ]);
  
  return { saveMap, loadMapData };
}
