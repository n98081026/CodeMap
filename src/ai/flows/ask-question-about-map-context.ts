'use server';
/**
 * @fileOverview Flow to answer general questions about the entire concept map.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Define focused schemas for node and edge attributes to manage context size
const MapContextNodeSchema = z.object({
  id: z.string(),
  text: z.string().describe('The primary label or text content of the node.'),
  type: z
    .string()
    .describe(
      "The category or type of the node (e.g., 'class', 'function', 'concept')."
    ),
  details: z
    .string()
    .optional()
    .describe('Additional descriptive text for the node.'),
});

const MapContextEdgeSchema = z.object({
  source: z.string().describe('ID of the source node for this edge.'),
  target: z.string().describe('ID of the target node for this edge.'),
  label: z
    .string()
    .optional()
    .describe('Label describing the relationship of this edge.'),
});

// --- Input Schema ---
export const AskQuestionAboutMapContextInputSchema = z.object({
  nodes: z
    .array(MapContextNodeSchema)
    .describe('An array of key attributes for all nodes in the map.'),
  edges: z
    .array(MapContextEdgeSchema)
    .describe('An array of key attributes for all edges in the map.'),
  userQuestion: z
    .string()
    .describe("The user's question about the overall map context."),
  mapName: z
    .string()
    .optional()
    .describe('The name of the concept map, for context.'),
});
export type AskQuestionAboutMapContextInput = z.infer<
  typeof AskQuestionAboutMapContextInputSchema
>;

// --- Output Schema ---
export const AskQuestionAboutMapContextOutputSchema = z.object({
  answer: z
    .string()
    .describe("The AI-generated answer to the user's question about the map."),
  error: z
    .string()
    .optional()
    .describe('Error message if the question could not be answered.'),
});
export type AskQuestionAboutMapContextOutput = z.infer<
  typeof AskQuestionAboutMapContextOutputSchema
>;

// --- Prompt for LLM ---
const askQuestionAboutMapPrompt = ai.definePrompt({
  name: 'askQuestionAboutMapContextPrompt',
  input: { schema: AskQuestionAboutMapContextInputSchema },
  output: { schema: AskQuestionAboutMapContextOutputSchema },
  prompt: `You are an AI assistant skilled in analyzing and interpreting concept maps.
The user has provided a concept map{{#if mapName}} named "{{mapName}}"{{/if}} and has a question about it.

Here is the structure of the map:
Nodes (key elements or concepts):
{{#if nodes.length}}
{{#each nodes}}
- Node ID: {{this.id}}, Text: "{{this.text}}", Type: "{{this.type}}"{{#if this.details}}, Details: "{{this.details}}"{{/if}}
{{/each}}
{{else}}
(No nodes provided in the map context)
{{/if}}

Edges (relationships between nodes):
{{#if edges.length}}
{{#each edges}}
- Edge from Node ID {{this.source}} to Node ID {{this.target}}{{#if this.label}}, labeled: "{{this.label}}"{{/if}}.
{{/each}}
{{else}}
(No edges provided in the map context)
{{/if}}

User's Question about the map: "{{userQuestion}}"

Based on the ENTIRE map context provided (nodes and edges), please answer the user's question.
- Identify relevant nodes and relationships to formulate your answer.
- If the question implies comparing or relating multiple concepts, ensure your answer addresses that.
- If the question is about the overall structure or themes, provide a high-level response.
- Be concise yet comprehensive.
- If the provided map context is insufficient to answer the question thoroughly, clearly state that and explain what information might be missing or why it's ambiguous.
- Do not make assumptions or bring in external knowledge beyond the map's content.

Output strictly as a JSON object matching the specified output schema.
If you cannot answer, provide a helpful message in the 'answer' field and optionally use the 'error' field.
Example of insufficient context: {"answer": "Based on the provided map, I cannot determine [specifics of question]. The map might need more detail in certain areas or connections between relevant concepts."}
`,
});

// --- Genkit Flow ---
export const askQuestionAboutMapContextFlow = ai.defineFlow(
  {
    name: 'askQuestionAboutMapContextFlow',
    inputSchema: AskQuestionAboutMapContextInputSchema,
    outputSchema: AskQuestionAboutMapContextOutputSchema,
  },
  async (input) => {
    if (!input.userQuestion || input.userQuestion.trim() === '') {
      return {
        answer: 'No question was provided about the map.',
        error: 'User question is empty.',
      };
    }
    if (!input.nodes || input.nodes.length === 0) {
      return {
        answer:
          'The concept map is empty, so I cannot answer questions about it.',
        error: 'Map contains no nodes.',
      };
    }

    try {
      // Potentially truncate nodes/edges if they are excessively long for the context window,
      // though the prompt already asks for key attributes.
      // For now, we'll pass them as is, assuming the client-side filters them.
      const { output } = await askQuestionAboutMapPrompt(input);

      if (!output) {
        return {
          answer:
            'The AI was unable to generate an answer for your question about this map.',
          error: 'AI prompt output was null or undefined.',
        };
      }
      return output;
    } catch (e: any) {
      console.error('Error in askQuestionAboutMapContextFlow LLM call:', e);
      return {
        answer:
          'An error occurred while the AI was processing your question about the map.',
        error: `AI processing failed: ${e.message}`,
      };
    }
  }
);
