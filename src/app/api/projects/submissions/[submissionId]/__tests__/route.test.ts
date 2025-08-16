import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
import { MOCK_STUDENT_USER, MOCK_TEACHER_USER } from '@/lib/config';
import * as projectSubmissionService from '@/services/projectSubmissions/projectSubmissionService';
import * as classroomService from '@/services/classrooms/classroomService';

// Mock services
vi.mock('@/services/projectSubmissions/projectSubmissionService');
vi.mock('@/services/classrooms/classroomService');

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// Mock Next.js request object
function createMockRequest(headers = {}, body = {}) {
  return {
    headers: new Headers(headers),
    json: async () => body,
  } as unknown as Request;
}

describe('API Route: /api/projects/submissions/[submissionId]', () => {
  const submissionId = 'sub-123';
  const mockSubmission = {
    id: submissionId,
    studentId: MOCK_STUDENT_USER.id,
    classroomId: 'class-456',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.SERVICE_ROLE_KEY = 'test-secret-key';
  });

  // --- PUT Handler Tests ---
  describe('PUT', () => {
    const validPutBody = { status: 'COMPLETED' };

    it('should return 401 Unauthorized if service role key is missing', async () => {
      const request = createMockRequest(
        {}, // No auth header
        validPutBody
      );
      const context = { params: { submissionId } };
      const response = await PUT(request, context);
      expect(response.status).toBe(401);
    });

    it('should return 401 Unauthorized if service role key is incorrect', async () => {
      const request = createMockRequest(
        { Authorization: 'Bearer wrong-key' },
        validPutBody
      );
      const context = { params: { submissionId } };
      const response = await PUT(request, context);
      expect(response.status).toBe(401);
    });

    it('should return 200 OK and update submission if service role key is correct', async () => {
      vi.mocked(projectSubmissionService.updateSubmissionStatus).mockResolvedValue(
        mockSubmission as any
      );
      const request = createMockRequest(
        { Authorization: 'Bearer test-secret-key' },
        validPutBody
      );
      const context = { params: { submissionId } };
      const response = await PUT(request, context);
      expect(response.status).toBe(200);
      expect(
        projectSubmissionService.updateSubmissionStatus
      ).toHaveBeenCalledWith(
        submissionId,
        validPutBody.status,
        undefined,
        undefined
      );
      const responseBody = await response.json();
      expect(responseBody).toEqual(mockSubmission);
    });
  });

  // --- GET Handler Tests ---
  describe('GET', () => {
    const mockClassroom = { id: 'class-456', teacherId: MOCK_TEACHER_USER.id };

    it('should return 403 Forbidden if user is not owner or teacher', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'random-user-id' } } });
      vi.mocked(projectSubmissionService.getSubmissionById).mockResolvedValue(
        mockSubmission as any
      );
      vi.mocked(classroomService.getClassroomById).mockResolvedValue(
        mockClassroom as any
      );

      const request = createMockRequest();
      const context = { params: { submissionId } };
      const response = await GET(request, context);
      expect(response.status).toBe(403);
    });

    it('should return 200 OK if user is the submission owner', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: MOCK_STUDENT_USER.id } },
      });
      vi.mocked(projectSubmissionService.getSubmissionById).mockResolvedValue(
        mockSubmission as any
      );

      const request = createMockRequest();
      const context = { params: { submissionId } };
      const response = await GET(request, context);
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(mockSubmission);
    });

    it('should return 200 OK if user is the classroom teacher', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: MOCK_TEACHER_USER.id } },
      });
      vi.mocked(projectSubmissionService.getSubmissionById).mockResolvedValue(
        mockSubmission as any
      );
      vi.mocked(classroomService.getClassroomById).mockResolvedValue(
        mockClassroom as any
      );

      const request = createMockRequest();
      const context = { params: { submissionId } };
      const response = await GET(request, context);
      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual(mockSubmission);
    });

    it('should return 401 Unauthorized if no user is logged in', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
      const request = createMockRequest();
      const context = { params: { submissionId } };
      const response = await GET(request, context);
      expect(response.status).toBe(401);
    });
  });
});
