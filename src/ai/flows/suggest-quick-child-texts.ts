import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai'; // Assuming geminiPro is standard
import * as z from 'zod';

// Define the input schema for the flow
const SuggestQuickChildTextsInputSchema = z.object({
  parentNodeText: z.string().min(1, 'Parent node text cannot be empty.'),
  parentNodeDetails: z.string().optional(),
  // Optionally, could add 'direction' if AI should tailor suggestions based on it,
  // but keeping it simple for now.
});

// Define the output schema for the flow
const SuggestQuickChildTextsOutputSchema = z.object({
  suggestions: z
    .array(z.string())
    .length(3, 'Must provide exactly 3 suggestions.'), // Requesting 3 suggestions
});

export const suggestQuickChildTextsFlow = defineFlow(
  {
    name: 'suggestQuickChildTextsFlow',
    inputSchema: SuggestQuickChildTextsInputSchema,
    outputSchema: SuggestQuickChildTextsOutputSchema,
  },
  async (input) => {
    const { parentNodeText, parentNodeDetails } = input;

    const prompt = `
      Based on the following parent concept map node, suggest exactly 3 very short and relevant texts for new child nodes.
      Each suggestion should be a concise phrase or a few keywords, suitable for directly creating a new related node.
      Focus on direct sub-topics, components, examples, or next logical steps related to the parent node.
      Avoid generic phrases like "More details" or "Related idea". Be specific.

      Parent Node Text: "${parentNodeText}"
      ${parentNodeDetails ? `Parent Node Details: "${parentNodeDetails}"` : ''}

      Return ONLY the three suggestions as a JSON array of strings. For example:
      ["Child Idea 1", "Child Idea 2", "Another Child Concept"]
    `;

    const llmResponse = await generate(
      {
        model: gemini10Pro,
        prompt: prompt,
        config: {
          temperature: 0.5, // Moderate temperature for some creativity but still focused
          maxOutputTokens: 100, // Max tokens for the suggestions array
        },
        output: {
          format: 'json', // Expect JSON output directly
          schema: SuggestQuickChildTextsOutputSchema, // Validate against output schema
        },
      },
      {
        tools: [],
      }
    );

    const outputData = llmResponse.output();
    if (!outputData) {
      throw new Error('No output data received from LLM.');
    }

    // Ensure exactly 3 suggestions, padding or truncating if necessary, though schema should enforce.
    // This is a fallback if the LLM doesn't strictly adhere to "exactly 3".
    let finalSuggestions = outputData.suggestions;
    if (finalSuggestions.length > 3) {
      finalSuggestions = finalSuggestions.slice(0, 3);
    } else {
      while (finalSuggestions.length < 3) {
        finalSuggestions.push('New Suggestion'); // Placeholder if LLM gives too few
      }
    }

    return { suggestions: finalSuggestions };
  }
);
