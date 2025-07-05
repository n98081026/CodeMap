// src/ai/flows/extract-concepts.ts
'use server';
/**
 * @fileOverview A flow that extracts key concepts from a given text and returns them.
 *
 * - extractConcepts - A function that extracts key concepts from text.
 * - ExtractConceptsInput - The input type for the extractConcepts function.
 * - ExtractConceptsOutput - The return type for the extractConcepts function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExtractConceptsInputSchema = z.object({
  text: z.string().describe('The text to extract concepts from.'),
});
export type ExtractConceptsInput = z.infer<typeof ExtractConceptsInputSchema>;

// Updated output schema to include context/reason for each concept
const ExtractedConceptItemSchema = z.object({
  concept: z.string().describe('The extracted key concept or entity.'),
  context: z
    .string()
    .optional()
    .describe(
      'A brief explanation or the surrounding text snippet that justifies why this concept is important or where it was found.'
    ),
  source: z
    .string()
    .optional()
    .describe(
      'Optional: The specific part of the input text (e.g., a sentence or phrase) from which the concept was most directly extracted, if easily identifiable.'
    ),
});
export type ExtractedConceptItem = z.infer<typeof ExtractedConceptItemSchema>;

const ExtractConceptsOutputSchema = z.object({
  concepts: z
    .array(ExtractedConceptItemSchema)
    .describe(
      'The key concepts extracted from the text, each with optional context/source.'
    ),
});
export type ExtractConceptsOutput = z.infer<typeof ExtractConceptsOutputSchema>;

export async function extractConcepts(
  input: ExtractConceptsInput
): Promise<ExtractConceptsOutput> {
  return extractConceptsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractConceptsPrompt',
  input: { schema: ExtractConceptsInputSchema },
  output: { schema: ExtractConceptsOutputSchema },
  prompt: `You are an expert at identifying and extracting core concepts and key entities from text. Your task is to distill the most significant nouns or short noun phrases that represent the central ideas of the provided text.

Please analyze the following text:
{{{text}}}

Identify 3 to 7 of the most important key concepts.
For each concept, provide:
- "concept": The concise key concept (preferably 1-4 words).
- "context": A brief (1-2 sentences) explanation of why this concept is significant in the given text or the immediate context from which it was derived.
- "source": (Optional) The specific sentence or short phrase from the input text where this concept is most prominently featured or defined.

These concepts should be:
- **Significant:** Central to understanding the text's main themes.
- **Specific:** Avoid overly generic terms (e.g., "system", "process", "data") unless they are highly contextualized and crucial.

Return your output as a JSON object with a single key "concepts", where the value is an array of objects, each containing "concept", "context", and optionally "source".
Example: {
  "concepts": [
    {"concept": "User Authentication Flow", "context": "This describes the multi-step process for verifying user identity.", "source": "The User Authentication Flow involves password checking and MFA."},
    {"concept": "API Rate Limiting", "context": "A critical security measure to prevent abuse of the API services.", "source": "API Rate Limiting is implemented to ensure fair usage."},
    {"concept": "Data Encryption Standard", "context": "Refers to the specific cryptographic standard used for protecting sensitive data.", "source": "All stored passwords use the Data Encryption Standard."}
  ]
}
  `,
});

const extractConceptsFlow = ai.defineFlow(
  {
    name: 'extractConceptsFlow',
    inputSchema: ExtractConceptsInputSchema,
    outputSchema: ExtractConceptsOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
