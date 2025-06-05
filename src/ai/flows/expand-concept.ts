
'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding a concept by
 * generating additional related concepts, optionally using existing map context
 * and a user-provided refinement prompt.
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
  userRefinementPrompt: z.string().optional().describe('An optional user-provided prompt to further refine or guide the concept expansion.'),
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
  prompt: `You are an expert in concept mapping and knowledge expansion, adept at generating diverse and insightful related ideas.

Your task is to expand on the central concept: "{{concept}}"

{{#if existingMapContext.length}}
Consider the existing context of the map, which includes:
{{#each existingMapContext}}
- "{{this}}"
{{/each}}
Your goal is to suggest new concepts that are distinct from, yet complementary to, this existing context.
{{/if}}

{{#if userRefinementPrompt}}
Additionally, the user has provided the following refinement to guide the expansion. Please prioritize suggestions related to this:
"{{userRefinementPrompt}}"
{{/if}}

Please generate a list of 3 to 5 new, concise concepts that are closely related to "{{concept}}" and align with any user refinement provided. These new concepts should broaden understanding by offering a variety of the following:
- **Sub-components or specific examples** of "{{concept}}".
- **Implications or consequences** arising from "{{concept}}".
- **Related processes or next steps** associated with "{{concept}}".
- **Contrasting ideas or alternative perspectives** to "{{concept}}" (if applicable).
- **Prerequisites or foundational ideas** for "{{concept}}".
- **Analogies or metaphors** that clarify "{{concept}}".
- **Potential challenges or risks** associated with "{{concept}}".
- **Key questions** that "{{concept}}" raises.

Aim for variety in the types of suggestions.
The concepts should be distinct and offer clear avenues for further exploration.
Avoid suggesting concepts that are too similar to "{{concept}}" itself or to those already in existingMapContext.

Output strictly as a JSON object with a single key "newConcepts", where the value is an array of strings.
Example: {"newConcepts": ["Specific Example of Concept", "Key Implication", "Next Logical Step", "Alternative Viewpoint", "Foundational Prerequisite"]}
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

