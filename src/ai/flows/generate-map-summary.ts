import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { ConceptMapNodeSchema, ConceptMapEdgeSchema } from '@/types/zodSchemas'; // Assuming these will be created or exist

// --- Input Schema ---
const MapDataSchema = z.object({
  nodes: z
    .array(ConceptMapNodeSchema)
    .describe(
      'Array of nodes in the concept map. Each node has an id, text (label/content), type, and optional details.'
    ),
  edges: z
    .array(ConceptMapEdgeSchema)
    .describe(
      'Array of edges connecting the nodes. Each edge specifies a source and target node ID, and an optional label.'
    ),
});

export const GenerateMapSummaryInputSchema = MapDataSchema;
export type GenerateMapSummaryInput = z.infer<
  typeof GenerateMapSummaryInputSchema
>;

// --- Output Schema ---
export const GenerateMapSummaryOutputSchema = z.object({
  summary: z
    .string()
    .describe(
      'A concise, human-readable summary of the concept map, highlighting key components/clusters and their relationships. Should be 2-3 paragraphs.'
    ),
  error: z
    .string()
    .optional()
    .describe('Error message if the summary generation failed.'),
});
export type GenerateMapSummaryOutput = z.infer<
  typeof GenerateMapSummaryOutputSchema
>;

// --- Prompt for LLM ---
const generateSummaryPrompt = ai.definePrompt({
  name: 'generateMapSummaryPrompt',
  input: { schema: GenerateMapSummaryInputSchema },
  output: { schema: GenerateMapSummaryOutputSchema },
  prompt: `You are an expert analyst tasked with summarizing a concept map.
Given the following concept map data:

Nodes:
{{#each nodes}}
- ID: {{this.id}}, Label: "{{this.text}}", Type: {{this.type}}{{#if this.details}}, Details: "{{this.details}}"{{/if}}
{{/each}}

Edges:
{{#each edges}}
- From: {{this.source}} To: {{this.target}}{{#if this.label}}, Label: "{{this.label}}"{{/if}}
{{/each}}

Please generate a concise (2-3 paragraphs) human-readable summary of this concept map.
Your summary should:
1. Identify the main purpose or central theme of the map, if discernible.
2. Highlight key components, concepts, or clusters of nodes. Consider nodes with many connections or unique types as potentially important.
3. Describe the overall structure and the main relationships between these key components.
4. Use plain language, avoiding overly technical jargon where possible. Imagine you are explaining this map to someone unfamiliar with its specific content but who needs to understand its essence.

If the map is very small or lacks clear structure, provide a brief description of what is present.
If the map data is empty or insufficient for a meaningful summary, set the 'error' field in the output and provide a very brief 'summary' stating that a summary could not be generated due to lack of content.

Output strictly as a JSON object matching the specified output schema.
Focus on clarity and conciseness.
`,
});

// --- Genkit Flow ---
export const generateMapSummaryFlow = ai.defineFlow(
  {
    name: 'generateMapSummaryFlow',
    inputSchema: GenerateMapSummaryInputSchema,
    outputSchema: GenerateMapSummaryOutputSchema,
  },
  async (input) => {
    if (!input.nodes || input.nodes.length === 0) {
      return {
        summary: 'Cannot generate summary: The concept map is empty.',
        error: 'The concept map contains no nodes.',
      };
    }

    // Basic check for minimal content
    if (input.nodes.length < 2 && input.edges.length === 0) {
      return {
        summary:
          'The concept map is very small, containing only one isolated node. It represents a single concept: ' +
          input.nodes[0].text,
        error: 'Map too small for detailed summary, contains only one node.',
      };
    }

    try {
      const { output } = await generateSummaryPrompt(input);

      if (!output) {
        return {
          summary: 'AI failed to generate a summary for this map.',
          error: 'AI prompt output was null or undefined.',
        };
      }
      return output;
    } catch (e: any) {
      console.error('Error in generateMapSummaryFlow LLM call:', e);
      return {
        summary: 'An error occurred while AI was generating the map summary.',
        error: `AI summary generation failed: ${e.message}`,
      };
    }
  }
);
