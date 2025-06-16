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

export const SuggestedImprovementsSchema = z.object({
  suggestedEdges: z.array(SuggestedEdgeSchema),
  // Later, can add suggestedGroups, node content improvements, etc.
});

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

    if (mapData.nodes.length < 2) {
      console.log("[suggestMapImprovementsFlow] Not enough nodes to make meaningful suggestions.");
      return { suggestedEdges: [] };
    }

    const mapDataString = `Nodes:\n${JSON.stringify(mapData.nodes.map(n => ({id: n.id, text: n.text, details: n.details})), null, 2)}\n\nEdges:\n${JSON.stringify(mapData.edges.map(e => ({source: e.source, target: e.target, label: e.label})), null, 2)}`;

    const prompt = `
You are an expert concept map analyst. Based on the following concept map data, suggest new connections (edges) that would enhance the map's structure, completeness, or semantic coherence.
Consider semantic relationships between node content (text and details) and existing structural patterns.

Map Data:
${mapDataString}

Existing Edges (for easy reference, do not suggest these exact connections again):
${JSON.stringify(mapData.edges.map(e => ({ from: e.source, to: e.target, label: e.label })), null, 2)}

Your task:
1.  Identify pairs of nodes (by their IDs) that are not currently connected but should be.
2.  For each suggested new edge, provide:
    *   'source': The ID of the source node.
    *   'target': The ID of the target node.
    *   'label': A concise, meaningful label for the new edge (e.g., "related to", "leads to", "is a type of").
    *   'reason': A brief explanation for why this connection is suggested.
3.  Do NOT suggest connecting a node to itself.
4.  Do NOT suggest edges that already exist (check source/target pairs, direction might not matter for this check, but aim for new unique pairs).
5.  Return your suggestions as a JSON array of objects, where each object conforms to this structure: { "source": "nodeId1", "target": "nodeId2", "label": "edgeLabel", "reason": "yourReason" }.
    If no new connections are identified or possible, return an empty JSON array [].

Example of a single suggestion object:
{ "source": "node-123", "target": "node-456", "label": "supports", "reason": "Node 123's details mention concepts elaborated in Node 456." }

Provide only the JSON array as your output.
`;

    try {
      const llmResponse = await generate({
        model: geminiPro, // Ensure this model is configured in your genkit setup
        prompt: prompt,
        output: { format: 'json', schema: z.array(SuggestedEdgeSchema) },
        config: { temperature: 0.3 },
      });

      const suggestions = llmResponse.output();

      if (!suggestions || !Array.isArray(suggestions)) {
        console.warn("[suggestMapImprovementsFlow] LLM output was null or not an array. Returning empty suggestions.");
        return { suggestedEdges: [] };
      }

      console.log(`[suggestMapImprovementsFlow] LLM generated ${suggestions.length} raw suggestions.`);

      // Post-processing
      const existingNodeIds = new Set(mapData.nodes.map(n => n.id));
      const existingEdgesSet = new Set(mapData.edges.map(e => `${e.source}-${e.target}`));
      const existingEdgesReverseSet = new Set(mapData.edges.map(e => `${e.target}-${e.source}`));

      const validSuggestions = suggestions
        .filter(s => {
          const isValid = existingNodeIds.has(s.source) && existingNodeIds.has(s.target);
          if (!isValid) console.log(`[Filter] Invalid node ID in suggestion: ${s.source} or ${s.target}`);
          return isValid;
        })
        .filter(s => {
          const isSelfLoop = s.source === s.target;
          if (isSelfLoop) console.log(`[Filter] Self-loop suggestion filtered: ${s.source}-${s.target}`);
          return !isSelfLoop;
        })
        .filter(s => {
          const exists = existingEdgesSet.has(`${s.source}-${s.target}`) || existingEdgesReverseSet.has(`${s.source}-${s.target}`);
          if (exists) console.log(`[Filter] Existing edge suggestion filtered: ${s.source}-${s.target}`);
          return !exists;
        });

      console.log(`[suggestMapImprovementsFlow] Returning ${validSuggestions.length} valid suggestions after filtering.`);
      return { suggestedEdges: validSuggestions };

    } catch (error) {
      console.error("[suggestMapImprovementsFlow] Error during LLM call or processing:", error);
      // It's good to return a valid OutputSchema structure even in case of error
      return { suggestedEdges: [] };
    }
  }
);
