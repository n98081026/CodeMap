import { defineFlow } from '@genkit-ai/flow';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai'; // Or your chosen model
import { z } from 'zod';

// Input schema for the flow
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
export type SuggestedEdge = z.infer<typeof SuggestedEdgeSchema>;

export const SuggestedGroupSchema = z.object({
  nodeIds: z.array(z.string()).min(2, "A group must contain at least two nodes."),
  groupLabel: z.string().optional(),
  reason: z.string().optional(),
});
export type SuggestedGroup = z.infer<typeof SuggestedGroupSchema>;

export const SuggestedImprovementsSchema = z.object({
  suggestedEdges: z.array(SuggestedEdgeSchema).optional(),
  suggestedGroups: z.array(SuggestedGroupSchema).optional(),
});
export type SuggestedImprovements = z.infer<typeof SuggestedImprovementsSchema>;

export const suggestMapImprovementsFlow = defineFlow(
  {
    name: 'suggestMapImprovementsFlow',
    inputSchema: NodesAndEdgesSchema,
    outputSchema: SuggestedImprovementsSchema,
    authPolicy: (auth, input) => { // Example auth policy
      if (!auth) {
        // throw new Error("User not authenticated."); // Or handle as per your app's auth strategy
      }
    }
  },
  async (mapData) => {
    console.log(`[suggestMapImprovementsFlow] Received map with ${mapData.nodes.length} nodes and ${mapData.edges.length} edges.`);

    if (mapData.nodes.length < 2) { // Grouping needs at least 2 nodes, edge suggestions also benefit from 2+ nodes.
      console.log("[suggestMapImprovementsFlow] Not enough nodes to make meaningful suggestions for edges or groups.");
      return { suggestedEdges: [], suggestedGroups: [] };
    }

    const mapDataString = `Nodes:\n${JSON.stringify(mapData.nodes.map(n => ({id: n.id, text: n.text, details: n.details})), null, 2)}\n\nEdges:\n${JSON.stringify(mapData.edges.map(e => ({source: e.source, target: e.target, label: e.label})), null, 2)}`;

    const prompt = `
You are an expert concept map analyst. Based on the following concept map data, suggest new connections (edges) AND logical groupings of nodes that would enhance the map's structure, completeness, or semantic coherence.
Consider semantic relationships between node content (text and details) and existing structural patterns.

Map Data:
${mapDataString}

Existing Edges (for easy reference, do not suggest these exact connections again):
${JSON.stringify(mapData.edges.map(e => ({ from: e.source, to: e.target, label: e.label })), null, 2)}

Your task is to provide two types of suggestions:
1.  **Suggested Edges:**
    *   Identify pairs of nodes (by their IDs) that are not currently connected but should be.
    *   For each suggested new edge, provide: 'source' (node ID), 'target' (node ID), 'label' (concise, meaningful), and 'reason' (brief explanation).
    *   Do NOT suggest connecting a node to itself.
    *   Do NOT suggest edges that already exist (check source/target pairs).
2.  **Suggested Groups:**
    *   Identify sets of two or more nodes that are closely related and could be logically grouped together (e.g., under a new parent concept, as a sequence, or shared category).
    *   For each suggested group, provide: 'nodeIds' (an array of original node IDs), 'groupLabel' (a concise label for the group, which could become a new parent node's text), and 'reason' (why these nodes form a group).

Output Format:
Return ONLY a valid JSON object with two keys: "suggestedEdges" and "suggestedGroups".
Each key should hold an array of suggestion objects conforming to their respective structures.
If no suggestions of a particular type (edges or groups) are found, return an empty array for that key (e.g., "suggestedGroups": []).

Example Output:
{
  "suggestedEdges": [
    { "source": "node-123", "target": "node-456", "label": "supports", "reason": "Node 123's details mention concepts elaborated in Node 456." }
  ],
  "suggestedGroups": [
    { "nodeIds": ["node-abc", "node-def", "node-ghi"], "groupLabel": "Core Authentication Flow", "reason": "These nodes represent sequential steps in user authentication." }
  ]
}

Provide only the JSON object as your output.
`;

    try {
      const llmResponse = await generate({
        model: geminiPro,
        prompt: prompt,
        output: { format: 'json', schema: SuggestedImprovementsSchema },
        config: { temperature: 0.3 },
      });

      const output = llmResponse.output();

      const rawEdges = output?.suggestedEdges || [];
      const rawGroups = output?.suggestedGroups || [];

      console.log(`[suggestMapImprovementsFlow] LLM generated ${rawEdges.length} raw edge suggestions and ${rawGroups.length} raw group suggestions.`);

      // Post-processing for Edges
      const existingNodeIds = new Set(mapData.nodes.map(n => n.id));
      const existingEdgesSet = new Set(mapData.edges.map(e => `${e.source}-${e.target}`));
      const existingEdgesReverseSet = new Set(mapData.edges.map(e => `${e.target}-${e.source}`));

      const validEdgeSuggestions = rawEdges
        .filter(s => existingNodeIds.has(s.source) && existingNodeIds.has(s.target))
        .filter(s => s.source !== s.target)
        .filter(s => !existingEdgesSet.has(`${s.source}-${s.target}`) && !existingEdgesReverseSet.has(`${s.source}-${s.target}`));

      // Post-processing for Groups
      const validGroupSuggestions = rawGroups
        .filter(g => g.nodeIds && Array.isArray(g.nodeIds) && g.nodeIds.length >= 2) // Ensure nodeIds is an array and has at least 2 elements
        .map(g => ({
          ...g,
          nodeIds: g.nodeIds.filter(id => existingNodeIds.has(id)), // Ensure all nodeIds in a group are valid
        }))
        .filter(g => g.nodeIds.length >= 2); // Filter out groups that now have less than 2 valid nodes

      console.log(`[suggestMapImprovementsFlow] Returning ${validEdgeSuggestions.length} valid edge suggestions and ${validGroupSuggestions.length} valid group suggestions after filtering.`);
      return { suggestedEdges: validEdgeSuggestions, suggestedGroups: validGroupSuggestions };

    } catch (error) {
      console.error("[suggestMapImprovementsFlow] Error during LLM call or processing:", error);
      return { suggestedEdges: [], suggestedGroups: [] };
    }
  }
);
