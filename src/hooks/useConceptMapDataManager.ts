
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
    "map-student-bypass-1": MOCK_CONCEPT_MAP_STUDENT, // Ensure the actual mock map ID is available
    // Add more mock maps as needed for testing
};


export function useConceptMapDataManager({ routeMapId, user }: UseConceptMapDataManagerProps) {
  const { toast } = useToast();
  const router = useRouter();

  const {
    mapId: storeMapId,
    mapName,
    currentMapOwnerId,
    currentMapCreatedAt, // Added missing destructuring
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
        // setLoadedMap already sets isLoading: false
        temporalStoreAPI.getState().clear();
        return;
    }
    if (BYPASS_AUTH_FOR_TESTING && idToLoad === 'new' && effectiveUser) {
        console.warn("BYPASS_AUTH: Initializing new mock map.");
        initializeNewMap(effectiveUser.id);
        // initializeNewMap already sets isLoading: false
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
          initializeNewMap(effectiveUser.id); // Fallback to new map
          temporalStoreAPI.getState().clear();
          toast({ title: "Map Load Failed", description: `Could not load map '${idToLoad}'. Displaying a new map instead. Reason: ${errData.message || response.statusText}`, variant: "destructive"});
        } else {
          throw new Error(errData.message || "Failed to load map and no user for new map fallback");
        }
        // isLoading will be set to false by initializeNewMap or finally block
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
  }, [user?.id, initializeNewMap, setLoadedMap, setStoreError, setStoreIsLoading, toast, temporalStoreAPI, BYPASS_AUTH_FOR_TESTING]); // Added user.id and BYPASS_AUTH

  useEffect(() => {
    const effectiveUserId = user?.id; // Use a stable primitive for dependency

    if (!effectiveUserId && !BYPASS_AUTH_FOR_TESTING) {
      if (useConceptMapStore.getState().isLoading) {
        setStoreIsLoading(false);
      }
      return;
    }
  
    const currentStoreMapId = useConceptMapStore.getState().mapId;
    const currentIsNewMapMode = useConceptMapStore.getState().isNewMapMode;

    if (routeMapId) {
      if (routeMapId === 'new') {
        if (currentStoreMapId !== 'new' || !currentIsNewMapMode) {
          if(effectiveUserId) {
            initializeNewMap(effectiveUserId);
            temporalStoreAPI.getState().clear();
          } else if (BYPASS_AUTH_FOR_TESTING && MOCK_STUDENT_USER.id) {
             initializeNewMap(MOCK_STUDENT_USER.id);
             temporalStoreAPI.getState().clear();
          }
        } else {
           if (useConceptMapStore.getState().isLoading) setStoreIsLoading(false);
        }
      } else if (routeMapId !== currentStoreMapId) {
        loadMapData(routeMapId);
      } else {
        if (useConceptMapStore.getState().isLoading && currentStoreMapId === routeMapId && !currentIsNewMapMode) {
             setStoreIsLoading(false);
        }
      }
    } else { 
      if (currentStoreMapId !== 'new' || !currentIsNewMapMode) {
        if(effectiveUserId) {
            initializeNewMap(effectiveUserId);
            temporalStoreAPI.getState().clear();
        } else if (BYPASS_AUTH_FOR_TESTING && MOCK_STUDENT_USER.id) {
            initializeNewMap(MOCK_STUDENT_USER.id);
            temporalStoreAPI.getState().clear();
        }
      } else {
         if (useConceptMapStore.getState().isLoading) setStoreIsLoading(false);
      }
    }
  }, [routeMapId, user?.id, initializeNewMap, loadMapData, temporalStoreAPI, setStoreIsLoading, BYPASS_AUTH_FOR_TESTING]); // Added user.id and BYPASS_AUTH


  const saveMap = useCallback(async (isViewOnly: boolean) => {
    if (isViewOnly) {
        toast({ title: "View Only Mode", description: "Cannot save changes in view-only mode.", variant: "default"});
        return;
    }
    const effectiveUser = BYPASS_AUTH_FOR_TESTING ? MOCK_STUDENT_USER : user;

    if (BYPASS_AUTH_FOR_TESTING && effectiveUser) {
        console.warn("BYPASS_AUTH: Simulating map save for map:", mapName);
        const mapIdToSave = storeMapId && storeMapId !== 'new' ? storeMapId : `mock_map_${Date.now()}`;
        
        MOCK_USER_FOR_TESTING_MAPS[mapIdToSave] = { 
            id: mapIdToSave,
            name: mapName,
            ownerId: effectiveUser.id,
            mapData,
            isPublic,
            sharedWithClassroomId,
            createdAt: currentMapOwnerId ? new Date(currentMapCreatedAt || Date.now()).toISOString() : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        setLoadedMap(MOCK_USER_FOR_TESTING_MAPS[mapIdToSave]); // This will set isNewMapMode to false, and isLoading to false
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
  ]); // Added BYPASS_AUTH
  
  return { saveMap, loadMapData };
}

