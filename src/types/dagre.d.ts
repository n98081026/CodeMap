declare module 'dagre' {
  export namespace graphlib {
    class Graph {
      constructor(options?: {
        directed?: boolean;
        multigraph?: boolean;
        compound?: boolean;
      });
      setGraph(options: Record<string, unknown>): this;
      setDefaultEdgeLabel(callback: () => void): this;
      setNode(id: string, options: Record<string, unknown>): this;
      setEdge(v: string, w: string, options?: Record<string, unknown>): this;
      nodes(): string[];
      node(id: string): Record<string, unknown>;
      hasNode(id: string): boolean;
    }
  }
  export function layout(graph: graphlib.Graph): void;
}
