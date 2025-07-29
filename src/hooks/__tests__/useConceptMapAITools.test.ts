import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useConceptMapAITools } from '../useConceptMapAITools';

import * as aiFlows from '@/ai/flows';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';

// Mock dependencies
vi.mock('@/ai/flows', async () => {
  const actual = await vi.importActual<typeof import('@/ai/flows')>('@/ai/flows');
  return {
    ...actual,
    runFlow: vi.fn(),
  };
});

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

vi.mock('@/hooks/use-toast');

vi.mock('@/stores/concept-map-store');

const mockNodeId = 'node-1';
const mockNode = {
  id: mockNodeId,
  text: 'Test Node',
  details: 'Some details.',
  type: 'default',
  x: 0,
  y: 0,
  width: 150,
  height: 50,
  childIds: [],
};

describe('useConceptMapAITools', () => {
  let setStagedMapData: vi.Mock;
  let addDebugLog: vi.Mock;
  let toast: vi.Mock;

  beforeEach(() => {
    setStagedMapData = vi.fn();
    addDebugLog = vi.fn();
    toast = vi.fn().mockReturnValue({ id: 'toast-id' });

    (useConceptMapStore as unknown as vi.Mock).mockReturnValue({
      setStagedMapData,
      addDebugLog,
      mapData: { nodes: [mockNode], edges: [] },
      // Add other store state/actions if needed by the hook
    });

    (useToast as unknown as vi.Mock).mockReturnValue({ toast });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handleExtractConcepts', () => {
    it('should call extractConceptsFlow and update staged data on success', async () => {
      const mockExtractedData = {
        concepts: [
          { text: 'concept1', reason: 'reason1' },
          { text: 'concept2', reason: 'reason2' },
        ],
      };
      (aiFlows as any).runFlow.mockResolvedValue(mockExtractedData);

      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleExtractConcepts({
          context: 'some context',
        });
      });

      expect((aiFlows as any).runFlow).toHaveBeenCalledWith('extractConcepts', {
        context: 'some context',
      });
      expect(setStagedMapData).toHaveBeenCalledWith({
        nodes: mockExtractedData.concepts.map((c: any) => ({
          id: expect.any(String),
          text: c.text,
          details: c.reason,
          type: 'ai-concept',
          x: expect.any(Number),
          y: expect.any(Number),
        })),
        edges: [],
        actionType: 'extractConcepts',
      });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Concepts Extracted',
          description: 'Review the new concepts in the staging area.',
        })
      );
    });

    it('should show a toast message on failure', async () => {
      const error = new Error('AI failed');
      (aiFlows as any).runFlow.mockRejectedValue(error);

      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleExtractConcepts({
          context: 'some context',
        });
      });

      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error Extracting Concepts',
          description: error.message,
          variant: 'destructive',
        })
      );
    });
  });

  // Example for another function
  describe('handleRewriteNodeContent', () => {
    it('should open the rewrite modal with correct content', async () => {
      const { result } = renderHook(() => useConceptMapAITools(false));

      act(() => {
        result.current.openRewriteNodeContentModal(mockNodeId);
      });

      expect(result.current.rewriteModalState.isOpen).toBe(true);
      expect(result.current.rewriteModalState.nodeId).toBe(mockNodeId);
      expect(result.current.rewriteModalState.originalContent).toBe(
        'Test Node\n\nSome details.'
      );
    });

    it('should call rewriteNodeContentFlow and update modal state', async () => {
      const mockRewrite = { rewrittenText: 'Rewritten content' };
      (aiFlows as any).runFlow.mockResolvedValue(mockRewrite);

      const { result } = renderHook(() => useConceptMapAITools(false));

      // First, open the modal
      act(() => {
        result.current.openRewriteNodeContentModal(mockNodeId);
      });

      // Then, trigger the rewrite
      await act(async () => {
        await result.current.handleRewriteNodeContent('concise');
      });

      expect((aiFlows as any).runFlow).toHaveBeenCalledWith('rewriteNode', {
        text: 'Test Node\n\nSome details.',
        style: 'concise',
        customInstruction: undefined,
      });
      expect(result.current.rewriteModalState.rewrittenContent).toBe(
        mockRewrite.rewrittenText
      );
    });
  });
});
