import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useConceptMapDataManager } from './useConceptMapDataManager';
import { useAuth } from '@/contexts/auth-context'; // Keep this, but it's mocked
import { useConceptMapStore } from '@/stores/concept-map-store';
import * as conceptMapService from '@/services/conceptMaps/conceptMapService';
import { UserRole } from '@/types';
import { useToast } from '@/hooks/use-toast';

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
  useParams: () => ({ // Mock useParams
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
const mockInitializeNewMap = vi.fn();
const mockSetLoadedMap = vi.fn();
const mockSetIsLoading = vi.fn();
const mockSetError = vi.fn();
const mockSetIsViewOnlyMode = vi.fn();
const mockSetInitialLoadComplete = vi.fn();
const mockAddDebugLog = vi.fn();
const mockLoadExampleMapData = vi.fn(); // For store's loadExampleMapData

const mockStoreState = {
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
  loadExampleMapData: mockLoadExampleMapData, // Mock the store's action
  // Add other state/actions as needed by the hook
  temporal: { // Mock the temporal part if zundo is deeply integrated in ways that affect tests
    getState: () => ({
      clear: vi.fn(),
    }),
  },
};

// vi.mock('@/stores/concept-map-store', () => ({
//   useConceptMapStore: vi.fn(() => mockStoreState),
//   // If you need to access getState().clear() for temporal
//   // default: { getState: () => mockStoreState, temporal: { getState: () => ({ clear: vi.fn() }) } }
// }));

vi.mock('@/stores/concept-map-store', () => {
  const actualStore = vi.importActual('@/stores/concept-map-store');
  const mockTemporal = {
    getState: () => ({
      clear: vi.fn(),
      // ... other temporal state/actions if needed
    }),
    // ... other temporal methods like `subscribe`, `destroy` if used
  };

  // Create a spy on the actual store and then override parts of it
  const storeSpy = vi.fn(() => ({
    ...actualStore.useConceptMapStore.getState(), // Get actual initial state
    ...mockStoreState, // Override with mocks for actions
    temporal: mockTemporal, // Provide mock temporal
  }));

  // Also mock the `getState` method if it's used directly
  storeSpy.getState = () => ({
    ...actualStore.useConceptMapStore.getState(),
    ...mockStoreState,
    temporal: mockTemporal,
  });

  return {
    useConceptMapStore: storeSpy,
    default: {
      ...actualStore.default, // Spread actual default export
      getState: storeSpy.getState, // Override getState
      temporal: mockTemporal, // Provide mock temporal for direct access
    }
  };
});


// Mock global fetch
global.fetch = vi.fn();

// Mock example-data
const mockExampleProjects = [
  { key: 'example1', name: 'Example Project 1', mapJsonPath: '/example-maps/example1.json' },
  { key: 'example-valid', name: 'Valid Example', mapJsonPath: '/example-maps/example-valid.json' },
];
vi.mock('@/lib/example-data', () => ({
  exampleProjects: mockExampleProjects,
}));


describe('useConceptMapDataManager', () => {
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

    // Reset store state mocks
    Object.assign(mockStoreState, {
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
    });
    // Ensure the store mock reflects the reset state for subsequent calls to useConceptMapStore()
     (useConceptMapStore as vi.Mock).mockImplementation(() => ({
      ...mockStoreState,
       temporal: { getState: () => ({ clear: vi.fn() }) }
    }));
    (useConceptMapStore as any).getState = () => ({ ...mockStoreState, temporal: { getState: () => ({ clear: vi.fn() }) } });


    (fetch as vi.Mock).mockReset(); // Reset fetch mocks
  });

  describe('useEffect - Loading Example Maps via URL', () => {
    it('should load example map data from URL params, set view-only mode', async () => {
      const exampleKey = 'valid';
      const routeMapId = `example-${exampleKey}`;
      mockParamsGet.mockImplementation((key: string) => {
        if (key === 'viewOnly') return 'true';
        return undefined;
      });

      const mockExampleData = { nodes: [{ id: 'node1', text: 'Example Node' }], edges: [] };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExampleData,
      });

      const { rerender } = renderHook(
        ({ routeMapIdFromProps, user }) => useConceptMapDataManager({ routeMapIdFromProps, user }),
        { initialProps: { routeMapIdFromProps: routeMapId, user: null } } // Simulate guest initially
      );

      // Wait for useEffect to run and async operations to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0)); // Allow microtasks to run
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockLoadExampleMapData).toHaveBeenCalledWith(mockExampleData, mockExampleProjects.find(p=>p.key === `example-${exampleKey}` || p.key === exampleKey)?.name);
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
      expect(mockSetInitialLoadComplete).toHaveBeenCalledWith(true);
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
        exampleProjects: [...mockExampleProjects, { key: exampleKey, name: 'Fetch Error Example', mapJsonPath: `/example-maps/${exampleKey}.json` }],
      }));


      const { rerender } = renderHook(
        ({ routeMapIdFromProps, user }) => useConceptMapDataManager({ routeMapIdFromProps, user }),
        { initialProps: { routeMapIdFromProps: routeMapId, user: null } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining('Failed to load example'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'Network Error' }));
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
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
        json: async () => { throw new Error('Invalid JSON'); },
      });
      vi.doMock('@/lib/example-data', () => ({
        exampleProjects: [...mockExampleProjects, { key: exampleKey, name: 'Invalid JSON Example', mapJsonPath: `/example-maps/${exampleKey}.json` }],
      }));

      const { rerender } = renderHook(
        ({ routeMapIdFromProps, user }) => useConceptMapDataManager({ routeMapIdFromProps, user }),
        { initialProps: { routeMapIdFromProps: routeMapId, user: null } }
      );

      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleKey}.json`);
      expect(mockSetError).toHaveBeenCalledWith(expect.stringContaining('Invalid JSON format'));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'Data Format Error' }));
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
      mockStoreState.isViewOnlyMode = true;
      mockStoreState.mapId = 'example-somekey'; // Simulate an example map ID

      const { result } = renderHook(() => useConceptMapDataManager({routeMapIdFromProps: 'example-somekey', user: null}));

      await act(async () => {
        await result.current.saveMap(true); // Explicitly pass true for viewOnly param as per hook logic
      });

      expect(fetch).not.toHaveBeenCalled(); // Assuming saveMap calls fetch
      expect(mockSetIsLoading).not.toHaveBeenCalledWith(true);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({title: "View Only Mode"}));
    });
  });

});
