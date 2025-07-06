'use server';

/**
 * @fileOverview This file defines a Genkit flow for expanding a concept by
 * generating additional related concepts, optionally using existing map context
 * and a user-provided refinement prompt.
 * Expanded ideas are now returned as objects with text and an optional relation label.
 *
 * - expandConcept - A function that expands a given concept into
 *   additional, related concepts.
 * - ExpandConceptInput - The input type for the expandConcept function.
 * - ExpandConceptOutput - The return type for the expandConcept function.
 */

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

const ExpandConceptInputSchema = z.object({
  concept: z.string().describe('The concept to expand upon.'),
  existingMapContext: z
    .array(z.string())
    .optional()
    .describe(
      'Brief text of existing nodes in the map to provide context and guide the expansion.'
    ),
  userRefinementPrompt: z
    .string()
    .optional()
    .describe(
      'An optional user-provided prompt to further refine or guide the concept expansion.'
    ),
});
export type ExpandConceptInput = z.infer<typeof ExpandConceptInputSchema>;

const ExpandedIdeaSchema = z.object({
  text: z.string().describe('The text for the new expanded idea/node.'),
  relationLabel: z
    .string()
    .optional()
    .describe(
      "A brief label for the relationship from the parent concept to this new idea, e.g., 'leads to', 'example of', 'supports'. Default is 'related to' if not provided."
    ),
  reasoning: z
    .string()
    .optional()
    .describe(
      'A brief explanation for why this specific idea is suggested as an expansion, linking it to the parent concept or user prompt.'
    ),
});

const ExpandConceptOutputSchema = z.object({
  expandedIdeas: z
    .array(ExpandedIdeaSchema)
    .describe(
      'A list of new concepts (as objects with text, optional relationLabel, and optional reasoning) related to the input concept.'
    ),
});
export type ExpandConceptOutput = z.infer<typeof ExpandConceptOutputSchema>;

export async function expandConcept(
  input: ExpandConceptInput
): Promise<ExpandConceptOutput> {
  return expandConceptFlow(input);
}

const expandConceptPrompt = ai.definePrompt({
  name: 'expandConceptPrompt',
  input: { schema: ExpandConceptInputSchema },
  output: { schema: ExpandConceptOutputSchema },
  prompt: `You are an expert in concept mapping and knowledge expansion, adept at generating diverse and insightful related ideas.

Your task is to expand on the central concept: "{{concept}}"

{{#if existingMapContext.length}}
Consider the existing context of the map, which includes:
{{#each existingMapContext}}
- "{{this}}"
{{/each}}
Your goal is to suggest new ideas that are distinct from, yet complementary to, this existing context.
{{/if}}

{{#if userRefinementPrompt}}
Additionally, the user has provided the following refinement to guide the expansion. Please prioritize suggestions related to this:
"{{userRefinementPrompt}}"
{{/if}}

Please generate a list of 3 to 5 new, concise ideas that are closely related to "{{concept}}" and align with any user refinement provided.
For each idea, provide:
1.  "text": The main text for the new idea/node.
2.  "relationLabel" (optional): A brief, action-oriented label describing how this new idea relates to the original "{{concept}}" (e.g., "supports", "example of", "leads to", "challenges"). If no specific relation is obvious, you can omit this or use a generic like "related to".
3.  "reasoning" (optional): A short explanation (1 sentence) for why this idea is a relevant expansion of "{{concept}}", especially if it addresses the userRefinementPrompt or clarifies its connection.

These new ideas should broaden understanding by offering a variety of the following:
- **Sub-components or specific examples** of "{{concept}}".
- **Implications or consequences** arising from "{{concept}}".
- **Related processes or next steps** associated with "{{concept}}".
- **Contrasting ideas or alternative perspectives** to "{{concept}}" (if applicable).
- **Prerequisites or foundational ideas** for "{{concept}}".
- **Key questions** that "{{concept}}" raises.

Aim for variety in the types of suggestions.
The ideas should be distinct and offer clear avenues for further exploration.
Avoid suggesting ideas that are too similar to "{{concept}}" itself or to those already in existingMapContext.

Output strictly as a JSON object with a single key "expandedIdeas", where the value is an array of objects, each having "text", optionally "relationLabel", and optionally "reasoning".
Example:
{
  "expandedIdeas": [
    { "text": "Specific Example of Concept", "relationLabel": "is an example of", "reasoning": "Provides a concrete instance of the parent concept." },
    { "text": "Key Implication", "relationLabel": "results in", "reasoning": "Highlights a direct consequence of the concept." },
    { "text": "Next Logical Step", "reasoning": "Suggests a process that typically follows from this concept." },
    { "text": "Alternative Viewpoint", "relationLabel": "contrasts with", "reasoning": "Offers a different perspective for broader understanding." }
  ]
}
  `,
});

const expandConceptFlow = ai.defineFlow(
  {
    name: 'expandConceptFlow',
    inputSchema: ExpandConceptInputSchema,
    outputSchema: ExpandConceptOutputSchema,
  },
  async (input) => {
    const { output } = await expandConceptPrompt(input);
    return output!;
  }
);
