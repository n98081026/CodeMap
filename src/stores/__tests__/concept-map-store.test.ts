import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// --- START: MOCKS ---
// Mocking heavy dependencies to ensure tests are fast, isolated, and don't hang the runner.

vi.mock('@/lib/graphologyAdapter', () => ({
  GraphAdapterUtility: vi.fn(() => ({})),
}));

vi.mock('zundo', () => ({
  temporal: vi.fn(creator => creator),
}));

// A more robust, stateful mock for Zustand that mimics the real API
vi.mock('zustand', () => {
  const allStores = new Map();

  // The create function now returns another function to handle the curried syntax `create<T>()(...)`
  const create = () => (creator) => {
    let state;
    const listeners = new Set();

    const setState = (updater, replace = false) => {
      const oldState = state;
      const partial = typeof updater === 'function' ? updater(oldState) : updater;
      if (Object.is(oldState, partial)) return;
      state = replace ? partial : { ...oldState, ...partial };
      listeners.forEach(listener => listener(state, oldState));
    };

    const getState = () => state;
    const subscribe = (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    const api = { setState, getState, subscribe, destroy: () => listeners.clear() };
    state = creator(setState, getState, api);

    const useStore = (selector) => selector(state);
    Object.assign(useStore, api);

    allStores.set(creator, {
      reset: () => {
        const newState = creator(setState, getState, api);
        Object.assign(state, newState);
      }
    });

    return useStore;
  };

  // Custom global utility to reset all stores between tests
  vi.mocked(global, true).resetAllZustandStores = () => {
     allStores.forEach(store => store.reset());
  };

  return { create };
});

// --- END: MOCKS ---

import { useConceptMapStore } from '../concept-map-store';

describe('useConceptMapStore', () => {
  beforeEach(() => {
    act(() => {
      (global as any).resetAllZustandStores();
    });
  });

  it('should have correct initial state', () => {
    const state = useConceptMapStore.getState();
    expect(state.mapName).toBe('Untitled Concept Map');
    expect(state.mapData.nodes).toEqual([]);
    expect(state.mapData.edges).toEqual([]);
  });

  describe('Node Operations', () => {
    it('should add a new node with default properties', () => {
      const store = useConceptMapStore.getState();
      const newNodeData = {
        text: 'New Node',
        type: 'default' as const,
        position: { x: 200, y: 200 },
      };

      let newNodeId;
      act(() => {
        newNodeId = store.addNode(newNodeData);
      });

      const state = useConceptMapStore.getState();
      const addedNode = state.mapData.nodes[0];

      expect(state.mapData.nodes).toHaveLength(1);
      expect(addedNode.id).toBe(newNodeId);
      expect(addedNode.text).toBe('New Node');
      expect(addedNode).toHaveProperty('width', 150);
      expect(addedNode).toHaveProperty('height', 70);
    });

    it('should update an existing node', () => {
      const store = useConceptMapStore.getState();
      const initialNode = { text: 'Initial', type: 'default' as const, position: { x: 100, y: 100 } };
      
      let nodeId;
      act(() => {
        nodeId = store.addNode(initialNode);
      });

      const updatedData = { text: 'Updated Node', details: 'Updated details' };
      act(() => {
        store.updateNode(nodeId, updatedData);
      });

      const state = useConceptMapStore.getState();
      const updatedNode = state.mapData.nodes.find(n => n.id === nodeId);
      expect(updatedNode.text).toBe(updatedData.text);
      expect(updatedNode.details).toBe(updatedData.details);
    });
  });

  describe('Selection State', () => {
    // This functionality has been moved to editor-ui-store.ts
    // These tests are no longer valid for concept-map-store.
  });
});