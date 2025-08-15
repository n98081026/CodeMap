import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConceptMapById } from '../conceptMapService';
import { supabase } from '@/lib/supabaseClient';

// Mock the entire supabaseClient module to isolate the service from the database
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

describe('ConceptMap Service (Unit Tests)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConceptMapById', () => {
    it('should return a transformed concept map when found', async () => {
      const mockDbMap = {
        id: 'map-123',
        name: 'Test Map',
        owner_id: 'user-abc',
        map_data: { nodes: [], edges: [] },
        is_public: true,
        shared_with_classroom_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      vi.mocked(supabase.from('concept_maps').select().eq).mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: mockDbMap, error: null }),
      } as any);

      const map = await getConceptMapById('map-123');

      expect(supabase.from).toHaveBeenCalledWith('concept_maps');
      expect(supabase.select).toHaveBeenCalledWith('*');
      expect(supabase.eq).toHaveBeenCalledWith('id', 'map-123');

      expect(map).not.toBeNull();
      expect(map?.id).toBe(mockDbMap.id);
      expect(map?.name).toBe(mockDbMap.name);
      expect(map?.ownerId).toBe(mockDbMap.owner_id);
      expect(map?.isPublic).toBe(mockDbMap.is_public);
    });

    it('should return null when no map is found', async () => {
        vi.mocked(supabase.from('concept_maps').select().eq).mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116' } }), // PGRST116 is "Not Found"
        } as any);

        const map = await getConceptMapById('map-not-found');
        expect(map).toBeNull();
    });

    it('should throw an error if Supabase returns a non-"Not Found" error', async () => {
        const dbError = { message: 'Connection refused', code: '500' };
        vi.mocked(supabase.from('concept_maps').select().eq).mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        } as any);

        await expect(getConceptMapById('map-error')).rejects.toThrow(
            `Error fetching concept map: ${dbError.message}`
        );
    });
  });
});
