import { defineFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { gemini10Pro } from '@genkit-ai/googleai';
import * as z from 'zod';

// Input Schema: An array of objects, each representing a selected node
export const SuggestSemanticParentInputSchema = z.object({
  selectedNodesContent: z
    .array(
      z.object({
        id: z.string(), // Keep ID for potential context, though AI might not use it directly
        text: z.string().min(1, 'Node text cannot be empty.'),
        details: z.string().optional(),
      })
    )
    .min(2, 'At least two nodes are required for grouping.'), // Require at least 2 nodes
});

// Output Schema
export const SuggestSemanticParentOutputSchema = z.object({
  parentNodeText: z
    .string()
    .min(1, 'Suggested parent node text cannot be empty.'),
  groupingReason: z.string().optional(),
});

export const suggestSemanticParentNodeFlow = defineFlow(
  {
    name: 'suggestSemanticParentNodeFlow',
    inputSchema: SuggestSemanticParentInputSchema,
    outputSchema: SuggestSemanticParentOutputSchema,
  },
  async (input) => {
    const { selectedNodesContent } = input;

    // Prepare a summary of the selected nodes for the prompt
    const nodesSummary = selectedNodesContent
      .map(
        (node) =>
          `- "${node.text}"${node.details ? ` (Details: ${node.details.substring(0, 100)}${node.details.length > 100 ? '...' : ''})` : ''}`
      )
      .join('\n');

    const prompt = `
      You are an expert in knowledge organization and concept mapping.
      Based on the following set of selected concept map nodes, suggest a concise and meaningful name for a NEW PARENT NODE that would semantically group these selected nodes.
      Optionally, provide a brief reason for your suggested grouping.

      Selected Nodes:
      ${nodesSummary}

      Consider the common themes, relationships, or overarching category that these nodes represent.
      The parent node name should be a short phrase or a few keywords.
      The reason should be a single sentence explaining the logic behind the grouping.

      Return your answer as a JSON object with the following exact keys: "parentNodeText" and optionally "groupingReason".
      Example:
      {
        "parentNodeText": "Data Storage Solutions",
        "groupingReason": "These nodes all represent different types of data storage technologies."
      }
      Or, if no specific reason is generated:
      {
        "parentNodeText": "Network Devices"
      }
    `;

    const llmResponse = await generate({
      model: gemini10Pro,
      prompt: prompt,
      config: {
        temperature: 0.5,
        maxOutputTokens: 150,
      },
      output: {
        format: 'json',
        schema: SuggestSemanticParentOutputSchema,
      },
    });

    const outputData = llmResponse.output();
    if (!outputData) {
      throw new Error(
        'No output data received from LLM for semantic parent suggestion.'
      );
    }

    // Ensure parentNodeText is not empty, even if schema should catch it.
    if (!outputData.parentNodeText || outputData.parentNodeText.trim() === '') {
      // Fallback if AI returns empty text, though schema should prevent this.
      return {
        parentNodeText: 'Suggested Group',
        groupingReason:
          outputData.groupingReason ||
          'AI suggested a group based on selected nodes.',
      };
    }

    return {
      parentNodeText: outputData.parentNodeText,
      groupingReason: outputData.groupingReason,
    };
  }
);
