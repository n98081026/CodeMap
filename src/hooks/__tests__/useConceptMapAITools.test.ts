import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import { useConceptMapAITools } from '../useConceptMapAITools';

// Create a simple mock store
const mockStore = {
  mapData: { 
    nodes: [{ 
      id: 'node-1', 
      data: { label: 'Test Node', details: 'Some details.' },
      type: 'default',
      position: { x: 0, y: 0 }
    }], 
    edges: [] 
  },
  setStagedMapData: vi.fn(),
  addDebugLog: vi.fn(),
  getNode: vi.fn((id: string) => 
    id === 'node-1' ? mockStore.mapData.nodes[0] : undefined
  ),
};

// Mock the store
vi.mock('@/stores/concept-map-store', () => ({
  useConceptMapStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  }),
}));

describe('useConceptMapAITools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize without hanging', () => {
    const { result } = renderHook(() => useConceptMapAITools());
    
    expect(result.current).toBeDefined();
    expect(typeof result.current.handleExtractConcepts).toBe('function');
    expect(typeof result.current.openRewriteNodeContentModal).toBe('function');
  });

  it('should handle extract concepts', async () => {
    const mockExtractedData = {
      concepts: [
        { text: 'concept1', reason: 'reason1' },
        { text: 'concept2', reason: 'reason2' },
      ],
    };

    // Mock the AI flow
    const mockRunFlow = vi.fn().mockResolvedValue(mockExtractedData);
    vi.doMock('@/ai/flows', () => ({
      runFlow: mockRunFlow,
    }));

    const { result } = renderHook(() => useConceptMapAITools());

    await act(async () => {
      await result.current.handleExtractConcepts({
        context: 'some context',
      });
    });

    expect(mockStore.setStagedMapData).toHaveBeenCalled();
  });

  it('should handle rewrite node content modal', () => {
    const { result } = renderHook(() => useConceptMapAITools());

    act(() => {
      result.current.openRewriteNodeContentModal('node-1');
    });

    expect(result.current.rewriteModalState.isOpen).toBe(true);
    expect(result.current.rewriteModalState.nodeId).toBe('node-1');
  });
});