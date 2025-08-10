import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  createConceptMap,
  getConceptMapById,
  updateConceptMap,
  deleteConceptMap,
} from '../../conceptMaps/conceptMapService';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
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
  },
}));

describe('conceptMapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConceptMap', () => {
    it('should create a new concept map successfully', async () => {
      const mockConceptMap = {
        id: 'map-123',
        title: 'Test Map',
        description: 'Test Description',
        owner_id: 'user-123',
        classroom_id: 'class-123',
        map_data: { nodes: [], edges: [] },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      const result = await createConceptMap(
        'Test Map',
        'user-123',
        { nodes: [], edges: [] },
        false,
        'class-123'
      );

      expect(result).toEqual(mockConceptMap);
    });

    it('should handle creation errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      await expect(
        createConceptMap(
          'Test Map',
          'user-123',
          { nodes: [], edges: [] },
          false,
          'class-123'
        )
      ).rejects.toThrow('Database error');
    });
  });

  describe('getConceptMapById', () => {
    it('should retrieve a concept map by ID', async () => {
      const mockConceptMap = {
        id: 'map-123',
        title: 'Test Map',
        description: 'Test Description',
        owner_id: 'user-123',
        map_data: { nodes: [], edges: [] },
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect,
          }),
        }),
      });

      const result = await getConceptMapById('map-123');

      expect(result).toEqual(mockConceptMap);
    });

    it('should handle not found errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect,
          }),
        }),
      });

      const result = await getConceptMapById('nonexistent-id');

      expect(result).toBeNull();
    });
  });
});
