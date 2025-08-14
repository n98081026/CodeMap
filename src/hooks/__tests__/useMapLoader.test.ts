import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import { useMapLoader } from '../useMapLoader';
import { User, UserRole } from '@/types';

const mockUser: User = {
  id: 'user-1',
  name: 'Test User',
  role: UserRole.STUDENT,
  email: 'student@test.com',
};

const mockMapData = {
  nodes: [{ id: 'n1', text: 'Node 1', x: 0, y: 0 }],
  edges: [],
};

const mockMap = {
  id: 'map-123',
  name: 'Test Map',
  ownerId: 'user-1',
  mapData: mockMapData,
  isPublic: false,
  sharedWithClassroomId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Create a simple mock store
const mockStore = {
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

// Mock the store
vi.mock('@/stores/concept-map-store', () => ({
  useConceptMapStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));

describe('useMapLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fetch
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.toString().includes('map-123')) {
        return new Response(JSON.stringify(mockMap), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(null, { status: 404 });
    });
  });

  it('should initialize without hanging', () => {
    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: 'new', user: mockUser })
    );
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.loadMapData).toBe('function');
  });

  it('should load an existing map', async () => {
    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: 'map-123', user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData('map-123', false);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/concept-maps/map-123`,
      expect.any(Object)
    );
    expect(mockStore.setLoadedMap).toHaveBeenCalledWith(mockMap, false);
  });

  it('should handle new map initialization', async () => {
    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: 'new', user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData('new', false);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockStore.initializeNewMap).toHaveBeenCalledWith(mockUser.id);
  });

  it('should handle loading errors', async () => {
    const error = new Error('Failed to fetch map');
    (global.fetch as Mock).mockRejectedValue(error);

    const { result } = renderHook(() =>
      useMapLoader({ routeMapId: 'map-123', user: mockUser })
    );

    await act(async () => {
      await result.current.loadMapData('map-123', false);
    });

    expect(mockStore.setError).toHaveBeenCalledWith(error.message);
  });
});