/**
 * Integration tests for project analysis and AI-powered concept map generation
 * Tests the complete project upload and analysis workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  createSubmission,
  updateSubmissionStatus,
} from '@/services/projectSubmissions/projectSubmissionService';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
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
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/file.zip' },
        })),
      })),
    },
  },
}));

// Mock AI flows
vi.mock('@/ai/flows/generate-map-from-project', () => ({
  generateMapFromProject: vi.fn(),
}));

describe('Project Analysis Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Submission Flow', () => {
    it('should create project submission successfully', async () => {
      const mockSubmission = {
        id: 'submission-123',
        student_id: 'user-123',
        classroom_id: 'class-123',
        file_name: 'test-project.zip',
        file_storage_path: 'submissions/test-project.zip',
        status: 'uploaded',
        user_goals: 'Understand project structure',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: mockSubmission,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      const result = await createSubmission({
        studentId: 'user-123',
        classroomId: 'class-123',
        fileName: 'test-project.zip',
        fileStoragePath: 'submissions/test-project.zip',
        userGoals: 'Understand project structure',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSubmission);
      expect(mockInsert).toHaveBeenCalled();
    });

    it('should handle submission creation errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'File upload failed' },
      });

      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: mockInsert,
          }),
        }),
      });

      const result = await createSubmission({
        studentId: 'user-123',
        classroomId: 'class-123',
        fileName: 'test-project.zip',
        fileStoragePath: 'submissions/test-project.zip',
        userGoals: 'Understand project structure',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('File upload failed');
    });
  });

  describe('AI Analysis Flow', () => {
    it('should process project and generate concept map', async () => {
      const { generateMapFromProject } = await import(
        '@/ai/flows/generate-map-from-project'
      );

      // Mock successful AI analysis
      (generateMapFromProject as any).mockResolvedValue({
        nodes: [
          {
            id: 'node-1',
            type: 'custom',
            data: { label: 'Main Component', type: 'concept' },
            position: { x: 100, y: 100 },
          },
          {
            id: 'node-2',
            type: 'custom',
            data: { label: 'Helper Function', type: 'concept' },
            position: { x: 200, y: 200 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            type: 'default',
            data: { label: 'uses' },
          },
        ],
      });

      const result = await generateMapFromProject({
        projectStoragePath: 'submissions/test-project.zip',
        userGoals: 'Understand project structure',
      });

      expect(result).toBeDefined();
      expect(result.nodes).toHaveLength(2);
      expect(result.edges).toHaveLength(1);
      expect(generateMapFromProject).toHaveBeenCalledWith({
        projectStoragePath: 'submissions/test-project.zip',
        userGoals: 'Understand project structure',
      });
    });

    it('should handle AI analysis errors', async () => {
      const { generateMapFromProject } = await import(
        '@/ai/flows/generate-map-from-project'
      );

      // Mock AI analysis error
      (generateMapFromProject as any).mockRejectedValue(
        new Error('AI service unavailable')
      );

      await expect(
        generateMapFromProject({
          projectStoragePath: 'submissions/invalid-project.zip',
          userGoals: 'Understand project structure',
        })
      ).rejects.toThrow('AI service unavailable');
    });
  });

  describe('Submission Status Updates', () => {
    it('should update submission status after processing', async () => {
      const mockUpdatedSubmission = {
        id: 'submission-123',
        status: 'completed',
        concept_map_id: 'map-456',
        updated_at: new Date().toISOString(),
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: mockUpdatedSubmission,
        error: null,
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const result = await updateSubmissionStatus(
        'submission-123',
        'completed',
        'map-456'
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockUpdatedSubmission);
    });

    it('should handle status update errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Submission not found' },
      });

      (supabase.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const result = await updateSubmissionStatus('nonexistent-id', 'failed');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Submission not found');
    });
  });

  describe('File Storage Integration', () => {
    it('should handle file upload to Supabase Storage', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'submissions/test-project.zip' },
        error: null,
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
        getPublicUrl: vi.fn(() => ({
          data: { publicUrl: 'https://example.com/test-project.zip' },
        })),
      });

      // Simulate file upload
      const mockFile = new File(['test content'], 'test-project.zip', {
        type: 'application/zip',
      });

      const uploadResult = await supabase.storage
        .from('project_archives')
        .upload('submissions/test-project.zip', mockFile);

      expect(uploadResult.error).toBeNull();
      expect(uploadResult.data?.path).toBe('submissions/test-project.zip');
      expect(mockUpload).toHaveBeenCalledWith(
        'submissions/test-project.zip',
        mockFile
      );
    });

    it('should handle file upload errors', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      (supabase.storage.from as any).mockReturnValue({
        upload: mockUpload,
      });

      const mockFile = new File(['test content'], 'large-project.zip', {
        type: 'application/zip',
      });

      const uploadResult = await supabase.storage
        .from('project_archives')
        .upload('submissions/large-project.zip', mockFile);

      expect(uploadResult.error?.message).toBe('Storage quota exceeded');
      expect(uploadResult.data).toBeNull();
    });
  });
});
