import { act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the store after mocks are set up
import { useConceptMapStore } from '../concept-map-store';
import type { ConceptMapNode, ConceptMapEdge, ConceptMap } from '@/types';
import { NodeType } from '@/types';

describe('useConceptMapStore', () => {
  beforeEach(() => {
    // Reset the store to a clean state before each test
    act(() => {
      useConceptMapStore.getState().resetStore();
    });
    vi.clearAllMocks();
  });

  it('should have correct initial state', () => {
    const state = useConceptMapStore.getState();
    expect(state.mapName).toBe('Untitled Concept Map');
    expect(state.mapData.nodes).toEqual([]);
    expect(state.mapData.edges).toEqual([]);
    expect(state.ghostPreviewData).toBeNull();
    expect(state.stagedMapData).toBeNull();
    expect(state.isNewMapMode).toBe(true);
    expect(state.initialLoadComplete).toBe(false);
  });

  describe('Initialization and Loading Actions', () => {
    it('should correctly initialize a new map', () => {
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

    it('should load map data and set relevant states', () => {
      const store = useConceptMapStore.getState();
      const mapToLoad: ConceptMap = {
        id: 'map-1',
        name: 'Loaded Map',
        ownerId: 'user-1',
        mapData: {
          nodes: [
            {
              id: 'node-1',
              type: 'default',
              position: { x: 100, y: 100 },
              data: { label: 'Test Node', details: '' },
            },
          ],
          edges: [],
        },
        isPublic: false,
        sharedWithClassroomId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      act(() => {
        store.setLoadedMap(mapToLoad, false);
      });

      const state = useConceptMapStore.getState();

      expect(state.mapId).toBe('map-1');
      expect(state.mapName).toBe('Loaded Map');
      expect(state.currentMapOwnerId).toBe('user-1');
      expect(state.mapData).toEqual(mapToLoad.mapData);
      expect(state.isNewMapMode).toBe(false);
      expect(state.isViewOnlyMode).toBe(false);
      expect(state.initialLoadComplete).toBe(true);
    });
  });

  describe('Node Operations', () => {
    it('should add a new node', () => {
      const store = useConceptMapStore.getState();
      const newNode: ConceptMapNode = {
        id: 'new-node',
        type: 'default',
        position: { x: 200, y: 200 },
        data: { label: 'New Node', details: 'Node details' },
      };

      act(() => {
        store.addNode(newNode);
      });

      const state = useConceptMapStore.getState();
      expect(state.mapData.nodes).toHaveLength(1);
      expect(state.mapData.nodes[0]).toEqual(newNode);
    });

    it('should update an existing node', () => {
      const store = useConceptMapStore.getState();
      const initialNode: ConceptMapNode = {
        id: 'node-1',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Initial Node', details: '' },
      };

      // Add initial node
      act(() => {
        store.addNode(initialNode);
      });

      // Update the node
      const updatedData = { label: 'Updated Node', details: 'Updated details' };
      act(() => {
        store.updateNode('node-1', updatedData);
      });

      const state = useConceptMapStore.getState();
      expect(state.mapData.nodes[0].data).toEqual(updatedData);
    });

    it('should delete a node', () => {
      const store = useConceptMapStore.getState();
      const nodeToDelete: ConceptMapNode = {
        id: 'node-to-delete',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Delete Me', details: '' },
      };

      // Add node
      act(() => {
        store.addNode(nodeToDelete);
      });

      expect(useConceptMapStore.getState().mapData.nodes).toHaveLength(1);

      // Delete node
      act(() => {
        store.deleteNode('node-to-delete');
      });

      const state = useConceptMapStore.getState();
      expect(state.mapData.nodes).toHaveLength(0);
    });
  });

  describe('Edge Operations', () => {
    it('should add a new edge', () => {
      const store = useConceptMapStore.getState();
      
      // Add nodes first
      const sourceNode: ConceptMapNode = {
        id: 'source',
        type: 'default',
        position: { x: 100, y: 100 },
        data: { label: 'Source', details: '' },
      };
      const targetNode: ConceptMapNode = {
        id: 'target',
        type: 'default',
        position: { x: 200, y: 200 },
        data: { label: 'Target', details: '' },
      };

      act(() => {
        store.addNode(sourceNode);
        store.addNode(targetNode);
      });

      const newEdge: ConceptMapEdge = {
        id: 'edge-1',
        source: 'source',
        target: 'target',
        label: 'connects to',
        type: 'default',
      };

      act(() => {
        store.addEdge(newEdge);
      });

      const state = useConceptMapStore.getState();
      expect(state.mapData.edges).toHaveLength(1);
      expect(state.mapData.edges[0]).toEqual(newEdge);
    });

    it('should delete an edge', () => {
      const store = useConceptMapStore.getState();
      
      const edge: ConceptMapEdge = {
        id: 'edge-to-delete',
        source: 'source',
        target: 'target',
        label: 'delete me',
        type: 'default',
      };

      // Add edge
      act(() => {
        store.addEdge(edge);
      });

      expect(useConceptMapStore.getState().mapData.edges).toHaveLength(1);

      // Delete edge
      act(() => {
        store.deleteEdge('edge-to-delete');
      });

      const state = useConceptMapStore.getState();
      expect(state.mapData.edges).toHaveLength(0);
    });
  });

  describe('Selection State', () => {
    it('should set and clear selected element', () => {
      const store = useConceptMapStore.getState();

      act(() => {
        store.setSelectedElementId('node-1');
      });

      expect(useConceptMapStore.getState().selectedElementId).toBe('node-1');

      act(() => {
        store.clearSelection();
      });

      expect(useConceptMapStore.getState().selectedElementId).toBeNull();
    });
  });

  describe('AI Features', () => {
    it('should set staged map data', () => {
      const store = useConceptMapStore.getState();
      const stagedData = {
        nodes: [
          {
            id: 'staged-node',
            type: 'default' as const,
            position: { x: 150, y: 150 },
            data: { label: 'Staged Node', details: '' },
          },
        ],
        edges: [],
        actionType: 'extractConcepts' as const,
      };

      act(() => {
        store.setStagedMapData(stagedData);
      });

      const state = useConceptMapStore.getState();
      expect(state.stagedMapData).toEqual(stagedData);
    });

    it('should clear staged map data', () => {
      const store = useConceptMapStore.getState();
      const stagedData = {
        nodes: [],
        edges: [],
        actionType: 'extractConcepts' as const,
      };

      // Set staged data first
      act(() => {
        store.setStagedMapData(stagedData);
      });

      expect(useConceptMapStore.getState().stagedMapData).toEqual(stagedData);

      // Clear staged data
      act(() => {
        store.clearStagedMapData();
      });

      expect(useConceptMapStore.getState().stagedMapData).toBeNull();
    });
  });
});