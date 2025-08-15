import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findUserByEmail, getUserById } from '../userService';
import { supabase } from '@/lib/supabaseClient';
import { UserRole } from '@/types';

// Mock the entire supabaseClient module
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
  },
}));

describe('User Service (Unit Tests)', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findUserByEmail', () => {
    it('should return a user when found', async () => {
      const mockUser = { id: '1', name: 'Test User', email: 'test@example.com', role: UserRole.STUDENT };
      // Setup the mock for the chained Supabase call
      vi.mocked(supabase.from('profiles').select().eq).mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
      } as any);

      const user = await findUserByEmail('test@example.com');

      expect(supabase.from).toHaveBeenCalledWith('profiles');
      expect(supabase.select).toHaveBeenCalledWith('id, name, email, role');
      expect(supabase.eq).toHaveBeenCalledWith('email', 'test@example.com');
      expect(user).toEqual(mockUser);
    });

    it('should return null when user is not found', async () => {
      vi.mocked(supabase.from('profiles').select().eq).mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const user = await findUserByEmail('notfound@example.com');

      expect(user).toBeNull();
    });

    it('should throw an error if Supabase returns an error', async () => {
        const dbError = { message: 'Database connection failed', code: '500' };
        vi.mocked(supabase.from('profiles').select().eq).mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        } as any);

        await expect(findUserByEmail('error@example.com')).rejects.toThrow(
            `Error fetching user by email: ${dbError.message}`
        );
      });
  });

  describe('getUserById', () => {
    it('should return a user when found by ID', async () => {
        const mockUser = { id: 'user-abc-123', name: 'ID User', email: 'id@example.com', role: UserRole.TEACHER };
        vi.mocked(supabase.from('profiles').select().eq).mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockUser, error: null }),
        } as any);

        const user = await getUserById('user-abc-123');

        expect(supabase.from).toHaveBeenCalledWith('profiles');
        expect(supabase.select).toHaveBeenCalledWith('id, name, email, role');
        expect(supabase.eq).toHaveBeenCalledWith('id', 'user-abc-123');
        expect(user).toEqual(mockUser);
    });
  });
});
