import { defineFlow } from '@genkit-ai/flow';
import { z } from 'zod';

export const IntermediateNodeSuggestionRequestSchema = z.object({
  sourceNodeContent: z.string().describe("The text content or label of the source node"),
  targetNodeContent: z.string().describe("The text content or label of the target node"),
  edgeLabel: z.string().optional().describe("The label of the existing edge connecting the source and target nodes"),
});

export type IntermediateNodeSuggestionRequest = z.infer<typeof IntermediateNodeSuggestionRequestSchema>;

export const IntermediateNodeSuggestionResponseSchema = z.object({
  suggestedNodeText: z.string().describe("The suggested text/label for the new intermediate node"),
  suggestedNodeDetails: z.string().optional().describe("Optional details for the new intermediate node"),
  labelToSource: z.string().optional().describe("Suggested label for the new edge: source_node -> intermediate_node"),
  labelToTarget: z.string().optional().describe("Suggested label for the new edge: intermediate_node -> target_node"),
});

export type IntermediateNodeSuggestionResponse = z.infer<typeof IntermediateNodeSuggestionResponseSchema>;

export const suggestIntermediateNodeFlow = defineFlow(
  {
    name: 'suggestIntermediateNodeFlow',
    inputSchema: IntermediateNodeSuggestionRequestSchema,
    outputSchema: IntermediateNodeSuggestionResponseSchema,
    authPolicy: (auth, input) => { // Example auth policy - allow if user is authenticated
        if (!auth) {
          // throw new Error("User not authenticated.");
        }
    }
  },
  async (input) => {
    console.log(
      `[suggestIntermediateNodeFlow] Received request to suggest intermediate node between:
      Source: "${input.sourceNodeContent}"
      Target: "${input.targetNodeContent}"
      Existing Edge Label: "${input.edgeLabel || 'N/A'}"`
    );

    // Mock implementation:
    const intermediateText = `Link between "${input.sourceNodeContent.substring(0, 15)}..." and "${input.targetNodeContent.substring(0, 15)}..."`;
    const intermediateDetails =
      `This AI-suggested node provides a conceptual bridge between the ideas of "${input.sourceNodeContent}" and "${input.targetNodeContent}".
The original connection was labeled: "${input.edgeLabel || '(unlabeled)'}".`;

    return {
      suggestedNodeText: intermediateText,
      suggestedNodeDetails: intermediateDetails,
      labelToSource: "is part of", // Mock label for edge from source to intermediate
      labelToTarget: "leads to"      // Mock label for edge from intermediate to target
    };
  }
);
