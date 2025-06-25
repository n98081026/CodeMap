import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } // If testing custom hooks directly without a component
from '@testing-library/react';
import { useConceptMapDataManager } from './useConceptMapDataManager';
import { useAuth } from '@/contexts/auth-context';
import { useConceptMapStore } from '@/stores/concept-map-store';
import * as conceptMapService from '@/services/conceptMaps/conceptMapService';

// Mock useAuth
vi.mock('@/contexts/auth-context');

// Mock conceptMapService
vi.mock('@/services/conceptMaps/conceptMapService');

// Mock a minimal Zustand store
const mockSetMapData = vi.fn();
const mockSetCurrentMapId = vi.fn();
const mockSetIsViewOnlyMode = vi.fn();
const mockSetLoading = vi.fn();
const mockSetError = vi.fn();
const mockResetMapState = vi.fn();
// Add any other store functions used by the hook
const mockStore = {
  mapData: { nodes: [], edges: [] },
  currentMapId: null,
  isViewOnlyMode: false,
  isLoading: false,
  error: null,
  setMapData: mockSetMapData,
  setCurrentMapId: mockSetCurrentMapId,
  setIsViewOnlyMode: mockSetIsViewOnlyMode,
  setLoading: mockSetLoading,
  setError: mockSetError,
  resetMapState: mockResetMapState,
  // Mock other store state/actions if needed by the hook for these tests
  setInitialMapData: vi.fn(),
  setIsDirty: vi.fn(),
  setMapTitle: vi.fn(),
  setSharingSettings: vi.fn(),
};

vi.mock('@/stores/concept-map-store', () => ({
  useConceptMapStore: vi.fn(() => mockStore),
}));

// Mock global fetch
global.fetch = vi.fn();

describe('useConceptMapDataManager - Guest Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state mocks for each test
    mockStore.mapData = { nodes: [], edges: [] };
    mockStore.currentMapId = null;
    mockStore.isViewOnlyMode = false;
    mockStore.isLoading = false;
    mockStore.error = null;

    // Default auth state (not guest)
    (useAuth as vi.Mock).mockReturnValue({
      user: { id: 'test-user' },
      profile: { role: 'student' },
      isGuestSession: false,
    });
  });

  describe('loadExampleMapById', () => {
    it('should load example map data, set view-only mode, and indicate guest viewing when guest session is active', async () => {
      // Arrange: Guest session
      (useAuth as vi.Mock).mockReturnValue({
        user: null,
        profile: null,
        isGuestSession: true,
      });

      const exampleMapId = 'example1';
      const mockExampleMapData = { id:'example1', title: 'Example Map', nodes: [{ id: 'n1', data: { label: 'Node 1' }, position: {x:0, y:0} }], edges: [] };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExampleMapData,
      });

      const { result } = renderHook(() => useConceptMapDataManager());

      // Act
      await act(async () => {
        await result.current.loadExampleMapById(exampleMapId);
      });

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleMapId}.json`);
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetInitialMapData).toHaveBeenCalledWith(mockExampleMapData); // Or setMapData depending on hook's logic
      expect(mockSetCurrentMapId).toHaveBeenCalledWith(exampleMapId); // Or `example-${exampleMapId}` if prefixed
      expect(mockSetIsViewOnlyMode).toHaveBeenCalledWith(true);
      // expect(mockSetIsGuestViewingExample).toHaveBeenCalledWith(true); // If such a setter exists
      expect(mockSetLoading).toHaveBeenCalledWith(false);
      expect(mockSetError).toHaveBeenCalledWith(null);
       // Check if the hook or store sets a specific flag for guest viewing example
      // This might be an internal state of the hook or a store state.
      // For now, we verify viewOnlyMode is set.
      const finalStoreState = useConceptMapStore(); // get the latest state
      expect(finalStoreState.isViewOnlyMode).toBe(true);
    });

    it('should still load example map data and set view-only for authenticated users', async () => {
       // Arrange: Authenticated user (default mock)
      const exampleMapId = 'example2';
      const mockExampleMapData = { id:'example2', title: 'Another Example', nodes: [], edges: [] };
      (fetch as vi.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExampleMapData,
      });
      const { result } = renderHook(() => useConceptMapDataManager());

      // Act
      await act(async () => {
        await result.current.loadExampleMapById(exampleMapId);
      });

      // Assert
      expect(fetch).toHaveBeenCalledWith(`/example-maps/${exampleMapId}.json`);
      expect(mockSetIsViewOnlyMode).toHaveBeenCalledWith(true); // Still view-only
      // Ensure no guest-specific flag is set if it exists
      // e.g. expect(mockSetIsGuestViewingExample).not.toHaveBeenCalled(); or ensure it's false
      const finalStoreState = useConceptMapStore();
      expect(finalStoreState.isViewOnlyMode).toBe(true);
    });
  });

  describe('saveMap', () => {
    it('should not attempt to save if in view-only mode (guest viewing example)', async () => {
      // Arrange: Guest session, map loaded in view-only mode
      (useAuth as vi.Mock).mockReturnValue({
        user: null,
        profile: null,
        isGuestSession: true,
      });
      // Simulate store being in view-only mode
      (useConceptMapStore as vi.Mock).mockImplementation(() => ({
        ...mockStore,
        isViewOnlyMode: true,
        currentMapId: 'example1',
        mapData: { title: 'Test', nodes: [{id: '1', data:{label:'n'}, position:{x:0,y:0}}], edges:[]},
        isDirty: true,
      }));


      const { result } = renderHook(() => useConceptMapDataManager());

      // Act
      await act(async () => {
        await result.current.saveMap();
      });

      // Assert
      expect(conceptMapService.createConceptMap).not.toHaveBeenCalled();
      expect(conceptMapService.updateConceptMap).not.toHaveBeenCalled();
      expect(mockSetLoading).not.toHaveBeenCalledWith(true); // Should not even start loading for save
    });

    it('should save for authenticated user if not in view-only mode', async () => {
      // Arrange: Authenticated user, not view-only
      (useAuth as vi.Mock).mockReturnValue({
        user: { id: 'auth-user-123' },
        profile: { role: 'student' },
        isGuestSession: false,
      });
      const mapToSave = { title: 'My Map', nodes: [{id:'n1', data:{label:'N1'}, position:{x:0,y:0}}], edges: [] };
      (useConceptMapStore as vi.Mock).mockImplementation(() => ({
        ...mockStore,
        isViewOnlyMode: false,
        currentMapId: null, // New map
        mapData: mapToSave,
        isDirty: true,
      }));
      (conceptMapService.createConceptMap as vi.Mock).mockResolvedValueOnce({ id: 'new-map-id', ...mapToSave, owner_id: 'auth-user-123' });

      const { result } = renderHook(() => useConceptMapDataManager());

      // Act
      await act(async () => {
        await result.current.saveMap();
      });

      // Assert
      expect(conceptMapService.createConceptMap).toHaveBeenCalled();
      expect(mockSetLoading).toHaveBeenCalledWith(true);
      expect(mockSetCurrentMapId).toHaveBeenCalledWith('new-map-id');
      expect(mockSetIsDirty).toHaveBeenCalledWith(false);
      expect(mockSetLoading).toHaveBeenCalledWith(false);
    });
  });
});
