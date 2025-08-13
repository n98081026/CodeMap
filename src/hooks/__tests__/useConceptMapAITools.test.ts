import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Mock } from 'vitest';

import { useConceptMapAITools } from '../useConceptMapAITools';
import * as aiFlows from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import { useConceptMapStore } from '@/stores/concept-map-store';
import { ConceptMapNode } from '@/types';

// --- Mocks ---
vi.mock('@/ai/flows', () => ({
  runFlow: vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/lib/dagreLayoutUtility', () => ({
  getNodePlacement: vi.fn(() => ({ x: 0, y: 0 })),
}));

vi.mock('@/lib/utils', () => ({
  generateUniqueId: vi.fn(() => 'unique-id'),
}));

vi.mock('@/stores/concept-map-store');

const mockNodeId = 'node-1';
const mockNode: ConceptMapNode = {
  id: mockNodeId,
  data: {
    label: 'Test Node',
    details: 'Some details.',
  },
  type: 'default',
  position: { x: 0, y: 0 },
};

describe('useConceptMapAITools', () => {
  let setStagedMapData: Mock;
  let addDebugLog: Mock;
  let toast: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    setStagedMapData = vi.fn();
    addDebugLog = vi.fn();
    toast = vi.fn().mockReturnValue({ id: 'toast-id' });

    (useConceptMapStore as unknown as Mock).mockImplementation((selector?: (state: any) => any) => {
      const state = {
        setStagedMapData,
        addDebugLog,
        mapData: { nodes: [mockNode], edges: [] },
        getNode: (id: string) => (id === mockNodeId ? mockNode : undefined),
      };

      if (selector) {
        return selector(state);
      }
      return state;
    });

    (useToast as unknown as Mock).mockReturnValue({ toast });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleExtractConcepts', () => {
    it('should call extractConcepts flow and update staged data on success', async () => {
      const mockExtractedData = {
        concepts: [
          { text: 'concept1', reason: 'reason1' },
          { text: 'concept2', reason: 'reason2' },
        ],
      };
      vi.mocked(aiFlows.runFlow).mockResolvedValue(mockExtractedData);

      const { result } = renderHook(() => useConceptMapAITools());

      await act(async () => {
        await result.current.handleExtractConcepts({
          context: 'some context',
        });
      });

      expect(aiFlows.runFlow).toHaveBeenCalledWith('extractConcepts', {
        context: 'some context',
      });
      expect(setStagedMapData).toHaveBeenCalledWith(
        expect.objectContaining({
          nodes: expect.any(Array),
          edges: [],
          actionType: 'extractConcepts',
        })
      );
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Concepts Extracted',
        })
      );
    });

    it('should show an error toast on failure', async () => {
      const error = new Error('AI extraction failed');
      vi.mocked(aiFlows.runFlow).mockRejectedValue(error);
      const { result } = renderHook(() => useConceptMapAITools());

      await act(async () => {
        await result.current.handleExtractConcepts({ context: 'some context' });
      });

      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error Extracting Concepts',
        description: error.message,
        variant: 'destructive',
      }));
    });
  });

  describe('handleRewriteNodeContent', () => {
    it('should open the rewrite modal with correct content', async () => {
      const { result } = renderHook(() => useConceptMapAITools());

      act(() => {
        result.current.openRewriteNodeContentModal(mockNodeId);
      });

      await waitFor(() => {
        expect(result.current.rewriteModalState.isOpen).toBe(true);
        expect(result.current.rewriteModalState.nodeId).toBe(mockNodeId);
        expect(result.current.rewriteModalState.originalContent).toBe('Test Node\n\nSome details.');
      });
    });

    it('should call rewriteNodeContent flow and update modal state', async () => {
      const mockRewrite = { rewrittenText: 'Rewritten content' };
      vi.mocked(aiFlows.runFlow).mockResolvedValue(mockRewrite);

      const { result } = renderHook(() => useConceptMapAITools());

      act(() => {
        result.current.openRewriteNodeContentModal(mockNodeId);
      });

      await act(async () => {
        await result.current.handleRewriteNodeContent('concise');
      });

      expect(aiFlows.runFlow).toHaveBeenCalledWith('rewriteNode', {
        text: 'Test Node\n\nSome details.',
        style: 'concise',
        customInstruction: undefined,
      });

      await waitFor(() => {
        expect(result.current.rewriteModalState.rewrittenContent).toBe(mockRewrite.rewrittenText);
      });
    });
  });
});
