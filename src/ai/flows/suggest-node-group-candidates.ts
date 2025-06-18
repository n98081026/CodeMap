import { defineFlow, generate } from '@genkit-ai/flow';
import { geminiPro } from '@genkit-ai/googleai'; // Or another suitable model
import * as z from 'zod';

// Input Schema: Current map data
export const MapDataSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      text: z.string().min(1, "Node text cannot be empty."),
      details: z.string().optional(),
      // Optionally include x, y if position might inform grouping, but keep it simple for now
    })
  ),
  edges: z.array(
    z.object({
      source: z.string(),
      target: z.string(),
      label: z.string().optional(),
    })
  ),
});

// Output Schema: A single group suggestion, or null if no suitable group found
export const NodeGroupSuggestionSchema = z.object({
  nodeIdsToGroup: z.array(z.string()).min(2).max(5, "Suggest grouping 2 to 5 nodes."), // AI should suggest IDs of existing nodes
  suggestedParentName: z.string().min(1, "Suggested parent name cannot be empty."),
  reason: z.string().optional(),
}).nullable(); // Allow AI to return null if no good suggestion

export const suggestNodeGroupCandidatesFlow = defineFlow(
  {
    name: 'suggestNodeGroupCandidatesFlow',
    inputSchema: MapDataSchema,
    outputSchema: NodeGroupSuggestionSchema,
  },
  async (input) => {
    const { nodes, edges } = input;

    if (nodes.length < 2) { // Not enough nodes to form a group
      return null;
    }

    // Prepare a summary of the map for the prompt
    const nodesSummary = nodes.map(n =>
      `Node(id="${n.id}", text="${n.text}"${n.details ? `, details="${n.details.substring(0, 70)}${n.details.length > 70 ? '...' : ''}"` : ''})`
    ).join(', ');

    const edgesSummary = edges.map(e =>
      `Edge(source="${e.source}", target="${e.target}"${e.label ? `, label="${e.label}"` : ''})`
    ).join(', ');

    const prompt = `
      You are an expert knowledge organizer and concept map analyst.
      Analyze the following concept map data, which consists of nodes and their connections.
      Your task is to identify one set of 2 to 5 existing nodes that are closely related or represent a coherent sub-theme but are NOT YET EXPLICITLY GROUPED under a common parent node (i.e., their 'parentNode' property is not already set to the same value or they don't share an obvious existing container).

      If you find such a group, suggest:
      1.  A list of the IDs of these nodes (\`nodeIdsToGroup\`). These must be IDs from the provided nodes.
      2.  A concise and meaningful name for a NEW PARENT NODE that would semantically group these selected nodes (\`suggestedParentName\`).
      3.  Optionally, a brief reason for your suggested grouping (\`reason\`).

      Prioritize suggestions that would significantly improve the map's organization and clarity.
      If multiple potential groups exist, suggest only the most compelling one.
      If no suitable group of 2-5 nodes is identified, return null.

      Map Data:
      Nodes: [${nodesSummary}]
      Edges: [${edgesSummary}]

      Return your answer as a JSON object matching the specified output schema, or return null if no good suggestion is found.
      Example of a valid JSON object:
      {
        "nodeIdsToGroup": ["nodeId1", "nodeId2", "nodeId3"],
        "suggestedParentName": "Key Authentication Methods",
        "reason": "These nodes all describe different ways users can authenticate."
      }
      Another example (if no reason):
      {
        "nodeIdsToGroup": ["nodeA", "nodeB"],
        "suggestedParentName": "Core Components"
      }
    `;

    const llmResponse = await generate({
      model: geminiPro,
      prompt: prompt,
      config: {
        temperature: 0.4,
        maxOutputTokens: 250,
      },
      output: {
        format: 'json',
        schema: NodeGroupSuggestionSchema,
      },
    });

    const outputData = llmResponse.output();

    // Validate that suggested nodeIdsToGroup actually exist in the input nodes
    if (outputData && outputData.nodeIdsToGroup) {
      const inputNodeIds = new Set(nodes.map(n => n.id));
      const allSuggestedIdsValid = outputData.nodeIdsToGroup.every(id => inputNodeIds.has(id));
      if (!allSuggestedIdsValid) {
        console.warn("AI suggested grouping for non-existent node IDs. Clearing suggestion.");
        return null;
      }
      // Ensure no duplicate IDs in the group
      if (new Set(outputData.nodeIdsToGroup).size !== outputData.nodeIdsToGroup.length) {
        console.warn("AI suggested duplicate node IDs for grouping. Clearing suggestion.");
        return null;
      }
    }

    return outputData; // This can be null if AI or schema validation decides so
  }
);
