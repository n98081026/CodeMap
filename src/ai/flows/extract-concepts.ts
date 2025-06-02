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
  prompt: `You are an expert at identifying key concepts and entities from text. Your task is to extract the most significant nouns or noun phrases that represent the core ideas.

  Please analyze the following text and identify the 5-10 most important key concepts.
  Avoid overly granular or trivial concepts. Focus on terms that are central to understanding the text's main themes.
  Return your output as a JSON object with a single key "concepts" whose value is an array of strings. For example: {"concepts": ["main idea A", "significant entity B"]}.

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
