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
  let mockToast: jest.Mock;
  let mockUseReactFlow: jest.Mock;

  beforeEach(() => {
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    mockUseReactFlow = jest.fn().mockReturnValue({
      getViewport: jest.fn().mockReturnValue({ x: 0, y: 0, zoom: 1 }),
      // Add other RF instance mocks if needed by specific functions
    });
    (useReactFlow as jest.Mock).mockImplementation(mockUseReactFlow);

    // Reset Zustand store mock before each test
    // Basic store state mock
    (useConceptMapStore as unknown as jest.Mock).mockReturnValue({
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
      aiProcessingNodeId: null, // Make sure this is part of the mock state
      // Add other store state/actions as needed by the hook
    });
    // Mock store's getState if direct calls like useConceptMapStore.getState() are made
     const mockGetState = jest.fn().mockReturnValue({
        mapData: { nodes: [], edges: [] },
        aiProcessingNodeId: null,
        setGhostPreview: jest.fn(),
        setStagedMapData: jest.fn(),
        updateConceptExpansionPreviewNode: jest.fn(),
        setStructuralSuggestions: jest.fn(),
        addDebugLog: jest.fn(),
        // ... other state accessed via getState()
    });
    useConceptMapStore.getState = mockGetState;


  });

  test('initial state should be correctly set', () => {
    const { result } = renderHook(() => useConceptMapAITools(false));

    expect(result.current.isExtractConceptsModalOpen).toBe(false);
    expect(result.current.isSuggestRelationsModalOpen).toBe(false);
    expect(result.current.isExpandConceptModalOpen).toBe(false);
    // ... check other initial states
    expect(result.current.textForExtraction).toBe("");
    expect(result.current.conceptsForRelationSuggestion).toEqual([]);
  });

  test('openExtractConceptsModal should set state correctly and open modal', () => {
    const { result } = renderHook(() => useConceptMapAITools(false));

    act(() => {
      result.current.openExtractConceptsModal();
    });

    expect(result.current.isExtractConceptsModalOpen).toBe(true);
    expect(result.current.textForExtraction).toBe(""); // Default when no node selected
  });

  test('openExtractConceptsModal should use selected node text if available', () => {
    const mockNode = { id: 'node1', text: 'Selected Node Text', details: 'Node Details' };
    (useConceptMapStore as unknown as jest.Mock).mockReturnValueOnce({
      mapData: { nodes: [mockNode], edges: [] },
      selectedElementId: 'node1',
      multiSelectedNodeIds: [],
      resetAiSuggestions: jest.fn(),
      // ... other necessary store mocks
    });

    const { result } = renderHook(() => useConceptMapAITools(false));

    act(() => {
      result.current.openExtractConceptsModal();
    });
    expect(result.current.isExtractConceptsModalOpen).toBe(true);
    expect(result.current.textForExtraction).toBe('Selected Node Text\n\nDetails: Node Details');
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
  // - Functions that add items to map (e.g., addExtractedConceptsToMap)
  // - View-only mode checks for other functions
  // - Edge cases and error conditions
});
