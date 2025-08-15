import { describe, it, expect } from 'vitest';

// This is our new baseline test.
// It does nothing but import a simple utility function from the codebase.
// If this test hangs, we know the problem is with the test runner's ability
// to resolve local, aliased module paths (`@/`).
import { cn } from '@/lib/utils';

describe('Simple Import Test', () => {
  it('should correctly merge class names using the imported cn function', () => {
    const result = cn('bg-red-500', 'text-white', 'bg-blue-500');
    // The exact result of twMerge can be complex, but we expect it to contain
    // the non-conflicting class and the last conflicting class.
    expect(result).toContain('text-white');
    expect(result).toContain('bg-blue-500');
    expect(result).not.toContain('bg-red-500');
  });
});
