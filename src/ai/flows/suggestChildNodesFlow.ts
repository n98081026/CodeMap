import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai'; // Or your configured LLM
import { z } from 'zod';

export const SuggestChildNodesRequestSchema = z.object({
  parentNodeId: z.string(),
  parentNodeText: z.string(),
  parentNodeDetails: z.string().optional().default(''),
  existingChildrenTexts: z.array(z.string()).optional().default([]),
  maxSuggestions: z.number().int().positive().optional().default(3),
});
export type SuggestChildNodesRequest = z.infer<
  typeof SuggestChildNodesRequestSchema
>;

export const SuggestedChildNodeSchema = z.object({
  text: z.string().min(1, 'Suggested text cannot be empty.'),
  relationLabel: z.string().optional().default('relates to'), // Default connecting label
});
export type SuggestedChildNode = z.infer<typeof SuggestedChildNodeSchema>;

export const SuggestChildNodesResponseSchema = z.array(
  SuggestedChildNodeSchema
);
export type SuggestChildNodesResponse = z.infer<
  typeof SuggestChildNodesResponseSchema
>;

export const suggestChildNodesFlow = defineFlow(
  {
    name: 'suggestChildNodesFlow',
    inputSchema: SuggestChildNodesRequestSchema,
    outputSchema: SuggestChildNodesResponseSchema,
    authPolicy: (auth, input) => {
      // Example: Allow if user is authenticated
      // if (!auth) {
      //   throw new Error('Authentication required.');
      // }
    },
  },
  async (request) => {
    const {
      parentNodeText,
      parentNodeDetails,
      existingChildrenTexts,
      maxSuggestions,
    } = request;

    const existingChildrenString =
      existingChildrenTexts.length > 0
        ? `Avoid suggesting concepts very similar to these existing children: ${existingChildrenTexts.join(', ')}.`
        : 'This parent node currently has no children listed.';

    const prompt = `
You are an assistant helping to brainstorm related concepts for a concept map.
Given the following parent node from a concept map:
Parent Node Text: "${parentNodeText}"
Parent Node Details: "${parentNodeDetails || 'No additional details provided.'}"

${existingChildrenString}

Suggest ${maxSuggestions} distinct, concise, and relevant child concepts that could logically extend from this parent node.
For each suggested child concept, also provide a brief, appropriate label for the connecting edge from the parent to this child (e.g., "leads to", "includes", "is a type of", "example").

Return your suggestions as a JSON array of objects. Each object must conform to this structure:
{
  "text": "Suggested child node text",
  "relationLabel": "Suggested edge label"
}

Example:
If the parent is "Machine Learning", some suggestions might be:
[
  { "text": "Supervised Learning", "relationLabel": "is a type of" },
  { "text": "Neural Networks", "relationLabel": "includes" },
  { "text": "Applications", "relationLabel": "has" }
]

Provide only the JSON array as your output. Do not suggest more than ${maxSuggestions} items.
Ensure the "text" for each child is not empty. Default "relationLabel" to "relates to" if unsure.
`;

    try {
      console.log(
        `[suggestChildNodesFlow] Requesting ${maxSuggestions} child suggestions for parent: "${parentNodeText}"`
      );
      const llmResponse = await generate({
        model: gemini10Pro,
        prompt: prompt,
        output: { format: 'json', schema: SuggestChildNodesResponseSchema },
        config: { temperature: 0.5, maxOutputTokens: 300 * maxSuggestions }, // Adjusted max tokens based on suggestions
      });

      const suggestions = llmResponse.output;

      if (!suggestions || !Array.isArray(suggestions)) {
        console.error(
          'SuggestChildNodesFlow: LLM output was not a valid array or was null.'
        );
        return [];
      }

      console.log(
        `[suggestChildNodesFlow] Received ${suggestions.length} suggestions from LLM.`
      );

      // Filter out any empty text suggestions just in case, though schema should catch it
      // and ensure relationLabel has a default.
      const validSuggestions = suggestions
        .filter((s) => s.text && s.text.trim() !== '')
        .map((s) => ({
          text: s.text,
          relationLabel: s.relationLabel || 'relates to', // Ensure default
        }));

      return validSuggestions.slice(0, maxSuggestions); // Ensure we don't exceed maxSuggestions
    } catch (error) {
      console.error(
        'Error in suggestChildNodesFlow during LLM call or processing:',
        error
      );
      return []; // Return empty array on error
    }
  }
);
