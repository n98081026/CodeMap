import { defineFlow } from '@genkit-ai/flow';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai';
import { z } from 'zod';
import { GraphAdapterUtility } from '../../lib/graphologyAdapter'; // Corrected path
import type { ConceptMapNode, ConceptMapEdge } from '../../types'; // Assuming types are here

// Input schema for the flow - ensure it matches what the store provides
const NodesAndEdgesSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    text: z.string().optional(), // text is actually label in ConceptMapNode
    details: z.string().optional(),
    // Add other ConceptMapNode fields if needed by GraphAdapter or for context
    x: z.number().optional(),
    y: z.number().optional(),
    type: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    parentNode: z.string().optional().nullable(),
    childIds: z.array(z.string()).optional(),
    backgroundColor: z.string().optional().nullable(),
    shape: z.string().optional(), // Assuming shape is string like 'rectangle'
  })),
  edges: z.array(z.object({
    id: z.string(), // Edges from store also have IDs
    source: z.string(),
    target: z.string(),
    label: z.string().optional(),
    // Add other ConceptMapEdge fields if needed
    type: z.string().optional(),
    color: z.string().optional().nullable(),
    lineType: z.string().optional(), // Assuming 'solid' | 'dashed'
    markerStart: z.string().optional().nullable(),
    markerEnd: z.string().optional().nullable(),
  })),
});

export const SuggestedEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
  reason: z.string().optional(),
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
    authPolicy: (auth, input) => {
      // if (!auth) { /* ... */ }
    }
  },
  async (mapData) => {
    console.log(`[suggestMapImprovementsFlow] Received map with ${mapData.nodes.length} nodes and ${mapData.edges.length} edges.`);

    if (mapData.nodes.length < 2) {
      console.log("[suggestMapImprovementsFlow] Not enough nodes for meaningful suggestions.");
      return { suggestedEdges: [], suggestedGroups: [] };
    }

    let graphAnalysisContext = "No specific graph analysis performed for this iteration.";
    try {
      const graphAdapter = new GraphAdapterUtility();
      // Map ConceptMapNode to the structure GraphAdapterUtility expects if different,
      // but current GraphAdapterUtility directly uses ConceptMapNode.
      const graphInstance = graphAdapter.fromArrays(
        mapData.nodes as ConceptMapNode[], // Cast if necessary, ensure types align
        mapData.edges as ConceptMapEdge[]   // Cast if necessary
      );

      if (graphInstance.order > 0) { // Ensure graph is not empty
        const centralities = graphAdapter.getBetweennessCentrality(graphInstance);
        const sortedCentrality = Object.entries(centralities)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5); // Top 5 central nodes

        const communities = graphAdapter.detectCommunities(graphInstance);
        const communitySummary: Record<string, string[]> = {};
        for (const [nodeId, communityId] of Object.entries(communities)) {
          const communityKey = `Community ${communityId}`;
          if (!communitySummary[communityKey]) {
            communitySummary[communityKey] = [];
          }
          communitySummary[communityKey].push(nodeId);
        }

        graphAnalysisContext = `Graph Analysis Insights:\n`;
        if (sortedCentrality.length > 0) {
            graphAnalysisContext += `- High Centrality Nodes (potential bridges/hubs): ${sortedCentrality.map(([id, score]) => `${id} (score: ${score.toFixed(3)})`).join(', ')}\n`;
        }
        if (Object.keys(communitySummary).length > 0 && Object.keys(communitySummary).length < mapData.nodes.length) { // Only if communities are meaningful
            graphAnalysisContext += `- Detected Communities: ${JSON.stringify(communitySummary)}\n`;
        } else if (Object.keys(communitySummary).length > 0) {
            graphAnalysisContext += `- Community detection resulted in each node being its own community or all nodes in one.\n`;
        }
      }
    } catch (e: any) {
        console.error("[suggestMapImprovementsFlow] Error during graph analysis:", e.message);
        graphAnalysisContext = "Graph analysis encountered an error.";
    }


    const mapDataString = `Nodes:\n${JSON.stringify(mapData.nodes.map(n => ({id: n.id, text: n.text, details: n.details})), null, 2)}\n\nEdges:\n${JSON.stringify(mapData.edges.map(e => ({source: e.source, target: e.target, label: e.label})), null, 2)}`;

    const prompt = `
You are an expert concept map analyst. Based on the following concept map data AND graph analysis insights, suggest new connections (edges) AND logical groupings of nodes that would enhance the map's structure, completeness, or semantic coherence.
Consider semantic relationships between node content (text and details), existing structural patterns, AND the provided graph metrics.

Map Data:
${mapDataString}

${graphAnalysisContext}

Existing Edges (for easy reference, do not suggest these exact connections again):
${JSON.stringify(mapData.edges.map(e => ({ from: e.source, to: e.target, label: e.label })), null, 2)}

Your task is to provide two types of suggestions:
1.  **Suggested Edges:**
    *   Identify pairs of nodes (by their IDs) that are not currently connected but should be.
    *   For each suggested new edge, provide: 'source' (node ID), 'target' (node ID), 'label' (concise, meaningful), and 'reason' (brief explanation, potentially referencing graph insights like "connecting two distinct communities" or "linking a central node to an underserved area").
    *   Do NOT suggest connecting a node to itself.
    *   Do NOT suggest edges that already exist (check source/target pairs).
2.  **Suggested Groups:**
    *   Identify sets of two or more nodes that are closely related and could be logically grouped together.
    *   For each suggested group, provide: 'nodeIds' (an array of original node IDs), 'groupLabel' (a concise label for the group), and 'reason' (why these nodes form a group, potentially referencing graph insights like "these nodes form a detected community" or "these nodes are all connected to a hub").

Output Format:
Return ONLY a valid JSON object with two keys: "suggestedEdges" and "suggestedGroups".
Each key should hold an array of suggestion objects conforming to their respective structures.
If no suggestions of a particular type (edges or groups) are found, return an empty array for that key (e.g., "suggestedGroups": []).

Example Output:
{
  "suggestedEdges": [
    { "source": "node-123", "target": "node-456", "label": "supports", "reason": "Node 123's details mention concepts elaborated in Node 456. This also connects two distinct communities identified in the graph analysis." }
  ],
  "suggestedGroups": [
    { "nodeIds": ["node-abc", "node-def", "node-ghi"], "groupLabel": "Core Authentication Flow", "reason": "These nodes represent sequential steps in user authentication and were identified as a dense community." }
  ]
}

Provide only the JSON object as your output.
`;

    try {
      const llmResponse = await generate({
        model: geminiPro,
        prompt: prompt,
        output: { format: 'json', schema: SuggestedImprovementsSchema },
        config: { temperature: 0.4 }, // Slightly increased temp for more varied suggestions with new context
      });

      const output = llmResponse.output();
      const rawEdges = output?.suggestedEdges || [];
      const rawGroups = output?.suggestedGroups || [];
      console.log(`[suggestMapImprovementsFlow] LLM generated ${rawEdges.length} raw edge suggestions and ${rawGroups.length} raw group suggestions.`);

      const existingNodeIds = new Set(mapData.nodes.map(n => n.id));
      const existingEdgesSet = new Set(mapData.edges.map(e => `${e.source}-${e.target}`));
      const existingEdgesReverseSet = new Set(mapData.edges.map(e => `${e.target}-${e.source}`));

      const validEdgeSuggestions = rawEdges
        .filter(s => existingNodeIds.has(s.source) && existingNodeIds.has(s.target))
        .filter(s => s.source !== s.target)
        .filter(s => !existingEdgesSet.has(`${s.source}-${s.target}`) && !existingEdgesReverseSet.has(`${s.source}-${s.target}`));

      const validGroupSuggestions = rawGroups
        .filter(g => g.nodeIds && Array.isArray(g.nodeIds) && g.nodeIds.length >= 2)
        .map(g => ({
          ...g,
          nodeIds: g.nodeIds.filter(id => existingNodeIds.has(id)),
        }))
        .filter(g => g.nodeIds.length >= 2);

      console.log(`[suggestMapImprovementsFlow] Returning ${validEdgeSuggestions.length} valid edge suggestions and ${validGroupSuggestions.length} valid group suggestions after filtering.`);
      return { suggestedEdges: validEdgeSuggestions, suggestedGroups: validGroupSuggestions };

    } catch (error) {
      console.error("[suggestMapImprovementsFlow] Error during LLM call or processing:", error);
      return { suggestedEdges: [], suggestedGroups: [] };
    }
  }
);
