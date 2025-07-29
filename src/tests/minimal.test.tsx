import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { AuthProvider } from '@/contexts/auth-context';
import { UserRole } from '@/types';

vi.mock('@/contexts/auth-context', async () => {
  const actual = await vi.importActual<
    typeof import('@/contexts/auth-context')
  >('@/contexts/auth-context');
  return {
    ...actual,
    useAuth: () => ({
      user: {
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
      },
      isAuthenticated: true,
      isLoading: false,
    }),
  };
});

describe('Minimal Test Case', () => {
  it('should render AuthProvider without errors', () => {
    const { container } = render(
      <AuthProvider>
        <div>Hello</div>
      </AuthProvider>
    );
    expect(container).not.toBeNull();
  });
});
