import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { type TemporalState as ZundoTemporalState } from 'zundo'; // Correct import for TemporalState

// No mock for zustand here. It's now in setup.ts

import {
  useConceptMapStore,
  initialStateBase,
  type ConceptMapStoreTemporalState,
  StagedMapDataWithContext,
} from '../concept-map-store';

import type {
  ConceptMap,
  ConceptMapNode,
  ConceptMapEdge,
  ConceptMapData,
} from '@/types';
import { NodeType } from '@/types';

// Mocking uuid
vi.mock('uuid', () => ({
  v4: () => `mock-uuid-${Math.random().toString(16).slice(2)}`,
}));

// Mocking the external flow used in fetchProjectOverview
vi.mock('@/ai/flows/generate-project-overview', () => ({
  generateProjectOverview: vi.fn(),
}));
// We will get the mock instance dynamically inside the test

describe('useConceptMapStore', () => {
  // Vitest's `beforeEach` ensures this runs before every single `it` block.
  beforeEach(() => {
    // Reset the store to a clean state and clear history before each test
    act(() => {
      useConceptMapStore.getState().resetStore();
      useConceptMapStore.temporal.getState().clear();
    });
    // Clear any mocks to ensure tests are isolated
    vi.clearAllMocks();
  });

  // No afterEach needed as beforeEach handles all cleanup

  it('should have correct initial state', () => {
    const state = useConceptMapStore.getState();
    expect(state.mapName).toBe('Untitled Concept Map');
    expect(state.mapData.nodes).toEqual([]);
    expect(state.mapData.edges).toEqual([]);
    expect(state.ghostPreviewData).toBeNull();
    expect(state.stagedMapData).toBeNull();
    expect(state.isNewMapMode).toBe(true);
    // After reset, initialLoadComplete should be false as per resetStore action
    expect(state.initialLoadComplete).toBe(false);
  });

  describe('Initialization and Loading Actions', () => {
    it('initializeNewMap: should correctly initialize a new map', () => {
      const store = useConceptMapStore.getState();
      const userId = 'user-123';
      act(() => {
        store.initializeNewMap(userId);
      });
      const state = useConceptMapStore.getState();

      expect(state.mapId).toBe('new');
      expect(state.mapName).toBe('New Concept Map');
      expect(state.currentMapOwnerId).toBe(userId);
      expect(state.currentMapCreatedAt).toBeDefined();
      expect(state.mapData).toEqual({ nodes: [], edges: [] });
      expect(state.isNewMapMode).toBe(true);
      expect(state.isViewOnlyMode).toBe(false);
      expect(state.initialLoadComplete).toBe(true);
    });

    it('setLoadedMap: should load map data and set relevant states', () => {
      const store = useConceptMapStore.getState();
      const mapToLoad: ConceptMap = {
        id: 'map-1',
        name: 'Loaded Map',
        ownerId: 'owner-1',
        mapData: {
          nodes: [
            { id: 'n1', text: 'N1', type: 'default', x: 0, y: 0, childIds: [] },
          ],
          edges: [],
        },
        isPublic: true,
        sharedWithClassroomId: 'class-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      act(() => {
        store.setLoadedMap(mapToLoad, true); // Load as view-only
      });
      const state = useConceptMapStore.getState();

      expect(state.mapId).toBe('map-1');
      expect(state.mapName).toBe('Loaded Map');
      expect(state.currentMapOwnerId).toBe('owner-1');
      expect(state.mapData.nodes.length).toBe(1);
      expect(state.isNewMapMode).toBe(false);
      expect(state.isViewOnlyMode).toBe(true);
      expect(state.isPublic).toBe(true);
      expect(state.sharedWithClassroomId).toBe('class-1');
      expect(state.initialLoadComplete).toBe(true);
    });

    it('importMapData: should import map data and set new name', () => {
      const store = useConceptMapStore.getState();
      const dataToImport: ConceptMapData = {
        nodes: [
          {
            id: 'imported-n1',
            text: 'Imported N1',
            type: 'default',
            x: 0,
            y: 0,
            childIds: [],
          },
        ],
        edges: [],
      };
      act(() => {
        store.importMapData(dataToImport, 'MyImportedMap.json');
      });
      const state = useConceptMapStore.getState();

      expect(state.mapName).toBe('MyImportedMap');
      expect(state.mapData.nodes.length).toBe(1);
      expect(state.mapData.nodes[0].text).toBe('Imported N1');
      expect(state.isNewMapMode).toBe(true); // Remains new if mapId was 'new' or null
      expect(state.isViewOnlyMode).toBe(false);
    });

    it('resetStore: should reset the store to its initial base state', () => {
      const store = useConceptMapStore.getState();
      act(() => {
        store.setMapId('custom-id');
      });
      act(() => {
        store.resetStore();
      });
      const state = useConceptMapStore.getState();
      expect(state.mapId).toBe(initialStateBase.mapId);
      expect(state.mapName).toBe(initialStateBase.mapName);
      expect(state.initialLoadComplete).toBe(false);
    });
  });

  describe('Node Actions', () => {
    it('addNode: should add a new node to mapData.nodes', () => {
      const store = useConceptMapStore.getState();
      const initialNodeCount = store.mapData.nodes.length;
      const nodeOptions = {
        text: 'Test Node',
        type: 'default' as NodeType,
        position: { x: 10, y: 20 },
      };
      let newNodeId: string = '';
      act(() => {
        newNodeId = store.addNode(nodeOptions);
      });
      const updatedState = useConceptMapStore.getState().mapData;
      expect(updatedState.nodes.length).toBe(initialNodeCount + 1);
      const addedNode = updatedState.nodes.find((n) => n.id === newNodeId);
      expect(addedNode).toBeDefined();
      expect(addedNode?.text).toBe('Test Node');
    });

    it('addNode: should correctly link child to parentNode if parentNode ID is provided', () => {
      const store = useConceptMapStore.getState();
      let parentId: string = '';
      act(() => {
        parentId = store.addNode({
          text: 'Parent',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });

      let childId: string = '';
      act(() => {
        childId = store.addNode({
          text: 'Child',
          type: 'default' as NodeType,
          position: { x: 0, y: 50 },
          parentNode: parentId,
        });
      });

      const parentNode = useConceptMapStore
        .getState()
        .mapData.nodes.find((n) => n.id === parentId);
      expect(parentNode?.childIds).toContain(childId);
    });

    it('updateNode: should update specified properties of a node', () => {
      const store = useConceptMapStore.getState();
      let nodeId: string = '';
      act(() => {
        nodeId = store.addNode({
          text: 'Old Text',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });
      act(() => {
        store.updateNode(nodeId, {
          text: 'New Text',
          backgroundColor: '#FF0000',
        });
      });
      const updatedNode = useConceptMapStore
        .getState()
        .mapData.nodes.find((n) => n.id === nodeId);
      expect(updatedNode?.text).toBe('New Text');
      expect(updatedNode?.backgroundColor).toBe('#FF0000');
    });

    it('deleteNode: should remove a node and its connected edges', () => {
      const store = useConceptMapStore.getState();
      let node1Id = '',
        node2Id = '',
        edge1Id = '';
      act(() => {
        node1Id = store.addNode({
          text: 'Node 1',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        node2Id = store.addNode({
          text: 'Node 2',
          type: 'default' as NodeType,
          position: { x: 100, y: 0 },
        });
        edge1Id = store.addEdge({
          source: node1Id,
          target: node2Id,
          label: 'connects',
        });
      });

      act(() => {
        store.deleteNode(node1Id);
      });

      const finalNodes = useConceptMapStore.getState().mapData.nodes;
      const finalEdges = useConceptMapStore.getState().mapData.edges;
      expect(finalNodes.some((n) => n.id === node1Id)).toBe(false);
      expect(finalEdges.some((e) => e.id === edge1Id)).toBe(false);
    });

    it('deleteNode: should remove a node and its descendants and their connected edges', () => {
      const store = useConceptMapStore.getState();
      let parentId = '',
        child1Id = '',
        grandchildId = '',
        unrelatedNodeId = '';

      act(() => {
        parentId = store.addNode({
          text: 'Parent',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        child1Id = store.addNode({
          text: 'Child1',
          type: 'default' as NodeType,
          position: { x: 0, y: 50 },
          parentNode: parentId,
        });
        const child2Id = store.addNode({
          text: 'Child2',
          type: 'default' as NodeType,
          position: { x: 0, y: 100 },
          parentNode: parentId,
        });
        grandchildId = store.addNode({
          text: 'Grandchild',
          type: 'default' as NodeType,
          position: { x: 0, y: 150 },
          parentNode: child1Id,
        });
        unrelatedNodeId = store.addNode({
          text: 'Unrelated',
          type: 'default' as NodeType,
          position: { x: 200, y: 0 },
        });
        store.addEdge({ source: parentId, target: child1Id, label: 'pc1' });
        store.addEdge({
          source: child1Id,
          target: grandchildId,
          label: 'c1gc',
        });
        store.addEdge({
          source: child2Id,
          target: unrelatedNodeId,
          label: 'c2u',
        });
      });

      act(() => {
        store.deleteNode(parentId);
      });

      const state = useConceptMapStore.getState();
      expect(
        state.mapData.nodes.find((n) => n.id === parentId)
      ).toBeUndefined();
      expect(
        state.mapData.nodes.find((n) => n.id === child1Id)
      ).toBeUndefined();
      expect(
        state.mapData.nodes.find((n) => n.id === grandchildId)
      ).toBeUndefined();
      expect(
        state.mapData.nodes.find((n) => n.id === unrelatedNodeId)
      ).toBeDefined();
      expect(state.mapData.edges.length).toBe(1);
      expect(state.mapData.edges[0].label).toBe('c2u');
    });
  });

  describe('Edge Actions', () => {
    it('addEdge: should add a new edge to mapData.edges', () => {
      const store = useConceptMapStore.getState();
      let node1Id = '',
        node2Id = '';
      act(() => {
        node1Id = store.addNode({
          text: 'S',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        node2Id = store.addNode({
          text: 'T',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });

      const initialEdgeCount = store.mapData.edges.length;
      const edgeOptions = {
        source: node1Id,
        target: node2Id,
        label: 'links to',
      };
      let newEdgeId = '';
      act(() => {
        newEdgeId = store.addEdge(edgeOptions);
      });
      const updatedState = useConceptMapStore.getState().mapData;
      expect(updatedState.edges.length).toBe(initialEdgeCount + 1);
      const addedEdge = updatedState.edges.find((e) => e.id === newEdgeId);
      expect(addedEdge?.source).toBe(node1Id);
    });

    it('updateEdge: should update specified properties of an edge', () => {
      const store = useConceptMapStore.getState();
      let node1Id = '',
        node2Id = '',
        edgeId = '';
      act(() => {
        node1Id = store.addNode({
          text: 'S',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        node2Id = store.addNode({
          text: 'T',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        edgeId = store.addEdge({
          source: node1Id,
          target: node2Id,
          label: 'Old Label',
          color: 'blue',
        });
      });
      act(() => {
        store.updateEdge(edgeId, { label: 'New Label', lineType: 'dashed' });
      });
      const updatedEdge = useConceptMapStore
        .getState()
        .mapData.edges.find((e) => e.id === edgeId);
      expect(updatedEdge?.label).toBe('New Label');
      expect(updatedEdge?.lineType).toBe('dashed');
    });

    it('deleteEdge: should remove an edge', () => {
      const store = useConceptMapStore.getState();
      let node1Id = '',
        node2Id = '',
        edgeId = '';
      act(() => {
        node1Id = store.addNode({
          text: 'S',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        node2Id = store.addNode({
          text: 'T',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        edgeId = store.addEdge({ source: node1Id, target: node2Id });
      });
      expect(useConceptMapStore.getState().mapData.edges.length).toBe(1);
      act(() => {
        store.deleteEdge(edgeId);
      });
      expect(useConceptMapStore.getState().mapData.edges.length).toBe(0);
    });
  });

  describe('Staging Area Actions', () => {
    const sampleStagedNode: ConceptMapNode = {
      id: 'staged-n1',
      text: 'Staged Node 1',
      type: 'default' as NodeType,
      x: 50,
      y: 50,
      childIds: [],
    };
    const sampleStagedEdge: ConceptMapEdge = {
      id: 'staged-e1',
      source: 'staged-n1',
      target: 'some-other-node',
      label: 'staged-label',
    };

    it('setStagedMapData: should set stagedMapData and clear ghost data', () => {
      const store = useConceptMapStore.getState();
      act(() => {
        store.setGhostPreview([
          { id: 'g1', x: 0, y: 0, width: 100, height: 50 },
        ]); // Ensure ghost data is present
      });
      const stagedData: StagedMapDataWithContext = {
        nodes: [sampleStagedNode],
        edges: [sampleStagedEdge],
        actionType: 'quickCluster',
      };
      act(() => {
        store.setStagedMapData(stagedData);
      });
      const state = useConceptMapStore.getState();
      expect(state.stagedMapData).toEqual(stagedData);
      expect(state.isStagingActive).toBe(true);
      expect(state.ghostPreviewData).toBeNull(); // Verify ghost data is cleared
    });

    it('commitStagedMapData: default actionType should add all staged nodes and edges with new IDs', () => {
      const store = useConceptMapStore.getState();
      const stagedNode1: ConceptMapNode = {
        id: 'temp-n1',
        text: 'Staged N1',
        type: 'default' as NodeType,
        x: 0,
        y: 0,
        childIds: [],
      };
      const stagedNode2: ConceptMapNode = {
        id: 'temp-n2',
        text: 'Staged N2',
        type: 'default' as NodeType,
        x: 10,
        y: 10,
        childIds: [],
      };
      const stagedEdge1: ConceptMapEdge = {
        id: 'temp-e1',
        source: 'temp-n1',
        target: 'temp-n2',
        label: 'connects',
      };
      act(() => {
        store.setStagedMapData({
          nodes: [stagedNode1, stagedNode2],
          edges: [stagedEdge1],
        });
      });
      act(() => {
        store.commitStagedMapData();
      });
      const state = useConceptMapStore.getState();
      expect(state.mapData.nodes.length).toBe(2);
      expect(state.mapData.edges.length).toBe(1);
      expect(state.mapData.nodes[0].id).not.toBe('temp-n1');
      expect(state.mapData.edges[0].source).toBe(state.mapData.nodes[0].id);
      expect(state.stagedMapData).toBeNull();
    });

    it('deleteFromStagedMapData: should remove specified elements and their connected edges from staging', () => {
      const store = useConceptMapStore.getState();
      const nodeToKeep: ConceptMapNode = {
        id: 'keep-n1',
        text: 'Keep',
        type: 'default' as NodeType,
        x: 0,
        y: 0,
        childIds: [],
      };
      const nodeToRemove: ConceptMapNode = {
        id: 'remove-n1',
        text: 'Remove',
        type: 'default' as NodeType,
        x: 0,
        y: 0,
        childIds: [],
      };
      const edgeToKeep: ConceptMapEdge = {
        id: 'keep-e1',
        source: 'keep-n1',
        target: 'external',
        label: 'l1',
      };
      const edgeConnectedToRemoved: ConceptMapEdge = {
        id: 'remove-e1',
        source: 'remove-n1',
        target: 'keep-n1',
        label: 'l2',
      };
      const edgeDirectlyRemoved: ConceptMapEdge = {
        id: 'remove-e2',
        source: 'other',
        target: 'another',
        label: 'l3',
      };
      act(() => {
        store.setStagedMapData({
          nodes: [nodeToKeep, nodeToRemove],
          edges: [edgeToKeep, edgeConnectedToRemoved, edgeDirectlyRemoved],
          actionType: 'quickCluster',
        });
      });
      act(() => {
        store.deleteFromStagedMapData(['remove-n1', 'remove-e2']);
      });
      const state = useConceptMapStore.getState();
      expect(state.stagedMapData?.nodes.map((n) => n.id)).toEqual(['keep-n1']);
      expect(state.stagedMapData?.edges.map((e) => e.id)).toEqual(['keep-e1']);
    });

    it('commitStagedMapData: actionType intermediateNode should delete original edge and add new elements', () => {
      const store = useConceptMapStore.getState();
      let sourceId = '',
        targetId = '',
        originalEdgeId = '';
      act(() => {
        sourceId = store.addNode({
          text: 'Source',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        targetId = store.addNode({
          text: 'Target',
          type: 'default' as NodeType,
          position: { x: 100, y: 0 },
        });
        originalEdgeId = store.addEdge({
          source: sourceId,
          target: targetId,
          label: 'original',
        });
      });

      const intermediateNode: ConceptMapNode = {
        id: 'temp-inter',
        text: 'Intermediate',
        type: 'default' as NodeType,
        x: 50,
        y: 50,
        childIds: [],
      };
      const edgeToInter: ConceptMapEdge = {
        id: 'temp-e1',
        source: sourceId,
        target: intermediateNode.id,
        label: 'to inter',
      };
      const edgeFromInter: ConceptMapEdge = {
        id: 'temp-e2',
        source: intermediateNode.id,
        target: targetId,
        label: 'from inter',
      };
      act(() => {
        store.setStagedMapData({
          nodes: [intermediateNode],
          edges: [edgeToInter, edgeFromInter],
          actionType: 'intermediateNode',
          originalElementId: originalEdgeId,
        });
      });
      act(() => {
        store.commitStagedMapData();
      });
      const state = useConceptMapStore.getState();
      expect(
        state.mapData.edges.find((e) => e.id === originalEdgeId)
      ).toBeUndefined();
      const newIntermediateNode = state.mapData.nodes.find(
        (n) => n.text === 'Intermediate'
      );
      expect(newIntermediateNode).toBeDefined();
      expect(
        state.mapData.edges.some(
          (e) => e.source === sourceId && e.target === newIntermediateNode?.id
        )
      ).toBe(true);
    });

    it('commitStagedMapData: actionType aiTidyUpComplete should add parent and update children positions and parentNode', () => {
      const store = useConceptMapStore.getState();
      let child1Id = '',
        child2Id = '';
      act(() => {
        child1Id = store.addNode({
          text: 'Child 1',
          type: 'default' as NodeType,
          position: { x: 0, y: 100 },
        });
        child2Id = store.addNode({
          text: 'Child 2',
          type: 'default' as NodeType,
          position: { x: 50, y: 200 },
        });
      });
      const stagedParent: ConceptMapNode = {
        id: 'staged-parent-xyz',
        text: 'AI Group',
        type: 'ai-group-parent',
        x: 10,
        y: 10,
        width: 300,
        height: 250,
        childIds: [],
      };
      const stagedChild1Update: ConceptMapNode = {
        id: child1Id,
        text: 'Child 1',
        type: 'default' as NodeType,
        x: 20,
        y: 120,
        parentNode: stagedParent.id,
        childIds: [],
        width: 150,
        height: 70,
      };
      const stagedChild2Update: ConceptMapNode = {
        id: child2Id,
        text: 'Child 2',
        type: 'default' as NodeType,
        x: 20,
        y: 220,
        parentNode: stagedParent.id,
        childIds: [],
        width: 150,
        height: 70,
      };
      act(() => {
        store.setStagedMapData({
          nodes: [stagedParent, stagedChild1Update, stagedChild2Update],
          edges: [],
          actionType: 'aiTidyUpComplete',
          originalElementIds: [child1Id, child2Id],
        });
      });
      act(() => {
        store.commitStagedMapData();
      });
      const state = useConceptMapStore.getState();
      const newParentNode = state.mapData.nodes.find(
        (n) => n.text === 'AI Group'
      );
      expect(newParentNode).toBeDefined();
      expect(newParentNode?.type).toBe('ai-group-parent');
      const updatedChild1 = state.mapData.nodes.find((n) => n.id === child1Id);
      expect(updatedChild1?.x).toBe(20);
      expect(updatedChild1?.parentNode).toBe(newParentNode?.id);
      expect(newParentNode?.childIds).toContain(child1Id);
    });
  });

  describe('Ghost Preview Actions', () => {
    it('setGhostPreview: should set ghostPreviewData and clear staging data', () => {
      const store = useConceptMapStore.getState();
      const initialStagedData = {
        nodes: [
          {
            id: 's1',
            text: 'SN1',
            type: 'default' as NodeType,
            x: 0,
            y: 0,
            childIds: [],
          },
        ],
        edges: [],
      };
      act(() => {
        store.setStagedMapData(initialStagedData);
      });
      const nodesToPreview = [
        { id: 'n1', x: 100, y: 100, width: 150, height: 70 },
      ];
      act(() => {
        store.setGhostPreview(nodesToPreview);
      });
      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData?.nodes[0].id).toBe('n1');
      expect(state.stagedMapData).toBeNull();
    });

    it('acceptGhostPreview: should apply positions and clear ghostPreviewData', () => {
      const store = useConceptMapStore.getState();
      let nodeId = '';
      act(() => {
        nodeId = store.addNode({
          text: 'NodeToMove',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
        store.setGhostPreview([
          { id: nodeId, x: 200, y: 250, width: 150, height: 70 },
        ]);
      });
      act(() => {
        store.acceptGhostPreview();
      });
      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData).toBeNull();
      const movedNode = state.mapData.nodes.find((n) => n.id === nodeId);
      expect(movedNode?.x).toBe(200);
    });

    it('cancelGhostPreview: should clear ghostPreviewData without applying changes', () => {
      const store = useConceptMapStore.getState();
      let nodeId = '';
      act(() => {
        nodeId = store.addNode({
          text: 'NodeToNotMove',
          type: 'default' as NodeType,
          position: { x: 10, y: 10 },
        });
        store.setGhostPreview([
          { id: nodeId, x: 300, y: 350, width: 150, height: 70 },
        ]);
      });
      act(() => {
        store.cancelGhostPreview();
      });
      const state = useConceptMapStore.getState();
      expect(state.ghostPreviewData).toBeNull();
      const notMovedNode = state.mapData.nodes.find((n) => n.id === nodeId);
      expect(notMovedNode?.x).toBe(10);
    });
  });

  describe('Layout and View Actions', () => {
    it('applyLayout: should update node positions and trigger fitView', () => {
      const store = useConceptMapStore.getState();
      let n1 = '';
      act(() => {
        n1 = store.addNode({
          text: 'N1',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });
      const updates = [{ id: n1, x: 100, y: 110 }];
      act(() => {
        store.applyLayout(updates);
      });
      const state = useConceptMapStore.getState();
      expect(state.mapData.nodes.find((n) => n.id === n1)?.x).toBe(100);
      expect(state.triggerFitView).toBe(true);
    });

    it('toggleOverviewMode: should toggle isOverviewModeActive and clear selections', () => {
      const store = useConceptMapStore.getState();
      act(() => {
        store.setSelectedElement('node-1', 'node');
      });
      act(() => {
        store.toggleOverviewMode();
      });
      let state = useConceptMapStore.getState();
      expect(state.isOverviewModeActive).toBe(true);
      expect(state.selectedElementId).toBeNull();
      act(() => {
        store.toggleOverviewMode();
      });
      state = useConceptMapStore.getState();
      expect(state.isOverviewModeActive).toBe(false);
    });

    it('fetchProjectOverview: should set overview data on success', async () => {
      const mockOverview = {
        overallSummary: 'Summary',
        keyModules: [],
      };
      const { generateProjectOverview } = await import(
        '@/ai/flows/generate-project-overview'
      );
      vi.mocked(generateProjectOverview).mockResolvedValue(mockOverview);

      const store = useConceptMapStore.getState();
      await act(async () => {
        await store.fetchProjectOverview({
          projectStoragePath: 'path/to/project',
          userGoals: 'test goals',
        });
      });
      const state = useConceptMapStore.getState();
      expect(state.isFetchingOverview).toBe(false);
      expect(state.projectOverviewData).toEqual(mockOverview);
    });

    it('setFocusOnNodes: should set focusViewOnNodeIds, triggerFocusView and clear other previews', () => {
      const store = useConceptMapStore.getState();
      act(() => {
        store.setGhostPreview([{ id: 'g1', x: 0, y: 0 }]);
        store.setStagedMapData({ nodes: [], edges: [] });
      });
      const nodeIds = ['n1', 'n2'];
      act(() => {
        store.setFocusOnNodes(nodeIds, true);
      });
      const state = useConceptMapStore.getState();
      expect(state.focusViewOnNodeIds).toEqual(nodeIds);
      expect(state.triggerFocusView).toBe(true);
      expect(state.isOverviewModeActive).toBe(false);
      expect(state.ghostPreviewData).toBeNull();
      expect(state.stagedMapData).toBeNull();
    });
  });

  describe('Structural Suggestions Actions', () => {
    const suggestion1 = {
      id: '123e4567-e89b-12d3-a456-426614174000', // Mock UUID
      type: 'ADD_EDGE',
      status: 'pending' as const,
      reason: 'Reason 1',
      data: {
        sourceNodeId: 'node-1',
        targetNodeId: 'node-2',
        label: 'connects',
      },
    };
    it('addStructuralSuggestion: should add a suggestion', () => {
      // Need to add nodes for the edge to be valid, though the action itself doesn't check
      act(() => {
        useConceptMapStore.getState().addNode({
          id: 'node-1',
          text: 'Node 1',
          type: 'default',
          position: { x: 0, y: 0 },
        });
        useConceptMapStore.getState().addNode({
          id: 'node-2',
          text: 'Node 2',
          type: 'default',
          position: { x: 100, y: 0 },
        });
      });

      act(() => {
        useConceptMapStore.getState().addStructuralSuggestion(suggestion1 as any); // Using 'as any' because the input type in store is complex Zod
      });
      expect(
        useConceptMapStore.getState().structuralSuggestions
      ).toContainEqual(suggestion1);
    });
    it('applyFormGroupSuggestion: should create a parent node and update children', () => {
      const store = useConceptMapStore.getState();
      let childId1 = '';
      act(() => {
        childId1 = store.addNode({
          text: 'c1',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });
      let newGroupId = '';
      act(() => {
        newGroupId = store.applyFormGroupSuggestion([childId1], 'Test Group');
      });
      const state = useConceptMapStore.getState();
      const groupNode = state.mapData.nodes.find((n) => n.id === newGroupId);
      expect(groupNode?.text).toBe('Test Group');
      expect(
        state.mapData.nodes.find((n) => n.id === childId1)?.parentNode
      ).toBe(newGroupId);
    });
  });

  describe('Undo/Redo (Zundo Integration)', () => {
    it('should allow undoing addNode action', () => {
      const store = useConceptMapStore.getState();
      const temporalStore = useConceptMapStore.temporal;

      const initialNodeCount = store.mapData.nodes.length;

      act(() => {
        store.addNode({
          text: 'Node for Undo',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });
      expect(useConceptMapStore.getState().mapData.nodes.length).toBe(
        initialNodeCount + 1
      );

      act(() => {
        temporalStore.getState().undo();
      });
      expect(useConceptMapStore.getState().mapData.nodes.length).toBe(
        initialNodeCount
      );
    });

    it('should allow redoing addNode action after undo', () => {
      const store = useConceptMapStore.getState();
      const temporalStore = useConceptMapStore.temporal;
      const initialNodeCount = store.mapData.nodes.length;

      let nodeId = '';
      act(() => {
        nodeId = store.addNode({
          text: 'Node for Redo',
          type: 'default' as NodeType,
          position: { x: 0, y: 0 },
        });
      });
      expect(useConceptMapStore.getState().mapData.nodes.length).toBe(
        initialNodeCount + 1
      );

      act(() => {
        temporalStore.getState().undo();
      });
      expect(useConceptMapStore.getState().mapData.nodes.length).toBe(
        initialNodeCount
      );

      act(() => {
        temporalStore.getState().redo();
      });
      expect(useConceptMapStore.getState().mapData.nodes.length).toBe(
        initialNodeCount + 1
      );
      expect(
        useConceptMapStore.getState().mapData.nodes.find((n) => n.id === nodeId)
      ).toBeDefined();
    });
  });
});
