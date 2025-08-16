import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT, DELETE } from '../route';
import * as userService from '@/services/users/userService';
import { UserRole } from '@/types';

// Mock services
vi.mock('@/services/users/userService');

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
function createMockRequest(body = {}) {
  return {
    json: async () => body,
  } as unknown as Request;
}

const MOCK_SELF_USER = {
  id: 'user-self-id',
  user_metadata: { role: UserRole.STUDENT },
};
const MOCK_OTHER_USER = {
  id: 'user-other-id',
  user_metadata: { role: UserRole.TEACHER },
};
const MOCK_ADMIN_USER = {
  id: 'user-admin-id',
  user_metadata: { role: UserRole.ADMIN },
};

describe('API Route: /api/users/[userId]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(userService.getUserById).mockResolvedValue(MOCK_SELF_USER as any);
    vi.mocked(userService.updateUser).mockResolvedValue({
      ...MOCK_SELF_USER,
      name: 'Updated Name',
    } as any);
    vi.mocked(userService.deleteUser).mockResolvedValue(true);
  });

  // --- GET Requests ---
  describe('GET', () => {
    it('allows a user to get their own profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_SELF_USER.id } };
      const response = await GET(request, context);
      expect(response.status).toBe(200);
    });

    it('prevents a user from getting another user profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await GET(request, context);
      expect(response.status).toBe(403);
    });

    it('allows an admin to get another user profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await GET(request, context);
      expect(response.status).toBe(200);
    });
  });

  // --- PUT Requests ---
  describe('PUT', () => {
    const updatePayload = { name: 'New Name' };

    it('allows a user to update their own profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest(updatePayload);
      const context = { params: { userId: MOCK_SELF_USER.id } };
      const response = await PUT(request, context);
      expect(response.status).toBe(200);
    });

    it('prevents a user from updating another user profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest(updatePayload);
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await PUT(request, context);
      expect(response.status).toBe(403);
    });

    it('allows an admin to update another user profile', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } });
      const request = createMockRequest(updatePayload);
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await PUT(request, context);
      expect(response.status).toBe(200);
    });

    it('prevents a user from changing their own role', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest({ role: UserRole.ADMIN });
      const context = { params: { userId: MOCK_SELF_USER.id } };
      const response = await PUT(request, context);
      expect(response.status).toBe(403);
    });
  });

  // --- DELETE Requests ---
  describe('DELETE', () => {
    it('prevents a non-admin from deleting a user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await DELETE(request, context);
      expect(response.status).toBe(403);
    });

    it('prevents a user from deleting their own account', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_SELF_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_SELF_USER.id } };
      const response = await DELETE(request, context);
      expect(response.status).toBe(403);
    });

    it('allows an admin to delete another user', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_OTHER_USER.id } };
      const response = await DELETE(request, context);
      expect(response.status).toBe(200);
    });

    it('prevents an admin from deleting their own account', async () => {
      mockGetUser.mockResolvedValue({ data: { user: MOCK_ADMIN_USER } });
      const request = createMockRequest();
      const context = { params: { userId: MOCK_ADMIN_USER.id } };
      const response = await DELETE(request, context);
      expect(response.status).toBe(403);
    });
  });

  // --- General Unauthenticated Test ---
  it('returns 401 for any method if user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const context = { params: { userId: 'any-id' } };

    const getResponse = await GET(createMockRequest(), context);
    expect(getResponse.status).toBe(401);

    const putResponse = await PUT(createMockRequest({ name: 'fail' }), context);
    expect(putResponse.status).toBe(401);

    const deleteResponse = await DELETE(createMockRequest(), context);
    expect(deleteResponse.status).toBe(401);
  });
});
