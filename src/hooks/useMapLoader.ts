import { useParams } from 'next/navigation';
import { useCallback, useEffect, useRef } from 'react';

import type { ConceptMap, User } from '@/types';

import { useToast } from '@/hooks/use-toast';
import {
  BYPASS_AUTH_FOR_TESTING,
  MOCK_STUDENT_USER,
  MOCK_USER_FOR_TESTING_MAPS,
} from '@/lib/config';
import useConceptMapStore from '@/stores/concept-map-store';

interface UseMapLoaderProps {
  routeMapId?: string;
  user: User | null;
}

export function useMapLoader({ routeMapId, user }: UseMapLoaderProps) {
  const { toast } = useToast();
  const paramsHook = useParams();
  const {
    mapId: storeMapId,
    isNewMapMode,
    isLoading,
    initialLoadComplete,
    currentMapOwnerId,
    isViewOnlyMode: isViewOnlyModeInStore,
    mapData,
    initializeNewMap,
    setLoadedMap,
    setIsLoading,
    setError,
    setIsViewOnlyMode,
    setInitialLoadComplete,
    addDebugLog,
  } = useConceptMapStore();

  const loadMapData = useCallback(
    async (idToLoad: string, targetViewOnlyMode: boolean) => {
      const effectiveUserForLoadHookId = BYPASS_AUTH_FOR_TESTING
        ? (MOCK_STUDENT_USER?.id ?? null)
        : (user?.id ?? null);

      addDebugLog(
        `[DataManager loadMapDataInternal V10] Called with ID: '${idToLoad}', TargetViewOnly: ${targetViewOnlyMode}. User: ${effectiveUserForLoadHookId}`
      );
      setIsLoading(true);
      setError(null);
      setInitialLoadComplete(false);

      if (
        idToLoad &&
        idToLoad.startsWith('example-') &&
        !BYPASS_AUTH_FOR_TESTING
      ) {
        addDebugLog(
          `[DataManager loadMapDataInternal V12] Attempt to load example map '${idToLoad}' via API. This path should ideally be avoided if data is pre-loaded by ExamplesPage.`
        );

        const store = useConceptMapStore.getState();
        if (
          store.mapId === idToLoad &&
          store.mapData &&
          store.mapData.nodes &&
          store.mapData.nodes.length > 0
        ) {
          addDebugLog(
            `[DataManager loadMapDataInternal V12] Data for example map '${idToLoad}' is already present in the store. Using store data.`
          );
          toast({
            title: 'Info',
            description: `Example map '${idToLoad}' is already available.`,
            variant: 'default',
          });
        } else {
          addDebugLog(
            `[DataManager loadMapDataInternal V12] Data for example map '${idToLoad}' not found in store. API fetch for examples is blocked.`
          );
          setError(
            `Example map '${idToLoad}' data not found or is not meant to be fetched via API. Please navigate from the Examples gallery.`
          );
        }

        setIsLoading(false);
        setInitialLoadComplete(true);
        return;
      }

      try {
        if (BYPASS_AUTH_FOR_TESTING && idToLoad !== 'new') {
          addDebugLog(
            `[DataManager loadMapDataInternal V10] BYPASS: Attempting to load mock map for ID: ${idToLoad}`
          );
          let mockMapToLoad: ConceptMap | undefined = undefined;

          if (
            MOCK_USER_FOR_TESTING_MAPS &&
            typeof MOCK_USER_FOR_TESTING_MAPS === 'object'
          ) {
            mockMapToLoad =
              MOCK_USER_FOR_TESTING_MAPS[idToLoad as string | number];
          }

          if (mockMapToLoad) {
            setLoadedMap(mockMapToLoad, targetViewOnlyMode);
            useConceptMapStore.temporal.getState().clear();
          } else {
            const reason =
              MOCK_USER_FOR_TESTING_MAPS &&
              typeof MOCK_USER_FOR_TESTING_MAPS === 'object'
                ? `Mock map for ID '${idToLoad}' NOT FOUND in MOCK_USER_FOR_TESTING_MAPS.`
                : 'MOCK_USER_FOR_TESTING_MAPS object is not available or not an object for bypass.';
            addDebugLog(
              `[DataManager loadMapDataInternal V10] BYPASS: ${reason}`
            );
            const errorMsg = `Bypass Mode: ${reason}`;
            setError(errorMsg);
            if (effectiveUserForLoadHookId) {
              initializeNewMap(effectiveUserForLoadHookId);
              toast({
                title: 'Map Not Found (Bypass)',
                description: `Mock map '${idToLoad}' is not defined. Displaying a new map.`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: 'Map Not Found (Bypass)',
                description: `Mock map '${idToLoad}' not found and no user context for new map.`,
                variant: 'destructive',
              });
            }
          }
          return;
        }

        if (!effectiveUserForLoadHookId && !BYPASS_AUTH_FOR_TESTING) {
          const authErrorMsg = 'User not authenticated. Cannot load map.';
          addDebugLog(`[DataManager loadMapDataInternal V10] ${authErrorMsg}`);
          setError(authErrorMsg);
          throw new Error(authErrorMsg);
        }

        let response;
        const controller = new AbortController();
        const signal = controller.signal;
        const FETCH_TIMEOUT = 15000;

        const timeoutId = setTimeout(() => {
          addDebugLog(
            `[DataManager loadMapDataInternal V10] Fetch timeout triggered for ID: ${idToLoad}`
          );
          controller.abort();
        }, FETCH_TIMEOUT);

        try {
          addDebugLog(
            `[DataManager loadMapDataInternal V10] Fetching from API: /api/concept-maps/${idToLoad} with timeout.`
          );
          response = await fetch(`/api/concept-maps/${idToLoad}`, { signal });
          clearTimeout(timeoutId);
          addDebugLog(
            `[DataManager loadMapDataInternal V11] Raw response status for ID '${idToLoad}': ${response.status}`
          );
        } catch (fetchError) {
          clearTimeout(timeoutId);
          if ((fetchError as Error).name === 'AbortError') {
            addDebugLog(
              `[DataManager loadMapDataInternal V10] Fetch aborted for ID: ${idToLoad} (likely due to timeout).`
            );
            throw new Error(`Map load timed out for '${idToLoad}'.`);
          }
          addDebugLog(
            `[DataManager loadMapDataInternal V10] Fetch error for ID: ${idToLoad}: ${
              (fetchError as Error).message
            }`
          );
          throw fetchError;
        }

        if (!response.ok) {
          addDebugLog(
            `[DataManager loadMapDataInternal V11] Response not OK for ID '${idToLoad}'. Status: ${response.status}. Attempting to parse error JSON.`
          );
          let errorDetail = response.statusText;
          try {
            const errData = await response.json();
            errorDetail = errData.message || errorDetail;
          } catch (parseError) {
            addDebugLog(
              `[DataManager loadMapDataInternal V10] Could not parse error response for ID: ${idToLoad}`
            );
          }
          const errorMsg = `Map Load Failed for '${idToLoad}': ${errorDetail}`;
          addDebugLog(`[DataManager loadMapDataInternal V10] ${errorMsg}`);

          if (effectiveUserForLoadHookId) {
            toast({
              title: 'Map Load Failed',
              description: `Could not load map '${idToLoad}'. Displaying a new map. Reason: ${errorDetail}`,
              variant: 'destructive',
            });
            initializeNewMap(effectiveUserForLoadHookId);
            if (
              useConceptMapStore.getState().isViewOnlyMode !==
              targetViewOnlyMode
            ) {
              setIsViewOnlyMode(targetViewOnlyMode);
            }
          } else {
            setError(errorMsg);
            throw new Error(errorMsg);
          }
          return;
        }
        const data: ConceptMap = await response.json();
        addDebugLog(
          `[DataManager loadMapDataInternal V11] Parsed data for ID '${idToLoad}': Nodes count: ${
            data.mapData?.nodes?.length ?? 'undefined/null'
          }. Edges count: ${
            data.mapData?.edges?.length ?? 'undefined/null'
          }. Map name: ${data.name}`
        );
        addDebugLog(
          `[DataManager loadMapDataInternal V10] Successfully loaded map ID: '${idToLoad}', Name: '${data.name}'`
        );
        addDebugLog(
          `[DataManager loadMapDataInternal V11] Calling setLoadedMap for ID '${idToLoad}' with Nodes count: ${
            data.mapData?.nodes?.length ?? 'undefined/null'
          }. targetViewOnlyMode: ${targetViewOnlyMode}`
        );
        setLoadedMap(data, targetViewOnlyMode);
        useConceptMapStore.temporal.getState().clear();
      } catch (err) {
        const errorMsg = (err as Error).message;
        addDebugLog(
          `[DataManager loadMapDataInternal V10] Catch block error for ID '${idToLoad}': ${errorMsg}`
        );
        if (
          !(
            errorMsg.includes('User not authenticated') &&
            effectiveUserForLoadHookId &&
            errorMsg.includes('Cannot load map.')
          )
        ) {
          setError(errorMsg);
        }
        addDebugLog(
          `[DataManager loadMapDataInternal V10 Catch] Setting initialLoadComplete=true after error: ${errorMsg}`
        );
        setInitialLoadComplete(true);
        toast({
          title: 'Error Loading Map',
          description: errorMsg,
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        addDebugLog(
          `[DataManager loadMapDataInternal V10] Finished for ID: '${idToLoad}', isLoading set to false.`
        );
      }
    },
    [
      user,
      setIsLoading,
      setError,
      setInitialLoadComplete,
      setLoadedMap,
      toast,
      initializeNewMap,
      setIsViewOnlyMode,
      addDebugLog,
    ]
  );

  const loadMapDataRef = useRef(loadMapData);
  useEffect(() => {
    loadMapDataRef.current = loadMapData;
  }, [loadMapData]);

  useEffect(() => {
    const effectiveUserId = BYPASS_AUTH_FOR_TESTING
      ? (MOCK_STUDENT_USER?.id ?? null)
      : (user?.id ?? null);
    const currentViewOnlyQueryParam = String(paramsHook.viewOnly) === 'true';
    const { loadExampleMapData: storeLoadExampleMapData } =
      useConceptMapStore.getState();
    addDebugLog(
      `[DataManager useEffect V13] RUNNING: RouteID='${routeMapId}', Store(ID='${storeMapId}', isNew=${isNewMapMode}, Owner='${currentMapOwnerId}', isLoading=${isLoading}, initComp=${initialLoadComplete}, viewOnly=${isViewOnlyModeInStore}). EffectiveUser='${effectiveUserId}', URLViewOnly=${currentViewOnlyQueryParam}`
    );

    if (!routeMapId || routeMapId.trim() === '') {
      addDebugLog(
        '[DataManager useEffect V13] Guard: routeMapId is falsy or empty. Waiting.'
      );
      return;
    }

    if (
      !routeMapId.startsWith('example-') &&
      !effectiveUserId &&
      !BYPASS_AUTH_FOR_TESTING
    ) {
      addDebugLog(
        '[DataManager useEffect V13] Guard: User not available (not example, not bypass). Aborting.'
      );
      setError('User not authenticated. Cannot perform map operations.');
      if (isLoading) setIsLoading(false);
      if (!initialLoadComplete) setInitialLoadComplete(true);
      return;
    }

    if (isViewOnlyModeInStore !== currentViewOnlyQueryParam) {
      addDebugLog(
        `[DataManager useEffect V13] Syncing viewOnlyMode in store. Param: ${currentViewOnlyQueryParam}, Store: ${isViewOnlyModeInStore}`
      );
      setIsViewOnlyMode(currentViewOnlyQueryParam);
      return;
    }

    if (routeMapId.startsWith('example-')) {
      const exampleKey = routeMapId.substring('example-'.length);
      const isExampleCorrectlyLoaded =
        storeMapId === routeMapId &&
        useConceptMapStore.getState().mapData.nodes.length > 0 &&
        initialLoadComplete &&
        isViewOnlyModeInStore;

      if (!isExampleCorrectlyLoaded) {
        addDebugLog(
          `[DataManager useEffect V13] Action: Attempting to load example map '${exampleKey}' directly. Store state: (mapId: ${storeMapId}, nodes: ${
            useConceptMapStore.getState().mapData.nodes.length
          }, initComp: ${initialLoadComplete}, viewOnly: ${isViewOnlyModeInStore})`
        );
        setIsLoading(true);
        setError(null);
        setInitialLoadComplete(false);
        import('@/lib/example-data')
          .then((module) => {
            addDebugLog(
              `[DataManager useEffect V14] Successfully imported '@/lib/example-data'. Found ${module.exampleProjects.length} example projects.`
            );
            const exampleProject = module.exampleProjects.find(
              (p) => p.key === exampleKey
            );
            if (exampleProject) {
              addDebugLog(
                `[DataManager useEffect V14] Found metadata for example key '${exampleKey}'. Path to JSON: ${exampleProject.mapJsonPath}`
              );
              fetch(exampleProject.mapJsonPath)
                .then((response) => {
                  addDebugLog(
                    `[DataManager useEffect V14] Fetch response status for '${exampleKey}' from ${exampleProject.mapJsonPath}: ${response.status}`
                  );
                  if (!response.ok) {
                    if (response.status === 404) {
                      throw new Error(
                        `Example map file not found (404) at ${exampleProject.mapJsonPath}`
                      );
                    }
                    throw new Error(
                      `Failed to fetch example map data: ${response.status} ${response.statusText}`
                    );
                  }
                  return response.json().catch((parseError) => {
                    throw new Error(
                      `Invalid JSON format in example map file: ${exampleProject.mapJsonPath}. Details: ${parseError.message}`
                    );
                  });
                })
                .then((exampleMapData) => {
                  storeLoadExampleMapData(exampleMapData, exampleProject.name);
                  addDebugLog(
                    `[DataManager useEffect V14] Example map '${exampleKey}' loaded directly and set in store.`
                  );
                })
                .catch((err) => {
                  let title = 'Error Loading Example';
                  let description = `Could not load data for example '${exampleKey}'.`;
                  if (
                    err.message.includes('404') ||
                    err.message.toLowerCase().includes('not found')
                  ) {
                    title = 'Example File Not Found';
                    description = `The data file for example '${exampleKey}' could not be found. It might be missing or misconfigured. Path: ${exampleProject.mapJsonPath}`;
                  } else if (
                    err.message.toLowerCase().includes('invalid json format')
                  ) {
                    title = 'Data Format Error';
                    description = `The data file for example '${exampleKey}' appears to be corrupted or in an invalid format. Path: ${exampleProject.mapJsonPath}`;
                  } else if (
                    err.message.toLowerCase().includes('failed to fetch')
                  ) {
                    title = 'Network Error';
                    description = `Failed to load data for example '${exampleKey}'. Please check your internet connection and try again.`;
                  }
                  addDebugLog(
                    `[DataManager useEffect V14] Error loading example map '${exampleKey}' directly from path '${exampleProject.mapJsonPath}': ${err.message}`
                  );
                  setError(
                    `Failed to load example '${exampleKey}': ${err.message}`
                  );
                  toast({ title, description, variant: 'destructive' });
                })
                .finally(() => {
                  setIsLoading(false);
                  setInitialLoadComplete(true);
                });
            } else {
              addDebugLog(
                `[DataManager useEffect V14] Example project with key '${exampleKey}' not found in example-data.ts.`
              );
              setError(`Example metadata for '${exampleKey}' not found.`);
              toast({
                title: 'Example Not Defined',
                description: `The example '${exampleKey}' is not defined in the application.`,
                variant: 'destructive',
              });
              setIsLoading(false);
              setInitialLoadComplete(true);
            }
          })
          .catch((err) => {
            addDebugLog(
              `[DataManager useEffect V14] Critical Error: Failed to import '@/lib/example-data'. Error: ${err.message}`
            );
            setError(
              `Failed to load the list of available examples: ${err.message}`
            );
            toast({
              title: 'Application Initialization Error',
              description:
                'Could not load the list of examples. Please try refreshing the page or contact support if the issue persists.',
              variant: 'destructive',
            });
            setIsLoading(false);
            setInitialLoadComplete(true);
          });
      } else {
        addDebugLog(
          `[DataManager useEffect V14] Info: Example map '${exampleKey}' already correctly loaded in store.`
        );
        if (isLoading) setIsLoading(false);
      }
      return;
    }

    if (routeMapId === 'new') {
      if (!effectiveUserId) {
        addDebugLog(
          '[DataManager useEffect V13] Guard: Attempt to create new map without user. Aborting.'
        );
        setError('User not authenticated. Cannot create new map.');
        if (isLoading) setIsLoading(false);
        if (!initialLoadComplete) setInitialLoadComplete(true);
        return;
      }
      const storeIsAlreadyCorrectForNewMap =
        isNewMapMode &&
        storeMapId === 'new' &&
        currentMapOwnerId === effectiveUserId &&
        initialLoadComplete;

      if (!storeIsAlreadyCorrectForNewMap) {
        addDebugLog(
          `[DataManager useEffect V13] Action: Initializing NEW map for user '${effectiveUserId}'.`
        );
        initializeNewMap(effectiveUserId);
        useConceptMapStore.temporal.getState().clear();
      } else {
        addDebugLog(
          `[DataManager useEffect V13] Info: Store already correct for new map by user '${effectiveUserId}'.`
        );
        if (isLoading) setIsLoading(false);
      }
      return;
    }

    if (
      routeMapId &&
      !routeMapId.startsWith('example-') &&
      routeMapId !== 'new'
    ) {
      if (!effectiveUserId) {
        addDebugLog(
          '[DataManager useEffect V13] Guard: Attempt to load existing map without user. Aborting.'
        );
        setError('User not authenticated. Cannot load map.');
        if (isLoading) setIsLoading(false);
        if (!initialLoadComplete) setInitialLoadComplete(true);
        return;
      }
      const isCorrectMapIdInStore = storeMapId === routeMapId;
      const isStoreInPotentiallyValidLoadedState =
        !isNewMapMode && initialLoadComplete && !isLoading;
      let shouldLoad = false;

      if (
        !isCorrectMapIdInStore ||
        isNewMapMode ||
        isLoading ||
        !initialLoadComplete
      ) {
        shouldLoad = true;
        addDebugLog(
          `[DataManager useEffect V13] Condition Met for load (existing map): Basic criteria (wrong ID, new mode, loading, or no initial load).`
        );
      } else if (
        isCorrectMapIdInStore &&
        isStoreInPotentiallyValidLoadedState &&
        mapData.nodes.length === 0 &&
        !routeMapId.startsWith('example-')
      ) {
        shouldLoad = true;
        addDebugLog(
          `[DataManager useEffect V13] Condition Met for load (existing map): Correct mapId, load completed, but no nodes. Forcing reload.`
        );
      }

      addDebugLog(
        `[DataManager useEffect V13] Existing Map Evaluation: RouteID='${routeMapId}'. Calculated shouldLoad: ${shouldLoad}`
      );
      if (shouldLoad) {
        addDebugLog(
          `[DataManager useEffect V13] Action: Loading existing map '${routeMapId}'. TargetViewOnly: ${(routeMapId, isViewOnlyModeInStore)}`
        );
        loadMapDataRef.current(routeMapId, isViewOnlyModeInStore);
      } else {
        addDebugLog(
          `[DataManager useEffect V13] Info: Map ID '${routeMapId}' considered loaded and not requiring re-fetch.`
        );
        if (isLoading) setIsLoading(false);
      }
      return;
    }

    if (!routeMapId && isLoading) {
      addDebugLog(
        '[DataManager useEffect V13] Fallback: routeMapId is empty, ensuring isLoading is false.'
      );
      setIsLoading(false);
    }
  }, [
    routeMapId,
    user,
    storeMapId,
    isNewMapMode,
    currentMapOwnerId,
    isLoading,
    initialLoadComplete,
    isViewOnlyModeInStore,
    mapData.nodes.length,
    initializeNewMap,
    setIsLoading,
    setError,
    addDebugLog,
    setInitialLoadComplete,
    setIsViewOnlyMode,
    paramsHook.viewOnly,
    toast,
  ]);

  return { loadMapData };
}
