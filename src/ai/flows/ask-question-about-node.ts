
// src/ai/flows/ask-question-about-node.ts
'use server';
/**
 * @fileOverview A Genkit flow to answer a user's question about a specific concept map node.
 *
 * - askQuestionAboutNode - A function that handles answering the question.
 * - AskQuestionAboutNodeInput - The input type for the function.
 * - AskQuestionAboutNodeOutput - The return type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AskQuestionAboutNodeInputSchema = z.object({
  nodeText: z.string().describe('The main text/label of the concept map node.'),
  nodeDetails: z.string().optional().describe('Optional additional details or description associated with the node.'),
  question: z.string().describe("The user's question about this node."),
});
export type AskQuestionAboutNodeInput = z.infer<typeof AskQuestionAboutNodeInputSchema>;

const AskQuestionAboutNodeOutputSchema = z.object({
  answer: z.string().describe('The AI-generated answer to the question.'),
});
export type AskQuestionAboutNodeOutput = z.infer<typeof AskQuestionAboutNodeOutputSchema>;

export async function askQuestionAboutNode(input: AskQuestionAboutNodeInput): Promise<AskQuestionAboutNodeOutput> {
  return askQuestionAboutNodeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askQuestionAboutNodePrompt',
  input: {schema: AskQuestionAboutNodeInputSchema},
  output: {schema: AskQuestionAboutNodeOutputSchema},
  prompt: `You are a helpful AI assistant. A user is looking at a concept map node and has a question.

Node Information:
- Text/Label: "{{nodeText}}"
{{#if nodeDetails}}
- Details: "{{nodeDetails}}"
{{/if}}

User's Question: "{{question}}"

Please provide a concise and helpful answer to the user's question based on the node information provided. If the node information is insufficient, you may use general knowledge to supplement your answer, but clearly indicate if you are doing so.
Keep the answer focused and directly relevant to the question and the node's content.
Format your output as a JSON object with a single key "answer".
Example: {"answer": "The node seems to represent X, which relates to Y because of Z."}
`,
});

const askQuestionAboutNodeFlow = ai.defineFlow(
  {
    name: 'askQuestionAboutNodeFlow',
    inputSchema: AskQuestionAboutNodeInputSchema,
    outputSchema: AskQuestionAboutNodeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

