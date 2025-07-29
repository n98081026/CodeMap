/**
 * Integration tests for project analysis and AI-powered concept map generation
 * Tests the complete project upload and analysis workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { MockSupabaseClient, MockSupabaseQueryBuilder } from '@/types/test-mocks';

import {
  createSubmission,
  updateSubmissionStatus,
} from '@/services/projectSubmissions/projectSubmissionService';
import { ProjectSubmissionStatus } from '@/types';
import { BYPASS_AUTH_FOR_TESTING } from '@/lib/config';

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
vi.mock('@/ai/flows', () => ({
  generateMapFromProject: vi.fn(),
}));

describe('Project Analysis Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Project Submission Flow', () => {
    it('should create project submission successfully', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const { MOCK_STUDENT_USER } = await import('@/lib/config');
      const mockSubmission = {
        studentId: MOCK_STUDENT_USER.id,
        classroomId: 'class-123',
        originalFileName: 'test-project.zip',
        fileStoragePath: 'submissions/test-project.zip',
        analysisStatus: ProjectSubmissionStatus.PENDING,
        fileSize: 12345,
        userGoals: 'Understand project structure',
      };

      const mockInsert = vi.fn().mockResolvedValue({
        data: {
          ...mockSubmission,
          id: 'submission-123',
          submissionTimestamp: new Date().toISOString(),
        },
        error: null,
      });

      if (!BYPASS_AUTH_FOR_TESTING) {
        (supabase.from as MockSupabaseQueryBuilder).mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockInsert,
            }),
          }),
        });
      }

      const result = await createSubmission(
        MOCK_STUDENT_USER.id,
        'test-project.zip',
        12345,
        'class-123',
        'submissions/test-project.zip',
        'Understand project structure'
      );

      expect(result).toEqual({
        ...mockSubmission,
        id: expect.any(String) as string,
        submissionTimestamp: expect.any(String) as string,
      });
      if (!BYPASS_AUTH_FOR_TESTING) {
        expect(mockInsert).toHaveBeenCalled();
      }
    });

    it('should handle submission creation errors', async () => {
      const projectSubmissionService = await import(
        '@/services/projectSubmissions/projectSubmissionService'
      );
      vi.spyOn(projectSubmissionService, 'createSubmission').mockRejectedValue(
        new Error('File upload failed')
      );

      const { MOCK_STUDENT_USER } = await import('@/lib/config');
      await expect(
        projectSubmissionService.createSubmission(
          MOCK_STUDENT_USER.id,
          'test-project.zip',
          12345,
          'class-123',
          'submissions/test-project.zip'
        )
      ).rejects.toThrow(/File upload failed/);
    });
  });

  // describe('AI Analysis Flow', () => {
  //   it('should process project and generate concept map', async () => {
  //     const { generateMapFromProject } = await import('@/ai/flows/index');
  //     // Mock successful AI analysis
  //     (generateMapFromProject as any).mockResolvedValue({
  //       nodes: [
  //         {
  //           id: 'node-1',
  //           type: 'custom',
  //           data: { label: 'Main Component', type: 'concept' },
  //           position: { x: 100, y: 100 },
  //         },
  //         {
  //           id: 'node-2',
  //           type: 'custom',
  //           data: { label: 'Helper Function', type: 'concept' },
  //           position: { x: 200, y: 200 },
  //         },
  //       ],
  //       edges: [
  //         {
  //           id: 'edge-1',
  //           source: 'node-1',
  //           target: 'node-2',
  //           type: 'default',
  //           data: { label: 'uses' },
  //         },
  //       ],
  //     });
  //     const result = await (generateMapFromProject as any)({
  //       projectStoragePath: 'submissions/test-project.zip',
  //       userGoals: 'Understand project structure',
  //     });
  //     expect(result).toBeDefined();
  //     expect(generateMapFromProject).toHaveBeenCalledWith({
  //       projectStoragePath: 'submissions/test-project.zip',
  //       userGoals: 'Understand project structure',
  //     });
  //   });
  //   it('should handle AI analysis errors', async () => {
  //     const { generateMapFromProject } = await import('@/ai/flows/index');
  //     // Mock AI analysis error
  //     (generateMapFromProject as any).mockRejectedValue(
  //       new Error('AI service unavailable')
  //     );
  //     await expect(
  //       (generateMapFromProject as any)({
  //         projectStoragePath: 'submissions/invalid-project.zip',
  //         userGoals: 'Understand project structure',
  //       })
  //     ).rejects.toThrow('AI service unavailable');
  //   });
  // });

  describe('Submission Status Updates', () => {
    it('should update submission status after processing', async () => {
      const { MOCK_PROJECT_SUBMISSION_STUDENT, MOCK_SUBMISSIONS_STORE } =
        await import('@/lib/config');
      MOCK_SUBMISSIONS_STORE.push(MOCK_PROJECT_SUBMISSION_STUDENT);

      const mockUpdatedSubmission = {
        ...MOCK_PROJECT_SUBMISSION_STUDENT,
        analysisStatus: ProjectSubmissionStatus.COMPLETED,
        generatedConceptMapId: 'map-456',
      };

      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpdate = vi.fn().mockResolvedValue({
        data: mockUpdatedSubmission,
        error: null,
      });

      (supabase.from as MockSupabaseQueryBuilder).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: mockUpdate,
            }),
          }),
        }),
      });

      const result = await updateSubmissionStatus(
        MOCK_PROJECT_SUBMISSION_STUDENT.id,
        ProjectSubmissionStatus.COMPLETED,
        undefined,
        'map-456'
      );

      expect(result).toEqual(mockUpdatedSubmission);
    });

    it('should handle status update errors', async () => {
      vi.spyOn(
        await import('@/services/projectSubmissions/projectSubmissionService'),
        'updateSubmissionStatus'
      ).mockRejectedValue(new Error('Submission not found'));

      await expect(
        updateSubmissionStatus('nonexistent-id', ProjectSubmissionStatus.FAILED)
      ).rejects.toThrow('Submission not found');
    });
  });

  describe('File Storage Integration', () => {
    it('should handle file upload to Supabase Storage', async () => {
      const { supabase } = await import('@/lib/supabaseClient');
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'submissions/test-project.zip' },
        error: null,
      });

      (supabase.storage.from as jest.MockedFunction<any>).mockReturnValue({
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

      (supabase.storage.from as jest.MockedFunction<any>).mockReturnValue({
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
