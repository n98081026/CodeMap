import { vi } from 'vitest';

// This is a manual mock for the concept-map-store.
// It replaces the actual store with a simplified version for testing.
// This prevents issues with complex middleware like 'zundo' from affecting tests.

// Create mock functions for all the actions that are used in the hooks.
const setStagedMapData = vi.fn();
const addDebugLog = vi.fn();
const updateNode = vi.fn();
const addNode = vi.fn();
const addEdge = vi.fn();

// Create a mock state
const mockState = {
  mapData: {
    nodes: [
      { id: 'node-1', text: 'Test Node', details: 'Some details.', type: 'default', x: 0, y: 0 }
    ],
    edges: [],
  },
  setStagedMapData,
  addDebugLog,
  updateNode,
  addNode,
  addEdge,
};

// Export the mocked hook
export const useConceptMapStore = vi.fn((selector) => {
  if (typeof selector === 'function') {
    return selector(mockState);
  }
  return mockState;
});
