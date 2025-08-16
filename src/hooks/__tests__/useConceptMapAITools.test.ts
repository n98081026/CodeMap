import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

import { useConceptMapAITools } from '../useConceptMapAITools';

// Mock individual stores
const mockMapDataStoreState = {
  mapData: {
    nodes: [
      {
        id: 'node-1',
        text: 'Test Node',
        details: 'Some details.',
        type: 'default',
        x: 0,
        y: 0,
      },
    ],
    edges: [],
  },
};

const mockAISuggestionStoreState = {
  setStagedMapData: vi.fn(),
};

const mockMapMetaStoreState = {
  addDebugLog: vi.fn(),
};

// Mock the stores
vi.mock('@/stores/map-data-store', () => ({
  useMapDataStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockMapDataStoreState);
    }
    return mockMapDataStoreState;
  }),
}));
vi.mock('@/stores/ai-suggestion-store', () => ({
  useAISuggestionStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockAISuggestionStoreState);
    }
    return mockAISuggestionStoreState;
  }),
}));
vi.mock('@/stores/map-meta-store', () => ({
  useMapMetaStore: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockMapMetaStoreState);
    }
    return mockMapMetaStoreState;
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

    expect(mockAISuggestionStoreState.setStagedMapData).toHaveBeenCalled();
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