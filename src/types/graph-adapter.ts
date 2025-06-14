import type { ConceptMapNode, ConceptMapEdge } from '@/types'; // Assuming global types are in src/types/index.ts

// --- Dagre Related Types ---
export interface DagreNodeInput {
  id: string;
  width: number;
  height: number;
}

export interface DagreEdgeInput {
  source: string;
  target: string;
}

export interface DagreLayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  rankSep?: number;
  nodeSep?: number;
  edgeSep?: number;
}

export interface DagreLayoutInput {
  nodes: DagreNodeInput[];
  edges: DagreEdgeInput[];
  options?: DagreLayoutOptions;
}

export interface DagreNodeOutput {
  id: string;
  x: number;
  y: number;
}

export interface DagreLayoutOutput {
  nodes: DagreNodeOutput[];
}

/**
 * Conceptual type for a Dagre layout utility function.
 */
export type DagreLayoutUtility = (layoutInput: DagreLayoutInput) => DagreLayoutOutput;


// --- Graphology Related Types ---

/**
 * Placeholder for a Graphology instance type.
 * For actual use, you would import `Graph` from 'graphology' and use `Graph`.
 * Using `any` here to keep this type definition file independent of a direct Graphology dependency
 * if the utility provider handles the Graphology import.
 */
export type GraphologyInstance = any;

/**
 * Defines the contract for a utility/adapter that performs Graphology operations.
 * The actual implementation of these functions would use the Graphology library.
 */
export interface GraphAdapterUtility {
  /**
   * Creates a Graphology instance from arrays of nodes and edges.
   */
  fromArrays: (nodes: ConceptMapNode[], edges: ConceptMapEdge[]) => GraphologyInstance;

  /**
   * Converts a Graphology instance back to React Flow compatible node and edge arrays.
   * (May not always be needed if utilities return specific processed data).
   */
  toArrays: (graphInstance: GraphologyInstance) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  /**
   * Gets all descendant IDs for a given node.
   */
  getDescendants: (graphInstance: GraphologyInstance, nodeId: string) => string[];

  /**
   * Gets all ancestor IDs for a given node (e.g., path to root or all unique ancestors).
   */
  getAncestors: (graphInstance: GraphologyInstance, nodeId: string) => string[];

  /**
   * Gets node IDs in the neighborhood of a given node, up to a certain depth.
   */
  getNeighborhood: (
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: { depth?: number; direction?: 'in' | 'out' | 'both' }
  ) => string[];

  /**
   * Extracts a subgraph containing specified node IDs and returns it as React Flow compatible arrays.
   */
  getSubgraphData: (
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  // Future methods could be added here, e.g.:
  // hasCycle: (graphInstance: GraphologyInstance) => boolean;
  // getShortestPath: (graphInstance: GraphologyInstance, sourceNodeId: string, targetNodeId: string) => string[] | null;
}
