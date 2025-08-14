import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import * as conceptMapService from '../conceptMapService';
import type { ConceptMap, ConceptMapData } from '@/types';

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          limit: vi.fn(),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  })),
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabaseClient,
}));

describe('conceptMapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConceptMap', () => {
    it('should fetch a concept map by id', async () => {
      const mockMap: ConceptMap = {
        id: 'map-1',
        name: 'Test Map',
        ownerId: 'user-1',
        mapData: { nodes: [], edges: [] },
        isPublic: false,
        sharedWithClassroomId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockChain = {
        single: vi.fn().mockResolvedValue({ data: mockMap, error: null }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockChain),
        }),
      });

      const result = await conceptMapService.getConceptMap('map-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concept_maps');
      expect(result).toEqual(mockMap);
    });

    it('should handle errors when fetching concept map', async () => {
      const mockError = new Error('Database error');
      
      const mockChain = {
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(mockChain),
        }),
      });

      await expect(conceptMapService.getConceptMap('map-1')).rejects.toThrow('Database error');
    });
  });

  describe('createConceptMap', () => {
    it('should create a new concept map', async () => {
      const newMapData: Partial<ConceptMap> = {
        name: 'New Map',
        ownerId: 'user-1',
        mapData: { nodes: [], edges: [] },
        isPublic: false,
      };

      const createdMap: ConceptMap = {
        id: 'new-map-id',
        ...newMapData,
        sharedWithClassroomId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as ConceptMap;

      const mockChain = {
        single: vi.fn().mockResolvedValue({ data: createdMap, error: null }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue(mockChain),
        }),
      });

      const result = await conceptMapService.createConceptMap(newMapData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concept_maps');
      expect(result).toEqual(createdMap);
    });
  });

  describe('updateConceptMap', () => {
    it('should update an existing concept map', async () => {
      const updateData: Partial<ConceptMap> = {
        name: 'Updated Map',
        mapData: { 
          nodes: [{ 
            id: 'node-1', 
            type: 'default', 
            position: { x: 0, y: 0 }, 
            data: { label: 'Test Node', details: '' } 
          }], 
          edges: [] 
        },
      };

      const updatedMap: ConceptMap = {
        id: 'map-1',
        ownerId: 'user-1',
        isPublic: false,
        sharedWithClassroomId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...updateData,
      } as ConceptMap;

      const mockChain = {
        single: vi.fn().mockResolvedValue({ data: updatedMap, error: null }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue(mockChain),
          }),
        }),
      });

      const result = await conceptMapService.updateConceptMap('map-1', updateData);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concept_maps');
      expect(result).toEqual(updatedMap);
    });
  });

  describe('deleteConceptMap', () => {
    it('should delete a concept map', async () => {
      const mockChain = {
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue(mockChain),
      });

      await conceptMapService.deleteConceptMap('map-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concept_maps');
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'map-1');
    });

    it('should handle errors when deleting concept map', async () => {
      const mockError = new Error('Delete failed');
      
      const mockChain = {
        eq: vi.fn().mockResolvedValue({ error: mockError }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        delete: vi.fn().mockReturnValue(mockChain),
      });

      await expect(conceptMapService.deleteConceptMap('map-1')).rejects.toThrow('Delete failed');
    });
  });

  describe('getUserConceptMaps', () => {
    it('should fetch user concept maps', async () => {
      const mockMaps: ConceptMap[] = [
        {
          id: 'map-1',
          name: 'Map 1',
          ownerId: 'user-1',
          mapData: { nodes: [], edges: [] },
          isPublic: false,
          sharedWithClassroomId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'map-2',
          name: 'Map 2',
          ownerId: 'user-1',
          mapData: { nodes: [], edges: [] },
          isPublic: true,
          sharedWithClassroomId: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const mockChain = {
        limit: vi.fn().mockResolvedValue({ data: mockMaps, error: null }),
      };
      
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(mockChain),
          }),
        }),
      });

      const result = await conceptMapService.getUserConceptMaps('user-1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('concept_maps');
      expect(result).toEqual(mockMaps);
    });
  });
});