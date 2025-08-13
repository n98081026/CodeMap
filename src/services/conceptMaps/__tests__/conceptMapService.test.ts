import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createConceptMap,
  getConceptMapById,
} from '@/services/conceptMaps/conceptMapService';
import { supabase } from '@/lib/supabaseClient';
import * as userService from '@/services/users/userService';
import { ConceptMap } from '@/types';

// Mock the entire userService module
vi.mock('@/services/users/userService');

// Mock the supabase client dependency
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('conceptMapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConceptMap', () => {
    it('should create a new concept map successfully', async () => {
      // Arrange
      const mockUser = { id: 'user-123', name: 'Test User', email: 'test@test.com', role: 'student' };
      const mockMapData = { nodes: [], edges: [] };
      const newMapId = `map-${Date.now()}`;
      const mockDbConceptMap = {
        id: newMapId,
        name: 'Test Map',
        owner_id: 'user-123',
        map_data: mockMapData,
        is_public: false,
        shared_with_classroom_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(userService.getUserById).mockResolvedValue(mockUser);

      const fromMock = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDbConceptMap, error: null }),
          }),
        }),
      });
      (supabase.from as vi.Mock).mockImplementation(fromMock);

      // Act
      const result = await createConceptMap('Test Map', 'user-123', mockMapData, false);

      // Assert
      expect(userService.getUserById).toHaveBeenCalledWith('user-123');
      expect(fromMock).toHaveBeenCalledWith('concept_maps');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Test Map');
      expect(result?.ownerId).toBe('user-123');
    });

    it('should throw an error if the owner does not exist', async () => {
      // Arrange
      vi.mocked(userService.getUserById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        createConceptMap('Test Map', 'non-existent-user', { nodes: [], edges: [] }, false)
      ).rejects.toThrow('Invalid owner ID. User does not exist.');
    });

    it('should throw an error if the database insert fails', async () => {
      // Arrange
      const mockUser = { id: 'user-123', name: 'Test User', email: 'test@test.com', role: 'student' };
      vi.mocked(userService.getUserById).mockResolvedValue(mockUser);

      const fromMock = vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('DB insert failed') }),
          }),
        }),
      });
      (supabase.from as vi.Mock).mockImplementation(fromMock);

      // Act & Assert
      await expect(
        createConceptMap('Test Map', 'user-123', { nodes: [], edges: [] }, false)
      ).rejects.toThrow('Failed to create concept map: DB insert failed');
    });
  });

  describe('getConceptMapById', () => {
    it('should retrieve a concept map by ID successfully', async () => {
      // Arrange
      const mapId = 'map-123';
      const mockDbConceptMap = {
        id: mapId,
        name: 'Test Map',
        owner_id: 'user-123',
        map_data: { nodes: [], edges: [] },
        is_public: false,
        shared_with_classroom_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockDbConceptMap, error: null }),
          }),
        }),
      });
      (supabase.from as vi.Mock).mockImplementation(fromMock);

      // Act
      const result = await getConceptMapById(mapId);

      // Assert
      expect(fromMock).toHaveBeenCalledWith('concept_maps');
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mapId);
      expect(result?.name).toBe('Test Map');
    });

    it('should return null if the map is not found', async () => {
      // Arrange
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // Not found error
          }),
        }),
      });
      (supabase.from as vi.Mock).mockImplementation(fromMock);

      // Act
      const result = await getConceptMapById('non-existent-map');

      // Assert
      expect(result).toBeNull();
    });

    it('should throw an error for other database errors', async () => {
      // Arrange
      const fromMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: new Error('Some other DB error') }),
          }),
        }),
      });
      (supabase.from as vi.Mock).mockImplementation(fromMock);

      // Act & Assert
      await expect(getConceptMapById('map-123')).rejects.toThrow('Error fetching concept map: Some other DB error');
    });
  });
});
