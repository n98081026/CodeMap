// src/ai/flows/rewrite-node-content-logic.ts
// Original filename was rewrite-node-content-flow.ts
'use server';
/**
 * @fileOverview A Genkit flow to rewrite node content based on a target tone.
 *
 * - rewriteNodeContent - Function to handle the content rewriting.
 * - RewriteNodeContentInputSchema - Input schema for the flow.
 * - RewriteNodeContentOutputSchema - Output schema for the flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

export const RewriteNodeContentInputSchema = z.object({
  currentText: z.string().describe('The current text content of the concept map node.'),
  currentDetails: z.string().optional().describe('Optional current detailed description of the node.'),
  targetTone: z.enum([
    "formal", 
    "casual", 
    "concise", 
    "elaborate", 
    "humorous", 
    "professional", 
    "simple"
  ]).describe('The desired tone for the rewritten content.'),
});
export type RewriteNodeContentInput = z.infer<typeof RewriteNodeContentInputSchema>;

export const RewriteNodeContentOutputSchema = z.object({
  rewrittenText: z.string().describe('The AI-rewritten text content for the node.'),
  rewrittenDetails: z.string().optional().describe('Optional AI-rewritten detailed description for the node.'),
});
export type RewriteNodeContentOutput = z.infer<typeof RewriteNodeContentOutputSchema>;

export async function rewriteNodeContent(input: RewriteNodeContentInput): Promise<RewriteNodeContentOutput> {
  return rewriteNodeContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteNodeContentPrompt',
  input: {schema: RewriteNodeContentInputSchema},
  output: {schema: RewriteNodeContentOutputSchema},
  prompt: `You are an expert AI assistant specializing in refining and rewriting text to match specific tones.
A user wants to rewrite the content of a concept map node.

Current Node Content:
Text: "{{currentText}}"
{{#if currentDetails}}
Details: "{{currentDetails}}"
{{/if}}

Target Tone: {{targetTone}}

Your task is to rewrite both the "Text" and "Details" (if provided) to reflect the "{{targetTone}}" tone.
- If the original Details are empty or not provided, you should still attempt to generate new "rewrittenDetails" if appropriate for the tone and the rewrittenText, or leave it empty if not applicable.
- The "rewrittenText" should be a concise label, suitable for a concept map node.
- The "rewrittenDetails" can be a more elaborate explanation or elaboration.
- Ensure the core meaning of the original content is preserved as much as possible, unless the tone explicitly requires a shift in emphasis (e.g., "humorous" might exaggerate).

Output strictly as a JSON object with keys "rewrittenText" and optionally "rewrittenDetails".
Example for a "concise" tone:
{
  "rewrittenText": "Auth System",
  "rewrittenDetails": "Manages user login and sessions."
}
Example for an "elaborate" and "formal" tone:
{
  "rewrittenText": "User Authentication Protocol Implementation",
  "rewrittenDetails": "This module is responsible for the comprehensive management of user authentication, encompassing credential verification, session establishment, and secure token handling in accordance with industry best practices."
}
`,
});

const rewriteNodeContentFlow = ai.defineFlow(
  {
    name: 'rewriteNodeContentFlow', // Flow name can remain the same for Genkit's internal tracking
    inputSchema: RewriteNodeContentInputSchema,
    outputSchema: RewriteNodeContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

