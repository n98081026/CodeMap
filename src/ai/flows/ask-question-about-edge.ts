'use server';
/**
 * @fileOverview Flow to answer questions about a specific edge and its connected nodes.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// --- Input Schema ---
export const AskQuestionAboutEdgeInputSchema = z.object({
  sourceNodeId: z.string().describe('ID of the source node.'),
  sourceNodeText: z.string().describe('Text/label of the source node.'),
  sourceNodeDetails: z
    .string()
    .optional()
    .describe('Optional details or description of the source node.'),
  targetNodeId: z.string().describe('ID of the target node.'),
  targetNodeText: z.string().describe('Text/label of the target node.'),
  targetNodeDetails: z
    .string()
    .optional()
    .describe('Optional details or description of the target node.'),
  edgeId: z.string().describe('ID of the edge.'),
  edgeLabel: z
    .string()
    .optional()
    .describe('Optional label of the edge describing the relationship.'),
  userQuestion: z
    .string()
    .describe("The user's question about this edge and its context."),
});
export type AskQuestionAboutEdgeInput = z.infer<
  typeof AskQuestionAboutEdgeInputSchema
>;

// --- Output Schema ---
export const AskQuestionAboutEdgeOutputSchema = z.object({
  answer: z
    .string()
    .describe("The AI-generated answer to the user's question."),
  error: z
    .string()
    .optional()
    .describe('Error message if the question could not be answered.'),
});
export type AskQuestionAboutEdgeOutput = z.infer<
  typeof AskQuestionAboutEdgeOutputSchema
>;

// --- Prompt for LLM ---
const askQuestionAboutEdgePrompt = ai.definePrompt({
  name: 'askQuestionAboutEdgePrompt',
  input: { schema: AskQuestionAboutEdgeInputSchema },
  output: { schema: AskQuestionAboutEdgeOutputSchema },
  prompt: `You are a helpful AI assistant. A user is asking a question about a specific relationship (an edge) between two concepts (nodes) in a concept map.
Context:
- Source Node (ID: {{sourceNodeId}}): "{{sourceNodeText}}"
  {{#if sourceNodeDetails}}Details: "{{sourceNodeDetails}}"{{/if}}
- Target Node (ID: {{targetNodeId}}): "{{targetNodeText}}"
  {{#if targetNodeDetails}}Details: "{{targetNodeDetails}}"{{/if}}
- Relationship (Edge ID: {{edgeId}} connecting them){{#if edgeLabel}} is labeled: "{{edgeLabel}}"{{else}} has no specific label{{/if}}.

User's Question: "{{userQuestion}}"

Based ONLY on the provided context of these two nodes and their connecting relationship, please answer the user's question.
Be concise and directly address the question. If the context is insufficient to answer the question, clearly state that.
Do not make assumptions or bring in external knowledge beyond what's given about these nodes and the edge.

Output strictly as a JSON object matching the specified output schema. If you cannot answer, provide a helpful message in the 'answer' field and optionally use the 'error' field.
Example of insufficient context response: {"answer": "I cannot answer that question based on the information provided about these two nodes and their connection. The details might be elsewhere in the map or not available."}
`,
});

// --- Genkit Flow ---
export const askQuestionAboutEdgeFlow = ai.defineFlow(
  {
    name: 'askQuestionAboutEdgeFlow',
    inputSchema: AskQuestionAboutEdgeInputSchema,
    outputSchema: AskQuestionAboutEdgeOutputSchema,
  },
  async (input) => {
    if (!input.userQuestion || input.userQuestion.trim() === '') {
      return {
        answer: 'No question was provided.',
        error: 'User question is empty.',
      };
    }

    try {
      const { output } = await askQuestionAboutEdgePrompt(input);

      if (!output) {
        return {
          answer:
            'The AI was unable to generate an answer for your question about this edge.',
          error: 'AI prompt output was null or undefined.',
        };
      }
      return output;
    } catch (e: any) {
      console.error('Error in askQuestionAboutEdgeFlow LLM call:', e);
      return {
        answer:
          'An error occurred while the AI was processing your question about this edge.',
        error: `AI processing failed: ${e.message}`,
      };
    }
  }
);
