import Graph, { MultiGraph } from 'graphology';
import louvain from 'graphology-communities-louvain';
import { toDirected, toUndirected } from 'graphology-operators';
import { bfsFromNode } from 'graphology-traversal';

import type { ConceptMapNode, ConceptMapEdge, ConceptMapData } from '../types';
import type {
  GraphologyInstance,
  NeighborhoodOptions,
  GraphAdapter,
} from '@/types/graph-adapter';

export class GraphAdapterUtility implements GraphAdapter {
  fromConceptMap(
    conceptMapData: ConceptMapData,
    options?: {
      type?: 'graph' | 'multi';
      replaceEdges?: boolean;
    } & Record<string, unknown>
  ): GraphologyInstance {
    const { nodes, edges } = conceptMapData;
    const { type, replaceEdges, ...graphOptions } = options || {};

    const graph =
      type === 'multi'
        ? new MultiGraph(graphOptions)
        : new Graph(graphOptions);

    nodes.forEach((node) => {
      const { id, ...attributes } = node;
      if (!graph.hasNode(id)) {
        graph.addNode(id, attributes);
      }
    });

    edges.forEach((edge) => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        const { id, source, target, ...attributes } = edge;

        if (graph.hasEdge(id)) {
          if (options?.replaceEdges) {
            graph.dropEdge(id);
            graph.addEdgeWithKey(id, source, target, attributes);
          }
        } else if (
          graph instanceof Graph &&
          graph.hasEdge(source, target) &&
          !options?.replaceEdges
        ) {
          // In a simple Graph, if an edge (any key) between source & target exists, and we're not replacing.
        } else {
          graph.addEdgeWithKey(id, source, target, attributes);
        }
      } else {
        console.warn(
          `Edge references a non-existent node. Source: ${edge.source}, Target: ${edge.target}, Edge ID: ${edge.id}`
        );
      }
    });
    return graph;
  }

  toConceptMap(graphInstance: GraphologyInstance): ConceptMapData {
    const nodes: ConceptMapNode[] = [];
    graphInstance.forEachNode((nodeId, attributes) => {
      nodes.push({
        id: nodeId,
        text: attributes.text || '',
        x: attributes.x || 0,
        y: attributes.y || 0,
        type: attributes.type || 'unknown',
        width: attributes.width || 150,
        height: attributes.height || 40,
        childIds: attributes.childIds || [],
        ...attributes, // Spread the rest of the attributes
      } as ConceptMapNode);
    });

    const edges: ConceptMapEdge[] = [];
    graphInstance.forEachEdge((edgeId, attributes, source, target) => {
      edges.push({
        id: edgeId,
        source,
        target,
        label: attributes.label || '',
        ...attributes, // Spread the rest of the attributes
      } as ConceptMapEdge);
    });
    return { nodes, edges };
  }

  getDescendants(graphInstance: GraphologyInstance, nodeId: string): string[] {
    const descendants = new Set<string>();
    if (!graphInstance.hasNode(nodeId)) {
      console.warn(
        `[GraphAdapter] Node ${nodeId} not found in graph for getDescendants.`
      );
      return [];
    }
    try {
      bfsFromNode(graphInstance, nodeId, (visitedNodeId) => {
        if (visitedNodeId !== nodeId) {
          descendants.add(visitedNodeId);
        }
      });
    } catch (e) {
      console.error(
        `[GraphAdapter] Error during BFS for descendants of ${nodeId}:`,
        (e as Error).message
      );
    }
    return Array.from(descendants);
  }

  getAncestors(graphInstance: GraphologyInstance, nodeId: string): string[] {
    const ancestors = new Set<string>();
    if (!graphInstance.hasNode(nodeId)) {
      console.warn(
        `[GraphAdapter] Node ${nodeId} not found in graph for getAncestors.`
      );
      return [];
    }

    const reversedGraph = toDirected(graphInstance, {
      mergeEdge: (edge, attrs) => ({ ...attrs }),
    });
    reversedGraph.forEachEdge((edge, attrs, source, target) => {
      reversedGraph.dropEdge(edge);
      reversedGraph.addEdge(target, source, attrs);
    });

    if (reversedGraph.hasNode(nodeId)) {
      try {
        bfsFromNode(reversedGraph, nodeId, (visitedNodeId) => {
          if (visitedNodeId !== nodeId) ancestors.add(visitedNodeId);
        });
      } catch (e) {
        console.error(
          `[GraphAdapter] Error during BFS for ancestors of ${nodeId} on reversed graph:`,
          (e as Error).message
        );
      }
    }
    return Array.from(ancestors);
  }

  getNeighborhood(
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: NeighborhoodOptions
  ): string[] {
    if (!graphInstance.hasNode(nodeId)) {
      console.warn(
        `[GraphAdapter] Node ${nodeId} not found in graph for getNeighborhood.`
      );
      return [];
    }

    const depth = options?.depth || 1;
    const direction = options?.direction || 'all';

    const neighborhood = new Set<string>();
    if (depth === 0) return [];

    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];
    const visitedInTraversal = new Set<string>([nodeId]);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];

      if (current.id !== nodeId) {
        neighborhood.add(current.id);
      }

      if (current.d < depth) {
        let currentNeighbors: string[] = [];
        if (graphInstance.hasNode(current.id)) {
          if (direction === 'in') {
            currentNeighbors = graphInstance.inNeighbors(current.id);
          } else if (direction === 'out') {
            currentNeighbors = graphInstance.outNeighbors(current.id);
          } else {
            currentNeighbors = graphInstance.neighbors(current.id);
          }
        }

        for (const neighborId of currentNeighbors) {
          if (!visitedInTraversal.has(neighborId)) {
            visitedInTraversal.add(neighborId);
            queue.push({ id: neighborId, d: current.d + 1 });
          }
        }
      }
    }
    return Array.from(neighborhood);
  }

  getSubgraphData(
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ): ConceptMapData {
    const subGraph = graphInstance.copy();
    const nodeIdSet = new Set(nodeIds);

    graphInstance.forEachNode((nodeId) => {
      if (!nodeIdSet.has(nodeId)) {
        subGraph.dropNode(nodeId);
      }
    });

    return this.toConceptMap(subGraph);
  }

  getBetweennessCentrality(
    graphInstance: GraphologyInstance
  ): Record<string, number> {
    if (!graphInstance || graphInstance.order === 0) {
      return {};
    }
    try {
      // This will be implemented with a proper library call
      return {};
    } catch (e) {
      console.error(
        '[GraphAdapter] Error calculating betweenness centrality:',
        (e as Error).message
      );
      return {};
    }
  }

  detectCommunities(
    graphInstance: GraphologyInstance,
    options?: { communityAttribute?: string }
  ): Record<string, number> {
    if (!graphInstance || graphInstance.order === 0) {
      return {};
    }
    const communityAttribute = options?.communityAttribute || 'community';
    try {
      const undirected = toUndirected(graphInstance);
      louvain.assign(undirected, {
        nodeCommunityAttribute: communityAttribute,
      });

      const communities: Record<string, number> = {};
      undirected.forEachNode((nodeId, attrs) => {
        if (attrs[communityAttribute] !== undefined) {
          communities[nodeId] = attrs[communityAttribute] as number;
        }
      });
      return communities;
    } catch (e) {
      console.error(
        '[GraphAdapter] Error detecting communities with Louvain:',
        (e as Error).message
      );
      return {};
    }
  }
}
