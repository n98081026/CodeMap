// src/ai/flows/generate-quick-cluster.ts
'use server';
/**
 * @fileOverview A Genkit flow to generate a small cluster of related concept map nodes and edges based on a user prompt.
 *
 * - generateQuickCluster - A function that handles the quick cluster generation.
 * - GenerateQuickClusterInput - The input type for the generateQuickCluster function.
 * - GenerateQuickClusterOutput - The return type for the generateQuickCluster function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateQuickClusterInputSchema = z.object({
  prompt: z
    .string()
    .describe('The user prompt or topic to generate a concept cluster around.'),
});
export type GenerateQuickClusterInput = z.infer<
  typeof GenerateQuickClusterInputSchema
>;

const NodeSchema = z.object({
  text: z.string().describe('The concise label for the concept node.'),
  type: z
    .string()
    .optional()
    .describe(
      'An optional type for the node (e.g., "idea", "question", "task"). Default if not provided could be "ai-generated".'
    ),
  details: z
    .string()
    .optional()
    .describe('Optional brief details or elaboration for the node.'),
});

const EdgeSchema = z.object({
  sourceText: z
    .string()
    .describe(
      'The text label of the source node for this edge. Must match one of the generated node texts.'
    ),
  targetText: z
    .string()
    .describe(
      'The text label of the target node for this edge. Must match one of the generated node texts.'
    ),
  relationLabel: z
    .string()
    .describe(
      'A concise label describing the relationship (e.g., "leads to", "supports", "is part of").'
    ),
});

const GenerateQuickClusterOutputSchema = z.object({
  nodes: z
    .array(NodeSchema)
    .min(2)
    .max(4)
    .describe('An array of 2 to 4 generated concept nodes.'),
  edges: z
    .array(EdgeSchema)
    .max(2)
    .optional()
    .describe(
      'An optional array of 0 to 2 suggested edges connecting the generated nodes.'
    ),
});
export type GenerateQuickClusterOutput = z.infer<
  typeof GenerateQuickClusterOutputSchema
>;

export async function generateQuickCluster(
  input: GenerateQuickClusterInput
): Promise<GenerateQuickClusterOutput> {
  return generateQuickClusterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateQuickClusterPrompt',
  input: { schema: GenerateQuickClusterInputSchema },
  output: { schema: GenerateQuickClusterOutputSchema },
  prompt: `You are an AI assistant specialized in rapidly brainstorming and structuring ideas for concept maps.
Given a user's prompt or topic: "{{prompt}}"

Generate a small, focused cluster of 2 to 4 interconnected concept nodes.
Also, suggest 0 to 2 simple relationships (edges) between these generated nodes.

For each node, provide:
- "text": A concise label for the concept.
- "type" (optional): Suggest a relevant type like "key_concept", "question", "action_item", "data_point", or "general_idea".
- "details" (optional): A very brief description or elaboration for the node.

For each edge, provide:
- "sourceText": The exact text of one of the generated source nodes.
- "targetText": The exact text of one of the generated target nodes.
- "relationLabel": A brief label for the relationship (e.g., "supports", "explains", "leads to").

Ensure the output is a valid JSON object strictly adhering to the following structure:
{
  "nodes": [
    { "text": "Concept A", "type": "key_concept", "details": "Detail A" },
    { "text": "Concept B", "type": "question" }
  ],
  "edges": [
    { "sourceText": "Concept A", "targetText": "Concept B", "relationLabel": "raises question" }
  ]
}
If no edges are relevant, the "edges" array can be empty or omitted.
Keep node texts and edge labels concise.
Focus on directly relevant concepts to the prompt.
`,
});

const generateQuickClusterFlow = ai.defineFlow(
  {
    name: 'generateQuickClusterFlow',
    inputSchema: GenerateQuickClusterInputSchema,
    outputSchema: GenerateQuickClusterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    // Basic validation for node texts in edges
    if (output?.nodes && output.edges) {
      const nodeTexts = new Set(output.nodes.map((n) => n.text));
      output.edges = output.edges.filter(
        (edge) =>
          nodeTexts.has(edge.sourceText) && nodeTexts.has(edge.targetText)
      );
    }
    return output!;
  }
);
