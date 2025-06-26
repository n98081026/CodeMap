import type { ConceptMapNode, ConceptMapEdge } from '@/types';
import type { Node as RFNode } from 'reactflow'; // Import RFNode for LayoutNodeInfo

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
export type DagreLayoutUtilityType = (layoutInput: DagreLayoutInput) => DagreLayoutOutput; // Renamed to avoid conflict

// --- Graphology Related Types ---

/**
 * Placeholder for a Graphology instance type.
 */
export type GraphologyInstance = {
  nodesMap: Map<string, ConceptMapNode>;
  edges: ConceptMapEdge[];
};

export interface GraphAdapterOptions {
  // isDirected?: boolean;
}

export interface NeighborhoodOptions {
  depth?: number;
  direction?: 'in' | 'out' | 'both';
}

/**
 * Defines a contract for a utility or adapter that performs graph operations.
 */
export interface GraphAdapter {
  fromArrays(
    nodes: ConceptMapNode[],
    edges: ConceptMapEdge[],
    options?: GraphAdapterOptions
  ): GraphologyInstance;

  toArrays(
    graphInstance: GraphologyInstance
  ): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };

  getDescendants(
    graphInstance: GraphologyInstance,
    nodeId: string
  ): string[];

  getAncestors(
    graphInstance: GraphologyInstance,
    nodeId: string
  ): string[];

  getNeighborhood(
    graphInstance: GraphologyInstance,
    nodeId: string,
    options?: NeighborhoodOptions
  ): string[];

  getSubgraphData(
    graphInstance: GraphologyInstance,
    nodeIds: string[]
  ): { nodes: ConceptMapNode[], edges: ConceptMapEdge[] };
}

// --- Types for Snapping Logic (Moved from flow-canvas-core.tsx) ---
export interface SnapLine {
  type: 'vertical' | 'horizontal';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface SnapResult {
  snappedPosition: { x: number; y: number };
  activeSnapLines: SnapLine[];
}

/**
 * Minimal node information required for layout and snapping utilities.
 */
export interface LayoutNodeInfo {
  id: string;
  positionAbsolute?: { x: number; y: number };
  x?: number;
  y?: number;
  width?: number | null;
  height?: number | null;
  // This is a bit of a compromise. Ideally, LayoutNodeInfo wouldn't know about CustomNodeData.
  // However, calculateSnappedPositionAndLines was typed with RFNode<CustomNodeData>.
  // To avoid a deep refactor of that function's internals or CustomNodeData itself right now,
  // we allow 'data' to be 'any'. A stricter approach would be to define exactly what
  // sub-properties of 'data' are needed by the snapping function if any.
  // For now, assuming the snapping function primarily uses position and dimensions.
  data?: any;
}

// Type for React Flow nodes that use LayoutNodeInfo for their data property.
export type RFLayoutNode = RFNode<LayoutNodeInfo>;

/**
 * Represents an update to a node's position, typically from a layout algorithm.
 */
export interface LayoutNodeUpdate {
    id: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
}
