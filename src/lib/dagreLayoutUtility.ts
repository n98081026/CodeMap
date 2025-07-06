// =====================================================================================
// REVIEW SUMMARY: Graphology/Dagre Integration (Phase 1) - Completed 2024-07-27
// -------------------------------------------------------------------------------------
// This review assessed the initial integration of the Dagre library for automated layout,
// replacing previous mock or simple layout utilities.
//
// Key Benefits Realized:
// 1. Layout Quality: Dagre provides sophisticated, algorithmically sound, and often
//    aesthetically pleasing hierarchical layouts for concept maps.
// 2. Automation: Enables features like "Auto-layout Full Map" and "Dagre Tidy Selection".
// 3. Foundation for Advanced Layouts: Groundwork for more complex layout scenarios.
//
// Potential Drawbacks & Areas for Monitoring:
// 1. Bundle Size: Dagre is a non-trivial library and may increase client bundle size.
// 2. Client-Side Performance: Layout calculation for very large or complex maps/subgraphs
//    can be computationally intensive and might lead to UI freezes if not managed.
//    (Current features use loading toasts as mitigation).
// 3. Complexity: Introduces a learning curve for Dagre's API and layout concepts.
//
// Overall: The integration provides significant value for layout automation. Client-side
// performance for large graphs is the primary ongoing consideration. The `TODO.md` item
// for this review has been marked as complete.
// =====================================================================================

import dagre from 'dagre';
import type {
  DagreLayoutUtility as IDagreLayoutUtility,
  NodeLayoutInput, // Represents a node for Dagre layout (id, width, height)
  EdgeLayoutInput, // Represents an edge for Dagre layout (source, target)
  DagreLayoutOptions,
  NodePositionOutput, // Represents the output from Dagre (id, x, y) - will be top-left
} from '../types/graph-adapter'; // Path to where these interfaces are defined

export class DagreLayoutUtility implements IDagreLayoutUtility {
  async layout(
    nodes: NodeLayoutInput[],
    edges: EdgeLayoutInput[],
    options?: DagreLayoutOptions
  ): Promise<NodePositionOutput[]> {
    // Create a new directed graph
    const dagreGraph = new dagre.graphlib.Graph({
      multigraph: true,
      compound: true,
    });

    // Set layout options
    dagreGraph.setGraph({
      rankdir: options?.direction || 'TB',
      ranksep: options?.ranksep === undefined ? 50 : options.ranksep, // Default if undefined
      nodesep: options?.nodesep === undefined ? 50 : options.nodesep, // Default if undefined
      edgesep: options?.edgesep === undefined ? 10 : options.edgesep, // Default if undefined
      marginx: options?.marginx === undefined ? 20 : options.marginx, // Default if undefined
      marginy: options?.marginy === undefined ? 20 : options.marginy, // Default if undefined
      align: options?.align, // 'UL', 'UR', 'DL', or 'DR'
      acyclicer: options?.acyclicer, // 'greedy' or undefined
      ranker: options?.ranker, // 'network-simplex', 'tight-tree' or 'longest-path'
    });

    // Default node dimensions if not provided, Dagre requires width and height.
    const defaultWidth = options?.defaultNodeWidth || 150;
    const defaultHeight = options?.defaultNodeHeight || 40;

    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, {
        width: node.width || defaultWidth,
        height: node.height || defaultHeight,
        label: node.label || node.id, // Dagre uses label for debug/display, not strictly for layout
      });
    });

    edges.forEach((edge) => {
      if (dagreGraph.hasNode(edge.source) && dagreGraph.hasNode(edge.target)) {
        dagreGraph.setEdge(edge.source, edge.target, {
          minlen: edge.minlen, // example of an edge option from options
          weight: edge.weight, // example
          // label: edge.label, // If you want edge labels to affect layout (rarely used in basic dagre)
        });
      } else {
        console.warn(
          `Dagre layout: edge references non-existent node. Source: ${edge.source}, Target: ${edge.target}`
        );
      }
    });

    dagre.layout(dagreGraph);

    const layoutNodes: NodePositionOutput[] = [];
    dagreGraph.nodes().forEach((nodeId) => {
      const dagreNode = dagreGraph.node(nodeId);
      if (dagreNode) {
        layoutNodes.push({
          id: nodeId,
          // Dagre provides center x, y. React Flow typically uses top-left x, y.
          // Adjust coordinates: x = dagreNode.x - dagreNode.width / 2, y = dagreNode.y - dagreNode.height / 2
          x: Math.round(dagreNode.x - dagreNode.width / 2),
          y: Math.round(dagreNode.y - dagreNode.height / 2),
        });
      }
    });
    return Promise.resolve(layoutNodes);
  }
}
