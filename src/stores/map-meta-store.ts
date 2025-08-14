import { create } from 'zustand';
import type { ConceptMap } from '@/types';
import { useMapDataStore } from './map-data-store';

export interface MapMetaState {
  mapId: string | null;
  mapName: string;
  currentMapOwnerId: string | null;
  currentMapCreatedAt: string | null;
  isPublic: boolean;
  sharedWithClassroomId: string | null;
  isNewMapMode: boolean;
  isViewOnlyMode: boolean;
  initialLoadComplete: boolean;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  debugLogs: string[];

  setMapId: (id: string | null) => void;
  setMapName: (name: string) => void;
  setCurrentMapOwnerId: (ownerId: string | null) => void;
  setCurrentMapCreatedAt: (createdAt: string | null) => void;
  setIsPublic: (isPublic: boolean) => void;
  setSharedWithClassroomId: (classroomId: string | null) => void;
  setIsNewMapMode: (isNew: boolean) => void;
  setIsViewOnlyMode: (isViewOnly: boolean) => void;
  setInitialLoadComplete: (complete: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setError: (error: string | null) => void;
  addDebugLog: (log: string) => void;
  clearDebugLogs: () => void;
  initializeNewMap: (userId: string) => void;
  setLoadedMap: (map: ConceptMap, viewOnly?: boolean) => void;
  resetStore: () => void;
}

const initialState: Omit<MapMetaState, 'setMapId' | 'setMapName' | 'setCurrentMapOwnerId' | 'setCurrentMapCreatedAt' | 'setIsPublic' | 'setSharedWithClassroomId' | 'setIsNewMapMode' | 'setIsViewOnlyMode' | 'setInitialLoadComplete' | 'setIsLoading' | 'setIsSaving' | 'setError' | 'addDebugLog' | 'clearDebugLogs' | 'initializeNewMap' | 'setLoadedMap' | 'resetStore'> = {
  mapId: null,
  mapName: 'Untitled Concept Map',
  currentMapOwnerId: null,
  currentMapCreatedAt: null,
  isPublic: false,
  sharedWithClassroomId: null,
  isNewMapMode: true,
  isViewOnlyMode: false,
  initialLoadComplete: false,
  isLoading: false,
  isSaving: false,
  error: null,
  debugLogs: [],
};

export const useMapMetaStore = create<MapMetaState>((set, get) => ({
  ...initialState,
  setMapId: (id) => set({ mapId: id }),
  setMapName: (name) => set({ mapName: name }),
  setCurrentMapOwnerId: (ownerId) => set({ currentMapOwnerId: ownerId }),
  setCurrentMapCreatedAt: (createdAt) => set({ currentMapCreatedAt: createdAt }),
  setIsPublic: (isPublicStatus) => set({ isPublic: isPublicStatus }),
  setSharedWithClassroomId: (id) => set({ sharedWithClassroomId: id }),
  setIsNewMapMode: (isNew) => set({ isNewMapMode: isNew }),
  setIsViewOnlyMode: (isViewOnly) => set({ isViewOnlyMode: isViewOnly }),
  setInitialLoadComplete: (complete) => set({ initialLoadComplete: complete }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSaving: (saving) => set({ isSaving: saving }),
  setError: (errorMsg) => set({ error: errorMsg }),
  addDebugLog: (log) =>
    set((state) => ({
      debugLogs: [...state.debugLogs, `${new Date().toISOString()}: ${log}`].slice(-100),
    })),
  clearDebugLogs: () => set({ debugLogs: [] }),
  initializeNewMap: (userId: string) => {
    get().addDebugLog(`[STORE initializeNewMap] User: ${userId}.`);
    set({
      ...initialState,
      mapId: 'new',
      mapName: 'New Concept Map',
      currentMapOwnerId: userId,
      currentMapCreatedAt: new Date().toISOString(),
      isNewMapMode: true,
      initialLoadComplete: true,
      debugLogs: get().debugLogs,
    });
    // This action now needs to reset other stores as well.
    // For now, we'll just handle this store's state.
    // A more robust solution would use a coordinating action or middleware.
    useMapDataStore.getState().setMapData({ nodes: [], edges: [] });
  },
  setLoadedMap: (map, viewOnly = false) => {
    get().addDebugLog(`[STORE setLoadedMap] Map ID: ${map.id}, ViewOnly: ${viewOnly}`);
    set({
      ...initialState,
      mapId: map.id,
      mapName: map.name,
      currentMapOwnerId: map.ownerId,
      currentMapCreatedAt: map.createdAt,
      isPublic: map.isPublic,
      sharedWithClassroomId: map.sharedWithClassroomId || null,
      isNewMapMode: false,
      isViewOnlyMode: viewOnly,
      initialLoadComplete: true,
      debugLogs: get().debugLogs,
    });
    useMapDataStore.getState().setMapData(map.mapData || { nodes: [], edges: [] });
  },
  resetStore: () => {
    set({ ...initialState, initialLoadComplete: false, debugLogs: [] });
    useMapDataStore.getState().setMapData({ nodes: [], edges: [] });
  },
}));
