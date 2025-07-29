import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { useRouter } from 'next/navigation';

import { useMapSaver } from '../useMapSaver';

import { useToast } from '@/hooks/use-toast';
import * as mapService from '@/services/conceptMaps/conceptMapService';
import { useConceptMapStore } from '@/stores/concept-map-store';
import { User, UserRole } from '@/types';

import * as useToastModule from '@/hooks/use-toast';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn().mockReturnValue('/student/concept-map/map-123'),
}));

vi.mock('@/lib/config', () => ({
  BYPASS_AUTH_FOR_TESTING: false,
  MOCK_STUDENT_USER: { id: 'student-mock-id' },
}));

vi.mock('@/services/conceptMaps/conceptMapService', () => ({
  createConceptMap: vi.fn(),
  updateConceptMap: vi.fn(),
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

describe('useMapSaver', () => {
  let storeState: any;
  let toast: Mock;
  let mockRouter: {
    push: Mock;
    replace: Mock;
  };

  beforeEach(() => {
    toast = vi.fn();
    vi.spyOn(useToastModule, 'useToast').mockReturnValue({ toast } as any);
    vi.mock('@/contexts/auth-context', () => ({
      useAuth: vi.fn().mockReturnValue({ user: mockUser, loading: false }),
    }));

    mockRouter = {
      push: vi.fn(),
      replace: vi.fn(),
    };
    (useRouter as Mock).mockReturnValue(mockRouter);

    storeState = {
      mapId: mockMapId,
      mapName: 'Test Map',
      mapData: mockMapData,
      isPublic: false,
      sharedWithClassroomId: null,
      isNewMapMode: false,
      setLoadedMap: vi.fn(),
      setIsLoading: vi.fn(),
      setError: vi.fn(),
      addDebugLog: vi.fn(),
    };
    (useConceptMapStore as unknown as Mock).mockImplementation(
      (selector) => {
        if (typeof selector === 'function') {
          return selector(storeState);
        }
        return storeState;
      }
    );
    (useConceptMapStore as any).getState = () => storeState;
    (useConceptMapStore as any).temporal = {
      getState: () => ({
        clear: vi.fn(),
      }),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should call updateConceptMap for an existing map', async () => {
    (mapService.updateConceptMap as Mock).mockResolvedValue(mockMap);
    const { result } = renderHook(() => useMapSaver({ user: mockUser }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(mapService.updateConceptMap).toHaveBeenCalledWith(
      mockMapId,
      expect.objectContaining({
        name: 'Test Map',
        mapData: mockMapData,
      })
    );
    expect(toast).toHaveBeenCalledWith({
      title: 'Map Saved',
      description: `"${storeState.mapName}" has been saved successfully.`,
    });
  });

  it('should call createConceptMap for a new map', async () => {
    storeState.isNewMapMode = true;
    storeState.mapId = 'new';
    (mapService.createConceptMap as Mock).mockResolvedValue({
      ...mockMap,
      id: 'new-map-id',
    });
    const { result } = renderHook(() => useMapSaver({ user: mockUser }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(mapService.createConceptMap).toHaveBeenCalledWith(
      'Test Map',
      mockUser.id,
      mockMapData,
      false,
      null
    );
    expect(toast).toHaveBeenCalledWith({
      title: 'Map Saved',
      description: `"${storeState.mapName}" has been saved successfully.`,
    });
  });

  it('should handle save errors', async () => {
    const error = new Error('Save failed');
    (mapService.updateConceptMap as Mock).mockRejectedValue(error);
    const { result } = renderHook(() => useMapSaver({ user: mockUser }));

    await act(async () => {
      await result.current.saveMap(false);
    });

    expect(toast).toHaveBeenCalledWith({
      title: 'Save Failed',
      description: error.message,
      variant: 'destructive',
    });
  });
});
