import { defineFlow } from '@genkit-ai/flow';
import { generate } from 'genkit/ai';
import { geminiPro } from 'genkitx/googleai'; // Or your configured LLM
import { z } from 'zod';

// Input: Array of nodes with their content and current layout
export const SemanticTidyUpNodeSchema = z.object({
  id: z.string(),
  text: z.string().optional().default(''),
  details: z.string().optional().default(''),
  x: z.number(),
  y: z.number(),
  width: z.number().optional().default(150), // Provide default for layout context
  height: z.number().optional().default(70), // Provide default for layout context
});
export type SemanticTidyUpNode = z.infer<typeof SemanticTidyUpNodeSchema>;
export const SemanticTidyUpRequestSchema = z.array(SemanticTidyUpNodeSchema);
export type SemanticTidyUpRequest = z.infer<typeof SemanticTidyUpRequestSchema>;

// Output: Array of node updates with new positions
export const SemanticTidyUpNodeUpdateSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
});
export type SemanticTidyUpNodeUpdate = z.infer<typeof SemanticTidyUpNodeUpdateSchema>;
export const SemanticTidyUpResponseSchema = z.array(SemanticTidyUpNodeUpdateSchema);
export type SemanticTidyUpResponse = z.infer<typeof SemanticTidyUpResponseSchema>;

export const semanticTidyUpFlow = defineFlow(
  {
    name: 'semanticTidyUpFlow',
    inputSchema: SemanticTidyUpRequestSchema,
    outputSchema: SemanticTidyUpResponseSchema,
    authPolicy: (auth, input) => { // Example auth policy, adjust as needed
      // Allow if user is authenticated, or implement more specific checks
      // if (!auth) {
      //   throw new Error('Authentication required.');
      // }
    }
  },
  async (nodesToTidy) => {
    if (!nodesToTidy || nodesToTidy.length < 2) {
      // Not enough nodes to tidy, return their original positions
      return nodesToTidy.map(n => ({ id: n.id, x: n.x, y: n.y }));
    }

    const nodesString = JSON.stringify(
      nodesToTidy.map(n => ({ id: n.id, text: n.text, details: n.details, currentX: n.x, currentY: n.y, width: n.width, height: n.height })),
      null, 2
    );

    // Estimate a bounding box or canvas area to guide the LLM
    const minX = Math.min(...nodesToTidy.map(n => n.x));
    const minY = Math.min(...nodesToTidy.map(n => n.y));
    const maxX = Math.max(...nodesToTidy.map(n => n.x + (n.width || 150)));
    const maxY = Math.max(...nodesToTidy.map(n => n.y + (n.height || 70)));
    const canvasWidth = Math.max(500, maxX - minX + 200);
    const canvasHeight = Math.max(400, maxY - minY + 200);

    const prompt = `
You are an expert in organizing information visually. You will be given a list of nodes from a concept map, including their ID, text content, details, current X/Y positions, and dimensions.
Your task is to rearrange ONLY these provided nodes to improve their layout based on their semantic relationships and readability.

Consider the following:
1.  **Semantic Grouping:** Place nodes with similar topics or closely related content near each other.
2.  **Logical Flow:** If there's an implied sequence or hierarchy in the content, try to reflect that (e.g., left-to-right, top-to-bottom for sequences).
3.  **Readability & Compactness:** Aim for a clean, organized layout that is easy to understand. Keep the overall arrangement relatively compact.
4.  **Avoid Overlaps:** Ensure nodes do not overlap. Use their provided dimensions (width, height) for this. A typical node is about 150x70 pixels. Maintain a minimum gap of 20-30 pixels between nodes.
5.  **Contextual Placement:** Use the current positions as a loose reference for the general area, but prioritize semantic arrangement. The new layout can be relative to the current centroid or top-left of the selection.
6.  **Canvas Boundaries (Approximate):** The nodes should ideally fit within an approximate canvas area of ${canvasWidth} width and ${canvasHeight} height, starting from around (0,0) for this local arrangement. This means your output X/Y coordinates should be relative to a local origin for this group, not necessarily the original map's absolute coordinates. The caller will translate this local layout back to the map.

Input Nodes:
${nodesString}

Output Format:
Return ONLY a valid JSON array of objects. Each object must represent one of the input nodes and contain:
- "id": The original ID of the node.
- "x": The new suggested X coordinate (integer).
- "y": The new suggested Y coordinate (integer).

Example: [{ "id": "node-1", "x": 10, "y": 50 }, { "id": "node-2", "x": 200, "y": 50 }]

Ensure all input nodes are present in your output array with their new positions. Do not introduce new nodes or omit any.
The origin (0,0) for your new layout should be considered the top-left of the bounding box of the rearranged nodes.
`;

    try {
      console.log(`[semanticTidyUpFlow] Sending ${nodesToTidy.length} nodes to LLM for tidying.`);
      const llmResponse = await generate({
        model: geminiPro,
        prompt: prompt,
        output: { format: 'json', schema: SemanticTidyUpResponseSchema },
        config: { temperature: 0.4 },
      });

      const suggestedUpdates = llmResponse.output();

      if (!suggestedUpdates || !Array.isArray(suggestedUpdates)) {
        console.error('SemanticTidyUpFlow: LLM output was not a valid array or was null.');
        return nodesToTidy.map(n => ({ id: n.id, x: n.x, y: n.y }));
      }

      console.log(`[semanticTidyUpFlow] Received ${suggestedUpdates.length} updates from LLM.`);

      const outputNodeIds = new Set(suggestedUpdates.map(upd => upd.id));
      const originalNodeIds = new Set(nodesToTidy.map(n => n.id));

      if (outputNodeIds.size !== originalNodeIds.size || !nodesToTidy.every(n => outputNodeIds.has(n.id))) {
        console.error('SemanticTidyUpFlow: LLM output did not include all original node IDs or had duplicates. Output IDs:', Array.from(outputNodeIds), 'Original IDs:', Array.from(originalNodeIds));
        return nodesToTidy.map(n => ({ id: n.id, x: n.x, y: n.y }));
      }

      const validatedUpdates = suggestedUpdates.filter(
        upd => typeof upd.x === 'number' && typeof upd.y === 'number' && originalNodeIds.has(upd.id)
      );

      if (validatedUpdates.length !== originalNodeIds.size) {
        console.warn('SemanticTidyUpFlow: Some updates were invalid (non-numeric x/y or wrong ID) after initial schema validation. Returning original positions for missing/invalid ones.');
        const validUpdatesMap = new Map(validatedUpdates.map(upd => [upd.id, upd]));
        return nodesToTidy.map(n => {
          const validUpdate = validUpdatesMap.get(n.id);
          return validUpdate ? validUpdate : { id: n.id, x: n.x, y: n.y };
        });
      }
      console.log(`[semanticTidyUpFlow] Successfully processed and validated ${validatedUpdates.length} node updates.`);
      return validatedUpdates;

    } catch (error) {
      console.error("Error in semanticTidyUpFlow during LLM call or processing:", error);
      return nodesToTidy.map(n => ({ id: n.id, x: n.x, y: n.y }));
    }
  }
);
