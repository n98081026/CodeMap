import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMapLoader } from '../useMapLoader';
import { useMapMetaStore } from '@/stores/map-meta-store';
import { MOCK_STUDENT_USER } from '@/lib/config';
import { useParams } from 'next/navigation';

// Mock dependencies
vi.mock('next/navigation');
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));
vi.mock('@/stores/map-meta-store');
vi.mock('@/stores/map-data-store', () => ({
  useMapDataStore: vi.fn(() => ({ mapData: { nodes: [], edges: [] } })),
}));
vi.mock('@/stores/concept-map-store');

const mockInitializeNewMap = vi.fn();
const mockSetLoadedMap = vi.fn();
const mockSetIsLoading = vi.fn();
const mockSetError = vi.fn();
const mockSetIsViewOnlyMode = vi.fn();
const mockSetInitialLoadComplete = vi.fn();
const mockAddDebugLog = vi.fn();

describe('useMapLoader', () => {
  let useEffect;

  const mockUseEffect = () => {
    useEffect.mockImplementation(f => f());
  };

  beforeEach(() => {
    useEffect = vi.spyOn(require('react'), 'useEffect');
    mockUseEffect();

    vi.mocked(useMapMetaStore).mockReturnValue({
      mapId: null,
      isNewMapMode: true,
      isLoading: false,
      initialLoadComplete: false,
      currentMapOwnerId: null,
      isViewOnlyMode: false,
      initializeNewMap: mockInitializeNewMap,
      setLoadedMap: mockSetLoadedMap,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      setIsViewOnlyMode: mockSetIsViewOnlyMode,
      setInitialLoadComplete: mockSetInitialLoadComplete,
      addDebugLog: mockAddDebugLog,
    });

    // Set a default mock for useParams before each test
    vi.mocked(useParams).mockReturnValue({ viewOnly: 'false' });
    vi.clearAllMocks();
  });

  it('should call initializeNewMap when routeMapId is "new"', () => {
    renderHook(() => useMapLoader({ routeMapId: 'new', user: MOCK_STUDENT_USER }));
    expect(mockInitializeNewMap).toHaveBeenCalledWith(MOCK_STUDENT_USER.id);
  });

  it('should fetch and load an existing map', async () => {
    const mockMap = { id: 'map-123', name: 'Test Map', mapData: { nodes: [{id: '1'}], edges: [] } };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockMap),
    });

    renderHook(() => useMapLoader({ routeMapId: 'map-123', user: MOCK_STUDENT_USER }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/concept-maps/map-123', expect.any(Object));
    });

    await waitFor(() => {
      expect(mockSetLoadedMap).toHaveBeenCalledWith(mockMap, false);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Network Failure');
    global.fetch = vi.fn().mockRejectedValue(error);

    renderHook(() => useMapLoader({ routeMapId: 'map-456', user: MOCK_STUDENT_USER }));

    await waitFor(() => {
      expect(mockSetError).toHaveBeenCalledWith(error.message);
    });
  });

  it('should not run fetch if user is not available for a non-example map', () => {
    global.fetch = vi.fn();
    renderHook(() => useMapLoader({ routeMapId: 'map-123', user: null }));
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockSetError).toHaveBeenCalledWith('User not authenticated. Cannot perform map operations.');
  });
});