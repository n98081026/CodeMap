// src/ai/tools/graphology-inter-community-edge-tool.ts
import { defineTool } from '@genkit-ai/core';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { z } from 'zod';
import { ConceptMapNode, ConceptMapEdge } from '../../types';

import { GraphAdapterUtility } from '../../lib/graphologyAdapter';
import { MapDataSchema } from '../flows/suggest-map-improvement';

export const InterCommunityEdgeInputSchema = MapDataSchema;
export type InterCommunityEdgeInput = z.infer<
  typeof InterCommunityEdgeInputSchema
>;

export const CandidateLocationSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  sourceCommunityId: z.number(),
  targetCommunityId: z.number(),
});
export type CandidateLocation = z.infer<typeof CandidateLocationSchema>;

export const InterCommunityEdgeOutputSchema = z.object({
  candidateLocations: z.array(CandidateLocationSchema),
  error: z.string().optional(),
});

export const graphologyInterCommunityEdgeTool = defineTool(
  {
    name: 'graphologyInterCommunityEdgeFinder',
    description:
      'Identifies edges that connect different communities within a graph.',
    inputSchema: InterCommunityEdgeInputSchema,
    outputSchema: InterCommunityEdgeOutputSchema,
  },
  async (mapData: InterCommunityEdgeInput) => {
    try {
      const { nodes, edges } = mapData;

      if (!nodes || nodes.length < 2 || !edges || edges.length === 0) {
        return { candidateLocations: [] };
      }

      const graphAdapter = new GraphAdapterUtility();
      const graphInstance: Graph = graphAdapter.fromArrays(
        nodes as ConceptMapNode[],
        edges as ConceptMapEdge[]
      );

      if (graphInstance.order < 2) {
        return { candidateLocations: [] };
      }

      if (!graphInstance.edges().every((edge) => graphInstance.hasEdgeAttribute(edge, 'weight'))) {
        graphInstance.forEachEdge((edge) => {
          graphInstance.setEdgeAttribute(edge, 'weight', 1);
        });
      }

      const communities = louvain(graphInstance, { getEdgeWeight: 'weight' });
      const candidateLocations: CandidateLocation[] = [];

      graphInstance.forEachEdge(
        (
          edge,
          attributes,
          source,
          target,
          sourceAttributes,
          targetAttributes,
          undirected
        ) => {
          const sourceCommunity = communities[source];
          const targetCommunity = communities[target];

          if (sourceCommunity !== targetCommunity) {
            candidateLocations.push({
              sourceNodeId: source,
              targetNodeId: target,
              sourceCommunityId: sourceCommunity,
              targetCommunityId: targetCommunity,
            });
          }
        }
      );

      return { candidateLocations };
    } catch (e: any) {
      console.error('Error in graphologyInterCommunityEdgeTool:', e);
      return {
        candidateLocations: [],
        error: `Failed to find inter-community edges: ${e.message}`,
      };
    }
  }
);
