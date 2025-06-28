import { renderHook, act } from '@testing-library/react';
import { useConceptMapAITools } from './useConceptMapAITools';
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
import { useReactFlow } from 'reactflow';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/stores/concept-map-store');

jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  useReactFlow: jest.fn(),
}));

// Mock AI Flows (very basic, can be expanded per test)
jest.mock('@/ai/flows', () => ({
  aiExtractConcepts: jest.fn(),
  aiSuggestRelations: jest.fn(),
  aiExpandConcept: jest.fn(),
  aiAskQuestionAboutNode: jest.fn(),
  aiGenerateQuickCluster: jest.fn(),
  aiGenerateMapSnippetFromText: jest.fn(),
  aiSummarizeNodes: jest.fn(),
  suggestEdgeLabelFlow: jest.fn(),
  suggestQuickChildTextsFlow: jest.fn(),
  refineNodeSuggestionFlow: jest.fn(),
  suggestIntermediateNodeFlow: jest.fn(),
  aiTidyUpSelectionFlow: jest.fn(),
  suggestChildNodesFlow: jest.fn(),
  suggestMapImprovementsFlow: jest.fn(),
  aiRewriteNodeContent: jest.fn(),
  generateMapSummaryFlow: jest.fn(),
  askQuestionAboutEdgeFlow: jest.fn(),
  askQuestionAboutMapContextFlow: jest.fn(),
}));

describe('useConceptMapAITools', () => {
// Mock AI Flows more specifically for upcoming tests
const mockAiExtractConcepts = jest.requireMock('@/ai/flows').aiExtractConcepts;

describe('useConceptMapAITools', () => {
  let mockToast: jest.Mock;
  let mockUseReactFlow: jest.Mock;
  let mockStore: any; // To hold the store mock for easier access in tests

  beforeEach(() => {
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    mockUseReactFlow = jest.fn().mockReturnValue({
      getViewport: jest.fn().mockReturnValue({ x: 0, y: 0, zoom: 1 }),
    });
    (useReactFlow as jest.Mock).mockImplementation(mockUseReactFlow);

    // Base store mock
    mockStore = {
      mapData: { nodes: [], edges: [] },
      selectedElementId: null,
      multiSelectedNodeIds: [],
      setAiExtractedConcepts: jest.fn(),
      setAiSuggestedRelations: jest.fn(),
      removeExtractedConceptsFromSuggestions: jest.fn(),
      removeSuggestedRelationsFromSuggestions: jest.fn(),
      resetAiSuggestions: jest.fn(),
      addNode: jest.fn(),
      updateNode: jest.fn(),
      addEdge: jest.fn(),
      setAiProcessingNodeId: jest.fn(),
      setStagedMapData: jest.fn(),
      setConceptExpansionPreview: jest.fn(),
      conceptExpansionPreview: null,
      applyLayout: jest.fn(),
      addDebugLog: jest.fn(),
      aiProcessingNodeId: null,
      // Mock getState for direct calls within the hook
      // This setup allows individual tests to modify parts of mockStore as needed
    };

    // Mock the hook selector behavior.
    // When useConceptMapStore(selector) is called, it will apply the selector to mockStore.
    // When useConceptMapStore() is called (no selector, less common for specific values), it returns the whole mockStore.
    (useConceptMapStore as unknown as jest.Mock).mockImplementation((selector?: (state: any) => any) => {
      if (selector) {
        // This is a simplified selector simulation.
        // For the specific selectors used in useConceptMapAITools,
        // we ensure they return the correct slice of mockStore.
        // The `useCallback(s => ({...}), [])` pattern in the hook means the selector
        // itself is memoized, but it operates on the current state provided by Zustand.
        // Our mockStore is that "current state" for testing.
        const selectedState = selector(mockStore);
        return selectedState;
      }
      return mockStore; // Should ideally not be called without a selector by the hook
    });
    // Ensure useConceptMapStore.getState() also returns the same mockStore instance
    // so that direct getState() calls in the hook reflect changes made to mockStore in tests.
    useConceptMapStore.getState = jest.fn().mockReturnValue(mockStore);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
  });

  describe('openExtractConceptsModal', () => {
  test('initial state should be correctly set', () => {
    const { result } = renderHook(() => useConceptMapAITools(false));

    expect(result.current.isExtractConceptsModalOpen).toBe(false);
    expect(result.current.isSuggestRelationsModalOpen).toBe(false);
    expect(result.current.isExpandConceptModalOpen).toBe(false);
    // ... check other initial states
    expect(result.current.textForExtraction).toBe("");
    expect(result.current.conceptsForRelationSuggestion).toEqual([]);
  });

    test('should set state correctly and open modal when no node selected', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => {
        result.current.openExtractConceptsModal();
      });
      expect(result.current.isExtractConceptsModalOpen).toBe(true);
      expect(result.current.textForExtraction).toBe("");
      expect(mockStore.resetAiSuggestions).toHaveBeenCalled();
    });

    test('should use selected node text if selectedElementId is present', () => {
      const mockNode = { id: 'node1', text: 'Selected Node Text', details: 'Node Details' };
      mockStore.mapData = { nodes: [mockNode], edges: [] };
      mockStore.selectedElementId = 'node1';

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => {
        result.current.openExtractConceptsModal();
      });
      expect(result.current.isExtractConceptsModalOpen).toBe(true);
      expect(result.current.textForExtraction).toBe('Selected Node Text\n\nDetails: Node Details');
    });

    test('should use multi-selected nodes text if present', () => {
      const mockNode1 = { id: 'node1', text: 'First Node', details: 'Details 1' };
      const mockNode2 = { id: 'node2', text: 'Second Node', details: 'Details 2' };
      mockStore.mapData = { nodes: [mockNode1, mockNode2], edges: [] };
      mockStore.multiSelectedNodeIds = ['node1', 'node2'];

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => {
        result.current.openExtractConceptsModal();
      });
      expect(result.current.isExtractConceptsModalOpen).toBe(true);
      expect(result.current.textForExtraction).toBe('First Node\nDetails: Details 1\n\n---\n\nSecond Node\nDetails: Details 2');
    });

    test('should prioritize multi-selected nodes over single selected node for text extraction', () => {
      const mockNode1 = { id: 'node1', text: 'Multi Select 1', details: 'Detail M1' };
      const mockNode2 = { id: 'node2', text: 'Multi Select 2', details: 'Detail M2' };
      const mockNode3 = { id: 'node3', text: 'Single Selected', details: 'Detail S1' };
      mockStore.mapData = { nodes: [mockNode1, mockNode2, mockNode3], edges: [] };
      mockStore.selectedElementId = 'node3';
      mockStore.multiSelectedNodeIds = ['node1', 'node2'];

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => {
        result.current.openExtractConceptsModal();
      });
      expect(result.current.isExtractConceptsModalOpen).toBe(true);
      expect(result.current.textForExtraction).toBe('Multi Select 1\nDetail M1\n\n---\n\nMulti Select 2\nDetail M2');
    });

    test('should show toast and not open modal if in view-only mode', () => {
      const { result } = renderHook(() => useConceptMapAITools(true)); // isViewOnlyMode = true

    act(() => {
      result.current.openExtractConceptsModal();
    });

    expect(result.current.isExtractConceptsModalOpen).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "View Only Mode",
      description: "AI tools are disabled.", // or specific message for extract concepts
    });
  });

  // TODO: Add more tests for:
  // - Each AI interaction function (e.g., handleConceptsExtracted)
  //   - Mock successful AI flow response and verify store actions / state changes
  //   - Mock failed AI flow response and verify error handling / toast messages
  describe('handleConceptsExtracted', () => {
    const testText = "Sample text for extraction.";
    const mockExtractedConcepts = [{ concept: "Concept 1", context: "Sample" }, { concept: "Concept 2" }];

    test('should call AI flow and update store on successful extraction', async () => {
      mockAiExtractConcepts.mockResolvedValue({ concepts: mockExtractedConcepts });
      const { result } = renderHook(() => useConceptMapAITools(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleConceptsExtracted(testText);
      });

      expect(mockAiExtractConcepts).toHaveBeenCalledWith({ text: testText });
      expect(mockStore.setAiExtractedConcepts).toHaveBeenCalledWith(mockExtractedConcepts);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Extract Concepts Successful!" }));
      expect(success).toBe(true);
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith('Extract Concepts'); // Start
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null); // End
    });

    test('should show error toast and not update store on AI flow failure', async () => {
      const errorMessage = "AI extraction failed";
      mockAiExtractConcepts.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() => useConceptMapAITools(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleConceptsExtracted(testText);
      });

      expect(mockAiExtractConcepts).toHaveBeenCalledWith({ text: testText });
      expect(mockStore.setAiExtractedConcepts).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Error: Could not complete Extract Concepts",
        description: expect.stringContaining(errorMessage),
        variant: "destructive",
      }));
      expect(success).toBe(false);
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith('Extract Concepts'); // Start
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null); // End
    });

    test('should not call AI flow if in view-only mode', async () => {
      const { result } = renderHook(() => useConceptMapAITools(true)); // isViewOnlyMode = true

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleConceptsExtracted(testText);
      });

      expect(mockAiExtractConcepts).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "View Only Mode",
        description: "Extract Concepts is disabled.",
        variant: "default",
      });
      expect(success).toBe(false);
    });
  });

  // TODO: Add more tests for:
  // - addExtractedConceptsToMap
  // - openSuggestRelationsModal & handleRelationsSuggested & addSuggestedRelationsToMap
  // - And so on for all other AI tools and their related functions
});
