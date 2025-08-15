import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/lib/supabaseClient';
import * as conceptMapService from '../conceptMapService';
import * as userService from '@/services/users/userService';
import type { ConceptMap, User, UserRole, ConceptMapData } from '@/types';
import { Database } from '@/types/supabase';

type DbConceptMap = Database['public']['Tables']['concept_maps']['Row'];

// Mock dependent modules
vi.mock('@/lib/supabaseClient');
vi.mock('@/services/users/userService');

const mockedSupabase = supabase as unknown as {
  from: vi.Mock<any[], any>;
};
const mockedUserService = userService as {
  getUserById: vi.Mock<[string], Promise<User | null>>;
};

describe('conceptMapService', () => {
  const mockUser: User = { id: 'user-1', name: 'Test User', email: 'test@test.com', role: 'student' as UserRole };
  const mockDbMap: DbConceptMap = {
      id: 'map-1',
      name: 'Test Map',
      owner_id: 'user-1',
      map_data: { nodes: [], edges: [] },
      is_public: false,
      shared_with_classroom_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createConceptMap', () => {
    it('should create a new concept map', async () => {
      // Arrange
      mockedUserService.getUserById.mockResolvedValue(mockUser);
      
      const newMapData = { name: 'New Map', mapData: { nodes: [], edges: [] } as ConceptMapData, isPublic: false };
      const dbResponse = { ...mockDbMap, name: newMapData.name, id: 'new-map-id' };

      const single = vi.fn().mockResolvedValue({ data: dbResponse, error: null });
      const select = vi.fn().mockReturnValue({ single });
      const insert = vi.fn().mockReturnValue({ select });
      mockedSupabase.from.mockReturnValue({ insert });

      // Act
      const result = await conceptMapService.createConceptMap(newMapData.name, mockUser.id, newMapData.mapData, newMapData.isPublic);

      // Assert
      expect(mockedUserService.getUserById).toHaveBeenCalledWith(mockUser.id);
      expect(mockedSupabase.from).toHaveBeenCalledWith('concept_maps');
      expect(insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: mockUser.id, name: newMapData.name }));
      expect(result?.id).toBe('new-map-id');
      expect(result?.ownerId).toBe(mockUser.id);
    });

    it('should throw an error if owner does not exist', async () => {
      mockedUserService.getUserById.mockResolvedValue(null);
      await expect(conceptMapService.createConceptMap('a', 'non-existent-user', {nodes:[], edges:[]}, false)).rejects.toThrow('Invalid owner ID. User does not exist.');
    });
  });

  describe('getConceptMapById', () => {
    it('should fetch a concept map by id', async () => {
      // Arrange
      const single = vi.fn().mockResolvedValue({ data: mockDbMap, error: null });
      const eq = vi.fn().mockReturnValue({ single });
      const select = vi.fn().mockReturnValue({ eq });
      mockedSupabase.from.mockReturnValue({ select });

      // Act
      const result = await conceptMapService.getConceptMapById('map-1');
      
      // Assert
      expect(select).toHaveBeenCalledWith('*');
      expect(eq).toHaveBeenCalledWith('id', 'map-1');
      expect(result?.id).toBe('map-1');
      expect(result?.ownerId).toBe('user-1');
    });
  });

  describe('getConceptMapsByOwnerId', () => {
    it('should fetch user concept maps', async () => {
        // Arrange
        const range = vi.fn().mockResolvedValue({ data: [mockDbMap], error: null });
        const order = vi.fn().mockReturnValue({ range });
        const eq = vi.fn().mockReturnValue({ order });
        const select = vi.fn((_, opts) => {
            if (opts?.count === 'exact') return { eq: vi.fn().mockResolvedValue({ count: 1, error: null }) };
            return { eq };
        });
        mockedSupabase.from.mockReturnValue({ select });

        // Act
        const result = await conceptMapService.getConceptMapsByOwnerId('user-1', 1, 10);

        // Assert
        expect(result.maps[0]?.id).toBe('map-1');
        expect(result.totalCount).toBe(1);
    });
  });

  describe('updateConceptMap', () => {
    it('should update an existing concept map', async () => {
      // Arrange
      const updates = { name: 'New Name', ownerId: mockUser.id };
      const updatedDbMap = { ...mockDbMap, name: 'New Name' };

      // Mock for the internal getConceptMapById call
      const getSingle = vi.fn().mockResolvedValue({ data: mockDbMap, error: null });
      const getEq = vi.fn().mockReturnValue({ single: getSingle });
      const getSelect = vi.fn().mockReturnValue({ eq: getEq });

      // Mock for the update call
      const updateSingle = vi.fn().mockResolvedValue({ data: updatedDbMap, error: null });
      const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
      const updateEq = vi.fn().mockReturnThis(); // for chained .eq calls
      const update = vi.fn().mockReturnValue({ eq: updateEq, select: updateSelect });

      mockedSupabase.from.mockImplementation((tableName: string) => {
          if (getSelect.mock.calls.length === 0) { // First call is the select
              return { select: getSelect };
          }
          return { update }; // Second call is the update
      });

      // Act
      const result = await conceptMapService.updateConceptMap('map-1', updates);

      // Assert
      expect(getSelect).toHaveBeenCalledWith('*');
      expect(getEq).toHaveBeenCalledWith('id', 'map-1');
      expect(update).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name' }));
      expect(result?.name).toBe('New Name');
    });
  });

  describe('deleteConceptMap', () => {
    it('should delete a concept map', async () => {
        // Arrange
        // Mock for the internal getConceptMapById call
        const getSingle = vi.fn().mockResolvedValue({ data: mockDbMap, error: null });
        const getEq = vi.fn().mockReturnValue({ single: getSingle });
        const getSelect = vi.fn().mockReturnValue({ eq: getEq });

        // Mock for the delete call
        const del = vi.fn().mockResolvedValue({ error: null, count: 1 });
        const deleteEq = vi.fn().mockReturnThis();
        const deleteChain = { delete: vi.fn().mockReturnValue({ eq: deleteEq, count: del }) };

        mockedSupabase.from.mockImplementation((tableName: string) => {
          if (getSelect.mock.calls.length === 0) {
              return { select: getSelect };
          }
          return deleteChain;
        });

        // Act
        const result = await conceptMapService.deleteConceptMap('map-1', mockUser.id);

        // Assert
        expect(getSelect).toHaveBeenCalledWith('*');
        expect(result).toBe(true);
    });
  });
});