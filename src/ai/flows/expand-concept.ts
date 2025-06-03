
'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding a concept by
 * generating additional related concepts, optionally using existing map context.
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
  existingMapContext: z.array(z.string()).optional().describe('Brief text of existing nodes in the map to provide context and guide the expansion.'),
  // context field removed as existingMapContext is more specific
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
  prompt: `You are an expert in concept mapping and knowledge expansion. Your goal is to help users explore ideas related to a central concept.

  Given the concept: "{{concept}}"
  {{#if existingMapContext.length}}
  And the current map already contains concepts like:
  {{#each existingMapContext}}
  - "{{this}}"
  {{/each}}
  Please generate a list of 5 to 7 new, concise concepts that are closely related to the input concept AND complement or extend the existing map context.
  {{else}}
  Please generate a list of 5 to 7 new, concise concepts that are closely related to the input concept.
  {{/if}}

  These new concepts should broaden the understanding and scope of the original concept, offering diverse yet relevant avenues for further exploration.
  Focus on concepts that would logically connect to or elaborate on "{{concept}}" given the surrounding map elements if context is provided.
  Ensure your output is a JSON object containing a single key "newConcepts" whose value is an array of strings. For example: {"newConcepts": ["related idea 1", "related idea 2"]}.
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

