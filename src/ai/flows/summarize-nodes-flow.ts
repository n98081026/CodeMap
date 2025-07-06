// src/ai/flows/summarize-nodes-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to summarize the content of multiple concept map nodes.
 *
 * - summarizeNodes - Function to handle the summarization. (Renamed from summarizeNodesFlow for clarity)
 * - SummarizeNodesInput - Input type for the flow.
 * - SummarizeNodesOutput - Output type for the flow.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const SummarizeNodesInputSchema = z.object({
  nodeContents: z
    .array(z.string().min(1, { message: 'Node content cannot be empty.' }))
    .min(1, {
      message: 'At least one node content is required for summarization.',
    })
    .describe('An array of text content from the selected concept map nodes.'),
});
export type SummarizeNodesInput = z.infer<typeof SummarizeNodesInputSchema>;

const SummarizeNodesOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of all provided node contents.'),
});
export type SummarizeNodesOutput = z.infer<typeof SummarizeNodesOutputSchema>;

export async function summarizeNodes(
  input: SummarizeNodesInput
): Promise<SummarizeNodesOutput> {
  return summarizeNodesInternalFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeNodesPrompt',
  input: { schema: SummarizeNodesInputSchema },
  output: { schema: SummarizeNodesOutputSchema },
  prompt: `You are an AI assistant skilled at synthesizing information.
Given the following text content from multiple concept map nodes:
{{#each nodeContents}}
- "{{this}}"
{{/each}}

Your task is to generate a concise summary that captures the main themes and relationships present across all these nodes. The summary should be a single, coherent paragraph.
Aim for a summary that is easy to understand and highlights the collective meaning of the selected nodes.

Output strictly as a JSON object with a single key "summary".
Example:
{
  "summary": "The selected nodes discuss the core components of a user authentication system, including password hashing for security, JWTs for session management, and role-based access control to manage permissions effectively."
}
`,
});

const summarizeNodesInternalFlow = ai.defineFlow(
  // Renamed internal flow variable
  {
    name: 'summarizeNodesFlow', // Genkit flow name can remain for Dev UI consistency
    inputSchema: SummarizeNodesInputSchema,
    outputSchema: SummarizeNodesOutputSchema,
  },
  async (input) => {
    if (input.nodeContents.length === 0) {
      return { summary: 'No content provided for summarization.' };
    }
    const { output } = await prompt(input);
    return output!;
  }
);
