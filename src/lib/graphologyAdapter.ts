import Graph, { MultiGraph, type Attributes } from 'graphology';
import { bfsFromNode } from 'graphology-traversal';
import { betweennessCentrality } from 'graphology-metrics/centrality/betweenness';
import louvain from 'graphology-communities-louvain';
import type {
  ConceptMapNode,
  ConceptMapEdge,
  GraphAdapter,
  GraphAdapterOptions,
  NeighborhoodOptions,
  GraphologyInstance
} from '../types';

export class GraphAdapterUtility implements GraphAdapter {
  fromArrays(
    nodes: ConceptMapNode[],
    edges: ConceptMapEdge[],
    options?: GraphAdapterOptions & { type?: 'graph' | 'multi', replaceEdges?: boolean } & Record<string, any>
  ): GraphologyInstance {
    const graph = options?.type === "multi"
                  ? new MultiGraph(options)
                  : new Graph(options);

    nodes.forEach(node => {
      const { id, ...attributes } = node;
      if (!graph.hasNode(id)) {
        graph.addNode(id, attributes);
      }
    });

    edges.forEach(edge => {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        const { id, source, target, ...attributes } = edge;

        if (graph.hasEdge(id)) {
            if (options?.replaceEdges) {
                graph.dropEdge(id);
                graph.addEdgeWithKey(id, source, target, attributes);
            }
        } else if (graph instanceof Graph && graph.hasEdge(source, target) && !options?.replaceEdges) {
            // In a simple Graph, if an edge (any key) between source & target exists, and we're not replacing.
            // console.warn(`Simple graph already has an edge between ${source} and ${target}. Skipping edge ${id}.`);
        } else {
            graph.addEdgeWithKey(id, source, target, attributes);
        }
      } else {
        console.warn(`Edge references a non-existent node. Source: ${edge.source}, Target: ${edge.target}, Edge ID: ${edge.id}`);
      }
    });
    return graph;
  }

  toArrays(graphInstance: GraphologyInstance): { nodes: ConceptMapNode[]; edges: ConceptMapEdge[] } {
    const nodes: ConceptMapNode[] = [];
    graphInstance.forEachNode((nodeId, attributes) => {
      nodes.push({
        id: nodeId,
        label: attributes.label || '',
        x: attributes.x || 0,
        y: attributes.y || 0,
        type: attributes.type || 'unknown',
        width: attributes.width || 150,
        height: attributes.height || 40,
        childIds: attributes.childIds || [],
        backgroundColor: attributes.backgroundColor,
        details: attributes.details,
        parentNode: attributes.parentNode,
        shape: attributes.shape || 'rectangle',
        data: attributes.data,
      });
    });

    const edges: ConceptMapEdge[] = [];
    graphInstance.forEachEdge((edgeId, attributes, source, target) => {
      edges.push({
        id: edgeId,
        source: source,
        target: target,
        label: attributes.label || '',
        type: attributes.type || 'custom',
        color: attributes.color,
        lineType: attributes.lineType || 'solid',
        markerStart: attributes.markerStart,
        markerEnd: attributes.markerEnd,
        data: attributes.data,
      });
    });
    return { nodes, edges };
  }

  getDescendants(graphInstance: GraphologyInstance, nodeId: string): string[] {
    const descendants = new Set<string>();
    if (!graphInstance.hasNode(nodeId)) {
      console.warn(`[GraphAdapter] Node ${nodeId} not found in graph for getDescendants.`);
      return [];
    }
    try {
      bfsFromNode(graphInstance, nodeId, (visitedNodeId) => {
        if (visitedNodeId !== nodeId) {
          descendants.add(visitedNodeId);
        }
      });
    } catch (e) {
        console.error(`[GraphAdapter] Error during BFS for descendants of ${nodeId}:`, (e as Error).message);
    }
    return Array.from(descendants);
  }

  getAncestors(graphInstance: GraphologyInstance, nodeId: string): string[] {
    const ancestors = new Set<string>();
    if (!graphInstance.hasNode(nodeId)) {
      console.warn(`[GraphAdapter] Node ${nodeId} not found in graph for getAncestors.`);
      return [];
    }

    const reversedGraph = graphInstance.copyEmpty({
      type: graphInstance.type === 'multi' ? 'MultiGraph' : 'Graph'
    }) as GraphologyInstance;

    graphInstance.forEachNode(n => reversedGraph.addNode(n, { ...graphInstance.getNodeAttributes(n) }));
    graphInstance.forEachEdge((key, attrs, source, target) => {
        if (reversedGraph.hasNode(target) && reversedGraph.hasNode(source)) {
            if (reversedGraph instanceof MultiGraph) {
                reversedGraph.addEdgeWithKey(key, target, source, { ...attrs });
            } else {
                 if (!reversedGraph.hasEdge(target,source)) { // Check before adding for simple graph
                    reversedGraph.addDirectedEdge(target, source, { ...attrs });
                 }
            }
        }
    });

    if (reversedGraph.hasNode(nodeId)) {
      try {
        bfsFromNode(reversedGraph, nodeId, (visitedNodeId) => {
          if (visitedNodeId !== nodeId) ancestors.add(visitedNodeId);
        });
      } catch (e) {
          console.error(`[GraphAdapter] Error during BFS for ancestors of ${nodeId} on reversed graph:`, (e as Error).message);
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
      console.warn(`[GraphAdapter] Node ${nodeId} not found in graph for getNeighborhood.`);
      return [];
    }

    const depth = options?.depth || 1;
    const direction = options?.direction || 'all';

    const neighborhood = new Set<string>();
    if (depth === 0) return [];

    const queue: Array<{ id: string; d: number }> = [{ id: nodeId, d: 0 }];
    const visitedInTraversal = new Set<string>([nodeId]);

    let head = 0;
    while(head < queue.length) {
        const current = queue[head++];

        if (current.id !== nodeId) {
             neighborhood.add(current.id);
        }

        if (current.d < depth) {
            let currentNeighbors: string[] = [];
            if (graphInstance.hasNode(current.id)) {
                if (graphInstance.type === 'directed' || graphInstance.type === 'multi') {
                    if (direction === 'in') {
                        currentNeighbors = graphInstance.inNeighbors(current.id);
                    } else if (direction === 'out') {
                        currentNeighbors = graphInstance.outNeighbors(current.id);
                    } else {
                        currentNeighbors = graphInstance.neighbors(current.id);
                    }
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
  ): { nodes: ConceptMapNode[]; edges: ConceptMapEdge[] } {
    const subGraph = graphInstance.copyEmpty({
        type: graphInstance.type === 'multi' ? 'MultiGraph' : 'Graph'
    }) as GraphologyInstance;
    const nodeIdSet = new Set(nodeIds);

    nodeIds.forEach(nodeId => {
      if (graphInstance.hasNode(nodeId)) {
        subGraph.addNode(nodeId, { ...graphInstance.getNodeAttributes(nodeId) });
      } else {
        console.warn(`[GraphAdapter] Node ${nodeId} for subgraph not found in main graph.`);
      }
    });

    graphInstance.forEachEdge((edgeKey, attributes, source, target) => {
      if (nodeIdSet.has(source) && nodeIdSet.has(target)) {
         if (subGraph.hasNode(source) && subGraph.hasNode(target)) {
            subGraph.addEdgeWithKey(edgeKey, source, target, { ...attributes });
         }
      }
    });
    return this.toArrays(subGraph);
  }

  getBetweennessCentrality(graphInstance: GraphologyInstance): Record<string, number> {
    if (!graphInstance || graphInstance.order === 0) {
      return {};
    }
    try {
      // Note: graphology's betweennessCentrality directly returns the map or object.
      // It might assign results to nodes if an attribute name is passed in options,
      // but here we want the direct result.
      const centrality = betweennessCentrality(graphInstance);
      return centrality; // This should be Record<string, number>
    } catch (e) {
      console.error("[GraphAdapter] Error calculating betweenness centrality:", (e as Error).message);
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
      // Louvain algorithm assigns community IDs as node attributes.
      // It also returns the number of communities found or a map.
      // We'll use the assignment and then extract it.
      louvain.assign(graphInstance, { attribute: communityAttribute });

      const communities: Record<string, number> = {};
      graphInstance.forEachNode((nodeId, attrs) => {
        if (attrs[communityAttribute] !== undefined) {
          communities[nodeId] = attrs[communityAttribute] as number;
        }
      });
      return communities;
    } catch (e) {
      console.error("[GraphAdapter] Error detecting communities with Louvain:", (e as Error).message);
      return {};
    }
  }
}
