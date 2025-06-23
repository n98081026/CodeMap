// src/tests/setup.ts
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);

// You can add other global test setup here if needed, e.g.,
// - Mocking global objects (fetch, localStorage, etc.)
// - Cleaning up after tests (though Vitest does this by default for mocks)

// Example:
// import { server } from './mocks/server'; // if using MSW
// beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
// afterAll(() => server.close())
// afterEach(() => server.resetHandlers())
