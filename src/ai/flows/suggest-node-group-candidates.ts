import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { DEFAULT_MODEL } from '../../config/genkit';
import * as z from 'zod';

// Input Schema: A list of nodes with their content and position
export const SuggestNodeGroupCandidatesInputSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      details: z.string().optional(),
      x: z.number(),
      y: z.number(),
    })
  ),
  // Optional: Provide existing group information to avoid redundant suggestions
  existingGroups: z
    .array(
      z.object({
        groupNodeId: z.string(),
        childNodeIds: z.array(z.string()),
      })
    )
    .optional(),
});

import { NodeGroupSuggestionSchema } from './schemas';

// Output Schema: A list of suggested groups
export const SuggestedGroupSchema = z.object({
  nodeIds: z
    .array(z.string())
    .min(2, 'A group must contain at least two nodes.'),
  groupLabel: z.string(),
  reason: z.string(),
});

export const SuggestNodeGroupCandidatesOutputSchema = z.object({
  suggestedGroups: z.array(NodeGroupSuggestionSchema),
});

export const suggestNodeGroupCandidatesFlow = defineFlow(
  {
    name: 'suggestNodeGroupCandidatesFlow',
    inputSchema: SuggestNodeGroupCandidatesInputSchema,
    outputSchema: SuggestNodeGroupCandidatesOutputSchema,
    authPolicy: (auth, input) => {},
  },
  async (input) => {
    const { nodes } = input;

    if (nodes.length < 3) {
      return { suggestedGroups: [] }; // Not enough nodes to form meaningful groups
    }

    const nodesSummary = nodes
      .map(
        (n) =>
          `- Node(id: "${n.id}", text: "${n.text}", position: [${n.x.toFixed(0)}, ${n.y.toFixed(0)}]${
            n.details ? `, details: "${n.details.substring(0, 50)}..."` : ''
          })`
      )
      .join('\n');

    const prompt = `
      You are an expert in information architecture and visual organization.
      Given a list of nodes from a concept map, your task is to identify potential groups of 2-5 nodes that share a strong semantic or thematic connection.

      Analyze the provided list of nodes, considering their text, details, and proximity to each other.

      Nodes:
      ${nodesSummary}

      Your goal is to propose logical groupings. For each group you identify, you must provide:
      1.  A "groupLabel": A concise, high-level concept that encapsulates all nodes in the group.
      2.  A "nodeIds": An array of the original IDs of the nodes that belong in this group.
      3.  A "reason": A brief explanation for why these nodes form a coherent group.

      You can suggest multiple groups if you find more than one logical candidate.
      Do not suggest groups that contain only one node.

      Return your answer as a JSON object with a single key "suggestedGroups".
      This key should hold an array of group objects, where each object has "groupLabel", "nodeIds", and "reason".

      Example:
      {
        "suggestedGroups": [
          {
            "groupLabel": "Database Operations",
            "nodeIds": ["node-1", "node-4", "node-5"],
            "reason": "These nodes all relate to creating, reading, and updating data in the database."
          },
          {
            "groupLabel": "User Interface Components",
            "nodeIds": ["node-2", "node-3"],
            "reason": "These nodes describe the main UI elements for user interaction."
          }
        ]
      }
    `;

    try {
      const llmResponse = await generate(
        {
          model: DEFAULT_MODEL,
          prompt: prompt,
          config: {
            temperature: 0.4,
            maxOutputTokens: 800,
          },
          output: {
            format: 'json',
            schema: SuggestNodeGroupCandidatesOutputSchema,
          },
        }
      );

      const result = llmResponse.output;

      if (!result || !Array.isArray(result.suggestedGroups)) {
        console.error('AI response was not in the expected format.');
        return { suggestedGroups: [] };
      }

      // Optional: Add filtering logic here to remove invalid groups
      // (e.g., groups with node IDs not present in the input)
      const inputNodeIds = new Set(nodes.map((n) => n.id));
      const validatedGroups = result.suggestedGroups
        .map((group: any) => ({
          ...group,
          nodeIds: group.nodeIds.filter((id: any) => inputNodeIds.has(id)),
        }))
        .filter((group: any) => group.nodeIds.length >= 2);

      return { suggestedGroups: validatedGroups };
    } catch (error) {
      console.error('Error in suggestNodeGroupCandidatesFlow:', error);
      return { suggestedGroups: [] };
    }
  }
);
