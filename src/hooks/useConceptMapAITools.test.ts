import { renderHook, act } from '@testing-library/react';
import { useConceptMapAITools, type ExpandConceptInput, type RefineModalData } from './useConceptMapAITools';  // Added RefineModalData
import { useToast } from '@/hooks/use-toast';
import useConceptMapStore from '@/stores/concept-map-store';
import { useReactFlow, type Node as RFNode } from 'reactflow';
import type { CustomNodeData } from './custom-node';
import type { SuggestRelationsOutput, ExpandConceptOutput, SummarizeNodesOutput, RewriteNodeContentOutput, AskQuestionAboutNodeOutput, AskQuestionAboutEdgeOutput, AskQuestionAboutEdgeInput, AskQuestionAboutMapContextOutput, GenerateMapSummaryOutput, SuggestEdgeLabelOutput, SuggestQuickChildTextsOutput, SuggestIntermediateNodeOutput, AiTidyUpSelectionOutput, SuggestedImprovements, RefineNodeSuggestionOutput } from '@/ai/flows';
import { GraphAdapterUtility } from '@/lib/graphologyAdapter';
import { DagreLayoutUtility } from '@/lib/dagreLayoutUtility';

// Mock dependencies
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/stores/concept-map-store');

jest.mock('reactflow', () => ({
  ...jest.requireActual('reactflow'),
  useReactFlow: jest.fn(),
}));

jest.mock('@/lib/graphologyAdapter');
jest.mock('@/lib/dagreLayoutUtility');

// Mock AI Flows
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
  const mockAiExtractConcepts = jest.requireMock('@/ai/flows').aiExtractConcepts;
  const mockAiSuggestRelations = jest.requireMock('@/ai/flows').aiSuggestRelations;
  const mockAiExpandConcept = jest.requireMock('@/ai/flows').aiExpandConcept;
  const mockAiSummarizeNodes = jest.requireMock('@/ai/flows').aiSummarizeNodes;
  const mockAiRewriteNodeContent = jest.requireMock('@/ai/flows').aiRewriteNodeContent;
  const mockAiAskQuestionAboutNode = jest.requireMock('@/ai/flows').aiAskQuestionAboutNode;
  const mockAskQuestionAboutEdgeFlow = jest.requireMock('@/ai/flows').askQuestionAboutEdgeFlow;
  const mockAskQuestionAboutMapContextFlow = jest.requireMock('@/ai/flows').askQuestionAboutMapContextFlow;
  const mockGenerateMapSummaryFlow = jest.requireMock('@/ai/flows').generateMapSummaryFlow;
  const mockSuggestEdgeLabelFlow = jest.requireMock('@/ai/flows').suggestEdgeLabelFlow;
  const mockSuggestQuickChildTextsFlow = jest.requireMock('@/ai/flows').suggestQuickChildTextsFlow;
  const mockSuggestIntermediateNodeFlow = jest.requireMock('@/ai/flows').suggestIntermediateNodeFlow;
  const mockAiTidyUpSelectionFlow = jest.requireMock('@/ai/flows').aiTidyUpSelectionFlow;
  const mockSuggestMapImprovementsFlow = jest.requireMock('@/ai/flows').suggestMapImprovementsFlow;
  const mockRefineNodeSuggestionFlow = jest.requireMock('@/ai/flows').refineNodeSuggestionFlow;


  let mockToast: jest.Mock;
  let mockReactFlowInstance: { getViewport: jest.Mock, getNode: jest.Mock };
  let mockStore: any;
  let mockGraphAdapterInstance: jest.Mocked<GraphAdapterUtility>;
  let mockDagreLayoutUtilityInstance: jest.Mocked<DagreLayoutUtility>;


  beforeEach(() => {
    mockToast = jest.fn();
    (useToast as jest.Mock).mockReturnValue({ toast: mockToast });

    mockReactFlowInstance = {
      getViewport: jest.fn().mockReturnValue({ x: 0, y: 0, zoom: 1, width: 800, height: 600 }),
      getNode: jest.fn(id => mockStore.mapData.nodes.find((n:any) => n.id === id)),
    };
    (useReactFlow as jest.Mock).mockImplementation(() => mockReactFlowInstance);


    mockStore = {
      mapData: { nodes: [], edges: [] },
      mapName: "Test Map",
      mapId: "map123",
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
      conceptExpansionPreview: null, // Mock this state for refine tests
      updateConceptExpansionPreviewNode: jest.fn(), // Mock for refine tests
      applyLayout: jest.fn(),
      addDebugLog: jest.fn(),
      aiProcessingNodeId: null,
      setGhostPreview: jest.fn(),
      setStructuralSuggestions: jest.fn(),
    };

    (useConceptMapStore as unknown as jest.Mock).mockImplementation((selector?: (state: any) => any) => {
      if (selector) {
        return selector(mockStore);
      }
      return mockStore;
    });
    useConceptMapStore.getState = jest.fn().mockReturnValue(mockStore);

    mockGraphAdapterInstance = {
        fromArrays: jest.fn().mockReturnThis(),
        hasNode: jest.fn().mockReturnValue(true),
        getNeighborhood: jest.fn().mockReturnValue([]),
    } as unknown as jest.Mocked<GraphAdapterUtility>;
    (GraphAdapterUtility as jest.Mock).mockImplementation(() => mockGraphAdapterInstance);

    mockDagreLayoutUtilityInstance = {
        layout: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<DagreLayoutUtility>;
    (DagreLayoutUtility as jest.Mock).mockImplementation(() => mockDagreLayoutUtilityInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ... (all previously added tests remain here) ...
  describe('openExtractConceptsModal', () => {
  test('initial state should be correctly set', () => {
    const { result } = renderHook(() => useConceptMapAITools(false));

    expect(result.current.isExtractConceptsModalOpen).toBe(false);
    expect(result.current.isSuggestRelationsModalOpen).toBe(false);
    expect(result.current.isExpandConceptModalOpen).toBe(false);
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
      const { result } = renderHook(() => useConceptMapAITools(true));

    act(() => {
      result.current.openExtractConceptsModal();
    });

    expect(result.current.isExtractConceptsModalOpen).toBe(false);
    expect(mockToast).toHaveBeenCalledWith({
      title: "View Only Mode",
      description: "AI tools are disabled.",
    });
  });
  });

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
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith('Extract Concepts');
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null);
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
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith('Extract Concepts');
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null);
    });

    test('should not call AI flow if in view-only mode', async () => {
      const { result } = renderHook(() => useConceptMapAITools(true));

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

  describe('addExtractedConceptsToMap', () => {
    const mockConceptsToAdd = [
      { concept: "New Concept 1", context: "Context A", source: "Source X" },
      { concept: "New Concept 2", context: "Context B" },
    ];

    beforeEach(() => {
      mockStore.addNode.mockClear();
      mockStore.removeExtractedConceptsFromSuggestions.mockClear();
      mockToast.mockClear();
    });

    test('should add selected concepts to the map and show toast', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));

      act(() => {
        result.current.addExtractedConceptsToMap(mockConceptsToAdd);
      });

      expect(mockStore.addNode).toHaveBeenCalledTimes(mockConceptsToAdd.length);
      expect(mockStore.addNode).toHaveBeenCalledWith(expect.objectContaining({
        text: "New Concept 1",
        type: 'ai-concept',
        details: 'Context: Context A\nSource: "Source X"',
        position: expect.any(Object),
      }));
      expect(mockStore.addNode).toHaveBeenCalledWith(expect.objectContaining({
        text: "New Concept 2",
        type: 'ai-concept',
        details: 'Context: Context B',
        position: expect.any(Object),
      }));
      expect(mockToast).toHaveBeenCalledWith({
        title: "Concepts Added",
        description: `${mockConceptsToAdd.length} new concepts added.`,
      });
      expect(mockStore.removeExtractedConceptsFromSuggestions).toHaveBeenCalledWith(mockConceptsToAdd.map(c => c.concept));
    });

    test('should not add concepts if in view-only mode', () => {
      const { result } = renderHook(() => useConceptMapAITools(true));

      act(() => {
        result.current.addExtractedConceptsToMap(mockConceptsToAdd);
      });

      expect(mockStore.addNode).not.toHaveBeenCalled();
      expect(mockStore.removeExtractedConceptsFromSuggestions).not.toHaveBeenCalled();
    });

    test('should not do anything if no concepts are selected', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));

      act(() => {
        result.current.addExtractedConceptsToMap([]);
      });

      expect(mockStore.addNode).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
      expect(mockStore.removeExtractedConceptsFromSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('openSuggestRelationsModal', () => {
    const mockNode1 = { id: 'n1', text: 'Node 1' };
    const mockNode2 = { id: 'n2', text: 'Node 2' };
    const mockNode3 = { id: 'n3', text: 'Node 3' };
    const mockNode4 = { id: 'n4', text: 'Node 4' };
    const mockNode5 = { id: 'n5', text: 'Node 5' };
    const mockNode6 = { id: 'n6', text: 'Node 6' };

    beforeEach(() => {
      mockStore.resetAiSuggestions.mockClear();
      mockStore.selectedElementId = null;
      mockStore.multiSelectedNodeIds = [];
      mockStore.mapData = { nodes: [mockNode1, mockNode2, mockNode3, mockNode4, mockNode5, mockNode6], edges: [] };
      mockGraphAdapterInstance.fromArrays.mockReturnThis();
      mockGraphAdapterInstance.hasNode.mockReturnValue(true);
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue([]);
    });

    test('should open modal and set default concepts if no selection and map has few nodes', () => {
      mockStore.mapData = { nodes: [mockNode1, mockNode2], edges: [] };
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());
      expect(result.current.isSuggestRelationsModalOpen).toBe(true);
      expect(result.current.conceptsForRelationSuggestion).toEqual([mockNode1.text, mockNode2.text]);
      expect(mockStore.resetAiSuggestions).toHaveBeenCalled();
    });

    test('should use up to 5 nodes from map if no selection and map has many nodes', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());
      expect(result.current.isSuggestRelationsModalOpen).toBe(true);
      expect(result.current.conceptsForRelationSuggestion).toEqual([
        mockNode1.text, mockNode2.text, mockNode3.text, mockNode4.text, mockNode5.text,
      ]);
    });

    test('should use default examples if map is empty and no selection', () => {
      mockStore.mapData = { nodes: [], edges: [] };
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());
      expect(result.current.conceptsForRelationSuggestion).toEqual(["Example A", "Example B"]);
    });

    test('should use multi-selected nodes if available (>=2)', () => {
      mockStore.multiSelectedNodeIds = ['n1', 'n3'];
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());
      expect(result.current.conceptsForRelationSuggestion).toEqual([mockNode1.text, mockNode3.text]);
    });

    test('should use selected node and its neighbors if single node selected', () => {
      mockStore.selectedElementId = 'n1';
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue(['n2', 'n3']);

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());

      expect(result.current.conceptsForRelationSuggestion).toContain(mockNode1.text);
      expect(result.current.conceptsForRelationSuggestion).toContain(mockNode2.text);
      expect(result.current.conceptsForRelationSuggestion).toContain(mockNode3.text);
      expect(result.current.conceptsForRelationSuggestion.length).toBe(3);
    });

    test('should limit neighbors to 4 for single selected node context', () => {
      mockStore.selectedElementId = 'n1';
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue(['n2', 'n3', 'n4', 'n5', 'n6']);

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openSuggestRelationsModal());

      expect(result.current.conceptsForRelationSuggestion).toEqual([
        mockNode1.text, mockNode2.text, mockNode3.text, mockNode4.text, mockNode5.text
      ]);
      expect(result.current.conceptsForRelationSuggestion.length).toBe(5);
    });

    test('should show toast and not open modal if in view-only mode', () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
      act(() => result.current.openSuggestRelationsModal());
      expect(result.current.isSuggestRelationsModalOpen).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
      expect(mockStore.resetAiSuggestions).not.toHaveBeenCalled();
    });
  });

  describe('handleRelationsSuggested', () => {
    const testConcepts = ["Concept A", "Concept B"];
    const mockSuggestedRelationsData: SuggestRelationsOutput = [
      { source: "Concept A", target: "Concept B", relation: "is related to", reason: "They are often discussed together." },
      { source: "Concept B", target: "Concept C", relation: "leads to" }
    ];

    beforeEach(() => {
      mockAiSuggestRelations.mockClear();
      mockStore.setAiSuggestedRelations.mockClear();
      mockToast.mockClear();
      mockStore.setAiProcessingNodeId.mockClear();
    });

    test('should call AI flow and update store on successful suggestion', async () => {
      mockAiSuggestRelations.mockResolvedValue(mockSuggestedRelationsData);
      const { result } = renderHook(() => useConceptMapAITools(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleRelationsSuggested(testConcepts);
      });

      expect(mockAiSuggestRelations).toHaveBeenCalledWith({ concepts: testConcepts });
      expect(mockStore.setAiSuggestedRelations).toHaveBeenCalledWith(mockSuggestedRelationsData);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Suggest Relations Successful!" }));
      expect(success).toBe(true);
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith('Suggest Relations');
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null);
    });

    test('should show error toast on AI flow failure', async () => {
      const errorMessage = "Relation suggestion failed";
      mockAiSuggestRelations.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() => useConceptMapAITools(false));

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleRelationsSuggested(testConcepts);
      });

      expect(mockAiSuggestRelations).toHaveBeenCalledWith({ concepts: testConcepts });
      expect(mockStore.setAiSuggestedRelations).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Error: Could not complete Suggest Relations",
        description: expect.stringContaining(errorMessage),
        variant: "destructive",
      }));
      expect(success).toBe(false);
    });

    test('should not call AI flow if in view-only mode', async () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
       let success: boolean | undefined;
      await act(async () => {
        success = await result.current.handleRelationsSuggested(testConcepts);
      });
      expect(mockAiSuggestRelations).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
          title: "View Only Mode",
          description: "Suggest Relations is disabled.",
          variant: "default"
      });
      expect(success).toBe(false);
    });
  });

  describe('addSuggestedRelationsToMap', () => {
    const mockNodeA = { id: 'nodeA', text: 'Concept A', x: 0, y: 0, type: 'concept' };
    const mockNodeB = { id: 'nodeB', text: 'Concept B', x: 100, y: 0, type: 'concept' };
    const mockRelationsToAdd: SuggestRelationsOutput = [
      { source: "Concept A", target: "Concept B", relation: "connects to", reason: "Reason AB" },
      { source: "Concept B", target: "New Concept D", relation: "leads to", reason: "Reason BD" },
    ];

    beforeEach(() => {
      mockStore.mapData = { nodes: [mockNodeA as any, mockNodeB as any], edges: [] };
      mockStore.addNode.mockClear().mockImplementation((nodeData: any) => {
        const newNodeId = `new-${nodeData.text.replace(/\s+/g, '')}-${Date.now()}`;
        const newNode = { ...nodeData, id: newNodeId, x:0, y:0, type: 'ai-concept' };
        mockStore.mapData.nodes.push(newNode);
        return newNodeId;
      });
      mockStore.addEdge.mockClear();
      mockStore.removeSuggestedRelationsFromSuggestions.mockClear();
      mockToast.mockClear();
    });

    test('should add relations, creating new nodes if necessary, and show toast', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => {
        result.current.addSuggestedRelationsToMap(mockRelationsToAdd);
      });

      expect(mockStore.addEdge).toHaveBeenCalledWith(expect.objectContaining({
        source: mockNodeA.id,
        target: mockNodeB.id,
        label: "connects to",
      }));

      expect(mockStore.addNode).toHaveBeenCalledWith(expect.objectContaining({
        text: "New Concept D",
        type: 'ai-concept',
      }));

      const addEdgeCalls = mockStore.addEdge.mock.calls;
      expect(addEdgeCalls.length).toBe(2);
      const edgeToNewNode = addEdgeCalls.find(call => call[0].source === mockNodeB.id && call[0].label === "leads to");
      expect(edgeToNewNode).toBeDefined();
      if(edgeToNewNode) {
        expect(edgeToNewNode[0].details).toBe("Reason BD");
      }

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Relations Added",
        description: "2 new relations added. 1 new concepts added.",
      }));
      expect(mockStore.removeSuggestedRelationsFromSuggestions).toHaveBeenCalledWith(mockRelationsToAdd);
    });

    test('should not add if view-only', () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
      act(() => result.current.addSuggestedRelationsToMap(mockRelationsToAdd));
      expect(mockStore.addNode).not.toHaveBeenCalled();
      expect(mockStore.addEdge).not.toHaveBeenCalled();
    });

    test('should not add if no relations given', () => {
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.addSuggestedRelationsToMap([]));
      expect(mockStore.addNode).not.toHaveBeenCalled();
      expect(mockStore.addEdge).not.toHaveBeenCalled();
      expect(mockToast).not.toHaveBeenCalled();
    });

    test('should not create duplicate edges if relation already exists', () => {
        const existingEdge = { id: 'edge1', source: mockNodeA.id, target: mockNodeB.id, label: "connects to" };
        mockStore.mapData = { nodes: [mockNodeA as any, mockNodeB as any], edges: [existingEdge] };

        const relationsToTest = [{ source: "Concept A", target: "Concept B", relation: "connects to", reason: "Test" }];
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.addSuggestedRelationsToMap(relationsToTest as any));

        expect(mockStore.addEdge).not.toHaveBeenCalled();
        const toastCallsWithTitle = mockToast.mock.calls.filter(call => call[0].title === "Relations Added");
        expect(toastCallsWithTitle.length).toBe(0);
    });
  });

  describe('openExpandConceptModal', () => {
    const mockNode1 = { id: 'n1', text: 'Expandable Node' };
    const mockNeighborNode = { id: 'n2', text: 'Neighbor Node' };

    beforeEach(() => {
      mockStore.selectedElementId = null;
      mockStore.mapData = { nodes: [mockNode1, mockNeighborNode], edges: [] };
      mockGraphAdapterInstance.fromArrays.mockReturnThis();
      mockGraphAdapterInstance.hasNode.mockReturnValue(true);
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue([]);
    });

    test('should open modal and set concept details from selected node', () => {
      mockStore.selectedElementId = 'n1';
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue(['n2']);

      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openExpandConceptModal());

      expect(result.current.isExpandConceptModalOpen).toBe(true);
      expect(result.current.conceptToExpandDetails).toEqual({ id: 'n1', text: 'Expandable Node', node: mockNode1 });
      expect(result.current.mapContextForExpansion).toEqual(['Neighbor Node']);
    });

    test('should set default concept if no node selected but map has nodes', () => {
      mockStore.mapData = { nodes: [mockNode1], edges: [] };
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openExpandConceptModal());

      expect(result.current.isExpandConceptModalOpen).toBe(true);
      expect(result.current.conceptToExpandDetails).toEqual({ id: null, text: "General Map Topic", node: undefined });
      expect(result.current.mapContextForExpansion).toEqual([]);
    });

    test('should set empty text if no node selected and map is empty', () => {
      mockStore.mapData = { nodes: [], edges: [] };
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openExpandConceptModal());
      expect(result.current.isExpandConceptModalOpen).toBe(true);
      expect(result.current.conceptToExpandDetails).toEqual({id: null, text: "", node: undefined});
    });

    test('should use nodeIdForContext if provided', () => {
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue(['n2']);
      const { result } = renderHook(() => useConceptMapAITools(false));
      act(() => result.current.openExpandConceptModal('n1'));

      expect(result.current.isExpandConceptModalOpen).toBe(true);
      expect(result.current.conceptToExpandDetails).toEqual({ id: 'n1', text: 'Expandable Node', node: mockNode1 });
      expect(result.current.mapContextForExpansion).toEqual(['Neighbor Node']);
    });

    test('should show toast and not open if in view-only mode', () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
      act(() => result.current.openExpandConceptModal('n1'));
      expect(result.current.isExpandConceptModalOpen).toBe(false);
      expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
    });
  });
  describe('handleConceptExpanded', () => {
    const mockParentNode = { id: 'parent1', text: 'Parent Concept', x: 100, y: 100, type: 'concept' };
    const mockExpandInput: ExpandConceptInput = { concept: 'Parent Concept', existingMapContext: [], userRefinementPrompt: '' };
    const mockExpansionOutput: ExpandConceptOutput = {
      expandedIdeas: [
        { text: "Child Idea 1", reasoning: "Reason 1", relationLabel: "relates to" },
        { text: "Child Idea 2", details: "Detail for C2", relationLabel: "leads to" },
      ],
    };

    beforeEach(() => {
      mockAiExpandConcept.mockClear();
      mockStore.setStagedMapData.mockClear();
      mockStore.setConceptExpansionPreview.mockClear();
      mockToast.mockClear();
      mockStore.setAiProcessingNodeId.mockClear();
      mockStore.conceptToExpandDetails = { id: mockParentNode.id, text: mockParentNode.text, node: mockParentNode as any };
      mockStore.mapData = { nodes: [mockParentNode as any], edges: [] };
    });

    test('should call AI, stage results, and clear preview on successful expansion', async () => {
      mockAiExpandConcept.mockResolvedValue(mockExpansionOutput);
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });

      expect(mockAiExpandConcept).toHaveBeenCalledWith(mockExpandInput);
      expect(mockStore.setStagedMapData).toHaveBeenCalledWith(expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ text: "Child Idea 1", type: 'ai-expanded' }),
          expect.objectContaining({ text: "Child Idea 2", type: 'ai-expanded' }),
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({ source: mockParentNode.id, label: "relates to" }),
          expect.objectContaining({ source: mockParentNode.id, label: "leads to" }),
        ]),
        actionType: 'expandConcept',
        originalElementId: mockParentNode.id,
      }));
      expect(mockStore.setConceptExpansionPreview).toHaveBeenCalledWith(null);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "AI Suggestions Ready" }));
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(mockParentNode.id);
      expect(mockStore.setAiProcessingNodeId).toHaveBeenCalledWith(null);
    });

    test('should show error if conceptToExpandDetails.id is null', async () => {
      mockStore.conceptToExpandDetails = { id: null, text: 'Some Text', node: undefined };
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });

      expect(mockAiExpandConcept).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Error",
        description: "Cannot expand concept without a source node.",
        variant: "destructive",
      }));
    });

    test('should show error if parent node is not found (edge case)', async () => {
      mockStore.mapData = { nodes: [], edges: [] };
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });

      expect(mockAiExpandConcept).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "Error",
          description: "Parent node for expansion not found.",
          variant: "destructive",
      }));
    });

    test('should handle AI returning no expanded ideas', async () => {
      mockAiExpandConcept.mockResolvedValue({ expandedIdeas: [] });
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });

      expect(mockStore.setStagedMapData).not.toHaveBeenCalled();
      expect(mockStore.setConceptExpansionPreview).toHaveBeenCalledWith(null);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Expand Concept",
        description: "AI did not find any specific concepts to expand with.",
        variant: "default",
      }));
    });

    test('should show error toast on AI flow failure', async () => {
      const errorMessage = "Expansion failed";
      mockAiExpandConcept.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });

      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Error: Could not complete Expand Concept",
        description: expect.stringContaining(errorMessage),
      }));
    });

    test('should not call AI if in view-only mode', async () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
      await act(async () => {
        await result.current.handleConceptExpanded(mockExpandInput);
      });
      expect(mockAiExpandConcept).not.toHaveBeenCalled();
       expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "View Only Mode",
        description: "Expand Concept is disabled.",
      }));
    });
  });
  describe('handleSummarizeSelectedNodes', () => {
    const node1 = { id: 'snode1', text: 'First node to summarize', x: 50, y: 50, type: 'concept' };
    const node2 = { id: 'snode2', text: 'Second node to summarize', x: 150, y: 50, type: 'concept' };
    const mockSummaryOutput: SummarizeNodesOutput = {
      summary: { text: "Combined summary", details: "Summary of two nodes" }
    };

    beforeEach(() => {
      mockAiSummarizeNodes.mockClear();
      mockStore.setStagedMapData.mockClear();
      mockToast.mockClear();
      mockStore.setAiProcessingNodeId.mockClear();
      mockStore.mapData = { nodes: [node1 as any, node2 as any], edges: [] };
      mockStore.multiSelectedNodeIds = [node1.id, node2.id];
    });

    test('should summarize selected nodes and stage the result', async () => {
      mockAiSummarizeNodes.mockResolvedValue(mockSummaryOutput);
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleSummarizeSelectedNodes();
      });

      expect(mockAiSummarizeNodes).toHaveBeenCalledWith({
        nodes: [
          { id: node1.id, text: node1.text, details: undefined },
          { id: node2.id, text: node2.text, details: undefined }
        ]
      });
      expect(mockStore.setStagedMapData).toHaveBeenCalledWith(expect.objectContaining({
        nodes: expect.arrayContaining([
          expect.objectContaining({ text: "Combined summary", type: 'ai-summary-node' })
        ]),
        edges: expect.arrayContaining([
          expect.objectContaining({ target: node1.id, label: 'summary of' }),
          expect.objectContaining({ target: node2.id, label: 'summary of' }),
        ]),
        actionType: 'summarizeNodes',
      }));
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "AI Summary Created!" }));
    });

    test('should show toast if no nodes are selected', async () => {
      mockStore.multiSelectedNodeIds = [];
      const { result } = renderHook(() => useConceptMapAITools(false));
      await act(async () => {
        await result.current.handleSummarizeSelectedNodes();
      });
      expect(mockAiSummarizeNodes).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Selection Error",
        description: "Please select at least one node to summarize.",
        variant: "destructive",
      });
    });

    test('should handle AI returning no summary text', async () => {
      mockAiSummarizeNodes.mockResolvedValue({ summary: { text: "" } });
      const { result } = renderHook(() => useConceptMapAITools(false));
      await act(async () => {
        await result.current.handleSummarizeSelectedNodes();
      });
      expect(mockStore.setStagedMapData).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
        title: "AI Summary Created!",
        description: "AI could not generate a specific summary for the selection."
      }));
    });

    test('should not call AI if in view-only mode', async () => {
      const { result } = renderHook(() => useConceptMapAITools(true));
      await act(async () => {
        await result.current.handleSummarizeSelectedNodes();
      });
      expect(mockAiSummarizeNodes).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
          title: "View Only Mode",
          description: "Summarize Selection is disabled."
      }));
    });
  });

  describe('openQuickClusterModal', () => {
    beforeEach(() => {
        mockStore.multiSelectedNodeIds = [];
        mockToast.mockClear();
    });

    test('should set isQuickClusterModalOpen to true if enough nodes selected', () => {
        mockStore.multiSelectedNodeIds = ['node1', 'node2'];
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openQuickClusterModal();
        });
        expect(result.current.isQuickClusterModalOpen).toBe(true);
    });

    test('should show toast and not open modal if not enough nodes selected', () => {
        mockStore.multiSelectedNodeIds = ['node1'];
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openQuickClusterModal();
        });
        expect(result.current.isQuickClusterModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({
            title: "Selection Required",
            description: "Please select at least two nodes to form a quick cluster.",
            variant: "destructive",
        });
    });

    test('should show toast and not open modal if in view-only mode', () => {
        mockStore.multiSelectedNodeIds = ['node1', 'node2'];
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => {
            result.current.openQuickClusterModal();
        });
        expect(result.current.isQuickClusterModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({
            title: "View Only Mode",
            description: "AI tools are disabled.",
        });
    });
  });

  describe('openGenerateSnippetModal', () => {
    beforeEach(() => {
        mockToast.mockClear();
    });

    test('should set isGenerateSnippetModalOpen to true', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openGenerateSnippetModal();
        });
        expect(result.current.isGenerateSnippetModalOpen).toBe(true);
    });

    test('should show toast and not open modal if in view-only mode', () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => {
            result.current.openGenerateSnippetModal();
        });
        expect(result.current.isGenerateSnippetModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({
            title: "View Only Mode",
            description: "AI tools are disabled.",
        });
    });
  });

  describe('handleMiniToolbarQuickExpand', () => {
    const sourceNodeId = 'sourceNode1';
    const mockSourceNode = { id: sourceNodeId, text: 'Source Text', x: 10, y: 20, type: 'concept' };
    const mockQuickExpandOutput: ExpandConceptOutput = {
      expandedIdeas: [{ text: "Quick Idea", relationLabel: "expands to" }]
    };

    beforeEach(() => {
      mockAiExpandConcept.mockClear();
      mockStore.setStagedMapData.mockClear();
      mockStore.setConceptExpansionPreview.mockClear();
      mockToast.mockClear();
      mockStore.mapData = { nodes: [mockSourceNode as any], edges: [] };
      mockGraphAdapterInstance.getNeighborhood.mockReturnValue([]);
    });

    test('should quick expand node and stage result', async () => {
      mockAiExpandConcept.mockResolvedValue(mockQuickExpandOutput);
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleMiniToolbarQuickExpand(sourceNodeId);
      });

      expect(mockAiExpandConcept).toHaveBeenCalledWith(expect.objectContaining({
        concept: mockSourceNode.text,
        userRefinementPrompt: expect.any(String),
      }));
      expect(mockStore.setStagedMapData).toHaveBeenCalledWith(expect.objectContaining({
        nodes: expect.arrayContaining([expect.objectContaining({ text: "Quick Idea" })]),
        edges: expect.arrayContaining([expect.objectContaining({ source: sourceNodeId, label: "expands to" })]),
        actionType: 'expandConcept',
        originalElementId: sourceNodeId,
      }));
      expect(mockStore.setConceptExpansionPreview).toHaveBeenCalledWith(null);
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "AI Suggestion Ready" }));
    });

    test('should show error if source node not found', async () => {
      const { result } = renderHook(() => useConceptMapAITools(false));
      await act(async () => {
        await result.current.handleMiniToolbarQuickExpand('nonExistentNode');
      });
      expect(mockAiExpandConcept).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Source node not found.", variant: "destructive" });
    });
  });

  describe('handleMiniToolbarRewriteConcise', () => {
    const nodeIdToRewrite = 'rewriteNode1';
    const mockNodeToRewrite = { id: nodeIdToRewrite, text: 'Some long text to make concise', details: 'Some details', type: 'concept' };
    const mockRewriteOutput: RewriteNodeContentOutput = {
      rewrittenText: "Concise text",
      rewrittenDetails: "Concise details",
    };

    beforeEach(() => {
      mockAiRewriteNodeContent.mockClear();
      mockStore.updateNode.mockClear();
      mockToast.mockClear();
      mockStore.mapData = { nodes: [mockNodeToRewrite as any], edges: [] };
    });

    test('should rewrite node content concisely and update store', async () => {
      mockAiRewriteNodeContent.mockResolvedValue(mockRewriteOutput);
      const { result } = renderHook(() => useConceptMapAITools(false));

      await act(async () => {
        await result.current.handleMiniToolbarRewriteConcise(nodeIdToRewrite);
      });

      expect(mockAiRewriteNodeContent).toHaveBeenCalledWith({
        currentText: mockNodeToRewrite.text,
        currentDetails: mockNodeToRewrite.details,
        targetTone: "concise",
      });
      expect(mockStore.updateNode).toHaveBeenCalledWith(nodeIdToRewrite, {
        text: mockRewriteOutput.rewrittenText,
        details: mockRewriteOutput.rewrittenDetails,
        type: 'ai-rewritten-node',
      });
    });

    test('should show error if node to rewrite not found', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleMiniToolbarRewriteConcise('nonExistentNode');
        });
        expect(mockAiRewriteNodeContent).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Node not found.", variant: "destructive" });
    });
  });

  describe('openAskQuestionModal', () => {
    const mockNode = { id: 'qNode1', text: 'Question Node', details: 'Details for QNode' };
    beforeEach(() => {
        mockStore.mapData = { nodes: [mockNode as any], edges: [] };
        mockToast.mockClear();
    });

    test('should open modal and set node context', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openAskQuestionModal('qNode1');
        });
        expect(result.current.isAskQuestionModalOpen).toBe(true);
        expect(result.current.nodeContextForQuestion).toEqual({
            id: 'qNode1',
            text: 'Question Node',
            details: 'Details for QNode',
        });
    });

    test('should show error toast if node not found', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openAskQuestionModal('nonExistent');
        });
        expect(result.current.isAskQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({
            title: "Error",
            description: "Node not found.",
            variant: "destructive",
        });
    });

    test('should show view-only toast if in view-only mode', () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => {
            result.current.openAskQuestionModal('qNode1');
        });
        expect(result.current.isAskQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
    });
  });

  describe('handleQuestionAnswered', () => {
    const question = "What is this node about?";
    const nodeCtx = { id: 'qNode1', text: 'Question Node', details: 'Details for QNode' };
    const mockAnswer: AskQuestionAboutNodeOutput = { answer: "This node is about important things." };

    beforeEach(() => {
        mockAiAskQuestionAboutNode.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [{...nodeCtx, type:'concept'} as any], edges:[]};
    });

    test('should call AI flow and show answer in toast', async () => {
        mockAiAskQuestionAboutNode.mockResolvedValue(mockAnswer);
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleQuestionAnswered(question, nodeCtx);
        });
        expect(mockAiAskQuestionAboutNode).toHaveBeenCalledWith({
            nodeId: nodeCtx.id,
            nodeText: nodeCtx.text,
            nodeDetails: nodeCtx.details,
            nodeType: 'concept',
            userQuestion: question,
        });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "AI Answer:",
            description: mockAnswer.answer,
        }));
    });

    test('should handle AI flow failure with error toast', async () => {
        const errorMsg = "Failed to get answer";
        mockAiAskQuestionAboutNode.mockRejectedValue(new Error(errorMsg));
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleQuestionAnswered(question, nodeCtx);
        });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Error: Could not complete Ask AI About Node",
            description: expect.stringContaining(errorMsg),
        }));
    });
  });

  describe('openAskQuestionAboutEdgeModal', () => {
    const sourceNode = { id: 's1', text: 'Source Node', details: 'Source Details' };
    const targetNode = { id: 't1', text: 'Target Node', details: 'Target Details' };
    const mockEdge = { id: 'edge1', source: 's1', target: 't1', label: 'connects' };

    beforeEach(() => {
        mockStore.mapData = { nodes: [sourceNode as any, targetNode as any], edges: [mockEdge as any] };
        mockToast.mockClear();
    });

    test('should open modal and set edge context', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.openAskQuestionAboutEdgeModal('edge1'));
        expect(result.current.isEdgeQuestionModalOpen).toBe(true);
        expect(result.current.edgeQuestionContext).toEqual({
            sourceNodeId: 's1', sourceNodeText: 'Source Node', sourceNodeDetails: 'Source Details',
            targetNodeId: 't1', targetNodeText: 'Target Node', targetNodeDetails: 'Target Details',
            edgeId: 'edge1', edgeLabel: 'connects', userQuestion: ""
        });
        expect(result.current.edgeQuestionAnswer).toBeNull();
    });

    test('should show error if edge not found', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.openAskQuestionAboutEdgeModal('nonExistentEdge'));
        expect(result.current.isEdgeQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Selected edge not found.", variant: "destructive" });
    });
     test('should show error if source node for edge not found', () => {
        mockStore.mapData = { nodes: [targetNode as any], edges: [mockEdge as any] };
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.openAskQuestionAboutEdgeModal('edge1'));
        expect(result.current.isEdgeQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Connected nodes for the edge not found.", variant: "destructive" });
    });

    test('should show view-only toast if in view-only mode', () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => result.current.openAskQuestionAboutEdgeModal('edge1'));
        expect(result.current.isEdgeQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
    });
  });

  describe('handleAskQuestionAboutEdge', () => {
    const question = "Why this connection?";
    const edgeCtx: AskQuestionAboutEdgeInput = {
        sourceNodeId: 's1', sourceNodeText: 'Source', sourceNodeDetails: 'SDetails',
        targetNodeId: 't1', targetNodeText: 'Target', targetNodeDetails: 'TDetails',
        edgeId: 'edge1', edgeLabel: 'connects', userQuestion: question
    };
    const mockEdgeAnswer: AskQuestionAboutEdgeOutput = { answer: "This connection is important because..." };

    beforeEach(() => {
        mockAskQuestionAboutEdgeFlow.mockClear();
        mockToast.mockClear();
    });

    test('should call AI flow and set answer state on success', async () => {
        mockAskQuestionAboutEdgeFlow.mockResolvedValue(mockEdgeAnswer);
        const { result, rerender } = renderHook(() => useConceptMapAITools(false));

        act(() => { result.current.edgeQuestionContext = edgeCtx; });

        await act(async () => {
            await result.current.handleAskQuestionAboutEdge(question);
        });
        rerender();

        expect(mockAskQuestionAboutEdgeFlow).toHaveBeenCalledWith(edgeCtx);
        expect(result.current.edgeQuestionAnswer).toBe(mockEdgeAnswer.answer);
        expect(result.current.isAskingAboutEdge).toBe(false);
    });

    test('should set error message in answer state on AI failure', async () => {
        const errorMsg = "Edge Q&A failed";
        mockAskQuestionAboutEdgeFlow.mockRejectedValue(new Error(errorMsg));
        const { result, rerender } = renderHook(() => useConceptMapAITools(false));
        act(() => { result.current.edgeQuestionContext = edgeCtx; });


        await act(async () => {
            await result.current.handleAskQuestionAboutEdge(question);
        });
        rerender();
        expect(result.current.edgeQuestionAnswer).toBe("AI could not provide an answer for this question.");
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
            title: "Error: Could not complete Ask AI About Edge",
        }));
    });

    test('should show error if edgeQuestionContext is null', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => { result.current.edgeQuestionContext = null; });

        await act(async () => {
            await result.current.handleAskQuestionAboutEdge(question);
        });
        expect(mockAskQuestionAboutEdgeFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Edge context is missing for Q&A.", variant: "destructive"});
    });
  });

  describe('openAskQuestionAboutMapContextModal', () => {
    beforeEach(() => {
        mockToast.mockClear();
    });

    test('should open modal and clear previous answer', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => { result.current.mapContextQuestionAnswer = "Previous answer"; });

        act(() => { result.current.openAskQuestionAboutMapContextModal(); });

        expect(result.current.isMapContextQuestionModalOpen).toBe(true);
        expect(result.current.mapContextQuestionAnswer).toBeNull();
    });

    test('should show view-only toast if in view-only mode', () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => result.current.openAskQuestionAboutMapContextModal());
        expect(result.current.isMapContextQuestionModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
    });
});

describe('handleAskQuestionAboutMapContext', () => {
    const question = "What is the main theme of this map?";
    const mockMapAnswer: AskQuestionAboutMapContextOutput = { answer: "The map is about project architecture." };
    const node1 = { id: 'n1', text: 'Node 1', type: 'generic', details: 'Detail 1' };
    const edge1 = { source: 'n1', target: 'n2', label: 'connects' };


    beforeEach(() => {
        mockAskQuestionAboutMapContextFlow.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [node1 as any], edges: [edge1 as any] };
        mockStore.mapName = "My Test Map";
    });

    test('should call AI flow and set answer on success', async () => {
        mockAskQuestionAboutMapContextFlow.mockResolvedValue(mockMapAnswer);
        const { result, rerender } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleAskQuestionAboutMapContext(question);
        });
        rerender();

        expect(mockAskQuestionAboutMapContextFlow).toHaveBeenCalledWith({
            nodes: [{id: 'n1', text: 'Node 1', type: 'generic', details: 'Detail 1'}],
            edges: [{source: 'n1', target: 'n2', label: 'connects'}],
            userQuestion: question,
            mapName: "My Test Map",
        });
        expect(result.current.mapContextQuestionAnswer).toBe(mockMapAnswer.answer);
        expect(result.current.isAskingAboutMapContext).toBe(false);
    });

    test('should show error in answer state on AI failure', async () => {
        const errorMsg = "Map Q&A failed";
        mockAskQuestionAboutMapContextFlow.mockRejectedValue(new Error(errorMsg));
        const { result, rerender } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleAskQuestionAboutMapContext(question);
        });
        rerender();

        expect(result.current.mapContextQuestionAnswer).toBe("AI could not provide an answer for this question about the map.");
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({
             title: "Error: Could not complete Ask AI About Map"
        }));
    });

    test('should show toast and not call AI if map is empty', async () => {
        mockStore.mapData = { nodes: [], edges: [] };
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleAskQuestionAboutMapContext(question);
        });
        expect(mockAskQuestionAboutMapContextFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({
            title: "Empty Map",
            description: "Cannot ask questions about an empty map.",
            variant: "default",
        });
    });
});

describe('openRewriteNodeContentModal', () => {
    const mockNode = { id: 'rewriteNode1', text: 'Node to Rewrite', details: 'Initial details' };
    beforeEach(() => {
        mockStore.mapData = { nodes: [mockNode as any], edges: [] };
        mockToast.mockClear();
    });

    test('should open modal and set node content to rewrite', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.openRewriteNodeContentModal('rewriteNode1'));
        expect(result.current.isRewriteNodeContentModalOpen).toBe(true);
        expect(result.current.nodeContentToRewrite).toEqual({
            id: 'rewriteNode1',
            text: 'Node to Rewrite',
            details: 'Initial details',
        });
    });

    test('should show error toast if node not found', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => result.current.openRewriteNodeContentModal('nonExistent'));
        expect(result.current.isRewriteNodeContentModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Node not found.", variant: "destructive" });
    });

    test('should show view-only toast if in view-only mode', () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
        act(() => result.current.openRewriteNodeContentModal('rewriteNode1'));
        expect(result.current.isRewriteNodeContentModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith({ title: "View Only Mode" });
    });
});

describe('handleRewriteNodeContentConfirm', () => {
    const nodeId = 'node1';
    const newText = "Rewritten Text";
    const newDetails = "Rewritten Details";

    beforeEach(() => {
        mockStore.updateNode.mockClear();
        mockToast.mockClear();
        mockStore.addDebugLog.mockClear();
    });

    test('should update node in store and show toast', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            result.current.handleRewriteNodeContentConfirm(nodeId, newText, newDetails, "formal");
        });
        expect(mockStore.addDebugLog).toHaveBeenCalledWith(`[AITools] Applying rewritten content for node ${nodeId}. Tone: formal`);
        expect(mockStore.updateNode).toHaveBeenCalledWith(nodeId, {
            text: newText,
            details: newDetails,
            type: 'ai-rewritten-node',
        });
        expect(mockToast).toHaveBeenCalledWith({
            title: "Node Content Updated",
            description: "Content rewritten by AI has been applied.",
        });
    });

    test('should not update node if in view-only mode', async () => {
        const { result } = renderHook(() => useConceptMapAITools(true));
         await act(async () => {
            result.current.handleRewriteNodeContentConfirm(nodeId, newText, newDetails, "formal");
        });
        expect(mockStore.updateNode).not.toHaveBeenCalled();
    });
});

describe('handleSummarizeMap', () => {
    const mockNodes = [{ id: 'n1', text: 'Node 1', details: 'Detail 1' }];
    const mockEdges = [{ id: 'e1', source: 'n1', target: 'n2', label: 'connects' }];
    const mockMapSummary: GenerateMapSummaryOutput = {
        title: "Map Overview",
        summary: "This map describes a simple system.",
        keyTakeaways: ["Takeaway 1", "Takeaway 2"],
    };

    beforeEach(() => {
        mockGenerateMapSummaryFlow.mockClear();
        mockToast.mockClear();
        mockStore.setAiProcessingNodeId.mockClear();
        mockStore.mapData = { nodes: mockNodes as any[], edges: mockEdges as any[] };
    });

    test('should call AI flow, set summary result, and open modal on success', async () => {
        mockGenerateMapSummaryFlow.mockResolvedValue(mockMapSummary);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleSummarizeMap();
        });

        expect(mockGenerateMapSummaryFlow).toHaveBeenCalledWith({ nodes: mockNodes, edges: mockEdges });
        expect(result.current.mapSummaryResult).toEqual(mockMapSummary);
        expect(result.current.isMapSummaryModalOpen).toBe(true);
        expect(result.current.isSummarizingMap).toBe(false);
    });

    test('should set summary result to null on AI failure', async () => {
        mockGenerateMapSummaryFlow.mockRejectedValue(new Error("Summary failed"));
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleSummarizeMap();
        });

        expect(result.current.mapSummaryResult).toBeNull();
        expect(result.current.isMapSummaryModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error: Could not complete Summarize Map" }));
    });

    test('should show toast and not call AI if map is empty', async () => {
        mockStore.mapData = { nodes: [], edges: [] };
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleSummarizeMap();
        });
        expect(mockGenerateMapSummaryFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Empty Map", description: "Cannot summarize an empty map.", variant: "default" });
    });
});

describe('fetchAndSetEdgeLabelSuggestions', () => {
    const edgeId = 'edge1';
    const sourceNode = { id: 's1', text: 'Source Node', details: 'Source Details' };
    const targetNode = { id: 't1', text: 'Target Node', details: 'Target Details' };
    const mockLabelsOutput: SuggestEdgeLabelOutput = { suggestedLabels: ["suggested label 1", "suggested label 2"] };

    beforeEach(() => {
        mockSuggestEdgeLabelFlow.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [sourceNode as any, targetNode as any], edges: [{id: edgeId, source: sourceNode.id, target: targetNode.id, label: "old label"}] };
    });

    test('should call AI flow and set edgeLabelSuggestions state', async () => {
        mockSuggestEdgeLabelFlow.mockResolvedValue(mockLabelsOutput);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.fetchAndSetEdgeLabelSuggestions(edgeId, sourceNode.id, targetNode.id, "old label");
        });

        expect(mockSuggestEdgeLabelFlow).toHaveBeenCalledWith({
            sourceNode: { text: sourceNode.text, details: sourceNode.details },
            targetNode: { text: targetNode.text, details: targetNode.details },
            existingLabel: "old label",
        });
        expect(result.current.edgeLabelSuggestions).toEqual({ edgeId, labels: mockLabelsOutput.suggestedLabels });
    });

    test('should default to "related to" if AI returns no labels', async () => {
        mockSuggestEdgeLabelFlow.mockResolvedValue({ suggestedLabels: [] });
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.fetchAndSetEdgeLabelSuggestions(edgeId, sourceNode.id, targetNode.id);
        });
        expect(result.current.edgeLabelSuggestions).toEqual({ edgeId, labels: ["related to"] });
    });

    test('should show error if source or target node not found', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        mockStore.mapData = { nodes: [sourceNode as any], edges: [] };
        await act(async () => {
            await result.current.fetchAndSetEdgeLabelSuggestions(edgeId, sourceNode.id, 'nonExistentTarget');
        });
        expect(mockSuggestEdgeLabelFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Source or target node not found for edge label suggestion.", variant: "destructive"});
    });
});

describe('fetchAIChildTextSuggestions', () => {
    const parentNodeData: RFNode<CustomNodeData> = {
        id: 'parent1',
        data: { label: 'Parent Text', details: 'Parent Details', childIds: ['child1'] },
        position: {x:0, y:0},
    };
    const existingChildNode = { id: 'child1', text: 'Existing Child' };
    const mockSuggestionsOutput: SuggestQuickChildTextsOutput = { suggestedChildTexts: ["New Child 1", "New Child 2"] };

    beforeEach(() => {
        mockSuggestQuickChildTextsFlow.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [existingChildNode as any], edges: [] };
    });

    test('should call AI and update suggestions state', async () => {
        mockSuggestQuickChildTextsFlow.mockResolvedValue(mockSuggestionsOutput);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.fetchAIChildTextSuggestions(parentNodeData);
        });
        expect(mockSuggestQuickChildTextsFlow).toHaveBeenCalledWith({
            parentNodeText: 'Parent Text',
            parentNodeDetails: 'Parent Details',
            existingChildTexts: ['Existing Child'],
        });
        expect(result.current.aiChildTextSuggestions).toEqual(mockSuggestionsOutput.suggestedChildTexts);
        expect(result.current.isLoadingAiChildTexts).toBe(false);
    });

    test('should not call AI if node is null', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.fetchAIChildTextSuggestions(null);
        });
        expect(mockSuggestQuickChildTextsFlow).not.toHaveBeenCalled();
    });
     test('should handle AI flow failure', async () => {
        mockSuggestQuickChildTextsFlow.mockRejectedValue(new Error("Child suggestion failed"));
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.fetchAIChildTextSuggestions(parentNodeData);
        });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error: Could not complete Suggest Child Node Texts"}));
        expect(result.current.isLoadingAiChildTexts).toBe(false);
    });
});

describe('handleSuggestIntermediateNodeRequest', () => {
    const sourceNode = { id: 's1', text: 'Source', details: 'SDetails', x:0, y:0, type:'concept' };
    const targetNode = { id: 't1', text: 'Target', details: 'TDetails', x:200, y:0, type:'concept' };
    const edge = { id: 'edge1', source: 's1', target: 't1', label: 'relates to' };
    const mockIntermediateOutput: SuggestIntermediateNodeOutput = {
        intermediateNodeText: "Intermediate Concept",
        intermediateNodeDetails: "Connects source and target",
        labelSourceToIntermediate: "leads to",
        labelIntermediateToTarget: "results in",
        reasoning: "A bridge concept."
    };

    beforeEach(() => {
        mockSuggestIntermediateNodeFlow.mockClear();
        mockStore.setStagedMapData.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [sourceNode as any, targetNode as any], edges: [edge as any] };
    });

    test('should call AI, stage results, and show toast on success', async () => {
        mockSuggestIntermediateNodeFlow.mockResolvedValue(mockIntermediateOutput);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleSuggestIntermediateNodeRequest(edge.id, sourceNode.id, targetNode.id);
        });

        expect(mockSuggestIntermediateNodeFlow).toHaveBeenCalledWith({
            sourceNodeText: sourceNode.text, sourceNodeDetails: sourceNode.details,
            targetNodeText: targetNode.text, targetNodeDetails: targetNode.details,
            existingEdgeLabel: edge.label
        });
        expect(mockStore.setStagedMapData).toHaveBeenCalledWith(expect.objectContaining({
            nodes: expect.arrayContaining([
                expect.objectContaining({ text: "Intermediate Concept", type: 'ai-intermediate' })
            ]),
            edges: expect.arrayContaining([
                expect.objectContaining({ source: sourceNode.id, label: "leads to" }),
                expect.objectContaining({ target: targetNode.id, label: "results in" }),
            ]),
            actionType: 'intermediateNode',
            originalElementId: edge.id,
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Intermediate Node Suggested" }));
    });

    test('should show error if edge context not found', async () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleSuggestIntermediateNodeRequest('nonExistentEdge', sourceNode.id, targetNode.id);
        });
        expect(mockSuggestIntermediateNodeFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Edge context not found.", variant: "destructive" });
    });
});

describe('handleAiTidyUpSelection', () => {
    const node1 = { id: 'tidy1', text: 'Tidy Node 1', x: 10, y: 10, width: 100, height: 50, type: 'concept' };
    const node2 = { id: 'tidy2', text: 'Tidy Node 2', x: 200, y: 10, width: 120, height: 60, type: 'concept' };
    const mockTidyOutputLayoutOnly: AiTidyUpSelectionOutput = {
        newPositions: [ { id: 'tidy1', x: 15, y: 15 }, { id: 'tidy2', x: 205, y: 15 } ]
    };
    const mockTidyOutputWithParent: AiTidyUpSelectionOutput = {
        newPositions: [ { id: 'tidy1', x: 50, y: 50 }, { id: 'tidy2', x: 50, y: 120 } ],
        suggestedParentNode: { text: "Cluster Parent", type: "ai-group" }
    };

    beforeEach(() => {
        mockAiTidyUpSelectionFlow.mockClear();
        mockStore.setGhostPreview.mockClear();
        mockStore.setStagedMapData.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [node1 as any, node2 as any], edges: [] };
        mockStore.multiSelectedNodeIds = [node1.id, node2.id];
    });

    test('should show error if less than 2 nodes selected', async () => {
        mockStore.multiSelectedNodeIds = ['tidy1'];
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleAiTidyUpSelection(); });
        expect(mockAiTidyUpSelectionFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Selection Required", description: "Select at least two nodes for AI Tidy Up."});
    });

    test('should set ghost preview for layout-only changes', async () => {
        mockAiTidyUpSelectionFlow.mockResolvedValue(mockTidyOutputLayoutOnly);
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleAiTidyUpSelection(); });

        expect(mockAiTidyUpSelectionFlow).toHaveBeenCalled();
        expect(mockStore.setGhostPreview).toHaveBeenCalledWith([
            { id: 'tidy1', x: 15, y: 15, width: 100, height: 50 },
            { id: 'tidy2', x: 205, y: 15, width: 120, height: 60 }
        ]);
        expect(mockStore.setStagedMapData).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Layout Preview Ready" }));
    });

    test('should stage results if new parent node is suggested', async () => {
        mockAiTidyUpSelectionFlow.mockResolvedValue(mockTidyOutputWithParent);
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleAiTidyUpSelection(); });

        expect(mockAiTidyUpSelectionFlow).toHaveBeenCalled();
        expect(mockStore.setGhostPreview).not.toHaveBeenCalled();
        expect(mockStore.setStagedMapData).toHaveBeenCalledWith(expect.objectContaining({
            nodes: expect.arrayContaining([
                expect.objectContaining({ text: "Cluster Parent", type: 'ai-group' }),
                expect.objectContaining({ id: 'tidy1', x: 50, y: 50, parentNode: expect.any(String) }),
                expect.objectContaining({ id: 'tidy2', x: 50, y: 120, parentNode: expect.any(String) })
            ]),
            actionType: 'aiTidyUpComplete',
            originalElementIds: ['tidy1', 'tidy2']
        }));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "AI Tidy Up Suggestion Ready" }));
    });
});

describe('handleSuggestMapImprovements', () => {
    const mockNodesInput = [{ id: 'n1', text: 'Node 1', details: '' }];
    const mockEdgesInput = [{ source: 'n1', target: 'n2', label: '' }];
    const mockImprovementsOutput: SuggestedImprovements = {
        suggestedEdges: [{ sourceNodeId: 'n1', targetNodeId: 'n2', label: 'improved label', reason: 'better connection' }],
        suggestedGroups: [{ name: 'New Group', nodeIds: ['n1', 'n2'], reason: 'semantic cluster' }],
        generalFeedback: "Map looks good overall."
    };

    beforeEach(() => {
        mockSuggestMapImprovementsFlow.mockClear();
        mockStore.setStructuralSuggestions.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: mockNodesInput as any[], edges: mockEdgesInput as any[] };
    });

    test('should call AI flow and set structural suggestions on success', async () => {
        mockSuggestMapImprovementsFlow.mockResolvedValue(mockImprovementsOutput);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleSuggestMapImprovements();
        });

        expect(mockSuggestMapImprovementsFlow).toHaveBeenCalledWith({ nodes: mockNodesInput, edges: mockEdgesInput });
        expect(mockStore.setStructuralSuggestions).toHaveBeenCalledWith(mockImprovementsOutput);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Improvement Suggestions Ready!" }));
    });

    test('should handle AI flow failure', async () => {
        mockSuggestMapImprovementsFlow.mockRejectedValue(new Error("Improvement suggestion failed"));
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleSuggestMapImprovements();
        });
        expect(mockStore.setStructuralSuggestions).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error: Could not complete Suggest Map Improvements" }));
    });
});

describe('handleDagreLayoutSelection', () => {
    const node1 = { id: 'dagre1', text: 'Dagre Node 1', x: 10, y: 10, width: 100, height: 50, type: 'concept' };
    const node2 = { id: 'dagre2', text: 'Dagre Node 2', x: 200, y: 10, width: 120, height: 60, type: 'concept' };
    const mockLayoutPositions = [ { id: 'dagre1', x: 15, y: 15 }, { id: 'dagre2', x: 205, y: 15 } ];

    beforeEach(() => {
        mockDagreLayoutUtilityInstance.layout.mockClear();
        mockStore.setGhostPreview.mockClear();
        mockToast.mockClear();
        mockStore.mapData = { nodes: [node1 as any, node2 as any], edges: [] };
        mockStore.multiSelectedNodeIds = [node1.id, node2.id];

        mockReactFlowInstance.getNode.mockImplementation(id => {
            const n = mockStore.mapData.nodes.find((node:any) => node.id === id);
            return n ? { ...n, positionAbsolute: {x: n.x, y: n.y}, width: n.width, height: n.height } : undefined;
        });
    });

    test('should apply Dagre layout and set ghost preview', async () => {
        mockDagreLayoutUtilityInstance.layout.mockResolvedValue(mockLayoutPositions);
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleDagreLayoutSelection(); });

        expect(mockDagreLayoutUtilityInstance.layout).toHaveBeenCalled();
        expect(mockStore.setGhostPreview).toHaveBeenCalledWith(expect.arrayContaining([
            expect.objectContaining({ id: 'dagre1' }),
            expect.objectContaining({ id: 'dagre2' }),
        ]));
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Layout Preview Ready" }));
    });

    test('should show error if less than 2 nodes selected', async () => {
        mockStore.multiSelectedNodeIds = ['dagre1'];
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleDagreLayoutSelection(); });
        expect(mockDagreLayoutUtilityInstance.layout).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Selection Required", description: "Please select at least 2 nodes." });
    });

    test('should show error if Dagre returns no positions', async () => {
        mockDagreLayoutUtilityInstance.layout.mockResolvedValue([]);
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => { await result.current.handleDagreLayoutSelection(); });
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Layout Error", description: "Dagre returned no positions." }));
    });
});

describe('getPaneSuggestions and getNodeSuggestions', () => {
    test('getPaneSuggestions should return an empty array', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        expect(result.current.getPaneSuggestions()).toEqual([]);
    });

    test('getNodeSuggestions should return an empty array', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        const mockNode = { id: '1', data: { label: 'Test' } } as RFNode<CustomNodeData>;
        expect(result.current.getNodeSuggestions(mockNode)).toEqual([]);
    });
});

describe('openRefineSuggestionModal', () => {
    const mockPreviewNode = { id: 'preview1', text: 'Preview Text', details: 'Preview Details' };
    const parentId = 'parent1';

    beforeEach(() => {
        mockStore.conceptExpansionPreview = {
            previewNodes: [mockPreviewNode],
            parentNodeId: parentId,
            // other preview state properties...
        };
    });

    test('should open modal and set initial data', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openRefineSuggestionModal('preview1', parentId);
        });
        expect(result.current.isRefineModalOpen).toBe(true);
        expect(result.current.refineModalInitialData).toEqual({
            nodeId: 'preview1',
            parentNodeId: parentId,
            text: 'Preview Text',
            details: 'Preview Details',
        });
    });

    test('should not open modal if preview node not found', () => {
        const { result } = renderHook(() => useConceptMapAITools(false));
        act(() => {
            result.current.openRefineSuggestionModal('nonexistentPreview', parentId);
        });
        expect(result.current.isRefineModalOpen).toBe(false);
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Error", description: "Could not find the suggestion to refine." }));
    });
});

describe('handleRefineSuggestionConfirm', () => {
    const nodeIdToRefine = 'previewNode1';
    const refinementInstruction = "Make it better";
    const mockRefinedOutput: RefineNodeSuggestionOutput = {
        refinedText: "Refined Text",
        refinedDetails: "Refined Details",
    };

    beforeEach(() => {
        mockRefineNodeSuggestionFlow.mockClear();
        mockStore.updateConceptExpansionPreviewNode.mockClear();
        mockToast.mockClear();
        // Setup conceptExpansionPreview state
        mockStore.conceptExpansionPreview = {
            previewNodes: [{ id: nodeIdToRefine, text: 'Original Text', details: 'Original Details' }],
            parentNodeId: 'parent1',
            // other preview state properties...
        };
    });

    test('should call AI flow and update preview node on success', async () => {
        mockRefineNodeSuggestionFlow.mockResolvedValue(mockRefinedOutput);
        const { result } = renderHook(() => useConceptMapAITools(false));

        await act(async () => {
            await result.current.handleRefineSuggestionConfirm(nodeIdToRefine, refinementInstruction);
        });

        expect(mockRefineNodeSuggestionFlow).toHaveBeenCalledWith({
            originalText: 'Original Text',
            originalDetails: 'Original Details',
            refinementInstruction,
        });
        expect(mockStore.updateConceptExpansionPreviewNode).toHaveBeenCalledWith(
            nodeIdToRefine,
            mockRefinedOutput.refinedText,
            mockRefinedOutput.refinedDetails
        );
        expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Suggestion Refined!"}));
    });

    test('should show error if node to refine not found in preview', async () => {
        mockStore.conceptExpansionPreview = { previewNodes: [], parentNodeId: 'parent1' }; // Node not in preview
        const { result } = renderHook(() => useConceptMapAITools(false));
        await act(async () => {
            await result.current.handleRefineSuggestionConfirm(nodeIdToRefine, refinementInstruction);
        });
        expect(mockRefineNodeSuggestionFlow).not.toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith({ title: "Error", description: "Could not find the suggestion to refine.", variant: "destructive" });
    });
});
  // TODO: Add more tests for:
  // - And so on for all other AI tools and their related functions
});
