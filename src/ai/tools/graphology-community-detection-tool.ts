// src/ai/tools/graphology-community-detection-tool.ts
import { defineTool } from '@genkit-ai/core';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { z } from 'zod';
import { ConceptMapNode, ConceptMapEdge } from '../../types';

import { GraphAdapterUtility } from '../../lib/graphologyAdapter';
import { MapDataSchema } from '../flows/suggest-map-improvement';

export const CommunityDetectionInputSchema = MapDataSchema;
export type CommunityDetectionInput = z.infer<
  typeof CommunityDetectionInputSchema
>;

export const CommunityDetectionOutputSchema = z.object({
  communities: z.record(z.number()),
  error: z.string().optional(),
});

export const graphologyCommunityDetectionTool = defineTool(
  {
    name: 'graphologyCommunityDetector',
    description: 'Detects communities in a graph using the Louvain algorithm.',
    inputSchema: CommunityDetectionInputSchema,
    outputSchema: CommunityDetectionOutputSchema,
  },
  async (mapData: CommunityDetectionInput) => {
    try {
      const { nodes, edges } = mapData;

      if (!nodes || nodes.length === 0) {
        return { communities: {} };
      }

      const graphAdapter = new GraphAdapterUtility();
      const graphInstance: Graph = graphAdapter.fromArrays(
        nodes as ConceptMapNode[],
        edges as ConceptMapEdge[]
      );

      if (graphInstance.order === 0) {
        return { communities: {} };
      }

      // Louvain algorithm requires a graph with numeric weights.
      // If weights are not present, we can add a default weight of 1 to each edge.
      if (!graphInstance.edges().every((edge) => graphInstance.hasEdgeAttribute(edge, 'weight'))) {
        graphInstance.forEachEdge((edge) => {
          graphInstance.setEdgeAttribute(edge, 'weight', 1);
        });
      }

      const communities = louvain(graphInstance, {
        getEdgeWeight: 'weight',
        resolution: 1.0,
      });

      const communityMap: Record<string, number> = {};
      graphInstance.forEachNode((nodeId: string, attributes: any) => {
        communityMap[nodeId] = communities[nodeId];
      });

      return { communities: communityMap };
    } catch (e: any) {
      console.error('Error in graphologyCommunityDetectionTool:', e);
      return {
        communities: {},
        error: `Failed to detect communities: ${e.message}`,
      };
    }
  }
);
