'use server';

/**
 * @fileOverview AI agent that suggests relationships between concepts in a concept map.
 *
 * - suggestRelations - A function that suggests relations between provided concepts.
 * - SuggestRelationsInput - The input type for the suggestRelations function.
 * - SuggestRelationsOutput - The return type for the suggestRelations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelationsInputSchema = z.object({
  concepts: z.array(
    z.string().describe('A concept in the concept map.')
  ).describe('The concepts to suggest relationships between.'),
});
export type SuggestRelationsInput = z.infer<typeof SuggestRelationsInputSchema>;

const SuggestRelationsOutputSchema = z.array(
  z.object({
    source: z.string().describe('The source concept.'),
    target: z.string().describe('The target concept.'),
    relation: z.string().describe('The suggested relation between the source and target concepts.'),
  }).describe('A suggested relation between two concepts.')
).describe('The suggested relations between the concepts.');
export type SuggestRelationsOutput = z.infer<typeof SuggestRelationsOutputSchema>;

export async function suggestRelations(input: SuggestRelationsInput): Promise<SuggestRelationsOutput> {
  return suggestRelationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelationsPrompt',
  input: {schema: SuggestRelationsInputSchema},
  output: {schema: SuggestRelationsOutputSchema},
  prompt: `You are an expert in identifying relationships between concepts.

  Given the following concepts, suggest relations between them.  The output should be a JSON array where each element is an object containing a source concept, a target concept, and a relation describing the relationship between them.

  Concepts:
  {{#each concepts}}
  - {{this}}
  {{/each}}
  `,
});

const suggestRelationsFlow = ai.defineFlow(
  {
    name: 'suggestRelationsFlow',
    inputSchema: SuggestRelationsInputSchema,
    outputSchema: SuggestRelationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
