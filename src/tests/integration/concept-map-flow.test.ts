/**
 * Integration tests for concept map creation and management flow
 * Tests the complete concept map lifecycle with Supabase
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createConceptMap,
  getConceptMapById,
  updateConceptMap,
} from '@/services/conceptMaps/conceptMapService';

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
    })),
  },
}));

describe.skip('Concept Map Integration Tests', () => {
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
              position: { x: 100, y: 100 },
            },
          ],
          edges: [],
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = jest.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      const result = await createConceptMap(
        'Test Concept Map',
        'user-123',
        {
          nodes: [
            {
              id: 'node-1',
              type: 'custom',
              data: { label: 'Test Node', type: 'concept' },
              position: { x: 100, y: 100 },
            },
          ],
          edges: [],
        },
        true,
        'class-123'
      );

      expect(result).toEqual(mockConceptMap);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle concept map creation errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database constraint violation' },
      });

      (supabase.from as any).mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      await expect(
        createConceptMap(
          'Test Concept Map',
          'user-123',
          { nodes: [], edges: [] },
          true,
          'class-123'
        )
      ).rejects.toThrow('Database constraint violation');
    });
  });

  describe('Concept Map Retrieval Flow', () => {
    it('should retrieve concept map by ID', async () => {
      const mockConceptMap = {
        id: 'map-123',
        title: 'Retrieved Map',
        description: 'A retrieved concept map',
        owner_id: 'user-123',
        map_data: { nodes: [], edges: [] },
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = jest.fn().mockResolvedValue({
        data: mockConceptMap,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSelect,
          }),
        }),
      });

      const result = await getConceptMapById('map-123');

      expect(result).toEqual(mockConceptMap);
    });

    it('should handle concept map not found', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'No rows returned' },
      });

      (supabase.from as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSelect,
          }),
        }),
      });

      const result = await getConceptMapById('nonexistent-id');

      expect(result).toBeNull();
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
            position: { x: 150, y: 150 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            type: 'default',
          },
        ],
      };

      const mockUpdatedMap = {
        id: 'map-123',
        title: 'Updated Map',
        map_data: updatedMapData,
        updated_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpdate = jest.fn().mockResolvedValue({
        data: mockUpdatedMap,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const result = await updateConceptMap('map-123', {
        name: 'Updated Map',
        mapData: updatedMapData,
        ownerId: 'user-123',
      });

      expect(result).toEqual(mockUpdatedMap);
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
        classroom_id: null,
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Access denied' },
      });

      (supabase.from as any).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSelect,
          }),
        }),
      });

      const result = await getConceptMapById('map-123');

      expect(result).toBeNull();
    });
  });
});
