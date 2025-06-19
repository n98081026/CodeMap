import type { ConceptMapNode, ConceptMapEdge } from '@/types';

// --- Dagre Related Types ---
export interface NodeLayoutInput {
  id: string;
  width: number;
  height: number;
}

export interface EdgeLayoutInput {
  source: string;
  target: string;
}

export interface DagreLayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  ranksep?: number;
  nodesep?: number;
  edgesep?: number;
  marginx?: number;
  marginy?: number;
}

export interface NodePositionOutput {
  id: string;
  x: number; // Top-left x
  y: number; // Top-left y
}

// This defines the shape of a function/utility
export interface DagreLayoutUtility {
  (
    nodes: NodeLayoutInput[],
    edges: EdgeLayoutInput[],
    options?: DagreLayoutOptions
  ): Promise<NodePositionOutput[]>;
}


// --- Graphology Related Types ---

/**
 * Placeholder for a Graphology instance type.
 * For actual use, you would import `Graph` from 'graphology' and use `Graph`.
 * Using `any` here to keep this type definition file independent of a direct Graphology dependency
 * if the utility provider handles the Graphology import.
 */
export type GraphologyInstance = any;

export interface GraphAdapterOptions {
  // isDirected?: boolean; // Example: can be extended later
}

export interface NeighborhoodOptions {
  depth?: number;        // Default: 1
  direction?: 'in' | 'out' | 'both'; // Default: 'both'
}

/**
 * Defines the contract for a utility/adapter that performs Graphology operations.
 * The actual implementation of these functions would use the Graphology library.
 */
export interface GraphAdapter { // Renamed from GraphAdapterUtility
  /**
   * Creates a Graphology instance from arrays of nodes and edges.
   */
  fromArrays(
    nodes: ConceptMapNode[],
    edges: ConceptMapEdge[],
    options?: GraphAdapterOptions // Added options here
  ): GraphologyInstance;

  /**
   * Converts a Graphology instance back to React Flow compatible node and edge arrays.
   * (May not always be needed if utilities return specific processed data).
   */
  toArrays(
    graphInstance: GraphologyInstance
  ): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  /**
   * Gets all descendant IDs for a given node.
   */
  getDescendants(
    graphInstance: GraphologyInstance,
    nodeId: string
  ): string[];

  /**
   * Gets all ancestor IDs for a given node (e.g., path to root or all unique ancestors).
   */
  getAncestors(
    graphInstance: GraphologyInstance,
    nodeId: string
  ): string[];

  /**
   * Gets node IDs in the neighborhood of a given node, up to a certain depth.
   */
  getNeighborhood(
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: NeighborhoodOptions // Use defined type
  ): string[];

  /**
   * Extracts a subgraph containing specified node IDs and returns it as React Flow compatible arrays.
   */
  getSubgraphData(
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  // Future methods could be added here, e.g.:
  // hasCycle: (graphInstance: GraphologyInstance) => boolean;
  // getShortestPath: (graphInstance: GraphologyInstance, sourceNodeId: string, targetNodeId: string) => string[] | null;
}
