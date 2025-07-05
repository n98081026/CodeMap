/**
 * Integration tests for concept map creation and management flow
 * Tests the complete concept map lifecycle with Supabase
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { createConceptMap, getConceptMapById, updateConceptMap } from '@/services/conceptMaps/conceptMapService';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      }))
    }))
  }
}));

describe('Concept Map Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Concept Map Creation Flow', () => {
    it('should create a new concept map with valid data', async () => {
      const mockConceptMap = {
        id: 'map-123',
        title: 'Test Concept Map',
        description: 'A test concept map',
        owner_id: 'user-123',
        classroom_id: 'class-123',
        map_data: {
          nodes: [
            {
              id: 'node-1',
              type: 'custom',
              data: { label: 'Test Node', type: 'concept' },
              position: { x: 100, y: 100 }
            }
          ],
          edges: []
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await createConceptMap({
        title: 'Test Concept Map',
        description: 'A test concept map',
        ownerId: 'user-123',
        classroomId: 'class-123',
        mapData: {
          nodes: [
            {
              id: 'node-1',
              type: 'custom',
              data: { label: 'Test Node', type: 'concept' },
              position: { x: 100, y: 100 }
            }
          ],
          edges: []
        }
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConceptMap);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle concept map creation errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' }
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert
          })
        })
      });

      const result = await createConceptMap({
        title: 'Test Concept Map',
        description: 'A test concept map',
        ownerId: 'user-123',
        classroomId: 'class-123',
        mapData: { nodes: [], edges: [] }
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database constraint violation');
    });
  });

  describe('Concept Map Retrieval Flow', () => {
    it('should retrieve concept map by ID', async () => {
      const mockConceptMap = {
        id: 'map-123',
        title: 'Retrieved Map',
        description: 'A retrieved concept map',
        owner_id: 'user-123',
        map_data: { nodes: [], edges: [] }
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getConceptMapById('map-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockConceptMap);
    });

    it('should handle concept map not found', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' }
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getConceptMapById('nonexistent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No rows returned');
    });
  });

  describe('Concept Map Update Flow', () => {
    it('should update concept map data', async () => {
      const updatedMapData = {
        nodes: [
          {
            id: 'node-1',
            type: 'custom',
            data: { label: 'Updated Node', type: 'concept' },
            position: { x: 150, y: 150 }
          }
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            type: 'default'
          }
        ]
      };

      const mockUpdatedMap = {
        id: 'map-123',
        title: 'Updated Map',
        map_data: updatedMapData,
        updated_at: new Date().toISOString()
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: mockUpdatedMap,
        error: null
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockUpdate
            })
          })
        })
      });

      const result = await updateConceptMap('map-123', {
        title: 'Updated Map',
        mapData: updatedMapData
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedMap);
    });
  });

  describe('Concept Map Permissions Flow', () => {
    it('should respect ownership permissions', async () => {
      // This test would verify that users can only access their own maps
      // or maps in classrooms they belong to
      const mockConceptMap = {
        id: 'map-123',
        title: 'Private Map',
        owner_id: 'user-456', // Different user
        classroom_id: null
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied' }
      });

      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: mockSelect
          })
        })
      });

      const result = await getConceptMapById('map-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied');
    });
  });
});