// src/ai/flows/suggest-intermediate-node.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Define Input Schema
export const SuggestIntermediateNodeInputSchema = z.object({
  sourceNodeText: z.string().describe("Text content of the source node."),
  sourceNodeDetails: z.string().optional().describe("Detailed description of the source node, if any."),
  targetNodeText: z.string().describe("Text content of the target node."),
  targetNodeDetails: z.string().optional().describe("Detailed description of the target node, if any."),
  existingEdgeLabel: z.string().optional().describe("The label of the existing edge connecting the source and target nodes.")
});
export type SuggestIntermediateNodeInput = z.infer<typeof SuggestIntermediateNodeInputSchema>;

// 2. Define Output Schema (single best suggestion)
export const SuggestIntermediateNodeOutputSchema = z.object({
  intermediateNodeText: z.string().describe("The suggested text for the new intermediate node. This should be concise."),
  intermediateNodeDetails: z.string().optional().describe("Suggested details for the new intermediate node, providing further elaboration if necessary."),
  labelSourceToIntermediate: z.string().describe("Suggested label for the new edge from the original source node to the intermediate node. Should be concise and descriptive."),
  labelIntermediateToTarget: z.string().describe("Suggested label for the new edge from the intermediate node to the original target node. Should be concise and descriptive.")
});
export type SuggestIntermediateNodeOutput = z.infer<typeof SuggestIntermediateNodeOutputSchema>;

// 3. Define the Genkit Prompt
const suggestIntermediateNodePrompt = ai.definePrompt({
  name: 'suggestIntermediateNodePrompt',
  input: { schema: SuggestIntermediateNodeInputSchema },
  output: { schema: SuggestIntermediateNodeOutputSchema },
  prompt: `You are an AI assistant helping to structure and refine concept maps by identifying mediating concepts.
Given a source node, a target node, and the label of the existing edge between them, your task is to propose a new 'intermediate' concept or step that logically fits between the source and target. This intermediate concept should help break down or clarify the relationship described by the original edge label.

Source Node Text:
{{{sourceNodeText}}}
{{#if sourceNodeDetails}}
Source Node Details:
{{{sourceNodeDetails}}}
{{/if}}

Target Node Text:
{{{targetNodeText}}}
{{#if targetNodeDetails}}
Target Node Details:
{{{targetNodeDetails}}}
{{/if}}

{{#if existingEdgeLabel}}
Original Edge Label (from source to target):
{{{existingEdgeLabel}}}
{{/if}}

Based on this information:
1.  Suggest the text for a new intermediate node (\`intermediateNodeText\`). This should be a concise label for the concept.
2.  Optionally, provide brief details for this intermediate node (\`intermediateNodeDetails\`) if elaboration is useful.
3.  Suggest a new label for the edge from the original source node to your new intermediate node (\`labelSourceToIntermediate\`).
4.  Suggest a new label for the edge from your new intermediate node to the original target node (\`labelIntermediateToTarget\`).

The new intermediate node and edge labels should create a more detailed or logical pathway from the source to the target. For example, if Source is "User Authentication" and Target is "Access Dashboard" with original label "grants access to", a good intermediate node might be "Session Token" with labels like "generates" and "enables".

Return the output ONLY in the specified JSON format with "intermediateNodeText", "intermediateNodeDetails", "labelSourceToIntermediate", and "labelIntermediateToTarget" keys.
If no details are appropriate for the intermediate node, the "intermediateNodeDetails" field can be omitted or be an empty string.
Edge labels should be action-oriented or descriptive of the relationship.
`,
});

// 4. Define the Genkit Flow
export const suggestIntermediateNodeFlow = ai.defineFlow(
  {
    name: 'suggestIntermediateNodeFlow',
    inputSchema: SuggestIntermediateNodeInputSchema,
    outputSchema: SuggestIntermediateNodeOutputSchema,
  },
  async (input) => {
    const { output } = await suggestIntermediateNodePrompt(input);
    if (!output) {
      throw new Error("AI did not produce an output for suggesting an intermediate node.");
    }
    // Ensure required fields are present, even if AI omits them (though schema should enforce)
    if (typeof output.intermediateNodeText !== 'string' || output.intermediateNodeText.trim() === '') {
        throw new Error("AI output missing or empty refinedText for intermediate node.");
    }
    if (typeof output.labelSourceToIntermediate !== 'string' || output.labelSourceToIntermediate.trim() === '') {
        throw new Error("AI output missing or empty labelSourceToIntermediate.");
    }
    if (typeof output.labelIntermediateToTarget !== 'string' || output.labelIntermediateToTarget.trim() === '') {
        throw new Error("AI output missing or empty labelIntermediateToTarget.");
    }
    return output;
  }
);

// Ensure this new flow is exported from src/ai/flows/index.ts in a subsequent step.
