
// src/ai/flows/extract-concepts.ts
'use server';
/**
 * @fileOverview A flow that extracts key concepts from a given text and returns them.
 *
 * - extractConcepts - A function that extracts key concepts from text.
 * - ExtractConceptsInput - The input type for the extractConcepts function.
 * - ExtractConceptsOutput - The return type for the extractConcepts function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractConceptsInputSchema = z.object({
  text: z.string().describe('The text to extract concepts from.'),
});
export type ExtractConceptsInput = z.infer<typeof ExtractConceptsInputSchema>;

const ExtractConceptsOutputSchema = z.object({
  concepts: z.array(z.string()).describe('The key concepts extracted from the text.'),
});
export type ExtractConceptsOutput = z.infer<typeof ExtractConceptsOutputSchema>;

export async function extractConcepts(input: ExtractConceptsInput): Promise<ExtractConceptsOutput> {
  return extractConceptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractConceptsPrompt',
  input: {schema: ExtractConceptsInputSchema},
  output: {schema: ExtractConceptsOutputSchema},
  prompt: `You are an expert at identifying and extracting core concepts and key entities from text. Your task is to distill the most significant nouns or short noun phrases that represent the central ideas of the provided text.

Please analyze the following text:
{{{text}}}

Identify 3 to 7 of the most important key concepts.
These concepts should be:
- **Concise:** Preferably 1-4 words.
- **Significant:** Central to understanding the text's main themes.
- **Specific:** Avoid overly generic terms (e.g., "system", "process", "data") unless they are highly contextualized and crucial.

Return your output as a JSON object with a single key "concepts", where the value is an array of strings.
Example: {"concepts": ["User Authentication Flow", "API Rate Limiting", "Data Encryption Standard"]}
  `,
});

const extractConceptsFlow = ai.defineFlow(
  {
    name: 'extractConceptsFlow',
    inputSchema: ExtractConceptsInputSchema,
    outputSchema: ExtractConceptsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

