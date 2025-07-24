/*
/// <reference types="vitest" />
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useConceptMapDataManager } from '../useConceptMapDataManager';

import { useToast } from '@/hooks/use-toast';
import * as mapService from '@/services/conceptMaps/conceptMapService';
import useConceptMapStore from '@/stores/concept-map-store';
import { UserRole } from '@/types';

// Mock dependencies
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/services/conceptMaps/conceptMapService', () => ({
  getConceptMapById: vi.fn(),
  createConceptMap: vi.fn(),
  updateConceptMap: vi.fn(),
}));

vi.mock('@/stores/concept-map-store');

const mockUser = { id: 'user-1', role: UserRole.STUDENT, email: 'student@test.com' };
const mockMapId = 'map-123';
const mockMapData = {
  nodes: [{ id: 'n1', text: 'Node 1', x: 0, y: 0 }],
  edges: [],
};
const mockMap = {
  id: mockMapId,
  name: 'Test Map',
  ownerId: 'user-1',
  mapData: mockMapData,
  isPublic: false,
  sharedWithClassroomId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('useConceptMapDataManager', () => {
  let storeState: any;
  let toast: vi.Mock;

  beforeEach(() => {
    toast = vi.fn();
    (useToast as unknown as vi.Mock).mockReturnValue({ toast });

    // Reset store mock for each test
    storeState = {
      mapId: mockMapId,
      mapName: 'Test Map',
      mapData: mockMapData,
      isPublic: false,
      sharedWithClassroomId: null,
      currentMapOwnerId: 'user-1',
      isNewMapMode: false,
      isStoreLoading: true,
      isStoreSaving: false,
      setMapId: vi.fn(),
      setMapName: vi.fn(),
      setMapData: vi.fn(),
      setIsPublic: vi.fn(),
      setSharedWithClassroomId: vi.fn(),
      setCurrentMapOwnerId: vi.fn(),
      setIsNewMapMode: vi.fn(),
      setIsStoreLoading: vi.fn(),
      setIsStoreSaving: vi.fn(),
      setError: vi.fn(),
      // Add other store methods if they are called
    };
    (useConceptMapStore as unknown as vi.Mock).mockImplementation((selector: any) => {
      // A simple selector implementation for testing
      const stateSlice = {
        mapId: storeState.mapId,
        mapName: storeState.mapName,
        mapData: storeState.mapData,
        isPublic: storeState.isPublic,
        sharedWithClassroomId: storeState.sharedWithClassroomId,
        isNewMapMode: storeState.isNewMapMode,
        isSaving: storeState.isStoreSaving,
      };
      return selector(stateSlice);
    });
    // Also provide access to the whole state for `getState()` calls
    (useConceptMapStore as any).getState = () => storeState;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization and Data Loading', () => {
    it('should load an existing map and update the store', async () => {
      (mapService.getConceptMapById as vi.Mock).mockResolvedValue(mockMap);

      await act(async () => {
        renderHook(() => useConceptMapDataManager({ routeMapId: mockMapId, user: mockUser }));
      });

      expect(mapService.getConceptMapById).toHaveBeenCalledWith(mockMapId);
      expect(storeState.setMapId).toHaveBeenCalledWith(mockMap.id);
      expect(storeState.setMapName).toHaveBeenCalledWith(mockMap.name);
      expect(storeState.setMapData).toHaveBeenCalledWith(mockMap.mapData);
      // ... check other setters
      expect(storeState.setIsStoreLoading).toHaveBeenCalledWith(false);
      expect(storeState.setError).not.toHaveBeenCalled();
    });

    it('should handle "new" map id by initializing a new map in the store', async () => {
      await act(async () => {
        renderHook(() => useConceptMapDataManager({ routeMapId: 'new', user: mockUser }));
      });

      expect(mapService.getConceptMapById).not.toHaveBeenCalled();
      expect(storeState.setIsNewMapMode).toHaveBeenCalledWith(true);
      expect(storeState.setMapName).toHaveBeenCalledWith('New Concept Map');
      // ... check other initialization setters
      expect(storeState.setIsStoreLoading).toHaveBeenCalledWith(false);
    });

    it('should set an error state if loading fails', async () => {
      const error = new Error('Failed to fetch map');
      (mapService.getConceptMapById as vi.Mock).mockRejectedValue(error);

      await act(async () => {
        renderHook(() => useConceptMapDataManager({ routeMapId: mockMapId, user: mockUser }));
      });

      expect(storeState.setError).toHaveBeenCalledWith(error.message);
      expect(storeState.setIsStoreLoading).toHaveBeenCalledWith(false);
    });
  });

  describe('saveMap', () => {
    it('should call updateConceptMap for an existing map', async () => {
      (mapService.getConceptMapById as vi.Mock).mockResolvedValue(mockMap); // Simulate initial load
      const { result } = renderHook(() => useConceptMapDataManager({ routeMapId: mockMapId, user: mockUser }));

      await act(async () => {
        await result.current.saveMap(false); // isViewOnlyMode = false
      });

      expect(storeState.setIsStoreSaving).toHaveBeenCalledWith(true);
      expect(mapService.updateConceptMap).toHaveBeenCalledWith(
        mockMapId,
        expect.objectContaining({
          name: 'Test Map',
          mapData: mockMapData,
        })
      );
      expect(toast).toHaveBeenCalledWith({
        title: 'Map Saved!',
        description: `"${storeState.mapName}" has been updated.`,
      });
      expect(storeState.setIsStoreSaving).toHaveBeenCalledWith(false);
    });

    it('should call createConceptMap for a new map', async () => {
      storeState.isNewMapMode = true;
      storeState.mapId = 'new';
      (mapService.createConceptMap as vi.Mock).mockResolvedValue({ ...mockMap, id: 'new-map-id' });
      const { result } = renderHook(() => useConceptMapDataManager({ routeMapId: 'new', user: mockUser }));

      await act(async () => {
        await result.current.saveMap(false);
      });

      expect(storeState.setIsStoreSaving).toHaveBeenCalledWith(true);
      expect(mapService.createConceptMap).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Map',
          ownerId: mockUser.id,
        })
      );
      expect(storeState.setMapId).toHaveBeenCalledWith('new-map-id');
      expect(toast).toHaveBeenCalledWith({
        title: 'Map Created!',
        description: `"${storeState.mapName}" has been saved.`,
      });
      expect(storeState.setIsStoreSaving).toHaveBeenCalledWith(false);
    });

    it('should handle save errors', async () => {
      const error = new Error('Save failed');
      (mapService.updateConceptMap as vi.Mock).mockRejectedValue(error);
      const { result } = renderHook(() => useConceptMapDataManager({ routeMapId: mockMapId, user: mockUser }));

      await act(async () => {
        await result.current.saveMap(false);
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Error Saving Map',
        description: error.message,
        variant: 'destructive',
      });
      expect(storeState.setIsStoreSaving).toHaveBeenCalledWith(false);
    });
  });
});
*/
export {};
