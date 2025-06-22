import { defineFlow } from '@genkit-ai/flow';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai';
import { z } from 'zod';
import { GraphAdapterUtility } from '../../lib/graphologyAdapter';
import type { ConceptMapNode, ConceptMapEdge } from '../../types';
import { connectedComponents } from 'graphology-components'; // For connected components count

// Input schema for the flow
const NodesAndEdgesSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    text: z.string().optional(),
    details: z.string().optional(),
    x: z.number().optional(), y: z.number().optional(), type: z.string().optional(),
    width: z.number().optional(), height: z.number().optional(),
    parentNode: z.string().optional().nullable(), childIds: z.array(z.string()).optional(),
    backgroundColor: z.string().optional().nullable(), shape: z.string().optional(),
  })),
  edges: z.array(z.object({
    id: z.string(), source: z.string(), target: z.string(), label: z.string().optional(),
    type: z.string().optional(), color: z.string().optional().nullable(),
    lineType: z.string().optional(), markerStart: z.string().optional().nullable(),
    markerEnd: z.string().optional().nullable(),
  })),
});

export const SuggestedEdgeSchema = z.object({
  source: z.string(), target: z.string(), label: z.string().optional(), reason: z.string().optional(),
});
export type SuggestedEdge = z.infer<typeof SuggestedEdgeSchema>;

export const SuggestedGroupSchema = z.object({
  nodeIds: z.array(z.string()).min(2), groupLabel: z.string().optional(), reason: z.string().optional(),
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
    authPolicy: (auth, input) => { /* ... */ }
  },
  async (mapData) => {
    console.log(`[suggestMapImprovementsFlow] Received map with ${mapData.nodes.length} nodes and ${mapData.edges.length} edges.`);
    if (mapData.nodes.length < 2) {
      console.log("[suggestMapImprovementsFlow] Not enough nodes for meaningful suggestions.");
      return { suggestedEdges: [], suggestedGroups: [] };
    }

    let graphAnalysisInsights = "Graph analysis insights:\n";
    try {
      const graphAdapter = new GraphAdapterUtility();
      const graphInstance = graphAdapter.fromArrays(
        mapData.nodes as ConceptMapNode[],
        mapData.edges as ConceptMapEdge[]
      );

      if (graphInstance.order > 0) {
        // Betweenness Centrality
        const centralities = graphAdapter.getBetweennessCentrality(graphInstance);
        const sortedCentrality = Object.entries(centralities).sort(([,a],[,b]) => b-a).slice(0,5);
        if (sortedCentrality.length > 0) {
          graphAnalysisInsights += `- Top 5 High Betweenness Centrality Nodes (potential bridges/brokers): ${sortedCentrality.map(([id, score]) => `${mapData.nodes.find(n=>n.id===id)?.text || id} (score: ${score.toFixed(3)})`).join(', ')}\n`;
        }

        // Degree Centrality
        const degrees = graphAdapter.getDegreeCentrality?.(graphInstance) || {}; // Use optional chaining if method might not exist
        const sortedDegree = Object.entries(degrees).sort(([,a],[,b]) => b-a).slice(0,5);
        if (sortedDegree.length > 0) {
            graphAnalysisInsights += `- Top 5 High Degree Centrality Nodes (hubs): ${sortedDegree.map(([id, score]) => `${mapData.nodes.find(n=>n.id===id)?.text || id} (degree: ${score})`).join(', ')}\n`;
        }

        // Communities
        const communities = graphAdapter.detectCommunities(graphInstance);
        const communitySummary: Record<string, string[]> = {};
        let communityCount = 0;
        if (Object.keys(communities).length > 0) {
            const distinctCommunities = new Set(Object.values(communities));
            communityCount = distinctCommunities.size;
            for (const [nodeId, communityId] of Object.entries(communities)) {
              const communityKey = `Community ${communityId}`;
              if (!communitySummary[communityKey]) communitySummary[communityKey] = [];
              communitySummary[communityKey].push(mapData.nodes.find(n=>n.id===nodeId)?.text || nodeId);
            }
        }
        if (communityCount > 0 && communityCount < mapData.nodes.length) {
            graphAnalysisInsights += `- Detected ${communityCount} Communities: ${JSON.stringify(communitySummary)}\n`;
        } else if (communityCount > 0) {
            graphAnalysisInsights += `- Community detection resulted in each node being its own community or all nodes in one main group.\n`;
        }

        // Connected Components
        const components = connectedComponents(graphInstance);
        const numConnectedComponents = components.length;
        graphAnalysisInsights += `- Number of Connected Components: ${numConnectedComponents}\n`;
        if (numConnectedComponents > 1) {
            graphAnalysisInsights += `  (Consider suggesting edges to bridge these components if semantically relevant.)\n`;
        }

      } else {
        graphAnalysisInsights = "Graph is empty, no analysis performed.\n";
      }
    } catch (e: any) {
        console.error("[suggestMapImprovementsFlow] Error during graph analysis:", e.message);
        graphAnalysisInsights = "Graph analysis encountered an error.\n";
    }

    const mapDataString = `Nodes:\n${JSON.stringify(mapData.nodes.map(n => ({id: n.id, text: n.text, details: n.details?.substring(0,100)})), null, 2)}\n\nEdges:\n${JSON.stringify(mapData.edges.map(e => ({source: e.source, target: e.target, label: e.label})), null, 2)}`;

    const prompt = `
You are an expert concept map analyst and knowledge architect. Your goal is to suggest ONE high-impact structural improvement OR ONE logical grouping to enhance a given concept map.
Base your suggestions on both the semantic content of nodes/edges AND the provided graph analysis insights.

**Map Data:**
${mapDataString}

**Graph Analysis Insights:**
${graphAnalysisInsights}

**Existing Edges (for reference, do not suggest exact duplicates):**
${JSON.stringify(mapData.edges.map(e => ({ from: e.source, to: e.target, label: e.label })), null, 2)}

**Your Task: Provide ONE of the following suggestion types:**

1.  **Suggested Edge:**
    *   **When to Suggest:**
        *   If two nodes are semantically related but not connected.
        *   To bridge two distinct 'Detected Communities' if a clear semantic link exists between nodes in each.
        *   To connect a 'High Centrality Node' to an area it doesn't currently serve but should.
        *   If 'Number of Connected Components' > 1, to link nodes from different components.
    *   **Details:** Provide 'source' (node ID), 'target' (node ID), a concise 'label' (action-oriented, e.g., "clarifies", "depends on", "leads to"), and a 'reason'.
    *   **Reasoning:** Your 'reason' MUST explicitly mention which graph insight (if any) and which semantic clues support this edge. E.g., "Connects high-centrality node 'X' to underserved community 'Y' based on shared keywords in their details." or "Bridges two components; Node A and Node B are thematically linked."
    *   **Constraints:** Do NOT suggest connecting a node to itself or an already existing edge.

2.  **Suggested Group:**
    *   **When to Suggest:**
        *   If a 'Detected Community' represents a strong, coherent theme not yet explicitly grouped.
        *   If several nodes are all direct children of a 'High Degree Centrality Node' (hub) and share a common sub-theme.
        *   If multiple nodes appear semantically related and could be abstracted under a new parent concept.
    *   **Details:** Provide 'nodeIds' (array of 2-5 node IDs), 'groupLabel' (concise name for the new parent/group), and 'reason'.
    *   **Reasoning:** Your 'reason' MUST reference graph insights or semantic patterns. E.g., "These nodes form a detected community and share keywords related to 'data processing'." or "Groups related leaf nodes under hub 'Z'."

**Output Format (Return ONLY ONE suggestion type - either 'suggestedEdges' array with one edge, OR 'suggestedGroups' array with one group):**
Return a valid JSON object. If suggesting an edge, the "suggestedGroups" array should be empty, and vice-versa.
If no single high-impact suggestion is evident, you MAY return empty arrays for both.

Example for ADD_EDGE:
{
  "suggestedEdges": [{ "source": "node-123", "target": "node-456", "label": "clarifies_concept_of", "reason": "Node-123 (high centrality) details are expanded by Node-456. This connects two previously separate communities." }],
  "suggestedGroups": []
}
Example for FORM_GROUP:
{
  "suggestedEdges": [],
  "suggestedGroups": [{ "nodeIds": ["node-abc", "node-def"], "groupLabel": "Data Input Modules", "reason": "Nodes 'node-abc' and 'node-def' form a detected community related to data ingestion." }]
}

Provide only the JSON object as your output. Focus on quality and relevance over quantity.
`;

    try {
      const llmResponse = await generate({
        model: geminiPro, prompt: prompt, output: { format: 'json', schema: SuggestedImprovementsSchema },
        config: { temperature: 0.5 }, // Slightly higher temp for more creative interpretation of metrics
      });
      const output = llmResponse.output();
      // ... (rest of post-processing logic as before)
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
        .map(g => ({ ...g, nodeIds: g.nodeIds.filter(id => existingNodeIds.has(id)), }))
        .filter(g => g.nodeIds.length >= 2);

      console.log(`[suggestMapImprovementsFlow] Returning ${validEdgeSuggestions.length} valid edge suggestions and ${validGroupSuggestions.length} valid group suggestions after filtering.`);
      return { suggestedEdges: validEdgeSuggestions, suggestedGroups: validGroupSuggestions };

    } catch (error) {
      console.error("[suggestMapImprovementsFlow] Error during LLM call or processing:", error);
      return { suggestedEdges: [], suggestedGroups: [] };
    }
  }
);
