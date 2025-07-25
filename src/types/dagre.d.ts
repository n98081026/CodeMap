declare module 'dagre' {
  export namespace graphlib {
    class Graph {
      constructor(options?: {
        directed?: boolean;
        multigraph?: boolean;
        compound?: boolean;
      });
      setGraph(options: Record<string, any>): this;
      setDefaultEdgeLabel(callback: () => void): this;
      setNode(id: string, options: Record<string, any>): this;
      setEdge(v: string, w: string, options?: Record<string, any>): this;
      nodes(): string[];
      node(id: string): Record<string, any>;
      hasNode(id: string): boolean;
    }
  }
  export function layout(graph: graphlib.Graph): void;
}
