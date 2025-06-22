
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
    reason: z.string().optional().describe('A brief explanation of why this relationship is suggested, based on the concepts provided.'),
  }).describe('A suggested relation between two concepts, including a reason.')
).describe('The suggested relations between the concepts.');
export type SuggestRelationsOutput = z.infer<typeof SuggestRelationsOutputSchema>;

export async function suggestRelations(input: SuggestRelationsInput): Promise<SuggestRelationsOutput> {
  return suggestRelationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelationsPrompt',
  input: {schema: SuggestRelationsInputSchema},
  output: {schema: SuggestRelationsOutputSchema},
  prompt: `You are an expert in conceptual analysis, skilled at identifying meaningful and diverse relationships between ideas.

Given the following list of concepts from a concept map:
{{#each concepts}}
- "{{this}}"
{{/each}}

Your task is to suggest 3 to 5 of the most plausible and insightful relationships *between pairs of these exact concepts*.
The source and target of each relationship MUST be one of the concepts provided in the list above. Do not introduce new concepts.

For each suggested relationship, provide:
- "source": The source concept (must be from the input list).
- "target": The target concept (must be from the input list, and different from the source).
- "relation": A concise, descriptive label for the relationship (e.g., "causes", "is a type of", "supports", "depends on", "leads to", "contrasts with").
- "reason": A brief (1-2 sentences) explanation for why this relationship is suggested, considering the potential meaning and interaction of the source and target concepts. For example, if suggesting "Database Security" is critical for "User Authentication", the reason could be "User authentication relies on secure storage of credentials, making database security a foundational requirement."

Prioritize relationships that highlight key interactions, dependencies, or classifications. Aim for a variety of relationship types if possible.
If fewer than two concepts are provided, or if no meaningful relationships can be formed between the given concepts, return an empty array.

Output strictly as a JSON array of objects.
Example: [{"source": "User Authentication", "target": "JWT", "relation": "uses", "reason": "JWTs are commonly used as a mechanism for securely transmitting information between parties during user authentication."}, {"source": "Database Security", "target": "User Authentication", "relation": "is critical for", "reason": "User authentication relies on secure storage of credentials, making database security a foundational requirement."}]
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
