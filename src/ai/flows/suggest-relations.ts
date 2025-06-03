
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
    z.string().describe('A concept, typically from an existing concept map.')
  ).min(1).describe('The list of concepts to suggest relationships between. Ideally 2 or more for meaningful suggestions.'),
});
export type SuggestRelationsInput = z.infer<typeof SuggestRelationsInputSchema>;

const SuggestRelationsOutputSchema = z.array(
  z.object({
    source: z.string().describe('The source concept from the input list.'),
    target: z.string().describe('The target concept from the input list.'),
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
  prompt: `You are an expert in conceptual analysis and identifying meaningful relationships between ideas.

  Given the following list of concepts, which may be from an existing concept map:
  {{#each concepts}}
  - {{this}}
  {{/each}}

  Your task is to suggest plausible relationships *between pairs of these concepts*.
  If fewer than two concepts are provided, explain that more concepts are needed for robust suggestions, but still attempt to provide any meaningful (even if trivial) relation if possible for a single concept (e.g., relating it to a general idea).
  For each suggested relationship, identify a source concept, a target concept, and a descriptive label for the relation (e.g., "causes", "is a type of", "part of", "influences", "leads to", "related to").
  Focus on the most direct and significant relationships.
  Return your output as a JSON array. Each element in the array should be an object with three keys: "source" (string), "target" (string), and "relation" (string).
  Example: [{"source": "Concept A", "target": "Concept B", "relation": "is a part of"}]
  If no meaningful relations can be suggested (e.g., only one unrelated concept provided), return an empty array.
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

