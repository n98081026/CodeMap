// src/ai/tools/graphology-inter-community-edge-tool.ts
import { defineTool } from '@genkit-ai/tool';
import { z } from 'zod';
import { GraphAdapterUtility } from '../../lib/graphologyAdapter';
import { MapDataSchema } from '../flows/suggest-map-improvement'; // Using this as the base for MapData
import louvain from 'graphology-communities-louvain';
import Graph from 'graphology'; // Only for typehint if needed, graphInstance is GraphologyInstance from adapter

export const InterCommunityEdgeInputSchema = MapDataSchema;
export type InterCommunityEdgeInput = z.infer<
  typeof InterCommunityEdgeInputSchema
>;

export const CandidateLocationSchema = z.object({
  sourceNodeId: z.string(),
  targetNodeId: z.string(),
  originalEdgeId: z.string(), // Assumes edges in mapData will have an 'id' field
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
    name: 'graphologyInterCommunityEdgeDetector',
    description:
      'Identifies edges that connect distinct node communities (clusters) in a concept map, which are candidates for intermediate node insertion.',
    inputSchema: InterCommunityEdgeInputSchema,
    outputSchema: InterCommunityEdgeOutputSchema,
  },
  async (mapData: InterCommunityEdgeInput) => {
    try {
      const { nodes, edges } = mapData;

      if (!nodes || nodes.length < 2 || !edges || edges.length === 0) {
        console.log(
          '[InterCommunityEdgeTool] Not enough nodes or no edges to analyze.'
        );
        return { candidateLocations: [] };
      }

      const graphAdapter = new GraphAdapterUtility();
      // The actual GraphologyInstance type is returned by fromArrays
      const graphInstance = graphAdapter.fromArrays(nodes, edges);

      if (graphInstance.order < 2 || graphInstance.size === 0) {
        console.log(
          '[InterCommunityEdgeTool] Graph instance has too few nodes or no edges after creation.'
        );
        return { candidateLocations: [] };
      }

      try {
        louvain.assign(graphInstance); // Adds 'community' attribute to nodes
      } catch (louvainError: any) {
        console.warn(
          `[InterCommunityEdgeTool] Louvain algorithm error: ${louvainError.message}. This can occur with certain graph structures (e.g., highly disconnected).`
        );
        return {
          candidateLocations: [],
          error: `Louvain algorithm failed: ${louvainError.message}`,
        };
      }

      const nodeCommunityMap = new Map<string, number>();
      let communitiesAssigned = false;
      graphInstance.forEachNode((nodeId, attributes) => {
        if (typeof attributes.community === 'number') {
          nodeCommunityMap.set(nodeId, attributes.community);
          communitiesAssigned = true;
        } else {
          // console.warn(`[InterCommunityEdgeTool] Node ${nodeId} was not assigned a community.`);
        }
      });

      if (!communitiesAssigned && graphInstance.order > 0) {
        console.warn(
          '[InterCommunityEdgeTool] Louvain ran, but no nodes seem to have been assigned a community attribute.'
        );
        return { candidateLocations: [] };
      }

      const candidateLocations: CandidateLocation[] = [];
      // Iterate over the original edges from mapData, as they contain the IDs
      for (const edge of edges) {
        // Ensure edge has an ID, otherwise this tool can't identify it.
        // The MapDataSchema for edges doesn't enforce an ID, but ConceptMapEdge type does.
        // Assuming the input 'edges' will practically be ConceptMapEdge[].
        const edgeId = (edge as any).id;
        if (!edgeId) {
          // console.warn(`[InterCommunityEdgeTool] Edge between ${edge.source} and ${edge.target} is missing an ID, skipping.`);
          continue;
        }

        const sourceCommunity = nodeCommunityMap.get(edge.source);
        const targetCommunity = nodeCommunityMap.get(edge.target);

        if (
          sourceCommunity !== undefined &&
          targetCommunity !== undefined &&
          sourceCommunity !== targetCommunity
        ) {
          candidateLocations.push({
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            originalEdgeId: edgeId as string,
            sourceCommunityId: sourceCommunity,
            targetCommunityId: targetCommunity,
          });
        }
      }
      return { candidateLocations };
    } catch (e: any) {
      console.error('Error in graphologyInterCommunityEdgeTool:', e);
      return {
        candidateLocations: [],
        error: `Failed to detect inter-community edges: ${e.message}`,
      };
    }
  }
);
