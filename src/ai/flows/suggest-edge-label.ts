import { z } from 'zod';
import { defineFlow, run } from '@genkit-ai/flow';
import { geminiPro } from '@genkit-ai/googleai'; // Or your preferred model

// 1a. Define Input/Output Schemas
export const SuggestEdgeLabelInputSchema = z.object({
  sourceNode: z.object({
    text: z.string(),
    details: z.string().optional(),
  }),
  targetNode: z.object({
    text: z.string(),
    details: z.string().optional(),
  }),
  existingLabel: z.string().optional(), // Optional: if user already typed something
});
export type SuggestEdgeLabelInput = z.infer<typeof SuggestEdgeLabelInputSchema>;

export const SuggestEdgeLabelOutputSchema = z.object({
  suggestedLabels: z.array(z.string()), // e.g., ["uses", "connects to", "depends on"]
});
export type SuggestEdgeLabelOutput = z.infer<
  typeof SuggestEdgeLabelOutputSchema
>;

// 1b. Define the Genkit Flow
export const suggestEdgeLabelFlow = defineFlow(
  {
    name: 'suggestEdgeLabelFlow',
    inputSchema: SuggestEdgeLabelInputSchema,
    outputSchema: SuggestEdgeLabelOutputSchema,
  },
  async (input) => {
    const { sourceNode, targetNode, existingLabel } = input;

    let prompt = `Given a source node and a target node in a concept map, suggest concise and relevant labels for the edge connecting them.
Return up to 3-5 suggestions as a JSON array of strings.

Source Node Text: ${sourceNode.text}
${sourceNode.details ? `Source Node Details: ${sourceNode.details}\n` : ''}
Target Node Text: ${targetNode.text}
${sourceNode.details ? `Source Node Details: ${sourceNode.details}\n` : ''}
Target Node Text: ${targetNode.text}
${targetNode.details ? `Target Node Details: ${targetNode.details}\n` : ''}
${existingLabel ? `The user has already started typing: "${existingLabel}". Consider this context and provide completions or related suggestions.\n` : ''}
Consider the direction of the relationship from the Source Node to the Target Node.
Focus on common relationship types like "uses", "depends on", "leads to", "is part of", "interacts with", "manages", "contains", "defines", "clarifies", "resolves", "triggers", "supports", "enables", "prevents", "requires", "is example of", "comprises", "requests", "sends to", "receives from".
The labels should be short, ideally 1-3 words, and clearly describe the relationship from source to target. Ensure the response is ONLY the JSON array of strings.

JSON Array of Suggested Labels:`;

    const llmResponse = await run('generate-edge-labels', async () =>
      geminiPro.generate({
        prompt: prompt,
        output: { format: 'json', schema: z.array(z.string()) },
        config: { temperature: 0.4 }, // Slightly lower temperature for more deterministic suggestions
      })
    );

    const suggestions = llmResponse.output();

    if (suggestions && Array.isArray(suggestions)) {
      return { suggestedLabels: suggestions.slice(0, 5) };
    } else {
      // Fallback or error handling if JSON parsing/generation by LLM failed or was not an array
      console.error(
        'LLM did not return a valid array of suggestions for edge labels. Output:',
        suggestions
      );
      // Attempt to parse if it's a stringified array (less ideal)
      if (typeof suggestions === 'string') {
        try {
          const parsed = JSON.parse(suggestions as string);
          if (
            Array.isArray(parsed) &&
            parsed.every((s) => typeof s === 'string')
          ) {
            return { suggestedLabels: parsed.slice(0, 5) };
          }
        } catch (e) {
          console.error(
            'Failed to parse string output from LLM for edge labels:',
            e
          );
        }
      }
      return { suggestedLabels: [] }; // Return empty on failure or unexpected format
    }
  }
);
