// src/ai/flows/ai-tidy-up-selection.ts
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Define Input Schema
const NodeLayoutInfoSchema = z.object({
  id: z.string(),
  x: z.number().describe("Current X coordinate (top-left) of the node."),
  y: z.number().describe("Current Y coordinate (top-left) of the node."),
  width: z.number().describe("Width of the node."),
  height: z.number().describe("Height of the node."),
  text: z.string().optional().describe("Node label/text content, for contextual understanding."),
  type: z.string().optional().describe("Node type, for contextual understanding.")
});

export const AiTidyUpSelectionInputSchema = z.object({
  nodes: z.array(NodeLayoutInfoSchema).min(2).describe("Array of 2 or more selected nodes to be tidied.")
  // Consider adding canvasWidth/Height or bounding box of selection if proven necessary for better AI results later.
});
export type AiTidyUpSelectionInput = z.infer<typeof AiTidyUpSelectionInputSchema>;

// 2. Define Output Schema
const NodeNewPositionSchema = z.object({
  id: z.string().describe("ID of the node."),
  x: z.number().describe("New suggested X coordinate (top-left) for the node."),
  y: z.number().describe("New suggested Y coordinate (top-left) for the node.")
});

export const AiTidyUpSelectionOutputSchema = z.object({
  newPositions: z.array(NodeNewPositionSchema).describe("Array of nodes with their new suggested positions."),
  suggestedParentNode: z.object({
    text: z.string().describe("A concise and descriptive label for the new parent node."),
    type: z.string().default('ai-group').describe("The type for the new parent node (e.g., 'ai-group').")
  }).optional().describe("If the AI deems it appropriate, suggests a new parent node to group all selected nodes.")
});
export type AiTidyUpSelectionOutput = z.infer<typeof AiTidyUpSelectionOutputSchema>;

// 3. Define the Genkit Prompt
const aiTidyUpSelectionPrompt = ai.definePrompt({
  name: 'aiTidyUpSelectionPrompt',
  input: { schema: AiTidyUpSelectionInputSchema },
  output: { schema: AiTidyUpSelectionOutputSchema },
  prompt: `You are an AI assistant specializing in diagram layout optimization for concept maps.
Given a list of selected concept map nodes, including their current positions (x, y for top-left corner), dimensions (width, height), and optionally their text content and type:

Your task is to calculate new (x, y) positions for these nodes to make them more organized, aligned, and readable.

Consider the following layout principles:
- **Alignment:** Align nodes along common horizontal or vertical axes (e.g., align centers or edges).
- **Distribution:** Distribute nodes evenly, ensuring consistent spacing between them.
- **Overlap Reduction:** Nodes should NOT overlap after rearrangement.
- **Proximity/Grouping:** Try to maintain the relative spatial relationships of the original selection if logical (e.g., nodes that were close should generally remain relatively close).
- **Compactness:** Aim for a reasonably compact arrangement of the selected group.
- **Minimal Movement:** While clarity is key, try to achieve a tidy layout with minimal overall displacement from original positions if possible without sacrificing readability or the above principles.

The (0,0) coordinate is the top-left of the canvas. Only provide new positions for the nodes listed in the input.

Nodes to rearrange:
{{#each nodes}}
- Node ID: {{id}}
  Current Position: (x: {{x}}, y: {{y}})
  Dimensions: (width: {{width}}, height: {{height}})
  {{#if text}}Text: "{{text}}"{{/if}}
  {{#if type}}Type: "{{type}}"{{/if}}
{{/each}}

Additionally, analyze the provided nodes (text and type if available) for thematic coherence.
If all the selected nodes together represent a strong, single overarching theme or concept that would benefit from being visually grouped under a new parent node:
- You may optionally suggest creating such a parent node by providing a 'suggestedParentNode' object in your output, alongside the 'newPositions' array.
- This 'suggestedParentNode' object should contain:
    - 'text': A concise and descriptive label for this new parent node that summarizes the group.
    - 'type': A type for this new parent node, for example, 'ai-group'.
- If you suggest a parent node, all the input nodes will be assigned as its children by the application. You should still provide their new tidied positions; these positions will be relative to the canvas.

If you do not think a single overarching parent node is appropriate for the entire selection, omit the 'suggestedParentNode' field from your output.
Your primary goal is still to return the 'newPositions' for all input nodes. The parent suggestion is secondary.

The output must be a JSON object. It must contain a key "newPositions" which is an array of objects, each with "id", "x", and "y".
Optionally, it can also contain a key "suggestedParentNode" which is an object with "text" and "type".
Example output format WITH a suggested parent:
{
  "newPositions": [
    { "id": "node1_id", "x": 150, "y": 100 },
    { "id": "node2_id", "x": 150, "y": 200 }
  ],
  "suggestedParentNode": {
    "text": "Overall Theme for Group",
    "type": "ai-group"
  }
}
Example output format WITHOUT a suggested parent:
{
  "newPositions": [
    { "id": "node1_id", "x": 150, "y": 100 },
    { "id": "node2_id", "x": 150, "y": 200 }
  ]
}
`,
});

// 4. Define the Genkit Flow
export const aiTidyUpSelectionFlow = ai.defineFlow(
  {
    name: 'aiTidyUpSelectionFlow',
    inputSchema: AiTidyUpSelectionInputSchema,
    outputSchema: AiTidyUpSelectionOutputSchema,
  },
  async (input) => {
    if (input.nodes.length < 2) {
      // Should be caught by Zod schema min(2) but good to have a check.
      // Return original positions if fewer than 2 nodes (nothing to tidy).
      return { newPositions: input.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })) };
    }

    const { output } = await aiTidyUpSelectionPrompt(input);
    if (!output || !output.newPositions || output.newPositions.length !== input.nodes.length) {
      console.error("AI Tidy Up: Output missing or newPositions array length mismatch.", output);
      // Fallback: return original positions if AI output is invalid
      // This prevents map disruption if AI fails.
      return { newPositions: input.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })) };
    }

    // Further validation: ensure all original node IDs are present in the output
    const originalNodeIds = new Set(input.nodes.map(n => n.id));
    const outputNodeIds = new Set(output.newPositions.map(p => p.id));
    if (originalNodeIds.size !== outputNodeIds.size || !Array.from(originalNodeIds).every(id => outputNodeIds.has(id))) {
        console.error("AI Tidy Up: Output newPositions do not contain all original node IDs.");
        return { newPositions: input.nodes.map(n => ({ id: n.id, x: n.x, y: n.y })) };
    }

    return output;
  }
);

// Ensure this new flow is exported from src/ai/flows/index.ts in a subsequent step.
