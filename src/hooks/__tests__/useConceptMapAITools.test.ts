import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useConceptMapAITools } from '../useConceptMapAITools';

import { useAuth } from '@/contexts/auth-context'; // Keep this, but it's mocked
import { useToast } from '@/hooks/use-toast';
import * as conceptMapService from '@/services/conceptMaps/conceptMapService';
import { useConceptMapStore } from '@/stores/concept-map-store';
import { UserRole } from '@/types';

// Mock Next.js navigation
const mockRouterPush = vi.fn();
const mockRouterReplace = vi.fn();
const mockParamsGet = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
  }),
  usePathname: () => '/mock-path', // Provide a mock pathname
  useParams: () => ({
    // Mock useParams
    viewOnly: mockParamsGet('viewOnly'), // Allow tests to control this
    // Add other params if your hook uses them, e.g., mapId from URL path
    mapId: mockParamsGet('mapId'),
  }),
}));

// Mock useAuth - we don't need its internal logic for these tests, just its output
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(),
}));

// Mock conceptMapService
vi.mock('@/services/conceptMaps/conceptMapService');

// Mock useToast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock a minimal Zustand store
vi.mock('@/stores/concept-map-store', async () => {
  let mockStoreState: any;

  const mockInitializeNewMap = vi.fn();
  const mockSetLoadedMap = vi.fn();
  const mockSetIsLoading = vi.fn();
  const mockSetError = vi.fn();
  const mockSetIsViewOnlyMode = vi.fn();
  const mockSetInitialLoadComplete = vi.fn();
  const mockAddDebugLog = vi.fn();
  const mockLoadExampleMapData = vi.fn();

  // This function will be called in beforeEach to reset the state
  const resetMockState = () => {
    mockStoreState = {
      mapId: null,
      mapName: 'Test Map',
      currentMapOwnerId: null,
      isPublic: false,
      sharedWithClassroomId: null,
      isNewMapMode: true,
      isViewOnlyMode: false,
      mapData: { nodes: [], edges: [] },
      isLoading: false,
      initialLoadComplete: false,
      error: null,
      initializeNewMap: mockInitializeNewMap,
      setLoadedMap: mockSetLoadedMap,
      setIsLoading: mockSetIsLoading,
      setError: mockSetError,
      setIsViewOnlyMode: mockSetIsViewOnlyMode,
      setInitialLoadComplete: mockSetInitialLoadComplete,
      addDebugLog: mockAddDebugLog,
      loadExampleMapData: mockLoadExampleMapData,
    };
  };

  resetMockState(); // Initial setup

  const mockTemporal = {
    getState: () => ({
      clear: vi.fn(),
    }),
  };

  const storeHookMock = () => ({
    ...mockStoreState,
    temporal: mockTemporal,
  });

  storeHookMock.getState = () => ({
    ...mockStoreState,
    temporal: mockTemporal,
  });

  storeHookMock.temporal = mockTemporal;
  storeHookMock.reset = resetMockState; // Expose reset function

  return {
    useConceptMapStore: storeHookMock,
    default: storeHookMock,
  };
});

// Mock global fetch
global.fetch = vi.fn();

// Mock example-data
const mockExampleProjects = [
  {
    key: 'example1',
    name: 'Example Project 1',
    mapJsonPath: '/example-maps/example1.json',
  },
  {
    key: 'example-valid',
    name: 'Valid Example',
    mapJsonPath: '/example-maps/example-valid.json',
  },
];
vi.mock('@/lib/example-data', () => ({
  exampleProjects: mockExampleProjects,
}));

describe.skip('useConceptMapAITools', () => {
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'test-user-id', role: UserRole.STUDENT };
    (useAuth as vi.Mock).mockReturnValue({ user: mockUser });

    // Reset params for each test
    mockParamsGet.mockImplementation((key: string) => {
      if (key === 'viewOnly') return undefined;
      if (key === 'mapId') return undefined; // For path-based mapId
      return undefined;
    });

    (fetch as vi.Mock).mockReset(); // Reset fetch mocks
    vi.spyOn(global, 'fetch').mockImplementation(
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          nodes: [{ id: 'node1', text: 'Example Node' }],
          edges: [],
        }),
      })
    );
  });

  describe('useEffect - Loading Example Maps via URL', () => {
    it('should load example map data from URL params, set view-only mode', async () => {
      const exampleKey = 'valid';
      const routeMapId = `example-${exampleKey}`;
      mockParamsGet.mockImplementation((key: string) => {
        if (key === 'viewOnly') return 'true';
        return undefined;
      });

      const mockExampleData = {
        nodes: [{ id: 'node1', text: 'Example Node' }],
        edges: [],
      };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExampleData,
      });

      const { rerender } = renderHook(
        ({ routeMapId, user }) => useConceptMapDataManager({ routeMapId, user }),
        { initialProps: { routeMapId: routeMapId, user: null } } // Simulate guest initially
      );

      // Wait for useEffect to run and async operations to complete
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0)); // Allow microtasks to run
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      const mockSetIsLoading = useConceptMapStore.getState().setIsLoading;
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      const mockLoadExampleMapData =
        useConceptMapStore.getState().loadExampleMapData;
      expect(mockLoadExampleMapData).toHaveBeenCalledWith(
        mockExampleData,
        mockExampleProjects.find(
          (p) => p.key === `example-${exampleKey}` || p.key === exampleKey
        )?.name
      );
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      const mockSetInitialLoadComplete =
        useConceptMapStore.getState().setInitialLoadComplete;
      expect(mockSetInitialLoadComplete).toHaveBeenCalledWith(true);
      const mockSetError = useConceptMapStore.getState().setError;
      expect(mockSetError).toHaveBeenCalledWith(null); // Ensure no error was set
    });

    it('should handle fetch error when loading example map from URL', async () => {
      const exampleKey = 'fetch-error-example';
      const routeMapId = `example-${exampleKey}`;
      mockParamsGet.mockImplementation((key: string) => {
        if (key === 'viewOnly') return 'true';
        return undefined;
      });

      (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network Error'));
      // Ensure example-data has this key so it attempts fetch
      vi.doMock('@/lib/example-data', () => ({
        exampleProjects: [
          ...mockExampleProjects,
          {
            key: exampleKey,
            name: 'Fetch Error Example',
            mapJsonPath: `/example-maps/${exampleKey}.json`,
          },
        ],
      }));

      const { rerender } = renderHook(
        ({ routeMapId, user }) => useConceptMapDataManager({ routeMapId, user }),
        { initialProps: { routeMapId: routeMapId, user: null } }
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      const mockSetIsLoading = useConceptMapStore.getState().setIsLoading;
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      const mockSetError = useConceptMapStore.getState().setError;
      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load example')
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Network Error',
        })
      );
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      const mockSetInitialLoadComplete =
        useConceptMapStore.getState().setInitialLoadComplete;
      expect(mockSetInitialLoadComplete).toHaveBeenCalledWith(true);
      vi.doUnmock('@/lib/example-data'); // Clean up mock
    });

    it('should handle invalid JSON when loading example map from URL', async () => {
      const exampleKey = 'invalid-json-example';
      const routeMapId = `example-${exampleKey}`;
      mockParamsGet.mockImplementation((key: string) => {
        if (key === 'viewOnly') return 'true';
        return undefined;
      });
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });
      vi.doMock('@/lib/example-data', () => ({
        exampleProjects: [
          ...mockExampleProjects,
          {
            key: exampleKey,
            name: 'Invalid JSON Example',
            mapJsonPath: `/example-maps/${exampleKey}.json`,
          },
        ],
      }));

      const { rerender } = renderHook(
        ({ routeMapId, user }) => useConceptMapDataManager({ routeMapId, user }),
        { initialProps: { routeMapId: routeMapId, user: null } }
      );

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      const mockSetError = useConceptMapStore.getState().setError;
      expect(mockSetError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON format')
      );
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          variant: 'destructive',
          title: 'Data Format Error',
        })
      );
      vi.doUnmock('@/lib/example-data');
    });
  });

  // Previous tests for loadExampleMapById and saveMap can remain,
  // but ensure they align with the updated store action names if those changed.
  // For example, if setInitialMapData was replaced by setLoadedMap or loadExampleMapData.
  // The existing tests in the provided file are using different mock store names.
  // I will adapt them slightly to use the new mockStoreState structure if needed.

  // Example of adapting an existing test for saveMap (if its structure was similar)
  describe('saveMap (adapted)', () => {
    it('should not attempt to save if in view-only mode', async () => {
      // Simulate store being in view-only mode
      const state = useConceptMapStore.getState();
      state.isViewOnlyMode = true;
      state.mapId = null;

      const { result } = renderHook(() =>
        useConceptMapDataManager({
          routeMapId: 'example-somekey',
          user: null,
        })
      );

      await act(async () => {
        await result.current.saveMap(true); // Explicitly pass true for viewOnly param as per hook logic
      });

      expect(fetch).not.toHaveBeenCalled(); // Assuming saveMap calls fetch
      const setIsLoading = useConceptMapStore.getState().setIsLoading;
      expect(setIsLoading).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'View Only Mode' })
      );
    });
  });
});
