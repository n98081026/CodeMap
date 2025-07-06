// src/tests/setup.ts
import * as matchers from '@testing-library/jest-dom/matchers';
import { expect } from 'vitest';

expect.extend(matchers);

// You can add other global test setup here if needed, e.g.,
// - Mocking global objects (fetch, localStorage, etc.)
// - Cleaning up after tests (though Vitest does this by default for mocks)

// Example:
// import { server } from './mocks/server'; // if using MSW
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterAll(() => server.close())
// afterEach(() => server.resetHandlers())

// Mock environment variables for Supabase
// Vitest doesn't automatically load .env files in the same way Next.js dev server does.
// For tests that indirectly cause supabaseClient.ts to be imported, these are needed.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
