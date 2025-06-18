import { defineFlow, generate } from '@genkit-ai/flow';
import { geminiPro } from '@genkit-ai/googleai'; // Assuming geminiPro is standard
import * as z from 'zod';

// Input Schema
export const SuggestIntermediateNodeInputSchema = z.object({
  sourceNodeText: z.string().min(1, "Source node text cannot be empty."),
  sourceNodeDetails: z.string().optional(),
  targetNodeText: z.string().min(1, "Target node text cannot be empty."),
  targetNodeDetails: z.string().optional(),
  currentEdgeLabel: z.string().optional(),
});

// Output Schema
export const SuggestIntermediateNodeOutputSchema = z.object({
  intermediateNodeText: z.string().min(1, "Intermediate node text cannot be empty."),
  edgeToIntermediateLabel: z.string().min(1, "Label for edge to intermediate node cannot be empty."),
  edgeFromIntermediateLabel: z.string().min(1, "Label for edge from intermediate node cannot be empty."),
});

export const suggestIntermediateNodeFlow = defineFlow(
  {
    name: 'suggestIntermediateNodeFlow',
    inputSchema: SuggestIntermediateNodeInputSchema,
    outputSchema: SuggestIntermediateNodeOutputSchema,
  },
  async (input) => {
    const {
      sourceNodeText,
      sourceNodeDetails,
      targetNodeText,
      targetNodeDetails,
      currentEdgeLabel,
    } = input;

    const prompt = `
      You are an expert in knowledge graph structuring.
      Consider two concepts in a concept map connected by an edge.
      Source Node Text: "${sourceNodeText}"
      ${sourceNodeDetails ? `Source Node Details: "${sourceNodeDetails}"` : ''}
      Target Node Text: "${targetNodeText}"
      ${targetNodeDetails ? `Target Node Details: "${targetNodeDetails}"` : ''}
      ${currentEdgeLabel ? `They are currently connected by an edge labeled: "${currentEdgeLabel}"` : 'They are currently connected by an unlabeled edge.'}

      Your task is to suggest a new, intermediate concept that could logically be placed BETWEEN the source and target nodes. This new concept should help break down or clarify the relationship.
      Also, suggest new labels for the two edges that would connect the source node to your proposed intermediate node, and the intermediate node to the target node.

      Provide your answer as a JSON object with the following exact keys: "intermediateNodeText", "edgeToIntermediateLabel", "edgeFromIntermediateLabel".
      Ensure the texts and labels are concise and meaningful.

      Example:
      If Source is "Computer" and Target is "Internet" with label "connects to", a possible intermediate node could be "Modem" or "Router".
      If intermediate is "Router", then "edgeToIntermediateLabel" could be "connects via" and "edgeFromIntermediateLabel" could be "provides access to".
    `;

    const llmResponse = await generate({
      model: geminiPro,
      prompt: prompt,
      config: {
        temperature: 0.6, // Slightly higher for more creative "bridging" concepts
        maxOutputTokens: 150,
      },
      output: {
        format: 'json',
        schema: SuggestIntermediateNodeOutputSchema,
      },
    });

    const outputData = llmResponse.output();
    if (!outputData) {
      throw new Error('No output data received from LLM for intermediate node suggestion.');
    }
    return outputData;
  }
);
