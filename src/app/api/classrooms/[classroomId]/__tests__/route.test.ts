import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../route';
import { MOCK_TEACHER_USER } from '@/lib/config';
import * as classroomService from '@/services/classrooms/classroomService';
import { UserRole } from '@/types';

// Mock services
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

const MOCK_ADMIN_USER = {
  id: 'admin-user-id',
  user_metadata: { role: UserRole.ADMIN },
};

const MOCK_NON_TEACHER_USER = {
  id: 'other-user-id',
  user_metadata: { role: UserRole.STUDENT },
};

describe('API Route: /api/classrooms/[classroomId]', () => {
  const classroomId = 'class-123';
  const mockClassroom = {
    id: classroomId,
    teacherId: MOCK_TEACHER_USER.id,
    name: 'Test Classroom',
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup default mock implementations
    vi.mocked(classroomService.getClassroomById).mockResolvedValue(
      mockClassroom as any
    );
    vi.mocked(classroomService.updateClassroom).mockResolvedValue({
      ...mockClassroom,
      name: 'Updated Classroom',
    } as any);
    vi.mocked(classroomService.deleteClassroom).mockResolvedValue(true);
  });

  const testCases = [
    { method: 'GET', handler: GET },
    { method: 'PUT', handler: PUT, body: { name: 'Updated Classroom' } },
    { method: 'DELETE', handler: DELETE },
  ];

  for (const { method, handler, body } of testCases) {
    describe(`${method} handler`, () => {
      it('should return 401 Unauthorized if user is not authenticated', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null }, error: new Error('Unauthorized') });
        const request = createMockRequest({}, body);
        const context = { params: { classroomId } };
        const response = await handler(request, context);
        expect(response.status).toBe(401);
      });

      it('should return 403 Forbidden if user is not the teacher or an admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: MOCK_NON_TEACHER_USER } });
        const request = createMockRequest({}, body);
        const context = { params: { classroomId } };
        const response = await handler(request, context);
        expect(response.status).toBe(403);
      });

      it('should return 200 OK if user is the classroom teacher', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { ...MOCK_TEACHER_USER, user_metadata: { role: 'TEACHER' }} } });
        const request = createMockRequest({}, body);
        const context = { params: { classroomId } };
        const response = await handler(request, context);
        expect(response.status).toBe(200);
      });

      it('should return 200 OK if user is an admin', async () => {
        mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } });
        const request = createMockRequest({}, body);
        const context = { params: { classroomId } };
        const response = await handler(request, context);
        expect(response.status).toBe(200);
      });

      it('should return 404 Not Found if classroom does not exist', async () => {
        vi.mocked(classroomService.getClassroomById).mockResolvedValue(null);
        mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } }); // Authorized user
        const request = createMockRequest({}, body);
        const context = { params: { classroomId } };
        const response = await handler(request, context);
        expect(response.status).toBe(404);
      });
    });
  }
});
