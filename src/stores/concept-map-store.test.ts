// src/stores/concept-map-store.test.ts
import useConceptMapStore, { initialStateBase } from './concept-map-store'; // Import initialStateBase
import type { ConceptMapNode, ConceptMapEdge } from '@/types';

// Helper to create a mock node
const mockNode = (id: string, x = 0, y = 0, parentId?: string, childIds: string[] = []): ConceptMapNode => ({
  id, text: `Node ${id}`, x, y, type: 'default', details: '',
  width: 150, height: 70, shape: 'rectangle', level: 0, // Assuming level is part of your ConceptMapNode
  backgroundColor: '', // Assuming this is part of your ConceptMapNode
  childIds: childIds || [],
  parentNode: parentId,
});

// Helper to create a mock edge
const mockEdge = (id: string, source: string, target: string): ConceptMapEdge => ({
  id, source, target, label: 'connects', type: 'default', // Assuming type is part of ConceptMapEdge
});

// Mock for the internal GraphAdapter's getDescendants function
// This is a simplified approach. In a real scenario, you'd use Jest's module mocking.
// However, since MockGraphAdapter is instantiated *inside* the store,
// we can't easily inject a mock for its methods from the outside without refactoring the store.
// For these tests, we will primarily test the parts of deleteNode that are independent
// of getDescendants' specific output, or we'll assume getDescendants returns []
// for tests where its specific output isn't the main focus.
// The 'conceptual test' for descendants will highlight this limitation.

let mockGetDescendantsReturn: string[] = [];
const actualGraphAdapter = useConceptMapStore.getState().__internalGraphAdapterForTesting;

if (actualGraphAdapter) {
    const originalGetDescendants = actualGraphAdapter.getDescendants;
    actualGraphAdapter.getDescendants = jest.fn((_, nodeId) => {
        // You can customize this mock per test if needed, or use a default like:
        // if (nodeId === 'parent-for-descendant-test') return ['child1', 'grandchild1'];
        return mockGetDescendantsReturn;
    }) as jest.Mock;
}


describe('useConceptMapStore - deleteNode action', () => {
  beforeEach(() => {
    // Reset store to a clean initial state for each test
    // Create a fresh initial state object to avoid shared state issues between tests
    const freshInitialState = {
      ...initialStateBase,
      mapData: { nodes: [], edges: [] },
      selectedElementId: null,
      selectedElementType: null,
      multiSelectedNodeIds: [],
      editingNodeId: null,
      aiProcessingNodeId: null,
      connectingNodeId: null,
      aiExtractedConcepts: [],
      aiSuggestedRelations: [],
      debugLogs: [],
      stagedMapData: null,
      isStagingActive: false,
      conceptExpansionPreview: null,
      isFetchingStructuralSuggestions: false,
      structuralSuggestions: null,
    };
    useConceptMapStore.setState(freshInitialState, true);
    mockGetDescendantsReturn = []; // Reset mock return value
  });

  it('should delete a single node with no children or parent', () => {
    const node1 = mockNode('1');
    useConceptMapStore.setState({ mapData: { nodes: [node1], edges: [] } });

    mockGetDescendantsReturn = []; // Explicitly set for this test

    useConceptMapStore.getState().deleteNode('1');

    const { nodes, edges } = useConceptMapStore.getState().mapData;
    expect(nodes).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('should delete a node and its connected edges', () => {
    const node1 = mockNode('1');
    const node2 = mockNode('2');
    const edge12 = mockEdge('e1', '1', '2');
    useConceptMapStore.setState({ mapData: { nodes: [node1, node2], edges: [edge12] } });
    mockGetDescendantsReturn = [];

    useConceptMapStore.getState().deleteNode('1');

    const { nodes, edges } = useConceptMapStore.getState().mapData;
    expect(nodes).toEqual([node2]); // Node 1 deleted
    expect(edges).toHaveLength(0); // Edge e12 deleted
  });

  it('should clear selection if the deleted node was selected', () => {
    const node1 = mockNode('1');
    useConceptMapStore.setState({
      mapData: { nodes: [node1], edges: [] },
      selectedElementId: '1',
      selectedElementType: 'node'
    });
    mockGetDescendantsReturn = [];

    useConceptMapStore.getState().deleteNode('1');

    expect(useConceptMapStore.getState().selectedElementId).toBeNull();
    expect(useConceptMapStore.getState().selectedElementType).toBeNull();
  });

  it('should delete a node and its descendants if MockGraphAdapter.getDescendants provides them', () => {
    const parent = mockNode('parent', 0, 0, undefined, ['child1']);
    const child1 = mockNode('child1', 0, 0, 'parent', ['grandchild1']);
    const grandchild1 = mockNode('grandchild1', 0, 0, 'child1');
    const otherNode = mockNode('other');

    const edgeParentChild = mockEdge('epc', 'parent', 'child1');
    const edgeChildGrandchild = mockEdge('ecg', 'child1', 'grandchild1');
    const edgeOther = mockEdge('eo', 'other', 'parent');

    useConceptMapStore.setState({
      mapData: {
        nodes: [parent, child1, grandchild1, otherNode],
        edges: [edgeParentChild, edgeChildGrandchild, edgeOther],
      }
    });

    // Configure the mock to return descendants for 'parent'
    // This relies on the __internalGraphAdapterForTesting being successfully mocked.
    if (actualGraphAdapter) {
      (actualGraphAdapter.getDescendants as jest.Mock).mockImplementation((_, nodeId) => {
        if (nodeId === 'parent') return ['child1', 'grandchild1'];
        return [];
      });
    }


    useConceptMapStore.getState().deleteNode('parent');
    const state = useConceptMapStore.getState();

    expect(state.mapData.nodes.find(n => n.id === 'parent')).toBeUndefined();
    expect(state.mapData.nodes.find(n => n.id === 'child1')).toBeUndefined();
    expect(state.mapData.nodes.find(n => n.id === 'grandchild1')).toBeUndefined();
    expect(state.mapData.nodes.find(n => n.id === 'other')).toBeDefined(); // otherNode should remain

    expect(state.mapData.edges.find(e => e.id === 'epc')).toBeUndefined();
    expect(state.mapData.edges.find(e => e.id === 'ecg')).toBeUndefined();
    expect(state.mapData.edges.find(e => e.id === 'eo')).toBeUndefined(); // Edge connected to 'other' and 'parent'
  });

  it('should update parentNode childIds when a direct child is deleted', () => {
    const p = mockNode('p', 0,0, undefined, ['c1', 'c2']);
    const c1 = mockNode('c1', 0,0, 'p');
    const c2 = mockNode('c2', 0,0, 'p');
    useConceptMapStore.setState({ mapData: { nodes: [p, c1, c2], edges: [] }});

    // Assuming c1 has no descendants for this specific test
    if (actualGraphAdapter) {
        (actualGraphAdapter.getDescendants as jest.Mock).mockImplementation((_, nodeId) => {
            if (nodeId === 'c1') return [];
            return [];
        });
    }

    useConceptMapStore.getState().deleteNode('c1');

    const parentNode = useConceptMapStore.getState().mapData.nodes.find(n => n.id === 'p');
    expect(parentNode?.childIds).toEqual(['c2']);
  });

});

// Note: The mocking of __internalGraphAdapterForTesting is a workaround.
// Ideally, dependencies like GraphAdapter should be injectable for easier testing.
// If these tests fail due to the mocking strategy not working as expected with Jest/Zustand internals,
// the tests for descendant deletion would need to be re-evaluated or the store refactored.
// For now, this attempts to test the store's internal logic as best as possible given the current structure.
