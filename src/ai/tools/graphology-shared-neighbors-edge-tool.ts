// src/ai/tools/graphology-shared-neighbors-edge-tool.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import Graph from 'graphology'; // For type checking graphInstance if needed
import { z } from 'zod';

import { GraphAdapterUtility } from '../../lib/graphologyAdapter'; // Adjust path if needed based on project structure
import { MapDataSchema } from '../flows/suggest-map-improvement'; // Assuming this is the canonical MapDataSchema
import { ConceptMapEdge, ConceptMapNode } from '../../types';

export const SharedNeighborsEdgeInputSchema = MapDataSchema.extend({
  jaccardThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.3)
    .describe('Minimum Jaccard Index for suggesting an edge (0.0 to 1.0).'),
  maxCandidates: z
    .number()
    .int()
    .positive()
    .optional()
    .default(5)
    .describe(
      'Maximum number of candidate edges to return, sorted by Jaccard Index.'
    ),
});
export type SharedNeighborsEdgeInput = z.infer<
  typeof SharedNeighborsEdgeInputSchema
>;

export const CandidateEdgeSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  jaccardIndex: z.number(),
  sharedNeighborIds: z.array(z.string()),
});
export type CandidateEdge = z.infer<typeof CandidateEdgeSchema>;

export const SharedNeighborsEdgeOutputSchema = z.object({
  candidateEdges: z.array(CandidateEdgeSchema),
  error: z.string().optional(),
});

export const graphologySharedNeighborsEdgeTool = defineTool(
  {
    name: 'graphologySharedNeighborsEdgeDetector',
    description:
      'Detects potential edges between nodes based on shared neighbors using Jaccard Index.',
    inputSchema: SharedNeighborsEdgeInputSchema,
    outputSchema: SharedNeighborsEdgeOutputSchema,
  },
  async (input: SharedNeighborsEdgeInput) => {
    try {
      const { nodes, edges, jaccardThreshold, maxCandidates } = input;

      if (!nodes || nodes.length < 2) {
        return { candidateEdges: [] };
      }

      const graphAdapter = new GraphAdapterUtility();
      // Ensure fromArrays can handle potentially undefined or empty edges
      const graphInstance: Graph = graphAdapter.fromArrays(nodes as ConceptMapNode[], edges as ConceptMapEdge[] || []);

      if (graphInstance.order < 2) {
        // graphInstance.order is the number of nodes
        return { candidateEdges: [] };
      }

      const allNodeIds = graphInstance.nodes();
      const rawCandidateEdges: CandidateEdge[] = [];

      for (let i = 0; i < allNodeIds.length; i++) {
        for (let j = i + 1; j < allNodeIds.length; j++) {
          const nodeA_id = allNodeIds[i];
          const nodeB_id = allNodeIds[j];

          // Check if A and B are already connected.
          // graphInstance.areNeighbors(nodeA_id, nodeB_id) is for undirected graphs.
          // For potentially directed graphs from ConceptMapData, hasEdge might be more robust.
          if (
            graphInstance.hasEdge(nodeA_id, nodeB_id) ||
            graphInstance.hasEdge(nodeB_id, nodeA_id)
          ) {
            continue;
          }

          // graphInstance.neighbors() returns both in and out neighbors for directed, and all for undirected.
          const neighborsA = new Set(graphInstance.neighbors(nodeA_id));
          const neighborsB = new Set(graphInstance.neighbors(nodeB_id));

          const intersection = new Set(
            [...neighborsA].filter((id) => neighborsB.has(id))
          );
          const unionSize = new Set([...neighborsA, ...neighborsB]).size;

          // Avoid division by zero if unionSize is 0 (e.g., two isolated nodes with no neighbors)
          const jaccardIndex =
            unionSize > 0 ? intersection.size / unionSize : 0;

          if (jaccardIndex >= jaccardThreshold) {
            rawCandidateEdges.push({
              sourceNodeId: nodeA_id,
              targetNodeId: nodeB_id,
              jaccardIndex: jaccardIndex,
              sharedNeighborIds: Array.from(intersection).sort(), // Sort for consistency
            });
          }
        }
      }

      // Sort candidates by Jaccard Index in descending order
      rawCandidateEdges.sort((a, b) => b.jaccardIndex - a.jaccardIndex);

      // Slice to maxCandidates
      const topCandidates = rawCandidateEdges.slice(0, maxCandidates);

      return { candidateEdges: topCandidates };
    } catch (e: unknown) {
      console.error('Error in graphologySharedNeighborsEdgeTool:', e);
      return {
        candidateEdges: [],
        error: `Failed to detect shared neighbor edges: ${e instanceof Error ? e.message : 'Unknown error'}`,
      };
    }
  }
);
