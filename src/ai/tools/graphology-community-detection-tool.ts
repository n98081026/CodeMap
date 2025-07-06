// src/ai/tools/graphology-community-detection-tool.ts
import { defineTool } from '@genkit-ai/tool';
import louvain from 'graphology-communities-louvain';
import { z } from 'zod';

import { GraphAdapterUtility } from '../../lib/graphologyAdapter';
// MapDataSchema is defined in suggest-map-improvement.ts and suggest-node-group-candidates.ts
// Using the one from suggest-map-improvement as the canonical source for this tool.
import { MapDataSchema } from '../flows/suggest-map-improvement';
// Graph is a default export from 'graphology'
// Not strictly needed if graphInstance.order check is sufficient and fromArrays handles empty nodes.

export const CommunityDetectionInputSchema = MapDataSchema;

export const CommunitySchema = z.object({
  nodeIds: z.array(z.string()),
  // Future: could add communitySize: z.number(), modularityContribution: z.number()
});

export const CommunityDetectionOutputSchema = z.object({
  detectedCommunities: z.array(CommunitySchema),
  error: z.string().optional(),
});

export const graphologyCommunityDetectionTool = defineTool(
  {
    name: 'graphologyCommunityDetector',
    description:
      'Detects communities (clusters) of nodes in a concept map using the Louvain algorithm. Returns communities with 2 to 5 nodes.',
    inputSchema: CommunityDetectionInputSchema,
    outputSchema: CommunityDetectionOutputSchema,
  },
  async (mapData) => {
    try {
      // Louvain generally works better with more nodes and edges.
      // Handle cases with very few nodes directly.
      if (!mapData.nodes || mapData.nodes.length < 2) {
        return { detectedCommunities: [] };
      }

      const graphAdapter = new GraphAdapterUtility();
      // Ensure that fromArrays can handle empty edges array if mapData.edges is undefined
      const graphInstance = graphAdapter.fromArrays(
        mapData.nodes,
        mapData.edges || []
      );

      if (graphInstance.order < 2) {
        // Graph order is number of nodes
        console.warn(
          `[CommunityDetector] Graph has ${graphInstance.order} nodes. Louvain typically requires more structure.`
        );
        return { detectedCommunities: [] };
      }

      // Louvain.assign modifies the graph in place, adding a 'community' attribute.
      // For a transient graph instance, direct modification is fine.
      // It's good practice to ensure the graph is not directed for standard Louvain.
      // Graphology's Louvain implementation handles mixed/directed graphs, but results might vary.
      // Forcing undirected for classic Louvain behavior if necessary:
      // if (graphInstance.type === 'directed') {
      //   graphInstance.toUndirected(); // This method might not exist directly, manual conversion might be needed
      // }

      try {
        louvain.assign(graphInstance);
      } catch (louvainError: any) {
        console.warn(
          `[CommunityDetector] Louvain algorithm error: ${louvainError.message}. This can happen with disconnected graphs or very small components.`
        );
        // Return empty communities or a specific error if Louvain fails internally
        return {
          detectedCommunities: [],
          error: `Louvain algorithm execution failed: ${louvainError.message}`,
        };
      }

      const communitiesMap: Map<number, string[]> = new Map();
      let communityDataFound = false;
      graphInstance.forEachNode((nodeId, attributes) => {
        const communityId = attributes.community;
        if (communityId !== undefined) {
          // Check if community attribute was assigned
          communityDataFound = true;
          if (!communitiesMap.has(communityId)) {
            communitiesMap.set(communityId, []);
          }
          communitiesMap.get(communityId)!.push(nodeId);
        } else {
          // Nodes that are isolated or part of components too small for Louvain might not get an assignment
          // Or if Louvain fails on a disconnected component.
          // console.warn(`[CommunityDetector] Node ${nodeId} was not assigned a community.`);
        }
      });

      if (!communityDataFound && graphInstance.order > 0) {
        console.warn(
          '[CommunityDetector] Louvain ran, but no nodes were assigned a community attribute.'
        );
        return { detectedCommunities: [] };
      }

      const filteredCommunities = Array.from(communitiesMap.values())
        .filter((nodeIds) => nodeIds.length >= 2 && nodeIds.length <= 5) // Filter by size
        .map((ids) => ({ nodeIds: ids.sort() })); // Sort IDs for consistent output & comparison

      return { detectedCommunities: filteredCommunities };
    } catch (e: any) {
      console.error(
        '[CommunityDetector] Error in graphologyCommunityDetectionTool:',
        e
      );
      return {
        detectedCommunities: [],
        error: `Failed to detect communities: ${e.message}`,
      };
    }
  }
);
