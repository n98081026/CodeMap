import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { DEFAULT_MODEL } from '../../config/genkit';
import * as z from 'zod';

export const SummarizeGenericFileInputSchema = z.object({
  fileContent: z.string().min(10), // Require some content
});

export const SummarizeGenericFileOutputSchema = z.object({
  summary: z.string(),
});

export const summarizeGenericFileFlow = defineFlow(
  {
    name: 'summarizeGenericFileFlow',
    inputSchema: SummarizeGenericFileInputSchema,
    outputSchema: SummarizeGenericFileOutputSchema,
    authPolicy: (auth, input) => {},
  },
  async (input) => {
    const { fileContent } = input;

    const prompt = `
      You are an expert code and text analyst.
      Analyze the following file content and provide a concise, one-paragraph summary (3-5 sentences) of its primary purpose and functionality.
      Focus on the high-level goal of the file. For code, this means what it does, not a line-by-line explanation. For text, it means the main argument or topic.
      Do not describe the code structure (e.g., "it imports X, defines Y"). Instead, explain the 'what' and 'why'.

      File Content to Summarize:
      \`\`\`
      ${fileContent.substring(0, 10000)}
      \`\`\`

      Return your answer as a JSON object with the single key "summary".
    `;

    try {
      const llmResponse = await generate(
        {
          model: DEFAULT_MODEL,
          prompt: prompt,
          output: {
            format: 'json',
            schema: SummarizeGenericFileOutputSchema,
          },
          config: {
            temperature: 0.2,
          },
        }
      );

      const result = llmResponse.output;
      if (!result) {
        throw new Error('LLM returned no output for summary.');
      }
      return { summary: result.summary };
    } catch (error) {
      console.error('Error summarizing generic file:', error);
      // Return a generic error summary
      return {
        summary: 'An error occurred while summarizing the file content.',
      };
    }
  }
);
