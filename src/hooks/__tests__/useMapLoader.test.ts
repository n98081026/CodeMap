import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useMapLoader } from '../useMapLoader';

import { useToast } from '@/hooks/use-toast';
import * as mapService from '@/services/conceptMaps/conceptMapService';
import useConceptMapStore from '@/stores/concept-map-store';
import { User, UserRole } from '@/types';

import * as useToastModule from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

vi.mock('next/navigation', () => ({
  useParams: () => ({
    mapId: 'map-123',
  }),
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/config', () => ({
  BYPASS_AUTH_FOR_TESTING: false,
  MOCK_STUDENT_USER: { id: 'student-mock-id' },
  MOCK_USER_FOR_TESTING_MAPS: {},
}));

vi.mock('@/stores/concept-map-store', () => {
  const actual = vi.importActual('@/stores/concept-map-store');
  return {
    ...actual,
    default: vi.fn(),
    temporal: {
      getState: () => ({
        clear: vi.fn(),
      }),
    },
  };
});
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  role: UserRole.STUDENT,
  email: 'student@test.com',
};
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

describe('useMapLoader', () => {
  let storeState: any;
  let toast: vi.Mock;

  beforeEach(() => {
    toast = vi.fn();
    vi.spyOn(useToastModule, 'useToast').mockReturnValue({ toast } as any);
    (useAuth as vi.Mock).mockReturnValue({ user: mockUser, loading: false });

    vi.spyOn(window, 'fetch').mockImplementation(async (url) => {
      if (url.toString().includes('map-123')) {
        return new Response(JSON.stringify(mockMap), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });

    storeState = {
      mapId: null,
      isNewMapMode: true,
      isLoading: false,
      initialLoadComplete: false,
      currentMapOwnerId: null,
      isViewOnlyMode: false,
      mapData: { nodes: [], edges: [] },
      initializeNewMap: vi.fn(),
      setLoadedMap: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      setIsViewOnlyMode: vi.fn(),
      setInitialLoadComplete: vi.fn(),
      addDebugLog: vi.fn(),
    };

    const mockTemporal = {
      getState: () => ({
        clear: vi.fn(),
      }),
    };

    (useConceptMapStore as unknown as vi.Mock).mockImplementation(
      (selector) => {
        if (typeof selector === 'function') {
          return selector(storeState);
        }
        return storeState;
      }
    );
    (useConceptMapStore as any).getState = () => storeState;
    (useConceptMapStore as any).temporal = mockTemporal;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should load an existing map and update the store', async () => {
    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: mockMapId, user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData(mockMapId, false);
    });

    expect(window.fetch).toHaveBeenCalledWith(
      `/api/concept-maps/${mockMapId}`,
      expect.any(Object)
    );
    expect(storeState.setLoadedMap).toHaveBeenCalledWith(mockMap, false);
  });

  it('should handle "new" map id by initializing a new map in the store', async () => {
    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: 'new', user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData('new', false);
    });

    expect(window.fetch).not.toHaveBeenCalled();
    expect(storeState.initializeNewMap).toHaveBeenCalledWith(mockUser.id);
  });

  it('should set an error state if loading fails', async () => {
    const error = new Error('Failed to fetch map');
    (window.fetch as vi.Mock).mockRejectedValue(error);

    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: mockMapId, user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData(mockMapId, false);
    });

    expect(storeState.setError).toHaveBeenCalledWith(error.message);
  });
});
