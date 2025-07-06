// src/ai/flows/refine-node-suggestion.ts
'use server';

import { z } from 'genkit';

import { ai } from '@/ai/genkit';

// 1. Define Input Schema
export const RefineNodeSuggestionInputSchema = z.object({
  originalText: z
    .string()
    .describe('The original text content of the node/suggestion.'),
  originalDetails: z
    .string()
    .optional()
    .describe(
      'The original detailed description of the node/suggestion, if any.'
    ),
  userInstruction: z
    .string()
    .describe("The user's instruction on how to refine the text/details."),
});
export type RefineNodeSuggestionInput = z.infer<
  typeof RefineNodeSuggestionInputSchema
>;

// 2. Define Output Schema
export const RefineNodeSuggestionOutputSchema = z.object({
  refinedText: z
    .string()
    .describe(
      'The AI-refined text content for the node. This should be suitable as a concise node label.'
    ),
  refinedDetails: z
    .string()
    .optional()
    .describe(
      'The AI-refined detailed description for the node, if applicable. This provides further elaboration.'
    ),
});
export type RefineNodeSuggestionOutput = z.infer<
  typeof RefineNodeSuggestionOutputSchema
>;

// 3. Define the Genkit Prompt
const refineNodeSuggestionPrompt = ai.definePrompt({
  name: 'refineNodeSuggestionPrompt',
  input: { schema: RefineNodeSuggestionInputSchema },
  output: { schema: RefineNodeSuggestionOutputSchema },
  prompt: `You are an AI assistant helping to refine content for nodes in a concept map.
Your task is to revise the provided original text and original details of a concept map node based on the user's instruction.

Original Node Text:
{{{originalText}}}

{{#if originalDetails}}
Original Node Details:
{{{originalDetails}}}
{{/if}}

User's Refinement Instruction:
{{{userInstruction}}}

Please revise the text and details according to the instruction.
- The 'refinedText' should be concise and suitable for a node label.
- The 'refinedDetails' (if any) should provide further elaboration.
- If the instruction implies generating new details where none existed, create them.
- If the instruction implies removing details, omit them in the output.
- If the instruction is vague, try your best to improve the clarity or focus of the original content in a general way.

Return the output ONLY in the specified JSON format with "refinedText" and "refinedDetails" keys.
Example refined output:
{
  "refinedText": "Concise Refined Label",
  "refinedDetails": "Elaborated and refined details based on user instruction."
}
If no details are appropriate after refinement, the "refinedDetails" field can be omitted or be an empty string.
`,
});

// 4. Define the Genkit Flow
export const refineNodeSuggestionFlow = ai.defineFlow(
  {
    name: 'refineNodeSuggestionFlow',
    inputSchema: RefineNodeSuggestionInputSchema,
    outputSchema: RefineNodeSuggestionOutputSchema,
  },
  async (input) => {
    const { output } = await refineNodeSuggestionPrompt(input);
    if (!output) {
      throw new Error(
        'AI did not produce an output for refining the node suggestion.'
      );
    }
    // Ensure refinedText is always present, even if AI omits it (though schema should enforce)
    if (typeof output.refinedText !== 'string') {
      // Attempt to use original text if AI fails to provide refinedText
      // Or, depending on strictness, could throw error or return a default
      console.warn(
        'AI output missing refinedText, using originalText as fallback for refinedText.'
      );
      output.refinedText = input.originalText;
    }
    return output;
  }
);

// Also, ensure this new flow is exported from the main AI flows index if one exists
// (e.g., src/ai/flows/index.ts). This subtask only creates the file.
