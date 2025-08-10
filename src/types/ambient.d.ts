// Ambient module declarations for packages without types
declare module 'graphology-operators' {
  // Minimal signatures to satisfy TS without pulling full types
  export function toDirected(graph: any, options?: { mergeEdge?: (edge: string, attrs: Record<string, any>) => any }): any;
  export function toUndirected(graph: any, options?: { mergeEdge?: (edge: string, attrs: Record<string, any>) => any }): any;
}

declare module 'graphology-traversal' {
  export function bfsFromNode(
    graph: any,
    nodeId: string,
    visitor: (nodeId: string) => void
  ): void;
}

declare module '@supabase/ssr';
