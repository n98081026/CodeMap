import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMapSaver } from '../useMapSaver';
import { useMapMetaStore } from '@/stores/map-meta-store';
import { useMapDataStore } from '@/stores/map-data-store';
import * as mapService from '@/services/conceptMaps/conceptMapService';
import { useToast } from '@/hooks/use-toast';
import { MOCK_STUDENT_USER } from '@/lib/config';
import { useRouter, usePathname } from 'next/navigation';

// Mock dependencies
vi.mock('@/services/conceptMaps/conceptMapService');
vi.mock('@/hooks/use-toast');
vi.mock('next/navigation');
vi.mock('@/stores/map-meta-store');
vi.mock('@/stores/map-data-store');

describe('useMapSaver', () => {
  const mockToast = vi.fn();
  const mockRouterPush = vi.fn();

  // A more complete mock that includes all functions called by the hook
  const mockMetaStoreValues = {
    setIsLoading: vi.fn(),
    setLoadedMap: vi.fn(),
    addDebugLog: vi.fn(),
    setError: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useToast).mockReturnValue({ toast: mockToast });
    vi.mocked(useRouter).mockReturnValue({ push: mockRouterPush } as any);
    vi.mocked(usePathname).mockReturnValue('/student/concept-map/some-id');
  });

  it('should call updateConceptMap for an existing map', async () => {
    const mockMapId = 'map-123';
    const mockMapData = { nodes: [{id: '1'}], edges: [] };
    const mockMapName = 'My Existing Map';

    vi.mocked(useMapMetaStore).mockReturnValue({
      ...mockMetaStoreValues,
      mapId: mockMapId,
      isNewMapMode: false,
      mapName: mockMapName,
      isPublic: false,
      sharedWithClassroomId: null,
    });
    vi.mocked(useMapDataStore).mockReturnValue({ mapData: mockMapData });

    vi.mocked(mapService.updateConceptMap).mockResolvedValue({ id: mockMapId } as any);
    const { result } = renderHook(() => useMapSaver({ user: MOCK_STUDENT_USER }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(mapService.updateConceptMap).toHaveBeenCalledWith(
      mockMapId,
      expect.objectContaining({
        name: mockMapName,
        mapData: mockMapData,
      })
    );
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Map Saved',
      description: `"${mockMapName}" has been saved successfully.`,
    });
  });

  it('should call createConceptMap for a new map and redirect', async () => {
    const mockMapData = { nodes: [{id: 'new-node'}], edges: [] };
    const mockMapName = 'My New Map';

    vi.mocked(useMapMetaStore).mockReturnValue({
        ...mockMetaStoreValues,
        mapId: 'new',
        isNewMapMode: true,
        mapName: mockMapName,
        isPublic: false,
        sharedWithClassroomId: null,
      });
    vi.mocked(useMapDataStore).mockReturnValue({ mapData: mockMapData });

    vi.mocked(mapService.createConceptMap).mockResolvedValue({ id: 'newly-created-id' } as any);
    const { result } = renderHook(() => useMapSaver({ user: MOCK_STUDENT_USER }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(mapService.createConceptMap).toHaveBeenCalledWith(
      mockMapName,
      MOCK_STUDENT_USER.id,
      mockMapData,
      false,
      null
    );
    expect(mockRouterPush).toHaveBeenCalledWith('/concept-maps/editor/newly-created-id');
  });

  it('should handle save errors', async () => {
    const error = new Error('Save failed');
    vi.mocked(useMapMetaStore).mockReturnValue({
        ...mockMetaStoreValues,
        mapId: 'map-123',
        isNewMapMode: false,
        mapName: 'A valid map name' // Provide mapName to pass the trim() check
    });
    vi.mocked(useMapDataStore).mockReturnValue({ mapData: {nodes:[], edges:[]} });
    vi.mocked(mapService.updateConceptMap).mockRejectedValue(error);

    const { result } = renderHook(() => useMapSaver({ user: MOCK_STUDENT_USER }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Save Failed',
      description: error.message,
      variant: 'destructive',
    });
  });
});
