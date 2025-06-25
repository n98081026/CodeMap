// FORCE_OVERWRITE_TOKEN_1
import { describe, it, expect, beforeEach, vi } from 'vitest';
import useConceptMapStore, { initialStateBase } from './concept-map-store';
import type { ConceptMapNode, ConceptMapEdge, StagedMapDataWithContext } from '@/types';

// Helper to reset store state before each test
const resetStore = () => {
  useConceptMapStore.setState({ ...initialStateBase, mapData: { nodes: [], edges: [] }, ghostPreviewData: null, stagedMapData: null, debugLogs: [] }, true /* replace state */);
  const temporalStore = useConceptMapStore.temporal;
  if (temporalStore) {
    temporalStore.getState().clear();
  }
};

describe('useConceptMapStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('should have correct initial state', () => {
    const { mapName, mapData, ghostPreviewData, stagedMapData } = useConceptMapStore.getState();
    expect(mapName).toBe('Untitled Concept Map');
    expect(mapData.nodes).toEqual([]);
    expect(mapData.edges).toEqual([]);
    expect(ghostPreviewData).toBeNull();
    expect(stagedMapData).toBeNull();
  });

  describe('Node Actions', () => {
    it('addNode: should add a new node to mapData.nodes', () => {
      const { addNode, mapData } = useConceptMapStore.getState();
      const initialNodeCount = mapData.nodes.length;
      const nodeOptions = { text: 'Test Node', type: 'test-type', position: { x: 10, y: 20 } };

      const newNodeId = addNode(nodeOptions);

      const updatedState = useConceptMapStore.getState().mapData;
      expect(updatedState.nodes.length).toBe(initialNodeCount + 1);
      const addedNode = updatedState.nodes.find(n => n.id === newNodeId);
      expect(addedNode).toBeDefined();
      expect(addedNode?.text).toBe('Test Node');
      expect(addedNode?.type).toBe('test-type');
      expect(addedNode?.x).toBe(10);
      expect(addedNode?.y).toBe(20);
    });

    it('deleteNode: should remove a node and its connected edges', () => {
      const store = useConceptMapStore.getState();
      const node1Id = store.addNode({ text: 'Node 1', type: 't', position: { x: 0, y: 0 } });
      const node2Id = store.addNode({ text: 'Node 2', type: 't', position: { x: 100, y: 0 } });
      const edge1Id = store.addEdge({ source: node1Id, target: node2Id, label: 'connects' });

      expect(useConceptMapStore.getState().mapData.nodes.find(n => n.id === node1Id)).toBeDefined();
      expect(useConceptMapStore.getState().mapData.edges.find(e => e.id === edge1Id)).toBeDefined();

      store.deleteNode(node1Id);

      const finalNodes = useConceptMapStore.getState().mapData.nodes;
      const finalEdges = useConceptMapStore.getState().mapData.edges;

      const isNode1Present = finalNodes.some(n => n.id === node1Id);
      expect(isNode1Present).toBe(false);

      const isEdge1Present = finalEdges.some(e => e.id === edge1Id);
      expect(isEdge1Present).toBe(false);
    });
  });

  describe('Edge Actions', () => {
    it('addEdge: should add a new edge to mapData.edges', () => {
        const { addNode, addEdge, mapData } = useConceptMapStore.getState();
        const node1Id = addNode({ text: 'S', type: 's', position: {x:0,y:0}});
        const node2Id = addNode({ text: 'T', type: 't', position: {x:0,y:0}});
        const initialEdgeCount = mapData.edges.length;

        const edgeOptions = { source: node1Id, target: node2Id, label: 'links to' };
        const newEdgeId = addEdge(edgeOptions);

        const updatedState = useConceptMapStore.getState().mapData;
        expect(updatedState.edges.length).toBe(initialEdgeCount + 1);
        const addedEdge = updatedState.edges.find(e => e.id === newEdgeId);
        expect(addedEdge).toBeDefined();
        expect(addedEdge?.source).toBe(node1Id);
        expect(addedEdge?.target).toBe(node2Id);
        expect(addedEdge?.label).toBe('links to');
    });
    it('deleteEdge: should remove an edge', () => {
        const { addNode, addEdge, deleteEdge } = useConceptMapStore.getState();
        const node1Id = addNode({ text: 'S', type: 's', position: {x:0,y:0}});
        const node2Id = addNode({ text: 'T', type: 't', position: {x:0,y:0}});
        const edgeId = addEdge({ source: node1Id, target: node2Id });

        expect(useConceptMapStore.getState().mapData.edges.length).toBe(1);
        deleteEdge(edgeId);
        expect(useConceptMapStore.getState().mapData.edges.length).toBe(0);
    });
  });

  describe('Ghost Preview Actions', () => {
    it('setGhostPreview: should set ghostPreviewData and clear staging data', () => {
      const { setGhostPreview, setStagedMapData } = useConceptMapStore.getState();
      const initialStagedData: StagedMapDataWithContext = { nodes: [{id:'s1', text:'SN1', type:'st', x:0,y:0, childIds:[]}], edges:[]};
      setStagedMapData(initialStagedData);
      expect(useConceptMapStore.getState().stagedMapData).toEqual(initialStagedData);

      const nodesToPreview = [{ id: 'n1', x: 100, y: 100, width: 150, height: 70 }];
      setGhostPreview(nodesToPreview);

      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData).toBeDefined();
      expect(state.ghostPreviewData?.nodes.length).toBe(1);
      expect(state.ghostPreviewData?.nodes[0].id).toBe('n1');
      expect(state.ghostPreviewData?.nodes[0].width).toBe(150);
      expect(state.stagedMapData).toBeNull();
      expect(state.isStagingActive).toBe(false);
    });

    it('acceptGhostPreview: should apply positions and clear ghostPreviewData', () => {
      const { addNode, setGhostPreview, acceptGhostPreview } = useConceptMapStore.getState();
      const nodeId = addNode({ text: 'NodeToMove', type: 't', position: { x: 0, y: 0 } });

      setGhostPreview([{ id: nodeId, x: 200, y: 250, width:150, height:70 }]);
      expect(useConceptMapStore.getState().ghostPreviewData).not.toBeNull();

      acceptGhostPreview();

      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData).toBeNull();
      const movedNode = state.mapData.nodes.find(n => n.id === nodeId);
      expect(movedNode?.x).toBe(200);
      expect(movedNode?.y).toBe(250);
    });

    it('cancelGhostPreview: should clear ghostPreviewData without applying changes', () => {
      const { addNode, setGhostPreview, cancelGhostPreview } = useConceptMapStore.getState();
      const nodeId = addNode({ text: 'NodeToNotMove', type: 't', position: { x: 10, y: 10 } });

      setGhostPreview([{ id: nodeId, x: 300, y: 350, width:150, height:70 }]);
      expect(useConceptMapStore.getState().ghostPreviewData).not.toBeNull();

      cancelGhostPreview();

      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData).toBeNull();
      const notMovedNode = state.mapData.nodes.find(n => n.id === nodeId);
      expect(notMovedNode?.x).toBe(10);
      expect(notMovedNode?.y).toBe(10);
    });
  });

  describe('Staging Area Actions', () => {
    const sampleStagedNode: ConceptMapNode = { id: 'staged-n1', text: 'Staged Node 1', type: 'staged-type', x: 50, y: 50, childIds:[] };
    const sampleStagedEdge: ConceptMapEdge = { id: 'staged-e1', source: 'staged-n1', target: 'some-other-node', label: 'staged-label' };

    it('setStagedMapData: should set stagedMapData and clear ghost data', () => {
      const { setStagedMapData, setGhostPreview } = useConceptMapStore.getState();
      setGhostPreview([{id:'g1', x:0,y:0, width:100, height:50}]);
      expect(useConceptMapStore.getState().ghostPreviewData).not.toBeNull();

      const stagedData: StagedMapDataWithContext = {
        nodes: [sampleStagedNode],
        edges: [sampleStagedEdge],
        actionType: 'quickCluster',
      };
      setStagedMapData(stagedData);

      const state = useConceptMapStore.getState();
      expect(state.stagedMapData).toEqual(stagedData);
      expect(state.isStagingActive).toBe(true);
      expect(state.ghostPreviewData).toBeNull();
    });

    it('clearStagedMapData: should clear stagedMapData', () => {
      const { setStagedMapData, clearStagedMapData } = useConceptMapStore.getState();
      setStagedMapData({ nodes: [sampleStagedNode], edges: [], actionType: 'quickCluster' });
      expect(useConceptMapStore.getState().isStagingActive).toBe(true);

      clearStagedMapData();

      const state = useConceptMapStore.getState();
      expect(state.stagedMapData).toBeNull();
      expect(state.isStagingActive).toBe(false);
    });

    it('commitStagedMapData: actionType intermediateNode should delete original edge and add new elements', () => {
        const { addNode, addEdge, setStagedMapData, commitStagedMapData } = useConceptMapStore.getState();
        const sourceId = addNode({text: 'Source', type:'t', position:{x:0,y:0}});
        const targetId = addNode({text: 'Target', type:'t', position:{x:100,y:0}});
        const originalEdgeId = addEdge({source: sourceId, target: targetId, label: 'original'});

        const intermediateNode: ConceptMapNode = {id: 'temp-inter', text:'Intermediate', type:'inter', x:50,y:50, childIds:[]};
        const edgeToInter: ConceptMapEdge = {id: 'temp-e1', source: sourceId, target: intermediateNode.id, label: 'to inter'};
        const edgeFromInter: ConceptMapEdge = {id: 'temp-e2', source: intermediateNode.id, target: targetId, label: 'from inter'};

        setStagedMapData({
            nodes: [intermediateNode],
            edges: [edgeToInter, edgeFromInter],
            actionType: 'intermediateNode',
            originalElementId: originalEdgeId
        });
        commitStagedMapData();

        const state = useConceptMapStore.getState();
        expect(state.mapData.edges.find(e => e.id === originalEdgeId)).toBeUndefined();

        const newIntermediateNode = state.mapData.nodes.find(n => n.text === 'Intermediate');
        expect(newIntermediateNode).toBeDefined();

        expect(state.mapData.edges.some(e => e.label === 'to inter' && e.source === sourceId && e.target === newIntermediateNode?.id)).toBe(true);
        expect(state.mapData.edges.some(e => e.label === 'from inter' && e.source === newIntermediateNode?.id && e.target === targetId)).toBe(true);
        expect(state.stagedMapData).toBeNull();
    });

    it('commitStagedMapData: actionType aiTidyUpComplete should add parent and update children', () => {
        const { addNode, setStagedMapData, commitStagedMapData } = useConceptMapStore.getState();
        const child1Id = addNode({text: 'Child 1', type:'c', position:{x:0,y:100}});
        const child2Id = addNode({text: 'Child 2', type:'c', position:{x:0,y:200}});

        const stagedParent: ConceptMapNode = {id: 'staged-parent-123', text: 'New Parent', type:'parent', x:0,y:0, width:200, height:300, childIds:[]};
        const stagedChild1Update: ConceptMapNode = {id: child1Id, text:'Child 1', type:'c', x:10,y:110, parentNode: stagedParent.id, childIds:[], width: 150, height: 70};
        const stagedChild2Update: ConceptMapNode = {id: child2Id, text:'Child 2', type:'c', x:10,y:210, parentNode: stagedParent.id, childIds:[], width: 150, height: 70};

        setStagedMapData({
            nodes: [stagedParent, stagedChild1Update, stagedChild2Update],
            edges: [],
            actionType: 'aiTidyUpComplete',
            originalElementIds: [child1Id, child2Id]
        });

        commitStagedMapData();
        const state = useConceptMapStore.getState();

        const newParentNode = state.mapData.nodes.find(n => n.text === 'New Parent');
        expect(newParentNode).toBeDefined();

        const updatedChild1 = state.mapData.nodes.find(n => n.id === child1Id);
        expect(updatedChild1?.x).toBe(10);
        expect(updatedChild1?.y).toBe(110);
        expect(updatedChild1?.parentNode).toBe(newParentNode?.id);

        const updatedChild2 = state.mapData.nodes.find(n => n.id === child2Id);
        expect(updatedChild2?.x).toBe(10);
        expect(updatedChild2?.y).toBe(210);
        expect(updatedChild2?.parentNode).toBe(newParentNode?.id);

        expect(state.stagedMapData).toBeNull();
    });
  });
});

// Note: This is a basic setup. More complex scenarios, especially for `deleteNode` with deep hierarchies
// or `commitStagedMapData` with more action types, would require more tests.
// Mocking external dependencies like `GraphAdapterUtility` might be needed if its behavior is complex or has side effects.
// For `addNode`/`addEdge`, the current test relies on the fact that unique IDs are generated. If specific ID formats
// were critical, those would need to be asserted or mocked.
// The `resetStore` helper is basic; a more robust solution might involve Zustand's `act` for tests involving async updates,
// or fully re-creating the store for each test to ensure isolation, as recommended by Zustand.
// `useConceptMapStore.temporal?.getState().clear()` might be needed in `beforeEach` if undo/redo history affects tests.
// The types `ConceptMapNode`, `ConceptMapEdge`, `StagedMapDataWithContext` are assumed to be correctly imported from `@/types` or similar.
// If `initialStateBase` is not exported, tests would need to use `useConceptMapStore.getState()` and manually reset fields.
// The current `resetStore` uses `initialStateBase` which is fine if it captures the true default state.
// Ensure `initialStateBase` is exported from `concept-map-store.ts` or provide a way to get the actual initial state for reset.
// For `setGhostPreview` test, the `width` and `height` capture from original node depends on the original node existing.
// The test for `setGhostPreview` currently adds a node then sets its preview, which is fine.
// The `deleteNode` test correctly checks for connected edge removal. More complex graph logic (deep deletion) is noted as a TODO.




