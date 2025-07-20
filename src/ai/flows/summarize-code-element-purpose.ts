import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { DEFAULT_MODEL } from '../../config/genkit';
import * as z from 'zod';

export const SummarizeCodeElementPurposeInputSchema = z.object({
  code: z.string(),
  elementName: z.string(),
  elementType: z.enum(['function', 'class', 'variable']),
  filePath: z.string().optional(),
});

export const SummarizeCodeElementPurposeOutputSchema = z.object({
  summary: z.string(),
});

export const summarizeCodeElementPurposeFlow = defineFlow(
  {
    name: 'summarizeCodeElementPurposeFlow',
    inputSchema: SummarizeCodeElementPurposeInputSchema,
    outputSchema: SummarizeCodeElementPurposeOutputSchema,
  },
  async (input) => {
    const { code, elementName, elementType, filePath } = input;

    const prompt = `
      You are an expert at analyzing source code and explaining its purpose.
      Given the following code snippet for a ${elementType} named "${elementName}" from the file "${filePath || 'unknown'}", provide a concise, one-sentence summary of its primary role or responsibility.

      Code:
      \`\`\`
      ${code}
      \`\`\`

      Focus on what it *does* from a functional perspective.
      Example for a function: "This function authenticates a user by validating their credentials against the database."
      Example for a class: "This class manages the application's user state, including login and logout actions."

      Return your answer as a JSON object with the single key "summary".
    `;

    try {
      const llmResponse = await generate({
        model: DEFAULT_MODEL,
        prompt: prompt,
        output: {
          format: 'json',
          schema: SummarizeCodeElementPurposeOutputSchema,
        },
        config: {
          temperature: 0.2,
        },
      });

      const result = llmResponse.output();
      if (!result) {
        throw new Error('LLM returned no output for code summary.');
      }
      return { summary: result.summary };
    } catch (error) {
      console.error('Error summarizing code element:', error);
      return {
        summary: 'An error occurred while summarizing the code.',
      };
    }
  }
);
