import { defineFlow, runFlow } from '@genkit-ai/flow';
import { z } from 'zod';
// Assuming commonConceptMapDataSchema is not strictly needed here as we define NodesAndEdgesSchema locally
// import { commonConceptMapDataSchema } from '@/types/ai-schemas';

// Define input schema specifically for this flow, can be aligned with commonConceptMapDataSchema later
const NodesAndEdgesSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    text: z.string().optional(),
    details: z.string().optional()
    // Add other relevant node properties if the flow needs them, e.g., type, x, y for context
  })),
  edges: z.array(z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    label: z.string().optional()
  })),
});

export const SuggestedEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  reason: z.string().optional(), // Why this edge is suggested
});

export const SuggestedImprovementsSchema = z.object({
  suggestedEdges: z.array(SuggestedEdgeSchema),
  // Later, can add suggestedGroups, node content improvements, etc.
});

export const suggestMapImprovementsFlow = defineFlow(
  {
    name: 'suggestMapImprovementsFlow',
    inputSchema: NodesAndEdgesSchema,
    outputSchema: SuggestedImprovementsSchema,
  },
  async (mapData) => {
    // Placeholder implementation
    console.log(`[suggestMapImprovementsFlow] Suggesting improvements for map with ${mapData.nodes.length} nodes and ${mapData.edges.length} edges.`);

    // Mock: Suggest connecting the first two nodes if they aren't already connected
    // and if there are at least two nodes.
    if (mapData.nodes.length >= 2) {
        const node1Id = mapData.nodes[0].id;
        const node2Id = mapData.nodes[1].id;

        // Check if these nodes exist (sanity check, should always be true if length >= 2)
        if (!mapData.nodes.find(n => n.id === node1Id) || !mapData.nodes.find(n => n.id === node2Id)) {
            console.warn(`[suggestMapImprovementsFlow] One or both nodes not found for suggestion: ${node1Id}, ${node2Id}`);
            return { suggestedEdges: [] };
        }

        const alreadyConnected = mapData.edges.some(
            edge => (edge.source === node1Id && edge.target === node2Id) ||
                    (edge.source === node2Id && edge.target === node1Id)
        );

        if (!alreadyConnected) {
            console.log(`[suggestMapImprovementsFlow] Suggesting edge between ${node1Id} and ${node2Id}.`);
            return {
                suggestedEdges: [
                    { source: node1Id, target: node2Id, label: "Suggested Link", reason: "These were the first two nodes and are not connected." }
                ]
            };
        } else {
            console.log(`[suggestMapImprovementsFlow] Nodes ${node1Id} and ${node2Id} are already connected.`);
        }
    } else {
        console.log("[suggestMapImprovementsFlow] Not enough nodes to suggest a connection.");
    }

    return { suggestedEdges: [] };
  }
);
