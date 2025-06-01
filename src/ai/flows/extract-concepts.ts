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
  prompt: `You are an expert at identifying key concepts in text.

  Please read the following text and identify the key concepts. Return them as a JSON array of strings.

  Text: {{{text}}}`,
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
