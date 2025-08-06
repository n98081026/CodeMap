import { render } from '@testing-library/react';
import React from 'react';
import { describe, it, expect } from 'vitest';

import { AuthProvider } from '@/contexts/auth-context';
import { UserRole } from '@/types';

// vi.mock is hoisted, so we use an async factory to import the actual module
// and then provide our mock implementation.
vi.mock('@/contexts/auth-context', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    // Spread the actual exports to keep AuthProvider and other exports working
    ...(actual as any),
    // Override the useAuth hook with our mock version
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
