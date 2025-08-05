import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { AuthProvider } from '@/contexts/auth-context';
import { UserRole } from '@/types';

import { AuthProvider as ActualAuthProvider } from '@/contexts/auth-context';

vi.mock('@/contexts/auth-context', () => ({
  // We still need the actual AuthProvider for rendering, but we mock the hook.
  AuthProvider: ActualAuthProvider,
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
}));

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
