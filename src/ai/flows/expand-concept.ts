'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding a concept by
 * generating additional related concepts.
 *
 * - expandConcept - A function that expands a given concept into
 *   additional, related concepts.
 * - ExpandConceptInput - The input type for the expandConcept function.
 * - ExpandConceptOutput - The return type for the expandConcept function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExpandConceptInputSchema = z.object({
  concept: z
    .string()
    .describe('The concept to expand upon.'),
  context: z.string().optional().describe('Additional context for the concept.'),
});
export type ExpandConceptInput = z.infer<typeof ExpandConceptInputSchema>;

const ExpandConceptOutputSchema = z.object({
  newConcepts: z.array(
    z.string().describe('A list of new concepts related to the input concept.')
  ),
});
export type ExpandConceptOutput = z.infer<typeof ExpandConceptOutputSchema>;

export async function expandConcept(input: ExpandConceptInput): Promise<ExpandConceptOutput> {
  return expandConceptFlow(input);
}

const expandConceptPrompt = ai.definePrompt({
  name: 'expandConceptPrompt',
  input: {schema: ExpandConceptInputSchema},
  output: {schema: ExpandConceptOutputSchema},
  prompt: `You are an expert in concept mapping and knowledge expansion.

  Given the concept: "{{concept}}"
  {{#if context}}
  And the context: "{{context}}"
  {{/if}}

  Generate a list of new concepts that are closely related to the input concept.
  These concepts should help to expand the understanding and scope of the original concept.
  Return the concepts as a JSON array of strings.
  `,
});

const expandConceptFlow = ai.defineFlow(
  {
    name: 'expandConceptFlow',
    inputSchema: ExpandConceptInputSchema,
    outputSchema: ExpandConceptOutputSchema,
  },
  async input => {
    const {output} = await expandConceptPrompt(input);
    return output!;
  }
);
