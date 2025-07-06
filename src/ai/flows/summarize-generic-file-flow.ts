import { defineFlow, runFlow } from '@genkit-ai/flow';
import { modelos } from 'generative-ai'; // Assuming 'modelos' is your configured Genkit model provider
import { z } from 'zod';

// import { projectAnalysisToolSchema } from './project-analysis-flow'; // Removed unused import
import { projectAnalysisToolSchema } from './project-analysis-flow'; // Assuming this is where common schemas might live, or create a new one

export const SummarizeGenericFileInputSchema = z.object({
  fileName: z.string().describe('The name of the file to be summarized.'),
  fileContentSnippet: z
    .string()
    .describe(
      'A snippet of the file content (e.g., first N lines or M characters).'
    ),
  fileType: z
    .string()
    .optional()
    .describe(
      'The identified type of the file (e.g., dockerfile, shell_script, xml_config). This helps the LLM tailor the summary.'
    ),
});
type SummarizeGenericFileInput = z.infer<
  typeof SummarizeGenericFileInputSchema
>;

export const SummarizeGenericFileOutputSchema = z.object({
  summary: z
    .string()
    .describe("A brief summary of the file's purpose or key content."),
  error: z
    .string()
    .optional()
    .describe('Any error that occurred during summarization.'),
});
type SummarizeGenericFileOutput = z.infer<
  typeof SummarizeGenericFileOutputSchema
>;

export const summarizeGenericFileFlow = defineFlow(
  {
    name: 'summarizeGenericFileFlow',
    inputSchema: SummarizeGenericFileInputSchema,
    outputSchema: SummarizeGenericFileOutputSchema,
  },
  async (input: SummarizeGenericFileInput) => {
    const { fileName, fileContentSnippet, fileType } = input;

    if (!fileContentSnippet.trim()) {
      return {
        summary: `File '${fileName}' appears to be empty or contains only whitespace.`,
        error: 'Empty content snippet.',
      };
    }

    const prompt = `
      Analyze the following file snippet and provide a concise, one-sentence summary of its primary purpose or key content.
      File Name: ${fileName}
      ${fileType ? `Identified File Type: ${fileType}` : ''}

      Content Snippet (first 100 lines or 4000 characters):
      \`\`\`
      ${fileContentSnippet}
      \`\`\`

      Summary (one sentence):
    `;

    try {
      const llmResponse = await modelos.generate({
        prompt: prompt,
        temperature: 0.2, // Lower temperature for more factual summary
        maxOutputTokens: 100, // Max length for the summary sentence
        stopSequences: ['\n\n'], // Stop if it tries to generate more paragraphs
      });

      const summaryText = llmResponse.text()?.trim();

      if (!summaryText) {
        return {
          summary: `Could not generate a summary for '${fileName}'. The AI response was empty.`,
          error: 'Empty AI response.',
        };
      }

      return { summary: summaryText };
    } catch (err: any) {
      console.error(
        `[summarizeGenericFileFlow] Error summarizing ${fileName}:`,
        err
      );
      return {
        summary: `Failed to generate summary for '${fileName}'.`,
        error:
          err.message ||
          'An unexpected error occurred during AI summarization.',
      };
    }
  }
);

// Helper function to run this flow (optional, but good for testing or direct use)
export async function runSummarizeGenericFile(
  input: SummarizeGenericFileInput
): Promise<SummarizeGenericFileOutput> {
  try {
    return await runFlow(summarizeGenericFileFlow, input);
  } catch (error: any) {
    console.error('Error running summarizeGenericFileFlow:', error);
    return {
      summary: `Error invoking summarization flow for '${input.fileName}'.`,
      error: error.message || 'Unknown error running flow.',
    };
  }
}
