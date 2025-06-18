import type { ConceptMapNode, ConceptMapEdge } from '@/types'; // Assuming global types are in src/types/index.ts

// --- Dagre Related Types ---

/**
 * Represents a node to be processed by a Dagre layout algorithm.
 */
export interface DagreNodeInput {
  /** Unique identifier for the node. */
  id: string;
  /** Width of the node. */
  width: number;
  /** Height of the node. */
  height: number;
}

/**
 * Represents an edge connecting two nodes for Dagre layout.
 */
export interface DagreEdgeInput {
  /** Identifier of the source node of the edge. */
  source: string;
  /** Identifier of the target node of the edge. */
  target: string;
}

/**
 * Options for configuring a Dagre layout.
 */
export interface DagreLayoutOptions {
  /** Direction of the layout (e.g., 'TB' for Top-to-Bottom, 'LR' for Left-to-Right). */
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  /** Separation between ranks (layers) of nodes. */
  rankSep?: number;
  /** Separation between individual nodes within the same rank. */
  nodeSep?: number;
  /** Separation between edges. */
  edgeSep?: number;
}

/**
 * Input data for a Dagre layout operation, including nodes, edges, and layout options.
 */
export interface DagreLayoutInput {
  /** Array of nodes to be laid out. */
  nodes: DagreNodeInput[];
  /** Array of edges connecting the nodes. */
  edges: DagreEdgeInput[];
  /** Optional configuration for the layout algorithm. */
  options?: DagreLayoutOptions;
}

/**
 * Represents a node after being processed by a Dagre layout algorithm, including its calculated position.
 */
export interface DagreNodeOutput {
  /** Unique identifier for the node. */
  id: string;
  /** Calculated x-coordinate of the node's top-left corner. */
  x: number;
  /** Calculated y-coordinate of the node's top-left corner. */
  y: number;
}

/**
 * Output from a Dagre layout operation, primarily an array of nodes with their new positions.
 */
export interface DagreLayoutOutput {
  /** Array of nodes with their calculated positions. */
  nodes: DagreNodeOutput[];
}

/**
 * Defines the signature for a Dagre layout utility function.
 * This function takes graph elements (nodes, edges) and layout options as input,
 * and returns the nodes with their calculated positions.
 *
 * @param layoutInput - The input data for the layout, including nodes, edges, and options.
 * @returns An object containing the array of nodes with their new x and y coordinates.
 */
export type DagreLayoutUtility = (layoutInput: DagreLayoutInput) => DagreLayoutOutput;


// --- Graphology Related Types ---

/**
 * Placeholder for a Graphology instance type.
 * Graphology is a library for graph theory and manipulation.
 * For actual use, you would typically import `Graph` from 'graphology' and use that type.
 * Using `any` here serves as a placeholder to keep this type definition file
 * independent of a direct Graphology dependency, especially if the utility
 * implementing `GraphAdapterUtility` handles the Graphology import internally.
 * The actual instance would provide methods for graph traversal, manipulation, etc.
 */
export type GraphologyInstance = any;

/**
 * Defines a contract for a utility or adapter that performs graph operations,
 * often abstracting a specific graph library like Graphology.
 * This interface provides a standardized way to interact with graph data structures.
 */
export interface GraphAdapterUtility {
  /**
   * Creates a graph instance from arrays of nodes and edges.
   *
   * @param nodes - An array of `ConceptMapNode` objects representing the graph's nodes.
   * @param edges - An array of `ConceptMapEdge` objects representing the graph's edges.
   * @returns A `GraphologyInstance` (or a compatible graph representation) populated with the provided nodes and edges.
   */
  fromArrays: (nodes: ConceptMapNode[], edges: ConceptMapEdge[]) => GraphologyInstance;

  /**
   * Converts a graph instance back to arrays of nodes and edges.
   * This is useful for serialization or when needing to work with plain arrays again.
   *
   * @param graphInstance - The graph instance (e.g., `GraphologyInstance`) to convert.
   * @returns An object containing `nodes` (array of `ConceptMapNode`) and `edges` (array of `ConceptMapEdge`).
   */
  toArrays: (graphInstance: GraphologyInstance) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  /**
   * Retrieves all descendant node IDs for a given node ID.
   * Descendants are children, grandchildren, and so on.
   *
   * @param graphInstance - The graph instance to query.
   * @param nodeId - The ID of the node for which to find descendants.
   * @returns An array of strings, where each string is the ID of a descendant node.
   */
  getDescendants: (graphInstance: GraphologyInstance, nodeId: string) => string[];

  /**
   * Retrieves all ancestor node IDs for a given node ID.
   * Ancestors are parents, grandparents, and so on, up to the root(s) of the graph component.
   *
   * @param graphInstance - The graph instance to query.
   * @param nodeId - The ID of the node for which to find ancestors.
   * @returns An array of strings, where each string is the ID of an ancestor node.
   */
  getAncestors: (graphInstance: GraphologyInstance, nodeId: string) => string[];

  /**
   * Retrieves node IDs in the neighborhood of a given node.
   * The neighborhood can be defined by depth and direction (incoming, outgoing, or both).
   *
   * @param graphInstance - The graph instance to query.
   * @param nodeId - The ID of the central node of the neighborhood.
   * @param options - Optional parameters to define the neighborhood:
   *   `depth`: How many levels of connections to explore (e.g., 1 for direct neighbors).
   *   `direction`: 'in' for predecessors, 'out' for successors, 'both' for all neighbors.
   * @returns An array of strings, where each string is the ID of a node in the specified neighborhood.
   */
  getNeighborhood: (
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: { depth?: number; direction?: 'in' | 'out' | 'both' }
  ) => string[];

  /**
   * Extracts a subgraph containing only the specified node IDs and the edges between them.
   *
   * @param graphInstance - The main graph instance from which to extract the subgraph.
   * @param nodeIds - An array of node IDs to include in the subgraph.
   * @returns An object containing `nodes` and `edges` arrays that form the requested subgraph.
   */
  getSubgraphData: (
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ) => { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  // Future methods could be added here, e.g.:
  // hasCycle: (graphInstance: GraphologyInstance) => boolean;
  // getShortestPath: (graphInstance: GraphologyInstance, sourceNodeId: string, targetNodeId: string) => string[] | null;
}
